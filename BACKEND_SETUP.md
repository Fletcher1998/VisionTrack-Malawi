# VisionTrack Malawi — Complete Backend Setup Guide

This comprehensive guide walks you through setting up the full backend infrastructure for your VisionTrack Malawi website with user authentication, database, and serverless functions.

---

## 🎯 Overview

Your backend consists of three main components:

1. **Supabase** - Database, authentication, and real-time updates
2. **Netlify Functions** - Serverless API for form processing
3. **GitHub + Netlify** - Automated deployment via CI/CD

---

## 📋 Part 1: Set Up Supabase (Database & Authentication)

### Step 1.1: Create a Supabase Account

1. Visit [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Create or select an organization

### Step 1.2: Create a New Project

1. Click **"New project"**
2. Enter project name: `visiontrack-malawi`
3. Choose a strong database password (save it!)
4. Select region closest to Malawi (e.g., Cape Town, South Africa)
5. Click **"Create new project"** (this takes ~2 minutes)

### Step 1.3: Get Your API Credentials

Once your project is created:

1. Go to **Settings** (bottom left) → **API**
2. Copy these values (you'll need them soon):
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon Key** (public key - safe to share)
   - **Service Role Key** (keep secret! - only for backend)

### Step 1.4: Create Database Tables

In Supabase dashboard, go to **SQL Editor** and run this:

```sql
-- Create comments table
CREATE TABLE public.comments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  author_id UUID REFERENCES auth.users ON DELETE SET NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Comments are publicly readable"
  ON public.comments FOR SELECT USING (TRUE);

-- Only logged-in users can post their own comments
CREATE POLICY "Users can insert their own comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Create form submissions table
CREATE TABLE public.form_submissions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type TEXT NOT NULL CHECK (type IN ('join', 'contact')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  message TEXT,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- Enable security
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit forms
CREATE POLICY "Anyone can insert form submissions"
  ON public.form_submissions FOR INSERT
  USING (TRUE);
```

✅ **Done!** Your database is ready.

---

## 🔧 Part 2: Configure Frontend (Supabase Keys)

### Step 2.1: Update Configuration File

Edit `js/config.js` in your repo:

```javascript
const SUPABASE_URL = "https://xxxxx.supabase.co"; // ← Replace with your URL
const SUPABASE_ANON_KEY = "eyJhbGc..."; // ← Replace with your anon key
```

That's it! Your frontend is now connected to Supabase.

### Step 2.2: Test Locally

```bash
# Start a local server
python -m http.server 8000

# Open http://localhost:8000
# Try creating an account in the "Account" section
```

If it works, you'll see the auth forms enable and comments load! 🎉

---

## 🚀 Part 3: Deploy to Netlify

### Step 3.1: Connect Your GitHub Repo to Netlify

1. Go to [https://netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize
4. Select `fletcher1998/visiontrack-malawi`
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.` (current directory)
6. Click **"Deploy site"**

Netlify will automatically deploy your site! 🎉

### Step 3.2: Set Environment Variables in Netlify

Your Netlify Functions need secret keys. Add them **WITHOUT committing to Git**:

1. In Netlify dashboard, go to **Site settings** → **Build & deploy** → **Environment**
2. Add these variables:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_KEY` = your Service Role Key (⚠️ KEEP SECRET!)
   - `CONTACT_EMAIL` = fletcherkatete42@gmail.com (or your email)

**These will NOT appear in your Git repo** ✅

### Step 3.3: Enable Functions

Your Netlify Functions are automatically enabled in the `netlify.toml` config file. When you push to GitHub, Netlify will:

1. Build your site
2. Deploy your functions to `/.netlify/functions/submit-form`
3. Make them available at `https://your-site.netlify.app/api/submit-form`

---

## ✅ Part 4: Test Everything

### Test Authentication

1. Go to your live site
2. Scroll to **"Your Account"** section
3. Create a new account
4. Check your email for confirmation link
5. Click the link
6. Sign in with your email/password

✅ **If this works, auth is configured correctly!**

### Test Comments

1. Scroll to **"Community"** section
2. If signed in, you should see a comment form
3. Write a test comment and click "Post Comment"
4. Your comment should appear below instantly

✅ **If this works, comments are configured correctly!**

### Test Forms

1. Scroll to **"Join the Network"** or **"Contact Us"** sections
2. Fill out the form and submit
3. Check your Supabase dashboard → **Browser** → `form_submissions` table
4. You should see your submission!

✅ **If this works, forms are configured correctly!**

---

## 📊 Database Schema Reference

### `comments` Table
```
id              BIGINT (primary key)
author_id       UUID (from auth.users)
author_name     TEXT (the user's name)
content         TEXT (the comment text)
created_at      TIMESTAMP (when posted)
updated_at      TIMESTAMP (last updated)
```

### `form_submissions` Table
```
id              BIGINT (primary key)
type            TEXT ('join' or 'contact')
name            TEXT (submitter's name)
email           TEXT (submitter's email)
role            TEXT (only for 'join' type)
message         TEXT (only for 'contact' type)
submitted_at    TIMESTAMP (when submitted)
```

---

## 🔐 Security Checklist

- ✅ Supabase URL and Anon Key are in `js/config.js` (public - OK)
- ✅ Service Role Key is ONLY in Netlify environment variables (never in Git)
- ✅ Row Level Security enabled on all tables
- ✅ Policies restrict comment deletion to original author only
- ✅ Forms don't require authentication (anyone can submit)
- ✅ Comments require authentication (only logged-in users)

---

## 🐛 Troubleshooting

### "Supabase not configured" message appears
- Check that `SUPABASE_URL` doesn't contain placeholder text
- Check that `SUPABASE_ANON_KEY` is not empty
- Refresh the page (clear browser cache)
- Check browser console (F12 → Console) for errors

### Can't sign up (email not working)
- Supabase sends emails by default, but they may go to spam
- Check your spam folder for confirmation email
- Or use fake email in development (e.g., `test@example.com`)

### Comments not loading
- Make sure you're signed in
- Check browser console for network errors
- Verify `comments` table exists in Supabase
- Check that Row Level Security policies are created

### Forms not saving
- Check that `form_submissions` table exists
- Verify Netlify environment variables are set
- Check Netlify function logs (Site settings → Functions → Logs)
- Try submitting a form and check the logs

### "Method not allowed" or 405 error
- Make sure your POST request goes to `/.netlify/functions/submit-form`
- Check that `netlify.toml` has the redirect rules
- Verify `netlify/functions/submit-form.js` exists

---

## 📧 Email Notifications (Optional)

To send email when forms are submitted, integrate an email service:

**Option 1: SendGrid (recommended)**
```bash
npm install @sendgrid/mail
```

Then update `netlify/functions/submit-form.js` to send emails.

**Option 2: Mailgun**
- Sign up at [mailgun.com](https://mailgun.com)
- Get API key
- Use Mailgun client library in function

---

## 🚢 Deployment Workflow

Every time you push to GitHub:

```bash
git add .
git commit -m "Add new features"
git push origin main
```

Netlify automatically:
1. Builds your site
2. Runs any scripts in `package.json`
3. Deploys functions
4. Publishes to your live URL
5. Sends you a notification

---

## 📱 Local Development

To test functions locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start dev server with functions
netlify dev

# Your site runs at http://localhost:8888
# Functions available at http://localhost:8888/.netlify/functions/submit-form
```

---

## 📞 Support & Resources

**Documentation:**
- Supabase: https://supabase.com/docs
- Netlify Functions: https://docs.netlify.com/functions/overview
- Netlify CLI: https://cli.netlify.com

**Your Team:**
- Email: fletcherkatete42@gmail.com
- WhatsApp: +265 880 749 069
- Location: Lilongwe, Malawi

---

## ✨ Next Steps

1. ✅ Create Supabase account and project
2. ✅ Create database tables (copy/paste SQL)
3. ✅ Add credentials to `js/config.js`
4. ✅ Test locally (`python -m http.server 8000`)
5. ✅ Connect GitHub to Netlify
6. ✅ Set Netlify environment variables
7. ✅ Test auth, comments, and forms on live site
8. ✅ Monitor and celebrate! 🎉

---

**Version:** 1.0.0  
**Last Updated:** June 8, 2026  
**Status:** ✅ Complete & Ready for Production
