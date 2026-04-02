const AdminApp = (() => {
  let password = localStorage.getItem('admin_password') || '';
  let calendarMonth = new Date().getMonth();
  let calendarYear = new Date().getFullYear();
  let selectedDate = formatDate(new Date());
  let lastBookingCount = 0;
  let pollInterval = null;
  let monthBookings = {}; // cache: { "2026-04-05": 3, ... }

  // ===== AUTH =====
  function init() {
    if (password) {
      verifyPassword(password).then(valid => {
        if (valid) showDashboard();
        else showLogin();
      });
    } else {
      showLogin();
    }
  }

  async function verifyPassword(pw) {
    try {
      const today = formatDate(new Date());
      const res = await fetch(`/api/bookings?password=${encodeURIComponent(pw)}&date=${today}`);
      return res.ok;
    } catch (err) {
      console.error('Verify error:', err);
      return false;
    }
  }

  async function login(e) {
    if (e) e.preventDefault();
    const pw = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.querySelector('.login-btn');
    if (!pw) return;

    btn.disabled = true;
    btn.textContent = 'Checking...';

    try {
      const valid = await verifyPassword(pw);
      if (valid) {
        password = pw;
        localStorage.setItem('admin_password', pw);
        errorEl.style.display = 'none';
        showDashboard();
      } else {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Wrong password';
      }
    } catch (err) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'Connection error';
    }

    btn.disabled = false;
    btn.textContent = 'Enter';
  }

  function logout() {
    password = '';
    localStorage.removeItem('admin_password');
    if (pollInterval) clearInterval(pollInterval);
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  }

  function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  }

  function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    selectedDate = formatDate(new Date());
    renderCalendar();
    loadDayBookings(selectedDate);
    loadStats();
    loadMonthCounts();
    startPolling();
  }

  // ===== FULL MONTH CALENDAR =====
  function renderCalendar() {
    const container = document.getElementById('month-grid');
    const monthLabel = document.getElementById('calendar-month-label');

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    monthLabel.textContent = `${months[calendarMonth]} ${calendarYear}`;

    const today = formatDate(new Date());
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);

    let html = '';

    // Day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach(d => {
      html += `<div class="month-day-label">${d}</div>`;
    });

    // Empty slots before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      html += '<div class="month-day empty"></div>';
    }

    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      const dateStr = formatDate(date);
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;
      const count = monthBookings[dateStr] || 0;

      let cls = 'month-day';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';

      html += `<button class="${cls}" onclick="AdminApp.selectDay('${dateStr}')">
        <span class="day-num">${d}</span>
        ${count > 0 ? `<span class="day-count">${count}</span>` : ''}
      </button>`;
    }

    container.innerHTML = html;
  }

  function prevMonth() {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar();
    loadMonthCounts();
  }

  function nextMonth() {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar();
    loadMonthCounts();
  }

  function selectDay(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    loadDayBookings(dateStr);
  }

  // ===== LOAD MONTH COUNTS =====
  async function loadMonthCounts() {
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Fetch each day's bookings count for the month
    const promises = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      const dateStr = formatDate(date);
      promises.push(
        fetch(`/api/bookings?password=${encodeURIComponent(password)}&date=${dateStr}`)
          .then(r => r.json())
          .then(data => ({ date: dateStr, count: (data.bookings || []).length }))
          .catch(() => ({ date: dateStr, count: 0 }))
      );
    }

    const results = await Promise.all(promises);
    results.forEach(r => {
      monthBookings[r.date] = r.count;
    });

    renderCalendar();
  }

  // ===== LOAD DAY BOOKINGS =====
  async function loadDayBookings(dateStr) {
    const titleEl = document.getElementById('day-panel-title');
    const dateEl = document.getElementById('day-panel-date');
    const listEl = document.getElementById('day-bookings-list');

    // Format title
    const today = formatDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    const d = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const fullDate = d.toLocaleDateString('en-US', options);

    if (dateStr === today) titleEl.textContent = 'Today';
    else if (dateStr === tomorrowStr) titleEl.textContent = 'Tomorrow';
    else titleEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long' });

    dateEl.textContent = fullDate;
    listEl.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const res = await fetch(`/api/bookings?password=${encodeURIComponent(password)}&date=${dateStr}`);
      if (!res.ok) {
        if (res.status === 401) { logout(); return; }
        throw new Error('Failed');
      }

      const data = await res.json();
      const bookings = data.bookings || [];

      // New booking detection (only for selected date)
      if (dateStr === selectedDate && lastBookingCount > 0 && bookings.length > lastBookingCount) {
        const newOnes = bookings.slice(lastBookingCount);
        newOnes.forEach(b => {
          playChime();
          showToast(`New booking! ${b.name} at ${formatTime12(b.time)}`);
        });
      }
      if (dateStr === selectedDate) lastBookingCount = bookings.length;

      if (bookings.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>No Bookings</h3>
            <p>No appointments for this day</p>
          </div>`;
      } else {
        listEl.innerHTML = bookings.map((b, i) => `
          <div class="booking-card" style="animation-delay: ${i * 0.05}s">
            <div class="booking-time">${formatTime12(b.time)}</div>
            <div class="booking-info">
              <div class="booking-name">${escapeHtml(b.name)}</div>
              <div class="booking-phone"><a href="tel:${b.phone}">${escapeHtml(b.phone)}</a></div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      listEl.innerHTML = '<div class="loading">Failed to load</div>';
    }
  }

  // ===== LOAD STATS =====
  async function loadStats() {
    const today = new Date();
    const todayStr = formatDate(today);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    // Today
    try {
      const res = await fetch(`/api/bookings?password=${encodeURIComponent(password)}&date=${todayStr}`);
      const data = await res.json();
      const todayBookings = data.bookings || [];
      document.getElementById('stat-today').textContent = todayBookings.length;

      // Next up
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const next = todayBookings.find(b => {
        const [h, m] = b.time.split(':').map(Number);
        return h * 60 + m > nowMin;
      });
      document.getElementById('stat-next').textContent = next ? formatTime12(next.time) : '—';
    } catch (e) {}

    // Tomorrow
    try {
      const res = await fetch(`/api/bookings?password=${encodeURIComponent(password)}&date=${tomorrowStr}`);
      const data = await res.json();
      document.getElementById('stat-tomorrow').textContent = (data.bookings || []).length;
    } catch (e) {}

    // This week (next 7 days)
    let weekTotal = 0;
    const weekPromises = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = formatDate(d);
      weekPromises.push(
        fetch(`/api/bookings?password=${encodeURIComponent(password)}&date=${ds}`)
          .then(r => r.json())
          .then(data => (data.bookings || []).length)
          .catch(() => 0)
      );
    }
    const weekCounts = await Promise.all(weekPromises);
    weekTotal = weekCounts.reduce((a, b) => a + b, 0);
    document.getElementById('stat-week').textContent = weekTotal;
  }

  // ===== POLLING =====
  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
      loadDayBookings(selectedDate);
      loadStats();
      // Refresh month counts less frequently
    }, 30000);
  }

  // ===== CHIME =====
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [880, 1108.73];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch (e) {}
  }

  // ===== TOAST =====
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // ===== HELPERS =====
  function formatDate(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function formatTime12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { login, logout, prevMonth, nextMonth, selectDay };
})();
