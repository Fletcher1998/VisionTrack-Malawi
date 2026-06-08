/**
 * VisionTrack Malawi — Supabase Configuration
 * 
 * This file stores the Supabase project credentials.
 * 
 * SETUP:
 * 1. Create a free account at https://supabase.com
 * 2. Create a new project
 * 3. Go to Settings > API to find your credentials:
 *    - Project URL (SUPABASE_URL)
 *    - Anon Key (SUPABASE_ANON_KEY)
 * 4. Replace the placeholder values below
 * 
 * ⚠️  IMPORTANT: The anon key is PUBLIC. Never use server keys here!
 * ⚠️  This file is safe to commit to Git.
 */

const SUPABASE_URL = "https://fyduanykqsbdwafsfbfg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZHVhbnlrcXNiZHdhZnNmYmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODY3NTgsImV4cCI6MjA5NTM2Mjc1OH0.tkNApizFdcprwVEtxQccPz1CGA2KgwoROpeYA_lXGoY";

// Initialize Supabase client (window.supabase from CDN)
let supabase = null;

function initSupabase() {
  if (!SUPABASE_URL.includes("supabase.co") || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️  Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js"
    );
    return null;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase connected");
    return supabase;
  } catch (err) {
    console.error("❌ Supabase initialization failed:", err);
    return null;
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSupabase);
} else {
  initSupabase();
}

// Export for use in backend.js
window.SUPABASE_CLIENT = supabase;
