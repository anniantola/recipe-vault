const DB_NAME = 'recipe-vault-db';
const DB_VERSION = 1;
const APP_VERSION = 1;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const UNITS = [
  'kg','g','mg','l','dl','cl','ml','tbsp','tablespoon','tablespoons','tsp','teaspoon','teaspoons',
  'cup','cups','oz','ounce','ounces','lb','lbs','pound','pounds','pinch','pinches','can','cans','tin','tins',
  'package','packages','packet','packets','slice','slices','clove','cloves','bunch','bunches','piece','pieces'
];
const PREP_WORDS = new Set([
  'fresh','freshly','chopped','finely','roughly','diced','sliced','minced','crushed','grated','shredded','peeled',
  'seeded','divided','melted','softened','room','temperature','optional','to','taste','for','serving','garnish',
  'small','medium','large','extra','virgin','drained','rinsed','cooked','uncooked','boneless','skinless','ground'
]);
const SYNONYMS = [
  [['scallion','scallions','spring onion','spring onions','green onion','green onions'],'spring onion'],
  [['bell pepper','bell peppers','capsicum','capsicums'],'bell pepper'],
  [['aubergine','aubergines','eggplant','eggplants'],'eggplant'],
  [['courgette','courgettes','zucchini','zucchinis'],'zucchini'],
  [['coriander','cilantro'],'cilantro'],
  [['caster sugar','superfine sugar'],'sugar'],
  [['icing sugar','powdered sugar','confectioners sugar','confectioner sugar'],'powdered sugar'],
  [['plain flour','all purpose flour','all-purpose flour'],'flour'],
  [['minced beef','ground beef','beef mince'],'ground beef'],
  [['minced pork','ground pork','pork mince'],'ground pork'],
  [['double cream','heavy cream','heavy whipping cream'],'heavy cream'],
  [['single cream','light cream'],'light cream'],
  [['parmesan cheese','parmigiano reggiano','parmigiano-reggiano'],'parmesan'],
  [['chickpeas','garbanzo beans','garbanzo'],'chickpea'],
  [['kidney beans','red kidney beans'],'kidney bean'],
  [['tomatoes','tomato'],'tomato'],
  [['potatoes','potato'],'potato']
];

const CATEGORY_RULES = [
  ['Dessert', ['cake','cookie','cookies','brownie','brownies','dessert','pudding','tart','cheesecake','ice cream']],
  ['Baking', ['bread','bun','buns','dough','bake','baked','muffin','muffins','scone','scones']],
  ['Breakfast', ['breakfast','oatmeal','porridge','pancake','pancakes','omelette','omelet','granola']],
  ['Soup', ['soup','broth','bisque','stew']],
  ['Pasta', ['pasta','spaghetti','penne','tagliatelle','linguine','macaroni','lasagna']],
  ['Salad', ['salad']],
  ['Drink', ['cocktail','smoothie','drink','latte','lemonade']],
  ['Sauce', ['sauce','dressing','dip','pesto']],
  ['Dinner', ['chicken','beef','pork','salmon','tofu','rice','curry','risotto','pizza']]
];
const TAG_RULES = [
  ['Italian', ['italian','parmesan','parmigiano','pasta','risotto','mozzarella','basil','gnocchi','pizza']],
  ['Finnish', ['finnish','karjalan','lohikeitto','rieska','korvapuusti']],
  ['Mexican', ['mexican','taco','tacos','tortilla','salsa','guacamole','quesadilla']],
  ['Indian', ['indian','garam masala','tikka','dal','dahl','naan','curry']],
  ['Asian', ['soy sauce','sesame oil','miso','gochujang','rice vinegar','noodles']],
  ['Vegetarian', ['vegetarian']],
  ['Vegan', ['vegan']],
  ['Quick', ['15 minute','20 minute','30 minute','quick','easy']],
  ['High protein', ['high protein','protein-rich','protein rich']]
];

let db;
let state = {
  pantry: [],
  available: [],
  shopping: [],
  theme: 'system',
  activeRecipeFilter: 'All'
};
let recipes = [];
let activeRecipeId = null;
let editorDraft = null;
let deferredInstallPrompt = null;
let pendingShoppingRecipeId = null;
let confirmResolver = null;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('recipes')) d.createObjectStore('recipes', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('state')) d.createObjectStore('state', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('shared')) d.createObjectStore('shared', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbPut(store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function idbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function idbClear(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadAll() {
  recipes = (await idbGetAll('recipes')).sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const saved = await idbGet('state', 'app');
  if (saved?.value) state = { ...state, ...saved.value };
  applyTheme();
  renderAll();
}
async function saveState() {
  await idbPut('state', { key: 'app', value: state });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}
function fmtBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B','KB','MB','GB'];
  let i=0, n=bytes;
  while (n >= 1024 && i < units.length-1) { n/=1024; i++; }
  return `${n.toFixed(n >= 10 || i===0 ? 0 : 1)} ${units[i]}`;
}
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
function setStatus(message, busy = true) {
  const el = $('#importStatus');
  if (!message) { el.classList.add('hidden'); el.textContent=''; return; }
  el.classList.remove('hidden');
  el.textContent = busy ? `Working · ${message}` : message;
}
function titleForPage(page) {
  return ({recipes:'Recipes',cook:'Cook',import:'Import',shopping:'Shopping',settings:'Settings'})[page] || 'Recipe Vault';
}
function go(page) {
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
  $$('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === page));
  $('#headerTitle').textContent = titleForPage(page);
  location.hash = page === 'recipes' ? '' : page;
  window.scrollTo({top:0, behavior:'instant'});
  if (page === 'cook') renderMatches();
  if (page === 'shopping') renderShopping();
  if (page === 'settings') { renderPantry(); renderStorageInfo(); }
}

function normalizeText(s='') {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function singularize(word) {
  if (word.length < 4) return word;
  if (word.endsWith('ies')) return word.slice(0,-3)+'y';
  if (word.endsWith('oes')) return word.slice(0,-2);
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('ches') || word.endsWith('shes')) return word.slice(0,-2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0,-1);
  return word;
}
function canonicalIngredient(input='') {
  let s = normalizeText(input);
  s = s.replace(/^\d+[\d\s./-]*\s*/, '');
  const unitPattern = new RegExp(`^(${UNITS.map(u=>u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})\\b\\s*`, 'i');
  s = s.replace(unitPattern, '');
  let words = s.split(/\s+/).filter(Boolean).filter(w => !PREP_WORDS.has(w));
  s = words.join(' ');
  for (const [variants, canonical] of SYNONYMS) {
    if (variants.some(v => normalizeText(v) === s || s.includes(normalizeText(v)))) return canonical;
  }
  return s.split(' ').map(singularize).join(' ').trim();
}
function levenshtein(a,b) {
  if (a===b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=1;i<=a.length;i++) {
    let cur=[i];
    for (let j=1;j<=b.length;j++) cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    for (let j=0;j<cur.length;j++) prev[j]=cur[j];
  }
  return prev[b.length];
}
function ingredientSimilarity(a,b) {
  const x = canonicalIngredient(a), y = canonicalIngredient(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if ((x.includes(y) || y.includes(x)) && Math.min(x.length,y.length) >= 4) return .91;
  const xt = new Set(x.split(' ')), yt = new Set(y.split(' '));
  const common = [...xt].filter(t => yt.has(t)).length;
  const union = new Set([...xt,...yt]).size;
  const tokenScore = union ? common/union : 0;
  const editScore = 1 - levenshtein(x,y)/Math.max(x.length,y.length);
  return Math.max(tokenScore, editScore * .92);
}
function fuzzyHas(available, ingredient) {
  return available.some(a => ingredientSimilarity(a, ingredient.name || ingredient) >= .67);
}

function parseNumber(raw='') {
  raw = raw.trim();
  if (!raw) return null;
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2])/Number(mixed[3]);
  const frac = raw.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1])/Number(frac[2]);
  const n = Number(raw.replace(',','.'));
  return Number.isFinite(n) ? n : null;
}
function cleanQty(raw='') {
  return raw.replace(/½/g,' 1/2').replace(/¼/g,' 1/4').replace(/¾/g,' 3/4').replace(/⅓/g,' 1/3').replace(/⅔/g,' 2/3').trim();
}
function parseIngredientLine(line) {
  let raw = String(line || '').replace(/^[-•*]\s*/, '').trim();
  if (!raw) return null;
  raw = cleanQty(raw);
  const m = raw.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)?\s*([a-zA-Z]+\.?\b)?\s*(.*)$/);
  let qtyText = (m?.[1] || '').trim();
  let unit = (m?.[2] || '').replace(/\.$/,'').toLowerCase();
  let name = (m?.[3] || raw).trim();
  if (unit && !UNITS.includes(unit)) {
    name = `${unit} ${name}`.trim();
    unit = '';
  }
  if (!name) name = raw;
  const range = qtyText.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
  let qty = range ? null : parseNumber(qtyText);
  return { raw, qty, qtyText, unit, name, optional: /optional|to taste/i.test(raw) };
}
function ingredientToLine(i) {
  if (!i) return '';
  const qty = i.qtyText || (Number.isFinite(i.qty) ? String(i.qty) : '');
  return [qty, i.unit, i.name].filter(Boolean).join(' ').trim();
}
function formatQty(i) {
  const q = i.qtyText || (Number.isFinite(i.qty) ? String(i.qty) : '');
  return [q, i.unit].filter(Boolean).join(' ') || '—';
}

function stripMarkdown(s='') {
  return s.replace(/!\[[^\]]*\]\([^)]*\)/g,'')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/^#{1,6}\s+/gm,'')
    .replace(/[*_`>]/g,'')
    .replace(/\r/g,'');
}
function extractFirstImageUrl(text='') {
  const m = text.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)[^)]*\)/i);
  return m?.[1] || '';
}
function inferCategory(text='') {
  const n = normalizeText(text);
  for (const [label, words] of CATEGORY_RULES) if (words.some(w => n.includes(normalizeText(w)))) return label;
  return 'Recipe';
}
function inferTags(text='') {
  const n = normalizeText(text);
  return TAG_RULES.filter(([,words]) => words.some(w => n.includes(normalizeText(w)))).map(([label]) => label);
}
function looksLikeIngredient(line='') {
  const s=line.trim();
  if (!s || s.length>180) return false;
  if (/^[-•*]\s+/.test(line)) return true;
  if (/^(\d|½|¼|¾|⅓|⅔)/.test(s) && s.split(/\s+/).length >= 2) return true;
  const n=normalizeText(s);
  return UNITS.some(u => new RegExp(`\\b${u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(n));
}
function looksLikeStep(line='') {
  const s=line.trim();
  if (!s) return false;
  if (/^\d+[.)]\s+/.test(s)) return true;
  return /^(add|mix|stir|heat|cook|bake|preheat|combine|whisk|fold|pour|place|season|serve|bring|simmer|boil|fry|roast|blend|chop|slice|beat|knead|spread|top|drain|rinse|marinate|refrigerate|chill)\b/i.test(s);
}
function parseRecipeText(rawText, source = {}) {
  const imageUrl = source.imageUrl || extractFirstImageUrl(rawText);
  const text = stripMarkdown(rawText);
  let lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  lines = lines.filter(l => !/^(jump to recipe|print recipe|advertisement|cookie policy|privacy policy)$/i.test(l));
  const headingIdx = name => lines.findIndex(l => new RegExp(`^${name}\\s*:?$`, 'i').test(l));
  let ingIdx = lines.findIndex(l => /^(ingredients?|what you(?:'|’)ll need)\s*:?$/i.test(l));
  let stepIdx = lines.findIndex(l => /^(instructions?|directions?|method|steps?|preparation)\s*:?$/i.test(l));
  let title = source.title || '';
  if (!title) {
    const titleCandidates = lines.filter((l,i) => i < Math.max(8, ingIdx > 0 ? ingIdx : 8) && l.length >= 3 && l.length < 100 && !looksLikeIngredient(l));
    title = titleCandidates.find(l => !/recipe|ingredients|instructions/i.test(l)) || lines[0] || 'Untitled recipe';
  }
  let ingredientLines = [];
  let stepLines = [];
  if (ingIdx >= 0) {
    const end = stepIdx > ingIdx ? stepIdx : Math.min(lines.length, ingIdx + 35);
    ingredientLines = lines.slice(ingIdx + 1, end).filter(l => l.length < 220 && !/^(nutrition|notes?|serves?|yield|prep time|cook time)/i.test(l));
  }
  if (stepIdx >= 0) {
    stepLines = lines.slice(stepIdx + 1).filter(l => !/^(nutrition|notes?|did you make|rate this|related recipes)/i.test(l)).slice(0, 30);
  }
  if (!ingredientLines.length) {
    ingredientLines = lines.filter(looksLikeIngredient).slice(0, 40);
  }
  if (!stepLines.length) {
    stepLines = lines.filter(looksLikeStep).slice(0, 30);
  }
  ingredientLines = ingredientLines.filter((l, idx, arr) => arr.indexOf(l) === idx);
  stepLines = stepLines.map(l => l.replace(/^\d+[.)]\s*/, '').replace(/^[-•*]\s*/, '').trim()).filter((l,idx,arr)=>l && arr.indexOf(l)===idx);
  const ingredients = ingredientLines.map(parseIngredientLine).filter(Boolean);
  const body = `${title}\n${text}`;
  const servingsMatch = text.match(/(?:serves?|servings?|yield)\s*[:\-]?\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
  return {
    id: uid('recipe'), title: title.trim().slice(0,160) || 'Untitled recipe',
    category: inferCategory(body), tags: inferTags(body), servings: servingsMatch?.[1] || '',
    ingredients, steps: stepLines, notes: '', favorite: false,
    source: { type: source.type || 'text', url: source.url || '', label: source.label || '', filename: source.filename || '' },
    imageUrl, mediaId: source.mediaId || '', mediaType: source.mediaType || '', thumbnailId: source.thumbnailId || '',
    createdAt: Date.now(), updatedAt: Date.now()
  };
}

function sourceLabel(recipe) {
  const t = recipe.source?.type || 'manual';
  return ({text:'Text',website:'Web',image:'Photo',pdf:'PDF',video:'Video',manual:'Manual',shared:'Shared'})[t] || t;
}

async function getMediaUrl(id) {
  if (!id) return '';
  const item = await idbGet('media', id);
  return item?.blob ? URL.createObjectURL(item.blob) : '';
}
async function storeMedia(blob, meta={}) {
  const id = uid('media');
  await idbPut('media', { id, blob, type: blob.type || meta.type || '', name: meta.name || '', createdAt: Date.now() });
  return id;
}
async function deleteRecipeMedia(recipe) {
  const ids = [recipe?.mediaId, recipe?.thumbnailId].filter(Boolean);
  for (const id of ids) await idbDelete('media', id).catch(()=>{});
}

async function renderAll() {
  renderRecipeFilters();
  await renderRecipes();
  renderAvailable();
  renderMatches();
  renderShopping();
  renderPantry();
  renderStorageInfo();
}
function renderRecipeFilters() {
  const counts = new Map();
  for (const r of recipes) {
    counts.set(sourceLabel(r), (counts.get(sourceLabel(r))||0)+1);
    if (r.category) counts.set(r.category, (counts.get(r.category)||0)+1);
  }
  const filters = ['All','Favorites', ...[...counts.keys()].sort()];
  $('#recipeFilters').innerHTML = filters.map(f => `<button class="filter-chip ${state.activeRecipeFilter===f?'active':''}" data-filter="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('');
  $$('[data-filter]').forEach(b => b.onclick = () => { state.activeRecipeFilter=b.dataset.filter; saveState(); renderRecipeFilters(); renderRecipes(); });
}
function filteredRecipes() {
  const q = normalizeText($('#recipeSearch')?.value || '');
  const filter = state.activeRecipeFilter || 'All';
  let out = recipes.filter(r => {
    if (filter === 'Favorites' && !r.favorite) return false;
    if (filter !== 'All' && filter !== 'Favorites' && sourceLabel(r)!==filter && r.category!==filter) return false;
    if (!q) return true;
    const hay = normalizeText([r.title,r.category,(r.tags||[]).join(' '),(r.ingredients||[]).map(i=>i.name).join(' '),r.notes].join(' '));
    return q.split(' ').every(token => hay.includes(token));
  });
  const sort = $('#recipeSort')?.value || 'recent';
  if (sort==='title') out.sort((a,b)=>a.title.localeCompare(b.title));
  else if (sort==='favorite') out.sort((a,b)=>Number(b.favorite)-Number(a.favorite) || (b.updatedAt||0)-(a.updatedAt||0));
  else out.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  return out;
}
async function recipeCardHtml(r, match=null) {
  let img = r.imageUrl || '';
  if (!img && r.thumbnailId) img = await getMediaUrl(r.thumbnailId);
  if (!img && r.mediaId && (r.mediaType||'').startsWith('image/')) img = await getMediaUrl(r.mediaId);
  const tags = [r.category, ...(r.tags||[])].filter(Boolean).slice(0,2);
  return `<article class="recipe-card">
    ${match ? `<div class="match-badge">${Math.round(match.score*100)}% match</div>`:''}
    ${r.favorite ? `<button class="favorite-dot" data-fav="${r.id}" aria-label="Remove favorite">★</button>`:''}
    <button class="card-hit" data-recipe="${r.id}">
      ${img ? `<img class="recipe-thumb" src="${escapeHtml(img)}" alt="" loading="lazy">` : `<div class="recipe-thumb placeholder">⌑</div>`}
      <div class="recipe-card-body">
        <h3>${escapeHtml(r.title)}</h3>
        <div class="card-meta">
          <span>${(r.ingredients||[]).length} ingredients</span>
          <span>·</span><span>${escapeHtml(sourceLabel(r))}</span>
          ${match ? `<span>·</span><span>${match.matched}/${match.total} at home</span>`:''}
        </div>
        <div class="card-meta" style="margin-top:7px">${tags.map(t=>`<span class="mini-tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
    </button>
  </article>`;
}
async function renderRecipes() {
  const list = filteredRecipes();
  $('#recipeEmpty').classList.toggle('hidden', recipes.length !== 0);
  $('#recipeGrid').classList.toggle('hidden', list.length === 0);
  const chunks = [];
  for (const r of list) chunks.push(await recipeCardHtml(r));
  $('#recipeGrid').innerHTML = chunks.join('');
  bindRecipeCards($('#recipeGrid'));
}
function bindRecipeCards(root=document) {
  $$('[data-recipe]',root).forEach(b => b.onclick = () => openRecipe(b.dataset.recipe));
  $$('[data-fav]',root).forEach(b => b.onclick = async e => { e.stopPropagation(); await toggleFavorite(b.dataset.fav); });
}
async function toggleFavorite(id) {
  const r=recipes.find(x=>x.id===id); if(!r)return;
  r.favorite=!r.favorite; r.updatedAt=Date.now();
  await idbPut('recipes',r); await renderRecipes();
}

function renderAvailable() {
  $('#availableChips').innerHTML = state.available.map((x,i)=>`<span class="chip">${escapeHtml(x)}<button data-remove-available="${i}">×</button></span>`).join('');
  $$('[data-remove-available]').forEach(b=>b.onclick=async()=>{state.available.splice(Number(b.dataset.removeAvailable),1);await saveState();renderAvailable();renderMatches();});
}
function allAvailable() {
  return [...state.available, ...($('#includePantryToggle')?.checked ? state.pantry : [])].filter(Boolean);
}
function computeMatch(recipe, available) {
  const required=(recipe.ingredients||[]).filter(i=>!i.optional && i.name);
  if (!required.length) return {score:0,matched:0,total:0,missing:[]};
  const matched = required.filter(i=>fuzzyHas(available,i));
  return { score: matched.length/required.length, matched:matched.length, total:required.length, missing:required.filter(i=>!fuzzyHas(available,i)) };
}
async function renderMatches() {
  if (!$('#matchGrid')) return;
  const available=allAvailable();
  $('#matchEmpty').classList.toggle('hidden', available.length>0);
  if (!available.length) { $('#matchGrid').innerHTML=''; $('#matchSummary').textContent=''; return; }
  const matched=recipes.map(r=>({r,m:computeMatch(r,available)})).sort((a,b)=>b.m.score-a.m.score || a.m.total-b.m.total);
  const chunks=[];
  for (const {r,m} of matched) chunks.push(await recipeCardHtml(r,m));
  $('#matchGrid').innerHTML=chunks.join('');
  $('#matchSummary').textContent = `${available.length} available ingredient${available.length===1?'':'s'} · ${recipes.length} recipe${recipes.length===1?'':'s'} ranked`;
  bindRecipeCards($('#matchGrid'));
}

function renderPantry() {
  $('#pantryChips').innerHTML = state.pantry.map((x,i)=>`<span class="chip">${escapeHtml(x)}<button data-remove-pantry="${i}">×</button></span>`).join('') || '<span class="muted" style="font-size:12px">Nothing saved yet.</span>';
  $$('[data-remove-pantry]').forEach(b=>b.onclick=async()=>{state.pantry.splice(Number(b.dataset.removePantry),1);await saveState();renderPantry();renderMatches();});
}
function addUniqueIngredient(list, value) {
  value = value.trim();
  if (!value) return false;
  if (list.some(x=>ingredientSimilarity(x,value)>=.9)) return false;
  list.push(value); return true;
}

function mergeShoppingIngredient(ing, sourceRecipeId='', manual=false) {
  const key = canonicalIngredient(ing.name || ing.raw || '');
  if (!key) return;
  const existing = state.shopping.find(x => canonicalIngredient(x.name)===key && (x.unit||'')===(ing.unit||'') && !x.checked);
  if (existing) {
    if (Number.isFinite(existing.qty) && Number.isFinite(ing.qty)) existing.qty += ing.qty;
    else if (!existing.qtyText && ing.qtyText) existing.qtyText = ing.qtyText;
    existing.sources = [...new Set([...(existing.sources||[]), ...(sourceRecipeId?[sourceRecipeId]:[])])];
  } else {
    state.shopping.push({ id:uid('shop'), name:ing.name || ing.raw, qty:Number.isFinite(ing.qty)?ing.qty:null, qtyText:ing.qtyText||'', unit:ing.unit||'', checked:false, manual, sources:sourceRecipeId?[sourceRecipeId]:[], createdAt:Date.now() });
  }
}
function renderShopping() {
  if (!$('#shoppingList')) return;
  const items=[...state.shopping].sort((a,b)=>Number(a.checked)-Number(b.checked)||(a.createdAt||0)-(b.createdAt||0));
  $('#shoppingEmpty').classList.toggle('hidden', items.length>0);
  $('#shoppingCount').textContent=`${items.filter(i=>!i.checked).length} item${items.filter(i=>!i.checked).length===1?'':'s'}`;
  const recipeCount=new Set(items.flatMap(i=>i.sources||[])).size;
  $('#shoppingRecipeCount').textContent=recipeCount?`From ${recipeCount} recipe${recipeCount===1?'':'s'} + manual items`:'';
  $('#shoppingList').innerHTML=items.map(item=>{
    const qty=[item.qtyText || (Number.isFinite(item.qty)?String(Math.round(item.qty*100)/100):''),item.unit].filter(Boolean).join(' ');
    const sourceNames=(item.sources||[]).map(id=>recipes.find(r=>r.id===id)?.title).filter(Boolean);
    return `<div class="shopping-item ${item.checked?'checked':''}">
      <input class="shopping-check" type="checkbox" ${item.checked?'checked':''} data-shop-check="${item.id}" aria-label="Check ${escapeHtml(item.name)}">
      <div><div class="shopping-name">${escapeHtml(item.name)}</div><div class="shopping-sub">${qty?`<span>${escapeHtml(qty)}</span>`:''}${sourceNames.slice(0,2).map(n=>`<span>· ${escapeHtml(n)}</span>`).join('')}${item.manual?'<span>· manual</span>':''}</div></div>
      <div class="shopping-actions"><button class="home-btn" data-shop-home="${item.id}" title="I have this at home">⌂</button><button data-shop-delete="${item.id}" title="Delete">×</button></div>
    </div>`;
  }).join('');
  $$('[data-shop-check]').forEach(b=>b.onchange=async()=>{const i=state.shopping.find(x=>x.id===b.dataset.shopCheck);if(i)i.checked=b.checked;await saveState();renderShopping();});
  $$('[data-shop-delete]').forEach(b=>b.onclick=async()=>{state.shopping=state.shopping.filter(x=>x.id!==b.dataset.shopDelete);await saveState();renderShopping();});
  $$('[data-shop-home]').forEach(b=>b.onclick=async()=>{const i=state.shopping.find(x=>x.id===b.dataset.shopHome);if(!i)return;addUniqueIngredient(state.pantry,i.name);state.shopping=state.shopping.filter(x=>x.id!==i.id);await saveState();renderShopping();renderPantry();renderMatches();toast(`${i.name} moved to pantry`);});
}

async function openRecipe(id) {
  const r=recipes.find(x=>x.id===id); if(!r)return;
  activeRecipeId=id;
  $('#favoriteRecipeBtn').textContent=r.favorite?'★':'☆';
  let hero=r.imageUrl||'';
  if (!hero && r.thumbnailId) hero=await getMediaUrl(r.thumbnailId);
  if (!hero && r.mediaId && (r.mediaType||'').startsWith('image/')) hero=await getMediaUrl(r.mediaId);
  let sourceMedia='';
  if (r.mediaId && ((r.mediaType||'').startsWith('video/') || r.mediaType==='application/pdf')) {
    const url=await getMediaUrl(r.mediaId);
    if ((r.mediaType||'').startsWith('video/')) sourceMedia=`<div class="detail-section"><h3>Original video</h3><video class="source-media" controls src="${escapeHtml(url)}"></video></div>`;
    if (r.mediaType==='application/pdf') sourceMedia=`<div class="detail-section"><h3>Original PDF</h3><a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open stored PDF ↗</a></div>`;
  }
  $('#recipeDetail').innerHTML=`
    ${hero?`<img class="recipe-hero" src="${escapeHtml(hero)}" alt="">`:''}
    <div class="recipe-detail-body">
      <div class="eyebrow">${escapeHtml(sourceLabel(r).toUpperCase())}${r.servings?` · ${escapeHtml(r.servings)} SERVINGS`:''}</div>
      <h2>${escapeHtml(r.title)}</h2>
      <div class="detail-tags">${[r.category,...(r.tags||[])].filter(Boolean).map(t=>`<span class="mini-tag">${escapeHtml(t)}</span>`).join('')}</div>
      <div class="detail-actions"><button class="primary" id="detailShopBtn">Add to shopping</button><button class="secondary" id="detailPantryMatchBtn">Check what I have</button></div>
      <div class="detail-section"><h3>Ingredients</h3><ul class="ingredient-list">${(r.ingredients||[]).map(i=>`<li><span class="ingredient-qty">${escapeHtml(formatQty(i))}</span><span>${escapeHtml(i.name)}${i.optional?' <small class="muted">(optional)</small>':''}</span></li>`).join('') || '<li class="muted">No ingredients parsed.</li>'}</ul></div>
      <div class="detail-section"><h3>Steps</h3><ol class="step-list">${(r.steps||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">No steps parsed.</li>'}</ol></div>
      ${r.notes?`<div class="detail-section"><h3>Notes</h3><div class="muted" style="white-space:pre-wrap;line-height:1.5">${escapeHtml(r.notes)}</div></div>`:''}
      ${sourceMedia}
      ${r.source?.url?`<div class="detail-section"><h3>Source</h3><a class="source-link" href="${escapeHtml(r.source.url)}" target="_blank" rel="noopener">${escapeHtml(r.source.url)} ↗</a></div>`:''}
    </div>`;
  $('#detailShopBtn').onclick=()=>openShoppingPicker(r.id);
  $('#detailPantryMatchBtn').onclick=()=>{ $('#recipeDialog').close(); state.available=[]; go('cook'); toast('Add what you have, or use your saved pantry'); };
  $('#recipeDialog').showModal();
}
function openShoppingPicker(recipeId) {
  const r=recipes.find(x=>x.id===recipeId); if(!r)return;
  pendingShoppingRecipeId=recipeId;
  $('#shoppingIngredientPicker').innerHTML=(r.ingredients||[]).map((i,idx)=>{
    const home=fuzzyHas(state.pantry,i);
    return `<label class="picker-item"><input type="checkbox" data-pick-ingredient="${idx}" ${home?'':'checked'}><span><strong>${escapeHtml(ingredientToLine(i))}</strong>${home?'<span class="at-home-badge">Already at home</span>':''}</span></label>`;
  }).join('') || '<p class="muted">No ingredients available.</p>';
  $('#shoppingDialog').showModal();
}

async function saveRecipe(recipe) {
  recipe.updatedAt=Date.now();
  if (!recipe.createdAt) recipe.createdAt=Date.now();
  await idbPut('recipes',recipe);
  const idx=recipes.findIndex(r=>r.id===recipe.id);
  if(idx>=0) recipes[idx]=recipe; else recipes.unshift(recipe);
  recipes.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  renderAll();
}
function openEditor(recipe, isNew=false) {
  editorDraft=structuredClone(recipe);
  $('#editorHeading').textContent=isNew?'Review recipe':'Edit recipe';
  $('#editTitle').value=recipe.title||'';
  $('#editServings').value=recipe.servings||'';
  $('#editCategory').value=recipe.category||'';
  $('#editTags').value=(recipe.tags||[]).join(', ');
  $('#editIngredients').value=(recipe.ingredients||[]).map(ingredientToLine).join('\n');
  $('#editSteps').value=(recipe.steps||[]).join('\n');
  $('#editNotes').value=recipe.notes||'';
  $('#editSourceUrl').value=recipe.source?.url||'';
  $('#deleteRecipeBtn').classList.toggle('hidden',isNew);
  renderEditorPreview(recipe);
  $('#editorDialog').showModal();
}
async function renderEditorPreview(recipe) {
  const box=$('#editorMediaPreview');
  box.classList.add('hidden'); box.innerHTML='';
  let url=recipe.imageUrl||'';
  let type='image';
  if (!url && recipe.thumbnailId) url=await getMediaUrl(recipe.thumbnailId);
  if (!url && recipe.mediaId && (recipe.mediaType||'').startsWith('image/')) url=await getMediaUrl(recipe.mediaId);
  if (!url && recipe.mediaId && (recipe.mediaType||'').startsWith('video/')) {url=await getMediaUrl(recipe.mediaId);type='video';}
  if(url){box.innerHTML=type==='video'?`<video controls src="${escapeHtml(url)}"></video>`:`<img src="${escapeHtml(url)}" alt="">`;box.classList.remove('hidden');}
}

async function parseTextImport() {
  const text=$('#importText').value.trim();
  if(!text){toast('Paste a recipe first');return;}
  setStatus('Parsing text…');
  const recipe=parseRecipeText(text,{type:'text'});
  setStatus('Recipe parsed — review before saving',false);
  openEditor(recipe,true);
}
async function fetchReadableUrl(url) {
  const target=`https://r.jina.ai/${url}`;
  const res=await fetch(target,{headers:{'Accept':'text/plain'}});
  if(!res.ok) throw new Error(`Reader returned ${res.status}`);
  return await res.text();
}
async function parseWebsiteImport() {
  let url=$('#websiteUrl').value.trim();
  if(!url){toast('Paste a website link first');return;}
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  setStatus('Reading website…');
  try {
    const readable=await fetchReadableUrl(url);
    const host=new URL(url).hostname.replace(/^www\./,'');
    const recipe=parseRecipeText(readable,{type:'website',url,label:host});
    if (/instagram\.com$/i.test(host) || host.includes('instagram.com')) recipe.tags=[...new Set([...(recipe.tags||[]),'Instagram'])];
    setStatus('Website read — review the extracted recipe',false);
    openEditor(recipe,true);
  } catch(e) {
    setStatus('',false);
    toast('Could not read that link. Download/share the file or paste the recipe text.');
    console.error(e);
  }
}

async function loadPdfJs() {
  const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  return pdfjs;
}
async function extractPdf(file) {
  setStatus('Loading PDF reader…');
  const pdfjs=await loadPdfJs();
  const data=await file.arrayBuffer();
  const doc=await pdfjs.getDocument({data}).promise;
  let text='';
  const pages=Math.min(doc.numPages,25);
  for(let p=1;p<=pages;p++){
    setStatus(`Reading PDF page ${p} of ${pages}…`);
    const page=await doc.getPage(p);
    const content=await page.getTextContent();
    text += '\n' + content.items.map(x=>x.str).join(' ');
  }
  let thumbBlob=null;
  try {
    const page=await doc.getPage(1);
    const viewport=page.getViewport({scale:1.25});
    const canvas=document.createElement('canvas');
    canvas.width=viewport.width;canvas.height=viewport.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    thumbBlob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.82));
  } catch {}
  return {text,thumbBlob};
}
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  setStatus('Loading OCR…');
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
  return window.Tesseract;
}
async function ocrImage(blob, label='image') {
  const T=await loadTesseract();
  setStatus(`Reading text from ${label}…`);
  const result=await T.recognize(blob,'eng',{logger:m=>{if(m.status==='recognizing text')setStatus(`OCR ${Math.round((m.progress||0)*100)}% · ${label}`);}});
  return result?.data?.text||'';
}
async function imageThumbnail(blob, max=1000) {
  const bitmap=await createImageBitmap(blob);
  const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  return await new Promise(r=>canvas.toBlob(r,'image/jpeg',.84));
}
async function seekVideo(video,time) {
  return new Promise((resolve,reject)=>{
    const onSeek=()=>{video.removeEventListener('seeked',onSeek);resolve();};
    video.addEventListener('seeked',onSeek,{once:true});
    video.currentTime=clamp(time,0,Math.max(0,video.duration-.05));
    setTimeout(()=>reject(new Error('Video seek timeout')),5000);
  });
}
async function extractVideoFrames(file) {
  const url=URL.createObjectURL(file);
  const video=document.createElement('video');
  video.preload='metadata';video.muted=true;video.playsInline=true;video.src=url;
  await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});
  const duration=Number.isFinite(video.duration)?video.duration:1;
  const points=[.04,.2,.4,.6,.8,.96].map(f=>duration*f);
  const frames=[];
  for(let idx=0;idx<points.length;idx++){
    setStatus(`Sampling video frame ${idx+1} of ${points.length}…`);
    try{await seekVideo(video,points[idx]);}catch{}
    const maxW=760, scale=Math.min(1,maxW/(video.videoWidth||maxW));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((video.videoWidth||720)*scale));canvas.height=Math.max(1,Math.round((video.videoHeight||1280)*scale));
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.78));
    if(blob)frames.push(blob);
  }
  URL.revokeObjectURL(url);
  return frames;
}
function dedupeOcrText(texts) {
  const seen=[];
  for(const text of texts){
    for(const line of text.split('\n').map(x=>x.trim()).filter(x=>x.length>1)){
      const n=normalizeText(line);if(!n)continue;
      if(!seen.some(x=>ingredientSimilarity(x,line)>.9 || normalizeText(x)===n))seen.push(line);
    }
  }
  return seen.join('\n');
}
async function processFile(file) {
  const keep=$('#keepOriginalToggle').checked;
  const type=file.type||'';
  const baseSource={filename:file.name,label:file.name};
  if(type==='application/pdf' || /\.pdf$/i.test(file.name)){
    const {text,thumbBlob}=await extractPdf(file);
    let mediaId='',thumbnailId='';
    if(keep) mediaId=await storeMedia(file,{name:file.name});
    if(thumbBlob) thumbnailId=await storeMedia(thumbBlob,{name:`${file.name}-thumb.jpg`});
    const recipe=parseRecipeText(text,{...baseSource,type:'pdf',mediaId,mediaType:'application/pdf',thumbnailId});
    return recipe;
  }
  if(type.startsWith('image/')){
    const text=await ocrImage(file,file.name||'photo');
    let mediaId='',thumbnailId='';
    if(keep) mediaId=await storeMedia(file,{name:file.name});
    const thumb=await imageThumbnail(file).catch(()=>null);
    if(thumb) thumbnailId=await storeMedia(thumb,{name:`${file.name}-thumb.jpg`});
    return parseRecipeText(text,{...baseSource,type:'image',mediaId,mediaType:type,thumbnailId});
  }
  if(type.startsWith('video/')){
    let mediaId='';if(keep)mediaId=await storeMedia(file,{name:file.name});
    const frames=await extractVideoFrames(file);
    let thumbnailId='';if(frames[0])thumbnailId=await storeMedia(frames[0],{name:`${file.name}-thumb.jpg`});
    const texts=[];
    for(let i=0;i<frames.length;i++){
      setStatus(`OCR video frame ${i+1} of ${frames.length}…`);
      try{texts.push(await ocrImage(frames[i],`video frame ${i+1}`));}catch(e){console.warn(e);}
    }
    const text=dedupeOcrText(texts);
    const recipe=parseRecipeText(text,{...baseSource,type:'video',mediaId,mediaType:type,thumbnailId});
    recipe.tags=[...new Set([...(recipe.tags||[]),'Video'])];
    if(!recipe.ingredients.length && !recipe.steps.length) recipe.notes='No readable recipe text was detected in the sampled video frames. Add ingredients/steps manually while reviewing.';
    return recipe;
  }
  if(type==='text/plain'){
    const text=await file.text();return parseRecipeText(text,{...baseSource,type:'text'});
  }
  throw new Error(`Unsupported file type: ${type||file.name}`);
}
async function handleFiles(fileList) {
  const files=[...fileList];if(!files.length)return;
  if(files.length>1) toast(`Importing first file now; ${files.length-1} more will follow`);
  for(const file of files){
    try{
      const recipe=await processFile(file);
      setStatus(`${file.name} extracted — review before saving`,false);
      openEditor(recipe,true);
      if(files.length>1) break;
    }catch(e){console.error(e);setStatus('',false);toast(`Could not import ${file.name}`);}
  }
}

async function handleSharedImport() {
  const params=new URLSearchParams(location.search);
  if(params.get('shareError')) toast('The shared item could not be imported');
  if(params.get('shared')!=='1') return;
  const shared=await idbGet('shared','latest');
  if(!shared)return;
  await idbDelete('shared','latest');
  go('import');
  if(shared.files?.length){
    const files=shared.files.map(x=>new File([x.blob],x.name||'shared-file',{type:x.type||x.blob.type}));
    await handleFiles(files);
  } else {
    const combined=[shared.title,shared.text,shared.url].filter(Boolean).join('\n');
    if(shared.url && /^https?:\/\//i.test(shared.url)){
      $('#websiteUrl').value=shared.url;
      $$('[data-import-type]').find(b=>b.dataset.importType==='website')?.click();
      await parseWebsiteImport();
    }else if(combined){
      $('#importText').value=combined;
      await parseTextImport();
    }
  }
  history.replaceState({},'',location.pathname+location.hash);
}

async function exportBackup() {
  setStatus('Building backup…');
  const includeMedia=$('#backupMediaToggle').checked;
  const payload={version:APP_VERSION,exportedAt:new Date().toISOString(),recipes,state,media:[]};
  if(includeMedia){
    const media=await idbGetAll('media');
    for(let i=0;i<media.length;i++){
      setStatus(`Encoding media ${i+1} of ${media.length}…`);
      payload.media.push({id:media[i].id,type:media[i].type,name:media[i].name,createdAt:media[i].createdAt,data:await blobToDataUrl(media[i].blob)});
    }
  }
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`recipe-vault-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStatus('',false);toast('Backup exported');
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function dataUrlToBlob(dataUrl){const res=await fetch(dataUrl);return await res.blob();}
async function importBackup(file) {
  try{
    setStatus('Reading backup…');
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.recipes)) throw new Error('Invalid backup');
    const replace=await confirmAction('Restore backup?','This will replace the recipes, pantry and shopping list currently stored in this app.','Restore');
    if(!replace){setStatus('',false);return;}
    await Promise.all(['recipes','media','state'].map(idbClear));
    for(const r of data.recipes) await idbPut('recipes',r);
    if(Array.isArray(data.media)) for(const m of data.media){if(!m.data)continue;await idbPut('media',{id:m.id,type:m.type,name:m.name,createdAt:m.createdAt,blob:await dataUrlToBlob(m.data)});}
    state={...state,...(data.state||{})};await saveState();await loadAll();setStatus('',false);toast('Backup restored');
  }catch(e){console.error(e);setStatus('',false);toast('That backup could not be imported');}
}
async function renderStorageInfo(){
  if(!$('#storageInfo'))return;
  try{
    const est=await navigator.storage?.estimate?.();
    if(est)$('#storageInfo').textContent=`Browser storage: ${fmtBytes(est.usage||0)} used${est.quota?` of about ${fmtBytes(est.quota)}`:''}. ${recipes.length} recipes saved.`;
    else $('#storageInfo').textContent=`${recipes.length} recipes saved locally.`;
  }catch{$('#storageInfo').textContent=`${recipes.length} recipes saved locally.`;}
}

function applyTheme(){
  let theme=state.theme||'system';
  if(theme==='system') theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.dataset.theme=theme;
  if($('#themeSelect'))$('#themeSelect').value=state.theme||'system';
  $('meta[name="theme-color"]').content=theme==='dark'?'#000000':'#f4f2ee';
}
function confirmAction(title,text,okLabel='Delete'){
  $('#confirmTitle').textContent=title;$('#confirmText').textContent=text;$('#confirmOk').textContent=okLabel;$('#confirmDialog').showModal();
  return new Promise(resolve=>confirmResolver=resolve);
}

function bindEvents(){
  $$('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav));
  $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('#quickImportBtn').onclick=()=>go('import');
  $('#recipeSearch').oninput=()=>renderRecipes();
  $('#recipeSort').onchange=()=>renderRecipes();
  $('#includePantryToggle').onchange=()=>renderMatches();
  $('#addAvailableIngredient').onclick=async()=>{const input=$('#availableIngredientInput');if(addUniqueIngredient(state.available,input.value)){input.value='';await saveState();renderAvailable();renderMatches();}else input.value='';};
  $('#availableIngredientInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#addAvailableIngredient').click();}};
  $('#pantryAddBtn').onclick=async()=>{const input=$('#pantryInput');if(addUniqueIngredient(state.pantry,input.value)){input.value='';await saveState();renderPantry();renderMatches();}else input.value='';};
  $('#pantryInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#pantryAddBtn').click();}};

  $$('[data-import-type]').forEach(b=>b.onclick=()=>{const type=b.dataset.importType;$$('[data-import-type]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-import-panel]').forEach(p=>p.classList.toggle('active',p.dataset.importPanel===type));});
  $('#parseTextBtn').onclick=parseTextImport;
  $('#parseWebsiteBtn').onclick=parseWebsiteImport;
  $('#manualRecipeBtn').onclick=()=>openEditor({id:uid('recipe'),title:'',category:'Recipe',tags:[],servings:'',ingredients:[],steps:[],notes:'',favorite:false,source:{type:'manual',url:'',label:'',filename:''},imageUrl:'',mediaId:'',mediaType:'',thumbnailId:'',createdAt:Date.now(),updatedAt:Date.now()},true);
  $('#fileInput').onchange=e=>handleFiles(e.target.files);
  $('#cameraInput').onchange=e=>handleFiles(e.target.files);
  const dz=$('#dropZone');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
  dz.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));

  $('#manualShoppingAdd').onclick=async()=>{const i=$('#manualShoppingInput');const name=i.value.trim();if(!name)return;mergeShoppingIngredient({name},'',true);i.value='';await saveState();renderShopping();};
  $('#manualShoppingInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#manualShoppingAdd').click();}};
  $('#clearCheckedBtn').onclick=async()=>{state.shopping=state.shopping.filter(i=>!i.checked);await saveState();renderShopping();};

  $$('[data-close-dialog]').forEach(b=>b.onclick=()=>$('#'+b.dataset.closeDialog).close());
  $('#favoriteRecipeBtn').onclick=async()=>{await toggleFavorite(activeRecipeId);const r=recipes.find(x=>x.id===activeRecipeId);$('#favoriteRecipeBtn').textContent=r?.favorite?'★':'☆';};
  $('#editRecipeBtn').onclick=()=>{const r=recipes.find(x=>x.id===activeRecipeId);if(r){$('#recipeDialog').close();openEditor(r,false);}};
  $('#recipeEditor').addEventListener('submit',async e=>{
    e.preventDefault();if(!editorDraft)return;
    editorDraft.title=$('#editTitle').value.trim()||'Untitled recipe';
    editorDraft.servings=$('#editServings').value.trim();
    editorDraft.category=$('#editCategory').value.trim()||'Recipe';
    editorDraft.tags=$('#editTags').value.split(',').map(x=>x.trim()).filter(Boolean);
    editorDraft.ingredients=$('#editIngredients').value.split('\n').map(parseIngredientLine).filter(Boolean);
    editorDraft.steps=$('#editSteps').value.split('\n').map(x=>x.replace(/^\s*\d+[.)]\s*/,'').trim()).filter(Boolean);
    editorDraft.notes=$('#editNotes').value.trim();
    editorDraft.source=editorDraft.source||{type:'manual'};editorDraft.source.url=$('#editSourceUrl').value.trim();
    await saveRecipe(editorDraft);$('#editorDialog').close();setStatus('',false);go('recipes');toast('Recipe saved');
  });
  $('#deleteRecipeBtn').onclick=async()=>{
    if(!editorDraft)return;
    if(await confirmAction('Delete recipe?',`“${editorDraft.title}” and its stored source media will be deleted from this device.`,'Delete')){
      await deleteRecipeMedia(editorDraft);await idbDelete('recipes',editorDraft.id);recipes=recipes.filter(r=>r.id!==editorDraft.id);state.shopping=state.shopping.map(i=>({...i,sources:(i.sources||[]).filter(id=>id!==editorDraft.id)}));await saveState();$('#editorDialog').close();renderAll();toast('Recipe deleted');
    }
  };
  $('#confirmShoppingAdd').onclick=async()=>{const r=recipes.find(x=>x.id===pendingShoppingRecipeId);if(!r)return;const selected=$$('[data-pick-ingredient]:checked').map(x=>Number(x.dataset.pickIngredient));selected.forEach(idx=>mergeShoppingIngredient(r.ingredients[idx],r.id,false));await saveState();$('#shoppingDialog').close();renderShopping();toast(`${selected.length} ingredient${selected.length===1?'':'s'} added`);};

  $('#exportBtn').onclick=exportBackup;
  $('#importBackupInput').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);};
  $('#themeSelect').onchange=async e=>{state.theme=e.target.value;await saveState();applyTheme();};
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme();});
  $('#clearAllBtn').onclick=async()=>{if(await confirmAction('Delete all app data?','This permanently removes every locally stored recipe, source file, pantry item and shopping-list item from this browser.','Delete everything')){await Promise.all(['recipes','media','state','shared'].map(idbClear));state={pantry:[],available:[],shopping:[],theme:'system',activeRecipeFilter:'All'};recipes=[];await saveState();applyTheme();renderAll();toast('All local data deleted');}};

  $('#confirmCancel').onclick=()=>{$('#confirmDialog').close();confirmResolver?.(false);confirmResolver=null;};
  $('#confirmOk').onclick=()=>{$('#confirmDialog').close();confirmResolver?.(true);confirmResolver=null;};
  $('#confirmDialog').addEventListener('cancel',e=>{e.preventDefault();$('#confirmCancel').click();});

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').disabled=false;$('#installBtn').textContent='Install app';});
  $('#installBtn').onclick=async()=>{if(!deferredInstallPrompt){toast('Use your browser menu → Install app / Add to Home screen');return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').disabled=true;};
}

async function init(){
  db=await openDb();
  bindEvents();
  await loadAll();
  const hash=location.hash.replace('#','');if(['cook','import','shopping','settings'].includes(hash))go(hash);else go('recipes');
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js');}catch(e){console.warn('SW registration failed',e);}}
  if(matchMedia('(display-mode: standalone)').matches) $('#installBtn').textContent='Installed';
  await handleSharedImport();
}

init().catch(err=>{console.error(err);toast('Recipe Vault could not start');});
