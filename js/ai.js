// Multi-model fallback client to ensure zero 404 errors
async function callGeminiVisionApi(apiKey, payload) {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 404) {
        continue;
      }

      const rawBody = await response.text();
      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try {
          const errObj = JSON.parse(rawBody);
          if (errObj?.error?.message) msg = errObj.error.message;
        } catch (_) {}
        throw new Error(msg);
      }

      return JSON.parse(rawBody);
    } catch (e) {
      lastErr = e;
      if (e.message && !e.message.includes('404')) {
        throw e;
      }
    }
  }
  throw lastErr || new Error('No compatible Gemini model is available.');
}

async function runPhotoScanWithCurrentSettings() {
  if (!currentScanImage) {
    showToast('Please select a photo first');
    return;
  }

  const apiKey = (localStorage.getItem('nutritracker_gemini_key') || '').trim();
  if (!apiKey) {
    setPhotoStatusHtml(`
      <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 space-y-1.5">
        <div class="font-bold text-rose-300">No Gemini API key saved</div>
        <p class="text-[11px] text-slate-300 leading-relaxed">
          Enter your API key in the <strong>Goals</strong> tab and click Save.
        </p>
        <button onclick="switchTab('goals')" class="bg-emerald-500 text-slate-950 font-bold text-[11px] px-2.5 py-1 rounded-lg">
          Go to Goals →
        </button>
      </div>
    `);
    return;
  }

  const userHint = getPhotoHint();
  const scanBtn = document.getElementById('triggerScanBtn');
  const scanBtnLabel = document.getElementById('scanBtnLabel');
  const scanSpinner = document.getElementById('scanSpinner');

  if (scanBtn) scanBtn.disabled = true;
  if (scanBtnLabel) scanBtnLabel.textContent = userHint ? 'Analyzing with your hint…' : 'Analyzing photo with AI…';
  if (scanSpinner) scanSpinner.classList.remove('hidden');

  setPhotoStatusHtml(`
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 text-slate-300">
      <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
      <span>${userHint ? `Photo and hint ("${escapeHtml(userHint)}") are being analyzed…` : 'Photo is being analyzed with Gemini Vision…'}</span>
    </div>
  `);

  const validKeys = Object.keys(USDA_DB);
  const dbCatalog = validKeys.map(k => `- "${k}": ${USDA_DB[k].name}`).join('\n');

const systemInstruction = `You are a culinary expert, chef, and registered dietitian assistant for NutriTracker.
You inspect a meal photo, supplement photo, or nutrition facts label alongside an optional user hint/note.

GUIDELINES:
1. Pay very close attention to the user note (if provided). It contains ground truth about ingredients, dish identity, supplement dosage, or recipe specifics.
2. If no food, supplement, or nutrition label is visible, return an empty "dishes" array.
3. For each detected item (dish, food, supplement, or product):
   - Standalone Database Match:
     Identify if it is a pure standalone item exactly in this 13-item list:
${dbCatalog}
     If and only if it directly matches one of these simple single foods, set "isDatabaseMatch": true, "isSupplement": false, and "matchedFoodKey" to that exact key.

   - Dietary Supplements (capsules, tablets, drops, powders, nutrition labels):
     If the image shows dietary supplements or a supplement facts table:
     Set "isSupplement": true.
     Set "isDatabaseMatch": false and "matchedFoodKey": "CUSTOM_DISH".
     Set "name" to the specific product name (e.g. "Magnesiumbisglycinat", "Zink", "Vitamin D3").
     Set "estimatedTotalGrams" to the number of capsules/tablets per serving (usually 1 or 2, as indicated by label or user note).
     In "nutrientsPer100g": Do NOT convert to 100g! Simply provide the exact active dosage per 1 capsule/tablet directly (e.g. magnesium_mg: 400 for 400mg active magnesium per capsule).

   - Cooked Meals, Composite Dishes, Recipes & Other Foods:
     If it is a cooked meal, recipe, or ANY food not in the 13-item list:
     Set "isSupplement": false.
     Set "isDatabaseMatch": false and "matchedFoodKey": "CUSTOM_DISH".
     You MUST estimate the individual ingredients in the "ingredients" array (name, grams, cal, pro, carbs, fat).
     You MUST estimate the overall dish portion weight in "estimatedTotalGrams".
     You MUST estimate realistic nutrition per 100g in "nutrientsPer100g":
       cal, pro, carbs, fiber, fat, sat, mono, poly, sodium_mg, potassium_mg, magnesium_mg, calcium_mg, iron_mg, zinc_mg, phosphorus_mg, vit_a_mcg, vit_c_mg, vit_d_mcg, vit_e_mg, vit_k_mcg, vit_b1_mg, vit_b2_mg, vit_b3_mg, vit_b6_mg, vit_b9_mcg, vit_b12_mcg.
4. Provide confidence (0.0 to 1.0). Keep estimates realistic and practical.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      dishes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            estimatedTotalGrams: { type: 'NUMBER' },
            confidence: { type: 'NUMBER' },
            isDatabaseMatch: { type: 'BOOLEAN' },
            matchedFoodKey: { type: 'STRING' },
            isSupplement: { type: 'BOOLEAN' },
            ingredients: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  grams: { type: 'NUMBER' },
                  cal: { type: 'NUMBER' },
                  pro: { type: 'NUMBER' },
                  carbs: { type: 'NUMBER' },
                  fat: { type: 'NUMBER' }
                },
                required: ['name', 'grams', 'cal', 'pro', 'carbs', 'fat']
              }
            },
            nutrientsPer100g: {
              type: 'OBJECT',
              properties: {
                cal: { type: 'NUMBER' },
                pro: { type: 'NUMBER' },
                carbs: { type: 'NUMBER' },
                fiber: { type: 'NUMBER' },
                fat: { type: 'NUMBER' },
                sat: { type: 'NUMBER' },
                mono: { type: 'NUMBER' },
                poly: { type: 'NUMBER' },
                sodium_mg: { type: 'NUMBER' },
                potassium_mg: { type: 'NUMBER' },
                magnesium_mg: { type: 'NUMBER' },
                calcium_mg: { type: 'NUMBER' },
                iron_mg: { type: 'NUMBER' },
                zinc_mg: { type: 'NUMBER' },
                phosphorus_mg: { type: 'NUMBER' },
                vit_a_mcg: { type: 'NUMBER' },
                vit_c_mg: { type: 'NUMBER' },
                vit_d_mcg: { type: 'NUMBER' },
                vit_e_mg: { type: 'NUMBER' },
                vit_k_mcg: { type: 'NUMBER' },
                vit_b1_mg: { type: 'NUMBER' },
                vit_b2_mg: { type: 'NUMBER' },
                vit_b3_mg: { type: 'NUMBER' },
                vit_b6_mg: { type: 'NUMBER' },
                vit_b9_mcg: { type: 'NUMBER' },
                vit_b12_mcg: { type: 'NUMBER' }
              },
              required: ['cal', 'pro', 'carbs', 'fiber', 'fat', 'sat']
            }
          },
          required: ['name', 'estimatedTotalGrams', 'confidence', 'isDatabaseMatch', 'isSupplement', 'ingredients', 'nutrientsPer100g']
        }
      }
    },
    required: ['dishes']
  };

  const userPromptText = userHint
    ? `Analyze this photo. User note/hint: "${userHint}". Identify the food/dishes, break down the ingredients, and estimate nutrition per instructions.`
    : `Analyze this photo. Identify visible foods/dishes, break down individual ingredients, and calculate nutritional values per instructions.`;

  try {
    const rawResponse = await callGeminiVisionApi(apiKey, {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: currentScanImage.mimeType,
                data: currentScanImage.base64Data
              }
            },
            { text: userPromptText }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    const modelText = rawResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!modelText) throw new Error('Leere Antwort vom Modell erhalten.');

    const parsed = JSON.parse(modelText);
    const dishes = Array.isArray(parsed?.dishes) ? parsed.dishes : [];

    const reliable = dishes.filter(d => d && typeof d.name === 'string' && d.name.trim() !== '' && Number(d.confidence) >= 0.25);

    if (reliable.length === 0) {
      state.draftItems = [];
      renderDraftItems();
      setPhotoStatusHtml(`
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-amber-200">
          No food could be identified reliably. Add a short description above and try again.
        </div>
      `);
      return;
    }

    const drafts = [];
    reliable.forEach(d => {
      const isDb = Boolean(d.isDatabaseMatch) && d.matchedFoodKey && USDA_DB[d.matchedFoodKey];
      const gramsClamped = Math.max(1, Math.round(Number(d.estimatedTotalGrams) || 100));
      
      if (isDb) {
        drafts.push({
          foodKey: d.matchedFoodKey,
          isCustom: false,
          name: USDA_DB[d.matchedFoodKey].name,
          grams: gramsClamped,
          baseGrams: gramsClamped,
          confidence: d.confidence,
          ingredients: [],
          nutrientsPer100g: null
        });
      } else {
        const n100 = d.nutrientsPer100g || {};
        const micros = {};
        MICRO_META.forEach(m => {
          micros[m.key] = Number(n100[m.key]) || 0;
        });

        const ingredients = (Array.isArray(d.ingredients) ? d.ingredients : []).map(ing => ({
          name: String(ing.name || 'Ingredient'),
          grams: Math.max(1, Math.round(Number(ing.grams) || 0)),
          cal: Math.round(Number(ing.cal) || 0),
          pro: Number((Number(ing.pro) || 0).toFixed(1)),
          carbs: Number((Number(ing.carbs) || 0).toFixed(1)),
          fat: Number((Number(ing.fat) || 0).toFixed(1))
        }));

      const isSupp = Boolean(d.isSupplement);
      const servCount = isSupp ? Math.max(1, Math.round(Number(d.estimatedTotalGrams) || 1)) : gramsClamped;

      drafts.push({
        foodKey: null,
        isCustom: true,
        isSupplement: isSupp,
        name: d.name.trim(),
        grams: servCount,
        baseGrams: 1,
        confidence: d.confidence,
        ingredients: ingredients,
nutrientsPer100g: {
          cal: Math.max(0, Number(n100.cal) || 0),
          pro: Math.max(0, Number(n100.pro) || 0),
          carbs: Math.max(0, Number(n100.carbs) || 0),
          fiber: Math.max(0, Number(n100.fiber) || 0),
          fat: Math.max(0, Number(n100.fat) || 0),
          sat: Math.max(0, Number(n100.sat) || 0),
          mono: 0, 
          poly: 0,
          micros: micros
        }
      });
    }
  }); 

  state.draftItems = drafts;
  renderDraftItems();

    state.draftItems = drafts;
    renderDraftItems();

    let statusHtml = `
      <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5">
        <div class="font-bold text-emerald-300 text-[11px]">Meal and ingredients estimated (review below before logging):</div>
        <ul class="text-[11px] text-slate-200 space-y-1">
          ${drafts.map(d => {
            const confPct = Math.round(Math.min(1, Math.max(0, Number(d.confidence || 0.8))) * 100);
            if (d.isCustom) {
              const kcal = Math.round((d.nutrientsPer100g.cal * d.grams) / 100);
              return `
                <li>
                  <div class="font-semibold text-white">• <strong>${escapeHtml(d.name)}</strong> (~${d.grams}g · ${kcal} kcal · ${confPct}% AI confidence)</div>
                  ${d.ingredients.length > 0 ? `<div class="text-[10px] text-slate-400 pl-2">Ingredients: ${d.ingredients.map(i => `${escapeHtml(i.name)} (${i.grams}g)`).join(', ')}</div>` : ''}
                </li>
              `;
            } else {
              return `<li>• <strong>${escapeHtml(d.name)}</strong> (~${d.grams}g · DB-Match · ${confPct}%)</li>`;
            }
          }).join('')}
        </ul>
      </div>
    `;
    setPhotoStatusHtml(statusHtml);

    if (scanBtnLabel) scanBtnLabel.textContent = 'Analyze again with updated hint';
  } catch (err) {
    state.draftItems = [];
    renderDraftItems();
    setPhotoStatusHtml(`
      <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 space-y-1">
        <div class="font-bold text-rose-300">Photo scan failed</div>
        <p class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(err.message || 'Unknown API error')}</p>
      </div>
    `);
    if (scanBtnLabel) scanBtnLabel.textContent = 'Try again';
  } finally {
    if (scanBtn) scanBtn.disabled = false;
    if (scanSpinner) scanSpinner.classList.add('hidden');
  }
}

function closePhotoScan() {
  document.getElementById('photoPreviewCard').classList.add('hidden');
  document.getElementById('scannedImageEl').src = '';
  currentScanImage = null;
  const statusEl = document.getElementById('photoScanStatus');
  if (statusEl) statusEl.innerHTML = '';
}

async function runNlpParser() {
  const inputEl = document.getElementById('nlpInput');
  const raw = inputEl.value.trim();
  if (!raw) return;

  const apiKey = (localStorage.getItem('nutritracker_gemini_key') || '').trim();
  if (!apiKey) {
    showToast('Please save your Gemini API key in the Goals tab first');
    return;
  }

  showToast('Analyzing text with AI...');

  const prompt = `Break this food description into individual foods or meals and estimate nutrition per 100 g (including all 18 micronutrients): "${raw}"`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      items: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            grams: { type: 'NUMBER' },
            nutrientsPer100g: {
              type: 'OBJECT',
              properties: {
                cal: { type: 'NUMBER' }, pro: { type: 'NUMBER' }, carbs: { type: 'NUMBER' },
                fiber: { type: 'NUMBER' }, fat: { type: 'NUMBER' }, sat: { type: 'NUMBER' },
                mono: { type: 'NUMBER' }, poly: { type: 'NUMBER' },
                sodium_mg: { type: 'NUMBER' }, potassium_mg: { type: 'NUMBER' }, magnesium_mg: { type: 'NUMBER' },
                calcium_mg: { type: 'NUMBER' }, iron_mg: { type: 'NUMBER' }, zinc_mg: { type: 'NUMBER' },
                phosphorus_mg: { type: 'NUMBER' }, vit_a_mcg: { type: 'NUMBER' }, vit_c_mg: { type: 'NUMBER' },
                vit_d_mcg: { type: 'NUMBER' }, vit_e_mg: { type: 'NUMBER' }, vit_k_mcg: { type: 'NUMBER' },
                vit_b1_mg: { type: 'NUMBER' }, vit_b2_mg: { type: 'NUMBER' }, vit_b3_mg: { type: 'NUMBER' },
                vit_b6_mg: { type: 'NUMBER' }, vit_b9_mcg: { type: 'NUMBER' }, vit_b12_mcg: { type: 'NUMBER' }
              },
              required: ['cal', 'pro', 'carbs', 'fiber', 'fat', 'sat']
            }
          },
          required: ['name', 'grams', 'nutrientsPer100g']
        }
      }
    },
    required: ['items']
  };

  try {
    const res = await callGeminiVisionApi(apiKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const parsed = JSON.parse(res.candidates[0].content.parts[0].text);
    state.draftItems = (parsed.items || []).map(item => {
      const n100 = item.nutrientsPer100g || {};
      const micros = {};
      MICRO_META.forEach(m => micros[m.key] = Number(n100[m.key]) || 0);
      const g = Math.max(5, Math.round(Number(item.grams) || 100));
      return {
        foodKey: null,
        isCustom: true,
        name: item.name,
        grams: g,
        baseGrams: g,
        ingredients: [],
        nutrientsPer100g: { ...n100, micros }
      };
    });
    renderDraftItems();
  } catch (err) {
    showToast('Error: ' + err.message);
  }
}

function renderDraftItems() {
  const container = document.getElementById('draftContainer');
  if (state.draftItems.length === 0) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  document.getElementById('draftItemsList').innerHTML = state.draftItems.map((item, idx) => {
    const isCustom = Boolean(item.isCustom);
    const isSupp = Boolean(item.isSupplement);
    const f = isCustom ? item.nutrientsPer100g : USDA_DB[item.foodKey];
    const name = isCustom ? item.name : (f ? f.name : 'Food');
    const calPer100 = f ? f.cal : 0;
    const kcal = Math.round((calPer100 * item.grams) / (isSupp ? 1 : 100));
    const maxG = Math.max(650, item.grams * 2);

    let ingHtml = '';
    if (isCustom && Array.isArray(item.ingredients) && item.ingredients.length > 0) {
      const scale = item.grams / (item.baseGrams || item.grams || 1);
      ingHtml = `
        <div class="mt-1 text-[10px] text-slate-400 bg-slate-900/60 rounded-lg p-2 space-y-0.5">
          <div class="font-semibold text-slate-300 mb-0.5">Estimated ingredients:</div>
          ${item.ingredients.map(ing => `
            <div class="flex justify-between text-slate-300">
              <span>• ${escapeHtml(ing.name)}</span>
              <span class="text-slate-400 font-mono">${Math.round(ing.grams * scale)}g · ${Math.round(ing.cal * scale)} kcal</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Supplements use capsule +/- controls; food uses a slider
    let controlHtml = '';
    if (isSupp) {
      const mgMg = Math.round((f?.micros?.magnesium_mg || f?.magnesium_mg || 0) * item.grams);
      controlHtml = `
        <div class="flex items-center justify-between pt-1">
          <span class="text-[11px] text-slate-400">Quantity (${mgMg > 0 ? `${mgMg} mg Magnesium` : 'Dose'}):</span>
          <div class="flex items-center gap-2">
            <button onclick="updateDraftGrams(${idx}, Math.max(1, ${item.grams} - 1))" class="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white hover:bg-slate-800">-</button>
            <span class="text-xs font-bold text-emerald-400">${item.grams}x capsule/tablet</span>
            <button onclick="updateDraftGrams(${idx}, ${item.grams} + 1)" class="w-7 h-7 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white hover:bg-slate-800">+</button>
          </div>
        </div>
      `;
    } else {
      controlHtml = `
        <div class="flex items-center gap-3 pt-1">
          <input type="range" min="10" max="${maxG}" step="5" value="${item.grams}"
            oninput="updateDraftGrams(${idx}, this.value)" class="flex-1" />
          <span class="text-[11px] font-bold text-emerald-400 w-28 text-right">${item.grams}g · ${kcal} kcal</span>
        </div>
      `;
    }

    return `
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
        <div class="flex justify-between items-center text-xs">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-white">${escapeHtml(name)}</span>
            ${isSupp 
              ? '<span class="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">Supplement</span>'
              : (isCustom ? '<span class="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">AI estimate</span>' : '')}
          </div>
          <button onclick="removeDraftItem(${idx})" class="text-slate-500 hover:text-rose-400 text-xs px-1">✕</button>
        </div>
        ${ingHtml}
        ${controlHtml}
      </div>
    `;
  }).join('');
}

function updateDraftGrams(idx, val) {
  if (!state.draftItems[idx]) return;
  state.draftItems[idx].grams = Number(val);
  renderDraftItems();
}

function removeDraftItem(idx) {
  state.draftItems.splice(idx, 1);
  renderDraftItems();
}

function commitDraftItems() {
  const meal = document.getElementById('mealTypeSelect').value;
  state.draftItems.forEach(item => {
    state.loggedItems.push({
      id: Date.now() + Math.random(),
      date: state.selectedDate,
      createdAt: Date.now(),
      meal,
      foodKey: item.foodKey || null,
      isCustom: Boolean(item.isCustom),
      isSupplement: Boolean(item.isSupplement),
      name: item.name || (item.foodKey ? USDA_DB[item.foodKey].name : 'Food'),
      grams: item.grams,
      baseGrams: item.baseGrams || item.grams,
      ingredients: item.ingredients || [],
      nutrientsPer100g: item.nutrientsPer100g || null
    });
  });

  state.draftItems = [];
  document.getElementById('nlpInput').value = '';
  closePhotoScan();
  renderDraftItems();
  saveState();
  renderApp();
  showToast(`Logged to ${state.selectedDate}`);
  switchTab('today');
}

  async function requestAiMealSuggestion(mealName) {
  const apiKey = (localStorage.getItem('nutritracker_gemini_key') || '').trim();
  if (!apiKey) {
    showToast('Please enter your Gemini API key in the Goals tab first');
    switchTab('goals');
    return;
  }

  const modal = document.getElementById('aiMealSuggestionModal');
  const titleEl = document.getElementById('suggestionModalTitle');
  const contentEl = document.getElementById('suggestionModalContent');
  
  titleEl.textContent = `✨ AI suggestion for ${mealName}`;
  contentEl.innerHTML = `
    <div class="p-4 text-center space-y-2">
      <div class="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-400">Analyzing remaining macros and favorites...</p>
    </div>
  `;
  modal.classList.remove('hidden');

  // Calculate remaining macros and micronutrients for the selected day
  const current = computeTotalsForDate(state.selectedDate);
  const t = state.targets;
  const remCal = Math.max(0, Math.round(t.cal - current.cal));
  const remPro = Math.max(0, Math.round(t.pro - current.pro));
  const remFat = Math.max(0, Math.round(t.fat - current.fat));
  const remNetCarbs = Math.max(0, Math.round(t.netCarbs - current.netCarbs));

  // Identify micronutrients below 70% of their targets
  const lowMicros = MICRO_META
    .filter(m => !m.isCap && ((current.micros[m.key] || 0) / (t.micros[m.key] || 1)) < 0.7)
    .map(m => m.label);

  // Collect favorites and recent meals
  const favorites = Object.values(state.customFoods || {}).map(f => f.name.replace(/^★\s*/, ''));
  const recentHistory = [...new Set(state.loggedItems.map(i => i.name.replace(/^★\s*/, '')))].slice(-15);

  const prompt = `You are a precise nutrition assistant.
The user is planning their meal "${mealName}".
Remaining daily targets:
- Calories: ~${remCal} kcal
- Protein: ~${remPro}g
- Net carbs: ~${remNetCarbs}g
- Fat: ~${remFat}g
Micronutrients that are still low: ${lowMicros.length ? lowMicros.join(', ') : 'most targets are met'}.

User's favorites: ${favorites.length ? favorites.join(', ') : 'None saved'}.
Recently logged meals: ${recentHistory.join(', ')}.

Create exactly 2 to 3 specific meal suggestions for "${mealName}" that best fill the remaining gaps (especially protein and low micronutrients). Prefer meals or ingredients from favorites, or adjust their portion sizes.
Provide estimated nutrition for the entire suggested portion.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      suggestions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            whyItFits: { type: 'STRING' },
            estimatedGrams: { type: 'NUMBER' },
            cal: { type: 'NUMBER' },
            pro: { type: 'NUMBER' },
            carbs: { type: 'NUMBER' },
            fat: { type: 'NUMBER' },
            fiber: { type: 'NUMBER' },
            ingredients: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  grams: { type: 'NUMBER' }
                },
                required: ['name', 'grams']
              }
            }
          },
          required: ['name', 'whyItFits', 'estimatedGrams', 'cal', 'pro', 'carbs', 'fat', 'ingredients']
        }
      }
    },
    required: ['suggestions']
  };

  try {
    const rawRes = await callGeminiVisionApi(apiKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const parsed = JSON.parse(rawRes.candidates[0].content.parts[0].text);
    const suggestions = parsed.suggestions || [];

    if (suggestions.length === 0) {
      contentEl.innerHTML = `<p class="text-slate-400">No suitable suggestions were generated.</p>`;
      return;
    }

    // Keep suggestions available for one-click logging
    window._currentSuggestions = suggestions;
    window._currentMealTarget = mealName;

    contentEl.innerHTML = suggestions.map((s, idx) => `
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-bold text-white text-xs">${escapeHtml(s.name)}</div>
            <div class="text-[10px] text-emerald-400 font-semibold mt-0.5">
              ${Math.round(s.cal)} kcal · ${s.pro}g P · ${s.carbs}g C · ${s.fat}g F
            </div>
          </div>
          <button onclick="logSuggestedMeal(${idx})" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] px-2.5 py-1 rounded-lg shrink-0">
            + Log
          </button>
        </div>
        <p class="text-[10px] text-slate-300 bg-slate-900/70 rounded-lg p-2 leading-relaxed">
          💡 ${escapeHtml(s.whyItFits)}
        </p>
        <div class="text-[9px] text-slate-400">
          Ingredients: ${s.ingredients.map(i => `${escapeHtml(i.name)} (${i.grams}g)`).join(', ')}
        </div>
      </div>
    `).join('');

  } catch (err) {
    contentEl.innerHTML = `
      <div class="text-rose-400 text-xs p-2 bg-rose-500/10 rounded-xl border border-rose-500/30">
        Generation failed: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function logSuggestedMeal(idx) {
  const s = window._currentSuggestions?.[idx];
  const meal = window._currentMealTarget || 'Dinner';
  if (!s) return;

  const totalG = s.estimatedGrams || 200;
  // Convert nutrition values to a per-100 g basis
  const factor = 100 / totalG;

  state.loggedItems.push({
    id: Date.now() + Math.random(),
    date: state.selectedDate,
    createdAt: Date.now(),
    meal: meal,
    foodKey: null,
    isCustom: true,
    name: s.name,
    grams: totalG,
    baseGrams: totalG,
    ingredients: s.ingredients || [],
    nutrientsPer100g: {
      cal: Math.round(s.cal * factor),
      pro: Number((s.pro * factor).toFixed(1)),
      carbs: Number((s.carbs * factor).toFixed(1)),
      fiber: Number(((s.fiber || 0) * factor).toFixed(1)),
      fat: Number((s.fat * factor).toFixed(1)),
      sat: Number(((s.fat * 0.3) * factor).toFixed(1)),
      mono: 0, poly: 0,
      micros: {}
    }
  });

  saveState();
  renderApp();
  closeSuggestionModal();
  showToast(`Added to ${meal}!`);
}

function closeSuggestionModal() {
  document.getElementById('aiMealSuggestionModal').classList.add('hidden');
}

// =====================================================
// 7. AI REVIEW CLIENT

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toggleAiConsent(checked) {
  state.aiConsentGiven = Boolean(checked);
  saveState();
}

function buildAiPayload() {
  const periodInfo = getInsightsDateList();
  const currentStats = aggregatePeriodStats(periodInfo);

  const prevShift = periodInfo.mode === 'week' ? -7 : -30;
  const prevAnchor = addDays(state.insights.anchorDate, prevShift);
  const savedAnchor = state.insights.anchorDate;
  state.insights.anchorDate = prevAnchor;
  const prevStats = aggregatePeriodStats(getInsightsDateList());
  state.insights.anchorDate = savedAnchor;

  return {
    periodType: periodInfo.mode,
    periodLabel: periodInfo.label,
    elapsedDays: currentStats.elapsedDaysCount,
    nutritionTrackedDays: currentStats.trackedNutCount,
    sleepTrackedDays: currentStats.trackedSleepCount,
    targets: {
      calories: state.targets.cal,
      proteinG: state.targets.pro,
      fiberG: state.targets.fiber,
      fatG: state.targets.fat,
      satFatCapG: state.targets.satCap,
      sleepMinutes: state.targets.sleepMinutes
    },
    averages: {
      calories: currentStats.avgCal !== null ? Math.round(currentStats.avgCal) : null,
      proteinG: currentStats.avgPro !== null ? Math.round(currentStats.avgPro) : null,
      netCarbsG: currentStats.avgNetCarbs !== null ? Math.round(currentStats.avgNetCarbs) : null,
      fiberG: currentStats.avgFiber !== null ? Number(currentStats.avgFiber.toFixed(1)) : null,
      fatG: currentStats.avgFat !== null ? Math.round(currentStats.avgFat) : null,
      satFatG: currentStats.avgSat !== null ? Number(currentStats.avgSat.toFixed(1)) : null,
      microCoveragePct: currentStats.avgMicroCov,
      sleepMinutes: currentStats.avgSleepMin !== null ? Math.round(currentStats.avgSleepMin) : null
    },
    consistency: {
      proteinGoalHitDays: currentStats.proGoalHitDays,
      caloriesNearGoalDays: currentStats.calNearGoalDays,
      sleepRegularity: currentStats.sleepRegularityLabel,
      bedTimeSpreadMinutes: currentStats.bedTimeSpreadMin
    },
    micronutrientsEstimated: {
      consistentlyMet: currentStats.microBreakdown.filter(m => !m.isCap && m.pct !== null && m.pct >= 90).map(m => ({ name: m.label, pct: m.pct })),
      frequentlyLow: currentStats.microBreakdown.filter(m => !m.isCap && m.pct !== null && m.pct < 75).map(m => ({ name: m.label, pct: m.pct })),
      sodiumAvgPctOfCap: currentStats.microBreakdown.find(m => m.key === 'sodium_mg')?.pct ?? null
    },
    previousPeriodComparison: prevStats.trackedNutCount > 0 || prevStats.trackedSleepCount > 0 ? {
      nutritionTrackedDays: prevStats.trackedNutCount,
      avgCalories: prevStats.avgCal !== null ? Math.round(prevStats.avgCal) : null,
      avgProteinG: prevStats.avgPro !== null ? Math.round(prevStats.avgPro) : null,
      avgSleepMinutes: prevStats.avgSleepMin !== null ? Math.round(prevStats.avgSleepMin) : null
    } : null
  };
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  localStorage.setItem('nutritracker_gemini_key', key);
  showToast('API Key saved on device');
}

async function generateAiReview() {
  if (!state.aiConsentGiven) {
    showToast('Please confirm the data notice first');
    return;
  }

  const apiKey = (localStorage.getItem('nutritracker_gemini_key') || '').trim();
  if (!apiKey) {
    state.insights.aiError = 'No Gemini API Key found. Please enter your key in the Goals tab.';
    renderAiReviewState();
    return;
  }

  state.insights.aiLoading = true;
  state.insights.aiError = null;
  renderAiReviewState();

  const systemPrompt = `You are a factual, constructive nutrition and sleep analyst for NutriTracker.
Base every statement ONLY on the provided JSON payload. Never invent meals or sleep times.
If nutritionTrackedDays < 3 or sleepTrackedDays < 3, set "dataNotice" to a short note about limited data.
Keep each list to at most 3 concise bullet strings.`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      dataNotice: { type: 'STRING', nullable: true },
      wentWell: { type: 'ARRAY', items: { type: 'STRING' } },
      toImprove: { type: 'ARRAY', items: { type: 'STRING' } },
      dataShows: { type: 'ARRAY', items: { type: 'STRING' } },
      nextFocus: { type: 'STRING' }
    },
    required: ['wentWell', 'toImprove', 'dataShows', 'nextFocus']
  };

  try {
    const payload = buildAiPayload();
    const geminiJson = await callGeminiVisionApi(apiKey, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    const data = JSON.parse(rawText);

    state.insights.aiResult = {
      dataNotice: data.dataNotice || null,
      wentWell: (data.wentWell || []).slice(0, 3),
      toImprove: (data.toImprove || []).slice(0, 3),
      dataShows: (data.dataShows || []).slice(0, 3),
      nextFocus: data.nextFocus || ''
    };
  } catch (err) {
    state.insights.aiError = err.message || 'Failed to reach Gemini API';
  } finally {
    state.insights.aiLoading = false;
    renderAiReviewState();
  }
}

function renderAiReviewState() {
  const out = document.getElementById('aiReviewOutput');
  const btn = document.getElementById('generateAiBtn');
  if (!out || !btn) return;

  btn.disabled = state.insights.aiLoading;
  btn.textContent = state.insights.aiLoading ? 'Analyzing period data...' : 'Generate AI Review';

  if (state.insights.aiLoading) {
    out.innerHTML = `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400">Generating structured review from aggregated stats...</div>`;
    return;
  }

  if (state.insights.aiError) {
    out.innerHTML = `
      <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-2">
        <div class="font-bold text-rose-300">AI Review Error</div>
        <p class="text-[11px] text-slate-300 leading-relaxed">
          ${escapeHtml(state.insights.aiError)}
        </p>
        <button onclick="generateAiReview()" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-[11px] px-3 py-1 rounded-lg">Retry</button>
      </div>
    `;
    return;
  }

  const r = state.insights.aiResult;
  if (!r) {
    out.innerHTML = '';
    return;
  }

  const renderBullets = (items) => items.map(i => `<li class="text-slate-300 leading-relaxed">• ${escapeHtml(i)}</li>`).join('');

  out.innerHTML = `
    <div class="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
      ${r.dataNotice ? `<div class="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">${escapeHtml(r.dataNotice)}</div>` : ''}
      <div>
        <h4 class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">What went well?</h4>
        <ul class="space-y-1 text-[11px]">${renderBullets(r.wentWell)}</ul>
      </div>
      <div>
        <h4 class="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">What could be improved?</h4>
        <ul class="space-y-1 text-[11px]">${renderBullets(r.toImprove)}</ul>
      </div>
      <div>
        <h4 class="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-1">What does the data show?</h4>
        <ul class="space-y-1 text-[11px]">${renderBullets(r.dataShows)}</ul>
      </div>
      <div class="pt-2 border-t border-slate-800">
        <h4 class="text-[11px] font-bold uppercase tracking-wider text-white mb-1">One focus for next week</h4>
        <p class="text-xs font-semibold text-emerald-300 leading-relaxed">${escapeHtml(r.nextFocus)}</p>
      </div>
    </div>
  `;
}
