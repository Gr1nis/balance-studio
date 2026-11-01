// importExport.js - Data ingestion, rigorous validation, and lossless export

import { Storage, DEFAULT_UNITS, DEFAULT_WEAPONS } from "../storage.js";

export const ImportExportModule = {
  REQUIRED_UNIT_COLUMNS: ["id", "name", "hp", "attack", "defense"],
  NUMERIC_COLUMNS: ["id", "hp", "attack", "defense", "attack_speed", "cost"],

  init({ onDataUpdated, showToast }) {
    this.onDataUpdated = onDataUpdated;
    this.showToast = showToast;

    this.dropzone = document.getElementById("fileDropzone");
    this.fileInput = document.getElementById("fileInput");
    this.validationOutput = document.getElementById("validationOutput");

    this.setupEvents();
  },

  setupEvents() {
    // File input change
    this.fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
      this.fileInput.value = ""; // reset for re-upload
    });

    // Dropzone click & drag events
    this.dropzone.addEventListener("click", () => this.fileInput.click());

    ["dragenter", "dragover"].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.remove("drag-over");
      });
    });

    this.dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });

    // Preset buttons
    document.getElementById("loadPresetUnitsBtn").addEventListener("click", () => {
      Storage.saveUnits(DEFAULT_UNITS);
      this.showValidationSuccess("Успешно загружен демо-набор: 12 боевых юнитов RPG.", DEFAULT_UNITS.length);
      this.onDataUpdated(DEFAULT_UNITS);
      this.showToast("Пресет юнитов загружен", "success");
    });

    document.getElementById("loadPresetWeaponsBtn").addEventListener("click", () => {
      // Convert weapon format to unit compatible format for battle simulation
      const weaponUnits = DEFAULT_WEAPONS.map(w => ({
        id: w.id,
        name: w.name,
        hp: 100,
        attack: w.damage,
        defense: 5,
        attack_speed: w.speed,
        cost: w.cost
      }));
      Storage.saveUnits(weaponUnits);
      this.showValidationSuccess("Успешно загружен демо-набор оружия (адаптирован для симуляции).", weaponUnits.length);
      this.onDataUpdated(weaponUnits);
      this.showToast("Пресет оружия загружен", "success");
    });

    // Export buttons
    document.getElementById("exportCsvBtn").addEventListener("click", () => this.exportUnitsAsCsv());
    document.getElementById("exportJsonBtn").addEventListener("click", () => this.exportUnitsAsJson());
  },

  processFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;
      if (ext === "json") {
        this.parseJsonContent(content, file.name);
      } else if (ext === "csv") {
        this.parseCsvContent(content, file.name);
      } else {
        this.showValidationError([`Неподдерживаемый формат файла (.${ext}). Используйте .csv или .json`]);
      }
    };

    reader.onerror = () => {
      this.showValidationError([`Ошибка чтения файла: ${file.name}`]);
    };

    reader.readAsText(file);
  },

  parseCsvContent(rawCsv, filename) {
    // Use PapaParse if loaded, with robust fallbacks
    if (window.Papa) {
      const parsed = window.Papa.parse(rawCsv, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false // We type-check manually for precise error reporting
      });

      if (parsed.errors && parsed.errors.length > 0) {
        const errorMessages = parsed.errors.map(err => `Строка ${err.row}: ${err.message}`);
        this.showValidationError(errorMessages);
        return;
      }

      this.validateAndCommitData(parsed.data, filename);
    } else {
      // Fallback simple CSV parser
      try {
        const lines = rawCsv.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) throw new Error("CSV файл пуст или не содержит строк данных");
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx];
          });
          data.push(row);
        }
        this.validateAndCommitData(data, filename);
      } catch (err) {
        this.showValidationError([`Ошибка парсинга CSV: ${err.message}`]);
      }
    }
  },

  parseJsonContent(rawJson, filename) {
    try {
      const parsed = JSON.parse(rawJson);
      const data = Array.isArray(parsed) ? parsed : (parsed.units || parsed.items || []);
      if (!Array.isArray(data) || data.length === 0) {
        this.showValidationError(["JSON должен содержать непустой массив объектов юнитов/предметов"]);
        return;
      }
      this.validateAndCommitData(data, filename);
    } catch (err) {
      this.showValidationError([`Невалидный JSON синтаксис: ${err.message}`]);
    }
  },

  validateAndCommitData(rawData, filename) {
    const errors = [];
    const validRows = [];
    const seenIds = new Set();

    if (!rawData || rawData.length === 0) {
      this.showValidationError(["Файл не содержит записей"]);
      return;
    }

    // 1. Check required headers
    const sample = rawData[0];
    const missingCols = this.REQUIRED_UNIT_COLUMNS.filter(col => !(col in sample));
    if (missingCols.length > 0) {
      errors.push(`Отсутствуют обязательные колонки: ${missingCols.join(", ")} (требуются: ${this.REQUIRED_UNIT_COLUMNS.join(", ")})`);
      this.showValidationError(errors);
      return;
    }

    // 2. Row by row validation
    rawData.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const normalizedRow = { ...row };

      // ID check
      const id = parseInt(row.id, 10);
      if (isNaN(id)) {
        errors.push(`Строка ${rowNum}: Некорректный ID "${row.id}". Должен быть целым числом.`);
      } else if (seenIds.has(id)) {
        errors.push(`Строка ${rowNum}: Обнаружен дубликат ID #${id} для юнита "${row.name || 'без имени'}".`);
      } else {
        seenIds.add(id);
        normalizedRow.id = id;
      }

      // Name check
      const name = String(row.name || "").trim();
      if (!name) {
        errors.push(`Строка ${rowNum}: Имя юнита не может быть пустым.`);
      } else {
        normalizedRow.name = name;
      }

      // Numerical stats validation
      ["hp", "attack", "defense"].forEach(stat => {
        const val = parseFloat(row[stat]);
        if (isNaN(val) || val < 0) {
          errors.push(`Строка ${rowNum}: Поле "${stat}" содержит недопустимое значение "${row[stat]}". Ожидается число >= 0.`);
        } else {
          normalizedRow[stat] = val;
        }
      });

      // Optional stats with sensible defaults
      normalizedRow.attack_speed = (row.attack_speed !== undefined && !isNaN(parseFloat(row.attack_speed)) && parseFloat(row.attack_speed) > 0)
        ? parseFloat(row.attack_speed)
        : 1.0;

      normalizedRow.cost = (row.cost !== undefined && !isNaN(parseFloat(row.cost)))
        ? parseFloat(row.cost)
        : 100;

      validRows.push(normalizedRow);
    });

    if (errors.length > 0) {
      this.showValidationError(errors);
      this.showToast(`Обнаружено ${errors.length} ошибок валидации`, "error");
      return;
    }

    // Commit to storage and dispatch event
    Storage.saveUnits(validRows);
    this.showValidationSuccess(`Файл "${filename}" успешно загружен и прошёл строгую валидацию!`, validRows.length);
    this.onDataUpdated(validRows);
    this.showToast(`Импортировано строк: ${validRows.length}`, "success");
  },

  showValidationError(errors) {
    const listItems = errors.slice(0, 8).map(err => `<li>${err}</li>`).join("");
    const moreText = errors.length > 8 ? `<li>...и ещё ${errors.length - 8} ошибок</li>` : "";

    this.validationOutput.innerHTML = `
      <div class="alert alert-error">
        <span>⚠️</span>
        <div style="width: 100%;">
          <strong>Ошибка валидации файла (${errors.length}):</strong>
          <ul style="margin-top: 0.5rem; line-height: 1.6;">
            ${listItems}
            ${moreText}
          </ul>
        </div>
      </div>
    `;
  },

  showValidationSuccess(message, count) {
    this.validationOutput.innerHTML = `
      <div class="alert alert-success">
        <span>✅</span>
        <div>
          <strong>${message}</strong><br>
          Проверено записей: <strong>${count}</strong>. Все типы данных корректны, дубликаты ID отсутствуют. Данные сохранены в базу.
        </div>
      </div>
    `;
  },

  exportUnitsAsCsv() {
    const units = Storage.getUnits();
    if (!units || units.length === 0) {
      this.showToast("Нет данных для экспорта", "warning");
      return;
    }

    let csvContent = "";
    if (window.Papa) {
      csvContent = window.Papa.unparse(units);
    } else {
      const headers = ["id", "name", "hp", "attack", "defense", "attack_speed", "cost"];
      csvContent = headers.join(",") + "\n" +
        units.map(u => `"${u.id}","${u.name.replace(/"/g, '""')}",${u.hp},${u.attack},${u.defense},${u.attack_speed},${u.cost}`).join("\n");
    }

    this.downloadFile(csvContent, "game_units_export.csv", "text/csv;charset=utf-8;");
    this.showToast("CSV успешно скачан", "success");
  },

  exportUnitsAsJson() {
    const units = Storage.getUnits();
    if (!units || units.length === 0) {
      this.showToast("Нет данных для экспорта", "warning");
      return;
    }

    const jsonContent = JSON.stringify(units, null, 2);
    this.downloadFile(jsonContent, "game_units_export.json", "application/json;charset=utf-8;");
    this.showToast("JSON успешно скачан", "success");
  },

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
