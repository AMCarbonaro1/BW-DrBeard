You are building a barber shop booking system template. The existing site is in "Drbeard copy/" — a static HTML/CSS/JS barber shop website using Tailwind CDN, Bebas Neue + Inter fonts, dark theme (#0a0a0a bg, green #10b981 accent).

YOUR TASK: Convert this into a Vercel-deployable project with an integrated booking system and admin panel.

## Project Structure to Create

```
/Users/amcarbonaro/bw/OurSystem/
├── public/                    # Static website files
│   ├── index.html            # Main website (copied from Drbeard copy, modified)
│   ├── style.css
│   ├── script.js
│   ├── booking.js            # Booking modal logic
│   ├── booking.css           # Booking modal styles
│   ├── photos/               # Copy from Drbeard copy/photos
│   └── admin/
│       ├── index.html        # Admin dashboard
│       ├── admin.css
│       └── admin.js
├── api/                      # Vercel serverless functions
│   ├── slots.js              # GET /api/slots?date=2026-04-05
│   ├── book.js               # POST /api/book
│   └── bookings.js           # GET /api/bookings?password=xxx&date=2026-04-05
├── package.json
├── vercel.json
└── config.json               # Shop config (name, colors, hours, etc.)
```

## config.json
Create a template config with shop name, accent color, hours, phone, address, instagram, slot duration (60 min), etc.

## Booking Modal (booking.js + booking.css)
- Replace ALL "Call to Book" buttons with "Book Now" that opens a booking modal
- Dark themed modal matching the site
- Step 1: Calendar date picker (next 14 days)
- Step 2: Available 1-hour time slots as buttons (fetched from /api/slots, grayed out if booked)
- Step 3: Name + Phone form
- Step 4: Confirmation with green checkmark
- Smooth transitions, close on X or click-outside, mobile responsive

## API Endpoints (Vercel serverless, ES modules, use @vercel/kv)
- GET /api/slots?date=YYYY-MM-DD — returns available slots
- POST /api/book — creates booking {name, phone, date, time}, validates, stores in KV
- GET /api/bookings?password=xxx&date=YYYY-MM-DD — admin-only, returns bookings

## Admin Page (public/admin/)
- Password gate (checks against ADMIN_PASSWORD env var via API)
- Shows today bookings sorted by time
- Date navigation (prev/next day)
- Auto-polls every 30 seconds
- Chime sound (Web Audio API) + toast on new booking
- Dark theme, mobile responsive

## Critical
- Copy ENTIRE index.html from "Drbeard copy/index.html" — keep every section, review, SVG. Only change CTA buttons and add booking modal + script includes.
- Copy style.css and script.js from "Drbeard copy/"
- No build step, no React, no frameworks. Pure HTML/CSS/JS.
- package.json just needs @vercel/kv dependency
- vercel.json: outputDirectory "public"

When completely finished, run: openclaw system event --text "Done: Built barber shop booking system" --mode now
