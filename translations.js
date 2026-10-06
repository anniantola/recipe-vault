export const SUPPORTED_LANGUAGES=['en','fi','it'];

const LANGUAGE_HINTS={
  fi:[
    'ainekset','ainesosat','valmistus','ohje','ohjeet','lisää','sekoita','paista','keitä','uunissa','minuuttia','tuntia','annosta','tarjoile','sokeri','jauho','voi','kananmuna','maito','kerma','sipuli','valkosipuli','tomaatti','peruna','suola','pippuri','öljy','leipä','ruokalusikallinen','teelusikallinen','rkl','tl','dl'
  ],
  it:[
    'ingredienti','procedimento','preparazione','aggiungi','mescola','cuoci','inforna','forno','minuti','ore','porzioni','servire','zucchero','farina','burro','uovo','uova','latte','panna','cipolla','aglio','pomodoro','patata','sale','pepe','olio','pane','cucchiaio','cucchiaino','tazza'
  ],
  en:[
    'ingredients','instructions','directions','method','add','mix','stir','bake','cook','oven','minutes','hours','servings','serve','sugar','flour','butter','egg','eggs','milk','cream','onion','garlic','tomato','potato','salt','pepper','oil','bread','tablespoon','teaspoon','cup'
  ]
};

const SHORT_WORD_HINTS={
  tomaatti:'fi',sipuli:'fi',valkosipuli:'fi',kananmuna:'fi',jauho:'fi',sokeri:'fi',maito:'fi',voi:'fi',kerma:'fi',peruna:'fi',suola:'fi',pippuri:'fi',öljy:'fi',spagetti:'fi',makaroni:'fi',
  pomodoro:'it',cipolla:'it',aglio:'it',uovo:'it',farina:'it',zucchero:'it',latte:'it',burro:'it',panna:'it',patata:'it',sale:'it',pepe:'it',olio:'it',spaghetti:'it',pasta:'it',
  tomato:'en',onion:'en',garlic:'en',egg:'en',flour:'en',sugar:'en',milk:'en',butter:'en',cream:'en',potato:'en',salt:'en',pepper:'en',oil:'en'
};

function clean(value=''){
  return String(value??'').replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,' ').replace(/[\t\f\v]+/g,' ').replace(/ {2,}/g,' ').trim();
}
function norm(value=''){
  return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9äöåàèéìòùç' -]/gi,' ').replace(/\s+/g,' ').trim();
}
export function normalizeLanguageCode(value=''){
  const s=String(value||'').toLowerCase().replace('_','-').trim();
  if(s.startsWith('fi'))return 'fi';
  if(s.startsWith('it'))return 'it';
  if(s.startsWith('en'))return 'en';
  return '';
}
export function detectLanguage(text='',fallback='en'){
  fallback=SUPPORTED_LANGUAGES.includes(fallback)?fallback:'en';
  const raw=clean(text);
  if(!raw)return fallback;
  const n=norm(raw);
  if(SHORT_WORD_HINTS[n])return SHORT_WORD_HINTS[n];
  const words=n.split(/\s+/).filter(Boolean);
  const scores={en:0,fi:0,it:0};
  for(const lang of SUPPORTED_LANGUAGES){
    for(const hint of LANGUAGE_HINTS[lang]){
      const h=norm(hint);
      if(!h)continue;
      const re=new RegExp(`(?:^|\\s)${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\s)`,'i');
      if(re.test(n))scores[lang]+=h.length>6?2:1;
    }
  }
  if(/[äöå]/i.test(raw))scores.fi+=3;
  if(/\b(?:gli|della|delle|degli|alla|con|per|quanto basta)\b/i.test(raw))scores.it+=2;
  if(/\b(?:the|with|until|into|then|and|for)\b/i.test(raw))scores.en+=2;
  const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  if(ranked[0][1]===0 || ranked[0][1]===ranked[1][1])return fallback;
  return ranked[0][0];
}

function decodeEntities(text=''){
  const ta=document.createElement('textarea');ta.innerHTML=String(text||'');return ta.value;
}
async function fetchJson(url,timeoutMs=15000){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{const res=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!res.ok)throw new Error(`Translation HTTP ${res.status}`);return await res.json();}
  finally{clearTimeout(timer);}
}
async function googleTranslate(text,source,target){
  const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl='+encodeURIComponent(source||'auto')+'&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
  const data=await fetchJson(url,16000);
  const value=(data?.[0]||[]).map(part=>part?.[0]||'').join('');
  if(!value)throw new Error('Empty translation');
  return clean(value);
}
function utf8Bytes(s){return new TextEncoder().encode(s).length;}
function splitForMyMemory(text,maxBytes=440){
  const src=clean(text);if(utf8Bytes(src)<=maxBytes)return [src];
  const sentences=src.split(/(?<=[.!?])\s+/).filter(Boolean);const chunks=[];let cur='';
  const pushWordChunks=s=>{let tmp='';for(const w of s.split(/\s+/)){const next=tmp?`${tmp} ${w}`:w;if(utf8Bytes(next)>maxBytes&&tmp){chunks.push(tmp);tmp=w;}else tmp=next;}if(tmp)chunks.push(tmp);};
  for(const s of sentences){const next=cur?`${cur} ${s}`:s;if(utf8Bytes(next)>maxBytes){if(cur)chunks.push(cur);cur='';if(utf8Bytes(s)>maxBytes)pushWordChunks(s);else cur=s;}else cur=next;}
  if(cur)chunks.push(cur);return chunks;
}
async function myMemoryTranslate(text,source,target){
  const chunks=splitForMyMemory(text);const out=[];
  for(const chunk of chunks){
    const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(chunk)+'&langpair='+encodeURIComponent(`${source}|${target}`);
    const data=await fetchJson(url,16000);const value=decodeEntities(data?.responseData?.translatedText||'');
    if(!value)throw new Error('Empty fallback translation');out.push(clean(value));
  }
  return out.join(' ');
}
export async function translateText(text,source,target){
  const src=clean(text);source=normalizeLanguageCode(source)||detectLanguage(src,'en');target=normalizeLanguageCode(target)||target;
  if(!src||!SUPPORTED_LANGUAGES.includes(target)||source===target)return src;
  try{return await googleTranslate(src,source,target);}catch(first){
    try{return await myMemoryTranslate(src,source,target);}catch(second){console.warn('Translation failed',source,target,first,second);throw second;}
  }
}

const SEP='\n<<<RV_TRANSLATION_SEGMENT>>>\n';
function batchSegments(segments,maxChars=3200){
  const groups=[];let group=[];let length=0;
  for(const raw of segments){const s=clean(raw);const add=s.length+(group.length?SEP.length:0);if(group.length&&length+add>maxChars){groups.push(group);group=[];length=0;}group.push(s);length+=add;}
  if(group.length)groups.push(group);return groups;
}
async function translateBatchGroup(group,source,target){
  if(group.length===1)return [await translateText(group[0],source,target)];
  try{
    const translated=await googleTranslate(group.join(SEP),source,target);
    const parts=translated.split(/\s*<<<RV_TRANSLATION_SEGMENT>>>\s*/g).map(clean);
    if(parts.length===group.length)return parts;
  }catch{}
  const out=[];for(const s of group)out.push(await translateText(s,source,target));return out;
}
export async function translateSegments(segments,source,target){
  source=normalizeLanguageCode(source)||detectLanguage(segments.join(' '),'en');target=normalizeLanguageCode(target)||target;
  const cleaned=segments.map(clean);
  if(source===target)return cleaned;
  const nonEmpty=cleaned.map((text,index)=>({text,index})).filter(x=>x.text);
  const translated=[];const groups=batchSegments(nonEmpty.map(x=>x.text));
  for(const group of groups)translated.push(...await translateBatchGroup(group,source,target));
  const out=[...cleaned];nonEmpty.forEach((x,i)=>{out[x.index]=translated[i]??x.text;});return out;
}

function recipeSourceText(recipe={}){
  return [recipe.title,recipe.description,recipe.servings,recipe.type,...(recipe.cuisine||[]),...(recipe.dietary||[]),...(recipe.traits||[]),...(recipe.ingredients||[]).flatMap(i=>[i?.name,i?.note]),...(recipe.steps||[]),...(recipe.equipment||[]),recipe.notes,recipe.nutrition].filter(Boolean).join('\n');
}
function recipeSnapshot(recipe={}){
  return {
    title:clean(recipe.title),description:clean(recipe.description),servings:clean(recipe.servings),type:clean(recipe.type||recipe.category),
    cuisine:(recipe.cuisine||[]).map(clean),dietary:(recipe.dietary||[]).map(clean),traits:(recipe.traits||[]).map(clean),
    ingredients:(recipe.ingredients||[]).map(i=>({unit:clean(i?.unit),name:clean(i?.name),note:clean(i?.note)})),
    steps:(recipe.steps||[]).map(clean),equipment:(recipe.equipment||[]).map(clean),notes:clean(recipe.notes),nutrition:clean(recipe.nutrition)
  };
}
function snapshotSegments(snapshot){
  const segments=[snapshot.title,snapshot.description,snapshot.servings,snapshot.type,...snapshot.cuisine,...snapshot.dietary,...snapshot.traits];
  for(const i of snapshot.ingredients)segments.push(i.unit,i.name,i.note);
  segments.push(...snapshot.steps,...snapshot.equipment,snapshot.notes,snapshot.nutrition);
  return segments;
}
function snapshotFromSegments(base,values){
  let p=0;const take=()=>values[p++]??'';
  const out={title:take(),description:take(),servings:take(),type:take(),cuisine:base.cuisine.map(()=>take()),dietary:base.dietary.map(()=>take()),traits:base.traits.map(()=>take()),ingredients:[]};
  for(const _ of base.ingredients)out.ingredients.push({unit:take(),name:take(),note:take()});
  out.steps=base.steps.map(()=>take());out.equipment=base.equipment.map(()=>take());out.notes=take();out.nutrition=take();return out;
}
export async function ensureRecipeTranslations(recipe={},fallbackLanguage='en'){
  const source=normalizeLanguageCode(recipe.sourceLanguage)||detectLanguage(recipeSourceText(recipe),fallbackLanguage);
  const original=recipeSnapshot(recipe);
  const translations={};const failures=[];
  for(const lang of SUPPORTED_LANGUAGES){
    if(lang===source)continue;
    try{const values=await translateSegments(snapshotSegments(original),source,lang);translations[lang]=snapshotFromSegments(original,values);}
    catch{failures.push(lang);}
  }
  recipe.sourceLanguage=source;recipe.translations=translations;recipe.translationUpdatedAt=Date.now();recipe.translationMissing=failures;
  return recipe;
}
export function localizedRecipe(recipe={},lang='en'){
  lang=normalizeLanguageCode(lang)||'en';const tr=recipe.translations?.[lang];if(!tr)return recipe;
  return {...recipe,title:tr.title||recipe.title,description:tr.description||recipe.description,servings:tr.servings||recipe.servings,type:tr.type||recipe.type,
    cuisine:Array.isArray(tr.cuisine)&&tr.cuisine.length===recipe.cuisine?.length?tr.cuisine:recipe.cuisine,dietary:Array.isArray(tr.dietary)&&tr.dietary.length===recipe.dietary?.length?tr.dietary:recipe.dietary,traits:Array.isArray(tr.traits)&&tr.traits.length===recipe.traits?.length?tr.traits:recipe.traits,
    ingredients:(recipe.ingredients||[]).map((i,idx)=>({...i,unit:tr.ingredients?.[idx]?.unit||i.unit,name:tr.ingredients?.[idx]?.name||i.name,note:tr.ingredients?.[idx]?.note||i.note})),
    steps:Array.isArray(tr.steps)&&tr.steps.length===recipe.steps?.length?tr.steps:recipe.steps,
    equipment:Array.isArray(tr.equipment)&&tr.equipment.length===recipe.equipment?.length?tr.equipment:recipe.equipment,
    notes:tr.notes||recipe.notes,nutrition:tr.nutrition||recipe.nutrition};
}

function fnv1a(text=''){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(36);}
export function textTranslationKey(text=''){return `tx_${fnv1a(clean(text).toLowerCase())}`;}
export async function makeTextTranslationEntry(text='',fallbackLanguage='en'){
  const original=clean(text);const source=detectLanguage(original,fallbackLanguage);const values={[source]:original};const failures=[];
  for(const lang of SUPPORTED_LANGUAGES){if(lang===source)continue;try{values[lang]=await translateText(original,source,lang);}catch{failures.push(lang);}}
  return {original,sourceLanguage:source,values,updatedAt:Date.now(),missing:failures};
}
export function localizedText(text='',lang='en',cache={}){
  const original=clean(text);if(!original)return original;const entry=cache?.[textTranslationKey(original)];return entry?.values?.[normalizeLanguageCode(lang)||'en']||original;
}
export function textVariants(text='',cache={}){
  const original=clean(text);const entry=cache?.[textTranslationKey(original)];return [...new Set([original,...Object.values(entry?.values||{})].filter(Boolean))];
}
export function translationEntryFromValues(original='',sourceLanguage='en',values={}){
  const source=normalizeLanguageCode(sourceLanguage)||detectLanguage(original,'en');return {original:clean(original),sourceLanguage:source,values:{[source]:clean(original),...values},updatedAt:Date.now(),missing:SUPPORTED_LANGUAGES.filter(l=>!values?.[l]&&l!==source)};
}
