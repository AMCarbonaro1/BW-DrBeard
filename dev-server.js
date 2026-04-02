import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// In-memory booking store (replaces Vercel KV for local dev)
const store = {};

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// ===== API HANDLERS =====

function handleSlots(query, res) {
  const date = query.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonRes(res, 400, { error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestDate = new Date(date + 'T00:00:00');
  if (requestDate < today) {
    return jsonRes(res, 400, { error: 'Cannot book in the past' });
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[requestDate.getDay()];
  const hours = config.defaultHours[dayName];

  if (!hours) {
    return jsonRes(res, 200, { slots: [], closed: true });
  }

  const openHour = parseInt(hours.open.split(':')[0]);
  const openMin = parseInt(hours.open.split(':')[1]);
  const closeHour = parseInt(hours.close.split(':')[0]);
  const closeMin = parseInt(hours.close.split(':')[1]);
  const duration = config.slotDurationMinutes || 60;

  const slots = [];
  let currentMin = openHour * 60 + openMin;
  const endMin = closeHour * 60 + closeMin;

  while (currentMin + duration <= endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    currentMin += duration;
  }

  const bookings = store[`bookings:${date}`] || [];
  const bookedTimes = new Set(bookings.map(b => b.time));

  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];

  const result = slots.map(time => {
    let available = !bookedTimes.has(time);
    if (isToday) {
      const [slotH, slotM] = time.split(':').map(Number);
      const slotDate = new Date(now);
      slotDate.setHours(slotH, slotM, 0, 0);
      if (slotDate <= now) available = false;
    }
    return { time, available };
  });

  jsonRes(res, 200, { slots: result, date });
}

function handleBook(body, res) {
  const { name, phone, date, time } = body;

  if (!name || !phone || !date || !time) {
    return jsonRes(res, 400, { error: 'Missing required fields' });
  }

  const key = `bookings:${date}`;
  const bookings = store[key] || [];

  if (bookings.some(b => b.time === time)) {
    return jsonRes(res, 409, { error: 'This time slot is already booked' });
  }

  const booking = { name: name.trim(), phone: phone.trim(), date, time, createdAt: new Date().toISOString() };
  bookings.push(booking);
  store[key] = bookings;

  console.log(`📅 New booking: ${name} on ${date} at ${time}`);
  jsonRes(res, 200, { success: true, booking });
}

function handleBookings(query, res) {
  const password = query.get('password');
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  if (password !== adminPassword) {
    return jsonRes(res, 401, { error: 'Invalid password' });
  }

  const date = query.get('date') || new Date().toISOString().split('T')[0];

  if (date === 'all') {
    const allBookings = [];
    for (const [key, val] of Object.entries(store)) {
      if (key.startsWith('bookings:')) allBookings.push(...val);
    }
    allBookings.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return jsonRes(res, 200, { bookings: allBookings });
  }

  const bookings = (store[`bookings:${date}`] || []).sort((a, b) => a.time.localeCompare(b.time));
  jsonRes(res, 200, { bookings, date });
}

function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

// ===== SERVER =====

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // API routes
  if (pathname === '/api/slots' && req.method === 'GET') {
    return handleSlots(url.searchParams, res);
  }

  if (pathname === '/api/book' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        handleBook(JSON.parse(body), res);
      } catch {
        jsonRes(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (pathname === '/api/bookings' && req.method === 'GET') {
    return handleBookings(url.searchParams, res);
  }

  // Static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  
  // If path ends with / or no extension, try index.html
  if (!path.extname(filePath)) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) filePath = indexPath;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const ext = path.extname(filePath);
  const mime = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('Server error');
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  💈 Barbershop Booking - Local Dev Server');
  console.log('  ─────────────────────────────────────────');
  console.log(`  🌐 Website:  http://localhost:${PORT}`);
  console.log(`  🔧 Admin:    http://localhost:${PORT}/admin`);
  console.log(`  🔑 Password: admin`);
  console.log('');
  console.log('  Bookings stored in memory (resets on restart)');
  console.log('');
});
