import { kv } from '@vercel/kv';
import config from '../config.json' assert { type: 'json' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, date, time } = req.body || {};

  // Validate fields
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields: name, phone, date, time' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
  }

  // Check date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = new Date(date + 'T00:00:00');
  if (bookingDate < today) {
    return res.status(400).json({ error: 'Cannot book in the past' });
  }

  // Check the day has hours
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[bookingDate.getDay()];
  const hours = config.defaultHours[dayName];
  if (!hours) {
    return res.status(400).json({ error: 'Shop is closed on this day' });
  }

  // Check time is within shop hours
  const [bookH, bookM] = time.split(':').map(Number);
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const bookMin = bookH * 60 + bookM;
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  const duration = config.slotDurationMinutes || 60;

  if (bookMin < openMin || bookMin + duration > closeMin) {
    return res.status(400).json({ error: 'Time is outside shop hours' });
  }

  // Check slot is not already booked
  let bookings = [];
  try {
    bookings = (await kv.get(`bookings:${date}`)) || [];
  } catch (e) {
    console.error('KV read error:', e);
  }

  const alreadyBooked = bookings.some(b => b.time === time);
  if (alreadyBooked) {
    return res.status(409).json({ error: 'This time slot is already booked' });
  }

  // Create booking
  const booking = {
    name: name.trim(),
    phone: phone.trim(),
    date,
    time,
    createdAt: new Date().toISOString()
  };

  bookings.push(booking);

  try {
    await kv.set(`bookings:${date}`, bookings);
  } catch (e) {
    console.error('KV write error:', e);
    return res.status(500).json({ error: 'Failed to save booking' });
  }

  res.json({ success: true, booking });
}
