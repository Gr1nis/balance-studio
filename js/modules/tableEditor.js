// tableEditor.js - Interactive spreadsheet view with live inline editing and autosave

import { Storage } from "../storage.js";

export const TableEditorModule = {
  init({ onDataUpdated, showToast }) {
    this.onDataUpdated = onDataUpdated;
    this.showToast = showToast;

    this.tableBody = document.getElementById("unitsTableBody");
    this.searchInput = document.getElementById("tableSearchInput");
    this.rowCountSpan = document.getElementById("tableRowsCount");
    this.addRowBtn = document.getElementById("addRowBtn");

    this.currentUnits = Storage.getUnits();
    this.filterQuery = "";

    this.setupEvents();
    this.render();
  },

  setupEvents() {
    this.searchInput.addEventListener("input", (e) => {
      this.filterQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    this.addRowBtn.addEventListener("click", () => {
      this.addNewUnitRow();
    });

    // Delegated input listener for live cell editing
    this.tableBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("cell-input")) {
        const row = e.target.closest("tr");
        const unitId = parseInt(row.dataset.id, 10);
        const field = e.target.dataset.field;
        let value = e.target.value;

        if (field !== "name") {
          value = parseFloat(value);
          if (isNaN(value) || value < 0) {
            this.showToast(`Некорректное числовое значение для поля "${field}"`, "warning");
            this.render();
            return;
          }
        }

        this.updateUnitField(unitId, field, value);
      }
    });

    // Delegated click listener for delete buttons
    this.tableBody.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".btn-delete-row");
      if (deleteBtn) {
        const row = deleteBtn.closest("tr");
        const unitId = parseInt(row.dataset.id, 10);
        this.deleteUnitRow(unitId);
      }
    });
  },

  setUnits(units) {
    this.currentUnits = units;
    this.render();
  },

  updateUnitField(id, field, value) {
    const unit = this.currentUnits.find(u => u.id === id);
    if (!unit) return;

    unit[field] = value;
    Storage.saveUnits(this.currentUnits);
    this.onDataUpdated(this.currentUnits, false); // false = do not re-render table to preserve focus
    this.showToast(`Юнит "${unit.name}" обновлён`, "info");
  },

  addNewUnitRow() {
    const nextId = this.currentUnits.length > 0
      ? Math.max(...this.currentUnits.map(u => u.id)) + 1
      : 1;

    const newUnit = {
      id: nextId,
      name: `Новый юнит #${nextId}`,
      hp: 100,
      attack: 25,
      defense: 10,
      attack_speed: 1.0,
      cost: 100
    };

    this.currentUnits.unshift(newUnit); // add to top so it's immediately visible
    Storage.saveUnits(this.currentUnits);
    this.render();
    this.onDataUpdated(this.currentUnits);
    this.showToast(`Добавлен юнит #${nextId}`, "success");
  },

  deleteUnitRow(id) {
    const idx = this.currentUnits.findIndex(u => u.id === id);
    if (idx === -1) return;

    const removed = this.currentUnits.splice(idx, 1)[0];
    Storage.saveUnits(this.currentUnits);
    this.render();
    this.onDataUpdated(this.currentUnits);
    this.showToast(`Юнит "${removed.name}" удалён`, "warning");
  },

  render() {
    const filtered = this.currentUnits.filter(u => {
      if (!this.filterQuery) return true;
      return (
        u.name.toLowerCase().includes(this.filterQuery) ||
        String(u.id).includes(this.filterQuery)
      );
    });

    this.rowCountSpan.textContent = `Строк: ${filtered.length} (всего: ${this.currentUnits.length})`;

    if (filtered.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            ${this.filterQuery ? "Ничего не найдено по вашему запросу." : "Таблица пуста. Загрузите файл или добавьте строку."}
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = filtered.map(unit => `
      <tr data-id="${unit.id}">
        <td style="font-family: monospace; color: var(--text-dim); font-weight: 600;">#${unit.id}</td>
        <td>
          <input type="text" class="cell-input" data-field="name" value="${this.escapeHtml(unit.name)}">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="hp" value="${unit.hp}" min="1" step="1">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="attack" value="${unit.attack}" min="0" step="1">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="defense" value="${unit.defense}" min="0" step="1">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="attack_speed" value="${unit.attack_speed || 1.0}" min="0.1" max="10" step="0.1">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="cost" value="${unit.cost || 100}" min="0" step="10">
        </td>
        <td style="text-align: center;">
          <button class="btn btn-outline btn-icon btn-delete-row" title="Удалить строку" style="color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);">
            🗑️
          </button>
        </td>
      </tr>
    `).join("");
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};
