# Customer Support Management System (v2)

React 18 + TypeScript + Vite + Tailwind CSS frontend for the PHP/MySQL Support Management API.
The frontend uses bearer-token authentication and sends records, users, settings, dashboard, and
token requests to the backend configured by `VITE_API_URL` in `.env`.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Start the PHP backend and configure its database and API settings in `sms-backend/.env` before
using the app. Keep credentials and API secrets out of source control. User accounts are created
through the admin interface; there are no built-in demo credentials.

## Features

| Area             | What it does                                                                                                                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard        | Today / 7-day / total / average-duration cards, records-per-day chart (7/14/30 days), status, product, license, customer-type charts, top staff (admin)                                                                                                                             |
| Records          | Create, **edit**, **delete**, **status tracking** (Open → In Progress → Resolved → Self Resolved) with full status history and "last updated by"                                                                                                                                    |
| Day books        | Sortable columns, pagination (10/25/50/100), filters (date, product, license/type, status, serial/mobile search)                                                                                                                                                                    |
| Export           | **Excel (.xlsx)** and **CSV** of exactly what the filters show; admin reports export too                                                                                                                                                                                            |
| Tokens           | **Generate Token** button (Support + Caller): customer name, phone, software, progress (Pending / On Going). Staff change progress in the **Tokens** tab; saving the main form marks the token **Completed**. Admin sees a **Live Tokens** panel (2 at a time, rest one click away) |
| Customer History | Search a mobile or serial number → every earlier support + caller interaction, newest first                                                                                                                                                                                         |
| Reports (admin)  | Date range + record type + staff member → totals, daily chart, per-staff table (sortable, exportable)                                                                                                                                                                               |
| Print / PDF      | One record → clean A4 page with screenshots (browser print dialog → "Save as PDF")                                                                                                                                                                                                  |
| Timer            | Support **and Caller** forms have the live Start/End timer; it survives tab switches and page refresh                                                                                                                                                                               |
| Theme            | Light / Dark / System, 4 colour palettes (Indigo, Emerald, Violet, Slate), remembered per browser                                                                                                                                                                                   |
| Users (admin)    | Create / edit / delete accounts, sortable + paginated                                                                                                                                                                                                                               |

## Folder structure

```
src/
├── app/            App shell: providers, routes (lazy-loaded per role), ProtectedRoute
├── config/         Everything you may want to change: dropdown options, statuses, roles, theme, feature switches
├── types/          TypeScript types (user.ts, record.ts)
├── context/        Auth, Records (one shared store), Theme
├── hooks/          useAuth, useRecords, useTheme, useSessionTimer, useTabParam, useModalBehavior
├── services/       API client and user, record, token, dashboard, and settings services
├── lib/            Pure helpers: time, stats, search, validation, permissions, files
│   ├── export/     csv.ts · xlsx.ts · tables.ts · download.ts
│   └── print/      printRecord.ts
├── components/     Reusable UI, no business logic
│   ├── ui/         Button, Field, Modal, ConfirmDialog, Badge, Card, StatCard, Tabs, Notice, Icon…
│   ├── data-table/ DataTable (sort + paginate), Pagination
│   ├── charts/     BarChart, DonutChart, BarList (plain SVG, no chart library)
│   ├── layout/     Navbar, ThemeMenu, DashboardLayout
│   ├── records/    Editors, pickers, filters, status badge, export menu
│   └── timer/      Timer banner, fields, live tab badge
├── features/       One folder per screen/domain
│   ├── auth/  support/  caller/  admin/  dashboard/  history/  records/
├── styles/         index.css — all colours are CSS variables (light, dark, 4 palettes)
└── test/           End-to-end flows (login → create → edit → export → delete …)
```

Rules of thumb: `components/` never imports from `features/`; `lib/` never imports React;
`services/` is the only layer that touches storage.

## Configuration (src/config)

- `options.ts` — products, licenses, offers, customer types, statuses.
- `app.ts` — `SHOW_DEMO_CREDENTIALS`, `SHARE_HISTORY_ACROSS_STAFF`, page sizes, attachment limit.
- `theme.ts` — palettes. To add a colour, add it here and a `html[data-palette="…"]` block in `styles/index.css`.

## Permissions

- Admin sees and manages everything.
- Support / Caller users see **only the records they created** and can edit/delete those.
- Customer History searches **all** records (every staff, support + caller). Set `SHARE_HISTORY_ACROSS_STAFF = false` in `src/config/app.ts` to limit staff to their own.
- Tokens: staff see/change their own tokens; admin sees all.
- The PHP backend must enforce role and ownership checks for every protected operation; frontend
  checks only control the visible interface.

## Backend

The PHP API and MySQL schema are in the sibling `sms-backend/` and `sms-db/` directories. The SQL
schema is the database source of truth. Frontend record and user IDs are strings because the backend
uses UUIDs; do not convert them to JavaScript numbers.
