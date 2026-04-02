// ========== BOOKING MODAL ==========
const BookingModal = (() => {
  let currentStep = 1;
  let selectedDate = null;
  let selectedTime = null;
  let calendarMonth = new Date().getMonth();
  let calendarYear = new Date().getFullYear();

  function open() {
    currentStep = 1;
    selectedDate = null;
    selectedTime = null;
    calendarMonth = new Date().getMonth();
    calendarYear = new Date().getFullYear();
    
    const overlay = document.getElementById('booking-overlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderStep();
  }

  function close() {
    const overlay = document.getElementById('booking-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function goTo(step) {
    currentStep = step;
    renderStep();
  }

  function renderStep() {
    // Update step dots
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 === currentStep) dot.classList.add('active');
      if (i + 1 < currentStep) dot.classList.add('done');
    });

    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));

    // Show current step
    const step = document.getElementById(`booking-step-${currentStep}`);
    if (step) step.classList.add('active');

    // Render step content
    if (currentStep === 1) renderCalendar();
    if (currentStep === 2) renderTimeSlots();
    if (currentStep === 3) renderForm();
  }

  // ===== CALENDAR =====
  function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month-label');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);

    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    monthLabel.textContent = `${months[calendarMonth]} ${calendarYear}`;

    let html = '';
    
    // Day labels
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayLabels.forEach(d => {
      html += `<div class="cal-day-label">${d}</div>`;
    });

    // Empty slots before first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      html += '<div class="cal-day empty"></div>';
    }

    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calendarYear, calendarMonth, d);
      date.setHours(0, 0, 0, 0);
      const dateStr = formatDate(date);
      
      const isPast = date < today;
      const isTooFar = date > maxDate;
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate === dateStr;
      
      let cls = 'cal-day';
      if (isPast || isTooFar) cls += ' past';
      else cls += ' available';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';

      if (isPast || isTooFar) {
        html += `<div class="${cls}">${d}</div>`;
      } else {
        html += `<button class="${cls}" onclick="BookingModal.selectDate('${dateStr}')">${d}</button>`;
      }
    }

    container.innerHTML = html;

    // Update next button state
    const nextBtn = document.getElementById('cal-next-btn');
    if (nextBtn) nextBtn.disabled = !selectedDate;
  }

  function prevMonth() {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    // Don't go before current month
    const now = new Date();
    if (calendarYear < now.getFullYear() || 
       (calendarYear === now.getFullYear() && calendarMonth < now.getMonth())) {
      calendarMonth = now.getMonth();
      calendarYear = now.getFullYear();
    }
    renderCalendar();
  }

  function nextMonth() {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderCalendar();
  }

  function selectDate(dateStr) {
    selectedDate = dateStr;
    selectedTime = null;
    renderCalendar();
    // Auto-advance to time slots
    setTimeout(() => goTo(2), 200);
  }

  // ===== TIME SLOTS =====
  async function renderTimeSlots() {
    const container = document.getElementById('time-slots-grid');
    const dateLabel = document.getElementById('selected-date-label');
    
    // Format date nicely
    const d = new Date(selectedDate + 'T12:00:00');
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateLabel.textContent = d.toLocaleDateString('en-US', options);

    container.innerHTML = '<div class="booking-loading"><div class="spinner"></div>Loading available times...</div>';

    try {
      const res = await fetch(`/api/slots?date=${selectedDate}`);
      const data = await res.json();

      if (data.closed) {
        container.innerHTML = '<p style="text-align:center;color:#999;">Shop is closed on this day</p>';
        return;
      }

      if (!data.slots || data.slots.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">No slots available</p>';
        return;
      }

      let html = '';
      data.slots.forEach(slot => {
        const timeLabel = formatTime12(slot.time);
        if (slot.available) {
          const selClass = selectedTime === slot.time ? ' selected' : '';
          html += `<button class="time-slot${selClass}" onclick="BookingModal.selectTime('${slot.time}')">${timeLabel}</button>`;
        } else {
          html += `<div class="time-slot unavailable">${timeLabel}</div>`;
        }
      });

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = '<p style="text-align:center;color:#ef4444;">Failed to load time slots. Please try again.</p>';
    }
  }

  function selectTime(time) {
    selectedTime = time;
    // Update selected state
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
    // Auto-advance to form
    setTimeout(() => goTo(3), 200);
  }

  // ===== FORM =====
  function renderForm() {
    const summaryDate = document.getElementById('form-summary-date');
    const summaryTime = document.getElementById('form-summary-time');
    
    const d = new Date(selectedDate + 'T12:00:00');
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    summaryDate.textContent = d.toLocaleDateString('en-US', options);
    summaryTime.textContent = formatTime12(selectedTime);

    // Clear any previous errors
    const errEl = document.getElementById('booking-form-error');
    if (errEl) errEl.remove();
  }

  async function submitBooking() {
    const name = document.getElementById('booking-name').value.trim();
    const phone = document.getElementById('booking-phone').value.trim();
    const submitBtn = document.getElementById('booking-submit-btn');
    
    // Clear previous errors
    const oldErr = document.getElementById('booking-form-error');
    if (oldErr) oldErr.remove();

    if (!name) return showFormError('Please enter your name');
    if (!phone) return showFormError('Please enter your phone number');
    if (phone.replace(/\D/g, '').length < 7) return showFormError('Please enter a valid phone number');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          date: selectedDate,
          time: selectedTime
        })
      });

      const data = await res.json();

      if (!res.ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
        return showFormError(data.error || 'Something went wrong');
      }

      // Show confirmation
      const confDate = document.getElementById('confirm-date');
      const confTime = document.getElementById('confirm-time');
      const confName = document.getElementById('confirm-name');
      
      const d = new Date(selectedDate + 'T12:00:00');
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      confDate.textContent = d.toLocaleDateString('en-US', options);
      confTime.textContent = formatTime12(selectedTime);
      confName.textContent = name;

      goTo(4);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
      showFormError('Network error. Please try again.');
    }
  }

  function showFormError(msg) {
    const body = document.querySelector('#booking-step-3 .booking-form-group:first-child');
    const err = document.createElement('div');
    err.id = 'booking-form-error';
    err.className = 'booking-error';
    err.textContent = msg;
    body.parentNode.insertBefore(err, body);
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

  return {
    open,
    close,
    goTo,
    prevMonth,
    nextMonth,
    selectDate,
    selectTime,
    submitBooking
  };
})();

// Close on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('booking-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) BookingModal.close();
    });
  }

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') BookingModal.close();
  });
});
