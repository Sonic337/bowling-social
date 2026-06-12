# Bowling Social

Admin-operated platform for organizing bowling sessions among strangers in Pune.

## Stack

- **Frontend** — React + Vite
- **Backend** — Node.js + Express (serverless on Vercel via `api/[...path].js`)
- **Database** — PostgreSQL

---

## Local setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd bowling-social
npm install
```

### 2. Provision a PostgreSQL database

Options (all have free tiers):
- [Neon](https://neon.tech) — recommended, serverless Postgres
- [Supabase](https://supabase.com)
- Local: `createdb bowling_social`

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/bowling_social
ADMIN_PASSWORD=your-secret-password
NODE_ENV=development
```

### 4. Create tables

```bash
npm run db:init
```

### 5. Run

```bash
npm run dev
```

- Public form: http://localhost:5173
- Admin dashboard: http://localhost:5173/admin

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push
```

### 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: **Vite** (auto-detected)
4. Add environment variables:
   - `DATABASE_URL` — your production Postgres connection string
   - `ADMIN_PASSWORD` — your admin password
   - `NODE_ENV` — `production`
5. Deploy

The `api/[...path].js` catch-all is automatically deployed as a serverless function. All `/api/*` requests route to it; everything else serves the React SPA.

### Notes

- The database must be accessible from Vercel's servers. Neon and Supabase work out of the box. If using Railway Postgres, enable public networking.
- Run `npm run db:init` once against your production `DATABASE_URL` to create tables, or run the `server/db/schema.sql` directly in your database console.
- The admin password is stored only in your environment variables and never committed to git.

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Public intake form |
| `/admin/login` | Admin password login |
| `/admin` | Dashboard — users + sessions |
| `/admin/sessions/:id` | Session detail + copy tools |

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/submit` | none | Submit intake form |
| POST | `/api/admin/auth` | none | Verify password, return token |
| GET | `/api/admin/users` | ✓ | List users (filters: gender, area, day; sort, order) |
| GET | `/api/admin/users/:id` | ✓ | Single user |
| POST | `/api/admin/sessions` | ✓ | Create session with user_ids |
| GET | `/api/admin/sessions` | ✓ | List sessions with member count |
| GET | `/api/admin/sessions/:id` | ✓ | Session + full member list |
| PATCH | `/api/admin/sessions/:id` | ✓ | Update session fields / status |

Auth is a `Bearer <token>` header where token is `btoa(ADMIN_PASSWORD)`.
