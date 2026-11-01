// app.js - Main Application Controller & Module Coordinator

import { Storage } from "./storage.js";
import { ImportExportModule } from "./modules/importExport.js";
import { TableEditorModule } from "./modules/tableEditor.js";
import { DamageTtkModule } from "./modules/damageTtk.js";
import { ProgressionModule } from "./modules/progression.js";
import { LootValidatorModule } from "./modules/lootValidator.js";
import { AuditModule } from "./modules/audit.js";

class App {
  constructor() {
    this.toastContainer = document.getElementById("toastContainer");
    this.navTabs = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");
    this.badgeUnitCount = document.getElementById("badgeUnitCount");

    this.themeToggleBtn = document.getElementById("themeToggleBtn");
    this.themeIcon = document.getElementById("themeIcon");
    this.quickExportBtn = document.getElementById("quickExportBtn");
    this.resetStorageBtn = document.getElementById("resetStorageBtn");

    this.helpModal = document.getElementById("helpModal");
    this.helpModalBtn = document.getElementById("helpModalBtn");
    this.closeHelpModal = document.getElementById("closeHelpModal");
  }

  init() {
    this.initTheme();
    this.initNavigation();
    this.initGlobalEvents();
    this.initHotkeys();

    // Context object passed to modules
    const ctx = {
      onDataUpdated: (units, shouldRerenderTable = true) => this.handleDataUpdated(units, shouldRerenderTable),
      showToast: (msg, type) => this.showToast(msg, type)
    };

    // Initialize all modules
    ImportExportModule.init(ctx);
    TableEditorModule.init(ctx);
    DamageTtkModule.init(ctx);
    ProgressionModule.init(ctx);
    LootValidatorModule.init(ctx);
    AuditModule.init();

    // Initial sync
    const initialUnits = Storage.getUnits();
    this.handleDataUpdated(initialUnits, false);

    console.log("🎮 Balance & Progression Studio initialized successfully!");
  }

  handleDataUpdated(units, shouldRerenderTable = true) {
    if (this.badgeUnitCount) {
      this.badgeUnitCount.textContent = units.length;
    }

    if (shouldRerenderTable) {
      TableEditorModule.setUnits(units);
    }

    // Sync downstream modules
    DamageTtkModule.setUnits(units);
    AuditModule.setUnits(units);
  }

  initTheme() {
    const currentTheme = Storage.getTheme();
    document.documentElement.setAttribute("data-theme", currentTheme);
    this.themeIcon.textContent = currentTheme === "dark" ? "🌙" : "☀️";

    this.themeToggleBtn.addEventListener("click", () => {
      const active = document.documentElement.getAttribute("data-theme");
      const next = active === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      this.themeIcon.textContent = next === "dark" ? "🌙" : "☀️";
      Storage.saveTheme(next);
      this.showToast(`Переключено на ${next === 'dark' ? 'тёмную' : 'светлую'} тему`, "info");
    });
  }

  initNavigation() {
    this.navTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    this.navTabs.forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabId);
    });

    this.tabContents.forEach(c => {
      c.classList.toggle("active", c.id === `tab-${tabId}`);
    });

    // If switching to progression tab, ensure chart renders smoothly
    if (tabId === "progression") {
      ProgressionModule.update();
    }
  }

  initGlobalEvents() {
    this.quickExportBtn.addEventListener("click", () => {
      ImportExportModule.exportUnitsAsCsv();
    });

    this.resetStorageBtn.addEventListener("click", () => {
      if (confirm("Вы уверены, что хотите сбросить все данные к исходным? Пользовательские изменения будут стёрты.")) {
        Storage.resetAll();
        const defaultUnits = Storage.getUnits();
        this.handleDataUpdated(defaultUnits, true);
        LootValidatorModule.lootItems = Storage.getLoot();
        LootValidatorModule.render();
        this.showToast("Все данные успешно сброшены к начальным", "warning");
      }
    });

    // Help Modal
    this.helpModalBtn.addEventListener("click", () => {
      this.helpModal.classList.add("active");
    });

    this.closeHelpModal.addEventListener("click", () => {
      this.helpModal.classList.remove("active");
    });

    this.helpModal.addEventListener("click", (e) => {
      if (e.target === this.helpModal) {
        this.helpModal.classList.remove("active");
      }
    });
  }

  initHotkeys() {
    window.addEventListener("keydown", (e) => {
      // Don't trigger shortcuts when user is typing in text/number input
      const tagName = e.target.tagName;
      const isInput = tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        ImportExportModule.exportUnitsAsCsv();
        return;
      }

      if (e.key === "Escape" && this.helpModal.classList.contains("active")) {
        this.helpModal.classList.remove("active");
        return;
      }

      if (!isInput) {
        const tabMap = {
          "1": "import",
          "2": "table",
          "3": "ttk",
          "4": "progression",
          "5": "loot",
          "6": "audit"
        };
        if (tabMap[e.key]) {
          this.switchTab(tabMap[e.key]);
        }
      }
    });
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const iconMap = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️"
    };
    toast.innerHTML = `<span>${iconMap[type] || 'ℹ️'}</span> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3200);
  }
}

// Bootstrap application on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.init();
});
