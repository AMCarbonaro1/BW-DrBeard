import { createClient } from '@vercel/kv';

function getKV() {
  return createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, date } = req.query;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const kv = getKV();

  try {
    if (date === 'all') {
      const keys = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        keys.push(`bookings:${dateStr}`);
      }

      const allBookings = [];
      for (const key of keys) {
        const dayBookings = await kv.get(key);
        if (dayBookings && dayBookings.length > 0) {
          allBookings.push(...dayBookings);
        }
      }

      allBookings.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });

      return res.json({ bookings: allBookings });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const bookings = (await kv.get(`bookings:${targetDate}`)) || [];
    bookings.sort((a, b) => a.time.localeCompare(b.time));

    res.json({ bookings, date: targetDate });
  } catch (e) {
    console.error('KV error:', e);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}
