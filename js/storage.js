// storage.js - LocalStorage management and embedded initial datasets

export const DEFAULT_UNITS = [
  { id: 1, name: "Мечник", hp: 120, attack: 25, defense: 10, attack_speed: 1.2, cost: 100 },
  { id: 2, name: "Копейщик", hp: 100, attack: 30, defense: 8, attack_speed: 1.0, cost: 110 },
  { id: 3, name: "Лучник", hp: 80, attack: 35, defense: 5, attack_speed: 1.5, cost: 120 },
  { id: 4, name: "Рыцарь", hp: 190, attack: 20, defense: 22, attack_speed: 0.8, cost: 200 },
  { id: 5, name: "Маг Огня", hp: 70, attack: 48, defense: 3, attack_speed: 0.9, cost: 150 },
  { id: 6, name: "Разбойник", hp: 85, attack: 32, defense: 6, attack_speed: 1.8, cost: 130 },
  { id: 7, name: "Берсерк", hp: 150, attack: 40, defense: 4, attack_speed: 1.4, cost: 180 },
  { id: 8, name: "Жрец", hp: 90, attack: 15, defense: 12, attack_speed: 1.0, cost: 90 },
  { id: 9, name: "Голем", hp: 260, attack: 28, defense: 30, attack_speed: 0.6, cost: 260 },
  { id: 10, name: "Снайпер", hp: 65, attack: 55, defense: 2, attack_speed: 0.7, cost: 160 },
  { id: 11, name: "Паладин", hp: 170, attack: 22, defense: 18, attack_speed: 0.9, cost: 190 },
  { id: 12, name: "Тёмный Лорд", hp: 320, attack: 50, defense: 25, attack_speed: 1.1, cost: 400 }
];

export const DEFAULT_WEAPONS = [
  { id: 101, name: "Ржавый кинжал", damage: 12, speed: 1.8, crit_chance: 0.15, cost: 30 },
  { id: 102, name: "Железный меч", damage: 24, speed: 1.2, crit_chance: 0.05, cost: 75 },
  { id: 103, name: "Длинный лук", damage: 32, speed: 1.0, crit_chance: 0.10, cost: 110 },
  { id: 104, name: "Боевой топор", damage: 45, speed: 0.8, crit_chance: 0.20, cost: 160 },
  { id: 105, name: "Посох искр", damage: 38, speed: 0.9, crit_chance: 0.08, cost: 140 },
  { id: 106, name: "Тяжелый молот", damage: 58, speed: 0.6, crit_chance: 0.12, cost: 210 },
  { id: 107, name: "Клинок убийцы", damage: 28, speed: 2.0, crit_chance: 0.25, cost: 190 },
  { id: 108, name: "Копьё стража", damage: 30, speed: 1.1, crit_chance: 0.05, cost: 120 },
  { id: 109, name: "Магический гримуар", damage: 52, speed: 0.85, crit_chance: 0.15, cost: 220 },
  { id: 110, name: "Арбалет следопыта", damage: 48, speed: 0.7, crit_chance: 0.30, cost: 180 },
  { id: 111, name: "Пламенный эспадон", damage: 65, speed: 0.75, crit_chance: 0.18, cost: 280 },
  { id: 112, name: "Посох хаоса", damage: 75, speed: 0.9, crit_chance: 0.22, cost: 350 }
];

export const DEFAULT_LOOT = [
  { id: 1, item_name: "Золотые монеты", chance: 35.0, rarity: "Обычный", min_qty: 10, max_qty: 50 },
  { id: 2, item_name: "Малое зелье здоровья", chance: 20.0, rarity: "Обычный", min_qty: 1, max_qty: 3 },
  { id: 3, item_name: "Свиток телепортации", chance: 12.0, rarity: "Необычный", min_qty: 1, max_qty: 2 },
  { id: 4, item_name: "Комплект стрел (х50)", chance: 10.0, rarity: "Обычный", min_qty: 1, max_qty: 1 },
  { id: 5, item_name: "Железная руда", chance: 8.0, rarity: "Обычный", min_qty: 2, max_qty: 5 },
  { id: 6, item_name: "Волшебная пыльца", chance: 6.0, rarity: "Необычный", min_qty: 1, max_qty: 4 },
  { id: 7, item_name: "Кожаный нагрудник", chance: 4.0, rarity: "Редкий", min_qty: 1, max_qty: 1 },
  { id: 8, item_name: "Зачарованный свиток брони", chance: 2.5, rarity: "Редкий", min_qty: 1, max_qty: 1 },
  { id: 9, item_name: "Рубиновое кольцо силы", chance: 1.5, rarity: "Эпический", min_qty: 1, max_qty: 1 },
  { id: 10, item_name: "Эльфийский композитный лук", chance: 0.6, rarity: "Эпический", min_qty: 1, max_qty: 1 },
  { id: 11, item_name: "Древний фолиант мудрости", chance: 0.3, rarity: "Легендарный", min_qty: 1, max_qty: 1 },
  { id: 12, item_name: "Пылающее сердце дракона", chance: 0.1, rarity: "Мифический", min_qty: 1, max_qty: 1 }
];

const STORAGE_KEYS = {
  UNITS: "bps_units_data",
  LOOT: "bps_loot_data",
  THEME: "bps_theme_pref",
  PROGRESSION: "bps_progression_params"
};

export const Storage = {
  getUnits() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.UNITS);
      return data ? JSON.parse(data) : DEFAULT_UNITS;
    } catch (e) {
      console.warn("Storage.getUnits fallback to defaults:", e);
      return DEFAULT_UNITS;
    }
  },

  saveUnits(units) {
    try {
      localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
    } catch (e) {
      console.error("Storage.saveUnits failed:", e);
    }
  },

  getLoot() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOOT);
      return data ? JSON.parse(data) : DEFAULT_LOOT;
    } catch (e) {
      console.warn("Storage.getLoot fallback to defaults:", e);
      return DEFAULT_LOOT;
    }
  },

  saveLoot(loot) {
    try {
      localStorage.setItem(STORAGE_KEYS.LOOT, JSON.stringify(loot));
    } catch (e) {
      console.error("Storage.saveLoot failed:", e);
    }
  },

  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getProgressionParams() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESSION);
      return data ? JSON.parse(data) : { type: "poly", baseXp: 100, growth: 1.8, maxLevel: 30 };
    } catch {
      return { type: "poly", baseXp: 100, growth: 1.8, maxLevel: 30 };
    }
  },

  saveProgressionParams(params) {
    localStorage.setItem(STORAGE_KEYS.PROGRESSION, JSON.stringify(params));
  },

  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.UNITS);
    localStorage.removeItem(STORAGE_KEYS.LOOT);
    localStorage.removeItem(STORAGE_KEYS.PROGRESSION);
  }
};
