/**
 * VisionTrack Malawi — Backend Module
 * 
 * Handles:
 * - User authentication (signup, login, logout)
 * - Session management
 * - Comments (CRUD operations)
 * - Join form submissions
 * - Real-time updates
 */

(function () {
  "use strict";

  /* ============================================================================
     DOM References
     ============================================================================ */
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const authStatus = document.getElementById("auth-status");
  const authForms = document.getElementById("auth-forms");
  const authFeedback = document.getElementById("auth-feedback");
  const commentForm = document.getElementById("comment-form");
  const commentInput = document.getElementById("comment-input");
  const commentsList = document.getElementById("comments-list");
  const commentsFeedback = document.getElementById("comments-feedback");
  const commentsLoginHint = document.getElementById("comments-login-hint");
  const backendNotice = document.getElementById("backend-notice");

  let currentUser = null;
  let supabase = null;

  /* ============================================================================
     Initialize Supabase
     ============================================================================ */
  function initBackend() {
    supabase = window.SUPABASE_CLIENT;

    if (!supabase) {
      console.warn("Supabase not connected. Backend features disabled.");
      showBackendNotice();
      return;
    }

    // Check if user is already logged in
    checkAuthStatus();

    // Set up auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        currentUser = session.user;
        updateAuthUI();
        loadComments();
      } else {
        currentUser = null;
        updateAuthUI();
      }
    });

    // Attach form event listeners
    if (signupForm) setupSignupForm();
    if (loginForm) setupLoginForm();
    if (logoutBtn) setupLogoutBtn();
    if (commentForm) setupCommentForm();
  }

  /* ============================================================================
     Auth UI Management
     ============================================================================ */
  function updateAuthUI() {
    if (!supabase) return;

    if (currentUser) {
      // User is logged in
      if (authStatus) {
        authStatus.hidden = false;
        authStatus.innerHTML = `
          <div class="auth-welcome">Welcome, ${currentUser.user_metadata?.full_name || currentUser.email}!</div>
          <div class="auth-email">${currentUser.email}</div>
        `;
      }
      if (authForms) authForms.hidden = true;
      if (logoutBtn) logoutBtn.hidden = false;
      if (commentForm) commentForm.hidden = false;
      if (commentsLoginHint) commentsLoginHint.hidden = true;
    } else {
      // User is not logged in
      if (authStatus) authStatus.hidden = true;
      if (authForms) authForms.hidden = false;
      if (logoutBtn) logoutBtn.hidden = true;
      if (commentForm) commentForm.hidden = true;
      if (commentsLoginHint) commentsLoginHint.hidden = false;
    }
  }

  function showFeedback(el, message, isSuccess) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("success", "error");
    el.classList.add(isSuccess ? "success" : "error");
  }

  function showBackendNotice() {
    if (backendNotice) {
      backendNotice.hidden = false;
    }
  }

  /* ============================================================================
     Auth: Check Status
     ============================================================================ */
  async function checkAuthStatus() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data?.session?.user) {
        currentUser = data.session.user;
        updateAuthUI();
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  }

  /* ============================================================================
     Auth: Sign Up
     ============================================================================ */
  function setupSignupForm() {
    if (!signupForm) return;

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!supabase) {
        showFeedback(authFeedback, "Backend not configured.", false);
        return;
      }

      const fullName = signupForm.querySelector("#signup-name")?.value.trim();
      const email = signupForm.querySelector("#signup-email")?.value.trim();
      const password = signupForm.querySelector("#signup-password")?.value;
      const role = signupForm.querySelector("#signup-role")?.value;

      if (!fullName || !email || !password || !role) {
        showFeedback(authFeedback, "Please fill in all fields.", false);
        return;
      }

      if (password.length < 6) {
        showFeedback(
          authFeedback,
          "Password must be at least 6 characters.",
          false
        );
        return;
      }

      try {
        showFeedback(authFeedback, "Creating account…", true);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
          },
        });

        if (error) throw error;

        showFeedback(
          authFeedback,
          "Account created! Check your email to confirm.",
          true
        );
        signupForm.reset();
      } catch (err) {
        showFeedback(authFeedback, err.message || "Sign up failed.", false);
      }
    });
  }

  /* ============================================================================
     Auth: Log In
     ============================================================================ */
  function setupLoginForm() {
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!supabase) {
        showFeedback(authFeedback, "Backend not configured.", false);
        return;
      }

      const email = loginForm.querySelector("#login-email")?.value.trim();
      const password = loginForm.querySelector("#login-password")?.value;

      if (!email || !password) {
        showFeedback(authFeedback, "Please enter email and password.", false);
        return;
      }

      try {
        showFeedback(authFeedback, "Signing in…", true);

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        currentUser = data.user;
        showFeedback(authFeedback, "Signed in successfully!", true);
        loginForm.reset();
        updateAuthUI();
      } catch (err) {
        showFeedback(authFeedback, err.message || "Sign in failed.", false);
      }
    });
  }

  /* ============================================================================
     Auth: Log Out
     ============================================================================ */
  function setupLogoutBtn() {
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!supabase) return;

      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        updateAuthUI();
      } catch (err) {
        console.error("Sign out failed:", err);
      }
    });
  }

  /* ============================================================================
     Comments: Load
     ============================================================================ */
  async function loadComments() {
    if (!supabase || !commentsList) return;

    try {
      commentsList.innerHTML = "<p class='comments-empty'>Loading comments…</p>";

      const { data, error } = await supabase
        .from("comments")
        .select("id, author_name, content, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!data || data.length === 0) {
        commentsList.innerHTML =
          "<p class='comments-empty'>No comments yet. Be the first to share!</p>";
        return;
      }

      commentsList.innerHTML = data
        .map((comment) => {
          const date = new Date(comment.created_at).toLocaleDateString();
          return `
            <article class="comment-item glass">
              <div class="comment-meta">
                <strong>${escapeHtml(comment.author_name || "Anonymous")}</strong>
                <time>${date}</time>
              </div>
              <p>${escapeHtml(comment.content)}</p>
            </article>
          `;
        })
        .join("");
    } catch (err) {
      console.error("Failed to load comments:", err);
      commentsList.innerHTML =
        "<p class='comments-empty'>Could not load comments.</p>";
    }
  }

  /* ============================================================================
     Comments: Post
     ============================================================================ */
  function setupCommentForm() {
    if (!commentForm) return;

    commentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!supabase || !currentUser) {
        showFeedback(commentsFeedback, "You must be signed in to comment.", false);
        return;
      }

      const content = commentInput?.value.trim();

      if (!content) {
        showFeedback(commentsFeedback, "Please write a comment.", false);
        return;
      }

      try {
        showFeedback(commentsFeedback, "Posting…", true);

        const { error } = await supabase.from("comments").insert({
          author_id: currentUser.id,
          author_name:
            currentUser.user_metadata?.full_name || currentUser.email,
          content: content,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        showFeedback(commentsFeedback, "Comment posted!", true);
        commentForm.reset();
        await loadComments();
      } catch (err) {
        showFeedback(
          commentsFeedback,
          err.message || "Failed to post comment.",
          false
        );
      }
    });
  }

  /* ============================================================================
     Utilities
     ============================================================================ */
  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /* ============================================================================
     Initialize
     ============================================================================ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBackend);
  } else {
    initBackend();
  }
})();
