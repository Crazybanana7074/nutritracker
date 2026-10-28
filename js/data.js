// =====================================================
// 1. USDA NUTRIENT DATABASE (Per 100g)
// =====================================================
const USDA_DB = {
  sirloin_steak: {
    name: "Sirloin Steak (Lean)", defaultG: 180,
    cal: 206, pro: 30.5, carbs: 0, fiber: 0, fat: 8.4, sat: 3.2, mono: 3.6, poly: 0.4,
    micros: { vit_a_mcg: 2, vit_c_mg: 0, vit_d_mcg: 0.1, vit_e_mg: 0.3, vit_k_mcg: 1.5, vit_b1_mg: 0.1, vit_b2_mg: 0.25, vit_b3_mg: 7.6, vit_b6_mg: 0.65, vit_b9_mcg: 10, vit_b12_mcg: 2.8, sodium_mg: 58, potassium_mg: 370, magnesium_mg: 26, calcium_mg: 18, iron_mg: 2.6, zinc_mg: 6.2, phosphorus_mg: 245 }
  },
  ground_beef: {
    name: "Lean Ground Beef (90%)", defaultG: 150,
    cal: 217, pro: 26.1, carbs: 0, fiber: 0, fat: 11.8, sat: 4.6, mono: 5.0, poly: 0.4,
    micros: { vit_a_mcg: 3, vit_c_mg: 0, vit_d_mcg: 0.1, vit_e_mg: 0.2, vit_k_mcg: 1.1, vit_b1_mg: 0.05, vit_b2_mg: 0.18, vit_b3_mg: 5.8, vit_b6_mg: 0.38, vit_b9_mcg: 9, vit_b12_mcg: 2.5, sodium_mg: 66, potassium_mg: 318, magnesium_mg: 21, calcium_mg: 18, iron_mg: 2.4, zinc_mg: 6.3, phosphorus_mg: 210 }
  },
  basmati_rice: {
    name: "Basmati Rice (Cooked)", defaultG: 160,
    cal: 130, pro: 2.9, carbs: 28.2, fiber: 0.6, fat: 0.3, sat: 0.1, mono: 0.1, poly: 0.1,
    micros: { vit_a_mcg: 0, vit_c_mg: 0, vit_d_mcg: 0, vit_e_mg: 0.05, vit_k_mcg: 0, vit_b1_mg: 0.16, vit_b2_mg: 0.02, vit_b3_mg: 1.5, vit_b6_mg: 0.09, vit_b9_mcg: 58, vit_b12_mcg: 0, sodium_mg: 2, potassium_mg: 35, magnesium_mg: 12, calcium_mg: 10, iron_mg: 1.2, zinc_mg: 0.5, phosphorus_mg: 43 }
  },
  rolled_oats: {
    name: "Rolled Oats (Dry)", defaultG: 80,
    cal: 379, pro: 13.2, carbs: 67.7, fiber: 10.1, fat: 6.5, sat: 1.1, mono: 2.0, poly: 2.3,
    micros: { vit_a_mcg: 0, vit_c_mg: 0, vit_d_mcg: 0, vit_e_mg: 0.42, vit_k_mcg: 2.0, vit_b1_mg: 0.46, vit_b2_mg: 0.15, vit_b3_mg: 1.1, vit_b6_mg: 0.1, vit_b9_mcg: 32, vit_b12_mcg: 0, sodium_mg: 6, potassium_mg: 362, magnesium_mg: 138, calcium_mg: 52, iron_mg: 4.25, zinc_mg: 3.6, phosphorus_mg: 410 }
  },
  baked_potato: {
    name: "Baked Potato", defaultG: 220,
    cal: 95, pro: 2.6, carbs: 21.4, fiber: 2.3, fat: 0.1, sat: 0.03, mono: 0, poly: 0.05,
    micros: { vit_a_mcg: 1, vit_c_mg: 9.6, vit_d_mcg: 0, vit_e_mg: 0.04, vit_k_mcg: 2.0, vit_b1_mg: 0.06, vit_b2_mg: 0.05, vit_b3_mg: 1.4, vit_b6_mg: 0.31, vit_b9_mcg: 28, vit_b12_mcg: 0, sodium_mg: 10, potassium_mg: 550, magnesium_mg: 28, calcium_mg: 15, iron_mg: 1.08, zinc_mg: 0.36, phosphorus_mg: 70 }
  },
  greek_yogurt: {
    name: "Greek Yogurt (2%)", defaultG: 200,
    cal: 73, pro: 9.9, carbs: 3.8, fiber: 0, fat: 1.9, sat: 1.2, mono: 0.5, poly: 0.1,
    micros: { vit_a_mcg: 18, vit_c_mg: 0.8, vit_d_mcg: 1.2, vit_e_mg: 0.04, vit_k_mcg: 0.2, vit_b1_mg: 0.04, vit_b2_mg: 0.23, vit_b3_mg: 0.2, vit_b6_mg: 0.06, vit_b9_mcg: 7, vit_b12_mcg: 0.75, sodium_mg: 36, potassium_mg: 141, magnesium_mg: 11, calcium_mg: 115, iron_mg: 0.07, zinc_mg: 0.6, phosphorus_mg: 135 }
  },
  pecans: {
    name: "Pecans", defaultG: 30,
    cal: 691, pro: 9.2, carbs: 13.9, fiber: 9.6, fat: 72.0, sat: 6.2, mono: 40.8, poly: 21.6,
    micros: { vit_a_mcg: 3, vit_c_mg: 1.1, vit_d_mcg: 0, vit_e_mg: 1.4, vit_k_mcg: 3.5, vit_b1_mg: 0.66, vit_b2_mg: 0.13, vit_b3_mg: 1.17, vit_b6_mg: 0.21, vit_b9_mcg: 22, vit_b12_mcg: 0, sodium_mg: 0, potassium_mg: 410, magnesium_mg: 121, calcium_mg: 70, iron_mg: 2.53, zinc_mg: 4.53, phosphorus_mg: 277 }
  },
  broccoli_steamed: {
    name: "Broccoli (Steamed)", defaultG: 120,
    cal: 35, pro: 2.4, carbs: 7.2, fiber: 3.3, fat: 0.4, sat: 0.05, mono: 0.04, poly: 0.17,
    micros: { vit_a_mcg: 77, vit_c_mg: 64.9, vit_d_mcg: 0, vit_e_mg: 1.45, vit_k_mcg: 141, vit_b1_mg: 0.06, vit_b2_mg: 0.12, vit_b3_mg: 0.55, vit_b6_mg: 0.2, vit_b9_mcg: 108, vit_b12_mcg: 0, sodium_mg: 41, potassium_mg: 293, magnesium_mg: 21, calcium_mg: 40, iron_mg: 0.67, zinc_mg: 0.45, phosphorus_mg: 67 }
  },
  spinach_sauteed: {
    name: "Spinach (Cooked)", defaultG: 120,
    cal: 23, pro: 2.9, carbs: 3.8, fiber: 2.4, fat: 0.3, sat: 0.05, mono: 0.01, poly: 0.15,
    micros: { vit_a_mcg: 524, vit_c_mg: 9.8, vit_d_mcg: 0, vit_e_mg: 2.1, vit_k_mcg: 493, vit_b1_mg: 0.09, vit_b2_mg: 0.24, vit_b3_mg: 0.49, vit_b6_mg: 0.24, vit_b9_mcg: 146, vit_b12_mcg: 0, sodium_mg: 70, potassium_mg: 466, magnesium_mg: 87, calcium_mg: 136, iron_mg: 3.57, zinc_mg: 0.76, phosphorus_mg: 56 }
  },
  avocado: {
    name: "Avocado", defaultG: 80,
    cal: 160, pro: 2.0, carbs: 8.5, fiber: 6.7, fat: 14.7, sat: 2.1, mono: 9.8, poly: 1.8,
    micros: { vit_a_mcg: 7, vit_c_mg: 10.0, vit_d_mcg: 0, vit_e_mg: 2.07, vit_k_mcg: 21.0, vit_b1_mg: 0.07, vit_b2_mg: 0.13, vit_b3_mg: 1.74, vit_b6_mg: 0.26, vit_b9_mcg: 81, vit_b12_mcg: 0, sodium_mg: 7, potassium_mg: 485, magnesium_mg: 29, calcium_mg: 12, iron_mg: 0.55, zinc_mg: 0.64, phosphorus_mg: 52 }
  },
  blueberries: {
    name: "Blueberries", defaultG: 100,
    cal: 57, pro: 0.7, carbs: 14.5, fiber: 2.4, fat: 0.3, sat: 0.03, mono: 0.05, poly: 0.15,
    micros: { vit_a_mcg: 3, vit_c_mg: 9.7, vit_d_mcg: 0, vit_e_mg: 0.57, vit_k_mcg: 19.3, vit_b1_mg: 0.04, vit_b2_mg: 0.04, vit_b3_mg: 0.42, vit_b6_mg: 0.05, vit_b9_mcg: 6, vit_b12_mcg: 0, sodium_mg: 1, potassium_mg: 77, magnesium_mg: 6, calcium_mg: 6, iron_mg: 0.28, zinc_mg: 0.16, phosphorus_mg: 12 }
  },
  banana: {
    name: "Banana", defaultG: 120,
    cal: 89, pro: 1.1, carbs: 22.8, fiber: 2.6, fat: 0.3, sat: 0.1, mono: 0.03, poly: 0.07,
    micros: { vit_a_mcg: 3, vit_c_mg: 8.7, vit_d_mcg: 0, vit_e_mg: 0.1, vit_k_mcg: 0.5, vit_b1_mg: 0.03, vit_b2_mg: 0.07, vit_b3_mg: 0.67, vit_b6_mg: 0.37, vit_b9_mcg: 20, vit_b12_mcg: 0, sodium_mg: 1, potassium_mg: 358, magnesium_mg: 27, calcium_mg: 5, iron_mg: 0.26, zinc_mg: 0.15, phosphorus_mg: 22 }
  },
  olive_oil: {
    name: "Olive Oil", defaultG: 10,
    cal: 884, pro: 0, carbs: 0, fiber: 0, fat: 100, sat: 13.8, mono: 73.0, poly: 10.5,
    micros: { vit_a_mcg: 0, vit_c_mg: 0, vit_d_mcg: 0, vit_e_mg: 14.35, vit_k_mcg: 60.2, vit_b1_mg: 0, vit_b2_mg: 0, vit_b3_mg: 0, vit_b6_mg: 0, vit_b9_mcg: 0, vit_b12_mcg: 0, sodium_mg: 2, potassium_mg: 1, magnesium_mg: 0, calcium_mg: 1, iron_mg: 0.56, zinc_mg: 0, phosphorus_mg: 0 }
  }
};

const MICRO_META = [
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', cat: 'mineral', isCap: true },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', cat: 'mineral' },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', cat: 'mineral' },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', cat: 'mineral' },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', cat: 'mineral' },
  { key: 'zinc_mg', label: 'Zinc', unit: 'mg', cat: 'mineral' },
  { key: 'phosphorus_mg', label: 'Phosphorus', unit: 'mg', cat: 'mineral' },
  { key: 'vit_a_mcg', label: 'Vitamin A', unit: 'mcg', cat: 'vitamin' },
  { key: 'vit_c_mg', label: 'Vitamin C', unit: 'mg', cat: 'vitamin' },
  { key: 'vit_d_mcg', label: 'Vitamin D', unit: 'mcg', cat: 'vitamin' },
  { key: 'vit_e_mg', label: 'Vitamin E', unit: 'mg', cat: 'vitamin' },
  { key: 'vit_k_mcg', label: 'Vitamin K', unit: 'mcg', cat: 'vitamin' },
  { key: 'vit_b1_mg', label: 'Vitamin B1', unit: 'mg', cat: 'vitamin' },
  { key: 'vit_b2_mg', label: 'Vitamin B2', unit: 'mg', cat: 'vitamin' },
  { key: 'vit_b3_mg', label: 'Vitamin B3', unit: 'mg', cat: 'vitamin' },
  { key: 'vit_b6_mg', label: 'Vitamin B6', unit: 'mg', cat: 'vitamin' },
  { key: 'vit_b9_mcg', label: 'Vitamin B9 (Folate)', unit: 'mcg', cat: 'vitamin' },
  { key: 'vit_b12_mcg', label: 'Vitamin B12', unit: 'mcg', cat: 'vitamin' }
];

// Helper to extract nutrient profile (works for USDA items and custom AI dishes)
function getNutrientProfile(item) {
  if (!item) return null;
  if (item.isCustom && item.nutrientsPer100g) {
    const rawMicros = item.nutrientsPer100g.micros || {};
    const resolvedMicros = {};
    MICRO_META.forEach(m => {
      resolvedMicros[m.key] = Number(rawMicros[m.key] !== undefined ? rawMicros[m.key] : item.nutrientsPer100g[m.key]) || 0;
    });

    return {
      name: item.name || 'Custom Meal',
      defaultG: item.baseGrams || item.grams || 1,
      isSupplement: Boolean(item.isSupplement),
      cal: Number(item.nutrientsPer100g.cal) || 0,
      pro: Number(item.nutrientsPer100g.pro) || 0,
      carbs: Number(item.nutrientsPer100g.carbs) || 0,
      fiber: Number(item.nutrientsPer100g.fiber) || 0,
      fat: Number(item.nutrientsPer100g.fat) || 0,
      sat: Number(item.nutrientsPer100g.sat) || 0,
      mono: Number(item.nutrientsPer100g.mono) || 0,
      poly: Number(item.nutrientsPer100g.poly) || 0,
      micros: resolvedMicros
    };
  }
  return USDA_DB[item.foodKey] || null;
}
