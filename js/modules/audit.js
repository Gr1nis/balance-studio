// audit.js - Game balance heuristic auditor: detects overpowered and underpowered units

export const AuditModule = {
  init() {
    this.tableBody = document.getElementById("auditTableBody");
    this.units = [];
  },

  setUnits(units) {
    this.units = units || [];
    this.render();
  },

  render() {
    if (!this.units || this.units.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            Нет юнитов для анализа. Загрузите базу в первой вкладке.
          </td>
        </tr>
      `;
      return;
    }

    // 1. Calculate base combat power metrics for all units
    const metrics = this.units.map(unit => {
      const aps = Math.max(0.1, unit.attack_speed || 1.0);
      const dps = Math.round((unit.attack * aps) * 10) / 10;
      // EHP with standard 50-armor constant (50 defense = +100% effective HP)
      const ehp = Math.round(unit.hp * (1 + unit.defense / 50));
      const combatPower = Math.round(Math.sqrt(dps * ehp) * 10) / 10;
      const cost = Math.max(1, unit.cost || 100);
      const rawEfficiency = combatPower / cost;

      return {
        unit,
        dps,
        ehp,
        combatPower,
        cost,
        rawEfficiency
      };
    });

    // 2. Average efficiency benchmark
    const avgEfficiency = metrics.reduce((sum, m) => sum + m.rawEfficiency, 0) / metrics.length;

    // 3. Render evaluated rows
    this.tableBody.innerHTML = metrics.map(m => {
      const relativeRatio = (m.rawEfficiency / avgEfficiency) * 100;
      let badgeHtml = "";

      if (relativeRatio >= 125) {
        badgeHtml = `<span class="badge badge-op" title="Высокая отдача на единицу стоимости">🔥 OP (${relativeRatio.toFixed(0)}%)</span>`;
      } else if (relativeRatio <= 78) {
        badgeHtml = `<span class="badge badge-trash" title="Низкая эффективность за эту цену">📉 Слабый (${relativeRatio.toFixed(0)}%)</span>`;
      } else {
        badgeHtml = `<span class="badge badge-balanced" title="Сбалансированный показатель">⚖️ Норма (${relativeRatio.toFixed(0)}%)</span>`;
      }

      return `
        <tr>
          <td>
            <strong>${m.unit.name}</strong>
            <span style="font-size: 0.75rem; color: var(--text-dim); display: block;">#${m.unit.id}</span>
          </td>
          <td><span style="font-weight: 600;">${m.cost}</span> зол.</td>
          <td style="color: var(--accent-blue); font-weight: 600;">${m.dps} <span style="font-size: 0.75rem; color: var(--text-dim);">DPS</span></td>
          <td style="color: var(--accent-emerald); font-weight: 600;">${m.ehp} <span style="font-size: 0.75rem; color: var(--text-dim);">EHP</span></td>
          <td style="font-weight: 700; color: var(--accent-purple);">${m.combatPower}</td>
          <td style="font-family: monospace; font-weight: 600;">${m.rawEfficiency.toFixed(3)}</td>
          <td>${badgeHtml}</td>
        </tr>
      `;
    }).join("");
  }
};
