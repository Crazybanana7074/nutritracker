// =====================================================
// 6. GOALS & SETTINGS
// =====================================================
function recalculateTargets() {
  const sex = document.getElementById('bioSex').value;
  const age = Number(document.getElementById('bioAge').value) || 18;
  const height = Number(document.getElementById('bioHeight').value) || 178;
  const weight = Number(document.getElementById('bioWeight').value) || 78.5;
  const activity = Number(document.getElementById('bioActivity').value) || 1.55;
  const goalDelta = Number(document.getElementById('bioGoal').value) || 0;

  state.profile = { sex, age, height, weight, activity, goalDelta };

  const s = sex === 'male' ? 5 : -161;
  const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + s);
  const tdee = Math.round(bmr * activity);
  const targetCal = Math.max(1400, tdee + goalDelta);

  const pro = Math.round(weight * 2.1);
  const fat = Math.round((targetCal * 0.27) / 9);
  const carbs = Math.max(80, Math.round((targetCal - (pro * 4) - (fat * 9)) / 4));
  const fiber = sex === 'male' ? 38 : 26;

  state.targets.cal = targetCal;
  state.targets.pro = pro;
  state.targets.fat = fat;
  state.targets.carbs = carbs;
  state.targets.fiber = fiber;
  state.targets.netCarbs = Math.max(50, carbs - fiber);
  state.targets.satCap = Math.round((targetCal * 0.08) / 9);

  document.getElementById('bioSummaryBox').innerHTML = `
    <div class="bg-slate-900 p-2.5 rounded-lg"><span class="text-slate-400 block text-[10px]">BMR</span><strong class="text-white">${bmr} kcal</strong></div>
    <div class="bg-slate-900 p-2.5 rounded-lg"><span class="text-slate-400 block text-[10px]">Target</span><strong class="text-emerald-400">${targetCal} kcal</strong></div>
    <div class="bg-slate-900 p-2.5 rounded-lg"><span class="text-slate-400 block text-[10px]">Protein</span><strong class="text-white">${pro}g</strong></div>
    <div class="bg-slate-900 p-2.5 rounded-lg"><span class="text-slate-400 block text-[10px]">Net Carbs / Fat</span><strong class="text-white">${state.targets.netCarbs}g / ${fat}g</strong></div>
  `;

  saveState();
  renderApp();
}
