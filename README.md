# Chittagong Sunshine School & College

Public website and school management system for Sunshine CSSC: a public
marketing site, student/parent and teacher/staff dashboards, an admin
dashboard, and a CMS that drives the public pages.

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui (this directory).
- **Backend**: Node.js + Express + MongoDB API — see [`backend/README.md`](backend/README.md)
  for setup, environment variables, and how to create the first admin account.

## Quick start

```bash
# backend (see backend/README.md for first-time setup, env vars, and seeding an admin)
cd backend && npm install && npm run dev

# frontend, in a separate terminal
npm install
cp .env.example .env   # set VITE_API_BASE_URL if the backend isn't on localhost:4000
npm run dev             # http://localhost:8080
```

## Frontend scripts

```bash
npm run dev       # Vite dev server
npm run build      # production build
npm run lint        # ESLint
npm test             # Vitest
```

## Dashboards

- `/login/students` — student & parent sign-in → `/portal/*`
- `/login/teachers` — teacher, staff & admin sign-in → `/staff-portal/*` or `/admin/*`
- Admin manages users, academics, attendance, examinations, admissions, and
  the website content (homepage hero, notices, news, gallery, site settings)
  from `/admin/*`.

Developed by [BePro IT](https://bepro.it.com/).
