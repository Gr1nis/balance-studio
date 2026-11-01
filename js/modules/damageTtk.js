// damageTtk.js - Comprehensive combat simulation and Time-To-Kill calculator

export const DamageTtkModule = {
  init({ showToast }) {
    this.showToast = showToast;

    // Elements
    this.attackerSelect = document.getElementById("attackerSelect");
    this.defenderSelect = document.getElementById("defenderSelect");
    this.attackerStats = document.getElementById("attackerStats");
    this.defenderStats = document.getElementById("defenderStats");

    this.formulaSelect = document.getElementById("ttkFormulaSelect");
    this.critChanceInput = document.getElementById("critChanceInput");
    this.critMultInput = document.getElementById("critMultInput");
    this.elemMultInput = document.getElementById("elemMultInput");
    this.firstHitTimingSelect = document.getElementById("firstHitTimingSelect");

    // Output stats
    this.resHitDamage = document.getElementById("resHitDamage");
    this.resCritDamage = document.getElementById("resCritDamage");
    this.resHitsToKill = document.getElementById("resHitsToKill");
    this.resTtkSeconds = document.getElementById("resTtkSeconds");
    this.resDpsSub = document.getElementById("resDpsSub");
    this.resEhp = document.getElementById("resEhp");
    this.combatLogList = document.getElementById("combatLogList");

    this.units = [];
    this.setupEvents();
  },

  setupEvents() {
    const triggerRecalc = () => this.calculate();

    this.attackerSelect.addEventListener("change", () => {
      this.updateFighterCards();
      this.calculate();
    });

    this.defenderSelect.addEventListener("change", () => {
      this.updateFighterCards();
      this.calculate();
    });

    [
      this.formulaSelect,
      this.critChanceInput,
      this.critMultInput,
      this.elemMultInput,
      this.firstHitTimingSelect
    ].forEach(el => el.addEventListener("input", triggerRecalc));
  },

  setUnits(units) {
    this.units = units || [];

    const prevAttackerId = parseInt(this.attackerSelect.value, 10);
    const prevDefenderId = parseInt(this.defenderSelect.value, 10);

    this.attackerSelect.innerHTML = "";
    this.defenderSelect.innerHTML = "";

    if (this.units.length === 0) {
      this.attackerSelect.innerHTML = `<option value="">Нет доступных юнитов</option>`;
      this.defenderSelect.innerHTML = `<option value="">Нет доступных юнитов</option>`;
      this.clearOutputs();
      return;
    }

    this.units.forEach((u, i) => {
      const optA = document.createElement("option");
      optA.value = u.id;
      optA.textContent = `${u.name} (ATK: ${u.attack}, DEF: ${u.defense}, HP: ${u.hp})`;
      this.attackerSelect.appendChild(optA);

      const optD = document.createElement("option");
      optD.value = u.id;
      optD.textContent = `${u.name} (HP: ${u.hp}, DEF: ${u.defense})`;
      this.defenderSelect.appendChild(optD);
    });

    // Restore previous selection or pick reasonable pair
    if (this.units.some(u => u.id === prevAttackerId)) {
      this.attackerSelect.value = prevAttackerId;
    } else {
      this.attackerSelect.selectedIndex = 0;
    }

    if (this.units.some(u => u.id === prevDefenderId)) {
      this.defenderSelect.value = prevDefenderId;
    } else {
      this.defenderSelect.selectedIndex = this.units.length > 1 ? 1 : 0;
    }

    this.updateFighterCards();
    this.calculate();
  },

  updateFighterCards() {
    const attacker = this.getFighter(this.attackerSelect.value);
    const defender = this.getFighter(this.defenderSelect.value);

    if (attacker) {
      this.attackerStats.innerHTML = `
        <strong>ATK:</strong> ${attacker.attack} | 
        <strong>Скорость:</strong> ${attacker.attack_speed} уд/с | 
        <strong>Стоимость:</strong> ${attacker.cost} зол.
      `;
    } else {
      this.attackerStats.innerHTML = "";
    }

    if (defender) {
      this.defenderStats.innerHTML = `
        <strong>HP:</strong> ${defender.hp} | 
        <strong>DEF:</strong> ${defender.defense} | 
        <strong>Стоимость:</strong> ${defender.cost} зол.
      `;
    } else {
      this.defenderStats.innerHTML = "";
    }
  },

  getFighter(idStr) {
    const id = parseInt(idStr, 10);
    return this.units.find(u => u.id === id);
  },

  calculate() {
    const attacker = this.getFighter(this.attackerSelect.value);
    const defender = this.getFighter(this.defenderSelect.value);

    if (!attacker || !defender) {
      this.clearOutputs();
      return;
    }

    const formula = this.formulaSelect.value;
    const critChance = Math.max(0, Math.min(100, parseFloat(this.critChanceInput.value) || 0)) / 100;
    const critMult = Math.max(1, parseFloat(this.critMultInput.value) || 1.5);
    const elemMult = Math.max(0.1, parseFloat(this.elemMultInput.value) || 1.0);
    const firstHitTiming = this.firstHitTimingSelect.value;
    const aps = Math.max(0.01, attacker.attack_speed || 1.0);

    // 1. Calculate Base Hit Damage
    let baseHitDamage = 0;
    let critHitDamage = 0;

    if (formula === "flat") {
      // Linear Flat Armor model: Max(1, (Atk * Elem - Def))
      baseHitDamage = Math.max(1, Math.round((attacker.attack * elemMult - defender.defense) * 10) / 10);
      critHitDamage = Math.max(1, Math.round((attacker.attack * critMult * elemMult - defender.defense) * 10) / 10);
    } else {
      // Diminishing Returns Armor model: Atk * Elem * (100 / (100 + Def))
      const armorReduction = 100 / (100 + defender.defense);
      baseHitDamage = Math.max(1, Math.round(attacker.attack * elemMult * armorReduction * 10) / 10);
      critHitDamage = Math.max(1, Math.round(attacker.attack * critMult * elemMult * armorReduction * 10) / 10);
    }

    // Weighted average damage per hit
    const avgHitDamage = (1 - critChance) * baseHitDamage + critChance * critHitDamage;
    const dps = Math.round(avgHitDamage * aps * 10) / 10;

    // Effective HP of target
    const ehp = formula === "flat"
      ? (defender.defense >= attacker.attack ? defender.hp * 10 : Math.round(defender.hp * (attacker.attack / Math.max(1, attacker.attack - defender.defense))))
      : Math.round(defender.hp * (1 + defender.defense / 100));

    // Hits to kill using base damage (and avg damage)
    const hitsToKill = Math.ceil(defender.hp / baseHitDamage);

    // Time to Kill (TTK) calculation
    let ttk = 0;
    if (firstHitTiming === "zero") {
      // First hit occurs at t = 0.0s
      ttk = hitsToKill > 1 ? (hitsToKill - 1) / aps : 0.0;
    } else {
      // First hit occurs after 1 cycle interval (t = 1/aps)
      ttk = hitsToKill / aps;
    }

    // Update Output Numbers
    this.resHitDamage.textContent = baseHitDamage;
    this.resCritDamage.textContent = `Крит (${(critChance * 100).toFixed(0)}%): ${critHitDamage}`;
    this.resHitsToKill.textContent = hitsToKill;
    this.resTtkSeconds.textContent = `${ttk.toFixed(2)} с`;
    this.resDpsSub.textContent = `DPS: ${dps} уд/с: ${aps}`;
    this.resEhp.textContent = ehp;

    // Generate Turn-by-Turn Combat Log
    this.renderCombatLog({
      attacker,
      defender,
      baseHitDamage,
      critHitDamage,
      critChance,
      aps,
      firstHitTiming
    });
  },

  renderCombatLog({ attacker, defender, baseHitDamage, critHitDamage, critChance, aps, firstHitTiming }) {
    let currentHp = defender.hp;
    let round = 1;
    let currentTime = firstHitTiming === "zero" ? 0.0 : 1.0 / aps;
    const interval = 1.0 / aps;
    const logItems = [];

    // Deterministic simulation with simulated crit triggers for clarity
    while (currentHp > 0 && round <= 50) {
      // Pseudo-random deterministic crit check based on round & chance
      const isCrit = (round * 0.37) % 1.0 < critChance;
      const damage = isCrit ? critHitDamage : baseHitDamage;
      const hpBefore = currentHp;
      currentHp = Math.max(0, currentHp - damage);

      const isKill = currentHp === 0;
      const roundClass = isKill ? "combat-round kill" : (isCrit ? "combat-round crit" : "combat-round");

      logItems.push(`
        <div class="${roundClass}">
          <span>[${currentTime.toFixed(2)}с] Раунд ${round}: ${attacker.name} наносит ${damage} урона ${isCrit ? "⚡ КРИТ!" : ""}</span>
          <span>Цель: ${hpBefore} → <strong>${currentHp} HP</strong> ${isKill ? "☠️ ПОГИБ" : ""}</span>
        </div>
      `);

      if (isKill) break;

      round++;
      currentTime += interval;
    }

    this.combatLogList.innerHTML = logItems.join("");
  },

  clearOutputs() {
    this.resHitDamage.textContent = "0";
    this.resCritDamage.textContent = "Крит: 0";
    this.resHitsToKill.textContent = "0";
    this.resTtkSeconds.textContent = "0.00 с";
    this.resDpsSub.textContent = "DPS: 0";
    this.resEhp.textContent = "0";
    this.combatLogList.innerHTML = `<div class="combat-round">Нет данных для симуляции</div>`;
  }
};
