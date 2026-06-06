/**
 * VisionTrack Malawi — Landing Page Scripts
 * Handles: particle background, navigation, scroll reveals,
 * stat counters, form validation, and accessibility helpers.
 */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     DOM references
     -------------------------------------------------------------------------- */
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navLinks = document.querySelectorAll(".nav-menu a");
  const revealElements = document.querySelectorAll(".reveal");
  const statCounters = document.querySelectorAll("[data-count]");
  const joinForm = document.getElementById("join-form");
  const contactForm = document.getElementById("contact-form");
  const yearEl = document.getElementById("year");
  const canvas = document.getElementById("particle-canvas");
  const themeToggle = document.getElementById("theme-toggle");
  const CONTACT_EMAIL = "fletcherkatete42@gmail.com";
  const WHATSAPP_PRIMARY = "265880749069";
  const WHATSAPP_SECONDARY = "265899670334";

  /* --------------------------------------------------------------------------
     Footer year
     -------------------------------------------------------------------------- */
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* --------------------------------------------------------------------------
     Footer: show current site URL (updates automatically on Netlify)
     -------------------------------------------------------------------------- */
  const footerSiteLink = document.getElementById("footer-site-link");
  if (footerSiteLink && window.location.protocol.startsWith("http")) {
    const origin = window.location.origin;
    footerSiteLink.href = origin;
    footerSiteLink.textContent = origin.replace(/^https?:\/\//, "");
  }

  /* --------------------------------------------------------------------------
     Theme toggle (dark/light), persisted to localStorage
     -------------------------------------------------------------------------- */
  function getPreferredTheme() {
    const saved = localStorage.getItem("vtm-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("vtm-theme", theme);

    if (themeToggle) {
      const isLight = theme === "light";
      themeToggle.setAttribute(
        "aria-label",
        isLight ? "Switch to dark theme" : "Switch to light theme"
      );
      const icon = themeToggle.querySelector(".theme-toggle-icon");
      if (icon) icon.textContent = isLight ? "☀" : "☾";
    }
  }

  applyTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      applyTheme(current === "light" ? "dark" : "light");
    });
  }

  /* --------------------------------------------------------------------------
     Sticky header on scroll
     -------------------------------------------------------------------------- */
  function handleHeaderScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 40);
  }

  window.addEventListener("scroll", handleHeaderScroll, { passive: true });
  handleHeaderScroll();

  /* --------------------------------------------------------------------------
     Mobile navigation toggle
     -------------------------------------------------------------------------- */
  function closeNav() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    navMenu.classList.remove("open");
  }

  function openNav() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    navMenu.classList.add("open");
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.contains("open");
      isOpen ? closeNav() : openNav();
    });

    // Close menu when a link is clicked
    navLinks.forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  /* --------------------------------------------------------------------------
     Scroll reveal (Intersection Observer)
     -------------------------------------------------------------------------- */
  function initReveal() {
    if (!revealElements.length) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      revealElements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const el = entry.target;
          const delay = parseInt(el.dataset.delay || "0", 10);
          setTimeout(() => el.classList.add("visible"), delay);
          observer.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  /* --------------------------------------------------------------------------
     Animated stat counters
     -------------------------------------------------------------------------- */
  function animateCounter(element) {
    const target = parseInt(element.dataset.count, 10);
    const suffix = element.dataset.suffix || "";
    const duration = 1800;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      element.textContent = value.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  function initCounters() {
    if (!statCounters.length) return;

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    statCounters.forEach((el) => counterObserver.observe(el));
  }

  /* --------------------------------------------------------------------------
     Form handling (validation + optional real submission)
     -------------------------------------------------------------------------- */
  function showFeedback(el, message, isSuccess) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("success", "error");
    el.classList.add(isSuccess ? "success" : "error");
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function submitJson(endpoint, payload) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Treat non-2xx as an error to surface to the user
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed (${res.status})`);
    }

    // If the API returns JSON, parse it; otherwise ignore.
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    return null;
  }

  if (joinForm) {
    joinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.getElementById("form-feedback");
      const name = joinForm.querySelector("#join-name").value.trim();
      const email = joinForm.querySelector("#join-email").value.trim();
      const role = joinForm.querySelector("#join-role").value;

      if (!name || !email || !role) {
        showFeedback(feedback, "Please fill in all fields.", false);
        return;
      }

      if (!validateEmail(email)) {
        showFeedback(feedback, "Please enter a valid email address.", false);
        return;
      }

      const endpoint = (joinForm.dataset.endpoint || "").trim();
      const payload = { name, email, role, source: "join-form" };

      try {
        if (endpoint) {
          showFeedback(feedback, "Submitting…", true);
          await submitJson(endpoint, payload);
          showFeedback(feedback, "Submitted! We will be in touch soon.", true);
        } else {
          // Demo fallback: no endpoint configured.
          showFeedback(
            feedback,
            "Saved (demo). Add a data-endpoint URL to send this to a real backend.",
            true
          );
          try {
            const saved = JSON.parse(localStorage.getItem("vtm-leads") || "[]");
            saved.push({ ...payload, ts: new Date().toISOString() });
            localStorage.setItem("vtm-leads", JSON.stringify(saved));
          } catch (_) {
            // Ignore localStorage failures (privacy mode, etc.)
          }
        }

        joinForm.reset();
      } catch (err) {
        showFeedback(
          feedback,
          "Could not submit right now. Please try again in a moment.",
          false
        );
      }
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const feedback = document.getElementById("contact-feedback");
      const name = contactForm.querySelector("#contact-name").value.trim();
      const message = contactForm.querySelector("#contact-message").value.trim();
      const channel = (
        contactForm.querySelector("#contact-channel")?.value || "whatsapp"
      ).toLowerCase();

      if (!name || !message) {
        showFeedback(feedback, "Please complete all fields.", false);
        return;
      }

      const endpoint = (contactForm.dataset.endpoint || "").trim();
      const payload = { name, message, source: "contact-form" };

      try {
        if (endpoint) {
          showFeedback(feedback, "Sending…", true);
          await submitJson(endpoint, payload);
          showFeedback(feedback, "Message sent! We will respond shortly.", true);
        } else {
          // No backend endpoint configured:
          // Open WhatsApp and/or email clients with pre-filled content.
          const composed = `New website message:%0AName: ${encodeURIComponent(
            name
          )}%0AMessage: ${encodeURIComponent(message)}`;
          const waText = encodeURIComponent(
            `New website message:\nName: ${name}\nMessage: ${message}`
          );
          const mailUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
            `Website message from ${name}`
          )}&body=${encodeURIComponent(message)}`;
          const waUrlPrimary = `https://wa.me/${WHATSAPP_PRIMARY}?text=${waText}`;
          const waUrlSecondary = `https://wa.me/${WHATSAPP_SECONDARY}?text=${waText}`;

          if (channel === "email") {
            window.location.href = mailUrl;
            showFeedback(feedback, "Opening your email app…", true);
          } else if (channel === "both") {
            window.open(waUrlPrimary, "_blank", "noopener");
            window.open(waUrlSecondary, "_blank", "noopener");
            window.location.href = mailUrl;
            showFeedback(feedback, "Opening WhatsApp and email…", true);
          } else {
            // Default: WhatsApp (open both numbers)
            window.open(waUrlPrimary, "_blank", "noopener");
            window.open(waUrlSecondary, "_blank", "noopener");
            showFeedback(feedback, "Opening WhatsApp chats…", true);
          }
        }

        contactForm.reset();
      } catch (err) {
        showFeedback(
          feedback,
          "Could not send right now. Please try again in a moment.",
          false
        );
      }
    });
  }

  /* --------------------------------------------------------------------------
     Particle canvas background (futuristic grid + nodes)
     -------------------------------------------------------------------------- */
  function initParticles() {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let particles = [];
    let animationId = null;

    // Brand-aligned particle colors
    const COLORS = {
      green: "rgba(22, 160, 52, 0.6)",
      red: "rgba(225, 6, 0, 0.35)",
      white: "rgba(255, 255, 255, 0.15)",
    };

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      createParticles();
    }

    function createParticles() {
      const count = Math.min(Math.floor((width * height) / 12000), 80);
      particles = [];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.5 + 0.5,
          color:
            Math.random() > 0.85
              ? COLORS.red
              : Math.random() > 0.5
                ? COLORS.green
                : COLORS.white,
        });
      }
    }

    function drawGrid() {
      const spacing = 60;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    function drawParticles() {
      particles.forEach((p, i) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Connect nearby particles with lines
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(22, 160, 52, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      drawGrid();

      if (!prefersReducedMotion) {
        drawParticles();
      } else {
        // Static dots for reduced motion
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });
      }

      if (!prefersReducedMotion) {
        animationId = requestAnimationFrame(render);
      }
    }

    window.addEventListener("resize", resize);
    resize();
    render();

    // Static render already done for reduced motion; loop only when motion allowed
    if (prefersReducedMotion && animationId) {
      cancelAnimationFrame(animationId);
    }
  }

  /* --------------------------------------------------------------------------
     Smooth scroll offset for fixed header (anchor links)
     -------------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const headerOffset = 80;
      const top =
        target.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* --------------------------------------------------------------------------
     Initialize all modules
     -------------------------------------------------------------------------- */
  initReveal();
  initCounters();
  initParticles();
})();
