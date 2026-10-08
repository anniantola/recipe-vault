import { durationMinutes, normalizeUrl } from './recipe-core.js?v=28';

const clean = (value='') => String(value ?? '')
  .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,' ')
  .replace(/[\t\f\v]+/g,' ')
  .replace(/ {2,}/g,' ')
  .replace(/\s+([,.;:!?%])/g,'$1')
  .replace(/\(\s+/g,'(')
  .replace(/\s+\)/g,')')
  .trim();

const stripMarkup = (value='') => clean(String(value||'')
  .replace(/<[^>]+>/g,' ')
  .replace(/\[([^\]]+)\]\([^\)]+\)/g,'$1')
  .replace(/[*_`>#]+/g,' '));

export function createRecipeDraft(overrides={}) {
  const now=Date.now();
  const primaryType=String(overrides.type||overrides.category||'Recipe').trim()||'Recipe';
  const types=Array.isArray(overrides.types)&&overrides.types.length?overrides.types:[primaryType];
  return {
    id:'', title:'', types, type:primaryType, category:primaryType, cuisine:[], dietary:[], traits:[], tags:[],
    description:'', servings:'', prepTime:'', cookTime:'', restTime:'', totalTime:'', temperature:'', author:'',
    ingredients:[], steps:[], equipment:[], notes:'', nutrition:'', favorite:false, rating:0,
    source:{type:'manual',url:'',label:'',filename:'',sourceKey:'',extractor:''},
    sourceLanguage:'', translations:{}, translationUpdatedAt:0, translationMissing:[],
    imageUrl:'', mediaId:'', mediaType:'', thumbnailId:'', coverMediaId:'', coverPreset:'recipe',
    createdAt:now, updatedAt:now,
    ...overrides,
    types,
    source:{type:'manual',url:'',label:'',filename:'',sourceKey:'',extractor:'',...(overrides.source||{})}
  };
}

export function normalizeRecipeCategory(value='') {
  const s=clean(Array.isArray(value)?value[0]:value).toLowerCase();
  if(!s)return '';
  if(/dessert|sweet|cake|cookie|pudding|dolce|jälkiruoka/.test(s))return 'Dessert';
  if(/pasta|spaghetti|noodle/.test(s))return 'Pasta';
  if(/soup|stew|zuppa|keitto/.test(s))return 'Soup';
  if(/salad|insalata|salaatti/.test(s))return 'Salad';
  if(/breakfast|brunch|aamiainen|colazione/.test(s))return 'Breakfast';
  if(/drink|beverage|cocktail|smoothie|juoma|bevanda/.test(s))return 'Drink';
  if(/sauce|dip|dressing|kastike|salsa/.test(s))return 'Sauce';
  if(/bread|baking|baked|bakery|pane|leipä/.test(s))return 'Baking';
  if(/main|main course|dinner|lunch|entrée|entree|pääruoka|secondo/.test(s))return 'Main';
  return '';
}

function asList(v){return Array.isArray(v)?v:(v==null?[]:[v]);}
function authorName(author){
  if(!author)return '';
  if(Array.isArray(author))return author.map(authorName).filter(Boolean).join(', ');
  return clean(typeof author==='string'?author:(author.name||''));
}
function firstImage(image){
  const list=asList(image);
  for(const item of list){
    if(typeof item==='string' && /^https?:/i.test(item))return item;
    if(item&&typeof item==='object'){
      const u=item.url||item.contentUrl||item['@id'];
      if(typeof u==='string'&&/^https?:/i.test(u))return u;
    }
  }
  return '';
}
function isoDurationToText(value=''){
  const s=String(value||'').trim();
  const m=s.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if(!m)return clean(s);
  const d=Number(m[1]||0),h=Number(m[2]||0),min=Number(m[3]||0),sec=Number(m[4]||0);
  const total=Math.round(d*1440+h*60+min+(sec>=30?.5:0));
  return minutesToText(total);
}
export function minutesToText(total){
  total=Math.round(Number(total)||0);
  if(total<=0)return '';
  const h=Math.floor(total/60),m=total%60;
  if(h&&m)return `${h} hr${h===1?'':'s'} ${m} min${m===1?'':'s'}`;
  if(h)return `${h} hr${h===1?'':'s'}`;
  return `${m} min${m===1?'':'s'}`;
}

function instructionTexts(value){
  const out=[];
  const visit=v=>{
    if(!v)return;
    if(Array.isArray(v)){v.forEach(visit);return;}
    if(typeof v==='string'){const x=stripMarkup(v);if(x)out.push(x);return;}
    if(typeof v!=='object')return;
    const type=String(v['@type']||'').toLowerCase();
    if(type.includes('howtosection')){visit(v.itemListElement||v.steps);return;}
    const x=stripMarkup(v.text||v.name||'');
    if(x)out.push(x); else visit(v.itemListElement||v.steps);
  };
  visit(value);
  return [...new Set(out)].filter(Boolean);
}

export function findRecipeSchema(value){
  let best=null;
  const visit=v=>{
    if(!v||best)return;
    if(Array.isArray(v)){for(const x of v){visit(x);if(best)break;}return;}
    if(typeof v!=='object')return;
    const types=asList(v['@type']);
    if(types.some(x=>String(x||'').toLowerCase()==='recipe')){best=v;return;}
    if(v['@graph'])visit(v['@graph']);
    for(const [k,x] of Object.entries(v))if(k!=='@graph'&&typeof x==='object'){visit(x);if(best)break;}
  };
  visit(value);
  return best;
}

export function recipeSchemaFromHtml(html=''){
  const doc=new DOMParser().parseFromString(String(html),'text/html');
  for(const el of doc.querySelectorAll('script[type="application/ld+json"]')){
    try{const found=findRecipeSchema(JSON.parse(el.textContent||''));if(found)return found;}catch{}
  }
  return null;
}


export function recipeMetadataFromHtml(html=''){
  const doc=new DOMParser().parseFromString(String(html),'text/html');
  const firstText=(selectors=[])=>{
    for(const selector of selectors){const el=doc.querySelector(selector);const value=clean(el?.getAttribute?.('content')||el?.textContent||'');if(value)return value;}
    return '';
  };
  const author=firstText(['.wprm-recipe-author-name','.wprm-recipe-author','[class*="wprm-recipe-author"]','meta[name="author"]','[rel="author"]']);
  const servings=firstText(['.wprm-recipe-servings','.wprm-recipe-servings-container [class*="servings"]']);
  const title=firstText(['.wprm-recipe-name','h1.entry-title','meta[property="og:title"]']);
  const description=firstText(['.wprm-recipe-summary','meta[name="description"]','meta[property="og:description"]']);
  const imageUrl=doc.querySelector('.wprm-recipe-image img')?.getAttribute('src')||doc.querySelector('meta[property="og:image"]')?.getAttribute('content')||'';
  const canonical=doc.querySelector('link[rel="canonical"]')?.getAttribute('href')||'';
  const nutritionParts=[];
  const nutrientNodes=[...doc.querySelectorAll('.wprm-recipe-nutrition-with-unit,[class*="wprm-recipe-nutrition-with-unit"]')];
  for(const el of nutrientNodes){const value=clean(el.textContent||'');if(value&&value.length<180&&!nutritionParts.includes(value))nutritionParts.push(value);}
  if(!nutritionParts.length){
    const box=doc.querySelector('.wprm-nutrition-label-container,.wprm-recipe-nutrition-container,[class*="wprm-nutrition-label"]');
    const value=clean(box?.textContent||'');if(value)nutritionParts.push(value);
  }
  const hasWprm=Boolean(doc.querySelector('.wprm-recipe-container,[class*="wprm-recipe"]'));
  return {author,servings,title,description,imageUrl,canonical,nutrition:sanitizeNutritionText(nutritionParts.join(' | '),title,canonical),wprm:hasWprm};
}

export function sanitizeNutritionText(value='',title='',url=''){
  let s=clean(value);if(!s)return '';
  if(url)s=s.replaceAll(String(url).trim(),' ');
  if(title){const escaped=String(title).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');try{s=s.replace(new RegExp(escaped,'ig'),' ');}catch{}}
  s=s.replace(/https?:\/\/\S+/gi,' ').replace(/\s*\|\s*/g,' | ').replace(/\s{2,}/g,' ').replace(/^(?:nutrition|nutrition facts|ravintoarvot|ravintosisältö|valori nutrizionali)\s*[:|-]?\s*/i,'').trim().replace(/^\|+|\|+$/g,'').trim();
  if(!s)return '';
  // A valid nutrition block should contain at least one nutrient/value signal.
  const nutrient=/\b(?:calories?|kcal|energy|carbohydrates?|carbs?|protein|fat|saturated|fiber|fibre|sugar|sodium|salt|cholesterol|potassium|calcium|iron|energia|hiilihydraatit|proteiini|rasva|kuitu|sokeri|suola|calorie|carboidrati|proteine|grassi|fibre|zuccheri|sodio)\b/i;
  if(!nutrient.test(s)||!/[0-9]/.test(s))return '';
  return s;
}

export function htmlToRecipeText(html=''){
  const doc=new DOMParser().parseFromString(String(html),'text/html');
  doc.querySelectorAll('script,style,noscript,nav,footer,header,form,button,svg,aside').forEach(el=>el.remove());
  const blocks=[...doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,li,p')];
  const lines=[],seen=new Set();
  for(const el of blocks){
    const text=clean(el.textContent||'');
    if(!text||text.length>1000)continue;
    const key=text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if(!key||seen.has(key))continue;seen.add(key);
    if(/^H[1-6]$/.test(el.tagName))lines.push(`${'#'.repeat(Number(el.tagName.slice(1)))} ${text}`);
    else if(el.tagName==='LI')lines.push(`• ${text}`);
    else lines.push(text);
  }
  return lines.join('\n');
}

function nutritionText(nutrition){
  if(!nutrition||typeof nutrition!=='object')return '';
  return Object.entries(nutrition)
    .filter(([k,v])=>!k.startsWith('@')&&v!=null&&String(v).trim())
    .map(([k,v])=>`${k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}: ${clean(v)}`)
    .join(' | ');
}

export function jsonLdToRecipeDraft(schema, source={}){
  if(!schema)return null;
  const ingredientLines=asList(schema.recipeIngredient).map(x=>stripMarkup(String(x||''))).filter(Boolean);
  const steps=instructionTexts(schema.recipeInstructions);
  if(ingredientLines.length<2||steps.length<1)return null;
  const prepTime=isoDurationToText(schema.prepTime||'');
  const cookTime=isoDurationToText(schema.cookTime||'');
  const totalTime=isoDurationToText(schema.totalTime||'');
  let restTime='';
  const total=durationMinutes(totalTime),prep=durationMinutes(prepTime),cook=durationMinutes(cookTime);
  if(Number.isFinite(total)&&Number.isFinite(prep)&&Number.isFinite(cook)&&total>prep+cook)restTime=minutesToText(total-prep-cook);
  const yieldValue=Array.isArray(schema.recipeYield)?schema.recipeYield.find(Boolean):schema.recipeYield;
  const cuisine=asList(schema.recipeCuisine).map(clean).filter(Boolean);
  const keywordHints=String(schema.keywords||'').split(/[,;]+/).map(clean).filter(Boolean);
  const typeHints=[...new Set(asList(schema.recipeCategory).map(normalizeRecipeCategory).filter(Boolean))];
  const typeHint=typeHints[0]||'Recipe';
  return createRecipeDraft({
    title:clean(schema.name||source.title||'Untitled recipe'),
    types:typeHints.length?typeHints:['Recipe'],type:typeHint,category:typeHint,
    cuisine, tags:[...cuisine,...keywordHints],
    description:stripMarkup(schema.description||''),
    servings:clean(yieldValue||''),prepTime,cookTime,restTime,totalTime,
    author:authorName(schema.author),
    sourceLanguage:String(schema.inLanguage||source.inLanguage||'').toLowerCase().slice(0,2),
    ingredients:ingredientLines.map(raw=>({kind:'raw',raw})),
    steps,
    equipment:asList(schema.tool).map(x=>clean(typeof x==='string'?x:(x?.name||''))).filter(Boolean),
    nutrition:sanitizeNutritionText(nutritionText(schema.nutrition),clean(schema.name||''),source.url||''),
    source:{type:'website',url:source.url||'',label:source.label||'',filename:'',sourceKey:source.sourceKey||`url:${normalizeUrl(source.url||'')}`,extractor:source.extractor||'json-ld'},
    imageUrl:source.imageUrl||firstImage(schema.image)||''
  });
}

export function extractOvenTemperature(text=''){
  const s=String(text||'').replace(/º/g,'°');
  const hits=[];
  for(const m of s.matchAll(/\b(\d{2,3})\s*°?\s*([CF])\b/ig))hits.push(`${m[1]}°${m[2].toUpperCase()}`);
  for(const m of s.matchAll(/\b(\d{2,3})\s*(?:degrees?\s*)?(Celsius|Fahrenheit)\b/ig))hits.push(`${m[1]}°${m[2][0].toUpperCase()}`);
  const unique=[...new Set(hits)];
  if(!unique.length)return '';
  const c=unique.find(x=>/°C$/.test(x)),f=unique.find(x=>/°F$/.test(x));
  return c&&f?`${c} / ${f}`:unique.slice(0,2).join(' / ');
}

function inferCookTimeFromSteps(steps=[]){
  const joined=steps.join(' ');
  const patterns=[
    /\b(?:bake|cook|roast|grill|paista|kypsennä|cuoci|cuocere|inforna)\b[^.!?]{0,90}?\bfor\s+(\d+(?:\s*[-–]\s*\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|h)\b/i,
    /\b(?:bake|cook|roast|grill|paista|kypsennä|cuoci|cuocere|inforna)\b[^.!?]{0,90}?(\d+(?:\s*[-–]\s*\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|h)\b/i
  ];
  for(const re of patterns){
    const m=joined.match(re);if(!m)continue;
    const unit=/h|hour|hr/i.test(m[2])?'hrs':'mins';
    return `${m[1].replace(/\s*[-–]\s*/,'–')} ${unit}`;
  }
  return '';
}

function inferServings(text=''){
  const patterns=[
    /\b(?:servings?|yield)\s*[:\-]?\s*([^\n|]{1,45})/i,
    /\bserves\s+(\d+(?:\s*[-–]\s*\d+)?(?:\s+[a-z][a-z\s-]{0,30})?)/i,
    /\b(\d+(?:\s*[-–]\s*\d+)?)\s+(?:annosta|portion(?:s|i)?|porzioni?)\b/i
  ];
  for(const re of patterns){const m=String(text||'').match(re);if(m)return clean(m[1]);}
  return '';
}

export function repairRecipeDraft(recipe={}){
  const r=recipe;
  const repairs=[];
  const combined=[...(r.steps||[]),r.notes||'',r.description||''].join('\n');
  if(!r.temperature){const x=extractOvenTemperature(combined);if(x){r.temperature=x;repairs.push({field:'temperature',value:x,reason:'instructions'});}}
  if(!r.cookTime){const x=inferCookTimeFromSteps(r.steps||[]);if(x){r.cookTime=x;repairs.push({field:'cookTime',value:x,reason:'instructions'});}}
  if(!r.servings){const x=inferServings(`${r.description||''}\n${r.notes||''}`);if(x){r.servings=x;repairs.push({field:'servings',value:x,reason:'recipe text'});}}
  if(!r.totalTime){
    const parts=[durationMinutes(r.prepTime),durationMinutes(r.cookTime),durationMinutes(r.restTime)];
    const known=parts.filter(Number.isFinite);
    // Do not pretend one isolated component is the full recipe duration.
    if(known.length>=2){
      const total=known.reduce((a,b)=>a+b,0);
      if(total>0){const x=minutesToText(total);r.totalTime=x;repairs.push({field:'totalTime',value:x,reason:'component times'});}
    }
  }
  r.importRepairs=repairs;
  return r;
}
