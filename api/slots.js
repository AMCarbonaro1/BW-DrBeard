import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

const config = JSON.parse(readFileSync(join(process.cwd(), 'config.json'), 'utf8'));
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestDate = new Date(date + 'T00:00:00');
  if (requestDate < today) {
    return res.status(400).json({ error: 'Cannot book in the past' });
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = days[requestDate.getDay()];
  const hours = config.defaultHours[dayName];

  if (!hours) {
    return res.json({ slots: [], closed: true });
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
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(time);
    currentMin += duration;
  }

  let bookings = [];
  try {
    const shopId = config.shopId || 'default';
    bookings = (await redis.get(`${shopId}:bookings:${date}`)) || [];
  } catch (e) {
    console.error('Redis read error:', e);
  }

  const bookedTimes = new Set(bookings.map(b => b.time));

  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];

  const result = slots.map(time => {
    let available = !bookedTimes.has(time);

    if (isToday) {
      const [slotH, slotM] = time.split(':').map(Number);
      const slotDate = new Date(now);
      slotDate.setHours(slotH, slotM, 0, 0);
      if (slotDate <= now) {
        available = false;
      }
    }

    return { time, available };
  });

  res.json({ slots: result, date });
}
