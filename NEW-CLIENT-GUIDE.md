# New Client Setup Guide

## What You Need From the Client

Before starting, collect this info:

| Info | Example | Required |
|------|---------|----------|
| Shop name | The Fade Zone | ✅ |
| Address | 2428 Fort Park Blvd, Lincoln Park, MI 48146 | ✅ |
| Phone number | (415) 466-5339 | ✅ |
| Hours (per day) | Mon-Fri 10am-8pm, Sat 9am-6pm, Sun closed | ✅ |
| Instagram handle | @the_fadezonebarbershop | ✅ |
| Photos (6-12) | Storefront, interior, 6-9 haircut photos | ✅ |
| Google reviews link | Google Maps listing URL | ✅ |
| Services offered | Fades, beard trims, kids cuts, etc. | ✅ |
| Accent color preference | Gold, blue, red, green, etc. | Optional (we pick) |
| Logo / branding | Image file if they have one | Optional |
| Admin password | Something they'll remember | ✅ |

---

## Step 1: Build the Site

Tell Hali (or do manually):

> "New barber shop client. Here's their info: [paste info above]. Build their site from the OurSystem template."

**What happens:**
- Template gets cloned to `bw/Barber Shops/[ShopName]/`
- All content swapped: name, address, phone, hours, reviews, photos, colors
- Booking system included automatically
- Admin dashboard included automatically

**Manual method (if doing yourself):**
1. Copy the `OurSystem/` folder → `Barber Shops/[ShopName]/`
2. Edit `config.json` with client info
3. Edit `public/index.html`:
   - Replace shop name, address, phone everywhere
   - Replace Google Maps embed URL
   - Update services section
   - Replace reviews
   - Replace photo filenames
   - Update Instagram links
   - Update structured data (JSON-LD)
   - Update meta tags (title, description, OG)
4. Drop their photos into `public/photos/`
5. Update `public/style.css` accent color (search/replace)

---

## Step 2: Create GitHub Repo

```bash
cd "bw/Barber Shops/[ShopName]"
git init
git add -A
git commit -m "initial site"
gh repo create [repo-name] --private --source . --push
```

Example: `gh repo create fadezone-site --private --source . --push`

---

## Step 3: Deploy to Vercel

### First Time Setup (one-time)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Make sure your GitHub account is connected

### For Each New Client

#### A. Create Project
1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to the client's GitHub repo
3. Settings:
   - **Framework Preset:** Other
   - **Build Command:** (leave empty)
   - **Output Directory:** `public`
4. Click **Deploy**

#### B. Add KV Storage (Database for Bookings)

> ⚠️ Vercel KV is now deprecated. Use **Upstash Redis** instead:

1. Go to [vercel.com/marketplace](https://vercel.com/marketplace)
2. Search for **Upstash Redis**
3. Click **Add Integration**
4. Select the client's project
5. Create a new Redis database (free tier is fine)
6. It automatically adds these env vars to the project:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

#### C. Add Admin Password

1. Go to the project on Vercel → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** whatever password you agreed on with the client
3. Click **Save**
4. **Redeploy** the project (Settings → Deployments → Redeploy)

#### D. Connect Custom Domain

1. Go to project → **Settings** → **Domains**
2. Add the client's domain (e.g., `thefadezone.com`)
3. Vercel shows you DNS records to add
4. Go to the domain registrar (Namecheap, GoDaddy, etc.) and add:
   - **Type:** CNAME
   - **Name:** @ (or www)
   - **Value:** `cname.vercel-dns.com`
   
   Or if using A record:
   - **Type:** A
   - **Value:** `76.76.21.21`
5. Wait for DNS propagation (usually 5-30 minutes)
6. Vercel auto-provisions SSL (HTTPS)

---

## Step 4: Hand Off to Client

Send the client:

```
Your website is live! 🎉

🌐 Website: https://theirshop.com
🔧 Admin Dashboard: https://theirshop.com/admin
🔑 Admin Password: [their password]

Your customers can now book appointments directly on your website.
You'll see all bookings in the admin dashboard — it updates automatically.

Let us know if you need any changes!
```

---

## Costs Per Client

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Hosting | $0 | Free tier (100GB bandwidth/month) |
| Upstash Redis | $0 | Free tier (10,000 commands/day) |
| Domain | $10-15/year | Client usually owns this already |
| **Total** | **$0/month** | Free tier covers a single barber shop easily |

### When Free Tier Isn't Enough
- Vercel Pro: $20/month (if site gets heavy traffic)
- Upstash Pay-as-you-go: ~$0.20/100K commands (unlikely to hit for a barber shop)
- Most barber shops will never exceed free tier

---

## Updating a Client's Site

To make changes after deployment:

```bash
cd "bw/Barber Shops/[ShopName]"
# Make your edits
git add -A
git commit -m "updated hours" 
git push
```

Vercel auto-deploys on every push to main. Changes are live in ~30 seconds.

---

## File Structure Reference

```
ShopName/
├── config.json              ← Shop config (edit this first)
├── package.json             ← Dependencies
├── vercel.json              ← Vercel config (don't touch)
├── api/
│   ├── slots.js             ← Available time slots
│   ├── book.js              ← Create booking
│   └── bookings.js          ← Admin: view bookings
└── public/
    ├── index.html           ← Main website
    ├── style.css            ← Styles
    ├── script.js            ← Animations, lightbox, etc.
    ├── booking.css          ← Booking modal styles
    ├── booking.js           ← Booking modal logic
    ├── photos/              ← All shop photos
    │   ├── outside.jpg      ← Hero/storefront photo
    │   ├── inside.jpg       ← Interior photos
    │   ├── cut1.jpg          ← Haircut gallery (6-9 photos)
    │   └── ...
    └── admin/
        ├── index.html       ← Admin dashboard
        ├── admin.css        ← Admin styles
        └── admin.js         ← Admin logic
```

---

## Checklist Per Client

- [ ] Collected all client info
- [ ] Built site from template
- [ ] All photos added and referenced
- [ ] Reviews added (8-10 from Google)
- [ ] Hours correct in config.json
- [ ] Tested booking flow locally
- [ ] GitHub repo created (private)
- [ ] Vercel project created
- [ ] Upstash Redis connected
- [ ] ADMIN_PASSWORD env var set
- [ ] Custom domain connected
- [ ] SSL working (https)
- [ ] Sent client their URLs + password
- [ ] First monthly invoice sent
