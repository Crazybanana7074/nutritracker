// =====================================================
// 4. RENDER UI
// =====================================================
function toggleMergeMode(mealName) {
  if (activeMergeMeal === mealName) {
    activeMergeMeal = null;
    selectedMergeIds.clear();
  } else {
    activeMergeMeal = mealName;
    selectedMergeIds.clear();
  }
  renderApp();
}

function toggleItemForMerge(id) {
  if (selectedMergeIds.has(id)) {
    selectedMergeIds.delete(id);
  } else {
    selectedMergeIds.add(id);
  }
  renderApp();
}

function submitMerge() {
  if (selectedMergeIds.size < 2) {
    showToast('Select at least 2 entries');
    return;
  }
  const defaultTitle = state.loggedItems
    .filter(i => selectedMergeIds.has(i.id))
    .map(i => i.name.replace(/^★\s*/, ''))
    .join(' with ');

  const name = prompt('Name for the combined meal:', defaultTitle);
  if (name !== null && name.trim() !== '') {
    const ids = Array.from(selectedMergeIds);
    activeMergeMeal = null;
    selectedMergeIds.clear();
    mergeSelectedItems(ids, name.trim());
  }
}

function mergeSelectedItems(itemIds, customName) {
  const itemsToMerge = state.loggedItems.filter(i => itemIds.includes(i.id));
  if (itemsToMerge.length < 2) return;

  const totalGrams = itemsToMerge.reduce((sum, item) => sum + (Number(item.grams) || 0), 0);
  if (totalGrams <= 0) return;

  let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFiber = 0;
  let totalFat = 0, totalSat = 0, totalMono = 0, totalPoly = 0;
  
  const totalMicros = {};
  MICRO_META.forEach(m => totalMicros[m.key] = 0);

  const combinedIngredients = [];

  itemsToMerge.forEach(item => {
    const f = getNutrientProfile(item);
    if (!f) return;

    const scale = f.isSupplement ? (item.grams || 1) : (item.grams / 100.0);
    const itemCal = f.cal * scale;
    const itemPro = f.pro * scale;
    const itemCarbs = f.carbs * scale;
    const itemFat = f.fat * scale;

    totalCal += itemCal;
    totalPro += itemPro;
    totalCarbs += itemCarbs;
    totalFiber += (f.fiber || 0) * scale;
    totalFat += itemFat;
    totalSat += (f.sat || 0) * scale;
    totalMono += (f.mono || 0) * scale;
    totalPoly += (f.poly || 0) * scale;

    MICRO_META.forEach(m => {
      totalMicros[m.key] += (f.micros[m.key] || 0) * scale;
    });

    if (item.isCustom && Array.isArray(item.ingredients) && item.ingredients.length > 0) {
      const origScale = item.grams / (item.baseGrams || item.grams || 1);
      item.ingredients.forEach(sub => {
        combinedIngredients.push({
          name: sub.name,
          grams: Math.round(sub.grams * origScale),
          cal: Math.round((sub.cal || 0) * origScale),
          pro: Number(((sub.pro || 0) * origScale).toFixed(1)),
          carbs: Number(((sub.carbs || 0) * origScale).toFixed(1)),
          fat: Number(((sub.fat || 0) * origScale).toFixed(1))
        });
      });
    } else {
      combinedIngredients.push({
        name: item.name.replace(/^★\s*/, ''),
        grams: Math.round(item.grams),
        cal: Math.round(itemCal),
        pro: Number(itemPro.toFixed(1)),
        carbs: Number(itemCarbs.toFixed(1)),
        fat: Number(itemFat.toFixed(1))
      });
    }
  });

  const factor = 100 / totalGrams;
  const mergedMicros = {};
  MICRO_META.forEach(m => {
    mergedMicros[m.key] = Number((totalMicros[m.key] * factor).toFixed(2));
  });

  const first = itemsToMerge[0];
  const mergedDish = {
    id: Date.now() + Math.random(),
    date: first.date,
    createdAt: Date.now(),
    meal: first.meal,
    foodKey: null,
    isCustom: true,
    isSupplement: false,
    name: customName,
    grams: Math.round(totalGrams),
    baseGrams: Math.round(totalGrams),
    ingredients: combinedIngredients,
    nutrientsPer100g: {
      cal: Math.round(totalCal * factor),
      pro: Number((totalPro * factor).toFixed(1)),
      carbs: Number((totalCarbs * factor).toFixed(1)),
      fiber: Number((totalFiber * factor).toFixed(1)),
      fat: Number((totalFat * factor).toFixed(1)),
      sat: Number((totalSat * factor).toFixed(1)),
      mono: Number((totalMono * factor).toFixed(1)),
      poly: Number((totalPoly * factor).toFixed(1)),
      micros: mergedMicros
    }
  };

  state.loggedItems = state.loggedItems.filter(i => !itemIds.includes(i.id));
  state.loggedItems.push(mergedDish);

  saveState();
  renderApp();
  showToast('Meals combined!');
}
  
  function renderApp() {
  const today = getLocalDateStr();
  const isToday = state.selectedDate === today;

  document.getElementById('activeDateLabel').textContent = formatHumanDate(state.selectedDate);
  document.getElementById('jumpTodayBtn').classList.toggle('hidden', isToday);
  const nextDayBtn = document.getElementById('nextDayBtn');
  nextDayBtn.disabled = isToday;
  nextDayBtn.className = isToday
    ? 'text-slate-700 px-2 py-1 text-xs font-bold rounded-lg bg-slate-950/40 border border-slate-800/40 cursor-not-allowed'
    : 'text-slate-400 hover:text-white px-2 py-1 text-xs font-bold rounded-lg bg-slate-950 border border-slate-800';

  document.getElementById('migrationBanner').classList.toggle('hidden', !state.migrationNoticePending);
  document.getElementById('dayLogHeading').textContent = isToday ? "Today's Log" : `Log · ${state.selectedDate}`;

  const logged = computeTotalsForDate(state.selectedDate);
  const t = state.targets;

  const calRem = t.cal - logged.cal;
  const calRatio = Math.min(1, logged.cal / t.cal);
  const circumference = 263.89;
  const arc = document.getElementById('calRingArc');
  arc.style.strokeDashoffset = circumference - (calRatio * circumference);
  const calColor = getStatusColor(logged.cal, t.cal, true);
  arc.style.stroke = calColor.hex;

  document.getElementById('calRemainingHero').textContent =
    calRem >= 0 ? Math.round(calRem) : `+${Math.abs(Math.round(calRem))}`;
  document.getElementById('calRemainingLabel').textContent =
    calRem >= 0 ? 'kcal left' : 'kcal over';
  document.getElementById('calTargetText').textContent = `${Math.round(t.cal)} kcal`;
  document.getElementById('calLoggedText').textContent = `${Math.round(logged.cal)} kcal`;
  document.getElementById('microSummaryBadge').textContent = `${logged.microHitCount}/18`;

  const primaryMacros = [
    { label: 'Protein', val: logged.pro, goal: t.pro },
    { label: 'Net Carbs', val: logged.netCarbs, goal: t.netCarbs },
    { label: 'Fat', val: logged.fat, goal: t.fat }
  ];
  document.getElementById('primaryMacroGrid').innerHTML = primaryMacros.map(m => {
    const rem = m.goal - m.val;
    const pct = Math.min(100, Math.round((m.val / m.goal) * 100));
    const col = getStatusColor(m.val, m.goal, false);
    return `
      <div class="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5">
        <div class="flex justify-between items-center text-[11px]">
          <span class="font-bold text-slate-200">${m.label}</span>
          <span class="text-[10px] text-slate-400">${Math.round(m.val)}/${m.goal}g</span>
        </div>
        <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden my-1.5">
          <div class="h-full ${col.bgClass}" style="width:${pct}%"></div>
        </div>
        <div class="text-[10px] font-bold ${col.textClass}">
          ${rem >= 0 ? `${Math.round(rem)}g left` : `${Math.abs(Math.round(rem))}g over`}
        </div>
      </div>
    `;
  }).join('');

  const subMacros = [
    { label: 'Total Carbs', val: logged.carbs, goal: t.carbs, isCap: false },
    { label: 'Fiber', val: logged.fiber, goal: t.fiber, isCap: false },
    { label: 'Saturated Fat', val: logged.sat, goal: t.satCap, isCap: true },
    { label: 'Monounsaturated', val: logged.mono, goal: t.mono, isCap: false },
    { label: 'Polyunsaturated', val: logged.poly, goal: t.poly, isCap: false }
  ];
  document.getElementById('subMacroDrawer').innerHTML = subMacros.map(m => {
    const rem = m.goal - m.val;
    const pct = Math.min(100, Math.round((m.val / m.goal) * 100));
    const col = getStatusColor(m.val, m.goal, m.isCap);
    return `
      <div class="space-y-1">
        <div class="flex justify-between text-[11px]">
          <span class="text-slate-300">${m.label}</span>
          <span class="${col.textClass} font-semibold">
            ${m.val.toFixed(1)}/${m.goal}g (${rem >= 0 ? `${rem.toFixed(1)}g left` : `${Math.abs(rem).toFixed(1)}g over`})
          </span>
        </div>
        <div class="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
          <div class="h-full ${col.bgClass}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  renderSleepCard();

  const dayItems = getItemsForDate(state.selectedDate);
  const mealContainer = document.getElementById('loggedMealsContainer');
  const clearBtn = document.getElementById('clearAllBtn');
  clearBtn.classList.toggle('hidden', dayItems.length === 0);

if (dayItems.length === 0) {
    mealContainer.innerHTML = `
      <div class="text-center py-5">
        <p class="text-xs text-slate-500">No food logged on ${state.selectedDate}</p>
      </div>`;
  } else {
const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    mealContainer.innerHTML = mealOrder.map(mealName => {
      const groupItems = dayItems.filter(i => i.meal === mealName);
      if (groupItems.length === 0) return '';

      let groupCal = 0;
      let groupPro = 0;
      const isMergeActive = activeMergeMeal === mealName;

      const itemsHtml = groupItems.map(item => {
        const f = getNutrientProfile(item);
        if (!f) return '';

        const kcal = Math.round((f.cal * item.grams) / (item.isSupplement ? 1 : 100));
        const pro = ((f.pro * item.grams) / (item.isSupplement ? 1 : 100)).toFixed(1);
        groupCal += kcal;
        groupPro += Number(pro);

        const isCustom = Boolean(item.isCustom);
        const isFav = Boolean(getFavoriteKeyByName(item.name));
        const isSupp = Boolean(item.isSupplement);
        const isChecked = selectedMergeIds.has(item.id);

        let ingredientHtml = '';
        if (isCustom && Array.isArray(item.ingredients) && item.ingredients.length > 0) {
          const scale = item.grams / (item.baseGrams || item.grams || 1);
          ingredientHtml = `
            <div class="text-[10px] text-slate-400 pl-2 border-l-2 border-emerald-500/50 mt-1">
              <span class="text-slate-300 font-semibold">Ingredients: </span>
              ${item.ingredients.map(ing => `${escapeHtml(ing.name)} (${Math.round(ing.grams * scale)}g)`).join(', ')}
            </div>`;
        }

        const favBtnHtml = `
          <button onclick="toggleFavorite(${item.id})" 
            title="${isFav ? 'Remove from favorites' : 'Add to favorites'}" 
            class="${isFav ? 'text-amber-400 scale-110' : 'text-slate-500 hover:text-amber-300'} text-sm px-1 transition-transform">
            ${isFav ? '★' : '☆'}
          </button>
        `;

        let amountControlHtml = '';
        if (isSupp) {
          amountControlHtml = `
            <div class="flex items-center justify-between pt-1">
              <span class="text-[11px] text-slate-400">Dose:</span>
              <div class="flex items-center gap-2">
                <button onclick="updateLoggedGrams(${item.id}, Math.max(1, ${item.grams} - 1))" class="w-6 h-6 bg-slate-900 border border-slate-800 rounded text-xs text-white">-</button>
                <span class="text-xs font-bold text-emerald-400">${item.grams}x capsule/tablet</span>
                <button onclick="updateLoggedGrams(${item.id}, ${item.grams} + 1)" class="w-6 h-6 bg-slate-900 border border-slate-800 rounded text-xs text-white">+</button>
              </div>
            </div>
          `;
        } else {
          amountControlHtml = `
            <div class="flex items-center gap-2 pt-0.5">
              <input type="range" min="1" max="${Math.max(650, item.grams * 2)}" step="1" value="${item.grams}"
                oninput="updateLoggedGrams(${item.id}, this.value)" class="flex-1" />
              <div class="flex items-center gap-1 shrink-0">
                <input type="number" min="1" max="5000" value="${item.grams}"
                  onchange="updateLoggedGrams(${item.id}, this.value)"
                  class="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-right font-bold text-white outline-none focus:border-emerald-500" />
                <span class="text-[11px] text-slate-400">g ·</span>
                <span class="text-[11px] text-slate-200 font-semibold w-14 text-right">${kcal} kcal</span>
              </div>
            </div>
          `;
        }

        const checkboxHtml = isMergeActive ? `
          <input type="checkbox" onchange="toggleItemForMerge(${item.id})" ${isChecked ? 'checked' : ''} class="w-4 h-4 accent-emerald-500 rounded cursor-pointer mr-2 shrink-0" />
        ` : '';

        return `
          <div class="bg-slate-950 border ${isChecked ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-800/80'} rounded-xl p-2.5 space-y-1.5 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 flex-wrap">
                ${checkboxHtml}
                <span class="text-xs font-bold text-white">${escapeHtml(f.name)}</span>
                ${item.needsReview ? '<span class="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">Needs review</span>' : (isCustom && !isSupp ? '<span class="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">AI-created meal</span>' : '')}
                ${isSupp ? '<span class="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">Supplement</span>' : ''}
              </div>
              <div class="flex items-center gap-1">
                <select onchange="updateLoggedMeal(${item.id}, this.value)" class="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-semibold rounded-lg px-1.5 py-0.5 outline-none cursor-pointer">
                  <option value="Breakfast" ${item.meal === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
                  <option value="Lunch" ${item.meal === 'Lunch' ? 'selected' : ''}>Lunch</option>
                  <option value="Dinner" ${item.meal === 'Dinner' ? 'selected' : ''}>Dinner</option>
                  <option value="Snack" ${item.meal === 'Snack' ? 'selected' : ''}>Snack</option>
                </select>
                ${favBtnHtml}
                <button onclick="removeLoggedItem(${item.id})" class="text-slate-500 hover:text-rose-400 text-xs px-1">✕</button>
              </div>
            </div>
            ${ingredientHtml}
            ${amountControlHtml}
          </div>`;
      }).join('');

      return `
        <div class="space-y-1.5 pt-2 first:pt-0">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">${mealName}</span>
              ${groupItems.length >= 2 ? `
                <button onclick="toggleMergeMode('${mealName}')" class="text-[10px] ${isMergeActive ? 'text-amber-300 bg-amber-500/20 border-amber-500/40' : 'text-slate-400 bg-slate-950 hover:text-white border-slate-800'} border px-1.5 py-0.5 rounded">
                  ${isMergeActive ? 'Cancel' : '🔗 Combine'}
                </button>
              ` : ''}
              <button onclick="requestAiMealSuggestion('${mealName}')" class="text-[10px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>✨</span><span>Suggestion</span>
              </button>
            </div>
            <span class="text-[11px] font-semibold text-slate-400">${groupCal} kcal · ${groupPro.toFixed(1)}g P</span>
          </div>
          ${itemsHtml}
          ${isMergeActive && selectedMergeIds.size >= 2 ? `
            <div class="pt-1">
              <button onclick="submitMerge()" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition shadow-lg">
                ${selectedMergeIds.size} entries into one meal
              </button>
            </div>
          ` : ''}
        </div>`;
    }).join('');


  }
    renderMicrosTab(logged);
  if (state.activeTab === 'insights') renderInsightsTab();
}

function renderMicrosTab(logged) {
  const t = state.targets.micros;
  const filtered = MICRO_META.filter(m => {
    if (state.microFilter === 'mineral') return m.cat === 'mineral';
    if (state.microFilter === 'vitamin') return m.cat === 'vitamin';
    if (state.microFilter === 'low') {
      const val = logged.micros[m.key] || 0;
      const goal = t[m.key] || 1;
      return m.isCap ? val > goal : (val / goal) < 0.75;
    }
    return true;
  });

  document.getElementById('microListContainer').innerHTML = filtered.map(m => {
    const val = logged.micros[m.key] || 0;
    const goal = t[m.key] || 1;
    const rem = goal - val;
    const pct = Math.min(100, Math.round((val / goal) * 100));
    const col = getStatusColor(val, goal, m.isCap);

    return `
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-white">${m.label}</span>
          <span class="text-xs font-bold ${col.textClass}">
            ${rem >= 0 ? `${rem.toFixed(1)} ${m.unit} left` : `${Math.abs(rem).toFixed(1)} ${m.unit} over`}
          </span>
        </div>
        <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-1">
          <div class="h-full ${col.bgClass}" style="width:${pct}%"></div>
        </div>
        <div class="flex justify-between text-[10px] text-slate-400">
          <span>${val.toFixed(1)} / ${goal} ${m.unit}</span>
          <span>${pct}%</span>
        </div>
      </div>
    `;
  }).join('');
}

function updateLoggedMeal(id, newMeal) {
  const item = state.loggedItems.find(i => i.id === id);
  if (item) {
    item.meal = newMeal;
    saveState();
    renderApp();
    showToast(`Moved to ${newMeal}`);
  }
}

function updateLoggedGrams(id, val) {
  const item = state.loggedItems.find(i => i.id === id);
  if (item) {
    item.grams = Number(val);
    saveState();
    renderApp();
  }
}

function removeLoggedItem(id) {
  state.loggedItems = state.loggedItems.filter(i => i.id !== id);
  saveState();
  renderApp();
}

function clearAllMeals() {
  const count = getItemsForDate(state.selectedDate).length;
  if (count === 0) return;
  if (!window.confirm(`Delete all ${count} food entries for ${state.selectedDate}?`)) return;
  state.loggedItems = state.loggedItems.filter(item => item.date !== state.selectedDate);
  saveState();
  renderApp();
  showToast(`Cleared ${state.selectedDate}`);
}

function toggleSubMacros() {
  state.subMacrosOpen = !state.subMacrosOpen;
  document.getElementById('subMacroDrawer').classList.toggle('hidden', !state.subMacrosOpen);
  document.getElementById('subMacroChevron').style.transform = state.subMacrosOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function setMicroFilter(filter) {
  state.microFilter = filter;
  ['all', 'mineral', 'vitamin', 'low'].forEach(k => {
    const btn = document.getElementById(`filter-${k}`);
    btn.className = k === filter
      ? 'bg-emerald-500 text-slate-950 font-bold text-xs py-1.5 rounded-lg'
      : 'text-slate-400 font-semibold text-xs py-1.5 rounded-lg';
  });
  renderApp();
}

function switchTab(tab) {
  state.activeTab = tab;
  ['today', 'insights', 'add', 'micros', 'goals'].forEach(t => {
    const sec = document.getElementById(`tab-${t}`);
    if (sec) sec.classList.toggle('hidden', t !== tab);
    const navBtn = document.getElementById(`nav-${t}`);
    if (navBtn) {
      navBtn.className = t === tab
        ? 'flex flex-col items-center justify-center py-1 rounded-xl text-emerald-400'
        : 'flex flex-col items-center justify-center py-1 rounded-xl text-slate-400';
    }
  });
  if (tab === 'insights') renderInsightsTab();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(msg) {
  const banner = document.getElementById('toastBanner');
  banner.textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 1600);
}
