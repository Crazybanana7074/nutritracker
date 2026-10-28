// =====================================================
// 5. ADD FOOD (SEARCH, QUICK TAP & SMART PHOTO SCAN)
// =====================================================
function renderQuickFoods() {
  const q = (document.getElementById('quickFilterInput')?.value || '').toLowerCase().trim();
  const listEl = document.getElementById('quickFoodList');
  if (!listEl) return;

  // Collect favorites from customFoods
  const favItems = Object.entries(state.customFoods || {}).map(([key, f]) => {
    const defaultG = f.defaultG || 100;
    const kcal = Math.round((f.cal * defaultG) / 100);
    const pro = ((f.pro * defaultG) / 100).toFixed(1);
    return {
      type: 'favorite',
      key,
      name: f.name.replace(/^★\s*/, ''),
      grams: defaultG,
      kcal,
      pro,
      isSupp: Boolean(f.isSupplement)
    };
  });

  // Build deduplicated history from logged items, newest first
  const historyItems = [];
  const seenNames = new Set(favItems.map(f => f.name.toLowerCase()));

  for (let i = state.loggedItems.length - 1; i >= 0; i--) {
    const item = state.loggedItems[i];
    const cleanName = item.name.replace(/^★\s*/, '').trim();
    const cleanLower = cleanName.toLowerCase();

    if (!seenNames.has(cleanLower)) {
      seenNames.add(cleanLower);
      const f = getNutrientProfile(item);
      const isSupp = Boolean(item.isSupplement);
      const kcal = f ? Math.round((f.cal * item.grams) / (isSupp ? 1 : 100)) : 0;
      const pro = f ? ((f.pro * item.grams) / (isSupp ? 1 : 100)).toFixed(1) : '0.0';

      historyItems.push({
        type: 'history',
        sourceId: item.id,
        name: cleanName,
        grams: item.grams,
        kcal,
        pro,
        isSupp
      });
    }
  }

  // Combine and filter results
  let combined = [...favItems, ...historyItems];
  if (q) {
    combined = combined.filter(item => item.name.toLowerCase().includes(q));
  }

  if (combined.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-6 text-xs text-slate-500">
        ${q ? 'No matching favorites or history entries found.' : 'No favorites or history entries yet.'}
      </div>`;
    return;
  }

  listEl.innerHTML = combined.map(item => {
    const isFav = item.type === 'favorite';
    return `
      <div class="flex items-center justify-between bg-slate-950 border ${isFav ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800/80'} rounded-xl px-3 py-2">
        <div class="flex-1 pr-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-bold ${isFav ? 'text-amber-300' : 'text-white'}">${escapeHtml(item.name)}</span>
            <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded ${isFav ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 bg-slate-800'}">
              ${isFav ? '★ Favorite' : '🕒 History'}
            </span>
            ${item.isSupp ? '<span class="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded">Supplement</span>' : ''}
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5">
            ${item.grams}${item.isSupp ? ' capsule(s)' : 'g'} · ${item.kcal} kcal · ${item.pro}g P
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${isFav ? `
            <button onclick="deleteFavorite('${item.key}')" title="Delete favorite" class="text-slate-500 hover:text-rose-400 text-xs p-1">
              ✕
            </button>
            <button onclick="quickLogFavorite('${item.key}')" class="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs px-2.5 py-1 rounded-lg">
              + Add
            </button>
          ` : `
            <button onclick="quickLogFromHistory(${item.sourceId})" class="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs px-2.5 py-1 rounded-lg">
              + Add
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function quickLogFavorite(key) {
  const f = state.customFoods[key] || USDA_DB[key];
  if (!f) return;
  const meal = document.getElementById('mealTypeSelect').value;

  state.loggedItems.push({
    id: Date.now() + Math.random(),
    date: state.selectedDate,
    createdAt: Date.now(),
    meal,
    foodKey: key,
    isCustom: true,
    isSupplement: Boolean(f.isSupplement),
    name: f.name.replace(/^★\s*/, ''),
    grams: f.defaultG || 100,
    baseGrams: f.defaultG || 100,
    ingredients: [],
    nutrientsPer100g: {
      cal: f.cal, pro: f.pro, carbs: f.carbs, fiber: f.fiber || 0,
      fat: f.fat, sat: f.sat || 0, mono: f.mono || 0, poly: f.poly || 0,
      micros: f.micros || {}
    }
  });

  saveState();
  renderApp();
  renderQuickFoods();
  showToast(`Added to ${meal}`);
}

function quickLogFromHistory(sourceId) {
  const src = state.loggedItems.find(i => i.id === sourceId);
  if (!src) return;
  const meal = document.getElementById('mealTypeSelect').value;

  state.loggedItems.push({
    id: Date.now() + Math.random(),
    date: state.selectedDate,
    createdAt: Date.now(),
    meal,
    foodKey: src.foodKey || null,
    isCustom: Boolean(src.isCustom),
    isSupplement: Boolean(src.isSupplement),
    name: src.name.replace(/^★\s*/, ''),
    grams: src.grams,
    baseGrams: src.baseGrams || src.grams,
    ingredients: src.ingredients ? JSON.parse(JSON.stringify(src.ingredients)) : [],
    nutrientsPer100g: src.nutrientsPer100g ? JSON.parse(JSON.stringify(src.nutrientsPer100g)) : null
  });

  saveState();
  renderApp();
  renderQuickFoods();
  showToast(`Added to ${meal}`);
}

let html5QrScanner = null;

async function toggleBarcodeScanner() {
  const box = document.getElementById('barcodeReaderBox');
  if (!box.classList.contains('hidden')) {
    if (html5QrScanner) await html5QrScanner.stop();
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  html5QrScanner = new Html5Qrcode('barcodeReaderBox');
  html5QrScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 240, height: 120 } },
    async (barcode) => {
      await html5QrScanner.stop();
      box.classList.add('hidden');
      fetchOpenFoodFacts(barcode);
    },
    () => {}
  ).catch(err => {
    box.classList.add('hidden');
    showToast('Camera access failed');
  });
}

async function fetchOpenFoodFacts(barcode) {
  showToast(`Searching barcode ${barcode}...`);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      showToast('Product not found in OpenFoodFacts');
      return;
    }
    const p = data.product;
    const n = p.nutriments || {};
    const micros = {};
    MICRO_META.forEach(m => micros[m.key] = 0);
    // Map key micronutrients from OpenFoodFacts (convert g to mg)
    if (n.sodium_100g) micros.sodium_mg = n.sodium_100g * 1000;
    if (n.potassium_100g) micros.potassium_mg = n.potassium_100g * 1000;
    if (n.calcium_100g) micros.calcium_mg = n.calcium_100g * 1000;
    if (n.magnesium_100g) micros.magnesium_mg = n.magnesium_100g * 1000;
    if (n.iron_100g) micros.iron_mg = n.iron_100g * 1000;

    state.draftItems.push({
      foodKey: null,
      isCustom: true,
      name: p.product_name_en || p.product_name || p.product_name_de || `Product (${barcode})`,
      grams: 100,
      baseGrams: 100,
      ingredients: [],
      nutrientsPer100g: {
        cal: Number(n['energy-kcal_100g']) || 0,
        pro: Number(n.proteins_100g) || 0,
        carbs: Number(n.carbohydrates_100g) || 0,
        fiber: Number(n.fiber_100g) || 0,
        fat: Number(n.fat_100g) || 0,
        sat: Number(n['saturated-fat_100g']) || 0,
        mono: 0, poly: 0,
        micros
      }
    });
    renderDraftItems();
    showToast('Product found!');
  } catch (e) {
    showToast('Could not retrieve barcode information');
  }
}
  


const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

function syncPhotoHint(val) {
  const h1 = document.getElementById('photoHintInput');
  const h2 = document.getElementById('photoScanHintCard');
  if (h1 && h1.value !== val) h1.value = val;
  if (h2 && h2.value !== val) h2.value = val;
}

function getPhotoHint() {
  const h1 = document.getElementById('photoHintInput')?.value?.trim() || '';
  const h2 = document.getElementById('photoScanHintCard')?.value?.trim() || '';
  return h2 || h1 || '';
}

function setPhotoStatusHtml(html) {
  const box = document.getElementById('photoScanStatus');
  if (box) box.innerHTML = html;
}

function compressAndEncodeImage(file, maxDim = 1024, quality = 0.82) {
  return new Promise(async (resolve, reject) => {
    try {
      let targetBlob = file;
      const fileType = (file.type || '').toLowerCase();
      const fileName = (file.name || '').toLowerCase();
      const isHeic = fileType.includes('heic') || fileType.includes('heif') || fileName.endsWith('.heic') || fileName.endsWith('.heif');

      if (isHeic) {
        if (typeof heic2any === 'undefined') {
          reject(new Error('HEIC converter not loaded. Please check your internet connection.'));
          return;
        }

        setPhotoStatusHtml(`
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2 text-slate-300">
            <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Preparing HEIC image…</span>
          </div>
        `);

        const conversionPromise = heic2any({ blob: file, toType: 'image/jpeg', quality: 0.7 });
        const timeoutPromise = new Promise((_, rej) => 
          setTimeout(() => rej(new Error('HEIC conversion timed out. Please save the image as a JPEG.')), 9000)
        );
        const converted = await Promise.race([conversionPromise, timeoutPromise]);
        targetBlob = Array.isArray(converted) ? converted[0] : converted;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the image file.'));
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const img = new Image();
        img.onerror = () => reject(new Error('The browser could not decode this image format.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const outMime = 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outMime, quality);
          const base64Data = compressedDataUrl.split(',')[1];
          
          if (!base64Data) {
            reject(new Error('Base64 encoding failed.'));
            return;
          }

          resolve({
            previewUrl: dataUrl,
            base64Data,
            mimeType: outMime
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(targetBlob);
    } catch (err) {
      reject(err);
    }
  });
}

async function handlePhotoFileSelected(e) {
  const inputEl = e.target;
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  inputEl.value = '';

  const previewCard = document.getElementById('photoPreviewCard');
  const imgEl = document.getElementById('scannedImageEl');

  const fileType = (file.type || '').toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.includes(fileType)) {
    previewCard.classList.remove('hidden');
    imgEl.src = '';
    currentScanImage = null;
    state.draftItems = [];
    renderDraftItems();
    setPhotoStatusHtml(`
      <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-rose-300">
        <strong>Unsupported format (${escapeHtml(fileType || 'unknown')}).</strong><br/>
        Please use JPEG, PNG, or WebP.
      </div>
    `);
    return;
  }

  try {
    const encoded = await compressAndEncodeImage(file, 1024, 0.82);
    currentScanImage = encoded;
    imgEl.src = encoded.previewUrl;
    previewCard.classList.remove('hidden');

    const existingHint = getPhotoHint();
    syncPhotoHint(existingHint);

    // Run AI scan immediately
    await runPhotoScanWithCurrentSettings();
  } catch (err) {
    previewCard.classList.remove('hidden');
    imgEl.src = '';
    currentScanImage = null;
    setPhotoStatusHtml(`
      <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-rose-300">
        <strong>Image import failed:</strong> ${escapeHtml(err.message)}
      </div>
    `);
  }
}
