// =====================================================
// 2. STATE & PERSISTENCE
// =====================================================
const LEGACY_STORAGE_KEY = 'nutritracker_v1';
const STORAGE_KEY = 'nutritracker_v2';

function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function addDays(dateStr, delta) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + delta);
  return getLocalDateStr(d);
}

function getMondayOfWeek(dateStr) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return getLocalDateStr(d);
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatHumanDate(dateStr) {
  const today = getLocalDateStr();
  if (dateStr === today) return `Today · ${dateStr}`;
  if (dateStr === addDays(today, -1)) return `Yesterday · ${dateStr}`;
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortRange(startStr, endStr) {
  const s = parseLocalDate(startStr);
  const e = parseLocalDate(endStr);
  const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eFmt = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${sFmt} – ${eFmt}`;
}

let activeMergeMeal = null;
let selectedMergeIds = new Set();

let state = {
  schemaVersion: 2,
  activeTab: 'today',
  selectedDate: getLocalDateStr(),
  subMacrosOpen: false,
  microFilter: 'all',
  migrationNoticePending: false,
  aiConsentGiven: false,
  insights: {
    mode: 'week',
    anchorDate: getLocalDateStr(),
    aiLoading: false,
    aiError: null,
    aiResult: null
  },
  profile: {
    sex: 'male',
    age: 18,
    height: 178,
    weight: 78.5,
    activity: 1.55,
    goalDelta: 0
  },
  targets: {
    cal: 2850, pro: 165, carbs: 340, netCarbs: 302, fiber: 38,
    fat: 88, satCap: 26, mono: 35, poly: 20,
    sleepMinutes: 480,
    micros: {
      vit_a_mcg: 900, vit_c_mg: 90, vit_d_mcg: 20, vit_e_mg: 15, vit_k_mcg: 120,
      vit_b1_mg: 1.2, vit_b2_mg: 1.3, vit_b3_mg: 16, vit_b6_mg: 1.7, vit_b9_mcg: 400, vit_b12_mcg: 2.4,
      sodium_mg: 2300, potassium_mg: 3400, magnesium_mg: 420, calcium_mg: 1000,
      iron_mg: 8, zinc_mg: 11, phosphorus_mg: 700
    }
  },
  loggedItems: [],
  sleepLogs: [],
  draftItems: [],
  customFoods: {}
};

// Global cache for current scanned image to allow re-analysis with modified hints
let currentScanImage = null;

function saveState() {
  try {
    const payload = {
      schemaVersion: 2,
      selectedDate: state.selectedDate,
      profile: state.profile,
      loggedItems: state.loggedItems,
      sleepLogs: state.sleepLogs,
      customFoods: state.customFoods,
      migrationNoticePending: state.migrationNoticePending,
      aiConsentGiven: state.aiConsentGiven
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    showToast('Storage error: Could not save data');
  }
}

function loadState() {
  const today = getLocalDateStr();
  const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const emptyNutrients = () => ({
    cal: 0, pro: 0, carbs: 0, fiber: 0, fat: 0, sat: 0, mono: 0, poly: 0,
    micros: Object.fromEntries(MICRO_META.map(m => [m.key, 0]))
  });
  const normalizeLog = (item, index, legacy = false) => {
    const source = item && typeof item === 'object' ? item : {};
    const knownFood = source.foodKey ? USDA_DB[source.foodKey] : null;
    const hasCustomNutrients = Boolean(source.nutrientsPer100g && typeof source.nutrientsPer100g === 'object');
    const needsReview = !knownFood && !hasCustomNutrients;
    const grams = Math.max(1, Number(source.grams) || Number(source.baseGrams) || 100);
    return {
      ...source,
      id: source.id ?? (Date.now() + index + Math.random()),
      date: isDate(source.date) ? source.date : today,
      createdAt: source.createdAt || Date.now(),
      meal: typeof source.meal === 'string' && source.meal ? source.meal : 'Snack',
      foodKey: knownFood ? source.foodKey : (hasCustomNutrients ? (source.foodKey || null) : null),
      isCustom: Boolean(source.isCustom || needsReview),
      isSupplement: Boolean(source.isSupplement),
      name: source.name || (knownFood ? knownFood.name : 'Unrecognized legacy food'),
      grams,
      baseGrams: Math.max(1, Number(source.baseGrams) || grams),
      ingredients: Array.isArray(source.ingredients) ? source.ingredients : [],
      nutrientsPer100g: hasCustomNutrients ? source.nutrientsPer100g : (needsReview ? emptyNutrients() : null),
      needsReview: Boolean(source.needsReview || needsReview),
      legacyMigrated: Boolean(source.legacyMigrated || (legacy && !isDate(source.date)))
    };
  };
  const readPayload = key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      return value.state && typeof value.state === 'object' ? value.state : value;
    } catch (error) {
      console.warn(`Could not parse saved data in ${key}.`, error);
      return null;
    }
  };
  const applyPayload = (payload, legacy = false) => {
    if (payload.profile && typeof payload.profile === 'object') {
      state.profile = { ...state.profile, ...payload.profile };
    }
    if (payload.customFoods && typeof payload.customFoods === 'object' && !Array.isArray(payload.customFoods)) {
      state.customFoods = { ...payload.customFoods };
      Object.assign(USDA_DB, state.customFoods);
    }
    if (Array.isArray(payload.loggedItems)) {
      state.loggedItems = payload.loggedItems.map((item, index) => normalizeLog(item, index, legacy));
    }
    if (Array.isArray(payload.sleepLogs)) {
      // Keep the original records intact. Sleep rendering ignores entries with unusable dates.
      state.sleepLogs = payload.sleepLogs;
    }
    if (isDate(payload.selectedDate)) state.selectedDate = payload.selectedDate;
    state.migrationNoticePending = Boolean(payload.migrationNoticePending) ||
      (legacy && state.loggedItems.some(item => item.legacyMigrated));
    state.aiConsentGiven = Boolean(payload.aiConsentGiven);
  };

  try {
    const savedKey = localStorage.getItem('nutritracker_gemini_key');
    if (savedKey) {
      const keyEl = document.getElementById('apiKeyInput');
      if (keyEl) keyEl.value = savedKey;
    }
  } catch (error) {
    console.warn('Could not read optional AI settings.', error);
  }

  const currentPayload = readPayload(STORAGE_KEY);
  if (currentPayload) {
    applyPayload(currentPayload, false);
    syncProfileInputsFromState();
    return;
  }

  // Older installations used nutritracker_v1. Leave that key untouched after migration.
  const legacyPayload = readPayload(LEGACY_STORAGE_KEY);
  if (legacyPayload) {
    applyPayload(legacyPayload, true);
    if (!Array.isArray(legacyPayload.loggedItems) && Array.isArray(legacyPayload.foods)) {
      state.loggedItems = legacyPayload.foods.map((item, index) => normalizeLog(item, index, true));
    }
    saveState();
    console.info('Migrated NutriTracker data to the current storage schema. The original backup key was retained.');
  }
  syncProfileInputsFromState();
}

// Checks whether an item is already a favorite
function getFavoriteKeyByName(name) {
  if (!state.customFoods) return null;
  const clean = name.replace(/^★\s*/, '').trim().toLowerCase();
  for (const [key, val] of Object.entries(state.customFoods)) {
    const valClean = val.name.replace(/^★\s*/, '').trim().toLowerCase();
    if (valClean === clean) return key;
  }
  return null;
}

// Toggles a favorite using the star button
function toggleFavorite(itemId) {
  const item = state.loggedItems.find(i => i.id === itemId);
  if (!item) return;

  const existingKey = getFavoriteKeyByName(item.name);

  if (existingKey) {
    // Already a favorite: remove it
    delete state.customFoods[existingKey];
    delete USDA_DB[existingKey];
    saveState();
    renderQuickFoods();
    renderApp();
    showToast('Removed from favorites');
  } else {
    // Not a favorite yet: add it
    const f = getNutrientProfile(item);
    if (!f) return;

    const key = 'custom_' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    
    // Copy the nutrient profile
    const newEntry = {
      name: `★ ${item.name.replace(/^★\s*/, '')}`,
      defaultG: item.grams || f.defaultG || 100,
      cal: f.cal,
      pro: f.pro,
      carbs: f.carbs,
      fiber: f.fiber,
      fat: f.fat,
      sat: f.sat,
      mono: f.mono,
      poly: f.poly,
      micros: f.micros || {}
    };

    state.customFoods[key] = newEntry;
    USDA_DB[key] = newEntry;
    saveState();
    renderQuickFoods();
    renderApp();
    showToast('Added to favorites!');
  }
}

// Permanently removes a favorite from the quick-food list
function deleteFavorite(foodKey) {
  if (!state.customFoods[foodKey]) return;
  delete state.customFoods[foodKey];
  delete USDA_DB[foodKey];
  saveState();
  renderQuickFoods();
  renderApp();
  showToast('Favorite deleted');
}
  
function dismissMigrationNotice() {
  state.migrationNoticePending = false;
  saveState();
  renderApp();
}

function syncProfileInputsFromState() {
  const p = state.profile;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
  setVal('bioSex', p.sex);
  setVal('bioAge', p.age);
  setVal('bioHeight', p.height);
  setVal('bioWeight', p.weight);
  setVal('bioActivity', p.activity);
  setVal('bioGoal', p.goalDelta);
}
