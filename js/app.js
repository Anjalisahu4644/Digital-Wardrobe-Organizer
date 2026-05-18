/* ========================================
   Main Application Controller
   ======================================== */
const App = {
  currentPage: "dashboard",
  currentFilters: {},
  deferredInstallPrompt: null,

  async init() {
    // Initialize database
    await DB.init();

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    }

    // PWA install support
    this.bindPWAdEvents();

    // Try to restore session
    const user = await Auth.restoreSession();
    if (user) {
      this.showApp();
      this.navigate("dashboard");
    } else {
      this.showAuth();
    }

    this.bindAuthEvents();
    this.bindNavEvents();
    this.bindModalEvents();
    this.bindNotificationEvents();
  },

  notificationsSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
  },

  async enableNotifications() {
    if (!this.notificationsSupported()) {
      this.toast("Notifications are not supported in this browser.", "error");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        this.toast("Notifications enabled!", "success");
        this.sendTestNotification();
      } else if (permission === "denied") {
        this.toast("Notification permission denied.", "error");
      } else {
        this.toast("Notification request dismissed.", "info");
      }
    } catch (err) {
      this.toast("Unable to enable notifications.", "error");
      console.warn("Notification request failed:", err);
    }
  },

  async sendTestNotification() {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("Digital Wardrobe Organizer", {
        body: "Notifications are enabled. You'll receive updates on your wardrobe.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [100, 50, 100],
      });
    } catch (err) {
      console.warn("Notification send failed:", err);
      if (Notification.permission === "granted") {
        new Notification("Digital Wardrobe Organizer", {
          body: "Notifications are enabled.",
          icon: "/icons/icon-192.png",
        });
      }
    }
  },

  bindNotificationEvents() {
    [
      document.getElementById("enable-notifications-btn"),
      document.getElementById("enable-notifications-mobile-btn"),
    ].forEach((notifyBtn) => {
      if (notifyBtn) {
        notifyBtn.addEventListener("click", () => this.enableNotifications());
      }
    });
  },

  // ---- Auth UI ----
  showAuth() {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
  },

  showApp() {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    // Update user info
    const user = Auth.currentUser;
    if (user) {
      document.getElementById("user-name").textContent =
        user.name || user.username;
      document.getElementById("user-avatar").textContent = (
        user.name || user.username
      )
        .charAt(0)
        .toUpperCase();
    }

    const changePasswordButton = document.getElementById("change-password-btn");
    if (changePasswordButton) {
      changePasswordButton.addEventListener("click", () =>
        this.showPasswordModal("change"),
      );
    }

    const mobileName = document.getElementById("mobile-user-name");
    const mobileAvatar = document.getElementById("mobile-user-avatar");
    if (mobileName) {
      mobileName.textContent = user.name || user.username;
    }
    if (mobileAvatar) {
      mobileAvatar.textContent = (user.name || user.username)
        .charAt(0)
        .toUpperCase();
    }

    const changePasswordMobile = document.getElementById(
      "change-password-mobile-btn",
    );
    if (changePasswordMobile) {
      changePasswordMobile.addEventListener("click", () =>
        this.showPasswordModal("change"),
      );
    }

    const logoutMobile = document.getElementById("logout-mobile-btn");
    if (logoutMobile) {
      logoutMobile.addEventListener("click", () => {
        Auth.logout();
        this.showAuth();
        document.getElementById("login-username").value = "";
        document.getElementById("login-password").value = "";
      });
    }
  },

  bindAuthEvents() {
    // Toggle forms
    document.getElementById("show-register").addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("login-form").classList.remove("active");
      document.getElementById("register-form").classList.add("active");
    });

    document.getElementById("show-login").addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("register-form").classList.remove("active");
      document.getElementById("login-form").classList.add("active");
    });

    // Login
    document
      .getElementById("login-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const errEl = document.getElementById("login-error");
        errEl.textContent = "";

        const username = document.getElementById("login-username").value.trim();
        const password = document.getElementById("login-password").value;

        if (!username || !password) {
          errEl.textContent = "Fill in all fields";
          return;
        }

        try {
          await Auth.login(username, password);
          this.showApp();
          this.navigate("dashboard");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });

    document
      .getElementById("show-reset-password")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.showPasswordModal("reset");
      });
    const installBtn = document.getElementById("install-btn");
    if (installBtn) {
      installBtn.addEventListener("click", () => this.promptPWAInstall());
    }
    // Register
    document
      .getElementById("register-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const errEl = document.getElementById("register-error");
        errEl.textContent = "";

        const name = document.getElementById("reg-name").value.trim();
        const username = document.getElementById("reg-username").value.trim();
        const password = document.getElementById("reg-password").value;

        if (!name || !username || !password) {
          errEl.textContent = "Fill in all fields";
          return;
        }

        try {
          await Auth.register(name, username, password);
          this.showApp();
          this.navigate("dashboard");
          this.toast("Welcome to Digital Wardrobe! 🎉", "success");
        } catch (err) {
          errEl.textContent = err.message;
        }
      });

    // Logout
    document.getElementById("logout-btn").addEventListener("click", () => {
      Auth.logout();
      this.showAuth();
      // Clear forms
      document.getElementById("login-username").value = "";
      document.getElementById("login-password").value = "";
    });
  },

  // ---- Navigation ----
  bindNavEvents() {
    // Sidebar nav
    document.querySelectorAll(".nav-link, .mob-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) this.navigate(page);
      });
    });
  },

  async navigate(page) {
    this.currentPage = page;
    this.currentFilters = {};

    // Update active nav
    document
      .querySelectorAll(".nav-link")
      .forEach((l) => l.classList.toggle("active", l.dataset.page === page));
    document
      .querySelectorAll(".mob-link")
      .forEach((l) => l.classList.toggle("active", l.dataset.page === page));

    // Render page content
    const content = document.getElementById("page-content");

    switch (page) {
      case "dashboard":
        content.innerHTML = await this.renderDashboard();
        await this.bindDashboardEvents();
        break;

      case "wardrobe":
        content.innerHTML = Wardrobe.renderPage();
        await Wardrobe.renderItems();
        this.bindWardrobeEvents();
        break;

      case "outfits":
        content.innerHTML = Outfits.renderPage();
        await Outfits.renderOutfits();
        this.bindOutfitEvents();
        break;

      case "suggestions":
        content.innerHTML = Suggestions.renderPage();
        await Suggestions.renderWeather();
        this.bindSuggestionEvents();
        await Suggestions.renderDateOccasion(new Date());
        break;

      case "analytics":
        content.innerHTML = Analytics.renderPage();
        await Analytics.render();
        break;
    }

    // Scroll to top
    document.getElementById("main-content").scrollTop = 0;
  },

  // ---- Dashboard ----
  async renderDashboard() {
    const stats = await Analytics.getStats();
    const recentItems = (await Wardrobe.getAllItems()).slice(-4).reverse();
    const recentOutfits = (await Outfits.getAll()).slice(-3).reverse();

    // Quick weather
    let weatherHtml = '<div class="spinner"></div>';

    return `
      <div class="page-header">
        <h1>Dashboard</h1>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="dash-add-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Quick Add
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(108,92,231,0.12);color:var(--accent-primary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16.01 2H8L3.62 3.46A2 2 0 0 0 2 5.34V21a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5.34a2 2 0 0 0-1.62-1.88z"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          </div>
          <div class="stat-card-value">${stats.totalItems}</div>
          <div class="stat-card-label">Wardrobe Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(0,206,201,0.12);color:var(--accent-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>
          </div>
          <div class="stat-card-value">${stats.totalOutfits}</div>
          <div class="stat-card-label">Saved Outfits</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(253,121,168,0.12);color:var(--accent-pink);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div class="stat-card-value">${stats.totalWears}</div>
          <div class="stat-card-label">Total Wears</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background:rgba(253,203,110,0.15);color:var(--accent-orange);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div class="stat-card-value">${stats.favorites}</div>
          <div class="stat-card-label">Favorites</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Weather Quick View -->
        <div class="dash-section" id="dash-weather">
          <h3>Today's Weather <a href="#" data-page="suggestions" class="nav-shortcut">View all →</a></h3>
          ${weatherHtml}
        </div>

        <!-- Recent Items -->
        <div class="dash-section">
          <h3>Recent Items <a href="#" data-page="wardrobe" class="nav-shortcut">View all →</a></h3>
          ${
            recentItems.length === 0
              ? '<p style="color:var(--text-muted);font-size:0.85rem;">No items yet. Add your first piece!</p>'
              : `<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                ${recentItems
                  .map(
                    (item) => `
                  <div style="text-align:center;cursor:pointer;" class="dash-item" data-id="${item.id}">
                    ${
                      item.image
                        ? `<img src="${item.image}" style="width:72px;height:72px;border-radius:var(--radius-sm);object-fit:cover;">`
                        : `<div style="width:72px;height:72px;border-radius:var(--radius-sm);background:var(--bg-input);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`
                    }
                    <div style="font-size:0.7rem;margin-top:0.3rem;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Wardrobe._escapeHtml(item.name)}</div>
                  </div>
                `,
                  )
                  .join("")}
              </div>`
          }
        </div>

        <!-- Recent Outfits -->
        <div class="dash-section">
          <h3>Recent Outfits <a href="#" data-page="outfits" class="nav-shortcut">View all →</a></h3>
          ${
            recentOutfits.length === 0
              ? '<p style="color:var(--text-muted);font-size:0.85rem;">No outfits yet. Build your first combo!</p>'
              : recentOutfits
                  .map(
                    (o) => `
              <div style="display:flex;align-items:center;gap:0.6rem;padding:0.4rem 0;border-bottom:1px solid var(--border-color);">
                <span style="font-size:1.2rem;">👔</span>
                <div style="flex:1;">
                  <div style="font-size:0.85rem;font-weight:500;">${Wardrobe._escapeHtml(o.name)}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted);">${o.occasion} • ${Object.keys(o.items).filter((k) => o.items[k]).length} items</div>
                </div>
              </div>
            `,
                  )
                  .join("")
          }
        </div>

        <!-- Quick Analytics Teaser -->
        <div class="dash-section">
          <h3>Quick Stats <a href="#" data-page="analytics" class="nav-shortcut">Full analytics →</a></h3>
          <div id="dash-quick-chart"></div>
        </div>
      </div>
    `;
  },

  async bindDashboardEvents() {
    // Quick add
    const addBtn = document.getElementById("dash-add-btn");
    if (addBtn) addBtn.addEventListener("click", () => Wardrobe.showAddModal());

    // Nav shortcuts
    document.querySelectorAll(".nav-shortcut").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.navigate(link.dataset.page);
      });
    });

    // Recent item clicks
    document.querySelectorAll(".dash-item").forEach((el) => {
      el.addEventListener("click", () =>
        Wardrobe.showItemDetail(el.dataset.id),
      );
    });

    // Load weather
    const weatherEl = document.getElementById("dash-weather");
    if (weatherEl) {
      try {
        const weather = await Suggestions.getWeather();
        const desc = Suggestions.getWeatherDescription(weather.weatherCode);
        const spinnerEl = weatherEl.querySelector(".spinner");
        if (spinnerEl) {
          spinnerEl.outerHTML = `
            <div style="display:flex;align-items:center;gap:1rem;">
              <span style="font-size:2.5rem;">${desc.icon}</span>
              <div>
                <div style="font-size:1.5rem;font-weight:700;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${weather.temp}${weather.unit}</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);">${desc.text}</div>
              </div>
            </div>
          `;
        }
      } catch (e) {
        const spinnerEl = weatherEl.querySelector(".spinner");
        if (spinnerEl)
          spinnerEl.outerHTML =
            '<p style="color:var(--text-muted);font-size:0.8rem;">Weather unavailable</p>';
      }
    }

    // Quick chart
    const quickChart = document.getElementById("dash-quick-chart");
    if (quickChart) {
      const categories = await Analytics.getCategoryBreakdown();
      const entries = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
      if (entries.length === 0) {
        quickChart.innerHTML =
          '<p style="color:var(--text-muted);font-size:0.85rem;">Add items to see category breakdown</p>';
      } else {
        const max = Math.max(...entries.map((e) => e[1]), 1);
        quickChart.innerHTML = entries
          .map(
            ([label, count]) => `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
            <span style="font-size:0.75rem;color:var(--text-secondary);min-width:70px;text-align:right;">${label}</span>
            <div style="flex:1;height:18px;background:var(--bg-input);border-radius:9px;overflow:hidden;">
              <div style="height:100%;width:${(count / max) * 100}%;background:var(--gradient-primary);border-radius:9px;display:flex;align-items:center;padding-left:0.4rem;">
                <span style="font-size:0.65rem;font-weight:600;color:#fff;">${count}</span>
              </div>
            </div>
          </div>
        `,
          )
          .join("");
      }
    }
  },

  // ---- Wardrobe Events ----
  bindWardrobeEvents() {
    document
      .getElementById("add-item-btn")
      .addEventListener("click", () => Wardrobe.showAddModal());

    // Search
    const search = document.getElementById("wardrobe-search");
    let searchTimeout;
    search.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentFilters.search = search.value;
        Wardrobe.renderItems(this.currentFilters);
      }, 300);
    });

    // Filters
    ["filter-category", "filter-season", "filter-color"].forEach((id) => {
      document.getElementById(id).addEventListener("change", (e) => {
        const key = id.replace("filter-", "");
        this.currentFilters[key] = e.target.value;
        Wardrobe.renderItems(this.currentFilters);
      });
    });
  },

  // ---- Outfit Events ----
  bindOutfitEvents() {
    document
      .getElementById("create-outfit-btn")
      .addEventListener("click", () => Outfits.showBuilder());
  },

  // ---- Suggestion Events ----
  bindSuggestionEvents() {
    document.querySelectorAll(".occasion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document
          .querySelectorAll(".occasion-chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        Suggestions.renderOccasionItems(chip.dataset.occasion);
      });
    });

    const dateInput = document.getElementById("occasion-date");
    if (dateInput) {
      dateInput.addEventListener("change", () => {
        const selected = new Date(dateInput.value);
        if (!isNaN(selected)) {
          Suggestions.renderDateOccasion(selected);
        }
      });
    }
  },

  // ---- Modal ----
  bindModalEvents() {
    document
      .getElementById("modal-close")
      .addEventListener("click", () => this.closeModal());
    document.getElementById("modal-overlay").addEventListener("click", (e) => {
      if (e.target === document.getElementById("modal-overlay"))
        this.closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeModal();
    });
  },

  bindPWAdEvents() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const promptEl = document.getElementById("pwa-install-prompt");
      if (promptEl) promptEl.classList.remove("hidden");
    });

    window.addEventListener("appinstalled", () => {
      this.toast("App installed! You can now use it offline.", "success");
      this.deferredInstallPrompt = null;
      const promptEl = document.getElementById("pwa-install-prompt");
      if (promptEl) promptEl.classList.add("hidden");
    });
  },

  async promptPWAInstall() {
    if (!this.deferredInstallPrompt) {
      this.toast("Install prompt is not available right now.", "info");
      return;
    }

    this.deferredInstallPrompt.prompt();
    const choice = await this.deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
      this.toast("Thanks for installing the app!", "success");
    } else {
      this.toast("Install dismissed.", "info");
    }

    this.deferredInstallPrompt = null;
    const promptEl = document.getElementById("pwa-install-prompt");
    if (promptEl) promptEl.classList.add("hidden");
  },

  openModal() {
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
    document.body.style.overflow = "";
  },

  showPasswordModal(type = "reset") {
    const isChange = type === "change";
    document.getElementById("modal-content").innerHTML = `
      <h2>${isChange ? "Change Password" : "Reset Password"}</h2>
      <form id="password-form" autocomplete="off">
        ${
          isChange
            ? `
          <div class="input-group">
            <label for="current-password">Current password</label>
            <input type="password" id="current-password" placeholder="Current password" required minlength="4">
          </div>
        `
            : `
          <div class="input-group">
            <label for="reset-username">Username</label>
            <input type="text" id="reset-username" placeholder="Your username" required>
          </div>
        `
        }
        <div class="input-group">
          <label for="new-password">New password</label>
          <input type="password" id="new-password" placeholder="New password" required minlength="4">
        </div>
        <div class="input-group">
          <label for="confirm-password">Confirm password</label>
          <input type="password" id="confirm-password" placeholder="Confirm password" required minlength="4">
        </div>
        <button type="submit" class="btn btn-primary btn-full">${isChange ? "Change Password" : "Reset Password"}</button>
        <div id="password-error" class="auth-error"></div>
      </form>
    `;

    const form = document.getElementById("password-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = document.getElementById("password-error");
      errEl.textContent = "";

      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      if (!newPassword || !confirmPassword) {
        errEl.textContent = "Please fill in all fields";
        return;
      }
      if (newPassword !== confirmPassword) {
        errEl.textContent = "Passwords do not match";
        return;
      }
      if (newPassword.length < 4) {
        errEl.textContent = "Password must be at least 4 characters";
        return;
      }

      try {
        if (isChange) {
          const currentPassword =
            document.getElementById("current-password").value;
          if (!currentPassword) {
            errEl.textContent = "Current password is required";
            return;
          }
          await Auth.changePassword(currentPassword, newPassword);
          this.toast("Password changed successfully", "success");
          this.closeModal();
        } else {
          const username = document
            .getElementById("reset-username")
            .value.trim();
          if (!username) {
            errEl.textContent = "Username is required";
            return;
          }
          await Auth.resetPassword(username, newPassword);
          this.toast("Password reset successfully", "success");
          this.closeModal();
        }
      } catch (err) {
        errEl.textContent = err.message;
      }
    });

    this.openModal();
  },

  // ---- Toast Notifications ----
  toast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = { success: "✓", error: "✕", info: "ℹ" };
    toast.innerHTML = `<span style="font-weight:600;">${icons[type] || "ℹ"}</span> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(40px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

// ---- Initialize ----
document.addEventListener("DOMContentLoaded", () => App.init());
