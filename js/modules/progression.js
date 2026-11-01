// progression.js - Level progression curves, Chart.js visualization, and pacing table

import { Storage } from "../storage.js";

export const ProgressionModule = {
  init({ showToast }) {
    this.showToast = showToast;

    this.curveTypeSelect = document.getElementById("progCurveType");
    this.sliderBaseXp = document.getElementById("sliderBaseXp");
    this.sliderGrowth = document.getElementById("sliderGrowth");
    this.sliderMaxLevel = document.getElementById("sliderMaxLevel");

    this.valBaseXp = document.getElementById("valBaseXp");
    this.valGrowth = document.getElementById("valGrowth");
    this.valMaxLevel = document.getElementById("valMaxLevel");

    this.chartCanvas = document.getElementById("progressionChart");
    this.tableBody = document.getElementById("progressionTableBody");
    this.exportCsvBtn = document.getElementById("exportProgressionCsvBtn");

    this.chartInstance = null;
    this.progressionData = [];

    // Load saved preferences
    const saved = Storage.getProgressionParams();
    this.curveTypeSelect.value = saved.type || "poly";
    this.sliderBaseXp.value = saved.baseXp || 100;
    this.sliderGrowth.value = saved.growth || 1.8;
    this.sliderMaxLevel.value = saved.maxLevel || 30;

    this.setupEvents();
    this.update();
  },

  setupEvents() {
    const handleSliderInput = () => {
      this.valBaseXp.textContent = this.sliderBaseXp.value;
      this.valGrowth.textContent = this.sliderGrowth.value;
      this.valMaxLevel.textContent = this.sliderMaxLevel.value;
      this.saveParams();
      this.update();
    };

    [this.sliderBaseXp, this.sliderGrowth, this.sliderMaxLevel].forEach(s => {
      s.addEventListener("input", handleSliderInput);
    });

    this.curveTypeSelect.addEventListener("change", () => {
      this.saveParams();
      this.update();
    });

    this.exportCsvBtn.addEventListener("click", () => this.exportCsv());
  },

  saveParams() {
    Storage.saveProgressionParams({
      type: this.curveTypeSelect.value,
      baseXp: parseFloat(this.sliderBaseXp.value),
      growth: parseFloat(this.sliderGrowth.value),
      maxLevel: parseInt(this.sliderMaxLevel.value, 10)
    });
  },

  calculateLevels() {
    const type = this.curveTypeSelect.value;
    const baseXp = parseFloat(this.sliderBaseXp.value);
    const growth = parseFloat(this.sliderGrowth.value);
    const maxLevel = parseInt(this.sliderMaxLevel.value, 10);

    const levels = [];
    let cumulative = 0;

    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      let deltaXp = 0;

      if (type === "linear") {
        deltaXp = Math.round(baseXp * lvl);
      } else if (type === "poly") {
        deltaXp = Math.round(baseXp * Math.pow(lvl, growth));
      } else if (type === "exp") {
        deltaXp = Math.round(baseXp * Math.pow(growth, lvl - 1));
      }

      cumulative += deltaXp;

      levels.push({
        level: lvl,
        deltaXp,
        cumulativeXp: cumulative,
        playtimeMinutes: Math.round(cumulative / 100) // approx 100 XP / min
      });
    }

    return levels;
  },

  update() {
    this.valBaseXp.textContent = this.sliderBaseXp.value;
    this.valGrowth.textContent = this.sliderGrowth.value;
    this.valMaxLevel.textContent = this.sliderMaxLevel.value;

    this.progressionData = this.calculateLevels();
    this.renderTable(this.progressionData);
    this.renderChart(this.progressionData);
  },

  renderTable(data) {
    this.tableBody.innerHTML = data.map(row => `
      <tr>
        <td style="font-weight: 700; color: var(--accent-blue);">Уровень ${row.level}</td>
        <td>${row.deltaXp.toLocaleString()} XP</td>
        <td style="font-weight: 600;">${row.cumulativeXp.toLocaleString()} XP</td>
        <td style="color: var(--text-muted);">${row.playtimeMinutes} мин (${(row.playtimeMinutes / 60).toFixed(1)} ч)</td>
      </tr>
    `).join("");
  },

  renderChart(data) {
    if (!window.Chart || !this.chartCanvas) return;

    const labels = data.map(d => `Ур. ${d.level}`);
    const deltaDataset = data.map(d => d.deltaXp);
    const totalDataset = data.map(d => d.cumulativeXp);

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = deltaDataset;
      this.chartInstance.data.datasets[1].data = totalDataset;
      this.chartInstance.update();
      return;
    }

    const ctx = this.chartCanvas.getContext("2d");
    this.chartInstance = new window.Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Опыт на уровень (Δ XP)",
            data: deltaDataset,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.15)",
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            yAxisID: "y"
          },
          {
            label: "Суммарный опыт (Total XP)",
            data: totalDataset,
            borderColor: "#a855f7",
            backgroundColor: "rgba(168, 85, 247, 0.05)",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.2,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: "#94a3b8",
              font: { family: "Inter", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString()} XP`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8", maxTicksLimit: 15 }
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: { display: true, text: "Δ XP на уровень", color: "#38bdf8" },
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#38bdf8" }
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: { display: true, text: "Суммарный XP", color: "#a855f7" },
            grid: { drawOnChartArea: false },
            ticks: { color: "#a855f7" }
          }
        }
      }
    });
  },

  exportCsv() {
    if (!this.progressionData || this.progressionData.length === 0) return;

    let csv = "level,delta_xp,cumulative_xp,approx_minutes\n";
    csv += this.progressionData.map(d => `${d.level},${d.deltaXp},${d.cumulativeXp},${d.playtimeMinutes}`).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progression_curve_${this.curveTypeSelect.value}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("Кривая прогрессии выгружена в CSV", "success");
  }
};
