// lootValidator.js - Drop table probability auditor, normalizer, and Monte-Carlo simulation

import { Storage, DEFAULT_LOOT } from "../storage.js";

export const LootValidatorModule = {
  init({ showToast }) {
    this.showToast = showToast;

    this.tableBody = document.getElementById("lootTableBody");
    this.statusBox = document.getElementById("lootSumStatus");
    this.statusIcon = document.getElementById("lootSumIcon");
    this.statusText = document.getElementById("lootSumText");
    this.rowCount = document.getElementById("lootRowCount");

    this.addBtn = document.getElementById("addLootRowBtn");
    this.normalizeBtn = document.getElementById("normalizeLootBtn");
    this.loadPresetBtn = document.getElementById("loadPresetLootBtn");
    this.exportCsvBtn = document.getElementById("exportLootCsvBtn");

    this.simRollCount = document.getElementById("simRollCount");
    this.runSimBtn = document.getElementById("runSimulationBtn");
    this.simResultsArea = document.getElementById("simulationResults");
    this.simTableBody = document.getElementById("simulationTableBody");

    this.lootItems = Storage.getLoot();

    this.setupEvents();
    this.render();
  },

  setupEvents() {
    this.addBtn.addEventListener("click", () => this.addNewLootItem());
    this.normalizeBtn.addEventListener("click", () => this.normalizeProbabilities());
    this.loadPresetBtn.addEventListener("click", () => {
      this.lootItems = JSON.parse(JSON.stringify(DEFAULT_LOOT));
      Storage.saveLoot(this.lootItems);
      this.render();
      this.showToast("Загружен пресет лута (100.0%)", "success");
    });

    this.exportCsvBtn.addEventListener("click", () => this.exportCsv());
    this.runSimBtn.addEventListener("click", () => this.runMonteCarloSimulation());

    // Inline editing in loot table
    this.tableBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("cell-input")) {
        const row = e.target.closest("tr");
        const id = parseInt(row.dataset.id, 10);
        const field = e.target.dataset.field;
        let val = e.target.value;

        if (field === "chance" || field === "min_qty" || field === "max_qty") {
          val = parseFloat(val);
          if (isNaN(val) || val < 0) {
            this.showToast(`Некорректное значение для поля ${field}`, "warning");
            this.render();
            return;
          }
        }

        const item = this.lootItems.find(i => i.id === id);
        if (item) {
          item[field] = val;
          Storage.saveLoot(this.lootItems);
          this.checkSumAndRenderStatus();
        }
      }
    });

    // Delete item listener
    this.tableBody.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".btn-delete-loot");
      if (deleteBtn) {
        const row = deleteBtn.closest("tr");
        const id = parseInt(row.dataset.id, 10);
        this.deleteLootItem(id);
      }
    });
  },

  addNewLootItem() {
    const nextId = this.lootItems.length > 0 ? Math.max(...this.lootItems.map(i => i.id)) + 1 : 1;
    this.lootItems.push({
      id: nextId,
      item_name: `Новый предмет #${nextId}`,
      chance: 5.0,
      rarity: "Обычный",
      min_qty: 1,
      max_qty: 1
    });

    Storage.saveLoot(this.lootItems);
    this.render();
    this.showToast(`Предмет #${nextId} добавлен`, "info");
  },

  deleteLootItem(id) {
    const idx = this.lootItems.findIndex(i => i.id === id);
    if (idx === -1) return;

    this.lootItems.splice(idx, 1);
    Storage.saveLoot(this.lootItems);
    this.render();
    this.showToast("Предмет удален из лут-таблицы", "warning");
  },

  normalizeProbabilities() {
    if (this.lootItems.length === 0) return;

    const currentSum = this.lootItems.reduce((acc, cur) => acc + (parseFloat(cur.chance) || 0), 0);
    if (currentSum <= 0) {
      this.showToast("Сумма шансов равна 0. Задайте ненулевые веса", "error");
      return;
    }

    // Scale each probability so sum becomes exactly 100.00
    let runningSum = 0;
    this.lootItems.forEach((item, idx) => {
      if (idx === this.lootItems.length - 1) {
        // Last element absorbs tiny float remainder
        item.chance = Math.round((100 - runningSum) * 100) / 100;
      } else {
        const normalized = Math.round(((item.chance / currentSum) * 100) * 100) / 100;
        item.chance = normalized;
        runningSum += normalized;
      }
    });

    Storage.saveLoot(this.lootItems);
    this.render();
    this.showToast("Вероятности успешно нормализованы к 100.00%", "success");
  },

  checkSumAndRenderStatus() {
    const sum = this.lootItems.reduce((acc, cur) => acc + (parseFloat(cur.chance) || 0), 0);
    const roundedSum = Math.round(sum * 1000) / 1000;
    const diff = Math.round((100.0 - roundedSum) * 1000) / 1000;

    // Tolerance of 0.001 to handle float rounding
    const isValid = Math.abs(diff) < 0.001;

    if (isValid) {
      this.statusBox.className = "alert alert-success";
      this.statusIcon.textContent = "✅";
      this.statusText.innerHTML = `<strong>Сумма шансов: 100.00%</strong> — Таблица лута строго сбалансирована и готова к выгрузке.`;
    } else if (diff > 0) {
      this.statusBox.className = "alert alert-warning";
      this.statusIcon.textContent = "⚠️";
      this.statusText.innerHTML = `<strong>Текущая сумма шансов: ${roundedSum.toFixed(2)}%</strong> (Дефицит: <strong>${diff.toFixed(2)}%</strong>). Нажмите «Нормализовать», чтобы сбалансировать автоматически.`;
    } else {
      this.statusBox.className = "alert alert-error";
      this.statusIcon.textContent = "❌";
      this.statusText.innerHTML = `<strong>Текущая сумма шансов: ${roundedSum.toFixed(2)}%</strong> (Перебор на <strong>${Math.abs(diff).toFixed(2)}%</strong>). Сумма должна быть ровно 100%.`;
    }

    this.rowCount.textContent = `Предметов: ${this.lootItems.length} | Сумма: ${roundedSum.toFixed(2)}%`;
  },

  render() {
    this.checkSumAndRenderStatus();

    if (this.lootItems.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            Таблица лута пуста. Нажмите «Загрузить демо лута» или «+ Добавить предмет».
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = this.lootItems.map(item => `
      <tr data-id="${item.id}">
        <td style="font-family: monospace; color: var(--text-dim);">#${item.id}</td>
        <td>
          <input type="text" class="cell-input" data-field="item_name" value="${this.escapeHtml(item.item_name)}">
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.25rem;">
            <input type="number" class="cell-input" data-field="chance" value="${item.chance}" min="0" max="100" step="0.1" style="font-weight: 700; color: var(--accent-blue);">
            <span style="font-size: 0.8rem; color: var(--text-dim);">%</span>
          </div>
        </td>
        <td>
          <input type="text" class="cell-input" data-field="rarity" value="${this.escapeHtml(item.rarity || 'Обычный')}">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="min_qty" value="${item.min_qty || 1}" min="1" step="1">
        </td>
        <td>
          <input type="number" class="cell-input" data-field="max_qty" value="${item.max_qty || 1}" min="1" step="1">
        </td>
        <td style="text-align: center;">
          <button class="btn btn-outline btn-icon btn-delete-loot" title="Удалить предмет" style="color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);">
            🗑️
          </button>
        </td>
      </tr>
    `).join("");
  },

  runMonteCarloSimulation() {
    if (this.lootItems.length === 0) {
      this.showToast("Таблица пуста, нечего симулировать", "warning");
      return;
    }

    const rolls = parseInt(this.simRollCount.value, 10) || 1000;
    const counts = {};
    this.lootItems.forEach(i => { counts[i.id] = 0; });

    // Prepare cumulative distribution for O(log N) or O(N) lookup
    const cumulativeChances = [];
    let acc = 0;
    this.lootItems.forEach(item => {
      acc += parseFloat(item.chance) || 0;
      cumulativeChances.push({ id: item.id, item, threshold: acc });
    });

    const totalWeight = acc;
    if (totalWeight <= 0) {
      this.showToast("Сумма шансов равна 0", "error");
      return;
    }

    // Run rolls
    for (let r = 0; r < rolls; r++) {
      const roll = Math.random() * totalWeight;
      for (let i = 0; i < cumulativeChances.length; i++) {
        if (roll <= cumulativeChances[i].threshold) {
          counts[cumulativeChances[i].id]++;
          break;
        }
      }
    }

    // Render simulation results
    this.simResultsArea.style.display = "block";
    this.simTableBody.innerHTML = this.lootItems.map(item => {
      const dropped = counts[item.id] || 0;
      const empiricalPercent = (dropped / rolls) * 100;
      const theoreticalPercent = (item.chance / totalWeight) * 100;
      const delta = empiricalPercent - theoreticalPercent;
      const deltaColor = Math.abs(delta) < 1.0 ? "var(--text-muted)" : (delta > 0 ? "var(--accent-emerald)" : "var(--accent-rose)");

      return `
        <tr>
          <td><strong>${item.item_name}</strong></td>
          <td>${theoreticalPercent.toFixed(2)}%</td>
          <td style="font-weight: 700;">${dropped.toLocaleString()}</td>
          <td style="font-weight: 700; color: var(--accent-blue);">${empiricalPercent.toFixed(2)}%</td>
          <td style="color: ${deltaColor}; font-family: monospace;">${delta >= 0 ? "+" : ""}${delta.toFixed(2)}%</td>
        </tr>
      `;
    }).join("");

    this.showToast(`Симуляция ${rolls.toLocaleString()} бросков завершена!`, "success");
  },

  exportCsv() {
    if (!this.lootItems || this.lootItems.length === 0) return;

    let csv = "id,item_name,chance,rarity,min_qty,max_qty\n";
    csv += this.lootItems.map(i => `${i.id},"${i.item_name.replace(/"/g, '""')}",${i.chance},"${i.rarity}",${i.min_qty},${i.max_qty}`).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loot_table_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Таблица лута экспортирована в CSV", "success");
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
