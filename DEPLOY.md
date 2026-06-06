# VisionTrack Malawi — Deploy Guide (Supabase + Netlify)

This website uses:

| Layer | Service | What it does |
|-------|---------|----------------|
| **Frontend** | `index.html`, `style.css`, `script.js` | Landing page, contact, theme |
| **Backend** | [Supabase](https://supabase.com) | User accounts (sign up / sign in) + community comments |
| **Hosting** | [Netlify](https://netlify.com) | Live public link (e.g. `https://your-site.netlify.app`) |

---

## Quick start (Supabase + Netlify in order)

1. Create a free project at [supabase.com](https://supabase.com).
2. Run the SQL in **Part 1 → Step 2** below (creates `profiles` + `comments` tables).
3. Copy **Project URL** + **anon key** into `js/config.js`.
4. Open `index.html` locally → test **Account** and **Community** sections.
5. Deploy the whole folder to [Netlify Drop](https://app.netlify.com/drop) → share your live link.

---

## Supabase ↔ `index.html` — full integration map

Everything below is already built into `index.html`. You only need to add your Supabase keys in `js/config.js`.

### Scripts loaded at the bottom of `index.html`

These four lines connect the page to Supabase (must stay in this order):

```html
  <!-- Supabase (accounts + comments). Configure keys in js/config.js — see DEPLOY.md -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="js/config.js"></script>
  <script src="js/backend.js"></script>
  <script src="script.js"></script>
```

| Load order | File | Purpose |
|------------|------|---------|
| 1 | Supabase CDN | Official Supabase JavaScript client |
| 2 | `js/config.js` | Your `SUPABASE_URL` + `SUPABASE_ANON_KEY` |
| 3 | `js/backend.js` | Auth + comments logic |
| 4 | `script.js` | UI animations, contact form, theme |

### Navigation links in `index.html`

| Menu item | Anchor | Supabase feature |
|-----------|--------|------------------|
| Community | `#community` | Read/post comments |
| Account | `#account` | Sign up / sign in / sign out |

### Account section (`#account`) — HTML elements

| Element ID | Type | Supabase action |
|------------|------|-----------------|
| `signup-form` | Form | `auth.signUp()` — creates user + `profiles` row |
| `signup-name` | Input | Stored as `full_name` in user metadata |
| `signup-email` | Input | User email |
| `signup-password` | Input | Password (min 6 characters) |
| `signup-role` | Select | Stored as `role` (student, graduate, mentor, institution) |
| `login-form` | Form | `auth.signInWithPassword()` |
| `login-email` | Input | User email |
| `login-password` | Input | Password |
| `logout-btn` | Button | `auth.signOut()` |
| `auth-status` | Div | Shows “Signed in as …” when logged in |
| `auth-feedback` | Paragraph | Success/error messages |

### Community section (`#community`) — HTML elements

| Element ID | Type | Supabase action |
|------------|------|-----------------|
| `comments-list` | Div | Loads rows from `comments` table (newest first) |
| `comment-form` | Form | Hidden until user is signed in |
| `comment-input` | Textarea | Comment text (max 2000 characters) |
| `comments-feedback` | Paragraph | Post success/error messages |
| `comments-login-hint` | Paragraph | Shown when not signed in |
| `backend-notice` | Paragraph | Shown when `js/config.js` is not configured |

### Data flow (how it works)

```
Visitor opens index.html
        ↓
js/config.js provides SUPABASE_URL + SUPABASE_ANON_KEY
        ↓
js/backend.js creates Supabase client
        ↓
┌─────────────────────┬──────────────────────┐
│  #account           │  #community          │
│  signUp / signIn    │  SELECT comments     │
│  → auth.users       │  INSERT comment      │
│  → profiles table   │  (requires login)    │
└─────────────────────┴──────────────────────┘
```

### Supporting project files

| File | Role |
|------|------|
| `js/config.js` | **You edit this** — paste Project URL + anon key |
| `js/config.example.js` | Template copy (do not delete) |
| `js/backend.js` | Sign up, sign in, sign out, load/post comments |
| `supabase/schema.sql` | Database tables + Row Level Security (run once in Supabase) |

Until `js/config.js` has real keys, the site shows: *“Backend not connected yet.”*

---

## Part 1 — Supabase setup (step by step)

### Step 1: Create a Supabase project

1. Open **[https://supabase.com](https://supabase.com)** and sign up (free tier is enough).
2. Click **New project**.
3. Fill in:
   - **Name:** `visiontrack-malawi` (or any name)
   - **Database password:** choose a strong password (save it somewhere safe)
   - **Region:** pick the closest to Malawi if available
4. Click **Create new project** and wait ~2 minutes for it to finish.

---

### Step 2: Run the database schema

1. In your Supabase project, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Copy the full SQL below (same as `supabase/schema.sql`) and paste it into the editor.
4. Click **Run** (or press Ctrl+Enter).

You should see **Success. No rows returned**.

#### Full schema (copy everything below)

```sql
-- VisionTrack Malawi — Supabase database schema

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text default 'member',
  email text,
  created_at timestamptz not null default now()
);

-- Community comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  content text not null check (char_length(content) >= 1 and char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_created_at_idx on public.comments (created_at desc);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.comments enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can post comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete using (auth.uid() = user_id);
```

#### What this creates

| Table | Columns | Purpose |
|-------|---------|---------|
| `profiles` | `id`, `full_name`, `role`, `email`, `created_at` | One row per registered user |
| `comments` | `id`, `user_id`, `author_name`, `content`, `created_at` | Community comment posts |

**Security (RLS):** Anyone can *read* comments. Only *signed-in* users can *post* comments. Users can delete their own comments.

---

### Step 3: Enable email authentication

1. In Supabase, go to **Authentication** → **Providers**.
2. Open **Email**.
3. Make sure **Enable Email provider** is ON.
4. For quick testing (optional): turn **OFF** “Confirm email” so users can sign in immediately after sign up.
5. For production: turn **ON** “Confirm email” so only verified emails can sign in.

---

### Step 4: Get your API keys

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy these two values:

| Setting in Supabase | Put in `js/config.js` as |
|---------------------|---------------------------|
| **Project URL** | `SUPABASE_URL` |
| **anon public** (under Project API keys) | `SUPABASE_ANON_KEY` |

> Use the **anon** key only (not the `service_role` key). The anon key is safe for the browser.

---

### Step 5: Paste keys into `js/config.js`

Open **`js/config.js`** in this project and replace the placeholders:

```javascript
/**
 * Supabase connection — VisionTrack Malawi
 * Get keys from: Supabase Dashboard → Project Settings → API
 */
window.VTM_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
};
```

**Example** (your values will be different):

```javascript
window.VTM_CONFIG = {
  SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxx",
};
```

Save the file, then test locally by opening `index.html` in your browser.

---

### Step 6: Verify Supabase in the Supabase dashboard

After someone signs up on your site:

1. **Authentication** → **Users** — you should see new users.
2. **Table Editor** → **profiles** — name, role, email.
3. **Table Editor** → **comments** — posts from the Community section.

---

## Part 2 — Deploy to Netlify (live website link)

### Files you must upload

Include all of these in your deploy (zip or GitHub):

```
cursor/
├── index.html
├── style.css
├── script.js
├── netlify.toml
├── js/
│   ├── config.js      ← must contain your Supabase keys
│   ├── backend.js
│   └── config.example.js
├── assets/
│   └── visiontrack-bg.png
└── supabase/
    └── schema.sql
```

---

### Option A — Drag & drop (fastest)

1. Zip the whole project folder.
2. Go to **[https://app.netlify.com/drop](https://app.netlify.com/drop)**.
3. Drag the zip file onto the page.
4. Netlify builds and gives you a link like:  
   **`https://amazing-name-12345.netlify.app`**

---

### Option B — GitHub + Netlify (recommended)

1. Push this folder to a GitHub repository.
2. Go to **[https://app.netlify.com](https://app.netlify.com)** → **Add new site** → **Import an existing project**.
3. Connect GitHub and select your repo.
4. Build settings:
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`
5. Click **Deploy site**.

---

### Custom Netlify URL (your public link)

1. In Netlify: **Site configuration** → **Domain management**.
2. Click **Options** → **Edit site name**.
3. Choose a name, e.g. `visiontrack-malawi`.

**Your live link:**

```
https://visiontrack-malawi.netlify.app
```

Share this link with students, mentors, and partners.

The site footer updates automatically to show the current URL when deployed.

---

## Part 3 — Test everything

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open your Netlify URL | Site loads with background image |
| 2 | Go to **Account** → Sign up | Success message; user appears in Supabase |
| 3 | Go to **Community** → Post a comment | Comment appears in the list |
| 4 | Sign out → Sign in | Session works |
| 5 | **Contact** form → WhatsApp / Email | Opens with your message |

---

## Supabase + Netlify checklist

- [ ] Supabase project created
- [ ] `schema.sql` run in SQL Editor
- [ ] Email auth enabled in Supabase
- [ ] `js/config.js` updated with URL + anon key
- [ ] Tested sign up locally (`index.html`)
- [ ] Deployed to Netlify (drag-drop or GitHub)
- [ ] Tested sign up + comments on live Netlify URL

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **“Backend not connected yet”** | Edit `js/config.js` — URL must be `https://xxxxx.supabase.co` (not `.co` alone). Anon key must be the **full** copied key (200+ chars, no `...`) |
| **Wrong URL** | Use `https://YOUR_REF.supabase.co` from Supabase → Settings → API → Project URL |
| **Incomplete anon key** | Click **Copy** on the entire `anon` `public` key — do not shorten it |
| **Tables missing** | Run `supabase/schema.sql` in Supabase SQL Editor |
| **Invalid API key / JWT** | You pasted the wrong key or a truncated key — copy anon key again |
| **Sign up fails** | Authentication → Providers → Email must be enabled |
| **“Email not confirmed”** | Turn off “Confirm email” in Supabase for testing, or check inbox for confirmation link |
| **Comments not saving** | Re-run the SQL schema; open browser DevTools (F12) → Console for errors |
| **Works locally but not on Netlify** | Ensure `js/config.js` was uploaded (not only `config.example.js`) |
| **Background image missing** | Upload `assets/visiontrack-bg.png` with the site |

---

## Contact (on the website — no Supabase needed)

| Channel | Detail |
|---------|--------|
| **Email** | fletcherkatete42@gmail.com |
| **Phone** | 0880749069 |
| **WhatsApp** | [0880749069](https://wa.me/265880749069) · [0899670334](https://wa.me/265899670334) |

The contact form opens WhatsApp or the visitor’s email app with a pre-filled message.

---

## Quick links

- Supabase dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Netlify dashboard: [https://app.netlify.com](https://app.netlify.com)
- Netlify drag & drop deploy: [https://app.netlify.com/drop](https://app.netlify.com/drop)
- Supabase JS docs: [https://supabase.com/docs/reference/javascript](https://supabase.com/docs/reference/javascript)
