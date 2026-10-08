import { SCHEMA_VERSION, upgradeRecipeSchema, validateRecipe, classifyRecipe, defaultCoverSvg, sourceKeyFor, normalizeUrl, hashBlob, quickHash, ingredientRole, compactRecipe, expandRecipe } from './recipe-core.js?v=25';
import { createRecipeDraft, recipeSchemaFromHtml, recipeMetadataFromHtml, htmlToRecipeText, jsonLdToRecipeDraft, repairRecipeDraft, sanitizeNutritionText } from './recipe-import.js?v=25';
import { openDb, idbGetAll as storageGetAll, idbGet as storageGet, idbPut as storagePut, idbDelete as storageDelete, idbClear as storageClear } from './storage.js?v=25';
import { SUPPORTED_LANGUAGES, TRANSLATION_ENGINE_VERSION, clearTranslationMemory, detectLanguage, deterministicTranslation, ensureRecipeTranslations, localizedRecipe, recipeTranslationReady, makeTextTranslationEntry, localizedText, textVariants, textTranslationKey, translationEntryFromValues } from './translations.js?v=25';
const APP_VERSION = 24;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const UNIT_ALIASES = {
  kg:'kg', g:'g', mg:'mg', l:'l', dl:'dl', cl:'cl', ml:'ml',
  tbsp:'tbsp', tablespoon:'tbsp', tablespoons:'tbsp', rkl:'tbsp', 'ruokalusikallinen':'tbsp', 'ruokalusikallista':'tbsp', 'ruokalusikalliset':'tbsp',
  'cucchiaio':'tbsp', 'cucchiai':'tbsp',
  tsp:'tsp', teaspoon:'tsp', teaspoons:'tsp', tl:'tsp', 'teelusikallinen':'tsp', 'teelusikallista':'tsp', 'teelusikalliset':'tsp',
  'cucchiaino':'tsp', 'cucchiaini':'tsp',
  cup:'cup', cups:'cup', 'kuppi':'cup', 'kupillinen':'cup', 'kupillista':'cup', 'tazza':'cup', 'tazze':'cup',
  oz:'oz', ounce:'oz', ounces:'oz', lb:'lb', lbs:'lb', pound:'lb', pounds:'lb',
  pinch:'pinch', pinches:'pinch', 'ripaus':'pinch', 'hyppysellinen':'pinch', 'pizzico':'pinch', 'pizzichi':'pinch',
  can:'can', cans:'can', tin:'can', tins:'can', 'prk':'can', 'purkki':'can', 'lattina':'can', 'lattine':'can',
  package:'package', packages:'package', packet:'package', packets:'package', 'pkt':'package', 'paketti':'package', 'ps':'package', 'pussi':'package', 'confezione':'package', 'confezioni':'package', 'bustina':'package', 'bustine':'package',
  slice:'slice', slices:'slice', 'viipale':'slice', 'viipaletta':'slice', 'fetta':'slice', 'fette':'slice',
  clove:'clove', cloves:'clove', 'kynsi':'clove', 'kyntta':'clove', 'spicchio':'clove', 'spicchi':'clove',
  bunch:'bunch', bunches:'bunch', 'nippu':'bunch', 'mazzo':'bunch', 'mazzetto':'bunch',
  piece:'piece', pieces:'piece', 'kpl':'piece', 'kappale':'piece', 'kappaletta':'piece', 'pezzo':'piece', 'pezzi':'piece',
  'q.b':'to taste', 'qb':'to taste',
  'ruukku':'pot', 'ruukkua':'pot', 'pot':'pot', 'pots':'pot', 'vasetto':'pot', 'vasetti':'pot',
  'stick':'stick', 'sticks':'stick', 'tanko':'stick', 'bastoncino':'stick', 'bastoncini':'stick',
  'handful':'handful', 'kourallinen':'handful', 'manciata':'handful', 'manciate':'handful'
};
const UNITS = Object.keys(UNIT_ALIASES);
const PREP_WORDS = new Set([
  'fresh','freshly','chopped','finely','roughly','diced','sliced','minced','crushed','grated','shredded','peeled','seeded','divided','melted','softened','room','temperature','optional','to','taste','for','serving','garnish','small','medium','large','extra','virgin','drained','rinsed','cooked','uncooked','boneless','skinless','ground',
  'tuore','tuoretta','hienonnettu','hienonnettuna','silputtu','pilkottu','pilkottuna','kuutioitu','viipaloitu','raastettu','murskattu','kuorittu','sulatettu','pehmennetty','valutettu','huuhdeltu','keitetty','paistettu','pieni','keskikokoinen','suuri','iso','maun','mukaan','koristeluun','tarjoiluun','halutessasi','valinnainen',
  'fresco','fresca','freschi','fresche','tritato','tritata','finemente','grossolanamente','tagliato','tagliata','cubetti','affettato','affettata','macinato','macinata','schiacciato','schiacciata','grattugiato','grattugiata','sbucciato','sbucciata','fuso','fusa','ammorbidito','ammorbidita','scolato','scolata','sciacquato','sciacquata','cotto','cotta','crudo','cruda','piccolo','piccola','medio','media','grande','facoltativo','facoltativa','piacere','servire','guarnire','quanto','basta','of','and','di','del','della','dei','delle','da','per','ja'
]);
const SYNONYMS = [
  [['scallion','scallions','spring onion','spring onions','green onion','green onions','kevätsipuli','kevätsipulia','cipollotto','cipollotti'],'spring onion'],
  [['bell pepper','bell peppers','capsicum','capsicums','paprika','paprikaa','peperone','peperoni'],'bell pepper'],
  [['aubergine','aubergines','eggplant','eggplants','munakoiso','munakoisoa','melanzana','melanzane'],'eggplant'],
  [['courgette','courgettes','zucchini','zucchinis','kesäkurpitsa','kesäkurpitsaa','zucchina','zucchine'],'zucchini'],
  [['coriander','cilantro','korianteri','korianteria','coriandolo'],'cilantro'],
  [['caster sugar','superfine sugar'],'sugar'],
  [['icing sugar','powdered sugar','confectioners sugar','confectioner sugar','tomusokeri','zucchero a velo'],'powdered sugar'],
  [['plain flour','all purpose flour','all-purpose flour','vehnäjauho','vehnäjauhot','vehnäjauhoja','jauho','jauhot','jauhoja','farina','farina 00'],'flour'],
  [['minced beef','ground beef','beef mince','naudan jauheliha','jauheliha','macinato di manzo','carne macinata di manzo'],'ground beef'],
  [['minced pork','ground pork','pork mince','porsaan jauheliha','macinato di maiale'],'ground pork'],
  [['double cream','heavy cream','heavy whipping cream','kuohukerma','kuohukermaa','kerma','kermaa','panna fresca','panna'],'heavy cream'],
  [['single cream','light cream','ruokakerma','panna da cucina'],'light cream'],
  [['parmesan cheese','parmigiano reggiano','parmigiano-reggiano','parmesaani','parmigiano'],'parmesan'],
  [['pasta','spaghetti','spagetti','penne','tagliatelle','linguine','macaroni','maccheroni','fusilli','rigatoni','farfalle','orecchiette','lasagna','lasagne','makaroni'],'pasta'],
  [['chickpeas','chickpea','garbanzo beans','garbanzo','kikherne','kikherneet','cece','ceci'],'chickpea'],
  [['kidney beans','red kidney beans','kidneypapu','kidneypavut','fagioli rossi'],'kidney bean'],
  [['tomatoes','tomato','tomaatti','tomaatit','tomaattia','tomaatteja','pomodoro','pomodori'],'tomato'],
  [['potatoes','potato','peruna','perunat','perunaa','perunoita','patata','patate'],'potato'],
  [['onion','onions','sipuli','sipulit','sipulia','sipuleita','cipolla','cipolle'],'onion'],
  [['garlic','valkosipuli','valkosipulia','aglio'],'garlic'],
  [['olive oil','extra virgin olive oil','oliiviöljy','oliiviöljyä','olio di oliva','olio d oliva','olio extravergine di oliva'],'olive oil'],
  [['butter','voi','voita','burro'],'butter'],
  [['milk','maito','maitoa','latte intero','latte parzialmente scremato'],'milk'],
  [['egg','eggs','muna','munat','munaa','munia','kananmuna','kananmunat','uovo','uova'],'egg'],
  [['sugar','sokeri','sokeria','zucchero'],'sugar'],
  [['salt','suola','suolaa','sale'],'salt'],
  [['black pepper','pepper','mustapippuri','mustapippuria','pippuri','pippuria','pepe nero','pepe'],'black pepper'],
  [['chicken','kana','kanaa','broileri','broileria','pollo'],'chicken'],
  [['basil','basilika','basilikaa','basilico'],'basil'],
  [['parsley','persilja','persiljaa','prezzemolo'],'parsley'],
  [['carrot','carrots','porkkana','porkkanat','porkkanaa','porkkanoita','carota','carote'],'carrot'],
  [['celery','selleri','selleriä','selleria','sedano'],'celery']
];

const CATEGORY_RULES = [
  ['Dessert', ['cake','cookie','cookies','brownie','brownies','dessert','pudding','tart','cheesecake','ice cream','kakku','keksit','jälkiruoka','jalkiruoka','torta','biscotti','dolce','dessert']],
  ['Baking', ['panettone','bread','bun','buns','dough','bake','baked','muffin','muffins','scone','scones','leipä','leipa','pulla','taikina','paista','pane','impasto','forno']],
  ['Breakfast', ['breakfast','oatmeal','porridge','pancake','pancakes','omelette','omelet','granola','aamiainen','puuro','pannukakku','lettu','colazione','porridge','pancake','frittata']],
  ['Soup', ['soup','broth','bisque','stew','keitto','liemi','zuppa','brodo','minestra']],
  ['Pasta', ['pasta','spaghetti','penne','tagliatelle','linguine','macaroni','lasagna','makaroni','lasagne']],
  ['Salad', ['salad','salaatti','insalata']],
  ['Drink', ['cocktail','smoothie','drink','latte','lemonade','juoma','cocktail','bevanda','limonata']],
  ['Sauce', ['sauce','dressing','dip','pesto','kastike','salsa','condimento']],
  ['Dinner', ['chicken','beef','pork','salmon','tofu','rice','curry','risotto','pizza','kana','nauta','possu','lohi','riisi','pollo','manzo','maiale','salmone','riso']]
];
const TAG_RULES = [
  ['Italian', ['italian','italiano','italiana','parmesan','parmigiano','pasta','risotto','mozzarella','basil','basilico','gnocchi','pizza']],
  ['Finnish', ['finnish','suomalainen','karjalan','lohikeitto','rieska','korvapuusti']],
  ['Mexican', ['mexican','taco','tacos','tortilla','salsa','guacamole','quesadilla']],
  ['Indian', ['indian','garam masala','tikka','dal','dahl','naan','curry']],
  ['Asian', ['soy sauce','sesame oil','miso','gochujang','rice vinegar','noodles','soijakastike','seesamiöljy']],
  ['Vegetarian', ['vegetarian','kasvis','vegetariano','vegetariana']],
  ['Vegan', ['vegan','vegaaninen','vegano','vegana']],
  ['Quick', ['quick','easy','nopea','helppo','veloce','facile']],
  ['High protein', ['high protein','protein-rich','protein rich','proteiinipitoinen','alto contenuto proteico']]
];

const HEADING_SETS = {
  ingredients: new Set(['ingredients','ingredient','what youll need','ainekset','ainesosat','raaka aineet','ingredienti','occorrente']),
  steps: new Set(['instructions','instruction','directions','direction','method','steps','step','preparation','ohje','ohjeet','valmistus','valmistusohje','valmistusohjeet','teko ohje','istruzioni','procedimento','preparazione','metodo']),
  notes: new Set(['notes','note','tips','tip','cook s notes','huom','huomio','huomioita','vinkit','vinkki','lisatiedot','lisatieto','note dello chef','consigli','consiglio','suggerimenti']),
  nutrition: new Set(['nutrition','nutrition facts','nutritional information','nutritional estimate','nutritional estimate per serving','ravintoarvot','ravintosisalto','ravintosisältö','valori nutrizionali','informazioni nutrizionali']),
  equipment: new Set(['equipment','tools','you will need','välineet','tarvikkeet','attrezzatura','strumenti']),
  stop: new Set(['related recipes','samankaltaiset reseptit','ricette correlate','comments','kommentit','commenti','did you make this','rate this recipe'])
};
const BOILERPLATE_RE = /^(jump to recipe|print recipe|print|pin|review|advertisement|cookie policy|privacy policy|accept cookies|save recipe|share recipe|sign up|newsletter|skip to content|cook mode.*|tried this recipe.*|give it a star rating.*|find more recipes at\b.*|scan the qr code\b.*|voit merkata työvaiheen.*|you can mark the step.*|puoi segnare.*)$/i;
const EXTRA_INFO_RE = /\b(prep time|cook time|total time|rest time|storage|store|substitut|tip|note|serve with|make ahead|freez|prep|valmistusaika|kypsennysaika|paistoaika|kokonaisaika|sailytys|säilytys|vinkki|huom|tarjoile|korvaa|pakastus|tempo di preparazione|tempo di cottura|tempo totale|riposo|conserva|conservazione|consiglio|sostitu|servire con)\b/i;

let db;
const idbGetAll=(store)=>storageGetAll(db,store);
const idbGet=(store,key)=>storageGet(db,store,key);
const idbPut=(store,value)=>storagePut(db,store,value);
const idbDelete=(store,key)=>storageDelete(db,store,key);
const idbClear=(store)=>storageClear(db,store);
let state = {
  pantry: [],
  available: [],
  shopping: [],
  textTranslations: {},
  theme: 'system',
  language: 'en',
  measurementSystem: 'metric',
  activeRecipeFilter: 'All',
  recipeSort: 'recent'
};
let recipes = [];
let activeRecipeId = null;
const MAIN_PAGES = new Set(['recipes','cook','pantry','shopping','settings']);
let currentPage = 'recipes';
let previousMainPage = 'recipes';
let editorDraft = null;
let deferredInstallPrompt = null;
let pendingShoppingRecipeId = null;
let confirmResolver = null;
let recipeRenderGeneration = 0;

const I18N = {
  en: {
    privateLibrary:'PRIVATE RECIPE LIBRARY', recipes:'Recipes', cook:'Cook', import:'Import', shopping:'Shopping', settings:'Settings',
    searchRecipes:'Search recipes, ingredients, tags…', yourCollection:'YOUR COLLECTION', recipeLibrary:'Recipe library', newestFirst:'Newest added first', newest:'Newest', az:'A–Z', favorites:'Favorites', rating:'Rating', unrated:'Unrated', changePhoto:'Change photo', cropPhoto:'Crop photo', cropHelp:'Drag the image to position it and use the slider to zoom.', cancel:'Cancel', saveCrop:'Use crop', noRecipesYet:'No recipes yet', noRecipesText:'Import a website, PDF, photo, downloaded Reel/video or plain text. You can also add a recipe manually.', importFirst:'Import your first recipe',
    whatCanIMake:'WHAT CAN I MAKE?', matchWhatYouHave:'Match what you have', matcherHelp:'Your Pantry is used automatically when ranking recipes. Add one-off ingredients below without saving them.', availablePlaceholder:'e.g. one-off ingredient', add:'Add', includePantry:'Include pantry', includePantryHelp:'Use ingredients you have saved at home.', temporaryIngredients:'Temporary ingredients', temporaryIngredientsHelp:'Add something you have right now without saving it to your pantry.', addFewIngredients:'Add a few ingredients', matchEmptyText:'Your recipes will be ranked by how many required ingredients you already have.',
    text:'Text', website:'Website', file:'File', manual:'Manual', pasteAnyRecipe:'PASTE ANY RECIPE', textImport:'Text import', pasteRecipePlaceholder:'Paste a recipe, caption, message or notes here…', parseRecipe:'Parse recipe', fromWeb:'FROM THE WEB', websiteSocial:'Website or social link', websiteHelp:'Ordinary recipe pages are fetched as readable text. For Instagram, the most reliable route is to download the Reel and import/share the video file.', importLink:'Import from link', websitePrivacy:'Website import uses a CORS relay to read public recipe pages and may use Jina Reader as a fallback. The URL is sent to those external services for extraction.', photoPdfVideo:'PHOTO · PDF · VIDEO', importFile:'Import a file', chooseFiles:'Choose files', fileTypes:'Images, PDFs and downloaded recipe videos/Reels', takePhoto:'Take photo', keepOriginal:'Keep original source', keepOriginalHelp:'Store the imported image, PDF or video with the recipe.', ocrPrivacy:'OCR reads English, Finnish and Italian. It may need internet the first time; recipe browsing and shopping remain offline.', startScratch:'START FROM SCRATCH', manualRecipe:'Manual recipe', createBlank:'Create blank recipe',
    shoppingList:'SHOPPING LIST', addAnything:'Add anything…', clearChecked:'Clear checked', listEmpty:'Your list is empty', listEmptyText:'Add ingredients from any recipe, or type unrelated shopping items above.', atHome:'AT HOME', pantry:'Pantry', pantryHelp:'Pantry ingredients are used automatically when Recipe Vault ranks what you can cook and are excluded from missing ingredients added to Shopping.', pantryPlaceholder:'Add pantry ingredient…', nothingSaved:'Nothing saved yet.',
    languageEyebrow:'LANGUAGE', language:'Language', appLanguage:'App language', appLanguageHelp:'Changes the interface and recipe content language. Common recipe vocabulary is translated locally and kept consistent. Other recipe text is translated only when needed and cached so unchanged fields are not translated again. External translation requires internet access.', translatingContent:'Translating recipe content…', translationUnavailable:'Some translations could not be created yet; the original text is kept and Recipe Vault will retry later.', translationsUpdated:'Translations updated', appearance:'APPEARANCE', theme:'Theme', colorTheme:'Color theme', darkHelp:'Dark mode uses a true black background.', system:'System', dark:'Dark', light:'Light', data:'DATA', backupRestore:'Backup & restore', backupHelp:'Your data is stored locally on this device. Compact JSON keeps recipes and settings small; Full ZIP also includes stored photos, PDFs and videos.', includeMedia:'Include recipe media', includeMediaHelp:'Includes stored photos, PDFs and videos; backups can become large.', exportJson:'Export compact JSON', importJson:'Import JSON', app:'APP', installVault:'Install Recipe Vault', installHelp:'Install it to your home screen for standalone use and Android share-sheet importing.', installApp:'Install app', installed:'Installed', shareHelp:'After installation, downloaded recipe photos/videos/PDFs can be shared to Recipe Vault from Android’s normal Share menu on supporting browsers.', reset:'RESET', clearData:'Clear app data', deleteAll:'Delete all recipes and lists',
    save:'Save', reviewRecipe:'Review recipe', editRecipe:'Edit recipe', title:'Title', servings:'Servings', servingsPlaceholder:'e.g. 4', prepTime:'Prep time', prepTimePlaceholder:'e.g. 30 mins', cookBakeTime:'Cook / bake time', cookBakeTimePlaceholder:'e.g. 30 mins', restRiseTime:'Rest / rise time', restRiseTimePlaceholder:'e.g. 3 hrs 40 mins', totalTime:'Total time', totalTimePlaceholder:'e.g. 4 hrs 40 mins', ovenTemperature:'Oven', ovenTemperaturePlaceholder:'e.g. 180°C / 350°F', category:'Category', categoryPlaceholder:'Dinner, baking…', tags:'Tags', tagsPlaceholder:'Italian, vegetarian, quick…', ingredients:'Ingredients', ingredientsPlaceholder:'One ingredient per line', steps:'Steps', stepsPlaceholder:'One step per line', notes:'Notes / extra information', notesPlaceholder:'Tips, substitutions, storage, or anything that did not fit elsewhere', sourceUrl:'Source URL', deleteRecipe:'Delete recipe', addToShopping:'Add to shopping', cancel:'Cancel', delete:'Delete', source:'Source', optional:'optional', noIngredients:'No ingredients parsed.', noSteps:'No steps parsed.', originalVideo:'Original video', originalPdf:'Original PDF', openStoredPdf:'Open stored PDF ↗', checkWhatIHave:'Check what I have', alreadyAtHome:'Already at home', noIngredientsAvailable:'No ingredients available.',
    all:'All', match:'match', ingredientSingular:'ingredient', ingredientPlural:'ingredients', atHomeLower:'at home', available:'available', recipeSingular:'recipe', recipePlural:'recipes', ranked:'ranked', itemSingular:'item', itemPlural:'items', from:'From', manualItems:'manual items', manualLower:'manual', movedToPantry:'moved to pantry', recipeSaved:'Recipe saved', recipeDeleted:'Recipe deleted', backupExported:'Backup exported', backupRestored:'Backup restored',
    textSource:'Text', webSource:'Web', photoSource:'Photo', pdfSource:'PDF', videoSource:'Video', manualSource:'Manual', sharedSource:'Shared', servingsUpper:'SERVINGS', pasteFirst:'Paste a recipe first', parsingText:'Parsing text…', parsedReview:'Recipe parsed — review before saving', pasteLinkFirst:'Paste a website link first', readingWebsite:'Reading website…', websiteRead:'Website read — review the extracted recipe', linkFailed:'Could not read that link. Download/share the file or paste the recipe text.', loadingPdf:'Loading PDF reader…', loadingOcr:'Loading OCR…', sharedFailed:'The shared item could not be imported', buildingBackup:'Building backup…', readingBackup:'Reading backup…', restoreBackup:'Restore backup?', restoreBackupText:'This will replace the recipes, pantry and shopping list currently stored in this app.', restore:'Restore', backupImportFailed:'That backup could not be imported', deleteRecipeQ:'Delete recipe?', deleteRecipeText:'and its stored source media will be deleted from this device.', deleteAllQ:'Delete all app data?', deleteAllText:'This permanently removes every locally stored recipe, source file, pantry item and shopping-list item from this browser.', deleteEverything:'Delete everything', deletedAll:'All local data deleted', browserInstall:'Use your browser menu → Install app / Add to Home screen', appStartFailed:'Recipe Vault could not start', noVideoText:'No readable recipe text was detected in the sampled video frames. Add ingredients/steps manually while reviewing.', recipesSaved:'recipes saved locally.', storageUsed:'Browser storage:', used:'used', ofAbout:'of about', ingredientsAdded:'ingredients added', importingFirst:'Importing first file now', measurementsEyebrow:'MEASUREMENTS', measurements:'Measurements', measurementSystem:'Measurement system', measurementHelp:'Switch recipe amounts between metric and US customary. The original imported quantities stay stored unchanged.', metric:'Metric', usCustomary:'US', measurementChanged:'Measurements changed', approx:'approx.', description:'Description', descriptionPlaceholder:'Short recipe description', recipeType:'Type', cuisine:'Cuisine', dietary:'Dietary', traits:'Traits', addSection:'+ Section', addIngredient:'+ Ingredient', addStep:'+ Step', equipment:'Equipment', nutrition:'Nutrition', exportFullZip:'Export full ZIP', importBackup:'Import backup', importQuality:'Import quality', qualityGood:'Good', qualityReview:'Needs review', qualityPoor:'Poor', readyToMake:'Ready to make', missingMain:'Missing main ingredients', missingStaples:'Missing only staples', duplicateFound:'This recipe already exists. Press OK to update the existing recipe, or Cancel to create another copy.', sectionName:'Section name', quantity:'Qty', unitLabel:'Unit', ingredientName:'Ingredient', ingredientNote:'Note', qualityClean:'No structural problems detected.', autoRecovered:'Recovered automatically', typePlaceholder:'Pasta, Soup, Dessert…', cuisinePlaceholder:'Italian, Finnish…', dietaryPlaceholder:'Vegetarian, Vegan…', traitsPlaceholder:'Quick, Easy…', equipmentPlaceholder:'One item per line', nutritionPlaceholder:'Nutrition information', issueTitleMissing:'Title was not detected.', issueTitleSpacing:'Title contains suspicious spacing.', issueFewIngredients:'Very few ingredients were detected.', issueNoSteps:'No preparation steps were detected.', issueIngredientSpacing:'{count} ingredient lines contain suspicious spacing.', issueStepImbalance:'Instruction count is unusually high relative to ingredients.', issueServingsMissing:'Servings/yield was not detected.', issueTempMissing:'An oven temperature appears in the instructions but the Oven field is empty.', issueTotalTooShort:'Total time is shorter than the component times.', restorePreview:'Backup preview', backupContains:'This backup contains {recipes} recipes, {pantry} pantry items, {shopping} shopping items, and {media} media files.', backupCurrent:'Current library: {recipes} recipes.', backupMissingMedia:'{count} media files are missing from the archive. Affected recipes will fall back to another available cover/source when possible.', backupRestoreChoice:'Merge adds or updates backup data without deleting the current library. Replace clears the current library first.', mergeBackup:'Merge', replaceBackup:'Replace'
  },
  fi: {
    privateLibrary:'OMA RESEPTIKIRJASTO', recipes:'Reseptit', cook:'Kokkaa', import:'Tuo', shopping:'Ostokset', settings:'Asetukset',
    searchRecipes:'Hae reseptejä, aineksia tai tageja…', yourCollection:'OMA KOKOELMA', recipeLibrary:'Reseptikirjasto', newestFirst:'Uusimmat lisäykset ensin', newest:'Uusimmat', az:'A–Ö', favorites:'Suosikit', rating:'Arvosana', unrated:'Ei arvosanaa', changePhoto:'Vaihda kuva', cropPhoto:'Rajaa kuva', cropHelp:'Siirrä kuvaa vetämällä ja zoomaa liukusäätimellä.', cancel:'Peruuta', saveCrop:'Käytä rajausta', noRecipesYet:'Ei vielä reseptejä', noRecipesText:'Tuo resepti verkkosivulta, PDF:stä, kuvasta, ladatusta Reel-videosta tai tekstistä. Voit myös lisätä reseptin käsin.', importFirst:'Tuo ensimmäinen resepti',
    whatCanIMake:'MITÄ VOIN TEHDÄ?', matchWhatYouHave:'Etsi aineksillasi', matcherHelp:'Kotivarastoa käytetään automaattisesti reseptien järjestämiseen. Lisää alle vain tilapäiset ainekset, joita et halua tallentaa kotivarastoon.', availablePlaceholder:'esim. tilapäinen aines', add:'Lisää', includePantry:'Sisällytä kotivarasto', includePantryHelp:'Käytä myös kotiin tallennettuja aineksia.', temporaryIngredients:'Tilapäiset ainekset', temporaryIngredientsHelp:'Lisää tähän jotain, mitä sinulla on juuri nyt mutta jota et halua tallentaa kotivarastoon.', addFewIngredients:'Lisää muutama aines', matchEmptyText:'Reseptit järjestetään sen mukaan, kuinka moni tarvittava aines sinulla jo on.',
    text:'Teksti', website:'Verkkosivu', file:'Tiedosto', manual:'Käsin', pasteAnyRecipe:'LIITÄ RESEPTI', textImport:'Tuo tekstistä', pasteRecipePlaceholder:'Liitä resepti, kuvateksti, viesti tai muistiinpanot tähän…', parseRecipe:'Jäsennä resepti', fromWeb:'VERKOSTA', websiteSocial:'Verkkosivu tai some-linkki', websiteHelp:'Tavalliset reseptisivut luetaan tekstiksi. Instagramissa luotettavin tapa on ladata Reel ja tuoda/jakaa videotiedosto sovellukseen.', importLink:'Tuo linkistä', websitePrivacy:'Verkkosivun tuonti käyttää CORS-välityspalvelua julkisten reseptisivujen lukemiseen ja voi käyttää Jina Readeria varavaihtoehtona. URL lähetetään näihin ulkoisiin palveluihin poimintaa varten.', photoPdfVideo:'KUVA · PDF · VIDEO', importFile:'Tuo tiedosto', chooseFiles:'Valitse tiedostot', fileTypes:'Kuvat, PDF:t ja ladatut reseptivideot/Reelsit', takePhoto:'Ota kuva', keepOriginal:'Säilytä alkuperäinen', keepOriginalHelp:'Tallenna tuotu kuva, PDF tai video reseptin yhteyteen.', ocrPrivacy:'OCR lukee englantia, suomea ja italiaa. Se voi tarvita internetiä ensimmäisellä kerralla; reseptien selaus ja ostoslista toimivat offline.', startScratch:'ALOITA TYHJÄSTÄ', manualRecipe:'Resepti käsin', createBlank:'Luo tyhjä resepti',
    shoppingList:'OSTOSLISTA', addAnything:'Lisää mitä tahansa…', clearChecked:'Poista rastitetut', listEmpty:'Ostoslista on tyhjä', listEmptyText:'Lisää aineksia resepteistä tai kirjoita listaan muita ostoksia.', atHome:'KOTONA', pantry:'Kotivarasto', pantryHelp:'Kotivaraston aineksia käytetään automaattisesti sen arviointiin, mitä voit valmistaa, ja ne jätetään pois Ostoksiin lisättävistä puuttuvista aineksista.', pantryPlaceholder:'Lisää aines kotivarastoon…', nothingSaved:'Ei vielä tallennettuja aineksia.',
    languageEyebrow:'KIELI', language:'Kieli', appLanguage:'Sovelluksen kieli', appLanguageHelp:'Vaihtaa käyttöliittymän ja reseptisisällön kielen. Yleinen reseptisanasto käännetään paikallisesti ja pidetään yhdenmukaisena. Muu reseptiteksti käännetään vain tarvittaessa ja välimuistitetaan, joten muuttumattomia kenttiä ei käännetä uudelleen. Ulkoinen käännös tarvitsee internetyhteyden.', translatingContent:'Käännetään reseptin sisältöä…', translationUnavailable:'Kaikkia käännöksiä ei voitu vielä luoda; alkuperäinen teksti säilytetään ja Recipe Vault yrittää myöhemmin uudelleen.', translationsUpdated:'Käännökset päivitetty', appearance:'ULKOASU', theme:'Teema', colorTheme:'Väriteema', darkHelp:'Tumma tila käyttää täysin mustaa taustaa.', system:'Järjestelmä', dark:'Tumma', light:'Vaalea', data:'TIEDOT', backupRestore:'Varmuuskopiointi', backupHelp:'Tiedot tallennetaan paikallisesti tälle laitteelle. Pieni JSON sisältää reseptit ja asetukset; täysi ZIP sisältää myös kuvat, PDF:t ja videot.', includeMedia:'Sisällytä mediatiedostot', includeMediaHelp:'Sisältää tallennetut kuvat, PDF:t ja videot; varmuuskopio voi olla suuri.', exportJson:'Vie pieni JSON', importJson:'Tuo JSON', app:'SOVELLUS', installVault:'Asenna Recipe Vault', installHelp:'Asenna kotinäytölle erillisenä sovelluksena ja Androidin jakovalikkoa varten.', installApp:'Asenna sovellus', installed:'Asennettu', shareHelp:'Asennuksen jälkeen ladattuja reseptikuvia, videoita ja PDF:iä voi jakaa Recipe Vaultiin Androidin tavallisesta jakovalikosta tuetuissa selaimissa.', reset:'NOLLAUS', clearData:'Tyhjennä sovelluksen tiedot', deleteAll:'Poista kaikki reseptit ja listat',
    save:'Tallenna', reviewRecipe:'Tarkista resepti', editRecipe:'Muokkaa reseptiä', title:'Nimi', servings:'Annokset', servingsPlaceholder:'esim. 4', prepTime:'Valmisteluaika', prepTimePlaceholder:'esim. 30 min', cookBakeTime:'Kypsennys / paisto', cookBakeTimePlaceholder:'esim. 30 min', restRiseTime:'Lepo / kohotus', restRiseTimePlaceholder:'esim. 3 h 40 min', totalTime:'Kokonaisaika', totalTimePlaceholder:'esim. 4 h 40 min', ovenTemperature:'Uuni', ovenTemperaturePlaceholder:'esim. 180 °C / 350 °F', category:'Kategoria', categoryPlaceholder:'Päivällinen, leivonta…', tags:'Tagit', tagsPlaceholder:'Italialainen, kasvis, nopea…', ingredients:'Ainekset', ingredientsPlaceholder:'Yksi aines per rivi', steps:'Ohjeet', stepsPlaceholder:'Yksi vaihe per rivi', notes:'Muistiinpanot / lisätiedot', notesPlaceholder:'Vinkit, korvaavat ainekset, säilytys tai muu tieto, joka ei kuulu aineksiin tai ohjeisiin', sourceUrl:'Lähde-URL', deleteRecipe:'Poista resepti', addToShopping:'Lisää ostoslistalle', cancel:'Peruuta', delete:'Poista', source:'Lähde', optional:'valinnainen', noIngredients:'Aineksia ei tunnistettu.', noSteps:'Ohjeita ei tunnistettu.', originalVideo:'Alkuperäinen video', originalPdf:'Alkuperäinen PDF', openStoredPdf:'Avaa tallennettu PDF ↗', checkWhatIHave:'Tarkista mitä minulla on', alreadyAtHome:'On jo kotona', noIngredientsAvailable:'Ei aineksia.',
    all:'Kaikki', match:'osuma', ingredientSingular:'aines', ingredientPlural:'ainesta', atHomeLower:'kotona', available:'käytettävissä', recipeSingular:'resepti', recipePlural:'reseptiä', ranked:'järjestetty', itemSingular:'tuote', itemPlural:'tuotetta', from:'Resepteistä', manualItems:'+ käsin lisätyt', manualLower:'käsin', movedToPantry:'siirretty kotivarastoon', recipeSaved:'Resepti tallennettu', recipeDeleted:'Resepti poistettu', backupExported:'Varmuuskopio viety', backupRestored:'Varmuuskopio palautettu',
    textSource:'Teksti', webSource:'Verkko', photoSource:'Kuva', pdfSource:'PDF', videoSource:'Video', manualSource:'Käsin', sharedSource:'Jaettu', servingsUpper:'ANNOSTA', pasteFirst:'Liitä ensin resepti', parsingText:'Jäsennetään tekstiä…', parsedReview:'Resepti jäsennetty — tarkista ennen tallennusta', pasteLinkFirst:'Liitä ensin verkkolinkki', readingWebsite:'Luetaan verkkosivua…', websiteRead:'Verkkosivu luettu — tarkista poimittu resepti', linkFailed:'Linkkiä ei voitu lukea. Lataa/jaa tiedosto tai liitä reseptin teksti.', loadingPdf:'Ladataan PDF-lukijaa…', loadingOcr:'Ladataan tekstintunnistusta…', sharedFailed:'Jaettua kohdetta ei voitu tuoda', buildingBackup:'Luodaan varmuuskopiota…', readingBackup:'Luetaan varmuuskopiota…', restoreBackup:'Palautetaanko varmuuskopio?', restoreBackupText:'Tämä korvaa sovellukseen nyt tallennetut reseptit, kotivaraston ja ostoslistan.', restore:'Palauta', backupImportFailed:'Varmuuskopiota ei voitu tuoda', deleteRecipeQ:'Poistetaanko resepti?', deleteRecipeText:'ja sen tallennettu lähdemedia poistetaan tältä laitteelta.', deleteAllQ:'Poistetaanko kaikki sovelluksen tiedot?', deleteAllText:'Tämä poistaa pysyvästi kaikki tähän selaimeen tallennetut reseptit, lähdetiedostot, kotivaraston ja ostoslistan.', deleteEverything:'Poista kaikki', deletedAll:'Kaikki paikalliset tiedot poistettu', browserInstall:'Käytä selaimen valikkoa → Asenna sovellus / Lisää aloitusnäyttöön', appStartFailed:'Recipe Vault ei käynnistynyt', noVideoText:'Videon näyteruuduista ei löytynyt luettavaa reseptitekstiä. Lisää ainekset ja ohjeet käsin tarkistuksen aikana.', recipesSaved:'reseptiä tallennettu paikallisesti.', storageUsed:'Selaintallennus:', used:'käytössä', ofAbout:'noin', ingredientsAdded:'ainesta lisätty', importingFirst:'Tuodaan nyt ensimmäinen tiedosto', measurementsEyebrow:'MITAT', measurements:'Mitat', measurementSystem:'Mittajärjestelmä', measurementHelp:'Vaihda reseptien määrät metrijärjestelmän ja USA:n mittojen välillä. Alkuperäiset tuodut määrät säilyvät muuttumattomina.', metric:'Metri', usCustomary:'USA', measurementChanged:'Mittajärjestelmä vaihdettu', approx:'noin', description:'Kuvaus', descriptionPlaceholder:'Lyhyt reseptikuvaus', recipeType:'Tyyppi', cuisine:'Keittiö', dietary:'Ruokavalio', traits:'Ominaisuudet', addSection:'+ Osio', addIngredient:'+ Aines', addStep:'+ Vaihe', equipment:'Välineet', nutrition:'Ravintoarvot', exportFullZip:'Vie täysi ZIP', importBackup:'Tuo varmuuskopio', importQuality:'Tuonnin laatu', qualityGood:'Hyvä', qualityReview:'Tarkistettava', qualityPoor:'Heikko', readyToMake:'Valmis tehtäväksi', missingMain:'Puuttuu pääraaka-aineita', missingStaples:'Puuttuu vain perusaineita', duplicateFound:'Tämä resepti on jo olemassa. OK päivittää olemassa olevan reseptin, Peruuta luo uuden kopion.', sectionName:'Osion nimi', quantity:'Määrä', unitLabel:'Yksikkö', ingredientName:'Aines', ingredientNote:'Huomio', qualityClean:'Rakenteellisia ongelmia ei havaittu.', autoRecovered:'Täydennetty automaattisesti', typePlaceholder:'Pasta, keitto, jälkiruoka…', cuisinePlaceholder:'Italialainen, suomalainen…', dietaryPlaceholder:'Kasvis, vegaaninen…', traitsPlaceholder:'Nopea, helppo…', equipmentPlaceholder:'Yksi väline per rivi', nutritionPlaceholder:'Ravintoarvot', issueTitleMissing:'Nimeä ei tunnistettu.', issueTitleSpacing:'Nimessä on epäilyttävää välistystä.', issueFewIngredients:'Aineksia tunnistettiin hyvin vähän.', issueNoSteps:'Valmistusvaiheita ei tunnistettu.', issueIngredientSpacing:'{count} ainesrivillä on epäilyttävää välistystä.', issueStepImbalance:'Vaiheita on poikkeuksellisen paljon aineksiin verrattuna.', issueServingsMissing:'Annosmäärää ei tunnistettu.', issueTempMissing:'Ohjeissa näkyy uunin lämpötila, mutta Uuni-kenttä on tyhjä.', issueTotalTooShort:'Kokonaisaika on lyhyempi kuin osa-aikojen summa.', restorePreview:'Varmuuskopion esikatselu', backupContains:'Varmuuskopio sisältää {recipes} reseptiä, {pantry} kotivaraston tuotetta, {shopping} ostoslistan tuotetta ja {media} mediatiedostoa.', backupCurrent:'Nykyinen kirjasto: {recipes} reseptiä.', backupMissingMedia:'Arkistosta puuttuu {count} mediatiedostoa. Niihin liittyvät reseptit käyttävät mahdollisuuksien mukaan muuta kansikuvaa/lähdettä.', backupRestoreChoice:'Yhdistä lisää tai päivittää varmuuskopion tiedot poistamatta nykyistä kirjastoa. Korvaa tyhjentää nykyisen kirjaston ensin.', mergeBackup:'Yhdistä', replaceBackup:'Korvaa'
  },
  it: {
    privateLibrary:'RACCOLTA RICETTE PRIVATA', recipes:'Ricette', cook:'Cucina', import:'Importa', shopping:'Spesa', settings:'Impostazioni',
    searchRecipes:'Cerca ricette, ingredienti o tag…', yourCollection:'LA TUA RACCOLTA', recipeLibrary:'Raccolta ricette', newestFirst:'Aggiunte più recenti prima', newest:'Più recenti', az:'A–Z', favorites:'Preferiti', rating:'Valutazione', unrated:'Senza valutazione', changePhoto:'Cambia foto', cropPhoto:'Ritaglia foto', cropHelp:'Trascina l’immagine per posizionarla e usa il cursore per lo zoom.', cancel:'Annulla', saveCrop:'Usa ritaglio', noRecipesYet:'Nessuna ricetta', noRecipesText:'Importa da un sito, PDF, foto, Reel/video scaricato o testo. Puoi anche aggiungere una ricetta manualmente.', importFirst:'Importa la prima ricetta',
    whatCanIMake:'COSA POSSO CUCINARE?', matchWhatYouHave:'Abbina ciò che hai', matcherHelp:'La Dispensa viene usata automaticamente per ordinare le ricette. Aggiungi qui sotto solo ingredienti temporanei che non vuoi salvare in dispensa.', availablePlaceholder:'es. pomodoro, pasta, parmigiano', add:'Aggiungi', includePantry:'Includi dispensa', includePantryHelp:'Usa anche gli ingredienti salvati a casa.', temporaryIngredients:'Ingredienti temporanei', temporaryIngredientsHelp:'Aggiungi qualcosa che hai adesso senza salvarlo nella dispensa.', addFewIngredients:'Aggiungi alcuni ingredienti', matchEmptyText:'Le ricette saranno ordinate in base a quanti ingredienti necessari hai già.',
    text:'Testo', website:'Sito web', file:'File', manual:'Manuale', pasteAnyRecipe:'INCOLLA UNA RICETTA', textImport:'Importa testo', pasteRecipePlaceholder:'Incolla qui una ricetta, didascalia, messaggio o nota…', parseRecipe:'Analizza ricetta', fromWeb:'DAL WEB', websiteSocial:'Sito web o link social', websiteHelp:'Le normali pagine di ricette vengono convertite in testo leggibile. Per Instagram, il metodo più affidabile è scaricare il Reel e importare/condividere il video.', importLink:'Importa dal link', websitePrivacy:'L’importazione web usa un relay CORS per leggere le pagine pubbliche e può usare Jina Reader come fallback. L’URL viene inviato a questi servizi esterni per l’estrazione.', photoPdfVideo:'FOTO · PDF · VIDEO', importFile:'Importa un file', chooseFiles:'Scegli file', fileTypes:'Immagini, PDF e video/Reel di ricette scaricati', takePhoto:'Scatta foto', keepOriginal:'Conserva fonte originale', keepOriginalHelp:'Salva l’immagine, PDF o video importato con la ricetta.', ocrPrivacy:'L’OCR legge inglese, finlandese e italiano. Potrebbe richiedere internet al primo utilizzo; ricette e lista della spesa restano disponibili offline.', startScratch:'PARTI DA ZERO', manualRecipe:'Ricetta manuale', createBlank:'Crea ricetta vuota',
    shoppingList:'LISTA DELLA SPESA', addAnything:'Aggiungi qualsiasi cosa…', clearChecked:'Rimuovi selezionati', listEmpty:'La lista è vuota', listEmptyText:'Aggiungi ingredienti da una ricetta oppure altri articoli manualmente.', atHome:'A CASA', pantry:'Dispensa', pantryHelp:'Gli ingredienti della dispensa vengono usati automaticamente per valutare cosa puoi cucinare e vengono esclusi dagli ingredienti mancanti aggiunti alla Spesa.', pantryPlaceholder:'Aggiungi ingrediente in dispensa…', nothingSaved:'Ancora nessun ingrediente salvato.',
    languageEyebrow:'LINGUA', language:'Lingua', appLanguage:'Lingua dell’app', appLanguageHelp:'Cambia la lingua dell’interfaccia e del contenuto delle ricette. Il vocabolario comune delle ricette viene tradotto localmente e resta coerente. Il resto del testo viene tradotto solo quando necessario e memorizzato, quindi i campi invariati non vengono ritradotti. La traduzione esterna richiede internet.', translatingContent:'Traduzione del contenuto della ricetta…', translationUnavailable:'Alcune traduzioni non sono ancora disponibili; il testo originale viene conservato e Recipe Vault riproverà più tardi.', translationsUpdated:'Traduzioni aggiornate', appearance:'ASPETTO', theme:'Tema', colorTheme:'Tema colore', darkHelp:'La modalità scura usa uno sfondo nero puro.', system:'Sistema', dark:'Scuro', light:'Chiaro', data:'DATI', backupRestore:'Backup e ripristino', backupHelp:'I dati sono salvati localmente su questo dispositivo. Il JSON compatto contiene ricette e impostazioni; lo ZIP completo include anche foto, PDF e video.', includeMedia:'Includi file multimediali', includeMediaHelp:'Include foto, PDF e video salvati; il backup può diventare grande.', exportJson:'Esporta JSON compatto', importJson:'Importa JSON', app:'APP', installVault:'Installa Recipe Vault', installHelp:'Installalo nella schermata Home per usarlo come app e importare dal menu Condividi di Android.', installApp:'Installa app', installed:'Installata', shareHelp:'Dopo l’installazione, foto, video e PDF di ricette scaricati possono essere condivisi con Recipe Vault dal normale menu Condividi di Android nei browser supportati.', reset:'RESET', clearData:'Cancella dati app', deleteAll:'Elimina tutte le ricette e le liste',
    save:'Salva', reviewRecipe:'Controlla ricetta', editRecipe:'Modifica ricetta', title:'Titolo', servings:'Porzioni', servingsPlaceholder:'es. 4', prepTime:'Preparazione', prepTimePlaceholder:'es. 30 min', cookBakeTime:'Cottura / forno', cookBakeTimePlaceholder:'es. 30 min', restRiseTime:'Riposo / lievitazione', restRiseTimePlaceholder:'es. 3 h 40 min', totalTime:'Tempo totale', totalTimePlaceholder:'es. 4 h 40 min', ovenTemperature:'Forno', ovenTemperaturePlaceholder:'es. 180°C / 350°F', category:'Categoria', categoryPlaceholder:'Cena, dolci…', tags:'Tag', tagsPlaceholder:'Italiano, vegetariano, veloce…', ingredients:'Ingredienti', ingredientsPlaceholder:'Un ingrediente per riga', steps:'Procedimento', stepsPlaceholder:'Un passaggio per riga', notes:'Note / informazioni extra', notesPlaceholder:'Consigli, sostituzioni, conservazione o altre informazioni non adatte a ingredienti o procedimento', sourceUrl:'URL fonte', deleteRecipe:'Elimina ricetta', addToShopping:'Aggiungi alla spesa', cancel:'Annulla', delete:'Elimina', source:'Fonte', optional:'facoltativo', noIngredients:'Nessun ingrediente riconosciuto.', noSteps:'Nessun passaggio riconosciuto.', originalVideo:'Video originale', originalPdf:'PDF originale', openStoredPdf:'Apri PDF salvato ↗', checkWhatIHave:'Controlla cosa ho', alreadyAtHome:'Già a casa', noIngredientsAvailable:'Nessun ingrediente disponibile.',
    all:'Tutti', match:'corrispondenza', ingredientSingular:'ingrediente', ingredientPlural:'ingredienti', atHomeLower:'a casa', available:'disponibili', recipeSingular:'ricetta', recipePlural:'ricette', ranked:'ordinate', itemSingular:'articolo', itemPlural:'articoli', from:'Da', manualItems:'+ articoli manuali', manualLower:'manuale', movedToPantry:'spostato in dispensa', recipeSaved:'Ricetta salvata', recipeDeleted:'Ricetta eliminata', backupExported:'Backup esportato', backupRestored:'Backup ripristinato',
    textSource:'Testo', webSource:'Web', photoSource:'Foto', pdfSource:'PDF', videoSource:'Video', manualSource:'Manuale', sharedSource:'Condiviso', servingsUpper:'PORZIONI', pasteFirst:'Incolla prima una ricetta', parsingText:'Analisi del testo…', parsedReview:'Ricetta analizzata — controlla prima di salvare', pasteLinkFirst:'Incolla prima un link', readingWebsite:'Lettura del sito…', websiteRead:'Sito letto — controlla la ricetta estratta', linkFailed:'Impossibile leggere il link. Scarica/condividi il file oppure incolla il testo della ricetta.', loadingPdf:'Caricamento lettore PDF…', loadingOcr:'Caricamento OCR…', sharedFailed:'Impossibile importare l’elemento condiviso', buildingBackup:'Creazione backup…', readingBackup:'Lettura backup…', restoreBackup:'Ripristinare il backup?', restoreBackupText:'Questo sostituirà le ricette, la dispensa e la lista della spesa attualmente salvate nell’app.', restore:'Ripristina', backupImportFailed:'Impossibile importare il backup', deleteRecipeQ:'Eliminare la ricetta?', deleteRecipeText:'e i relativi file sorgente salvati verranno eliminati da questo dispositivo.', deleteAllQ:'Eliminare tutti i dati dell’app?', deleteAllText:'Questo elimina definitivamente tutte le ricette, i file sorgente, la dispensa e la lista della spesa salvati in questo browser.', deleteEverything:'Elimina tutto', deletedAll:'Tutti i dati locali sono stati eliminati', browserInstall:'Usa il menu del browser → Installa app / Aggiungi alla schermata Home', appStartFailed:'Recipe Vault non si è avviata', noVideoText:'Non è stato rilevato testo di ricetta leggibile nei fotogrammi campionati. Aggiungi ingredienti e procedimento manualmente durante il controllo.', recipesSaved:'ricette salvate localmente.', storageUsed:'Archiviazione browser:', used:'usati', ofAbout:'su circa', ingredientsAdded:'ingredienti aggiunti', importingFirst:'Importazione del primo file', measurementsEyebrow:'MISURE', measurements:'Misure', measurementSystem:'Sistema di misura', measurementHelp:'Passa tra misure metriche e statunitensi. Le quantità originali importate restano salvate senza modifiche.', metric:'Metrico', usCustomary:'USA', measurementChanged:'Sistema di misura cambiato', approx:'circa', description:'Descrizione', descriptionPlaceholder:'Breve descrizione della ricetta', recipeType:'Tipo', cuisine:'Cucina', dietary:'Dieta', traits:'Caratteristiche', addSection:'+ Sezione', addIngredient:'+ Ingrediente', addStep:'+ Passaggio', equipment:'Attrezzatura', nutrition:'Valori nutrizionali', exportFullZip:'Esporta ZIP completo', importBackup:'Importa backup', importQuality:'Qualità importazione', qualityGood:'Buona', qualityReview:'Da controllare', qualityPoor:'Scarsa', readyToMake:'Pronta da cucinare', missingMain:'Mancano ingredienti principali', missingStaples:'Mancano solo ingredienti base', duplicateFound:'Questa ricetta esiste già. Premi OK per aggiornare la ricetta esistente oppure Annulla per creare una copia.', sectionName:'Nome sezione', quantity:'Qtà', unitLabel:'Unità', ingredientName:'Ingrediente', ingredientNote:'Nota', qualityClean:'Nessun problema strutturale rilevato.', autoRecovered:'Recuperato automaticamente', typePlaceholder:'Pasta, zuppa, dolce…', cuisinePlaceholder:'Italiana, finlandese…', dietaryPlaceholder:'Vegetariana, vegana…', traitsPlaceholder:'Veloce, facile…', equipmentPlaceholder:'Un elemento per riga', nutritionPlaceholder:'Valori nutrizionali', issueTitleMissing:'Il titolo non è stato rilevato.', issueTitleSpacing:'Il titolo contiene spaziatura sospetta.', issueFewIngredients:'Sono stati rilevati pochissimi ingredienti.', issueNoSteps:'Non sono stati rilevati passaggi di preparazione.', issueIngredientSpacing:'{count} righe degli ingredienti contengono spaziatura sospetta.', issueStepImbalance:'Il numero di passaggi è insolitamente alto rispetto agli ingredienti.', issueServingsMissing:'Porzioni/resa non rilevate.', issueTempMissing:'Nelle istruzioni compare una temperatura del forno ma il campo Forno è vuoto.', issueTotalTooShort:'Il tempo totale è più breve della somma dei tempi parziali.', restorePreview:'Anteprima backup', backupContains:'Il backup contiene {recipes} ricette, {pantry} elementi in dispensa, {shopping} elementi della spesa e {media} file multimediali.', backupCurrent:'Libreria attuale: {recipes} ricette.', backupMissingMedia:'Nell’archivio mancano {count} file multimediali. Le ricette interessate useranno un’altra copertina/fonte disponibile quando possibile.', backupRestoreChoice:'Unisci aggiunge o aggiorna i dati senza eliminare la libreria attuale. Sostituisci cancella prima la libreria attuale.', mergeBackup:'Unisci', replaceBackup:'Sostituisci'
  }
};
function t(key, vars={}) {
  const lang=state?.language || 'en';
  let out=(I18N[lang]&&I18N[lang][key]) || I18N.en[key] || key;
  for(const [k,v] of Object.entries(vars)) out=out.replaceAll(`{${k}}`,String(v));
  return out;
}

function normalizeRating(value){const n=Number(value);return Number.isFinite(n)&&n>=1?Math.min(5,Math.max(1,Math.round(n))):0;}
function ratingStars(value){const n=normalizeRating(value);return `${'★'.repeat(n)}${'☆'.repeat(5-n)}`;}
function ratingButtonsHtml(value,scope='rating'){const n=normalizeRating(value);return [1,2,3,4,5].map(v=>`<button type="button" class="rating-star ${v<=n?'active':''}" data-rating-value="${v}" aria-checked="${v===n?'true':'false'}" role="radio" title="${v}/5">★</button>`).join('');}
function renderEditorRating(value){
  const root=$('#editRatingStars');if(!root)return;
  const n=normalizeRating(value);root.innerHTML=ratingButtonsHtml(n,'editor');root.setAttribute('aria-label',t('rating'));
}
async function setRecipeRating(id,value){
  const r=recipes.find(x=>x.id===id);if(!r)return;
  r.rating=normalizeRating(value);r.updatedAt=Date.now();await idbPut('recipes',r);
  await renderRecipes();
}

function currentRecipeView(recipe,lang=state.language||'en') { return localizedRecipe(recipe,lang); }
function currentText(value,lang=state.language||'en') { return localizedText(value,lang,state.textTranslations||{}); }
async function ensureSharedTextTranslation(value,fallbackLanguage=state.language||'en') {
  const text=String(value||'').trim();if(!text)return null;
  state.textTranslations=state.textTranslations&&typeof state.textTranslations==='object'?state.textTranslations:{};
  const key=textTranslationKey(text),existing=state.textTranslations[key];
  if(existing && SUPPORTED_LANGUAGES.every(lang=>existing.values?.[lang])) {
    if(existing.engineVersion===TRANSLATION_ENGINE_VERSION) return existing;
    // Upgrade old cached pantry/shopping translations without retranslating arbitrary
    // text: only deterministic dictionary values are replaced; all other wording is kept.
    const source=detectLanguage(text,existing.sourceLanguage||fallbackLanguage);const values={...(existing.values||{})};
    for(const lang of SUPPORTED_LANGUAGES){if(lang===source)continue;const local=deterministicTranslation(text,source,lang,'ingredient');if(local)values[lang]=local;}
    const upgraded=translationEntryFromValues(text,source,values);state.textTranslations[key]=upgraded;return upgraded;
  }
  const entry=await makeTextTranslationEntry(text,fallbackLanguage);
  state.textTranslations[key]=entry;return entry;
}
function syncRecipeTranslationsToTextCache(_recipe){
  // Recipe translations live on the recipe itself. The shared text cache is only
  // for standalone pantry / temporary / shopping items. Keeping recipe ingredients
  // here duplicated data and preserved stale translations from older builds.
}
function pruneTextTranslationCache(){
  const current=state.textTranslations&&typeof state.textTranslations==='object'&&!Array.isArray(state.textTranslations)?state.textTranslations:{};
  const texts=[...(state.pantry||[]),...(state.available||[]),...(state.shopping||[]).map(x=>x?.name).filter(Boolean)];
  const allowed=new Set(texts.map(textTranslationKey));
  const next={};
  for(const [key,entry] of Object.entries(current)){
    if(!allowed.has(key))continue;
    const original=String(entry?.original||'').trim();
    if(!original||/^\|/.test(original))continue;
    next[key]=entry;
  }
  const changed=Object.keys(next).length!==Object.keys(current).length;
  state.textTranslations=next;
  return changed;
}
function recipeSearchText(recipe){
  const parts=[recipe.title,recipe.description,recipe.type||recipe.category,(recipe.cuisine||[]).join(' '),(recipe.dietary||[]).join(' '),(recipe.traits||[]).join(' '),(recipe.ingredients||[]).filter(i=>i.kind!=='group').map(i=>i.name).join(' '),recipe.notes];
  for(const lang of SUPPORTED_LANGUAGES){const tr=recipe.translations?.[lang];if(!tr)continue;parts.push(tr.title,tr.description,tr.type,(tr.cuisine||[]).join(' '),(tr.dietary||[]).join(' '),(tr.traits||[]).join(' '),(tr.ingredients||[]).map(i=>i?.name||'').join(' '),(tr.steps||[]).join(' '),tr.notes);}
  return parts.filter(Boolean).join(' ');
}
let translationBackfillRunning=false;
async function backfillTranslations(){
  if(translationBackfillRunning)return;translationBackfillRunning=true;let changed=false;
  try{
    for(const recipe of recipes){
      const source=recipe.sourceLanguage||'';const complete=SUPPORTED_LANGUAGES.every(lang=>recipeTranslationReady(recipe,lang));
      if(complete){syncRecipeTranslationsToTextCache(recipe);continue;}
      await ensureRecipeTranslations(recipe,recipe.sourceLanguage||state.language||'en');syncRecipeTranslationsToTextCache(recipe);await idbPut('recipes',recipe);changed=true;
      if((recipe.translationMissing||[]).length) break;
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    if(pruneTextTranslationCache())changed=true;
    const simple=[...(state.pantry||[]),...(state.available||[]),...(state.shopping||[]).map(x=>x?.name).filter(Boolean)];
    for(const text of simple){const key=textTranslationKey(text),cached=state.textTranslations?.[key];if(!SUPPORTED_LANGUAGES.every(lang=>cached?.values?.[lang])||cached?.engineVersion!==TRANSLATION_ENGINE_VERSION){const entry=await ensureSharedTextTranslation(text,state.language||'en');changed=true;if((entry?.missing||[]).length)break;await new Promise(resolve=>setTimeout(resolve,80));}}
    if(changed){await saveState();await renderAll();if(activeRecipeId&&$('#recipeDialog')?.open)await openRecipe(activeRecipeId);}
  }catch(err){console.warn('Translation backfill paused',err);}finally{translationBackfillRunning=false;}
}
function applyLanguage() {
  const lang=state.language || 'en';
  document.documentElement.lang=lang;
  $$('[data-i18n]').forEach(el=>{ const key=el.dataset.i18n; if(I18N[lang]?.[key]||I18N.en[key]) el.textContent=t(key); });
  $$('[data-i18n-placeholder]').forEach(el=>{ el.placeholder=t(el.dataset.i18nPlaceholder); });
  $$('[data-language]').forEach(btn=>{const active=btn.dataset.language===lang;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
  $$('[data-measurement]').forEach(btn=>{const active=btn.dataset.measurement===(state.measurementSystem||'metric');btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
  const current=$('.page.active')?.dataset.page || 'recipes';
  if($('#headerTitle')) $('#headerTitle').textContent=titleForPage(current);
  if($('#quickImportBtn')){
    const importOpen=current==='import';
    $('#quickImportBtn').setAttribute('aria-label',importOpen?t('cancel'):t('import'));
    $('#quickImportBtn').title=importOpen?t('cancel'):t('import');
  }
}

function timestampFromRecipeId(id) {
  const part = String(id || '').split('_')[1];
  if (!part) return 0;
  const n = parseInt(part, 36);
  // Accept only plausible millisecond timestamps.
  return Number.isFinite(n) && n > 946684800000 && n < 4102444800000 ? n : 0;
}

async function loadAll() {
  recipes = await idbGetAll('recipes');
  // Migrate old records once: clean imported whitespace and recover stable date-added
  // timestamps from the recipe IDs created by Recipe Vault.
  let migratedRecipes = false;
  for (const r of recipes) {
    const before=JSON.stringify(r);
    const idTime=timestampFromRecipeId(r.id);
    if (idTime) r.createdAt=idTime;
    else if (!Number.isFinite(Number(r.createdAt)) || Number(r.createdAt)<=0) r.createdAt=Number(r.updatedAt)||Date.now();
    delete r.importQuality;
    delete r.importRepairs;
    cleanRecipeRecord(r);
    if(JSON.stringify(r)!==before){migratedRecipes=true;await idbPut('recipes',r);}
  }
  recipes.sort((a,b)=>recipeAddedAt(b)-recipeAddedAt(a));
  const saved = await idbGet('state', 'app');
  if (saved?.value) state = { ...state, ...saved.value };
  // Be tolerant of state saved by older builds or partially restored backups.
  if(!Array.isArray(state.pantry)) state.pantry=[];
  if(!Array.isArray(state.available)) state.available=[];
  if(!Array.isArray(state.shopping)) state.shopping=[];
  if(!state.textTranslations || typeof state.textTranslations!=='object' || Array.isArray(state.textTranslations)) state.textTranslations={};
  pruneTextTranslationCache();
  // The library should always open showing the complete collection.
  state.activeRecipeFilter = 'All';
  if(!['recent','title','favorite'].includes(state.recipeSort)) state.recipeSort='recent';
  if($('#recipeSort')) $('#recipeSort').value=state.recipeSort;
  const fastLanguage = localStorage.getItem('recipe-vault-language');
  if (['en','fi','it'].includes(fastLanguage)) state.language = fastLanguage;
  const fastMeasurements = localStorage.getItem('recipe-vault-measurements');
  if (['metric','us'].includes(fastMeasurements)) state.measurementSystem = fastMeasurements;
  if (!['metric','us'].includes(state.measurementSystem)) state.measurementSystem = 'metric';
  applyTheme();
  applyLanguage();
}
async function saveState() {
  if (['en','fi','it'].includes(state.language)) localStorage.setItem('recipe-vault-language', state.language);
  if (['metric','us'].includes(state.measurementSystem)) localStorage.setItem('recipe-vault-measurements', state.measurementSystem);
  await idbPut('state', { key: 'app', value: state });
}
async function setLanguage(lang) {
  if (!['en','fi','it'].includes(lang)) return;
  state.language = lang;
  localStorage.setItem('recipe-vault-language', lang);
  applyLanguage();
  await renderAll();
  await saveState();
  applyLanguage();
  toast(lang==='fi'?'Kieli vaihdettu':lang==='it'?'Lingua cambiata':'Language changed');
  backfillTranslations();
}
async function setMeasurementSystem(system) {
  if (!['metric','us'].includes(system)) return;
  state.measurementSystem = system;
  localStorage.setItem('recipe-vault-measurements', system);
  await saveState();
  applyLanguage();
  renderShopping();
  if (activeRecipeId && $('#recipeDialog')?.open) await openRecipe(activeRecipeId);
  toast(t('measurementChanged'));
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
  el.textContent = busy ? `${state.language==='fi'?'Työstetään':state.language==='it'?'Elaborazione':'Working'} · ${message}` : message;
}
function titleForPage(page) {
  return ({recipes:t('recipes'),cook:t('cook'),pantry:t('pantry'),import:t('import'),shopping:t('shopping'),settings:t('settings')})[page] || 'Recipe Vault';
}
function go(page) {
  if (MAIN_PAGES.has(page)) previousMainPage = page;
  currentPage = page;
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === page));
  // Import is intentionally not a bottom-navigation destination. While it is
  // open, keep the page the user came from highlighted so closing Import has
  // an obvious destination.
  const navPage = page === 'import' ? previousMainPage : page;
  $$('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === navPage));
  const quickImport=$('#quickImportBtn');
  if(quickImport){
    const open=page==='import';
    quickImport.classList.toggle('import-open',open);
    quickImport.setAttribute('aria-expanded',String(open));
    quickImport.setAttribute('aria-label',open?t('cancel'):t('import'));
    quickImport.title=open?t('cancel'):t('import');
  }
  $('#headerTitle').textContent = titleForPage(page);
  location.hash = page === 'recipes' ? '' : page;
  window.scrollTo({top:0, behavior:'instant'});
  if (page === 'cook') renderMatches();
  if (page === 'pantry') renderPantry();
  if (page === 'shopping') renderShopping();
  if (page === 'settings') renderStorageInfo();
}
function toggleImportPage(){
  if(currentPage==='import') go(previousMainPage || 'recipes');
  else go('import');
}

function normalizeText(s='') {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}

function cleanInlineSpacing(value='') {
  return String(value)
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,' ')
    .replace(/[\t\f\v]+/g,' ')
    .replace(/ {2,}/g,' ')
    .replace(/\s+([,.;:!?%])/g,'$1')
    .replace(/\(\s+/g,'(')
    .replace(/\s+\)/g,')')
    .replace(/\[\s+/g,'[')
    .replace(/\s+\]/g,']')
    .trim();
}
function cleanMultilineSpacing(value='') {
  return String(value)
    .replace(/\r/g,'')
    .split('\n')
    .map(line=>cleanInlineSpacing(line))
    .join('\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}
function cleanRecipeRecord(recipe) {
  if(!recipe || typeof recipe!=='object') return recipe;
  recipe.title=cleanInlineSpacing(recipe.title||'');
  recipe.servings=cleanInlineSpacing(recipe.servings||'');
  recipe.prepTime=cleanInlineSpacing(recipe.prepTime||'');
  recipe.cookTime=cleanInlineSpacing(recipe.cookTime||recipe.bakeTime||'');
  recipe.restTime=cleanInlineSpacing(recipe.restTime||'');
  recipe.totalTime=cleanInlineSpacing(recipe.totalTime||'');
  recipe.temperature=normalizeTemperatureText(recipe.temperature||recipe.ovenTemperature||'');
  recipe.category=cleanInlineSpacing(recipe.category||'');
  const tags=Array.isArray(recipe.tags)?recipe.tags:(typeof recipe.tags==='string'?recipe.tags.split(','):[]);
  recipe.tags=tags.map(cleanInlineSpacing).filter(Boolean);
  recipe.notes=cleanMultilineSpacing(recipe.notes||'');
  const steps=Array.isArray(recipe.steps)?recipe.steps:(typeof recipe.steps==='string'?recipe.steps.split(/\n+/):[]);
  recipe.steps=steps.map(x=>cleanInlineSpacing(typeof x==='string'?x:(x?.text||''))).filter(Boolean);
  const ingredients=Array.isArray(recipe.ingredients)?recipe.ingredients:[];
  recipe.ingredients=ingredients.map(i=>{
    if(typeof i==='string') return parseIngredientLine(cleanInlineSpacing(i));
    if(!i || typeof i!=='object') return null;
    const qtyText=cleanInlineSpacing(i.qtyText||'');const unit=cleanInlineSpacing(i.unit||'');
    return {...i,raw:cleanInlineSpacing(i.raw||''),qtyText,qty:Number.isFinite(i.qty)?i.qty:parseNumber(qtyText),unit,unitCanonical:canonicalUnit(unit)||i.unitCanonical||'',name:cleanInlineSpacing(i.name||''),note:cleanInlineSpacing(i.note||'')};
  }).filter(Boolean);
  if(recipe.source && typeof recipe.source==='object') recipe.source={...recipe.source,label:cleanInlineSpacing(recipe.source.label||''),filename:cleanInlineSpacing(recipe.source.filename||''),url:String(recipe.source.url||'').trim()};
  else recipe.source={type:'manual',url:'',label:'',filename:''};
  recipe.description=cleanMultilineSpacing(recipe.description||'');
  recipe.nutrition=sanitizeNutritionText(cleanMultilineSpacing(recipe.nutrition||''),recipe.title||'',recipe.source?.url||'');
  recipe.equipment=(Array.isArray(recipe.equipment)?recipe.equipment:String(recipe.equipment||'').split(/\n+/)).map(cleanInlineSpacing).filter(Boolean);
  const ratingNum=Number(recipe.rating);
  recipe.rating=Number.isFinite(ratingNum)&&ratingNum>=1?Math.min(5,Math.max(1,Math.round(ratingNum))):0;
  upgradeRecipeSchema(recipe);
  return recipe;
}

function finalizeImportedRecipe(recipe, sourceMeta={}) {
  if(!recipe) return recipe;
  // Every importer is normalized onto the same draft shape before validation.
  Object.assign(recipe,createRecipeDraft({...recipe,source:{...(recipe.source||{}),...sourceMeta}}));
  cleanRecipeRecord(recipe);
  // Only fill fields that are missing. Explicit source/user values always win.
  repairRecipeDraft(recipe);
  cleanRecipeRecord(recipe);
  if(!recipe.source.sourceKey) recipe.source.sourceKey=sourceKeyFor(recipe);
  recipe.importQuality=validateRecipe(recipe);
  recipe.coverPreset=recipe.coverPreset||classifyRecipe(recipe).type?.toLowerCase()||'recipe';
  return recipe;
}
async function openImportedDraft(recipe, sourceMeta={}) {
  finalizeImportedRecipe(recipe,sourceMeta);
  const key=recipe?.source?.sourceKey||'';
  const existing=key?recipes.find(r=>(r.source?.sourceKey||sourceKeyFor(r))===key):null;
  if(existing){
    const update=window.confirm(t('duplicateFound'));
    if(update){
      recipe.id=existing.id;
      recipe.createdAt=existing.createdAt||recipe.createdAt;
      recipe.favorite=existing.favorite;
      recipe.coverMediaId=existing.coverMediaId||recipe.coverMediaId||'';
      recipe.updatedAt=Date.now();
      openEditor(recipe,false);
      return;
    }
  }
  openEditor(recipe,true);
}
function qualityIssueText(issue={}){
  const key={titleMissing:'issueTitleMissing',titleSpacing:'issueTitleSpacing',fewIngredients:'issueFewIngredients',noSteps:'issueNoSteps',ingredientSpacing:'issueIngredientSpacing',stepImbalance:'issueStepImbalance',servingsMissing:'issueServingsMissing',tempMissing:'issueTempMissing',totalTooShort:'issueTotalTooShort'}[issue.code];
  return key?t(key,{count:issue.count||0}):(issue.message||'');
}
function renderImportQuality(recipe){
  const panel=$('#importQualityPanel'); if(!panel)return;
  const q=validateRecipe(recipe||{});
  recipe.importQuality=q;
  const label=q.grade==='good'?t('qualityGood'):q.grade==='review'?t('qualityReview'):t('qualityPoor');
  panel.className=`import-quality quality-${q.grade}`;
  const repairs=(recipe?.importRepairs||[]).map(x=>({temperature:t('ovenTemperature'),cookTime:t('cookBakeTime'),servings:t('servings'),totalTime:t('totalTime')}[x.field]||x.field));
  const repairHtml=repairs.length?`<div class="quality-repairs">${escapeHtml(t('autoRecovered'))}: ${escapeHtml([...new Set(repairs)].join(', '))}</div>`:'';
  panel.innerHTML=`<div class="quality-top"><strong>${escapeHtml(t('importQuality'))}: ${escapeHtml(label)}</strong><span>${q.score}/100 · ${q.ingredientCount} ${escapeHtml(t('ingredientPlural'))} · ${q.stepCount} ${escapeHtml(t('steps').toLowerCase())}</span></div>${repairHtml}${q.issues.length?`<ul>${q.issues.map(i=>`<li>${escapeHtml(qualityIssueText(i))}</li>`).join('')}</ul>`:`<div class="quality-clean">${escapeHtml(t('qualityClean'))}</div>`}`;
  panel.classList.remove('hidden');
}
function recipeAddedAt(recipe){
  return timestampFromRecipeId(recipe?.id) || Number(recipe?.createdAt) || Number(recipe?.updatedAt) || 0;
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
  s = s.replace(/^\d+[\d\s./,-]*\s*/, '');
  // remove common unit words wherever they occur near the start
  const unitPattern = new RegExp(`^(${UNITS.map(u=>normalizeText(u).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).filter(Boolean).join('|')})\\b\\s*`, 'i');
  s = s.replace(unitPattern, '');
  let words = s.split(/\s+/).filter(Boolean).filter(w => !PREP_WORDS.has(w));
  s = words.join(' ');
  for (const [variants, canonical] of SYNONYMS) {
    if (variants.some(v => { const n=normalizeText(v); return s===n || s.includes(n) || n.includes(s); })) return canonical;
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
  const av=textVariants(String(a||''),state.textTranslations||{}), bv=textVariants(String(b||''),state.textTranslations||{});
  let best=0;
  for(const aa of av)for(const bb of bv){
    const x=canonicalIngredient(aa),y=canonicalIngredient(bb);if(!x||!y)continue;
    if(x===y)return 1;
    if((x.includes(y)||y.includes(x))&&Math.min(x.length,y.length)>=4){best=Math.max(best,.91);continue;}
    const xt=new Set(x.split(' ')),yt=new Set(y.split(' '));const common=[...xt].filter(t=>yt.has(t)).length;const union=new Set([...xt,...yt]).size;
    const tokenScore=union?common/union:0;const editScore=1-levenshtein(x,y)/Math.max(x.length,y.length);best=Math.max(best,tokenScore,editScore*.92);
  }
  return best;
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
  return String(raw)
    .replace(/½/g,' 1/2').replace(/¼/g,' 1/4').replace(/¾/g,' 3/4')
    .replace(/⅓/g,' 1/3').replace(/⅔/g,' 2/3')
    .replace(/⅛/g,' 1/8').replace(/⅜/g,' 3/8').replace(/⅝/g,' 5/8').replace(/⅞/g,' 7/8')
    .replace(/(\d\/\d)(?=[\p{L}])/gu,'$1 ')
    .replace(/(\d)(?=(?:kg|mg|g|ml|cl|dl|l|oz|lb|cup|cups|tbsp|tsp)\b)/gi,'$1 ')
    .replace(/\s+/g,' ')
    .trim();
}
function canonicalUnit(raw='') {
  const n=normalizeText(String(raw).replace(/\.$/,''));
  return UNIT_ALIASES[n] || '';
}
function looksLikeIngredientGroup(line='') {
  const raw=String(line||'').trim().replace(/[:：]\s*$/,'');
  const n=normalizeText(raw);
  if (!n || raw.length>55 || /\d/.test(raw)) return false;
  const groups=[
    'base','crust','dough','batter','filling','topping','frosting','icing','sauce','marinade','garnish','to serve','for serving','starter','main dough',
    'pohja','taikina','tayte','täyte','kuorrute','kastike','marinadi','koristeluun','tarjoiluun','alkutaikina',
    'base','impasto','ripieno','farcitura','copertura','glassa','salsa','marinatura','guarnizione','per servire','lievitino'
  ].map(normalizeText);
  if (groups.includes(n)) return true;
  return /^(for|per)\s+[a-zà-ÿ]{3,30}$/i.test(raw) || /^(the|il|lo|la|i|gli|le)\s+[a-zà-ÿ]{3,30}$/i.test(raw);
}
function repairIngredientOcr(raw='') {
  return String(raw)
    .replace(/^(\d)\s*%\s+(?=(?:dl|cl|ml|l|cup|cups|tazza|tazze)\b)/i,'$1 1/4 ')
    .replace(/^%\s+(?=(?:dl|cl|ml|l|cup|cups|tazza|tazze)\b)/i,'1/2 ')
    .replace(/^(\d)\s*(rkl|tl|prk|kpl|ruukku)\b/i,'$1 $2')
    .replace(/\s+/g,' ').trim();
}
function cleanIngredientName(name='') {
  let out=cleanInlineSpacing(String(name))
    .replace(/\(\(\s*/g,'(').replace(/\s*\)\)/g,')')
    .replace(/\](?=\))/g,'').replace(/\[\s*\)/g,')').replace(/\(\s*\]/g,'(')
    .replace(/(\d)\s*mls?\b/gi,'$1 ml')
    .replace(/(\d)\s*(?:grams?|grammes?|gms?)\b/gi,'$1 g')
    .replace(/\b1\s+sticks\b/gi,'1 stick')
    .replace(/(\d)\s*x\s*(\d)/gi,'$1 × $2')
    .replace(/\s*\/\s*/g,' / ')
    .replace(/\)\s+([\p{L}])/gu,'), $1')
    .replace(/\s+/g,' ')
    .trim();
  const opens=(out.match(/\(/g)||[]).length, closes=(out.match(/\)/g)||[]).length;
  if(closes>opens && /\)$/.test(out)) out=out.replace(/\)+$/,'');
  return out.trim();
}
function parseIngredientLine(line) {
  let raw = cleanInlineSpacing(String(line || '').replace(/^[-•*–—]\s*/, '').replace(/^\[Input\]\s*/i,''));
  if (!raw) return null;
  if (/^#{1,6}\s*/.test(raw)) raw=raw.replace(/^#{1,6}\s*/, '').trim();
  if (looksLikeIngredientGroup(raw)) return { kind:'group', raw, name:raw.replace(/[:：]\s*$/,''), qty:null, qtyText:'', unit:'', unitCanonical:'', optional:false };
  raw = repairIngredientOcr(cleanQty(raw));
  // Quantities support integers, decimal comma/dot, fractions, mixed fractions and ranges.
  const m = raw.match(/^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:[.,]\d+)?)(?:\s*[-–—]\s*\d+(?:[.,]\d+)?)?)?\s*([\p{L}.]+)?\s*(.*)$/u);
  let qtyText = (m?.[1] || '').trim();
  const maybeUnit=(m?.[2] || '').trim();
  const unitCanonical=canonicalUnit(maybeUnit);
  let unit = unitCanonical ? maybeUnit.replace(/\.$/,'').toLowerCase() : '';
  let name = (m?.[3] || '').trim();
  if (maybeUnit && !unitCanonical) name = `${maybeUnit} ${name}`.trim();
  if (!name) name = raw;
  const optional=/\b(optional|to taste|halutessasi|valinnainen|maun mukaan|facoltativ[oa]|a piacere|quanto basta|q\.?b\.?)\b/i.test(raw);
  name=cleanIngredientName(name)
    .replace(/\s*\((?:optional|halutessasi|valinnainen|facoltativ[oa])\)\s*$/i,'')
    .replace(/\s+(?:optional|halutessasi|valinnainen|facoltativ[oa])\s*$/i,'')
    .trim();
  let note='';
  const noteMatch=name.match(/^(.+?)\s*\(([^()]{1,140})\)\s*(?:,\s*(.+))?$/);
  if(noteMatch && noteMatch[1].trim().length>=2){name=noteMatch[1].trim();note=[noteMatch[2],noteMatch[3]].filter(Boolean).join('; ');}
  const range = qtyText.match(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)$/);
  let qty = range ? null : parseNumber(qtyText);
  return { kind:'ingredient', raw, qty, qtyText, unit, unitCanonical, name, note, optional };
}
function ingredientToLine(i) {
  if (!i) return '';
  if (i.kind==='group') return `## ${i.name}`;
  const qty = i.qtyText || (Number.isFinite(i.qty) ? String(i.qty) : '');
  return [qty, i.unit, i.name].filter(Boolean).join(' ').trim() + (i.note?` (${i.note})`:'');
}
function formatQty(i) {
  if (i?.kind==='group') return '';
  const q = i.qtyText || (Number.isFinite(i.qty) ? String(i.qty) : '');
  return [q, i.unit].filter(Boolean).join(' ') || '—';
}

// Display-only cooking-unit conversion. Stored recipe quantities always remain untouched.
const MASS_TO_G = {mg:.001,g:1,kg:1000,oz:28.349523125,lb:453.59237};
const VOLUME_TO_ML = {ml:1,cl:10,dl:100,l:1000,tsp:5,tbsp:15,cup:240};
const METRIC_UNITS = new Set(['mg','g','kg','ml','cl','dl','l']);
const METRIC_RAW_UNITS = new Set(['mg','g','kg','ml','cl','dl','l','rkl','tl','cucchiaio','cucchiai','cucchiaino','cucchiaini']);
const US_RAW_UNITS = new Set(['oz','ounce','ounces','lb','lbs','pound','pounds','tsp','teaspoon','teaspoons','tbsp','tablespoon','tablespoons','cup','cups']);

function cleanDisplayNumber(n, maxDecimals=2) {
  if (!Number.isFinite(n)) return '';
  const rounded=Math.round(n*Math.pow(10,maxDecimals))/Math.pow(10,maxDecimals);
  return String(rounded).replace(/\.0+$/,'').replace(/(\.\d*?[1-9])0+$/,'$1');
}
function fractionText(value) {
  if (!Number.isFinite(value)) return '';
  const whole=Math.floor(value+1e-9);
  const frac=value-whole;
  const choices=[[0,''],[1/8,'⅛'],[1/4,'¼'],[1/3,'⅓'],[3/8,'⅜'],[1/2,'½'],[5/8,'⅝'],[2/3,'⅔'],[3/4,'¾'],[7/8,'⅞'],[1,'']];
  let best=choices[0];
  for(const c of choices) if(Math.abs(c[0]-frac)<Math.abs(best[0]-frac)) best=c;
  let w=whole;
  if(best[0]===1) w++;
  const approx=Math.abs((w+(best[0]===1?0:best[0]))-value)>0.025;
  if(!w && !best[1]) return {text:'0',approx};
  return {text:[w||'',best[1]].filter(Boolean).join(' '),approx};
}
function quantityRange(item) {
  if (Number.isFinite(item?.qty)) return {values:[item.qty],range:false};
  const txt=cleanQty(item?.qtyText||'');
  const m=txt.match(/^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*[-–—]\s*(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)$/);
  if(m){const a=parseNumber(m[1]),b=parseNumber(m[2]);if(Number.isFinite(a)&&Number.isFinite(b))return{values:[a,b],range:true};}
  const q=parseNumber(txt); return Number.isFinite(q)?{values:[q],range:false}:null;
}
function preferredMetric(base, dimension) {
  if(dimension==='mass') {
    if(base>=1000) return {value:base/1000,unit:'kg'};
    if(base<1 && base>0) return {value:base*1000,unit:'mg'};
    return {value:base,unit:'g'};
  }
  if(base>=1000) return {value:base/1000,unit:'l'};
  return {value:base,unit:'ml'};
}
function preferredUS(base, dimension) {
  if(dimension==='mass') {
    const oz=base/MASS_TO_G.oz;
    if(oz>=16) return {value:base/MASS_TO_G.lb,unit:'lb'};
    return {value:oz,unit:'oz'};
  }
  if(base>=60) return {value:base/VOLUME_TO_ML.cup,unit:'cup'};
  if(base>=15) return {value:base/VOLUME_TO_ML.tbsp,unit:'tbsp'};
  return {value:base/VOLUME_TO_ML.tsp,unit:'tsp'};
}
function formatConvertedValue(value, unit, system) {
  if(system==='us' && ['cup','tbsp','tsp'].includes(unit)) {
    const f=fractionText(value);
    if(f && !f.approx) return {text:`${f.text} ${unit}`,approx:false};
  }
  const decimals = unit==='g'||unit==='ml' ? 0 : (unit==='kg'||unit==='l'||unit==='lb'||unit==='cup' ? 2 : 1);
  return {text:`${cleanDisplayNumber(value,decimals)} ${unit}`,approx:true};
}
function convertIngredientAmount(item, system=state.measurementSystem||'metric') {
  if (!item || item.kind==='group') return null;
  const canonical=item.unitCanonical||canonicalUnit(item.unit||'');
  const qr=quantityRange(item);
  if(!qr || !canonical) return null;
  const dimension=MASS_TO_G[canonical]!=null?'mass':VOLUME_TO_ML[canonical]!=null?'volume':null;
  if(!dimension) return null;
  const rawUnit=normalizeText(item.unit||'');
  const alreadyTarget = system==='metric' ? METRIC_RAW_UNITS.has(rawUnit) : US_RAW_UNITS.has(rawUnit);
  if(alreadyTarget) return {text:formatQty(item),approx:false,converted:false};
  const factor=dimension==='mass'?MASS_TO_G[canonical]:VOLUME_TO_ML[canonical];
  const convertOne=v=> system==='metric' ? preferredMetric(v*factor,dimension) : preferredUS(v*factor,dimension);
  const out=qr.values.map(convertOne);
  // Ranges use one shared target unit, chosen from the larger amount.
  if(qr.range && out.length===2){
    const bases=qr.values.map(v=>v*factor);
    const target=(system==='metric'?preferredMetric(Math.max(...bases),dimension):preferredUS(Math.max(...bases),dimension)).unit;
    const targetFactor=dimension==='mass'?MASS_TO_G[target]:VOLUME_TO_ML[target];
    const vals=bases.map(v=>v/targetFactor);
    const a=formatConvertedValue(vals[0],target,system);
    const b=formatConvertedValue(vals[1],target,system);
    return {text:`${a.text.replace(` ${target}`,'')}–${b.text}`,approx:a.approx||b.approx,converted:true};
  }
  const f=formatConvertedValue(out[0].value,out[0].unit,system);
  return {text:f.text,approx:f.approx,converted:true};
}
function convertQuantityBetween(value, fromUnit, toUnit) {
  if(!Number.isFinite(value) || !fromUnit || !toUnit) return null;
  if(fromUnit===toUnit) return value;
  if(MASS_TO_G[fromUnit]!=null && MASS_TO_G[toUnit]!=null) return value*MASS_TO_G[fromUnit]/MASS_TO_G[toUnit];
  if(VOLUME_TO_ML[fromUnit]!=null && VOLUME_TO_ML[toUnit]!=null) return value*VOLUME_TO_ML[fromUnit]/VOLUME_TO_ML[toUnit];
  return null;
}
const UNIT_DISPLAY={
  fi:{tbsp:'rkl',tsp:'tl',cup:'cup',pinch:'ripaus',can:'prk',package:'pkt',slice:'viipale',clove:'kynsi',bunch:'nippu',piece:'kpl',pot:'ruukku',stick:'tanko',handful:'kourallinen'},
  it:{tbsp:'cucchiaio',tsp:'cucchiaino',cup:'tazza',pinch:'pizzico',can:'lattina',package:'confezione',slice:'fetta',clove:'spicchio',bunch:'mazzetto',piece:'pezzo',pot:'vasetto',stick:'bastoncino',handful:'manciata'}
};
function localizeQtyUnitText(text=''){
  const lang=state.language||'en';if(lang==='en')return text;
  const map=UNIT_DISPLAY[lang]||{};
  return String(text).replace(/\b(mg|kg|g|ml|cl|dl|l|tbsp|tsp|cup|oz|lb|pinch|can|package|slice|clove|bunch|piece|pot|stick|handful)\b$/i,(m)=>map[m.toLowerCase()]||m);
}
function displayQty(item) {
  const converted=convertIngredientAmount(item);
  const raw=converted?`${converted.converted && converted.approx?'≈ ':''}${converted.text}`:formatQty(item);
  return localizeQtyUnitText(raw);
}
function displayIngredientLine(item) {
  if(!item) return '';
  if(item.kind==='group') return `## ${item.name}`;
  const q=displayQty(item);
  return [q==='—'?'':q,item.name].filter(Boolean).join(' ').trim() + (item.note?` (${item.note})`:'');
}

function stripMarkdown(s='') {
  return String(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/\[Input(?::[^\]]*)?\]/gi,'')
    .replace(/<[^>]+>/g,'')
    .replace(/[*_`>]/g,'')
    .replace(/\r/g,'');
}
function extractFirstImageUrl(text='') {
  const m = String(text).match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)[^)]*\)/i);
  return m?.[1] || '';
}
function extractLikelySourceUrl(text='') {
  const urls=[...String(text).matchAll(/https?:\/\/[^\s<>()\]]+/gi)].map(m=>m[0].replace(/[.,;:]+$/,''));
  if(!urls.length) return '';
  const recipeish=urls.find(u=>!/\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i.test(u) && !/r\.jina\.ai/i.test(u));
  return recipeish||urls[0];
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
function cleanRecipeLine(line='') {
  const raw=String(line);
  const hadBullet=/^\s*[-*•]\s+/.test(raw);
  let cleaned=cleanInlineSpacing(stripMarkdown(raw)
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-•]\s+/, ''));
  return hadBullet && cleaned ? `• ${cleaned}` : cleaned;
}

function headingType(line='') {
  let n=normalizeText(String(line).replace(/^\s*#{1,6}\s*/,'').replace(/[:：]\s*$/,''));
  if (!n) return '';
  for (const [type,set] of Object.entries(HEADING_SETS)) {
    if (set.has(n)) return type;
    for (const h of set) {
      if (type==='stop' && n.startsWith(h)) return type;
      if (n.startsWith(h+' ')) {
        const rest=n.slice(h.length+1);
        if (type==='steps' && /\b(time|aika|tempo|min|hour|ore)\b/.test(rest)) continue;
        if (/^(?:(?:for|per)\s+)?\d|^(?:serves?|servings?|annosta|annos|porzioni?|persone)\b/.test(rest)) return type;
      }
    }
  }
  return '';
}
function looksLikeIngredient(line='') {
  const s=String(line).replace(/^•\s*/, '').trim();
  if (!s || s.length>220 || headingType(s) || looksLikeIngredientGroup(s)) return false;
  if (/^\d+[.)]\s+[A-ZÀ-ÖØ-Ý]/.test(s) && s.length>45) return false;
  if (/^(\d|½|¼|¾|⅓|⅔|⅛|%)\s*/.test(s) && s.split(/\s+/).length >= 2) return true;
  const n=normalizeText(s);
  const unitStart=UNITS.map(u=>normalizeText(u)).filter(Boolean).sort((a,b)=>b.length-a.length).map(u=>u.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  if (unitStart && new RegExp(`^(?:(?:\d+(?:[.,]\d+)?|\d+\/\d+|\d+\s+\d+\/\d+|1\/2|1\/4|3\/4)\s*)?(?:${unitStart})\b`,'i').test(n)) return true;
  // Website recipe cards often include quantity-free optional items such as "pearl sugar optional".
  return /\b(optional|valinnainen|halutessasi|maun mukaan|to taste|facoltativ[oa]|q\.?b\.?|quanto basta|a piacere)\b/i.test(s) && s.length<90;
}
function looksLikeStep(line='') {
  const s=String(line).replace(/^•\s*/, '').trim();
  if (!s || headingType(s) || looksLikeIngredient(s)) return false;
  if (/^(?:step|vaihe|passaggio)?\s*\d+[.)\-:]\s*/i.test(s)) return true;
  if (s.length>45 && /[.!?]$/.test(s)) return true;
  return /^(add|mix|stir|heat|cook|bake|preheat|combine|whisk|fold|pour|place|season|serve|bring|simmer|boil|fry|roast|blend|chop|slice|beat|knead|spread|top|drain|rinse|marinate|refrigerate|chill|allow|let|scrape|cut|divide|cover|set|scald|lisaa|lisää|sekoita|kuumenna|keitä|keita|paista|esilämmitä|esilammita|yhdistä|yhdista|vatkaa|kaada|laita|mausta|tarjoile|hauduta|kiehauta|pilko|viipaloi|vaivaa|levitä|levita|valuta|huuhtele|marinoi|jäähdytä|jaahdyta|anna|jätä|jata|siivilöi|siiviloi|pyöräytä|pyorayta|pingota|pane|aggiungi|mescola|scalda|cuoci|inforna|preriscalda|unisci|sbatti|versa|metti|condisci|servi|porta|sobbolli|bollire|friggi|arrostisci|frulla|trita|affetta|impasta|stendi|scola|sciacqua|marina|raffredda|lascia|copri|dividi|taglia)\b/i.test(s);
}
function cleanStepLine(l='') {
  return cleanInlineSpacing(String(l).replace(/^•\s*/, '').replace(/^\s*(?:step|vaihe|passaggio)?\s*\d+[.):\-]?\s*/i,''));
}
function paragraphAwareLines(rawText='') {
  // Keep source line boundaries. Jina Reader emits recipe-card list items one per line,
  // and OCR line wraps are merged later with section-aware logic.
  return String(rawText).replace(/\r/g,'').split('\n').map(cleanRecipeLine).filter(Boolean);
}

function collectSectionCandidates(lines, type) {
  const out=[];
  for(let i=0;i<lines.length;i++){
    if(headingType(lines[i])!==type) continue;
    const entries=[];
    for(let j=i+1;j<lines.length && entries.length<80;j++){
      const ht=headingType(lines[j]);
      if(ht) break;
      if(BOILERPLATE_RE.test(lines[j])) break;
      entries.push({i:j,text:lines[j]});
    }
    out.push({start:i, entries});
  }
  return out;
}
function ingredientCandidateScore(c) {
  if(!c) return -999;
  let qty=0, units=0, groups=0, prose=0, plausible=0;
  for(const x of c.entries){
    const s=x.text.replace(/^•\s*/, '').trim();
    if(looksLikeIngredientGroup(s)){groups++; continue;}
    if(looksLikeIngredient(s)){plausible++; if(/^(\d|½|¼|¾|⅓|⅔|⅛|%)/.test(s))qty++; if(UNITS.some(u=>new RegExp(`\\b${normalizeText(u)}\\b`).test(normalizeText(s))))units++;}
    if(s.length>120 || (/\.[ ]/.test(s) && !/\([^)]*\)/.test(s))) prose++;
  }
  return plausible*5 + qty*4 + units*2 + groups - prose*4 + Math.min(c.entries.length,25)*.15;
}
function stepCandidateScore(c) {
  if(!c) return -999;
  let steps=0, verbs=0, ingredientish=0;
  for(const x of c.entries){
    const s=x.text.replace(/^•\s*/, '').trim();
    if(looksLikeStep(s)) steps++;
    if(/^(add|mix|stir|bake|preheat|let|allow|scrape|cut|cover|laita|sekoita|paista|anna|jätä|jata|siivilöi|siiviloi|aggiungi|mescola|cuoci|inforna|lascia|copri|taglia)\b/i.test(s)) verbs++;
    if(looksLikeIngredient(s)) ingredientish++;
  }
  return steps*4 + verbs*2 - ingredientish*3 + Math.min(c.entries.length,30)*.15;
}
function pickBestCandidate(candidates, scorer, preferredAfter=-1) {
  if(!candidates.length) return null;
  return [...candidates].sort((a,b)=>{
    const sa=scorer(a)+(preferredAfter>=0 && a.start>preferredAfter && a.start-preferredAfter<100?3:0);
    const sb=scorer(b)+(preferredAfter>=0 && b.start>preferredAfter && b.start-preferredAfter<100?3:0);
    return sb-sa || b.start-a.start;
  })[0];
}
function isMetadataLine(s='') {
  const n=normalizeText(s);
  return /\b(prep time|cook time|total time|rest time|resting|servings|yield|valmistusaika|annokset|annosta|kokonaisaika|paistoaika|kypsennysaika|tempo di preparazione|tempo di cottura|tempo totale|porzioni|persone)\b/i.test(s)
    || /^\d+\s*(?:min|minuutt|minutes?|hours?|tunt|ore)\b/i.test(s)
    || /^(?:by|author|published|updated|rating)\b/i.test(s);
}
function joinIngredientContinuations(entries=[]) {
  const out=[];
  let current='';
  for(const entry of entries){
    const s=entry.text.replace(/^•\s*/, '').trim();
    if(!s || BOILERPLATE_RE.test(s) || isMetadataLine(s)) continue;
    if(looksLikeIngredientGroup(s)){
      if(current){out.push(current);current='';}
      out.push(s);continue;
    }
    if(looksLikeIngredient(s)){
      if(current) out.push(current);
      current=s;continue;
    }
    if(current && !looksLikeStep(s) && !headingType(s)){
      // OCR commonly wraps parenthetical descriptions and long ingredient names.
      if(/[(-]$/.test(current) || /\b(and|or|tai|ja|o|e|oppure)\s*$/i.test(current) || (current.includes('(') && !current.includes(')'))) current += ' '+s;
    }
  }
  if(current) out.push(current);
  return out;
}
function joinStepContinuations(entries=[]) {
  const out=[];
  let current='';
  const numberedCount=entries.filter(entry=>/^(?:•\s*)?(?:\d+[.)]|step\s+\d|vaihe\s+\d|passaggio\s+\d)/i.test(String(entry.text||'').trim())).length;
  const numberedMode=numberedCount>=2;
  for(const entry of entries){
    const raw=String(entry.text||'').trim();
    const s=cleanStepLine(raw);
    if(!s || BOILERPLATE_RE.test(s) || headingType(s) || isMetadataLine(s) || looksLikeIngredientGroup(s) || looksLikeIngredient(s)) continue;
    const bullet=/^•\s*/.test(raw);
    const numbered=/^(?:•\s*)?(?:\d+[.)]|step\s+\d|vaihe\s+\d|passaggio\s+\d)/i.test(raw);
    const strongStart=bullet||numbered||/^(add|mix|stir|heat|cook|bake|preheat|combine|whisk|fold|pour|place|season|serve|bring|simmer|boil|fry|roast|blend|chop|slice|beat|knead|spread|top|drain|rinse|marinate|refrigerate|chill|allow|let|scrape|cut|divide|cover|set|scald|lisaa|lisää|sekoita|kuumenna|keitä|keita|paista|esilämmitä|esilammita|yhdistä|yhdista|vatkaa|kaada|laita|mausta|tarjoile|hauduta|kiehauta|pilko|viipaloi|vaivaa|levitä|levita|valuta|huuhtele|marinoi|jäähdytä|jaahdyta|anna|jätä|jata|siivilöi|siiviloi|pyöräytä|pyorayta|pingota|pane|aggiungi|mescola|scalda|cuoci|inforna|preriscalda|unisci|sbatti|versa|metti|condisci|servi|porta|sobbolli|bollire|friggi|arrostisci|frulla|trita|affetta|impasta|stendi|scola|sciacqua|marina|raffredda|lascia|copri|dividi|taglia)(?=\s|$|[,.])/i.test(s);
    if(numberedMode){
      if(numbered){if(current)out.push(current.trim());current=s;}
      else if(current){current+=' '+s;}
      else if(looksLikeStep(s)){current=s;}
    }else{
      if(strongStart){if(current)out.push(current.trim());current=s;}
      else if(current){current+=' '+s;}
      else if(looksLikeStep(s)){current=s;}
    }
  }
  if(current)out.push(current.trim());
  return out;
}
function findBestTitle(lines=[]) {
  const candidates=[];
  for(let i=0;i<Math.min(lines.length,22);i++){
    const l=lines[i].replace(/^•\s*/,'').trim();
    if(!l||headingType(l)||looksLikeIngredient(l)||looksLikeIngredientGroup(l)||isMetadataLine(l)||BOILERPLATE_RE.test(l))continue;
    if(l.length<3||l.length>105||/[.!?]$/.test(l)||/^(title|by|author|published|updated|image|source|url|markdown content)\b/i.test(l))continue;
    const words=l.split(/\s+/).length;
    if(words<1||words>10)continue;
    let score=12-Math.abs(words-4)-(words===1?3:0);
    if(i<8)score+=4;
    if(/^#/.test(l))score+=2;
    if(/recipe|resepti|ricetta/i.test(l))score+=1;
    candidates.push({i,l,score});
  }
  candidates.sort((a,b)=>b.score-a.score||a.i-b.i);
  return candidates[0]||null;
}

function normalizeTemperatureText(value='') {
  return cleanInlineSpacing(String(value||''))
    .replace(/º/g,'°')
    // Prefer compact temperature units in the dedicated Oven field.
    // Examples: "180 Celsius", "180 degrees Celsius", "350 Fahrenheit".
    .replace(/\b(\d{2,3}(?:[.,]\d+)?)\s*(?:degrees?\s*)?celsius\b/gi,'$1°C')
    .replace(/\b(\d{2,3}(?:[.,]\d+)?)\s*(?:degrees?\s*)?fahrenheit\b/gi,'$1°F')
    .replace(/\bcelsius\s*(\d{2,3}(?:[.,]\d+)?)\b/gi,'$1°C')
    .replace(/\bfahrenheit\s*(\d{2,3}(?:[.,]\d+)?)\b/gi,'$1°F')
    .replace(/\b(\d{2,3}(?:[.,]\d+)?)\s*°?\s*c\b/gi,'$1°C')
    .replace(/\b(\d{2,3}(?:[.,]\d+)?)\s*°?\s*f\b/gi,'$1°F')
    .replace(/\s*°\s*([CF])\b/gi,'°$1')
    .replace(/\s*\/\s*/g,' / ')
    .trim();
}
function extractTemperatures(text='') {
  const src=String(text||'').replace(/º/g,'°');
  const hits=[];
  const push=(v)=>{v=normalizeTemperatureText(v);if(v&&!hits.some(x=>normalizeText(x)===normalizeText(v)))hits.push(v);};
  const pair=/\b(\d{2,3}(?:[.,]\d+)?)\s*°?\s*([FC])\s*[/|]\s*(\d{2,3}(?:[.,]\d+)?)\s*°?\s*([FC])\b/gi;
  let m;
  while((m=pair.exec(src))) push(`${m[1]}°${m[2].toUpperCase()} / ${m[3]}°${m[4].toUpperCase()}`);
  const single=/\b(\d{2,3}(?:[.,]\d+)?)\s*°\s*([CF])\b/gi;
  while((m=single.exec(src))) {
    const v=`${m[1]}°${m[2].toUpperCase()}`;
    if(!hits.some(x=>x.includes(v))) push(v);
  }
  const gas=/\bgas\s*(?:mark)?\s*(\d+(?:\.\d+)?)\b/gi;
  while((m=gas.exec(src))) push(`Gas ${m[1]}`);
  return hits.join(' / ');
}
function firstMetaMatch(text, patterns=[]) {
  const src=String(text||'');
  for(const re of patterns){const m=src.match(re);if(m?.[1])return cleanInlineSpacing(m[1]);}
  return '';
}
function extractTimingGrid(text='') {
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(cleanInlineSpacing).filter(Boolean);
  const idx=lines.findIndex(l=>{
    const en=/\bprep(?:aration)?\s*time\b/i.test(l)&&/\bcook(?:ing)?\s*time\b/i.test(l)&&/\btotal\s*time\b/i.test(l);
    const fi=/\bvalmistusaika\b/i.test(l)&&/\b(?:paistoaika|kypsennysaika)\b/i.test(l)&&/\bkokonaisaika\b/i.test(l);
    const it=/\btempo\s+di\s+preparazione\b/i.test(l)&&/\btempo\s+di\s+cottura\b/i.test(l)&&/\btempo\s+totale\b/i.test(l);
    return en||fi||it;
  });
  if(idx<0)return {};
  const window=lines.slice(idx,Math.min(lines.length,idx+5)).join(' ');
  const re=/\b\d+(?:[.,]\d+)?\s*(?:hrs?|hours?|h|ore?|tunti|tuntia)?(?:\s+\d+(?:[.,]\d+)?\s*)?(?:mins?|minutes?|min|minuti?|minuuttia?)\b/gi;
  const values=[...window.matchAll(re)].map(m=>cleanInlineSpacing(m[0])).filter(Boolean);
  if(values.length<2)return {};
  const out={prepTime:values[0]||'',cookTime:values[1]||''};
  // Typical four-column recipe card: prep, cook, resting/rising, total. Visual extraction
  // often returns total before the resting value because the latter wraps to the next row.
  if(values.length>=4){out.totalTime=values[2];out.restTime=values[3];}
  else if(values.length===3){out.totalTime=values[2];}
  return out;
}
function extractRecipeFacts(text='', source={}) {
  const doc=source.documentMeta||{};
  const grid=extractTimingGrid(text);
  const facts={
    prepTime:cleanInlineSpacing(doc.prepTime||grid.prepTime||''),
    cookTime:cleanInlineSpacing(doc.cookTime||grid.cookTime||''),
    restTime:cleanInlineSpacing(doc.restTime||grid.restTime||''),
    totalTime:cleanInlineSpacing(doc.totalTime||grid.totalTime||''),
    temperature:normalizeTemperatureText(doc.temperature||''),
    author:cleanInlineSpacing(doc.author||'')
  };
  if(!facts.prepTime) facts.prepTime=firstMetaMatch(text,[
    /(?:prep(?:aration)?\s*time|valmistusaika|tempo\s+di\s+preparazione)\s*[:\-]?\s*([^\n|]{2,45})/i
  ]);
  if(!facts.cookTime) facts.cookTime=firstMetaMatch(text,[
    /(?:cook(?:ing)?\s*time|bake\s*time|paistoaika|kypsennysaika|tempo\s+di\s+cottura)\s*[:\-]?\s*([^\n|]{2,45})/i
  ]);
  if(!facts.restTime) facts.restTime=firstMetaMatch(text,[
    /(?:rest(?:ing)?(?:\s+and\s+rising)?\s*time|rising\s*time|kohotus(?:aika)?|lepoaika|riposo|lievitazione)\s*[:\-]?\s*([^\n|]{2,45})/i
  ]);
  if(!facts.totalTime) facts.totalTime=firstMetaMatch(text,[
    /(?:total\s*time|kokonaisaika|tempo\s+totale)\s*[:\-]?\s*([^\n|]{2,45})/i
  ]);
  if(!facts.author) facts.author=firstMetaMatch(text,[/(?:author|tekijä|tekija|autore)\s*:\s*([^\n|]{2,80})/i]);
  if(!facts.temperature) facts.temperature=extractTemperatures(text);
  return facts;
}
function extractMetadata(text='', source={}) {
  // Timings and oven temperatures are first-class recipe fields now, not Notes text.
  const facts=extractRecipeFacts(text,source);
  const out=[];
  return out;
}
function extractServings(lines=[], text='', source={}) {
  if(source.documentMeta?.servings) return String(source.documentMeta.servings).trim();
  for(const l of lines){
    let m=l.match(/^(?:servings?|yield)\s*[:\-]?\s*(.+)$/i); if(m) return m[1].replace(/\s*(?:\||\s{2,})?\s*(?:author|by)\s*:.*$/i,'').trim().replace(/\s{2,}/g,' ');
    m=l.match(/^(?:porzioni?|dosi)\s*[:\-]?\s*(.+)$/i); if(m) return m[1].replace(/\s*(?:\||\s{2,})?\s*(?:autore)\s*:.*$/i,'').trim();
    m=l.match(/^(?:annokset|annoksia?)\s*[:\-]?\s*(\d+(?:\s*[-–]\s*\d+)?(?:\s+[^|]{0,35})?)/i); if(m) return m[1].replace(/\s*(?:\||\s{2,})?\s*(?:tekijä|tekija)\s*:.*$/i,'').trim();
    m=l.match(/\b(\d+(?:\s*[-–]\s*\d+)?)\s+(annosta|porzioni|persone)\b/i); if(m) return m[1].trim();
  }
  const m=String(text).match(/(?:serves?|servings?|yield|annoksia?|annosta|annos|riittää|riittaa|porzioni?|dosi|persone)\s*[:\-]?\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
  return m?.[1]||'';
}

function joinNoteContinuations(entries=[]) {
  const out=[];
  let current='';
  const flush=()=>{if(current.trim())out.push(current.trim());current='';};
  for(const entry of entries){
    const raw=String(entry.text||'').replace(/^•\s*/,'').trim();
    if(!raw||BOILERPLATE_RE.test(raw)||/https?:\/\//i.test(raw))continue;
    const subheading=/^(tips(?: for success)?|vinkit|vinkki|consigli|suggerimenti|note dello chef)$/i.test(raw);
    if(subheading){flush();out.push(raw);continue;}
    if(!current){current=raw;continue;}
    if(/[.!?)]$/.test(current)){flush();current=raw;}
    else current+=' '+raw;
  }
  flush();
  return out;
}
function usefulNotesFromSections(lines, chosenStep) {
  const noteCandidates=collectSectionCandidates(lines,'notes');
  let chosen=pickBestCandidate(noteCandidates,c=>Math.min(c.entries.length,30)+(chosenStep&&c.start>chosenStep.start?4:0),chosenStep?.start??-1);
  if(!chosen) return [];
  return joinNoteContinuations(chosen.entries).filter(x=>x.length<900).slice(0,30);
}
function usefulNutritionFromSections(lines) {
  const candidates=collectSectionCandidates(lines,'nutrition');
  if(!candidates.length)return [];
  const chosen=[...candidates].sort((a,b)=>b.entries.length-a.entries.length)[0];
  const values=chosen.entries.map(x=>x.text.replace(/^•\s*/,'').trim()).filter(x=>x&&!BOILERPLATE_RE.test(x)&&!/https?:\/\//i.test(x)).slice(0,12);
  if(!values.length)return [];
  return ['Nutrition',values.join(' ').replace(/\s*\|\s*/g,' | ').replace(/\s+/g,' ').trim()];
}

function usefulEquipmentFromSections(lines=[]) {
  const candidates=collectSectionCandidates(lines,'equipment');
  if(!candidates.length)return [];
  const chosen=[...candidates].sort((a,b)=>b.entries.length-a.entries.length)[0];
  return chosen.entries.map(x=>cleanInlineSpacing(String(x.text||'').replace(/^•\s*/,''))).filter(x=>x&&!BOILERPLATE_RE.test(x)&&x.length<180).slice(0,30);
}

function webRawLines(rawText='') {
  return String(rawText||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
}
function webHeading(raw='') {
  const m=String(raw||'').match(/^\s*(#{1,6})\s+(.+?)\s*$/);
  if(!m)return null;
  return {level:m[1].length,text:cleanInlineSpacing(stripMarkdown(m[2]))};
}
function cleanWebCardLine(raw='') {
  return cleanInlineSpacing(stripMarkdown(String(raw||''))
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^\[Input(?::[^\]]*)?\]\s*/i,''));
}
function isWebBullet(raw='') { return /^\s*[-*•]\s+/.test(String(raw||'')); }
function nextWebHeadingIndex(rawLines,start,limit=Infinity) {
  for(let i=start;i<Math.min(rawLines.length,limit);i++) if(webHeading(rawLines[i])) return i;
  return Math.min(rawLines.length,limit);
}
function findRecipeCardTitle(rawLines, ingredientIndex) {
  for(let i=ingredientIndex-1;i>=Math.max(0,ingredientIndex-45);i--){
    const h=webHeading(rawLines[i]);
    if(!h)continue;
    const type=headingType(h.text);
    if(type)continue;
    if(h.text.length<3||h.text.length>120)continue;
    if(/^(table of contents|why you|substitutions|variations|equipment|storage|serving suggestions|tips|faq)/i.test(h.text))continue;
    return {index:i,title:h.text,level:h.level};
  }
  const cleaned=rawLines.slice(Math.max(0,ingredientIndex-25),ingredientIndex).map(cleanWebCardLine).filter(Boolean);
  const pick=findBestTitle(cleaned);
  return pick?{index:Math.max(0,ingredientIndex-25)+pick.i,title:pick.l,level:6}:null;
}
function webRecipeCardCandidates(rawText='') {
  const rawLines=webRawLines(rawText);
  const candidates=[];
  for(let i=0;i<rawLines.length;i++){
    const ingHeading=webHeading(rawLines[i]);
    if(!ingHeading || headingType(ingHeading.text)!=='ingredients')continue;
    let stepIndex=-1;
    for(let j=i+1;j<Math.min(rawLines.length,i+100);j++){
      const h=webHeading(rawLines[j]);
      if(h && headingType(h.text)==='steps'){stepIndex=j;break;}
      if(h && h.level<=ingHeading.level && j>i+3)break;
    }
    if(stepIndex<0)continue;
    const title=findRecipeCardTitle(rawLines,i);
    const ingredientRegion=rawLines.slice(i+1,stepIndex);
    const plausible=ingredientRegion.map(cleanWebCardLine).filter(x=>x&&!BOILERPLATE_RE.test(x)&&looksLikeIngredient(x)).length;
    const bullets=ingredientRegion.filter(isWebBullet).length;
    const stepEnd=nextWebHeadingIndex(rawLines,stepIndex+1,Math.min(rawLines.length,stepIndex+100));
    const stepRegion=rawLines.slice(stepIndex+1,stepEnd);
    const stepBullets=stepRegion.filter(isWebBullet).length;
    const stepLike=stepRegion.map(cleanWebCardLine).filter(looksLikeStep).length;
    const metaText=rawLines.slice(title?.index??Math.max(0,i-20),i).map(cleanWebCardLine).join('\n');
    const facts=extractRecipeFacts(metaText,{});
    const servings=extractServings(metaText.split('\n'),metaText,{});
    const factCount=[facts.prepTime,facts.cookTime,facts.restTime,facts.totalTime,facts.author,servings].filter(Boolean).length;
    const score=plausible*12+Math.min(bullets,25)*2+Math.max(stepBullets,stepLike)*5+factCount*6+(title&&/recipe|resepti|ricetta/i.test(title.title)?8:0)+(i/rawLines.length);
    candidates.push({rawLines,ingredientIndex:i,stepIndex,stepEnd,title,score,plausible,bullets});
  }
  return candidates.sort((a,b)=>b.score-a.score);
}
function parseStructuredWebsiteRecipe(rawText='',source={}) {
  const candidate=webRecipeCardCandidates(rawText)[0];
  if(!candidate || candidate.plausible<3)return null;
  const {rawLines,ingredientIndex,stepIndex,title}=candidate;
  const recipeTitle=cleanInlineSpacing(source.title||title?.title||'Untitled recipe');
  const metaStart=title?.index??Math.max(0,ingredientIndex-20);
  const metadataRaw=rawLines.slice(metaStart+1,ingredientIndex).join('\n');
  const metadataClean=rawLines.slice(metaStart+1,ingredientIndex).map(cleanWebCardLine).filter(Boolean).join('\n');
  const facts=extractRecipeFacts(metadataClean,source);
  const servings=extractServings(metadataClean.split('\n'),metadataClean,source);

  const ingredients=[];
  for(const raw of rawLines.slice(ingredientIndex+1,stepIndex)){
    const line=cleanWebCardLine(raw);
    if(!line||BOILERPLATE_RE.test(line)||isMetadataLine(line))continue;
    if(!isWebBullet(raw) && !looksLikeIngredient(line) && !looksLikeIngredientGroup(line))continue;
    const parsed=parseIngredientLine(line);
    if(parsed && (parsed.kind==='group'||line.length<240))ingredients.push(parsed);
  }

  let stepEnd=rawLines.length;
  let noteIndex=-1, nutritionIndex=-1, nutritionText='';
  for(let i=stepIndex+1;i<rawLines.length;i++){
    const h=webHeading(rawLines[i]); if(!h)continue;
    const type=headingType(h.text);
    if(type==='notes'){noteIndex=i;stepEnd=i;break;}
    if(type==='nutrition'){nutritionIndex=i;stepEnd=i;break;}
    if(h.level<=3){stepEnd=i;break;}
  }
  const stepEntries=rawLines.slice(stepIndex+1,stepEnd).map((text,i)=>({i,text:cleanRecipeLine(text)}));
  let steps=joinStepContinuations(stepEntries);
  // In printable cards every bullet is one instruction; preserve that grouping exactly.
  const directBullets=rawLines.slice(stepIndex+1,stepEnd).filter(isWebBullet).map(cleanWebCardLine).filter(x=>x&&!BOILERPLATE_RE.test(x));
  if(directBullets.length>=2)steps=directBullets.map(cleanStepLine);

  const notes=[];
  const descriptionLines=rawLines.slice(metaStart+1,ingredientIndex).map(cleanWebCardLine).filter(x=>{
    if(!x||BOILERPLATE_RE.test(x)||isMetadataLine(x))return false;
    if(/^\d(?:\.\d+)?\s+from\s+\d+\s+votes?/i.test(x))return false;
    if(/^(author|prep|cook|rest|total|servings?|yield)\b/i.test(x))return false;
    return x.length>=20 && x.length<400;
  });
  const description=descriptionLines[0]||'';

  if(noteIndex>=0){
    let end=rawLines.length;
    for(let i=noteIndex+1;i<rawLines.length;i++){
      const h=webHeading(rawLines[i]); if(!h)continue;
      if(headingType(h.text)==='nutrition'){nutritionIndex=i;end=i;break;}
      if(h.level<=3){end=i;break;}
    }
    const noteEntries=rawLines.slice(noteIndex+1,end).map((text,i)=>({i,text:cleanRecipeLine(text)}));
    const parsedNotes=joinNoteContinuations(noteEntries).filter(x=>x&&!BOILERPLATE_RE.test(x));
    if(parsedNotes.length){if(notes.length)notes.push('');notes.push(...parsedNotes);}
  }
  if(nutritionIndex<0){
    for(let i=stepEnd;i<rawLines.length;i++){const h=webHeading(rawLines[i]);if(h&&headingType(h.text)==='nutrition'){nutritionIndex=i;break;}}
  }
  if(nutritionIndex>=0){
    let end=rawLines.length;
    for(let i=nutritionIndex+1;i<rawLines.length;i++){
      const h=webHeading(rawLines[i]); if(h && h.level<=3){end=i;break;}
    }
    nutritionText=rawLines.slice(nutritionIndex+1,end).map(cleanWebCardLine).filter(x=>x&&!BOILERPLATE_RE.test(x)).join(' ');
  }

  if(!facts.temperature)facts.temperature=extractTemperatures(rawLines.slice(stepIndex+1,stepEnd).map(cleanWebCardLine).join('\n'));
  const body=[recipeTitle,...ingredients.map(ingredientToLine),...steps].join('\n');
  let category=inferCategory(body);
  if(/\bpanettone\b/i.test(recipeTitle))category='Baking';
  const tags=inferTags(body);
  const totalMins=parseDurationMinutes(facts.totalTime||'');
  if(Number.isFinite(totalMins)&&totalMins>45){const q=tags.indexOf('Quick');if(q>=0)tags.splice(q,1);}
  return cleanRecipeRecord({
    id:uid('recipe'),title:recipeTitle.slice(0,160),category,tags,servings,
    prepTime:facts.prepTime||'',cookTime:facts.cookTime||'',restTime:facts.restTime||'',totalTime:facts.totalTime||'',temperature:facts.temperature||'',author:facts.author||'',
    description,ingredients,steps:[...new Set(steps)].slice(0,80),equipment:usefulEquipmentFromSections(paragraphAwareLines(rawText)),notes:notes.join('\n').trim(),nutrition:cleanInlineSpacing(nutritionText),favorite:false,
    source:{type:'website',url:source.url||'',label:source.label||'',filename:'',sourceKey:source.sourceKey||`url:${normalizeUrl(source.url||'')}`,extractor:source.extractor||''},
    imageUrl:source.imageUrl||extractFirstImageUrl(rawText)||'',mediaId:'',mediaType:'',thumbnailId:'',createdAt:Date.now(),updatedAt:Date.now()
  });
}
function parseDurationMinutes(value='') {
  const s=normalizeText(value);
  if(!s)return null;
  let total=0,found=false,m;
  const hour=/(\d+(?:[.,]\d+)?)\s*(?:hours?|hrs?|h|tuntia?|tunti|ore?)/i.exec(s);
  if(hour){total+=Number(hour[1].replace(',','.'))*60;found=true;}
  const minute=/(\d+(?:[.,]\d+)?)\s*(?:minutes?|mins?|min|minuuttia?|minuti?)/i.exec(s);
  if(minute){total+=Number(minute[1].replace(',','.'));found=true;}
  return found?total:null;
}
function parseWebsiteRecipeText(rawText='',source={}) {
  return parseStructuredWebsiteRecipe(rawText,source)||parseRecipeText(rawText,source);
}

function parseRecipeText(rawText, source = {}) {
  const imageUrl = source.imageUrl || extractFirstImageUrl(rawText);
  const lines = paragraphAwareLines(rawText).filter(l=>l && !BOILERPLATE_RE.test(l));
  const ingCandidates=collectSectionCandidates(lines,'ingredients');
  let chosenIng=pickBestCandidate(ingCandidates,ingredientCandidateScore);
  const stepCandidates=collectSectionCandidates(lines,'steps');
  let chosenStep=pickBestCandidate(stepCandidates,stepCandidateScore,chosenIng?.start??-1);

  const h1=String(rawText).match(/^\s*#\s+([^\n#].+)$/m);
  const titlePick=findBestTitle(lines);
  let title=(source.title||h1?.[1]?.trim()||titlePick?.l||'Untitled recipe').replace(/^(?:title\s*:\s*)/i,'').replace(/\s*\|\s*/g,' ').replace(/\s{2,}/g,' ').trim();
  const titleIdx=lines.findIndex(x=>normalizeText(x)===normalizeText(title))>=0?lines.findIndex(x=>normalizeText(x)===normalizeText(title)):(titlePick?.i??-1);

  // Explicit section wins only if it actually contains a useful number of ingredients.
  let ingredientLines=chosenIng && ingredientCandidateScore(chosenIng)>=12 ? joinIngredientContinuations(chosenIng.entries) : [];
  if(ingredientLines.filter(looksLikeIngredient).length<2){
    const globalEntries=lines.map((text,i)=>({i,text}));
    ingredientLines=joinIngredientContinuations(globalEntries).slice(0,60);
  }
  ingredientLines=ingredientLines.filter(x=>looksLikeIngredient(x)||looksLikeIngredientGroup(x));
  const ingredients=[];
  for(const line of ingredientLines){
    const parsed=parseIngredientLine(line);if(!parsed)continue;
    if(parsed.kind==='group'){
      if(!ingredients.length || ingredients[ingredients.length-1].kind!=='group') ingredients.push(parsed);
    } else ingredients.push(parsed);
  }
  while(ingredients.length && ingredients[ingredients.length-1].kind==='group') ingredients.pop();

  let steps=chosenStep ? joinStepContinuations(chosenStep.entries) : [];
  if(steps.length<2){
    steps=joinStepContinuations(lines.map((text,i)=>({i,text}))).slice(0,50);
  }
  steps=[...new Set(steps)].slice(0,50);

  const facts=extractRecipeFacts(String(rawText),source);
  const meta=extractMetadata(String(rawText),source);
  const explicitNotes=usefulNotesFromSections(lines,chosenStep);
  const nutritionNotes=usefulNutritionFromSections(lines);
  const intro=[];
  let introEnd=Math.min(lines.length,Math.max(0,titleIdx+1)+12);
  for(let j=Math.max(0,titleIdx+1);j<Math.min(lines.length,Math.max(0,titleIdx+1)+18);j++){if(headingType(lines[j])){introEnd=j;break;}}
  let introBuffer='';
  for(let i=Math.max(0,titleIdx+1);i<introEnd;i++){
    const l=lines[i].replace(/^•\s*/,'').trim();
    if(!l||headingType(l)||looksLikeIngredient(l)||looksLikeIngredientGroup(l)||isMetadataLine(l)||BOILERPLATE_RE.test(l)||/^(title|by|published|updated|rating|jump to|image|url source|markdown content)/i.test(l))continue;
    if(l.length>320)continue;
    introBuffer+=(introBuffer?' ':'')+l;
    if(/[.!?]$/.test(l) && introBuffer.length>=35){intro.push(introBuffer.trim());introBuffer='';if(intro.length>=2)break;}
  }
  if(intro.length<2 && introBuffer.trim().length>=35)intro.push(introBuffer.trim());
  const noteParts=[...meta];
  if(intro.length) noteParts.push(...intro);
  if(explicitNotes.length){if(noteParts.length)noteParts.push('');noteParts.push(...explicitNotes);}
  if(nutritionNotes.length){if(noteParts.length)noteParts.push('');noteParts.push(...nutritionNotes);}
  const notes=noteParts.join('\n').trim();
  const cleanText=stripMarkdown(String(rawText));
  const body=`${title}\n${cleanText}`;
  return {
    id: uid('recipe'), title:title.slice(0,160), category:inferCategory(body), tags:inferTags(body), servings:extractServings(lines,cleanText,source),
    prepTime:facts.prepTime||'', cookTime:facts.cookTime||'', restTime:facts.restTime||'', totalTime:facts.totalTime||'', temperature:facts.temperature||'', author:facts.author||'',
    ingredients, steps, equipment:usefulEquipmentFromSections(lines), notes, favorite:false,
    source:{type:source.type||'text',url:source.url||extractLikelySourceUrl(rawText)||'',label:source.label||'',filename:source.filename||'',fileHash:source.fileHash||'',sourceKey:source.sourceKey||'',extractor:source.extractor||''},
    imageUrl, mediaId:source.mediaId||'',mediaType:source.mediaType||'',thumbnailId:source.thumbnailId||'',createdAt:Date.now(),updatedAt:Date.now()
  };
}

const TAXONOMY_I18N={
  fi:{Recipe:'Resepti',Dessert:'Jälkiruoka',Baking:'Leivonta',Breakfast:'Aamiainen',Soup:'Keitto',Pasta:'Pasta',Salad:'Salaatti',Drink:'Juoma',Sauce:'Kastike',Dinner:'Pääruoka',Main:'Pääruoka',Easy:'Helppo',Italian:'Italialainen',Finnish:'Suomalainen',Mexican:'Meksikolainen',Indian:'Intialainen',Asian:'Aasialainen',Vegetarian:'Kasvis',Vegan:'Vegaaninen',Quick:'Nopea','High protein':'Proteiinipitoinen',Video:'Video',Instagram:'Instagram'},
  it:{Recipe:'Ricetta',Dessert:'Dolce',Baking:'Forno',Breakfast:'Colazione',Soup:'Zuppa',Pasta:'Pasta',Salad:'Insalata',Drink:'Bevanda',Sauce:'Salsa',Dinner:'Piatto principale',Main:'Piatto principale',Easy:'Facile',Italian:'Italiana',Finnish:'Finlandese',Mexican:'Messicana',Indian:'Indiana',Asian:'Asiatica',Vegetarian:'Vegetariana',Vegan:'Vegana',Quick:'Veloce','High protein':'Ricca di proteine',Video:'Video',Instagram:'Instagram'}
};
function displayTaxonomy(value=''){return TAXONOMY_I18N[state.language]?.[value]||value;}
function sourceLabel(recipe) {
  const type=String(recipe?.source?.type||'manual').toLowerCase();
  if(['website','web','url','link'].includes(type)) return 'Web';
  if(['image','photo','camera'].includes(type)) return 'Photo';
  if(type==='pdf') return 'PDF';
  if(['video','reel'].includes(type)) return 'Video';
  if(type==='shared') return 'Shared';
  if(type==='text') return 'Text';
  return 'Manual';
}
function sourceDisplay(recipe) {
  const type=recipe.source?.type || 'manual';
  return ({text:t('textSource'),website:t('webSource'),image:t('photoSource'),pdf:t('pdfSource'),video:t('videoSource'),manual:t('manualSource'),shared:t('sharedSource')})[type] || sourceLabel(recipe);
}

async function getMediaUrl(id) {
  if (!id) return '';
  try {
    const item = await idbGet('media', id);
    return item?.blob instanceof Blob ? URL.createObjectURL(item.blob) : '';
  } catch (err) {
    console.warn('Could not load stored recipe media', id, err);
    return '';
  }
}
async function storeMedia(blob, meta={}) {
  const id = uid('media');
  await idbPut('media', { id, blob, type: blob.type || meta.type || '', name: meta.name || '', createdAt: Date.now() });
  return id;
}
async function deleteRecipeMedia(recipe) {
  const ids = [recipe?.mediaId, recipe?.thumbnailId, recipe?.coverMediaId].filter(Boolean);
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
function localizedTaxonomyLabel(value){
  for(const r of recipes){const vr=currentRecipeView(r);if((r.type||r.category)===value)return vr.type||value;
    for(const field of ['cuisine','dietary','traits']){const idx=(r[field]||[]).indexOf(value);if(idx>=0)return vr[field]?.[idx]||value;}
  }
  return displayTaxonomy(value);
}
function renderRecipeFilters() {
  const counts = new Map();
  for (const r of recipes) {
    counts.set(sourceLabel(r), (counts.get(sourceLabel(r))||0)+1);
    for(const value of [r.type||r.category,...(r.cuisine||[]),...(r.dietary||[]),...(r.traits||[])].filter(Boolean)) counts.set(value,(counts.get(value)||0)+1);
  }
  const filters = ['All','Favorites', ...[...counts.keys()].sort()];
  if (!filters.includes(state.activeRecipeFilter)) state.activeRecipeFilter = 'All';
  const filterText=f=>f==='All'?t('all'):f==='Favorites'?t('favorites'):({Text:t('textSource'),Web:t('webSource'),Photo:t('photoSource'),PDF:t('pdfSource'),Video:t('videoSource'),Manual:t('manualSource'),Shared:t('sharedSource')})[f]||localizedTaxonomyLabel(f);
  $('#recipeFilters').innerHTML = filters.map(f => `<button class="filter-chip ${state.activeRecipeFilter===f?'active':''}" data-filter="${escapeHtml(f)}">${escapeHtml(filterText(f))}</button>`).join('');
  $$('[data-filter]').forEach(b => b.onclick = () => { state.activeRecipeFilter=b.dataset.filter; saveState(); renderRecipeFilters(); renderRecipes(); });
}
function filteredRecipes() {
  const q = normalizeText($('#recipeSearch')?.value || '');
  const filter = state.activeRecipeFilter || 'All';
  let out = recipes.filter(r => {
    if (filter === 'Favorites' && !r.favorite) return false;
    const tax=[r.type||r.category,...(r.cuisine||[]),...(r.dietary||[]),...(r.traits||[])];
    if (filter !== 'All' && filter !== 'Favorites' && sourceLabel(r)!==filter && !tax.includes(filter)) return false;
    if (!q) return true;
    const hay = normalizeText(recipeSearchText(r));
    return q.split(' ').every(token => hay.includes(token));
  });
  const sort=state.recipeSort||'recent';
  if(sort==='title') out.sort((a,b)=>String(currentRecipeView(a).title||'').localeCompare(String(currentRecipeView(b).title||''),state.language||'en',{sensitivity:'base',numeric:true}));
  else if(sort==='favorite') out.sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite)) || recipeAddedAt(b)-recipeAddedAt(a));
  else out.sort((a,b)=>recipeAddedAt(b)-recipeAddedAt(a));
  return out;
}
async function recipeCardHtml(r, match=null) {
  const vr=currentRecipeView(r);
  let img = '';
  if (r.coverMediaId) img = await getMediaUrl(r.coverMediaId);
  if (!img) img = r.imageUrl || '';
  if (!img && r.thumbnailId) img = await getMediaUrl(r.thumbnailId);
  if (!img && r.mediaId && (r.mediaType||'').startsWith('image/')) img = await getMediaUrl(r.mediaId);
  if (!img) img=defaultCoverSvg(vr);
  const tags = [vr.type||vr.category, ...(vr.cuisine||[]), ...(vr.dietary||[]), ...(vr.traits||[])].filter(Boolean).slice(0,3).map(displayTaxonomy);
  return `<article class="recipe-card">
    ${match ? `<div class="match-badge match-${match.status}">${escapeHtml(matchStatusLabel(match))} · ${Math.round(match.score*100)}%</div>`:''}
    ${r.favorite ? `<button class="favorite-dot" data-fav="${r.id}" aria-label="Remove favorite">♥</button>`:''}
    <button class="card-hit" data-recipe="${r.id}">
      ${img ? `<img class="recipe-thumb" src="${escapeHtml(img)}" alt="" loading="lazy">` : `<div class="recipe-thumb placeholder">⌑</div>`}
      <div class="recipe-card-body">
        <h3>${escapeHtml(vr.title)}</h3>
        ${normalizeRating(r.rating)?`<div class="card-rating" aria-label="${normalizeRating(r.rating)}/5">${ratingStars(r.rating)}</div>`:''}
        <div class="card-meta">
          <span>${(r.ingredients||[]).filter(i=>i.kind!=='group').length} ${((r.ingredients||[]).filter(i=>i.kind!=='group').length===1?t('ingredientSingular'):t('ingredientPlural'))}</span>
          <span>·</span><span>${escapeHtml(sourceDisplay(r))}</span>
          ${match ? `<span>·</span><span>${match.matched}/${match.total} ${t('atHomeLower')}</span>`:''}
        </div>
        <div class="card-meta" style="margin-top:7px">${tags.map(t=>`<span class="mini-tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
    </button>
  </article>`;
}
async function renderRecipes() {
  const generation = ++recipeRenderGeneration;
  const list = filteredRecipes();
  const grid = $('#recipeGrid');
  const empty = $('#recipeEmpty');

  // Never leave both the grid and empty-state hidden: that was the source of the
  // apparently empty library on a cold/reloaded PWA start.
  if (recipes.length === 0) {
    empty.classList.remove('hidden');
    grid.classList.add('hidden');
    grid.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  grid.classList.remove('hidden');

  if (list.length === 0) {
    grid.innerHTML = `<div class="library-no-results">${escapeHtml(t('noRecipesYet'))}</div>`;
    return;
  }

  // Give immediate visual feedback while media-backed cards are resolved from
  // IndexedDB, instead of showing a blank grid until every card is complete.
  grid.setAttribute('aria-busy','true');
  grid.innerHTML = list.map(()=>'<article class="recipe-card recipe-card-loading" aria-hidden="true"><div class="recipe-thumb placeholder"></div><div class="recipe-card-body"><div class="skeleton-line wide"></div><div class="skeleton-line"></div></div></article>').join('');

  const chunks = await Promise.all(list.map(async r => {
    try { return await recipeCardHtml(r); }
    catch (err) {
      console.warn('Could not render recipe card', r?.id, err);
      return `<article class="recipe-card"><button class="card-hit" data-recipe="${escapeHtml(r?.id||'')}"><div class="recipe-thumb placeholder">⌑</div><div class="recipe-card-body"><h3>${escapeHtml(currentRecipeView(r||{}).title||'Untitled recipe')}</h3></div></button></article>`;
    }
  }));
  if (generation !== recipeRenderGeneration) return; // ignore stale async renders
  grid.innerHTML = chunks.join('');
  grid.removeAttribute('aria-busy');
  bindRecipeCards(grid);
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
  $('#availableChips').innerHTML = state.available.map((x,i)=>`<span class="chip">${escapeHtml(currentText(x))}<button data-remove-available="${i}">×</button></span>`).join('');
  $$('[data-remove-available]').forEach(b=>b.onclick=async()=>{state.available.splice(Number(b.dataset.removeAvailable),1);await saveState();renderAvailable();renderMatches();});
}
function allAvailable() {
  // Pantry is always the primary source for recipe matching. Temporary
  // ingredients are additive and never replace or disable pantry items.
  return [...state.pantry, ...state.available].filter(Boolean);
}
function computeMatch(recipe, available) {
  const required=(recipe.ingredients||[]).filter(i=>i.kind!=='group' && !i.optional && i.name).map(i=>{
    const canonical=canonicalIngredient(i.name);let role=ingredientRole(canonical,false);
    if((recipe.type||recipe.category)==='Baking' && ['flour','sugar','butter','egg','milk'].includes(canonical))role='main';
    return {i,canonical,role,have:fuzzyHas(available,i)};
  });
  if (!required.length) return {score:0,matched:0,total:0,missing:[],missingMain:[],missingStaples:[],status:'missing-main'};
  const totalWeight=required.reduce((n,x)=>n+(x.role==='main'?3:1),0);
  const haveWeight=required.reduce((n,x)=>n+(x.have?(x.role==='main'?3:1):0),0);
  const missingMain=required.filter(x=>!x.have&&x.role==='main').map(x=>x.i);
  const missingStaples=required.filter(x=>!x.have&&x.role==='staple').map(x=>x.i);
  const status=!missingMain.length&&!missingStaples.length?'ready':!missingMain.length?'staples-only':'missing-main';
  return {score:totalWeight?haveWeight/totalWeight:0,matched:required.filter(x=>x.have).length,total:required.length,missing:[...missingMain,...missingStaples],missingMain,missingStaples,status};
}
function matchStatusLabel(m){return m.status==='ready'?t('readyToMake'):m.status==='staples-only'?t('missingStaples'):t('missingMain');}
async function renderMatches() {
  if (!$('#matchGrid')) return;
  const available=allAvailable();
  $('#matchEmpty').classList.toggle('hidden', available.length>0);
  if (!available.length) { $('#matchGrid').innerHTML=''; $('#matchSummary').textContent=''; return; }
  const rank={ready:0,'staples-only':1,'missing-main':2};
  const matched=recipes.map(r=>({r,m:computeMatch(r,available)})).sort((a,b)=>(rank[a.m.status]-rank[b.m.status]) || b.m.score-a.m.score || a.m.total-b.m.total);
  const chunks=[];
  for (const {r,m} of matched) chunks.push(await recipeCardHtml(r,m));
  $('#matchGrid').innerHTML=chunks.join('');
  $('#matchSummary').textContent = `${available.length} ${available.length===1?t('ingredientSingular'):t('ingredientPlural')} ${t('available')} · ${recipes.length} ${recipes.length===1?t('recipeSingular'):t('recipePlural')} ${t('ranked')}`;
  bindRecipeCards($('#matchGrid'));
}

function renderPantry() {
  const list=$('#pantryList');
  if(!list)return;
  const items=state.pantry.map((value,index)=>({value,index,label:currentText(value)}))
    .sort((a,b)=>a.label.localeCompare(b.label,state.language||'en',{sensitivity:'base'}));
  list.innerHTML=items.map(({label,index})=>`<div class="pantry-item"><div class="pantry-item-icon">▦</div><div class="pantry-item-name">${escapeHtml(label)}</div><button class="pantry-remove" data-remove-pantry="${index}" aria-label="${escapeHtml(t('delete'))}" title="${escapeHtml(t('delete'))}">×</button></div>`).join('');
  const count=$('#pantryCount');
  if(count)count.textContent=`${items.length} ${items.length===1?t('itemSingular'):t('itemPlural')}`;
  const empty=$('#pantryEmpty');
  if(empty)empty.classList.toggle('hidden',items.length>0);
  list.classList.toggle('hidden',items.length===0);
  $$('[data-remove-pantry]',list).forEach(b=>b.onclick=async()=>{state.pantry.splice(Number(b.dataset.removePantry),1);await saveState();renderPantry();renderMatches();});
}
function addUniqueIngredient(list, value) {
  value = value.trim();
  if (!value) return false;
  if (list.some(x=>ingredientSimilarity(x,value)>=.9)) return false;
  list.push(value); return true;
}
async function addUniqueTranslatedIngredient(list,value,fallbackLanguage=state.language||'en') {
  const added=addUniqueIngredient(list,String(value||''));if(!added)return false;
  await ensureSharedTextTranslation(String(value||'').trim(),fallbackLanguage);return true;
}

async function mergeShoppingIngredient(ing, sourceRecipeId='', manual=false) {
  const originalName=ing.name || ing.raw || '';
  const key = canonicalIngredient(originalName);
  if (!key) return;
  const sourceRecipe=sourceRecipeId?recipes.find(r=>r.id===sourceRecipeId):null;
  await ensureSharedTextTranslation(originalName,sourceRecipe?.sourceLanguage||state.language||'en');
  const ingUnit=ing.unitCanonical||canonicalUnit(ing.unit||'')||ing.unit||'';
  let existing = state.shopping.find(x => ingredientSimilarity(x.name,originalName)>=.9 && (x.unitCanonical||canonicalUnit(x.unit||'')||x.unit||'')===ingUnit && !x.checked);
  if (!existing && Number.isFinite(ing.qty)) {
    existing = state.shopping.find(x => {
      if(x.checked || ingredientSimilarity(x.name,originalName)<.9 || !Number.isFinite(x.qty)) return false;
      const exUnit=x.unitCanonical||canonicalUnit(x.unit||'')||x.unit||'';
      return convertQuantityBetween(ing.qty,ingUnit,exUnit)!=null;
    });
  }
  if (existing) {
    const exUnit=existing.unitCanonical||canonicalUnit(existing.unit||'')||existing.unit||'';
    const converted=Number.isFinite(ing.qty)?convertQuantityBetween(ing.qty,ingUnit,exUnit):null;
    if (Number.isFinite(existing.qty) && converted!=null) {
      existing.qty += converted;
      existing.qtyText='';
    } else if (Number.isFinite(existing.qty) && Number.isFinite(ing.qty) && ingUnit===exUnit) {
      existing.qty += ing.qty;
      existing.qtyText='';
    } else if (!existing.qtyText && ing.qtyText) existing.qtyText = ing.qtyText;
    existing.sources = [...new Set([...(existing.sources||[]), ...(sourceRecipeId?[sourceRecipeId]:[])])];
  } else {
    state.shopping.push({ id:uid('shop'), name:originalName, qty:Number.isFinite(ing.qty)?ing.qty:null, qtyText:ing.qtyText||'', unit:ing.unit||'', unitCanonical:ingUnit, checked:false, manual, sources:sourceRecipeId?[sourceRecipeId]:[], createdAt:Date.now() });
  }
}
function renderShopping() {
  if (!$('#shoppingList')) return;
  const items=[...state.shopping].sort((a,b)=>Number(a.checked)-Number(b.checked)||(a.createdAt||0)-(b.createdAt||0));
  $('#shoppingEmpty').classList.toggle('hidden', items.length>0);
  { const n=items.filter(i=>!i.checked).length; $('#shoppingCount').textContent=`${n} ${n===1?t('itemSingular'):t('itemPlural')}`; }
  const recipeCount=new Set(items.flatMap(i=>i.sources||[])).size;
  $('#shoppingRecipeCount').textContent=recipeCount?`${t('from')} ${recipeCount} ${recipeCount===1?t('recipeSingular'):t('recipePlural')} ${t('manualItems')}`:'';
  $('#shoppingList').innerHTML=items.map(item=>{
    const qty=displayQty(item);
    const shownQty=qty==='—'?'':qty;
    const localName=currentText(item.name);
    const sourceNames=(item.sources||[]).map(id=>{const r=recipes.find(x=>x.id===id);return r?currentRecipeView(r).title:'';}).filter(Boolean);
    return `<div class="shopping-item ${item.checked?'checked':''}">
      <input class="shopping-check" type="checkbox" ${item.checked?'checked':''} data-shop-check="${item.id}" aria-label="Check ${escapeHtml(localName)}">
      <div><div class="shopping-name">${escapeHtml(localName)}</div><div class="shopping-sub">${shownQty?`<span>${escapeHtml(shownQty)}</span>`:''}${sourceNames.slice(0,2).map(n=>`<span>· ${escapeHtml(n)}</span>`).join('')}${item.manual?`<span>· ${escapeHtml(t('manualLower'))}</span>`:''}</div></div>
      <div class="shopping-actions"><button class="home-btn" data-shop-home="${item.id}" title="I have this at home">⌂</button><button data-shop-delete="${item.id}" title="Delete">×</button></div>
    </div>`;
  }).join('');
  $$('[data-shop-check]').forEach(b=>b.onchange=async()=>{const i=state.shopping.find(x=>x.id===b.dataset.shopCheck);if(i)i.checked=b.checked;await saveState();renderShopping();});
  $$('[data-shop-delete]').forEach(b=>b.onclick=async()=>{state.shopping=state.shopping.filter(x=>x.id!==b.dataset.shopDelete);await saveState();renderShopping();});
  $$('[data-shop-home]').forEach(b=>b.onclick=async()=>{const i=state.shopping.find(x=>x.id===b.dataset.shopHome);if(!i)return;addUniqueIngredient(state.pantry,i.name);state.shopping=state.shopping.filter(x=>x.id!==i.id);await saveState();renderShopping();renderPantry();renderMatches();toast(`${currentText(i.name)} ${t('movedToPantry')}`);});
}
function localizeDurationValue(value=''){
  const s=String(value||'').trim();if(!s||state.language==='en')return s;
  return s.replace(/\b(hours?|hrs?)\b/gi,'h').replace(/\b(minutes?|mins?)\b/gi,'min').replace(/\bseconds?|secs?\b/gi,state.language==='fi'?'s':'sec');
}
function recipeFactItems(r) {
  return [
    [t('servings'),r.servings],
    [t('prepTime'),localizeDurationValue(r.prepTime)],
    [t('cookBakeTime'),localizeDurationValue(r.cookTime)],
    [t('restRiseTime'),localizeDurationValue(r.restTime)],
    [t('totalTime'),localizeDurationValue(r.totalTime)],
    [t('ovenTemperature'),r.temperature]
  ].filter(([,v])=>cleanInlineSpacing(v||''));
}
function renderRecipeFacts(r) {
  const items=recipeFactItems(r);
  if(!items.length)return '';
  return `<div class="recipe-facts">${items.map(([label,value])=>`<div class="recipe-fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
}
async function openRecipe(id) {
  const r=recipes.find(x=>x.id===id); if(!r)return;
  const vr=currentRecipeView(r);
  activeRecipeId=id;
  $('#favoriteRecipeBtn').textContent=r.favorite?'♥':'♡';
  let hero='';
  if (r.coverMediaId) hero=await getMediaUrl(r.coverMediaId);
  if (!hero) hero=r.imageUrl||'';
  if (!hero && r.thumbnailId) hero=await getMediaUrl(r.thumbnailId);
  if (!hero && r.mediaId && (r.mediaType||'').startsWith('image/')) hero=await getMediaUrl(r.mediaId);
  if (!hero) hero=defaultCoverSvg(vr);
  let sourceMedia='';
  if (r.mediaId && ((r.mediaType||'').startsWith('video/') || r.mediaType==='application/pdf')) {
    const url=await getMediaUrl(r.mediaId);
    if ((r.mediaType||'').startsWith('video/')) sourceMedia=`<div class="detail-section"><h3>${escapeHtml(t('originalVideo'))}</h3><video class="source-media" controls src="${escapeHtml(url)}"></video></div>`;
    if (r.mediaType==='application/pdf') sourceMedia=`<div class="detail-section"><h3>${escapeHtml(t('originalPdf'))}</h3><a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(t('openStoredPdf'))}</a></div>`;
  }
  $('#recipeDetail').innerHTML=`
    ${hero?`<img class="recipe-hero" src="${escapeHtml(hero)}" alt="">`:''}
    <div class="recipe-detail-body">
      <div class="eyebrow">${escapeHtml(sourceDisplay(r).toUpperCase())}${r.author?` · ${escapeHtml(r.author)}`:''}</div>
      <h2>${escapeHtml(vr.title)}</h2>
      <div class="detail-rating"><span>${escapeHtml(t('rating'))}</span><div id="detailRatingStars" class="star-rating" role="radiogroup" aria-label="${escapeHtml(t('rating'))}">${ratingButtonsHtml(r.rating,'detail')}</div></div>
      ${renderRecipeFacts(vr)}
      ${vr.description?`<p class="recipe-description">${escapeHtml(vr.description)}</p>`:''}
      <div class="detail-tags">${[vr.type||vr.category,...(vr.cuisine||[]),...(vr.dietary||[]),...(vr.traits||[])].filter(Boolean).map(displayTaxonomy).map(x=>`<span class="mini-tag">${escapeHtml(x)}</span>`).join('')}</div>
      <div class="detail-actions"><button class="primary" id="detailShopBtn">${escapeHtml(t('addToShopping'))}</button><button class="secondary" id="detailPantryMatchBtn">${escapeHtml(t('checkWhatIHave'))}</button></div>
      <div class="detail-measurements"><span>${escapeHtml(t('measurements'))}</span><div class="language-switch" role="group"><button type="button" class="language-choice" data-measurement="metric">${escapeHtml(t('metric'))}</button><button type="button" class="language-choice" data-measurement="us">${escapeHtml(t('usCustomary'))}</button></div></div>
      <div class="detail-section"><h3>${escapeHtml(t('ingredients'))}</h3><ul class="ingredient-list">${(vr.ingredients||[]).map(i=>i.kind==='group'?`<li class="ingredient-group"><strong>${escapeHtml(i.name)}</strong></li>`:`<li><span class="ingredient-qty">${escapeHtml(displayQty(i))}</span><span>${escapeHtml(i.name)}${i.note?` <small class="muted">(${escapeHtml(i.note)})</small>`:''}${i.optional?` <small class="muted">(${escapeHtml(t('optional'))})</small>`:''}</span></li>`).join('') || `<li class="muted">${escapeHtml(t('noIngredients'))}</li>`}</ul></div>
      <div class="detail-section"><h3>${escapeHtml(t('steps'))}</h3><ol class="step-list">${(vr.steps||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('') || `<li class="muted">${escapeHtml(t('noSteps'))}</li>`}</ol></div>
      ${(vr.equipment||[]).length?`<div class="detail-section"><h3>${escapeHtml(t('equipment'))}</h3><ul class="ingredient-list">${vr.equipment.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`:''}
      ${vr.notes?`<div class="detail-section"><h3>${escapeHtml(t('notes'))}</h3><div class="muted" style="white-space:pre-wrap;line-height:1.5">${escapeHtml(vr.notes)}</div></div>`:''}
      ${vr.nutrition?`<div class="detail-section"><h3>${escapeHtml(t('nutrition'))}</h3><div class="muted nutrition-text">${escapeHtml(vr.nutrition)}</div></div>`:''}
      ${sourceMedia}
      ${r.source?.url?`<div class="detail-section"><h3>${escapeHtml(t('source'))}</h3><a class="source-link" href="${escapeHtml(r.source.url)}" target="_blank" rel="noopener">${escapeHtml(r.source.url)} ↗</a></div>`:''}
    </div>`;
  $('#detailShopBtn').onclick=()=>openShoppingPicker(r.id);
  $$('[data-rating-value]', $('#detailRatingStars')).forEach(btn=>btn.onclick=async()=>{const clicked=normalizeRating(btn.dataset.ratingValue);const next=normalizeRating(r.rating)===clicked?0:clicked;await setRecipeRating(r.id,next);await openRecipe(r.id);});
  $$('[data-measurement]', $('#recipeDetail')).forEach(btn=>{const active=btn.dataset.measurement===(state.measurementSystem||'metric');btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');btn.onclick=()=>setMeasurementSystem(btn.dataset.measurement);});
  $('#detailPantryMatchBtn').onclick=()=>{ $('#recipeDialog').close(); state.available=[]; go('cook'); toast(state.language==='fi'?'Lisää mitä sinulla on tai käytä kotivarastoa':state.language==='it'?'Aggiungi ciò che hai o usa la dispensa salvata':'Add what you have, or use your saved pantry'); };
  if(!$('#recipeDialog').open) $('#recipeDialog').showModal();
}
function openShoppingPicker(recipeId) {
  const r=recipes.find(x=>x.id===recipeId); if(!r)return;
  const vr=currentRecipeView(r);
  pendingShoppingRecipeId=recipeId;
  $('#shoppingIngredientPicker').innerHTML=(vr.ingredients||[]).map((i,idx)=>{
    if(i.kind==='group') return `<div class="picker-group">${escapeHtml(i.name)}</div>`;
    const original=r.ingredients?.[idx]||i;
    const home=fuzzyHas(state.pantry,original);
    return `<label class="picker-item"><input type="checkbox" data-pick-ingredient="${idx}" ${home?'':'checked'}><span><strong>${escapeHtml(displayIngredientLine(i))}</strong>${home?`<span class="at-home-badge">${escapeHtml(t('alreadyAtHome'))}</span>`:''}</span></label>`;
  }).join('') || `<p class="muted">${escapeHtml(t('noIngredientsAvailable'))}</p>`;
  $('#shoppingDialog').showModal();
}

async function saveRecipe(recipe) {
  cleanRecipeRecord(recipe);
  recipe.source=recipe.source||{type:'manual'};recipe.source.sourceKey=sourceKeyFor(recipe);
  // Translate authoritative recipe text once on save; the original source text remains untouched.
  await ensureRecipeTranslations(recipe,recipe.sourceLanguage||state.language||'en');
  syncRecipeTranslationsToTextCache(recipe);
  // Validation/repair metadata is derived UI state, not authoritative recipe data.
  delete recipe.importQuality;
  delete recipe.importRepairs;
  recipe.updatedAt=Date.now();
  if (!recipe.createdAt) recipe.createdAt=Date.now();
  await idbPut('recipes',recipe);
  const idx=recipes.findIndex(r=>r.id===recipe.id);
  if(idx>=0) recipes[idx]=recipe; else recipes.unshift(recipe);
  recipes.sort((a,b)=>recipeAddedAt(b)-recipeAddedAt(a));
  await saveState();
  await renderAll();
  if((recipe.translationMissing||[]).length) toast(t('translationUnavailable'));
}
function ingredientEditorRow(i={},idx=0){
  if(i.kind==='group') return `<div class="ingredient-edit-row group-row" data-ing-row data-kind="group"><input class="ing-name" value="${escapeHtml(i.name||'')}" placeholder="${escapeHtml(t('sectionName'))}"><div class="row-actions"><button type="button" data-row-up>↑</button><button type="button" data-row-down>↓</button><button type="button" data-row-delete>×</button></div></div>`;
  return `<div class="ingredient-edit-row" data-ing-row data-kind="ingredient">
    <input class="ing-qty" value="${escapeHtml(i.qtyText||'')}" placeholder="${escapeHtml(t('quantity'))}">
    <input class="ing-unit" value="${escapeHtml(i.unit||'')}" placeholder="${escapeHtml(t('unitLabel'))}">
    <input class="ing-name" value="${escapeHtml(i.name||'')}" placeholder="${escapeHtml(t('ingredientName'))}">
    <input class="ing-note" value="${escapeHtml(i.note||'')}" placeholder="${escapeHtml(t('ingredientNote'))}">
    <label class="optional-check"><input class="ing-optional" type="checkbox" ${i.optional?'checked':''}><span>${escapeHtml(t('optional'))}</span></label>
    <div class="row-actions"><button type="button" data-row-up>↑</button><button type="button" data-row-down>↓</button><button type="button" data-row-delete>×</button></div>
  </div>`;
}
function bindEditorRowActions(container){
  $$('[data-row-delete]',container).forEach(b=>b.onclick=()=>b.closest('[data-ing-row],[data-step-row]')?.remove());
  $$('[data-row-up]',container).forEach(b=>b.onclick=()=>{const row=b.closest('[data-ing-row],[data-step-row]');if(row?.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);});
  $$('[data-row-down]',container).forEach(b=>b.onclick=()=>{const row=b.closest('[data-ing-row],[data-step-row]');if(row?.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);});
}
function renderIngredientEditor(items=[]){
  const root=$('#ingredientEditorRows');
  root.innerHTML=(items.length?items:[{kind:'ingredient'}]).map(ingredientEditorRow).join('');
  bindEditorRowActions(root);
}
function addIngredientEditorRow(kind='ingredient'){
  const root=$('#ingredientEditorRows');root.insertAdjacentHTML('beforeend',ingredientEditorRow(kind==='group'?{kind:'group'}:{kind:'ingredient'}));bindEditorRowActions(root);
}
function collectIngredientEditor(){
  return $$('[data-ing-row]',$('#ingredientEditorRows')).map(row=>{
    if(row.dataset.kind==='group'){
      const name=cleanInlineSpacing($('.ing-name',row)?.value||'');return name?{kind:'group',name,raw:name}:null;
    }
    const qtyText=cleanInlineSpacing($('.ing-qty',row)?.value||'');
    const unit=cleanInlineSpacing($('.ing-unit',row)?.value||'');
    const name=cleanInlineSpacing($('.ing-name',row)?.value||'');
    const note=cleanInlineSpacing($('.ing-note',row)?.value||'');
    if(!name)return null;
    const qty=parseNumber(qtyText);
    const unitCanonical=canonicalUnit(unit)||unit;
    const optional=Boolean($('.ing-optional',row)?.checked);
    const raw=[qtyText,unit,name].filter(Boolean).join(' ')+(note?` (${note})`:'');
    return {kind:'ingredient',raw,qty,qtyText,unit,unitCanonical,name,note,optional};
  }).filter(Boolean);
}
function stepEditorRow(text=''){
  return `<div class="step-edit-row" data-step-row><div class="step-grip">≡</div><textarea rows="3" class="step-text">${escapeHtml(text)}</textarea><div class="row-actions"><button type="button" data-row-up>↑</button><button type="button" data-row-down>↓</button><button type="button" data-row-delete>×</button></div></div>`;
}
function renderStepEditor(steps=[]){const root=$('#stepEditorRows');root.innerHTML=(steps.length?steps:['']).map(stepEditorRow).join('');bindEditorRowActions(root);}
function addStepEditorRow(){const root=$('#stepEditorRows');root.insertAdjacentHTML('beforeend',stepEditorRow(''));bindEditorRowActions(root);}
function collectStepEditor(){return $$('[data-step-row]',$('#stepEditorRows')).map(row=>cleanInlineSpacing($('.step-text',row)?.value||'').replace(/^\s*\d+[.)]\s*/, '')).filter(Boolean);}
function openEditor(recipe, isNew=false) {
  cleanRecipeRecord(recipe);
  editorDraft=structuredClone(recipe);
  $('#editorHeading').textContent=isNew?t('reviewRecipe'):t('editRecipe');
  $('#editTitle').value=recipe.title||'';
  renderEditorRating(recipe.rating);
  $('#editDescription').value=recipe.description||'';
  $('#editServings').value=recipe.servings||'';
  $('#editPrepTime').value=recipe.prepTime||'';
  $('#editCookTime').value=recipe.cookTime||'';
  $('#editRestTime').value=recipe.restTime||'';
  $('#editTotalTime').value=recipe.totalTime||'';
  $('#editTemperature').value=recipe.temperature||'';
  $('#editType').value=recipe.type||recipe.category||'Recipe';
  $('#editCuisine').value=(recipe.cuisine||[]).join(', ');
  $('#editDietary').value=(recipe.dietary||[]).join(', ');
  $('#editTraits').value=(recipe.traits||[]).join(', ');
  renderIngredientEditor(recipe.ingredients||[]);
  renderStepEditor(recipe.steps||[]);
  $('#editEquipment').value=(recipe.equipment||[]).join('\n');
  $('#editNotes').value=recipe.notes||'';
  $('#editNutrition').value=recipe.nutrition||'';
  $('#editSourceUrl').value=recipe.source?.url||'';
  $('#deleteRecipeBtn').classList.toggle('hidden',isNew);
  renderImportQuality(recipe);
  renderEditorPreview(recipe);
  $('#recipePhotoInput').value='';
  $('#editorDialog').showModal();
}
async function renderEditorPreview(recipe) {
  const box=$('#editorMediaPreview');
  box.classList.add('hidden'); box.innerHTML='';
  let url='';
  let type='image';
  if (recipe.coverMediaId) url=await getMediaUrl(recipe.coverMediaId);
  if (!url) url=recipe.imageUrl||'';
  if (!url && recipe.thumbnailId) url=await getMediaUrl(recipe.thumbnailId);
  if (!url && recipe.mediaId && (recipe.mediaType||'').startsWith('image/')) url=await getMediaUrl(recipe.mediaId);
  if (!url && recipe.mediaId && (recipe.mediaType||'').startsWith('video/')) {url=await getMediaUrl(recipe.mediaId);type='video';}
  if(!url){url=defaultCoverSvg(recipe);type='image';}
  if(url){box.innerHTML=type==='video'?`<video controls src="${escapeHtml(url)}"></video>`:`<img src="${escapeHtml(url)}" alt="">`;box.classList.remove('hidden');}
}


let cropState=null;
function clampCrop(){
  if(!cropState)return;
  const canvas=$('#cropCanvas'), img=cropState.img;
  const base=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
  const scale=base*cropState.zoom;
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  const minX=canvas.width-w,minY=canvas.height-h;
  cropState.x=Math.min(0,Math.max(minX,cropState.x));
  cropState.y=Math.min(0,Math.max(minY,cropState.y));
}
function drawCrop(){
  if(!cropState)return;
  const canvas=$('#cropCanvas'),ctx=canvas.getContext('2d'),img=cropState.img;
  const base=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
  const scale=base*cropState.zoom;
  clampCrop();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,cropState.x,cropState.y,img.naturalWidth*scale,img.naturalHeight*scale);
}
async function openCropDialog(file){
  if(!file || !String(file.type||'').startsWith('image/'))return;
  const url=URL.createObjectURL(file), img=new Image();
  img.onload=()=>{
    const canvas=$('#cropCanvas');
    const base=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight);
    const w=img.naturalWidth*base,h=img.naturalHeight*base;
    cropState={img,url,zoom:1,x:(canvas.width-w)/2,y:(canvas.height-h)/2,drag:null};
    $('#cropZoom').value='1';drawCrop();$('#cropDialog').showModal();
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast('Could not open image');};
  img.src=url;
}
function closeCropDialog(){
  if(cropState?.url)URL.revokeObjectURL(cropState.url);
  cropState=null;if($('#cropDialog').open)$('#cropDialog').close();
}
async function saveCrop(){
  if(!cropState||!editorDraft)return;
  drawCrop();
  const canvas=$('#cropCanvas');
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
  if(!blob)return;
  const old=editorDraft.coverMediaId;
  const id=await storeMedia(blob,{type:'image/jpeg',name:'recipe-cover.jpg'});
  editorDraft.coverMediaId=id;
  if(old && old!==id)await idbDelete('media',old).catch(()=>{});
  closeCropDialog();await renderEditorPreview(editorDraft);toast(t('changePhoto'));
}

async function parseTextImport() {
  const text=$('#importText').value.trim();
  if(!text){toast(t('pasteFirst'));return;}
  setStatus(t('parsingText'));
  const sourceKey=`text:${quickHash(text)}`;
  const recipe=parseRecipeText(text,{type:'text',sourceKey});
  setStatus(t('parsedReview'),false);
  await openImportedDraft(recipe,{sourceKey});
}
function parseRecipeJsonLd(schema, source={}) {
  const draft=jsonLdToRecipeDraft(schema,source);
  if(!draft)return null;
  const ingredients=(draft.ingredients||[]).map(i=>i?.kind==='raw'?parseIngredientLine(cleanInlineSpacing(i.raw||'')):i).filter(Boolean);
  const body=[draft.title,...ingredients.map(ingredientToLine),...(draft.steps||[])].join('\n');
  const fallbackType=inferCategory(body);
  const tags=[...(draft.tags||[]),...inferTags(body)];
  const recipe=createRecipeDraft({...draft,
    id:uid('recipe'),
    type:draft.type&&draft.type!=='Recipe'?draft.type:fallbackType,
    category:draft.type&&draft.type!=='Recipe'?draft.type:fallbackType,
    ingredients,
    tags:[...new Set(tags)],
    createdAt:Date.now(),updatedAt:Date.now()
  });
  return cleanRecipeRecord(recipe);
}
async function fetchWithTimeout(url, options={}, ms=18000) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
}
async function fetchViaRelays(targetUrl) {
  const endpoints=[
    {url:`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,kind:'text'},
    {url:`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,kind:'allorigins-json'},
    {url:`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,kind:'text'}
  ];
  let lastError=null;
  for(const endpoint of endpoints){
    try{
      const res=await fetchWithTimeout(endpoint.url,{cache:'no-store',headers:{Accept:'text/html,text/plain,application/json;q=0.9,*/*;q=0.8'}},22000);
      if(!res.ok)throw new Error(`Relay returned ${res.status}`);
      let text='';
      if(endpoint.kind==='allorigins-json'){const payload=await res.json();text=String(payload?.contents||'');}
      else text=await res.text();
      if(text.trim().length<40)throw new Error('Relay returned an empty page');
      return text;
    }catch(e){lastError=e;}
  }
  throw lastError||new Error('CORS relay failed');
}
async function tryDirectText(url){
  const res=await fetchWithTimeout(url,{cache:'no-store',headers:{Accept:'text/html,text/plain,application/ld+json;q=0.9,*/*;q=0.8'}},16000);
  if(!res.ok)throw new Error(`Direct fetch returned ${res.status}`);
  const text=await res.text();if(text.trim().length<40)throw new Error('Direct fetch returned an empty page');return text;
}
async function fetchReadableUrl(url) {
  let lastError=null;
  // Some recipe sites explicitly allow cross-origin reads. Use that clean path first.
  for(const loader of [()=>tryDirectText(url),()=>fetchViaRelays(url)]){
    try{
      const html=await loader();
      const metadata=recipeMetadataFromHtml(html);
      const schema=recipeSchemaFromHtml(html);
      if(schema){const draft=jsonLdToRecipeDraft(schema,{url,imageUrl:metadata.imageUrl});return {html,text:htmlToRecipeText(html),schema,metadata,title:cleanInlineSpacing(draft?.title||schema.name||metadata.title||''),imageUrl:draft?.imageUrl||metadata.imageUrl||'',method:'json-ld'};}
      const text=htmlToRecipeText(html);
      if(text.length>=40)return {html,text,schema:null,metadata,title:metadata.title||'',imageUrl:metadata.imageUrl||'',method:metadata.wprm?'wprm-html':'html'};
    }catch(e){lastError=e;}
  }
  // Last resort: readable-page extraction. Try it directly and then through a relay.
  const readerUrl=`https://r.jina.ai/${url}`;
  for(const loader of [()=>tryDirectText(readerUrl),()=>fetchViaRelays(readerUrl)]){
    try{
      const text=(await loader()).trim();
      if(text.length<40)throw new Error('Reader returned an empty page');
      return {html:'',text,schema:null,metadata:{},title:'',imageUrl:extractFirstImageUrl(text),method:'reader'};
    }catch(e){lastError=e;}
  }
  throw lastError||new Error('Could not read website');
}
async function parseWebsiteImport() {
  let url=$('#websiteUrl').value.trim();
  if(!url){toast(t('pasteLinkFirst'));return;}
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  setStatus(t('readingWebsite'));
  try {
    const readable=await fetchReadableUrl(url);
    const host=new URL(url).hostname.replace(/^www\./,'');
    const meta=readable.metadata||{};
    const source={type:'website',url,label:host,imageUrl:readable.imageUrl,title:readable.title,documentMeta:{author:meta.author||'',servings:meta.servings||''},extractor:readable.method|| (readable.schema?'json-ld':'recipe-card')};
    const recipe=parseRecipeJsonLd(readable.schema,source)||parseWebsiteRecipeText(readable.text,source);
    if ((!recipe.title || recipe.title==='Untitled recipe') && readable.title) recipe.title=readable.title;
    if(!recipe.author&&meta.author)recipe.author=meta.author;
    if(!recipe.servings&&meta.servings)recipe.servings=meta.servings;
    if(!recipe.description&&meta.description)recipe.description=meta.description;
    if(meta.nutrition)recipe.nutrition=meta.nutrition;
    recipe.nutrition=sanitizeNutritionText(recipe.nutrition||'',recipe.title||'',url);
    if(meta.canonical&&!recipe.source.url)recipe.source.url=meta.canonical;
    if (!recipe.ingredients?.length || !recipe.steps?.length) throw new Error(`Recipe card incomplete: ${recipe.ingredients?.length||0} ingredients, ${recipe.steps?.length||0} steps`);
    if (/instagram\.com$/i.test(host) || host.includes('instagram.com')) recipe.tags=[...new Set([...(recipe.tags||[]),'Instagram'])];
    setStatus(t('websiteRead'),false);
    await openImportedDraft(recipe,{sourceKey:`url:${normalizeUrl(url)}`});
  } catch(e) {
    setStatus('',false);
    toast(t('linkFailed'));
    console.error('Website import failed',e);
  }
}

async function loadPdfJs() {
  const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  return pdfjs;
}
function pdfJoinItems(items=[]) {
  const sorted=[...items].sort((a,b)=>a.x-b.x);
  const heights=sorted.map(x=>x.h).filter(Number.isFinite).sort((a,b)=>a-b);
  const medianH=heights.length?heights[Math.floor(heights.length/2)]:10;
  const splitGap=Math.max(18,medianH*1.65);
  const segments=[];
  let current=''; let prevEnd=null;
  for(const item of sorted){
    const str=String(item.text||'').replace(/\s+/g,' ').trim();if(!str)continue;
    const gap=prevEnd==null?0:item.x-prevEnd;
    if(current && gap>splitGap){segments.push(current.trim());current='';}
    if(current && !/^[,.;:!?%)\]]/.test(str) && !/[(/\-]$/.test(current)) current+=' ';
    current+=str;
    prevEnd=item.x+(item.w||0);
  }
  if(current.trim())segments.push(current.trim());
  return segments;
}
function pdfPageLayoutLines(content) {
  const raw=(content?.items||[]).map(item=>({
    text:String(item.str||'').trim(),
    x:Number(item.transform?.[4]||0), y:Number(item.transform?.[5]||0),
    w:Number(item.width||0), h:Math.abs(Number(item.height||item.transform?.[3]||10))||10
  })).filter(x=>x.text);
  raw.sort((a,b)=>b.y-a.y||a.x-b.x);
  const rows=[];
  for(const item of raw){
    let best=null,bestDelta=Infinity;
    for(let i=Math.max(0,rows.length-5);i<rows.length;i++){
      const row=rows[i]; const tol=Math.max(2.2,Math.min(6,Math.max(row.h,item.h)*.42));
      const d=Math.abs(row.y-item.y);if(d<=tol&&d<bestDelta){best=row;bestDelta=d;}
    }
    if(!best)rows.push({y:item.y,h:item.h,items:[item]});
    else{
      best.items.push(item);
      best.y=best.items.reduce((n,x)=>n+x.y,0)/best.items.length;
      best.h=best.items.reduce((n,x)=>n+x.h,0)/best.items.length;
    }
  }
  return rows.sort((a,b)=>b.y-a.y).map(row=>{
    const segments=pdfJoinItems(row.items);
    return {y:row.y,segments,text:segments.join(' | ')};
  }).filter(x=>x.text);
}
function extractPdfDocumentMeta(layoutPages=[]) {
  const first=layoutPages[0]||[];
  const meta={};
  const allSegments=[];
  first.forEach((line,lineIndex)=>line.segments.forEach(text=>allSegments.push({lineIndex,y:line.y,text,xText:normalizeText(text)})));
  // Reconstruct approximate x centres by splitting from original rows is unnecessary for ordinary PDFs;
  // common recipe export grids are recognizable from the visual line sequence.
  const lines=first.map(x=>x.text);
  const joined=lines.join('\n');
  const gridMeta=extractTimingGrid(joined);
  Object.assign(meta,gridMeta);
  let m=joined.match(/Servings?\s*:\s*([^\n|]+?)(?=\s+(?:Author|By)\s*:|\s*\||$)/i);if(m)meta.servings=m[1].trim();
  m=joined.match(/Author\s*:\s*([^\n|]+)/i);if(m)meta.author=m[1].trim();
  // Grid-style timing block: identify labels, then consume the nearby value rows in visual order.
  const labelIdx=lines.findIndex(l=>/\bPrep Time\b/i.test(l)&&/\bCook Time\b/i.test(l));
  if(labelIdx>=0){
    const window=lines.slice(labelIdx,labelIdx+4).join(' | ');
    const times=[...window.matchAll(/\b\d+(?:\.\d+)?\s*(?:hrs?|hours?|mins?|minutes?|h|min|ore?|minuti?)\b(?:\s+\d+\s*(?:mins?|minutes?|min|minuti?))?/gi)].map(x=>x[0].trim());
    if(times[0])meta.prepTime=times[0];
    if(times[1])meta.cookTime=times[1];
    // This layout commonly places the rest/rise value on the next visual row and total on the first value row.
    if(times.length>=4){meta.restTime=times[3];meta.totalTime=times[2];}
    else if(times.length===3){meta.totalTime=times[2];}
  }
  // A common exported recipe-card grid places four labels in one visual row and values below them.
  // If the generic scan missed anything, recover the ordered values without mixing rating text into the recipe.
  if(labelIdx>=0 && (!meta.prepTime||!meta.cookTime||!meta.restTime||!meta.totalTime)){
    const scan=lines.slice(labelIdx,Math.min(lines.length,labelIdx+6)).join(' ');
    const values=[...scan.matchAll(/\b\d+\s*(?:hrs?|hours?|h|ore?)?(?:\s+\d+\s*)?(?:mins?|minutes?|min|minuti?)\b/gi)].map(x=>cleanInlineSpacing(x[0])).filter(Boolean);
    if(!meta.prepTime&&values[0])meta.prepTime=values[0];
    if(!meta.cookTime&&values[1])meta.cookTime=values[1];
    const long=values.filter(v=>/\b(?:hrs?|hours?|h|ore?)\b/i.test(v));
    if(!meta.totalTime&&long[0])meta.totalTime=long[0];
    if(!meta.restTime&&long[1])meta.restTime=long[1];
  }
  const everyPageText=layoutPages.flat().map(x=>x.text).join('\n');
  meta.temperature=extractTemperatures(everyPageText);
  // Straight label:value PDFs are even easier.
  const direct=[['prepTime',/(?:Prep(?:aration)? Time|Valmistusaika|Tempo di preparazione)\s*[:\-]\s*([^\n|]+)/i],['cookTime',/(?:Cook(?:ing)? Time|Paistoaika|Kypsennysaika|Tempo di cottura)\s*[:\-]\s*([^\n|]+)/i],['restTime',/(?:Rest(?:ing)?(?: and Rising)? Time|Kohotusaika|Lepoaika|Lievitazione|Riposo)\s*[:\-]\s*([^\n|]+)/i],['totalTime',/(?:Total Time|Kokonaisaika|Tempo totale)\s*[:\-]\s*([^\n|]+)/i]];
  for(const [key,re] of direct){const hit=joined.match(re);if(hit)meta[key]=hit[1].trim();}
  return meta;
}
async function renderPdfPageBlob(page,scale=2) {
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  return await new Promise(r=>canvas.toBlob(r,'image/jpeg',.9));
}
function extractedTextLooksCorrupted(text=''){
  const s=String(text||'');if(s.length<80)return true;
  const middle=(s.match(/\b[a-zà-ÿ]{3,}\s+[a-zà-ÿ]{1,2}\s+[a-zà-ÿ]{2,}\b/gi)||[]).length;
  const chains=(s.match(/(?:\b[a-zà-ÿ]{1,2}\s+){2,}[a-zà-ÿ]{2,}\b/gi)||[]).length;
  const single=(s.match(/\b[a-zà-ÿ]\s+[a-zà-ÿ]{3,}\b/gi)||[]).length;
  return middle>=2 || chains>=2 || single>=8;
}
async function extractPdf(file) {
  setStatus(t('loadingPdf'));
  const pdfjs=await loadPdfJs();
  const data=await file.arrayBuffer();
  const doc=await pdfjs.getDocument({data}).promise;
  const layoutPages=[];
  const pageTexts=[];
  const pages=Math.min(doc.numPages,25);
  let thumbBlob=null;
  let ocrPages=0;
  for(let p=1;p<=pages;p++){
    setStatus(`${state.language==='fi'?'Luetaan PDF-sivua':state.language==='it'?'Lettura pagina PDF':'Reading PDF page'} ${p}/${pages}…`);
    const page=await doc.getPage(p);
    const content=await page.getTextContent({includeMarkedContent:true});
    const layout=pdfPageLayoutLines(content);
    layoutPages.push(layout);
    let pageText=layout.map(x=>x.text).join('\n').trim();
    if(p===1){try{thumbBlob=await renderPdfPageBlob(page,1.25);}catch{}}
    // OCR image-only pages and PDFs whose text layer is visibly glyph-fragmented.
    if(pageText.replace(/\s/g,'').length<80 || extractedTextLooksCorrupted(pageText)){
      try{
        const scan=await renderPdfPageBlob(page,2.25);
        if(scan){const ocr=(await ocrImage(scan,`PDF page ${p}`)).trim();if(ocr.length>60 && (!extractedTextLooksCorrupted(ocr) || pageText.replace(/\s/g,'').length<80)){pageText=ocr;ocrPages++;}}
      }catch(e){console.warn('PDF OCR fallback failed',e);}
    }
    pageTexts.push(pageText);
  }
  const text=pageTexts.join('\n\n');
  const documentMeta=extractPdfDocumentMeta(layoutPages);
  return {text,thumbBlob,documentMeta,ocrPages,pages};
}
async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  setStatus(t('loadingOcr'));
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
  return window.Tesseract;
}
async function prepareOcrImage(blob) {
  try{
    const bitmap=await createImageBitmap(blob);
    const maxW=1800;
    const scale=Math.min(3,Math.max(1.35,maxW/Math.max(1,bitmap.width)));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height);
    const px=data.data;
    for(let i=0;i<px.length;i+=4){
      const gray=.299*px[i]+.587*px[i+1]+.114*px[i+2];
      const c=Math.max(0,Math.min(255,(gray-128)*1.45+128));
      px[i]=px[i+1]=px[i+2]=c;
    }
    ctx.putImageData(data,0,0);
    return await new Promise(r=>canvas.toBlob(r,'image/png'));
  }catch{return blob;}
}
async function ocrImage(blob, label='image') {
  const T=await loadTesseract();
  setStatus(`Reading text from ${label}…`);
  const prepared=await prepareOcrImage(blob);
  const result=await T.recognize(prepared||blob,'eng+fin+ita',{
    logger:m=>{if(m.status==='recognizing text')setStatus(`OCR ${Math.round((m.progress||0)*100)}% · ${label}`);},
    tessedit_pageseg_mode:'3',
    preserve_interword_spaces:'1'
  });
  return result?.data?.text||'';
}

async function processFile(file) {
  const keep=$('#keepOriginalToggle').checked;
  const type=file.type||'';
  const fileHash=await hashBlob(file).catch(()=>quickHash(`${file.name}|${file.size}|${file.lastModified}`));
  const baseSource={filename:file.name,label:file.name,fileHash,sourceKey:`file:${fileHash}`};
  if(type==='application/pdf' || /\.pdf$/i.test(file.name)){
    const {text,thumbBlob,documentMeta,ocrPages,pages}=await extractPdf(file);
    let mediaId='',thumbnailId='';
    if(keep) mediaId=await storeMedia(file,{name:file.name});
    if(thumbBlob) thumbnailId=await storeMedia(thumbBlob,{name:`${file.name}-thumb.jpg`});
    const recipe=parseRecipeText(text,{...baseSource,type:'pdf',mediaId,mediaType:'application/pdf',thumbnailId,documentMeta,extractor:ocrPages?`pdf-ocr:${ocrPages}/${pages}`:'pdf-text'});
    return recipe;
  }
  if(type.startsWith('image/')){
    const text=await ocrImage(file,file.name||'photo');
    let mediaId='',thumbnailId='';
    if(keep) mediaId=await storeMedia(file,{name:file.name});
    const thumb=await imageThumbnail(file).catch(()=>null);
    if(thumb) thumbnailId=await storeMedia(thumb,{name:`${file.name}-thumb.jpg`});
    return parseRecipeText(text,{...baseSource,type:'image',mediaId,mediaType:type,thumbnailId,extractor:'image-ocr'});
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
    const recipe=parseRecipeText(text,{...baseSource,type:'video',mediaId,mediaType:type,thumbnailId,extractor:'video-ocr'});
    recipe.tags=[...new Set([...(recipe.tags||[]),'Video'])];
    if(!recipe.ingredients.length && !recipe.steps.length) recipe.notes=t('noVideoText');
    return recipe;
  }
  if(type==='text/plain'){
    const text=await file.text();return parseRecipeText(text,{...baseSource,type:'text',extractor:'text'});
  }
  throw new Error(`Unsupported file type: ${type||file.name}`);
}
async function handleFiles(fileList) {
  const files=[...fileList];if(!files.length)return;
  if(files.length>1) toast(`${t('importingFirst')}; ${files.length-1} ${state.language==='fi'?'lisää seuraa':state.language==='it'?'altri seguiranno':'more will follow'}`);
  for(const file of files){
    try{
      const recipe=await processFile(file);
      { const count=(recipe.ingredients||[]).filter(i=>i.kind!=='group').length; setStatus(`${file.name} · ${count} ${state.language==='fi'?'ainesta':state.language==='it'?'ingredienti':'ingredients'} · ${(recipe.steps||[]).length} ${state.language==='fi'?'vaihetta':state.language==='it'?'passaggi':'steps'}`,false); }
      await openImportedDraft(recipe);
      if(files.length>1) break;
    }catch(e){console.error(e);setStatus('',false);toast(`${state.language==='fi'?'Tiedostoa ei voitu tuoda':state.language==='it'?'Impossibile importare':'Could not import'} ${file.name}`);}
  }
}

async function handleSharedImport() {
  const params=new URLSearchParams(location.search);
  if(params.get('shareError')) toast(t('sharedFailed'));
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

function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function backupPayload(full=false){const compact=recipes.map(compactRecipe).map(r=>full?r:{...r,mid:'',mt:'',tid:'',cid:''});return {appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,version:SCHEMA_VERSION,schema:'compact-v1',exportedAt:new Date().toISOString(),recipes:compact,state:{...state,available:[]}};}
async function exportBackup() {
  setStatus(t('buildingBackup'));
  const payload=backupPayload(false);
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`recipe-vault-backup-${new Date().toISOString().slice(0,10)}.json`);
  setStatus('',false);toast(t('backupExported'));
}
async function loadJSZip(){
  if(window.JSZip)return window.JSZip;
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  return window.JSZip;
}
function mediaExtension(item={}){
  const type=item.type||'';
  const byType={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf','video/mp4':'mp4','video/webm':'webm'}[type];
  if(byType)return byType;
  const m=String(item.name||'').match(/\.([a-z0-9]{2,5})$/i);return m?.[1]?.toLowerCase()||'bin';
}
async function exportFullZip(){
  try{
    setStatus(t('buildingBackup'));
    const JSZip=await loadJSZip();const zip=new JSZip();
    zip.file('recipes.json',JSON.stringify(backupPayload(true),null,2));
    const media=await idbGetAll('media');const index=[];
    for(let i=0;i<media.length;i++){
      const m=media[i];setStatus(`Media ${i+1}/${media.length}…`);
      const filename=`${m.id}.${mediaExtension(m)}`;
      zip.file(`media/${filename}`,m.blob);index.push({id:m.id,type:m.type,name:m.name,createdAt:m.createdAt,file:filename});
    }
    zip.file('media-index.json',JSON.stringify(index,null,2));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    downloadBlob(blob,`recipe-vault-full-${new Date().toISOString().slice(0,10)}.zip`);setStatus('',false);toast(t('backupExported'));
  }catch(e){console.error(e);setStatus('',false);toast(t('backupImportFailed'));}
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function dataUrlToBlob(dataUrl){const res=await fetch(dataUrl);return await res.blob();}
async function normalizeImportedBackup(data){
  if(!Array.isArray(data?.recipes))throw new Error('Invalid backup');
  const out=data.recipes.map(r=>cleanRecipeRecord(expandRecipe(r)));
  return {recipes:out,state:data.state||{},legacyMedia:Array.isArray(data.media)?data.media:[],meta:{appVersion:data.appVersion??null,schemaVersion:data.schemaVersion??data.version??null,schema:data.schema||''}};
}
function recipeMediaRefs(recipe={}){return [recipe.mediaId,recipe.thumbnailId,recipe.coverMediaId].filter(Boolean);}
function uniqueStrings(values=[]){
  const seen=new Set(),out=[];
  for(const value of values){const s=String(value||'').trim();if(!s)continue;const key=normalizeText(s);if(seen.has(key))continue;seen.add(key);out.push(s);}
  return out;
}
function mergeShopping(existing=[],incoming=[]){
  const out=existing.map(x=>({...x,sources:[...(x.sources||[])]}));
  const keyOf=x=>`${normalizeText(x?.name||'')}|${x?.unitCanonical||canonicalUnit(x?.unit||'')||''}|${Boolean(x?.checked)}`;
  const keys=new Set(out.map(keyOf));
  for(const item of incoming||[]){const key=keyOf(item);if(!item?.name||keys.has(key))continue;keys.add(key);out.push({...item,id:item.id||uid('shop'),sources:[...(item.sources||[])]});}
  return out;
}
function clearUnavailableMediaRefs(recipe,availableIds){
  for(const key of ['mediaId','thumbnailId','coverMediaId'])if(recipe[key]&&!availableIds.has(recipe[key]))recipe[key]='';
  if(!recipe.mediaId)recipe.mediaType='';
  return recipe;
}
function mergeRecipeRecords(existing,incoming,availableIds){
  if(!existing)return clearUnavailableMediaRefs(cleanRecipeRecord(incoming),availableIds);
  const merged={...existing,...incoming,source:{...(existing.source||{}),...(incoming.source||{})}};
  merged.id=existing.id||incoming.id;
  merged.createdAt=existing.createdAt||incoming.createdAt||Date.now();
  merged.updatedAt=Math.max(Number(existing.updatedAt)||0,Number(incoming.updatedAt)||0,Date.now());
  for(const key of ['mediaId','thumbnailId','coverMediaId']){
    const wanted=incoming[key];
    merged[key]=wanted&&availableIds.has(wanted)?wanted:(existing[key]&&availableIds.has(existing[key])?existing[key]:'');
  }
  merged.mediaType=merged.mediaId?(incoming.mediaType||existing.mediaType||''):'';
  return clearUnavailableMediaRefs(cleanRecipeRecord(merged),availableIds);
}
function restoreSummaryText(parsed,info={}){
  const pantry=Array.isArray(parsed.state?.pantry)?parsed.state.pantry.length:0;
  const shopping=Array.isArray(parsed.state?.shopping)?parsed.state.shopping.length:0;
  const media=Number(info.expectedMedia||0);
  return `${t('backupContains',{recipes:parsed.recipes.length,pantry,shopping,media})}\n${t('backupCurrent',{recipes:recipes.length})}\n\n${t('backupRestoreChoice')}`;
}
function chooseRestoreMode(parsed,info={}){
  const dialog=$('#restoreDialog');
  $('#restoreSummary').textContent=restoreSummaryText(parsed,info);
  const missing=Number(info.missingMedia||0);
  const warning=$('#restoreMediaWarning');warning.textContent=missing?t('backupMissingMedia',{count:missing}):'';warning.classList.toggle('hidden',!missing);
  dialog.showModal();
  return new Promise(resolve=>{
    let done=false;const finish=value=>{if(done)return;done=true;dialog.close();resolve(value);};
    $('#restoreMergeBtn').onclick=()=>finish('merge');
    $('#restoreReplaceBtn').onclick=()=>finish('replace');
    $('#restoreCancelBtn').onclick=()=>finish(null);
    dialog.oncancel=e=>{e.preventDefault();finish(null);};
  });
}
async function legacyMediaItems(parsed){
  const out=[];
  for(const m of parsed.legacyMedia||[]){if(!m.data)continue;out.push({id:m.id,type:m.type,name:m.name,createdAt:m.createdAt,blob:await dataUrlToBlob(m.data)});}
  return out;
}
async function restoreBackupData(parsed,mediaItems=[],info={}){
  const mode=await chooseRestoreMode(parsed,info);if(!mode){setStatus('',false);return;}
  const legacyItems=await legacyMediaItems(parsed);
  const importedMedia=[...mediaItems,...legacyItems];
  const currentMedia=mode==='merge'?await idbGetAll('media'):[];
  const availableIds=new Set([...currentMedia,...importedMedia].map(m=>m?.id).filter(Boolean));

  if(mode==='replace')await Promise.all(['recipes','media','state'].map(idbClear));
  if(mode==='merge'){
    const existingRecipes=await idbGetAll('recipes');
    const byId=new Map(existingRecipes.map(r=>[r.id,r]));
    const bySource=new Map(existingRecipes.map(r=>[r.source?.sourceKey||sourceKeyFor(r),r]).filter(([k])=>k));
    const idRemap=new Map();
    for(const incoming of parsed.recipes){
      const sourceKey=incoming.source?.sourceKey||sourceKeyFor(incoming);const existing=(sourceKey&&bySource.get(sourceKey))||byId.get(incoming.id)||null;
      const merged=mergeRecipeRecords(existing,incoming,availableIds);if(incoming.id&&merged.id!==incoming.id)idRemap.set(incoming.id,merged.id);await idbPut('recipes',merged);
    }
    for(const m of importedMedia)await idbPut('media',m);
    const importedState=parsed.state||{};
    const importedShopping=(importedState.shopping||[]).map(item=>({...item,sources:(item.sources||[]).map(id=>idRemap.get(id)||id)}));
    state={...state,
      pantry:uniqueStrings([...(state.pantry||[]),...(importedState.pantry||[])]),
      available:[],
      shopping:mergeShopping(state.shopping||[],importedShopping),
      textTranslations:{...(importedState.textTranslations||{}),...(state.textTranslations||{})}
    };
    pruneTextTranslationCache();await saveState();
  }else{
    for(const r of parsed.recipes)await idbPut('recipes',clearUnavailableMediaRefs(r,availableIds));
    for(const m of importedMedia)await idbPut('media',m);
    state={...state,...parsed.state,available:[]};pruneTextTranslationCache();await saveState();
  }
  await loadAll();await renderAll();setStatus('',false);toast(t('backupRestored'));setTimeout(()=>backfillTranslations(),250);
}
async function importBackup(file) {
  try{
    setStatus(t('readingBackup'));
    if(/\.zip$/i.test(file.name)||file.type==='application/zip'){
      const JSZip=await loadJSZip();const zip=await JSZip.loadAsync(file);
      const recipeFile=zip.file('recipes.json');if(!recipeFile)throw new Error('recipes.json missing');
      const parsed=await normalizeImportedBackup(JSON.parse(await recipeFile.async('string')));
      let index=[];const idx=zip.file('media-index.json');if(idx)index=JSON.parse(await idx.async('string'));
      const mediaItems=[],missingFiles=[];
      for(const m of index){const entry=zip.file(`media/${m.file}`);if(!entry){missingFiles.push(m.id);continue;}mediaItems.push({id:m.id,type:m.type,name:m.name,createdAt:m.createdAt,blob:await entry.async('blob')});}
      const present=new Set(mediaItems.map(m=>m.id));const refs=new Set(parsed.recipes.flatMap(recipeMediaRefs));
      const missingRefs=[...refs].filter(id=>!present.has(id)&&!parsed.legacyMedia.some(m=>m.id===id));
      const missing=new Set([...missingFiles,...missingRefs]);
      await restoreBackupData(parsed,mediaItems,{expectedMedia:index.length,missingMedia:missing.size});return;
    }
    const parsed=await normalizeImportedBackup(JSON.parse(await file.text()));
    const expected=parsed.legacyMedia.length;const refs=new Set(parsed.recipes.flatMap(recipeMediaRefs));const legacyIds=new Set(parsed.legacyMedia.map(m=>m.id));const missing=[...refs].filter(id=>!legacyIds.has(id));
    await restoreBackupData(parsed,[],{expectedMedia:expected,missingMedia:missing.length});
  }catch(e){console.error(e);setStatus('',false);toast(t('backupImportFailed'));}
}
async function renderStorageInfo(){
  if(!$('#storageInfo'))return;
  try{
    const est=await navigator.storage?.estimate?.();
    if(est)$('#storageInfo').textContent=`${t('storageUsed')} ${fmtBytes(est.usage||0)} ${t('used')}${est.quota?` ${t('ofAbout')} ${fmtBytes(est.quota)}`:''}. ${recipes.length} ${t('recipesSaved')}`;
    else $('#storageInfo').textContent=`${recipes.length} ${t('recipesSaved')}`;
  }catch{$('#storageInfo').textContent=`${recipes.length} ${t('recipesSaved')}`;}
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
  $('#quickImportBtn').onclick=toggleImportPage;
  $('#recipeSearch').oninput=()=>renderRecipes();
  $('#recipeSort').value=state.recipeSort||'recent';
  $('#recipeSort').onchange=async e=>{state.recipeSort=e.target.value;await saveState();renderRecipes();};
  $('#addAvailableIngredient').onclick=async()=>{const input=$('#availableIngredientInput');if(await addUniqueTranslatedIngredient(state.available,input.value)){input.value='';await saveState();renderAvailable();renderMatches();}else input.value='';};
  $('#availableIngredientInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#addAvailableIngredient').click();}};
  $('#pantryAddBtn').onclick=async()=>{const input=$('#pantryInput');if(await addUniqueTranslatedIngredient(state.pantry,input.value)){input.value='';await saveState();renderPantry();renderMatches();}else input.value='';};
  $('#pantryInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#pantryAddBtn').click();}};

  $$('[data-import-type]').forEach(b=>b.onclick=()=>{const type=b.dataset.importType;$$('[data-import-type]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-import-panel]').forEach(p=>p.classList.toggle('active',p.dataset.importPanel===type));});
  $('#parseTextBtn').onclick=parseTextImport;
  $('#parseWebsiteBtn').onclick=parseWebsiteImport;
  $('#manualRecipeBtn').onclick=()=>openEditor(createRecipeDraft({id:uid('recipe')}),true);
  $('#fileInput').onchange=e=>handleFiles(e.target.files);
  $('#cameraInput').onchange=e=>handleFiles(e.target.files);
  const dz=$('#dropZone');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
  dz.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));

  $('#manualShoppingAdd').onclick=async()=>{const i=$('#manualShoppingInput');const name=i.value.trim();if(!name)return;await mergeShoppingIngredient({name},'',true);i.value='';await saveState();renderShopping();};
  $('#manualShoppingInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#manualShoppingAdd').click();}};
  $('#clearCheckedBtn').onclick=async()=>{state.shopping=state.shopping.filter(i=>!i.checked);await saveState();renderShopping();};

  $$('[data-close-dialog]').forEach(b=>b.onclick=()=>$('#'+b.dataset.closeDialog).close());
  $('#changeRecipePhotoBtn').onclick=()=>$('#recipePhotoInput').click();
  $('#recipePhotoInput').onchange=e=>{const f=e.target.files?.[0];if(f)openCropDialog(f);};
  $('#addIngredientRowBtn').onclick=()=>addIngredientEditorRow('ingredient');
  $('#addIngredientGroupBtn').onclick=()=>addIngredientEditorRow('group');
  $('#addStepRowBtn').onclick=addStepEditorRow;
  $('#cropCancelBtn').onclick=closeCropDialog;
  $('#cropDialog').addEventListener('cancel',e=>{e.preventDefault();closeCropDialog();});
  $('#cropSaveBtn').onclick=saveCrop;
  $('#cropZoom').oninput=e=>{
    if(!cropState)return;
    const canvas=$('#cropCanvas'),img=cropState.img;
    const oldBase=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight)*cropState.zoom;
    const cx=(canvas.width/2-cropState.x)/oldBase,cy=(canvas.height/2-cropState.y)/oldBase;
    cropState.zoom=Number(e.target.value)||1;
    const newBase=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight)*cropState.zoom;
    cropState.x=canvas.width/2-cx*newBase;cropState.y=canvas.height/2-cy*newBase;drawCrop();
  };
  const cropCanvas=$('#cropCanvas');
  cropCanvas.addEventListener('pointerdown',e=>{if(!cropState)return;cropCanvas.setPointerCapture(e.pointerId);cropState.drag={px:e.clientX,py:e.clientY};});
  cropCanvas.addEventListener('pointermove',e=>{if(!cropState?.drag)return;const rect=cropCanvas.getBoundingClientRect();const sx=cropCanvas.width/rect.width,sy=cropCanvas.height/rect.height;cropState.x+=(e.clientX-cropState.drag.px)*sx;cropState.y+=(e.clientY-cropState.drag.py)*sy;cropState.drag={px:e.clientX,py:e.clientY};drawCrop();});
  cropCanvas.addEventListener('pointerup',()=>{if(cropState)cropState.drag=null;});
  cropCanvas.addEventListener('pointercancel',()=>{if(cropState)cropState.drag=null;});
  $('#favoriteRecipeBtn').onclick=async()=>{await toggleFavorite(activeRecipeId);const r=recipes.find(x=>x.id===activeRecipeId);$('#favoriteRecipeBtn').textContent=r?.favorite?'♥':'♡';};
  $('#editRecipeBtn').onclick=()=>{const r=recipes.find(x=>x.id===activeRecipeId);if(r){$('#recipeDialog').close();openEditor(r,false);}};
  $('#editRatingStars').onclick=e=>{const btn=e.target.closest('[data-rating-value]');if(!btn||!editorDraft)return;const clicked=normalizeRating(btn.dataset.ratingValue);editorDraft.rating=normalizeRating(editorDraft.rating)===clicked?0:clicked;renderEditorRating(editorDraft.rating);};
  $('#recipeEditor').addEventListener('submit',async e=>{
    e.preventDefault();if(!editorDraft)return;
    editorDraft.title=cleanInlineSpacing($('#editTitle').value)||'Untitled recipe';
    editorDraft.rating=normalizeRating(editorDraft.rating);
    editorDraft.description=cleanMultilineSpacing($('#editDescription').value);
    editorDraft.servings=cleanInlineSpacing($('#editServings').value);
    editorDraft.prepTime=cleanInlineSpacing($('#editPrepTime').value);
    editorDraft.cookTime=cleanInlineSpacing($('#editCookTime').value);
    editorDraft.restTime=cleanInlineSpacing($('#editRestTime').value);
    editorDraft.totalTime=cleanInlineSpacing($('#editTotalTime').value);
    editorDraft.temperature=normalizeTemperatureText($('#editTemperature').value);
    editorDraft.type=cleanInlineSpacing($('#editType').value)||'Recipe';
    editorDraft.cuisine=$('#editCuisine').value.split(',').map(cleanInlineSpacing).filter(Boolean);
    editorDraft.dietary=$('#editDietary').value.split(',').map(cleanInlineSpacing).filter(Boolean);
    editorDraft.traits=$('#editTraits').value.split(',').map(cleanInlineSpacing).filter(Boolean);
    editorDraft.category=editorDraft.type;
    editorDraft.tags=[...new Set([...editorDraft.cuisine,...editorDraft.dietary,...editorDraft.traits])];
    editorDraft.ingredients=collectIngredientEditor();
    editorDraft.steps=collectStepEditor();
    editorDraft.equipment=$('#editEquipment').value.split('\n').map(cleanInlineSpacing).filter(Boolean);
    editorDraft.notes=cleanMultilineSpacing($('#editNotes').value);
    editorDraft.nutrition=cleanMultilineSpacing($('#editNutrition').value);
    editorDraft.source=editorDraft.source||{type:'manual'};editorDraft.source.url=$('#editSourceUrl').value.trim();editorDraft.source.sourceKey=editorDraft.source.url?`url:${normalizeUrl(editorDraft.source.url)}`:(editorDraft.source.fileHash?`file:${editorDraft.source.fileHash}`:(editorDraft.source.sourceKey||''));
    editorDraft.importQuality=validateRecipe(editorDraft);
    setStatus(t('translatingContent'));
    await saveRecipe(editorDraft);$('#editorDialog').close();setStatus('',false);go('recipes');toast(t('recipeSaved'));
  });
  $('#deleteRecipeBtn').onclick=async()=>{
    if(!editorDraft)return;
    if(await confirmAction(t('deleteRecipeQ'),`“${editorDraft.title}” ${t('deleteRecipeText')}`,t('delete'))){
      await deleteRecipeMedia(editorDraft);await idbDelete('recipes',editorDraft.id);recipes=recipes.filter(r=>r.id!==editorDraft.id);state.shopping=state.shopping.map(i=>({...i,sources:(i.sources||[]).filter(id=>id!==editorDraft.id)}));await saveState();$('#editorDialog').close();renderAll();toast(t('recipeDeleted'));
    }
  };
  $('#confirmShoppingAdd').onclick=async()=>{const r=recipes.find(x=>x.id===pendingShoppingRecipeId);if(!r)return;const selected=$$('[data-pick-ingredient]:checked').map(x=>Number(x.dataset.pickIngredient));for(const idx of selected)await mergeShoppingIngredient(r.ingredients[idx],r.id,false);await saveState();$('#shoppingDialog').close();renderShopping();toast(`${selected.length} ${t('ingredientsAdded')}`);};

  $('#exportBtn').onclick=exportBackup;
  $('#exportFullZipBtn').onclick=exportFullZip;
  $('#importBackupInput').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);};
  $('#themeSelect').onchange=async e=>{state.theme=e.target.value;await saveState();applyTheme();};
  $$('[data-language]').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.language)));
  $$('[data-measurement]').forEach(btn=>btn.addEventListener('click',()=>setMeasurementSystem(btn.dataset.measurement)));
  document.addEventListener('change',e=>{if(e.target?.id==='languageSelect') setLanguage(e.target.value);});
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme();});
  $('#clearAllBtn').onclick=async()=>{if(await confirmAction(t('deleteAllQ'),t('deleteAllText'),t('deleteEverything'))){await Promise.all(['recipes','media','state','shared'].map(idbClear));state={pantry:[],available:[],shopping:[],textTranslations:{},theme:'system',language:state.language||'en',measurementSystem:state.measurementSystem||'metric',activeRecipeFilter:'All',recipeSort:'recent'};recipes=[];clearTranslationMemory();await saveState();applyTheme();applyLanguage();renderAll();toast(t('deletedAll'));}};

  $('#confirmCancel').onclick=()=>{$('#confirmDialog').close();confirmResolver?.(false);confirmResolver=null;};
  $('#confirmOk').onclick=()=>{$('#confirmDialog').close();confirmResolver?.(true);confirmResolver=null;};
  $('#confirmDialog').addEventListener('cancel',e=>{e.preventDefault();$('#confirmCancel').click();});

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').disabled=false;$('#installBtn').textContent=t('installApp');});
  $('#installBtn').onclick=async()=>{if(!deferredInstallPrompt){toast(t('browserInstall'));return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').disabled=true;};
}

async function init(){
  db=await openDb();
  // Load persistent state first. Event controls must not initialize themselves
  // from the default state and then race the saved state during the first render.
  await loadAll();
  bindEvents();
  if ($('#recipeSearch')) $('#recipeSearch').value = '';
  await renderAll();
  const hash=location.hash.replace('#','');if(['cook','pantry','import','shopping','settings'].includes(hash))go(hash);else go('recipes');
  if('serviceWorker' in navigator){
    try{
      let refreshing=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(refreshing)return;
        refreshing=true;
        location.reload();
      });
      const reg=await navigator.serviceWorker.register('./sw.js?v=25',{updateViaCache:'none'});
      await reg.update().catch(()=>{});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});});
    }catch(e){console.warn('SW registration failed',e);}
  }
  if(matchMedia('(display-mode: standalone)').matches) $('#installBtn').textContent=t('installed');
  await handleSharedImport();
  setTimeout(()=>backfillTranslations(),600);
}

init().catch(err=>{console.error(err);toast(t('appStartFailed'));});
