export const SCHEMA_VERSION = 19;

const TYPE_RULES = [
  ['Dessert', /\b(cake|cheesecake|cookie|cookies|brownie|dessert|pudding|tart|ice cream|kakku|jälkiruoka|dolce|torta|biscotti)\b/i],
  ['Pasta', /\b(pasta|spaghetti|spagetti|penne|tagliatelle|linguine|macaroni|maccheroni|fusilli|rigatoni|farfalle|orecchiette|lasagna|lasagne|makaroni|gnocchi)\b/i],
  ['Soup', /\b(soup|broth|bisque|stew|keitto|liemi|zuppa|brodo|minestra)\b/i],
  ['Salad', /\b(salad|salaatti|insalata)\b/i],
  ['Breakfast', /\b(breakfast|oatmeal|porridge|pancakes?|omelettes?|granola|aamiainen|puuro|pannukakku|lettu|colazione|frittata)\b/i],
  ['Drink', /\b(cocktail|smoothie|drink|lemonade|juoma|bevanda|limonata)\b/i],
  ['Sauce', /\b(sauce|dressing|dip|pesto|kastike|salsa|condimento)\b/i],
  ['Baking', /\b(panettone|bread|focaccia|bun|buns|dough|muffins?|scones?|leipä|pulla|taikina|pane|impasto)\b/i],
  ['Main', /\b(chicken|beef|pork|salmon|tofu|rice|curry|risotto|pizza|kana|nauta|possu|lohi|riisi|pollo|manzo|maiale|salmone|riso)\b/i]
];
const CUISINE_RULES = [
  ['Italian', /\b(italian|italiano|italiana|parmigiano|mozzarella|basilico|pomodoro|risotto|gnocchi|pizza|panettone|focaccia|carbonara|amatriciana|bolognese|pesto genovese)\b/i],
  ['Finnish', /\b(finnish|suomalainen|karjalan|lohikeitto|rieska|korvapuusti)\b/i],
  ['Mexican', /\b(mexican|tacos?|tortilla|guacamole|quesadilla)\b/i],
  ['Indian', /\b(indian|garam masala|tikka|dal|dahl|naan)\b/i],
  ['Asian', /\b(soy sauce|sesame oil|miso|gochujang|rice vinegar|noodles|soijakastike|seesamiöljy)\b/i]
];
const DIET_RULES = [
  ['Vegan', /\b(vegan|vegaaninen|vegano|vegana)\b/i],
  ['Vegetarian', /\b(vegetarian|kasvis|vegetariano|vegetariana)\b/i]
];
const TRAIT_RULES = [
  ['Quick', /\b(quick|nopea|veloce)\b/i],
  ['Easy', /\b(easy|helppo|facile)\b/i],
  ['High protein', /\b(high protein|protein[- ]rich|proteiinipitoinen|alto contenuto proteico)\b/i]
];

export const STAPLE_CANONICALS = new Set([
  'salt','black pepper','sugar','flour','olive oil','oil','butter','water','garlic','onion','baking powder','baking soda','vanilla extract'
]);

function uniq(arr){ return [...new Set((arr||[]).map(x=>String(x||'').trim()).filter(Boolean))]; }
function plain(s=''){ return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
export function normalizeUrl(value=''){
  try{
    const u=new URL(value);
    u.hash='';
    for(const key of [...u.searchParams.keys()]) if(/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key))u.searchParams.delete(key);
    u.hostname=u.hostname.toLowerCase();
    if((u.protocol==='https:'&&u.port==='443')||(u.protocol==='http:'&&u.port==='80'))u.port='';
    let s=u.toString();
    if(u.pathname!=='/' && s.endsWith('/'))s=s.slice(0,-1);
    return s;
  }catch{return String(value||'').trim();}
}
export function sourceKeyFor(recipeOrSource={}){
  const source=recipeOrSource.source||recipeOrSource||{};
  if(source.sourceKey)return source.sourceKey;
  if(source.url)return `url:${normalizeUrl(source.url)}`;
  if(source.fileHash)return `file:${source.fileHash}`;
  return '';
}
export async function hashBlob(blob){
  const data=await blob.arrayBuffer();
  if(globalThis.crypto?.subtle){
    const digest=await crypto.subtle.digest('SHA-256',data);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  return quickHash(String(blob.size)+'|'+String(blob.type));
}
export function quickHash(text=''){
  let h=2166136261;
  for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0');
}

export function classifyRecipe(recipe={}){
  const ingredientText=(recipe.ingredients||[]).map(i=>i?.name||i?.ingredient||i?.raw||'').join(' ');
  const text=[recipe.title,recipe.description,recipe.category,(recipe.tags||[]).join(' '),ingredientText,(recipe.steps||[]).join(' ')].filter(Boolean).join('\n');
  const existingType=String(recipe.type||recipe.category||'').trim();
  let type=existingType && !/^recipe$/i.test(existingType) ? existingType : '';
  if(!type){ for(const [name,re] of TYPE_RULES){ if(re.test(text)){type=name;break;} } }
  if(!type)type='Recipe';
  const cuisine=uniq([...(recipe.cuisine||[]),...(recipe.tags||[]).filter(t=>CUISINE_RULES.some(([n])=>n===t)),...CUISINE_RULES.filter(([,re])=>re.test(text)).map(([n])=>n)]);
  const dietary=uniq([...(recipe.dietary||[]),...(recipe.tags||[]).filter(t=>DIET_RULES.some(([n])=>n===t)),...DIET_RULES.filter(([,re])=>re.test(text)).map(([n])=>n)]);
  const traits=uniq([...(recipe.traits||[]),...(recipe.tags||[]).filter(t=>TRAIT_RULES.some(([n])=>n===t)),...TRAIT_RULES.filter(([,re])=>re.test(text)).map(([n])=>n)]);
  // Long recipes should not be automatically branded Quick just because the word occurs.
  const total=durationMinutes(recipe.totalTime||'');
  const cleanTraits=traits.filter(t=>!(t==='Quick'&&Number.isFinite(total)&&total>45));
  return {type,cuisine,dietary,traits:cleanTraits};
}

export function durationMinutes(value=''){
  const s=String(value||'').toLowerCase().replace(/,/g,'.');
  if(!s.trim())return NaN;
  let mins=0,found=false;
  for(const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|tuntia?|ore?)\b/g)){mins+=Number(m[1])*60;found=true;}
  for(const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|min|m|minuuttia?|minuti?)\b/g)){mins+=Number(m[1]);found=true;}
  if(!found && /^\d+(?:\.\d+)?$/.test(s.trim()))return Number(s.trim());
  return found?mins:NaN;
}

export function splitLegacyNotes(notes=''){
  let text=String(notes||'').replace(/\r/g,'').trim();
  let nutrition='';
  const nutritionMatch=text.match(/(?:^|\n)\s*(?:nutrition|nutrition facts|ravintoarvot|ravintosisältö|valori nutrizionali)\s*\n([\s\S]*)$/i);
  if(nutritionMatch){nutrition=nutritionMatch[1].trim();text=text.slice(0,nutritionMatch.index).trim();}
  const paras=text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  let description='';
  if(paras.length && paras[0].length<=360 && !/^(tips?|notes?|vinkit|consigli)/i.test(paras[0])) description=paras.shift();
  return {description,notes:paras.join('\n\n'),nutrition};
}

export function upgradeRecipeSchema(recipe={}){
  const r=recipe;
  if(!('description' in r) || !('nutrition' in r)){
    const split=splitLegacyNotes(r.notes||'');
    if(!r.description)r.description=split.description;
    if(!r.nutrition)r.nutrition=split.nutrition;
    if(split.description||split.nutrition)r.notes=split.notes;
  }
  if(!Array.isArray(r.equipment))r.equipment=typeof r.equipment==='string'?r.equipment.split(/\n+/).map(x=>x.trim()).filter(Boolean):[];
  const tax=classifyRecipe(r);
  r.type=tax.type;
  r.cuisine=tax.cuisine;
  r.dietary=tax.dietary;
  r.traits=tax.traits;
  // Keep legacy fields for compatibility with older builds/backups.
  r.category=r.type;
  r.tags=uniq([...(r.cuisine||[]),...(r.dietary||[]),...(r.traits||[])]);
  r.source=r.source&&typeof r.source==='object'?r.source:{type:'manual',url:'',label:'',filename:''};
  r.source.sourceKey=sourceKeyFor(r);
  r.coverPreset=coverPresetFor(r);
  return r;
}

export function validateRecipe(recipe={}){
  const issues=[];
  const ingredients=(recipe.ingredients||[]).filter(i=>i&&i.kind!=='group');
  const steps=(recipe.steps||[]).filter(Boolean);
  const title=String(recipe.title||'').trim();
  if(!title || /untitled recipe/i.test(title))issues.push({level:'error',field:'title',code:'titleMissing',message:'Title was not detected.'});
  if(/(?:\b[a-z]{3,}\s+[a-z]{1,2}\s+[a-z]{2,}\b|(?:\b[a-z]{1,2}\s+){2,}[a-z]{2,}\b)/i.test(title))issues.push({level:'warning',field:'title',code:'titleSpacing',message:'Title contains suspicious spacing.'});
  if(ingredients.length<2)issues.push({level:'error',field:'ingredients',code:'fewIngredients',message:'Very few ingredients were detected.'});
  if(steps.length<1)issues.push({level:'error',field:'steps',code:'noSteps',message:'No preparation steps were detected.'});
  const suspicious=(ingredients.map(i=>String(i.name||i.raw||''))).filter(x=>/(?:\b[a-z]{3,}\s+[a-z]{1,2}\s+[a-z]{2,}\b|(?:\b[a-z]{1,2}\s+){2,}[a-z]{2,}\b|(?:\b[a-z]\s+[a-z]{3,}\b.*){2,})/i.test(x));
  if(suspicious.length)issues.push({level:'warning',field:'ingredients',code:'ingredientSpacing',count:suspicious.length,message:`${suspicious.length} ingredient line${suspicious.length===1?'':'s'} contain suspicious spacing.`});
  if(ingredients.length>0 && steps.length>ingredients.length*4)issues.push({level:'warning',field:'structure',code:'stepImbalance',message:'Instruction count is unusually high relative to ingredients.'});
  if(!recipe.servings)issues.push({level:'info',field:'servings',code:'servingsMissing',message:'Servings/yield was not detected.'});
  const stepTemps=(steps.join(' ').match(/\b\d{2,3}\s*°?\s*[CF]\b/ig)||[]);
  if(stepTemps.length && !recipe.temperature)issues.push({level:'warning',field:'temperature',code:'tempMissing',message:'An oven temperature appears in the instructions but the Oven field is empty.'});
  const prep=durationMinutes(recipe.prepTime),cook=durationMinutes(recipe.cookTime),rest=durationMinutes(recipe.restTime),total=durationMinutes(recipe.totalTime);
  const known=[prep,cook,rest].filter(Number.isFinite).reduce((a,b)=>a+b,0);
  if(Number.isFinite(total)&&known>0&&total+3<known)issues.push({level:'warning',field:'totalTime',code:'totalTooShort',message:'Total time is shorter than the component times.'});
  let score=100;
  for(const issue of issues)score-=issue.level==='error'?24:issue.level==='warning'?9:3;
  score=Math.max(0,Math.min(100,score));
  const grade=score>=88?'good':score>=68?'review':'poor';
  return {score,grade,issues,ingredientCount:ingredients.length,stepCount:steps.length};
}

export function ingredientRole(canonical='',optional=false){
  if(optional)return 'optional';
  return STAPLE_CANONICALS.has(String(canonical||''))?'staple':'main';
}

export function coverPresetFor(recipe={}){
  const type=String(recipe.type||recipe.category||'').toLowerCase();
  if(type==='dessert')return 'dessert';
  if(type==='pasta')return 'pasta';
  if(type==='soup')return 'soup';
  if(type==='breakfast')return 'breakfast';
  if(type==='drink')return 'drink';
  if(type==='salad')return 'salad';
  if(type==='baking')return 'baking';
  if(type==='sauce')return 'sauce';
  return 'recipe';
}
const COVER_MOTIFS={
  dessert:'<path d="M-145 70h250L60-80H-95z"/><path d="M-90-80Q-20-155 55-80"/><circle cx="28" cy="-142" r="25"/>',
  pasta:'<ellipse cx="0" cy="55" rx="185" ry="65"/><path d="M-155 40Q0-75 155 40"/><path d="M-85 18Q0-35 85 18"/>',
  soup:'<path d="M-180 10Q-150 145 0 155Q150 145 180 10Z"/><path d="M-205 10H205"/><path d="M-80-45Q-125-105-80-145M0-45Q-45-105 0-145M80-45Q35-105 80-145"/>',
  baking:'<path d="M-170 70Q-165-55-90-70Q-45-145 0-80Q45-145 90-70Q165-55 170 70Z"/><path d="M-145 70H145"/>',
  breakfast:'<circle cx="0" cy="20" r="160"/><circle cx="0" cy="20" r="65"/><path d="M-190-115L-125-65M190-115L125-65"/>',
  drink:'<path d="M-105-150H105L70 150H-70Z"/><path d="M20-150L95-230"/>',
  salad:'<path d="M-180 20Q-145 150 0 160Q145 150 180 20Z"/><path d="M-105-10Q-45-120 15-20M0-15Q70-125 115-5"/>',
  sauce:'<path d="M-160-40H160L100 145H-100Z"/><path d="M-70-90Q0-155 70-90"/>',
  recipe:'<path d="M-170-120Q-70-145 0-70Q70-145 170-120V135Q70 110 0 155Q-70 110-170 135Z"/><path d="M0-70V155"/>'
};
export function defaultCoverSvg(recipe={}){
  const preset=recipe.coverPreset||coverPresetFor(recipe);
  const title=String(recipe.title||recipe.type||'Recipe').replace(/[&<>"']/g,'').slice(0,32).toUpperCase();
  const motif=COVER_MOTIFS[preset]||COVER_MOTIFS.recipe;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#050505"/><rect x="60" y="60" width="1080" height="680" rx="52" fill="#121212" stroke="#2b2b2b" stroke-width="3"/><g transform="translate(600 305)" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">${motif}</g><text x="600" y="590" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="700">${title}</text><text x="600" y="645" text-anchor="middle" fill="#999" font-family="Arial,sans-serif" font-size="27" letter-spacing="5">${preset.toUpperCase()}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

export function compactIngredient(i={}){
  if(i.kind==='group')return {g:String(i.name||'')};
  const out={};
  if(i.qtyText)out.a=String(i.qtyText);
  else if(Number.isFinite(i.qty))out.a=String(i.qty);
  if(i.unit)out.u=String(i.unit);
  if(i.name)out.i=String(i.name);
  if(i.note)out.n=String(i.note);
  if(i.optional)out.o=1;
  return out;
}
function parseCompactQty(raw=''){const s=String(raw||'').trim();let m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/);if(m)return Number(m[1])+Number(m[2])/Number(m[3]);m=s.match(/^(\d+)\/(\d+)$/);if(m)return Number(m[1])/Number(m[2]);const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null;}
export function expandIngredient(i={}){
  if(typeof i==='string')return {kind:'ingredient',raw:i,qty:null,qtyText:'',unit:'',unitCanonical:'',name:i,optional:false};
  if(i.g!=null)return {kind:'group',name:String(i.g)};
  if('i' in i || 'a' in i || 'u' in i){
    const qtyText=String(i.a||'');
    return {kind:'ingredient',raw:[qtyText,i.u,i.i].filter(Boolean).join(' ')+(i.n?` (${i.n})`:''),qty:parseCompactQty(qtyText),qtyText,unit:String(i.u||''),unitCanonical:String(i.u||''),name:String(i.i||''),note:String(i.n||''),optional:Boolean(i.o)};
  }
  return i;
}
export function compactRecipe(recipe={}){
  const r=upgradeRecipeSchema({...recipe,source:{...(recipe.source||{})}});
  const out={
    id:r.id,t:r.title,ty:r.type,cu:r.cuisine||[],di:r.dietary||[],tr:r.traits||[],sv:r.servings||'',pt:r.prepTime||'',ct:r.cookTime||'',rt:r.restTime||'',tt:r.totalTime||'',temp:r.temperature||'',au:r.author||'',d:r.description||'',
    ing:(r.ingredients||[]).map(compactIngredient),st:r.steps||[],eq:r.equipment||[],no:r.notes||'',nu:r.nutrition||'',fav:r.favorite?1:0,
    src:r.source||{},img:(/^data:/i.test(String(r.imageUrl||''))?'':(r.imageUrl||'')),mid:r.mediaId||'',mt:r.mediaType||'',tid:r.thumbnailId||'',cid:r.coverMediaId||'',cp:r.coverPreset||'',sl:r.sourceLanguage||'',xl:r.translations||{},xm:r.translationMeta||{},tu:r.translationUpdatedAt||0,tm:r.translationMissing||[],ca:r.createdAt||0,ua:r.updatedAt||0
  };
  return out;
}
export function expandRecipe(r={}){
  if(!('t' in r))return upgradeRecipeSchema(r);
  return upgradeRecipeSchema({
    id:r.id,title:r.t||'',type:r.ty||'Recipe',category:r.ty||'Recipe',cuisine:r.cu||[],dietary:r.di||[],traits:r.tr||[],tags:uniq([...(r.cu||[]),...(r.di||[]),...(r.tr||[])]),servings:r.sv||'',prepTime:r.pt||'',cookTime:r.ct||'',restTime:r.rt||'',totalTime:r.tt||'',temperature:r.temp||'',author:r.au||'',description:r.d||'',ingredients:(r.ing||[]).map(expandIngredient),steps:r.st||[],equipment:r.eq||[],notes:r.no||'',nutrition:r.nu||'',favorite:Boolean(r.fav),source:r.src||{},imageUrl:r.img||'',mediaId:r.mid||'',mediaType:r.mt||'',thumbnailId:r.tid||'',coverMediaId:r.cid||'',coverPreset:r.cp||'',sourceLanguage:r.sl||'',translations:r.xl||{},translationMeta:r.xm||{},translationUpdatedAt:r.tu||0,translationMissing:r.tm||[],createdAt:r.ca||0,updatedAt:r.ua||0
  });
}
