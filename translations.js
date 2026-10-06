export const SUPPORTED_LANGUAGES=['en','fi','it'];
export const TRANSLATION_ENGINE_VERSION=20;

const LANGUAGE_HINTS={
  fi:['ainekset','ainesosat','valmistus','ohje','ohjeet','lisää','sekoita','paista','keitä','uunissa','minuuttia','tuntia','annosta','tarjoile','sokeri','jauho','voi','kananmuna','maito','kerma','sipuli','valkosipuli','tomaatti','peruna','suola','pippuri','öljy','leipä','ruokalusikallinen','teelusikallinen','rkl','tl','dl'],
  it:['ingredienti','procedimento','preparazione','aggiungi','mescola','cuoci','inforna','forno','minuti','ore','porzioni','servire','zucchero','farina','burro','uovo','uova','latte','panna','cipolla','aglio','pomodoro','patata','sale','pepe','olio','pane','cucchiaio','cucchiaino','tazza'],
  en:['ingredients','instructions','directions','method','add','mix','stir','bake','cook','oven','minutes','hours','servings','serve','sugar','flour','butter','egg','eggs','milk','cream','onion','garlic','tomato','potato','salt','pepper','oil','bread','tablespoon','teaspoon','cup']
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
  const raw=clean(text);if(!raw)return fallback;
  const n=norm(raw);if(SHORT_WORD_HINTS[n])return SHORT_WORD_HINTS[n];
  const scores={en:0,fi:0,it:0};
  for(const lang of SUPPORTED_LANGUAGES){
    for(const hint of LANGUAGE_HINTS[lang]){
      const h=norm(hint);if(!h)continue;
      const re=new RegExp(`(?:^|\\s)${h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\s)`,'i');
      if(re.test(n))scores[lang]+=h.length>6?2:1;
    }
  }
  if(/[äöå]/i.test(raw))scores.fi+=3;
  if(/\b(?:gli|della|delle|degli|alla|con|per|quanto basta)\b/i.test(raw))scores.it+=2;
  if(/\b(?:the|with|until|into|then|and|for)\b/i.test(raw))scores.en+=2;
  const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  if(ranked[0][1]===0||ranked[0][1]===ranked[1][1])return fallback;
  return ranked[0][0];
}

/*
 * Deterministic recipe vocabulary.
 * These values never depend on a remote translation service, so the most common
 * pantry/ingredient/category words stay identical across devices and edits.
 */
const LOCAL_TERMS=[];
function term(en,fi,it,enAliases=[],fiAliases=[],itAliases=[]){LOCAL_TERMS.push({en,fi,it,aliases:{en:[en,...enAliases],fi:[fi,...fiAliases],it:[it,...itAliases]}});}
// Taxonomy / section vocabulary
term('Recipe','Resepti','Ricetta');term('Main','Pääruoka','Piatto principale');term('Pasta','Pasta','Pasta');term('Soup','Keitto','Zuppa');term('Salad','Salaatti','Insalata');term('Breakfast','Aamiainen','Colazione');term('Drink','Juoma','Bevanda');term('Sauce','Kastike','Salsa');term('Baking','Leivonta','Prodotti da forno');term('Dessert','Jälkiruoka','Dolce');term('Side','Lisuke','Contorno');term('Snack','Välipala','Spuntino');
term('Italian','Italialainen','Italiana',['Italian cuisine'],['italialainen keittiö'],['italiano','italiana']);term('Finnish','Suomalainen','Finlandese');term('Mexican','Meksikolainen','Messicana');term('Indian','Intialainen','Indiana');term('Asian','Aasialainen','Asiatica');
term('Vegetarian','Kasvis','Vegetariana',['vegetarian'],['kasvisruoka'],['vegetariano']);term('Vegan','Vegaaninen','Vegana',['vegan'],['vegaani'],['vegano']);term('Quick','Nopea','Veloce');term('Easy','Helppo','Facile');term('High protein','Runsasproteiininen','Ricca di proteine',['high-protein'],['proteiinipitoinen'],['alto contenuto proteico']);
term('Dough','Taikina','Impasto');term('Filling','Täyte','Ripieno');term('Topping','Päälle','Copertura');term('Base','Pohja','Base');term('Sauce','Kastike','Salsa');
// Units. Metric/imperial symbols remain unchanged where appropriate.
term('g','g','g');term('kg','kg','kg');term('mg','mg','mg');term('ml','ml','ml');term('cl','cl','cl');term('dl','dl','dl');term('l','l','l');term('oz','oz','oz',['ounce','ounces']);term('lb','lb','lb',['lbs','pound','pounds']);
term('tbsp','rkl','cucchiaio');term('tablespoon','rkl','cucchiaio',['tablespoon'],['ruokalusikallinen'],['cucchiaio']);term('tablespoons','rkl','cucchiai',['tablespoons'],['ruokalusikallista'],['cucchiai']);
term('tsp','tl','cucchiaino');term('teaspoon','tl','cucchiaino',['teaspoon'],['teelusikallinen'],['cucchiaino']);term('teaspoons','tl','cucchiaini',['teaspoons'],['teelusikallista'],['cucchiaini']);
term('cup','kuppi','tazza',['cup'],['kuppi','kupillinen'],['tazza']);term('cups','kuppia','tazze',['cups'],['kupillista'],['tazze']);
term('pinch','ripaus','pizzico',['pinches'],['hyppysellinen'],['pizzichi']);
term('clove','kynsi','spicchio');term('cloves','kynttä','spicchi',[],['kyntta'],[]);
term('can','prk','lattina',['cans','tin','tins'],['purkki'],['lattine']);
term('packet','pkt','confezione',['package','packages','packets'],['paketti','pussi','ps'],['confezioni','bustina','bustine']);
term('slice','viipale','fetta',['slices'],['viipaletta'],['fette']);term('piece','kpl','pezzo',['pieces'],['kappale','kappaletta'],['pezzi']);term('bunch','nippu','mazzetto',['bunches'],[],['mazzo']);term('handful','kourallinen','manciata',['handfuls'],[],['manciate']);
// Common ingredients
term('tomato','tomaatti','pomodoro');term('tomatoes','tomaatit','pomodori');term('cherry tomatoes','kirsikkatomaatit','pomodorini');
term('onion','sipuli','cipolla');term('onions','sipulit','cipolle');term('garlic','valkosipuli','aglio');term('egg','kananmuna','uovo');term('eggs','kananmunat','uova');
term('flour','jauho','farina');term('bread flour','leipäjauho','farina per pane');term('all-purpose flour','vehnäjauho','farina per tutti gli usi',['plain flour'],['vehnäjauhot'],[]);
term('sugar','sokeri','zucchero');term('granulated sugar','kidesokeri','zucchero semolato');term('powdered sugar','tomusokeri','zucchero a velo',['icing sugar','confectioners sugar']);term('brown sugar','fariinisokeri','zucchero di canna');
term('butter','voi','burro');term('unsalted butter','suolaton voi','burro non salato');term('milk','maito','latte');term('whole milk','täysmaito','latte intero');term('cream','kerma','panna');term('heavy cream','kuohukerma','panna fresca');term('cream cheese','tuorejuusto','formaggio cremoso');term('yogurt','jogurtti','yogurt');
term('parmesan','parmesaani','parmigiano');term('mozzarella','mozzarella','mozzarella');term('cheese','juusto','formaggio');
term('pasta','pasta','pasta');term('spaghetti','spagetti','spaghetti');term('penne','penne','penne');term('fusilli','fusilli','fusilli');term('tagliatelle','tagliatelle','tagliatelle');term('linguine','linguine','linguine');term('macaroni','makaroni','maccheroni');term('rice','riisi','riso');
term('potato','peruna','patata');term('potatoes','perunat','patate');term('carrot','porkkana','carota');term('carrots','porkkanat','carote');term('celery','selleri','sedano');term('bell pepper','paprika','peperone');term('zucchini','kesäkurpitsa','zucchina',['courgette']);term('zucchinis','kesäkurpitsat','zucchine',['courgettes']);term('eggplant','munakoiso','melanzana',['aubergine']);term('eggplants','munakoisot','melanzane',['aubergines']);term('mushroom','sieni','fungo');term('mushrooms','sienet','funghi');
term('chicken','kana','pollo');term('beef','naudanliha','manzo');term('pork','sianliha','maiale');term('salmon','lohi','salmone');term('tuna','tonnikala','tonno');
term('olive oil','oliiviöljy','olio d’oliva');term('extra virgin olive oil','ekstra-neitsytoliiviöljy','olio extravergine di oliva');term('oil','öljy','olio');term('salt','suola','sale');term('pepper','pippuri','pepe');term('black pepper','mustapippuri','pepe nero');
term('basil','basilika','basilico');term('parsley','persilja','prezzemolo');term('rosemary','rosmariini','rosmarino');term('thyme','timjami','timo');term('oregano','oregano','origano');
term('lemon','sitruuna','limone');term('lemons','sitruunat','limoni');term('orange','appelsiini','arancia');term('oranges','appelsiinit','arance');term('apple','omena','mela');term('apples','omenat','mele');term('banana','banaani','banana');term('strawberry','mansikka','fragola');term('strawberries','mansikat','fragole');term('blueberry','mustikka','mirtillo');term('blueberries','mustikat','mirtilli');
term('chocolate','suklaa','cioccolato');term('dark chocolate','tumma suklaa','cioccolato fondente');term('chocolate chips','suklaahiput','gocce di cioccolato');term('dark chocolate chips','tummat suklaahiput','gocce di cioccolato fondente');
term('yeast','hiiva','lievito');term('dry yeast','kuivahiiva','lievito secco');term('active dry yeast','aktiivikuivahiiva','lievito di birra secco');term('baking powder','leivinjauhe','lievito per dolci');term('baking soda','ruokasooda','bicarbonato di sodio');
term('vanilla','vanilja','vaniglia');term('vanilla extract','vaniljauute','estratto di vaniglia');term('honey','hunaja','miele');term('rum','rommi','rum');term('water','vesi','acqua');
term('stock','liemi','brodo');term('vegetable stock','kasvisliemi','brodo vegetale');term('chicken stock','kanaliemi','brodo di pollo');term('bread','leipä','pane');term('breadcrumbs','korppujauho','pangrattato');term('oats','kaura','avena');
// Common preparation notes
term('optional','valinnainen','facoltativo');term('to taste','maun mukaan','q.b.',['as needed'],['maun mukaan'],['quanto basta']);term('for serving','tarjoiluun','per servire');term('for garnish','koristeluun','per guarnire');term('divided','jaettuna','diviso');term('chopped','pilkottuna','tritato');term('finely chopped','hienonnettuna','tritato finemente');term('roughly chopped','karkeasti pilkottuna','tritato grossolanamente');term('diced','kuutioituna','a cubetti');term('sliced','viipaloituna','affettato');term('minced','hienonnettuna','tritato finemente');term('crushed','murskattuna','schiacciato');term('grated','raastettuna','grattugiato');term('melted','sulatettuna','fuso');term('softened','pehmennettynä','ammorbidito');term('room temperature','huoneenlämpöisenä','a temperatura ambiente');term('drained','valutettuna','scolato');term('rinsed','huuhdeltuna','sciacquato');term('zest only','vain kuori','solo scorza');

const TERM_INDEX={en:new Map(),fi:new Map(),it:new Map()};
for(const item of LOCAL_TERMS){for(const lang of SUPPORTED_LANGUAGES){for(const alias of item.aliases[lang]||[]){const key=norm(alias);if(key&&!TERM_INDEX[lang].has(key))TERM_INDEX[lang].set(key,item);}}}
const LOCALES={en:'en-US',fi:'fi-FI',it:'it-IT'};
function localeFor(lang='en'){return LOCALES[normalizeLanguageCode(lang)||'en']||'en-US';}
const KNOWN_ACRONYMS=new Set(['BBQ','BLT','PB','PBJ','MSG','IPA','USA','US','EU','AI']);
function preserveAcronyms(original='',lowered=''){
  const src=clean(original).split(/(\s+)/),out=String(lowered||'').split(/(\s+)/);
  if(src.length!==out.length)return lowered;
  return out.map((part,i)=>{const token=(src[i]||'').replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi,'');return KNOWN_ACRONYMS.has(token.toUpperCase())?part.replace(token.toLocaleLowerCase('en-US'),token.toUpperCase()):part;}).join('');
}
function lowerPhrase(value='',lang='en'){
  const src=clean(value);if(!src)return '';
  const lowered=src.toLocaleLowerCase(localeFor(lang));
  return preserveAcronyms(src,lowered);
}
function upperFirst(value='',lang='en'){
  const src=clean(value);if(!src)return '';
  const chars=Array.from(src);chars[0]=chars[0].toLocaleUpperCase(localeFor(lang));return chars.join('');
}
function sentenceCase(value='',lang='en'){
  const src=lowerPhrase(value,lang);return upperFirst(src,lang);
}
function sentenceLead(value='',lang='en'){
  const src=clean(value);return upperFirst(src,lang);
}
export function formatLocalizedValue(value='',kind='generic',lang='en'){
  const src=clean(value);if(!src)return '';
  switch(kind){
    case 'title': return sentenceCase(src,lang);
    case 'taxonomy':
    case 'section': return sentenceCase(src,lang);
    case 'ingredient':
    case 'ingredientName':
    case 'ingredient-note':
    case 'note':
    case 'unit':
    case 'servings':
    case 'equipment': return lowerPhrase(src,lang);
    case 'step':
    case 'description':
    case 'notes':
    case 'nutrition': return sentenceLead(src,lang);
    default: return src;
  }
}
export function deterministicTranslation(text,source,target,kind='generic'){
  const src=clean(text);source=normalizeLanguageCode(source);target=normalizeLanguageCode(target);
  if(!src||!source||!target||source===target)return src;
  const item=TERM_INDEX[source].get(norm(src));if(!item)return '';
  return formatLocalizedValue(item[target]||src,kind,target);
}

function fnv1a(text=''){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(36);}
const MEMORY_KEY='recipe-vault-translation-memory-v20';
let memoryCache=null;
function loadMemory(){
  if(memoryCache)return memoryCache;memoryCache={};
  try{if(typeof localStorage!=='undefined'){const raw=JSON.parse(localStorage.getItem(MEMORY_KEY)||'{}');if(raw&&typeof raw==='object')memoryCache=raw;}}catch{}
  return memoryCache;
}
function memoryKey(text,source,target){return `${source}>${target}:${fnv1a(clean(text))}`;}
function memoryGet(text,source,target){const item=loadMemory()[memoryKey(text,source,target)];return item&&item.s===clean(text)?clean(item.t):'';}
function memorySet(text,source,target,value){
  const src=clean(text),out=clean(value);if(!src||!out)return;
  const mem=loadMemory();mem[memoryKey(src,source,target)]={s:src,t:out,u:Date.now()};
  const keys=Object.keys(mem);if(keys.length>1500){keys.sort((a,b)=>(mem[a].u||0)-(mem[b].u||0));for(const k of keys.slice(0,keys.length-1200))delete mem[k];}
  try{if(typeof localStorage!=='undefined')localStorage.setItem(MEMORY_KEY,JSON.stringify(mem));}catch{}
}

export function clearTranslationMemory(){
  memoryCache={};
  try{if(typeof localStorage!=='undefined')localStorage.removeItem(MEMORY_KEY);}catch{}
}


function decodeEntities(text=''){
  if(typeof document!=='undefined'){const ta=document.createElement('textarea');ta.innerHTML=String(text||'');return ta.value;}
  return String(text||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
async function fetchJson(url,timeoutMs=15000){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{const res=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!res.ok)throw new Error(`Translation HTTP ${res.status}`);return await res.json();}
  finally{clearTimeout(timer);}
}
function plausibleTranslation(source,target){
  const s=clean(source),t=clean(target);if(!t)return false;
  if(/MYMEMORY WARNING|QUERY LENGTH LIMIT|PLEASE SELECT|INVALID LANGUAGE/i.test(t))return false;
  if(s.length>20&&(t.length>s.length*4.5||t.length<s.length*0.12))return false;
  return true;
}
async function googleTranslate(text,source,target){
  const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl='+encodeURIComponent(source||'auto')+'&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
  const data=await fetchJson(url,16000);const value=(data?.[0]||[]).map(part=>part?.[0]||'').join('');
  if(!plausibleTranslation(text,value))throw new Error('Implausible translation');return clean(value);
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
  for(const chunk of chunks){const url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(chunk)+'&langpair='+encodeURIComponent(`${source}|${target}`);const data=await fetchJson(url,16000);const value=decodeEntities(data?.responseData?.translatedText||'');if(!plausibleTranslation(chunk,value))throw new Error('Implausible fallback translation');out.push(clean(value));}
  return out.join(' ');
}
export async function translateText(text,source,target,kind='generic'){
  const src=clean(text);source=normalizeLanguageCode(source)||detectLanguage(src,'en');target=normalizeLanguageCode(target)||target;
  if(!src||!SUPPORTED_LANGUAGES.includes(target)||source===target)return src;
  const local=deterministicTranslation(src,source,target,kind);if(local)return local;
  const remembered=memoryGet(src,source,target);if(remembered)return formatLocalizedValue(remembered,kind,target);
  try{const value=formatLocalizedValue(await googleTranslate(src,source,target),kind,target);memorySet(src,source,target,value);return value;}catch(first){
    try{const value=formatLocalizedValue(await myMemoryTranslate(src,source,target),kind,target);memorySet(src,source,target,value);return value;}catch(second){console.warn('Translation failed',source,target,first,second);throw second;}
  }
}

const SEP='\n<<<RV_TRANSLATION_SEGMENT>>>\n';
function batchSegments(segments,maxChars=3000){
  const groups=[];let group=[];let length=0;
  for(const raw of segments){const s=clean(raw);const add=s.length+(group.length?SEP.length:0);if(group.length&&length+add>maxChars){groups.push(group);group=[];length=0;}group.push(s);length+=add;}
  if(group.length)groups.push(group);return groups;
}
async function translateRemoteBatch(group,source,target,kind='generic'){
  if(group.length===1)return [await translateText(group[0],source,target,kind)];
  try{
    const translated=await googleTranslate(group.join(SEP),source,target);
    const parts=translated.split(/\s*<<<RV_TRANSLATION_SEGMENT>>>\s*/g).map((p)=>formatLocalizedValue(clean(p),kind,target));
    if(parts.length===group.length&&parts.every((p,i)=>plausibleTranslation(group[i],p))){parts.forEach((p,i)=>memorySet(group[i],source,target,p));return parts;}
  }catch{}
  const out=[];for(const s of group)out.push(await translateText(s,source,target,kind));return out;
}
export async function translateSegments(segments,source,target){
  source=normalizeLanguageCode(source)||detectLanguage(segments.join(' '),'en');target=normalizeLanguageCode(target)||target;
  const cleaned=segments.map(clean);if(source===target)return cleaned;
  const out=[...cleaned],pending=[];
  cleaned.forEach((text,index)=>{if(!text)return;const local=deterministicTranslation(text,source,target);if(local)out[index]=local;else{const remembered=memoryGet(text,source,target);if(remembered)out[index]=remembered;else pending.push({text,index});}});
  for(const group of batchSegments(pending.map(x=>x.text))){const translated=await translateRemoteBatch(group,source,target);for(let i=0;i<group.length;i++){const item=pending.shift();if(item)out[item.index]=translated[i]??item.text;}}
  return out;
}

function recipeSourceText(recipe={}){return [recipe.title,recipe.description,recipe.servings,recipe.type,...(recipe.cuisine||[]),...(recipe.dietary||[]),...(recipe.traits||[]),...(recipe.ingredients||[]).flatMap(i=>[i?.name,i?.note]),...(recipe.steps||[]),...(recipe.equipment||[]),recipe.notes,recipe.nutrition].filter(Boolean).join('\n');}
function recipeSnapshot(recipe={}){
  return {title:clean(recipe.title),description:clean(recipe.description),servings:clean(recipe.servings),type:clean(recipe.type||recipe.category),cuisine:(recipe.cuisine||[]).map(clean),dietary:(recipe.dietary||[]).map(clean),traits:(recipe.traits||[]).map(clean),ingredients:(recipe.ingredients||[]).map(i=>({unit:clean(i?.unit),name:clean(i?.name),note:clean(i?.note)})),steps:(recipe.steps||[]).map(clean),equipment:(recipe.equipment||[]).map(clean),notes:clean(recipe.notes),nutrition:clean(recipe.nutrition)};
}
function snapshotDescriptors(snapshot){
  const out=[{text:snapshot.title,kind:'title'},{text:snapshot.description,kind:'description'},{text:snapshot.servings,kind:'servings'},{text:snapshot.type,kind:'taxonomy'}];
  for(const x of snapshot.cuisine)out.push({text:x,kind:'taxonomy'});for(const x of snapshot.dietary)out.push({text:x,kind:'taxonomy'});for(const x of snapshot.traits)out.push({text:x,kind:'taxonomy'});
  for(const i of snapshot.ingredients){out.push({text:i.unit,kind:'unit'},{text:i.name,kind:'ingredient'},{text:i.note,kind:'note'});}
  for(const x of snapshot.steps)out.push({text:x,kind:'step'});for(const x of snapshot.equipment)out.push({text:x,kind:'equipment'});out.push({text:snapshot.notes,kind:'notes'},{text:snapshot.nutrition,kind:'nutrition'});return out;
}
function snapshotFromValues(base,values){
  let p=0;const take=()=>values[p++]??'';const out={title:take(),description:take(),servings:take(),type:take(),cuisine:base.cuisine.map(()=>take()),dietary:base.dietary.map(()=>take()),traits:base.traits.map(()=>take()),ingredients:[]};
  for(const _ of base.ingredients)out.ingredients.push({unit:take(),name:take(),note:take()});out.steps=base.steps.map(()=>take());out.equipment=base.equipment.map(()=>take());out.notes=take();out.nutrition=take();return out;
}
function descriptorHash(d){return fnv1a(`${d.kind}\u0000${clean(d.text)}`);}
function sourceSignature(descriptors){return fnv1a(descriptors.map(descriptorHash).join('|'));}
function structurallyCompleteTranslation(base,tr){
  return Boolean(tr)&&Array.isArray(tr.cuisine)&&tr.cuisine.length===base.cuisine.length&&Array.isArray(tr.dietary)&&tr.dietary.length===base.dietary.length&&Array.isArray(tr.traits)&&tr.traits.length===base.traits.length&&Array.isArray(tr.ingredients)&&tr.ingredients.length===base.ingredients.length&&Array.isArray(tr.steps)&&tr.steps.length===base.steps.length&&Array.isArray(tr.equipment)&&tr.equipment.length===base.equipment.length;
}
async function translateChangedDescriptors(descriptors,source,target,existingValues=[],oldHashes=[]){
  const values=new Array(descriptors.length).fill('');const hashes=descriptors.map(descriptorHash);const pending=[];
  for(let i=0;i<descriptors.length;i++){
    const d=descriptors[i],src=clean(d.text);if(!src){values[i]='';continue;}
    const local=deterministicTranslation(src,source,target,d.kind);if(local){values[i]=formatLocalizedValue(local,d.kind,target);continue;}
    if(oldHashes[i]===hashes[i]&&clean(existingValues[i])){values[i]=formatLocalizedValue(existingValues[i],d.kind,target);continue;}
    // A v18 translation has no hashes. Adopt it once rather than needlessly
    // changing wording; deterministic vocabulary above still replaces common terms.
    if(!oldHashes.length&&clean(existingValues[i])){values[i]=formatLocalizedValue(existingValues[i],d.kind,target);continue;}
    const remembered=memoryGet(src,source,target);if(remembered){values[i]=formatLocalizedValue(remembered,d.kind,target);continue;}
    pending.push({i,text:src,kind:d.kind});
  }
  // Batch by semantic field type. This avoids translating ingredient names in the
  // same request as prose instructions, which was a source of inconsistent wording.
  const kinds=[...new Set(pending.map(x=>x.kind))];
  for(const kind of kinds){
    const items=pending.filter(x=>x.kind===kind);
    for(const group of batchSegments(items.map(x=>x.text))){
      const translated=await translateRemoteBatch(group,source,target,kind);
      for(let j=0;j<group.length;j++){
        const item=items.shift();if(!item)continue;const value=formatLocalizedValue(translated[j]??item.text,item.kind,target);values[item.i]=value;memorySet(item.text,source,target,value);
      }
    }
  }
  return {values,hashes};
}
export async function ensureRecipeTranslations(recipe={},fallbackLanguage='en'){
  const source=normalizeLanguageCode(recipe.sourceLanguage)||detectLanguage(recipeSourceText(recipe),fallbackLanguage);
  const original=recipeSnapshot(recipe),descriptors=snapshotDescriptors(original),signature=sourceSignature(descriptors);
  const translations={...(recipe.translations||{})},meta={...(recipe.translationMeta||{})},failures=[];
  for(const lang of SUPPORTED_LANGUAGES){
    if(lang===source)continue;
    const existing=translations[lang],validExisting=structurallyCompleteTranslation(original,existing);
    const existingValues=validExisting?snapshotDescriptors(existing).map(x=>x.text):[];
    const old=meta[lang]||{};
    if(old.complete&&old.sourceSignature===signature&&old.engineVersion===TRANSLATION_ENGINE_VERSION&&validExisting)continue;
    try{
      const {values,hashes}=await translateChangedDescriptors(descriptors,source,lang,existingValues,Array.isArray(old.hashes)?old.hashes:[]);
      translations[lang]=snapshotFromValues(original,values);
      meta[lang]={complete:true,sourceSignature:signature,hashes,engineVersion:TRANSLATION_ENGINE_VERSION,updatedAt:Date.now()};
    }catch(err){
      console.warn('Recipe translation incomplete',lang,err);failures.push(lang);
      meta[lang]={...old,complete:false,sourceSignature:signature,engineVersion:TRANSLATION_ENGINE_VERSION,updatedAt:Date.now()};
    }
  }
  recipe.sourceLanguage=source;recipe.translations=translations;recipe.translationMeta=meta;recipe.translationUpdatedAt=Date.now();recipe.translationMissing=failures;return recipe;
}
export function recipeTranslationReady(recipe={},lang='en'){
  lang=normalizeLanguageCode(lang)||'en';const source=normalizeLanguageCode(recipe.sourceLanguage)||detectLanguage(recipeSourceText(recipe),'en');if(lang===source)return true;
  const tr=recipe.translations?.[lang];if(!tr)return false;
  const base=recipeSnapshot(recipe);if(!structurallyCompleteTranslation(base,tr))return false;
  const meta=recipe.translationMeta?.[lang];
  if(!meta)return !(recipe.translationMissing||[]).includes(lang); // legacy v18 translation
  const signature=sourceSignature(snapshotDescriptors(base));return Boolean(meta.complete&&meta.sourceSignature===signature);
}
export function localizedRecipe(recipe={},lang='en'){
  lang=normalizeLanguageCode(lang)||'en';
  const ready=recipeTranslationReady(recipe,lang),tr=ready?recipe.translations?.[lang]:null;
  const source={
    title:tr?.title||recipe.title,description:tr?.description||recipe.description,servings:tr?.servings||recipe.servings,type:tr?.type||recipe.type,
    cuisine:tr?.cuisine||recipe.cuisine||[],dietary:tr?.dietary||recipe.dietary||[],traits:tr?.traits||recipe.traits||[],
    steps:tr?.steps||recipe.steps||[],equipment:tr?.equipment||recipe.equipment||[],notes:tr?.notes||recipe.notes,nutrition:tr?.nutrition||recipe.nutrition
  };
  return {...recipe,
    title:formatLocalizedValue(source.title,'title',lang),
    description:formatLocalizedValue(source.description,'description',lang),
    servings:formatLocalizedValue(source.servings,'servings',lang),
    type:formatLocalizedValue(source.type,'taxonomy',lang),
    cuisine:(source.cuisine||[]).map(x=>formatLocalizedValue(x,'taxonomy',lang)),
    dietary:(source.dietary||[]).map(x=>formatLocalizedValue(x,'taxonomy',lang)),
    traits:(source.traits||[]).map(x=>formatLocalizedValue(x,'taxonomy',lang)),
    ingredients:(recipe.ingredients||[]).map((i,idx)=>{const ti=tr?.ingredients?.[idx]||{};const group=i?.kind==='group';return {...i,
      unit:formatLocalizedValue(ti.unit||i.unit,'unit',lang),
      name:formatLocalizedValue(ti.name||i.name,group?'section':'ingredient',lang),
      note:formatLocalizedValue(ti.note||i.note,'ingredient-note',lang)};}),
    steps:(source.steps||[]).map(x=>formatLocalizedValue(x,'step',lang)),
    equipment:(source.equipment||[]).map(x=>formatLocalizedValue(x,'equipment',lang)),
    notes:formatLocalizedValue(source.notes,'notes',lang),nutrition:formatLocalizedValue(source.nutrition,'nutrition',lang)};
}

export function textTranslationKey(text=''){return `tx_${fnv1a(clean(text).toLowerCase())}`;}
export async function makeTextTranslationEntry(text='',fallbackLanguage='en'){
  const original=clean(text),source=detectLanguage(original,fallbackLanguage),values={[source]:original},failures=[];
  for(const lang of SUPPORTED_LANGUAGES){if(lang===source)continue;try{values[lang]=await translateText(original,source,lang,'ingredient');}catch{failures.push(lang);}}
  for(const lang of Object.keys(values))values[lang]=formatLocalizedValue(values[lang],'ingredient',lang);
  return {original,sourceLanguage:source,values,engineVersion:TRANSLATION_ENGINE_VERSION,updatedAt:Date.now(),missing:failures};
}
export function localizedText(text='',lang='en',cache={},kind='ingredient'){const original=clean(text);if(!original)return original;lang=normalizeLanguageCode(lang)||'en';const entry=cache?.[textTranslationKey(original)];return formatLocalizedValue(entry?.values?.[lang]||original,kind,lang);}
export function textVariants(text='',cache={}){const original=clean(text),entry=cache?.[textTranslationKey(original)];return [...new Set([original,...Object.values(entry?.values||{})].filter(Boolean))];}
export function translationEntryFromValues(original='',sourceLanguage='en',values={}){
  const source=normalizeLanguageCode(sourceLanguage)||detectLanguage(original,'en');const merged={[source]:clean(original),...values};
  for(const lang of Object.keys(merged))merged[lang]=formatLocalizedValue(merged[lang],'ingredient',lang);
  return {original:clean(original),sourceLanguage:source,values:merged,engineVersion:TRANSLATION_ENGINE_VERSION,updatedAt:Date.now(),missing:SUPPORTED_LANGUAGES.filter(l=>!merged?.[l])};
}
