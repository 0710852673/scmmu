# SCCMU Digital Platform — Build Plan

A 3-part platform at sccmu.lk: public marketing site, member portal with ranking engine, and MediaFlow content workflow. Built on TanStack Start + Lovable Cloud. White Apple/Notion aesthetic. Placeholder content throughout — you swap real assets later.

## Phase 0 — Design direction (first step after approval)
Generate 3 rendered design directions in the white/Apple/Notion register (varying composition, density, hierarchy) for the public Home page. You pick one; tokens (palette, type, radii, spacing) get locked across every surface — public site, portal dashboard, admin, MediaFlow.

## Phase 1 — Foundation
- Enable Lovable Cloud (auth, Postgres, storage, email).
- Design tokens in `src/styles.css` (white bg, neutral grays, single accent, generous spacing, rounded cards, large type).
- App shells: public marketing layout + authenticated portal layout with sidebar.
- Role system via `app_role` enum + `user_roles` table + `has_role()` SECURITY DEFINER (member, section_head, executive_board, tic, administrator). No public signup — accounts created only by admin.
- Email/password auth + `/auth` page. `_authenticated/` gated subtree.

## Phase 2 — Public Website
Routes (each with its own SEO `head()`):
- `/` Home — hero, intro, live stats, featured projects, latest productions, CTAs
- `/about` — history, timeline, achievements, awards
- `/divisions` index + `/divisions/$slug` for Photography, Photo Editing & Graphics, Videography & Editing, Live Streaming, Technical, Announcing, Social Media (description, team, gallery, stats, achievements)
- `/projects` index + `/projects/$slug` (Live on the Lake, Student Parliament Live, Sports Meet, Prize Giving) — description, photos, videos, crew, stats
- `/gallery` with category tabs (Photography, Videography, BTS, Live Productions)
- `/leadership` — Executive Board, Section Heads, TIC Board with photo cards
- `/contact` — Facebook, WhatsApp Channel, TikTok, YouTube, WhatsApp, email, address, form, big "Chat With SCCMU" button
- `/book` — event booking (see Phase 3)

Stats on Home are read from DB (aggregations) so they stay live.

## Phase 3 — Event Booking System
- `/book` route with tabs: Internal School Request / Inter-School Request.
- Form fields: event name, dept/school, contact person, WhatsApp, date, time, venue, event type, **multi-select required services** (Photography, Videography, Live Streaming, Announcing, LED Wall Control, Audio, Other), audience size, notes.
- On submit: persist to `bookings`, send Gmail notification via server function + Resend (or Cloud email), show "Our team will contact you through WhatsApp shortly."
- Admin sees in dashboard with status pipeline: New Request → Contacted → Under Discussion → Confirmed → Completed → Rejected.

## Phase 4 — Member Portal
- `/portal` dashboard: attendance %, current rank, events participated, skill levels, achievements, notifications.
- `/portal/profile` — photo, name, admission #, grade, class, section, join date, contacts; tabs for attendance / events / achievements / skill levels.
- `/portal/attendance` — manual marking (Phase 1); shows %, monthly, yearly. (Fingerprint = future.)
- `/portal/events` — browse events, request to participate (select role) → pending/approved/rejected. "Missing event" submission flow for head review.
- `/portal/mediaflow` — see Phase 6.
- `/portal/announcements` + section notices + direct messages + task assignments.

## Phase 5 — Ranking, Skills & Achievements Engine
- `points_log` table: every action (attend meeting=1, participate=5, lead=10, upload=1, approved edit=3, approved caption=2, publish=2, complete task=2). Inserted only after head approval.
- Per-division scores: photography_score, editing_score, streaming_score, social_score (derived views).
- Overall = 20% attendance + 50% contributions + 20% participation + 10% leadership.
- Activity Level (computed monthly): Inactive <10, Active 10–30, Highly Active 30–60, Elite 60+.
- Skill Levels per division (Beginner/Intermediate/Advanced/Expert) assigned by section head.
- Achievements/badges: First Event, 10/25/50 Events, Stream Specialist, Senior Photographer, Senior Editor, Trainee, etc. — auto-granted by triggers + manual grants.
- Annual Awards page: system surfaces top 5 nominees per category (Best Photographer/Editor/Stream Operator/Announcer/Caption Writer/Social Media/Most Active + extras); board confirms winner. MVP picked from top contributors.
- All point-earning contributions require head approval before points settle (pending → approved → points awarded).

## Phase 6 — MediaFlow System
- `media_items` table tracks workflow: Uploaded → Editing → Edited → Caption Writing → Review → Approved → Published.
- Kanban-style board + list view, role-aware actions (photographer uploads, head assigns editor, editor uploads edited version, head assigns caption writer, caption submitted, head reviews, publish).
- Storage bucket for raw + edited files; thumbnails.
- Every transition logged + contributes to points (after approval).

## Phase 7 — Admin Panel (`/admin`)
Manage Members (create accounts, assign roles), Attendance, Events, Divisions, Projects, Rankings (view/adjust), Bookings (pipeline), MediaFlow oversight, Contact Messages.

## Phase 8 — Polish
SEO `head()` per route, responsive QA, motion (framer-motion subtle), 404/error boundaries, accessibility pass.

## Out of scope (Phase 2 later)
Equipment QR system, biometric attendance.

---

## Technical notes
- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn + framer-motion.
- Lovable Cloud (Supabase under the hood) for DB/auth/storage; Resend or built-in email for booking notifications.
- Roles in `user_roles` (never on profiles). RLS on every table; `has_role()` SECURITY DEFINER used in policies.
- Public reads via narrow `TO anon` SELECT policies + server publishable client (stats, divisions, projects, gallery, leadership).
- All point awards gated through head-approval server functions to prevent spam.
- File uploads via Supabase Storage with signed URLs.
- This is a large multi-week scope — first build delivers structure end-to-end with placeholder content; we'll iterate per area.
