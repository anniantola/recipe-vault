const DB_NAME = 'recipe-vault-db';
const DB_VERSION = 1;
const APP_VERSION = 6;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const UNIT_ALIASES = {
  kg:'kg', g:'g', mg:'mg', l:'l', dl:'dl', cl:'cl', ml:'ml',
  tbsp:'tbsp', tablespoon:'tbsp', tablespoons:'tbsp', rkl:'tbsp',
  'cucchiaio':'tbsp', 'cucchiai':'tbsp',
  tsp:'tsp', teaspoon:'tsp', teaspoons:'tsp', tl:'tsp',
  'cucchiaino':'tsp', 'cucchiaini':'tsp',
  cup:'cup', cups:'cup', 'tazza':'cup', 'tazze':'cup',
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
  ['Baking', ['bread','bun','buns','dough','bake','baked','muffin','muffins','scone','scones','leipä','leipa','pulla','taikina','paista','pane','impasto','forno']],
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
  ['Quick', ['15 minute','20 minute','30 minute','quick','easy','15 min','20 min','30 min','nopea','helppo','veloce','facile']],
  ['High protein', ['high protein','protein-rich','protein rich','proteiinipitoinen','alto contenuto proteico']]
];

const HEADING_SETS = {
  ingredients: new Set(['ingredients','ingredient','what youll need','ainekset','ainesosat','raaka aineet','ingredienti','occorrente']),
  steps: new Set(['instructions','instruction','directions','direction','method','steps','step','preparation','ohje','ohjeet','valmistus','valmistusohje','valmistusohjeet','teko ohje','istruzioni','procedimento','preparazione','metodo']),
  notes: new Set(['notes','note','tips','tip','cook s notes','huom','huomio','huomioita','vinkit','vinkki','lisatiedot','lisatieto','note dello chef','consigli','consiglio','suggerimenti']),
  stop: new Set(['nutrition','nutrition facts','nutritional information','nutritional estimate','nutritional estimate per serving','ravintoarvot','ravintosisalto','valori nutrizionali','informazioni nutrizionali','related recipes','samankaltaiset reseptit','ricette correlate','comments','kommentit','commenti','did you make this','rate this recipe'])
};
const BOILERPLATE_RE = /^(jump to recipe|print recipe|advertisement|cookie policy|privacy policy|accept cookies|save recipe|share recipe|sign up|newsletter|skip to content|cook mode.*|voit merkata työvaiheen.*|you can mark the step.*|puoi segnare.*)$/i;
const EXTRA_INFO_RE = /\b(prep time|cook time|total time|rest time|storage|store|substitut|tip|note|serve with|make ahead|freez|prep|valmistusaika|kypsennysaika|paistoaika|kokonaisaika|sailytys|säilytys|vinkki|huom|tarjoile|korvaa|pakastus|tempo di preparazione|tempo di cottura|tempo totale|riposo|conserva|conservazione|consiglio|sostitu|servire con)\b/i;

let db;
let state = {
  pantry: [],
  available: [],
  shopping: [],
  theme: 'system',
  language: 'en',
  measurementSystem: 'metric',
  activeRecipeFilter: 'All'
};
let recipes = [];
let activeRecipeId = null;
let editorDraft = null;
let deferredInstallPrompt = null;
let pendingShoppingRecipeId = null;
let confirmResolver = null;

const I18N = {
  en: {
    privateLibrary:'PRIVATE RECIPE LIBRARY', recipes:'Recipes', cook:'Cook', import:'Import', shopping:'Shopping', settings:'Settings',
    searchRecipes:'Search recipes, ingredients, tags…', yourCollection:'YOUR COLLECTION', recipeLibrary:'Recipe library', newest:'Newest', az:'A–Z', favorites:'Favorites', noRecipesYet:'No recipes yet', noRecipesText:'Import a website, PDF, photo, downloaded Reel/video or plain text. You can also add a recipe manually.', importFirst:'Import your first recipe',
    whatCanIMake:'WHAT CAN I MAKE?', matchWhatYouHave:'Match what you have', matcherHelp:'Type ingredients loosely. The matcher understands English, Finnish and Italian, plus plurals, preparation words and common synonyms.', availablePlaceholder:'e.g. tomato, pasta, parmesan', add:'Add', includePantry:'Include pantry', includePantryHelp:'Use ingredients you have saved at home.', addFewIngredients:'Add a few ingredients', matchEmptyText:'Your recipes will be ranked by how many required ingredients you already have.',
    text:'Text', website:'Website', file:'File', manual:'Manual', pasteAnyRecipe:'PASTE ANY RECIPE', textImport:'Text import', pasteRecipePlaceholder:'Paste a recipe, caption, message or notes here…', parseRecipe:'Parse recipe', fromWeb:'FROM THE WEB', websiteSocial:'Website or social link', websiteHelp:'Ordinary recipe pages are fetched as readable text. For Instagram, the most reliable route is to download the Reel and import/share the video file.', importLink:'Import from link', websitePrivacy:'Website import uses Jina Reader when a site cannot be read directly. The URL is sent to that external service for extraction.', photoPdfVideo:'PHOTO · PDF · VIDEO', importFile:'Import a file', chooseFiles:'Choose files', fileTypes:'Images, PDFs and downloaded recipe videos/Reels', takePhoto:'Take photo', keepOriginal:'Keep original source', keepOriginalHelp:'Store the imported image, PDF or video with the recipe.', ocrPrivacy:'OCR reads English, Finnish and Italian. It may need internet the first time; recipe browsing and shopping remain offline.', startScratch:'START FROM SCRATCH', manualRecipe:'Manual recipe', createBlank:'Create blank recipe',
    shoppingList:'SHOPPING LIST', addAnything:'Add anything…', clearChecked:'Clear checked', listEmpty:'Your list is empty', listEmptyText:'Add ingredients from any recipe, or type unrelated shopping items above.', atHome:'AT HOME', pantry:'Pantry', pantryHelp:'Saved pantry items are automatically excluded when you add missing recipe ingredients to your shopping list.', pantryPlaceholder:'Add pantry ingredient…', nothingSaved:'Nothing saved yet.',
    languageEyebrow:'LANGUAGE', language:'Language', appLanguage:'App language', appLanguageHelp:'Changes the interface language. Recipe parsing always understands English, Finnish and Italian.', appearance:'APPEARANCE', theme:'Theme', colorTheme:'Color theme', darkHelp:'Dark mode uses a true black background.', system:'System', dark:'Dark', light:'Light', data:'DATA', backupRestore:'Backup & restore', backupHelp:'Your data is stored locally on this device. Export a JSON backup before clearing browser/app data or moving phones.', includeMedia:'Include recipe media', includeMediaHelp:'Includes stored photos, PDFs and videos; backups can become large.', exportJson:'Export JSON', importJson:'Import JSON', app:'APP', installVault:'Install Recipe Vault', installHelp:'Install it to your home screen for standalone use and Android share-sheet importing.', installApp:'Install app', installed:'Installed', shareHelp:'After installation, downloaded recipe photos/videos/PDFs can be shared to Recipe Vault from Android’s normal Share menu on supporting browsers.', reset:'RESET', clearData:'Clear app data', deleteAll:'Delete all recipes and lists',
    save:'Save', reviewRecipe:'Review recipe', editRecipe:'Edit recipe', title:'Title', servings:'Servings', servingsPlaceholder:'e.g. 4', category:'Category', categoryPlaceholder:'Dinner, baking…', tags:'Tags', tagsPlaceholder:'Italian, vegetarian, quick…', ingredients:'Ingredients', ingredientsPlaceholder:'One ingredient per line', steps:'Steps', stepsPlaceholder:'One step per line', notes:'Notes / extra information', notesPlaceholder:'Tips, timing, substitutions, storage, or anything that did not fit elsewhere', sourceUrl:'Source URL', deleteRecipe:'Delete recipe', addToShopping:'Add to shopping', cancel:'Cancel', delete:'Delete', source:'Source', optional:'optional', noIngredients:'No ingredients parsed.', noSteps:'No steps parsed.', originalVideo:'Original video', originalPdf:'Original PDF', openStoredPdf:'Open stored PDF ↗', checkWhatIHave:'Check what I have', alreadyAtHome:'Already at home', noIngredientsAvailable:'No ingredients available.',
    all:'All', match:'match', ingredientSingular:'ingredient', ingredientPlural:'ingredients', atHomeLower:'at home', available:'available', recipeSingular:'recipe', recipePlural:'recipes', ranked:'ranked', itemSingular:'item', itemPlural:'items', from:'From', manualItems:'manual items', manualLower:'manual', movedToPantry:'moved to pantry', recipeSaved:'Recipe saved', recipeDeleted:'Recipe deleted', backupExported:'Backup exported', backupRestored:'Backup restored',
    textSource:'Text', webSource:'Web', photoSource:'Photo', pdfSource:'PDF', videoSource:'Video', manualSource:'Manual', sharedSource:'Shared', servingsUpper:'SERVINGS', pasteFirst:'Paste a recipe first', parsingText:'Parsing text…', parsedReview:'Recipe parsed — review before saving', pasteLinkFirst:'Paste a website link first', readingWebsite:'Reading website…', websiteRead:'Website read — review the extracted recipe', linkFailed:'Could not read that link. Download/share the file or paste the recipe text.', loadingPdf:'Loading PDF reader…', loadingOcr:'Loading OCR…', sharedFailed:'The shared item could not be imported', buildingBackup:'Building backup…', readingBackup:'Reading backup…', restoreBackup:'Restore backup?', restoreBackupText:'This will replace the recipes, pantry and shopping list currently stored in this app.', restore:'Restore', backupImportFailed:'That backup could not be imported', deleteRecipeQ:'Delete recipe?', deleteRecipeText:'and its stored source media will be deleted from this device.', deleteAllQ:'Delete all app data?', deleteAllText:'This permanently removes every locally stored recipe, source file, pantry item and shopping-list item from this browser.', deleteEverything:'Delete everything', deletedAll:'All local data deleted', browserInstall:'Use your browser menu → Install app / Add to Home screen', appStartFailed:'Recipe Vault could not start', noVideoText:'No readable recipe text was detected in the sampled video frames. Add ingredients/steps manually while reviewing.', recipesSaved:'recipes saved locally.', storageUsed:'Browser storage:', used:'used', ofAbout:'of about', ingredientsAdded:'ingredients added', importingFirst:'Importing first file now', measurementsEyebrow:'MEASUREMENTS', measurements:'Measurements', measurementSystem:'Measurement system', measurementHelp:'Switch recipe amounts between metric and US customary. The original imported quantities stay stored unchanged.', metric:'Metric', usCustomary:'US', measurementChanged:'Measurements changed', approx:'approx.'
  },
  fi: {
    privateLibrary:'OMA RESEPTIKIRJASTO', recipes:'Reseptit', cook:'Kokkaa', import:'Tuo', shopping:'Ostokset', settings:'Asetukset',
    searchRecipes:'Hae reseptejä, aineksia tai tageja…', yourCollection:'OMA KOKOELMA', recipeLibrary:'Reseptikirjasto', newest:'Uusimmat', az:'A–Ö', favorites:'Suosikit', noRecipesYet:'Ei vielä reseptejä', noRecipesText:'Tuo resepti verkkosivulta, PDF:stä, kuvasta, ladatusta Reel-videosta tai tekstistä. Voit myös lisätä reseptin käsin.', importFirst:'Tuo ensimmäinen resepti',
    whatCanIMake:'MITÄ VOIN TEHDÄ?', matchWhatYouHave:'Etsi aineksillasi', matcherHelp:'Kirjoita ainekset vapaasti. Haku ymmärtää englantia, suomea ja italiaa sekä taivutuksia, valmistelusanoja ja tavallisia synonyymejä.', availablePlaceholder:'esim. tomaatti, pasta, parmesaani', add:'Lisää', includePantry:'Sisällytä kotivarasto', includePantryHelp:'Käytä myös kotiin tallennettuja aineksia.', addFewIngredients:'Lisää muutama aines', matchEmptyText:'Reseptit järjestetään sen mukaan, kuinka moni tarvittava aines sinulla jo on.',
    text:'Teksti', website:'Verkkosivu', file:'Tiedosto', manual:'Käsin', pasteAnyRecipe:'LIITÄ RESEPTI', textImport:'Tuo tekstistä', pasteRecipePlaceholder:'Liitä resepti, kuvateksti, viesti tai muistiinpanot tähän…', parseRecipe:'Jäsennä resepti', fromWeb:'VERKOSTA', websiteSocial:'Verkkosivu tai some-linkki', websiteHelp:'Tavalliset reseptisivut luetaan tekstiksi. Instagramissa luotettavin tapa on ladata Reel ja tuoda/jakaa videotiedosto sovellukseen.', importLink:'Tuo linkistä', websitePrivacy:'Verkkosivun tuonti käyttää Jina Readeria, jos sivua ei voi lukea suoraan. URL lähetetään palveluun tekstin poimintaa varten.', photoPdfVideo:'KUVA · PDF · VIDEO', importFile:'Tuo tiedosto', chooseFiles:'Valitse tiedostot', fileTypes:'Kuvat, PDF:t ja ladatut reseptivideot/Reelsit', takePhoto:'Ota kuva', keepOriginal:'Säilytä alkuperäinen', keepOriginalHelp:'Tallenna tuotu kuva, PDF tai video reseptin yhteyteen.', ocrPrivacy:'OCR lukee englantia, suomea ja italiaa. Se voi tarvita internetiä ensimmäisellä kerralla; reseptien selaus ja ostoslista toimivat offline.', startScratch:'ALOITA TYHJÄSTÄ', manualRecipe:'Resepti käsin', createBlank:'Luo tyhjä resepti',
    shoppingList:'OSTOSLISTA', addAnything:'Lisää mitä tahansa…', clearChecked:'Poista rastitetut', listEmpty:'Ostoslista on tyhjä', listEmptyText:'Lisää aineksia resepteistä tai kirjoita listaan muita ostoksia.', atHome:'KOTONA', pantry:'Kotivarasto', pantryHelp:'Kotivarastoon tallennetut ainekset jätetään automaattisesti pois, kun lisäät puuttuvat reseptiainekset ostoslistalle.', pantryPlaceholder:'Lisää aines kotivarastoon…', nothingSaved:'Ei vielä tallennettuja aineksia.',
    languageEyebrow:'KIELI', language:'Kieli', appLanguage:'Sovelluksen kieli', appLanguageHelp:'Vaihtaa käyttöliittymän kielen. Reseptien jäsennys ymmärtää aina englantia, suomea ja italiaa.', appearance:'ULKOASU', theme:'Teema', colorTheme:'Väriteema', darkHelp:'Tumma tila käyttää täysin mustaa taustaa.', system:'Järjestelmä', dark:'Tumma', light:'Vaalea', data:'TIEDOT', backupRestore:'Varmuuskopiointi', backupHelp:'Tiedot tallennetaan paikallisesti tälle laitteelle. Vie JSON-varmuuskopio ennen selaimen/sovelluksen tietojen tyhjentämistä tai puhelimen vaihtoa.', includeMedia:'Sisällytä mediatiedostot', includeMediaHelp:'Sisältää tallennetut kuvat, PDF:t ja videot; varmuuskopio voi olla suuri.', exportJson:'Vie JSON', importJson:'Tuo JSON', app:'SOVELLUS', installVault:'Asenna Recipe Vault', installHelp:'Asenna kotinäytölle erillisenä sovelluksena ja Androidin jakovalikkoa varten.', installApp:'Asenna sovellus', installed:'Asennettu', shareHelp:'Asennuksen jälkeen ladattuja reseptikuvia, videoita ja PDF:iä voi jakaa Recipe Vaultiin Androidin tavallisesta jakovalikosta tuetuissa selaimissa.', reset:'NOLLAUS', clearData:'Tyhjennä sovelluksen tiedot', deleteAll:'Poista kaikki reseptit ja listat',
    save:'Tallenna', reviewRecipe:'Tarkista resepti', editRecipe:'Muokkaa reseptiä', title:'Nimi', servings:'Annokset', servingsPlaceholder:'esim. 4', category:'Kategoria', categoryPlaceholder:'Päivällinen, leivonta…', tags:'Tagit', tagsPlaceholder:'Italialainen, kasvis, nopea…', ingredients:'Ainekset', ingredientsPlaceholder:'Yksi aines per rivi', steps:'Ohjeet', stepsPlaceholder:'Yksi vaihe per rivi', notes:'Muistiinpanot / lisätiedot', notesPlaceholder:'Vinkit, ajat, korvaavat ainekset, säilytys tai muu tieto, joka ei kuulu aineksiin tai ohjeisiin', sourceUrl:'Lähde-URL', deleteRecipe:'Poista resepti', addToShopping:'Lisää ostoslistalle', cancel:'Peruuta', delete:'Poista', source:'Lähde', optional:'valinnainen', noIngredients:'Aineksia ei tunnistettu.', noSteps:'Ohjeita ei tunnistettu.', originalVideo:'Alkuperäinen video', originalPdf:'Alkuperäinen PDF', openStoredPdf:'Avaa tallennettu PDF ↗', checkWhatIHave:'Tarkista mitä minulla on', alreadyAtHome:'On jo kotona', noIngredientsAvailable:'Ei aineksia.',
    all:'Kaikki', match:'osuma', ingredientSingular:'aines', ingredientPlural:'ainesta', atHomeLower:'kotona', available:'käytettävissä', recipeSingular:'resepti', recipePlural:'reseptiä', ranked:'järjestetty', itemSingular:'tuote', itemPlural:'tuotetta', from:'Resepteistä', manualItems:'+ käsin lisätyt', manualLower:'käsin', movedToPantry:'siirretty kotivarastoon', recipeSaved:'Resepti tallennettu', recipeDeleted:'Resepti poistettu', backupExported:'Varmuuskopio viety', backupRestored:'Varmuuskopio palautettu',
    textSource:'Teksti', webSource:'Verkko', photoSource:'Kuva', pdfSource:'PDF', videoSource:'Video', manualSource:'Käsin', sharedSource:'Jaettu', servingsUpper:'ANNOSTA', pasteFirst:'Liitä ensin resepti', parsingText:'Jäsennetään tekstiä…', parsedReview:'Resepti jäsennetty — tarkista ennen tallennusta', pasteLinkFirst:'Liitä ensin verkkolinkki', readingWebsite:'Luetaan verkkosivua…', websiteRead:'Verkkosivu luettu — tarkista poimittu resepti', linkFailed:'Linkkiä ei voitu lukea. Lataa/jaa tiedosto tai liitä reseptin teksti.', loadingPdf:'Ladataan PDF-lukijaa…', loadingOcr:'Ladataan tekstintunnistusta…', sharedFailed:'Jaettua kohdetta ei voitu tuoda', buildingBackup:'Luodaan varmuuskopiota…', readingBackup:'Luetaan varmuuskopiota…', restoreBackup:'Palautetaanko varmuuskopio?', restoreBackupText:'Tämä korvaa sovellukseen nyt tallennetut reseptit, kotivaraston ja ostoslistan.', restore:'Palauta', backupImportFailed:'Varmuuskopiota ei voitu tuoda', deleteRecipeQ:'Poistetaanko resepti?', deleteRecipeText:'ja sen tallennettu lähdemedia poistetaan tältä laitteelta.', deleteAllQ:'Poistetaanko kaikki sovelluksen tiedot?', deleteAllText:'Tämä poistaa pysyvästi kaikki tähän selaimeen tallennetut reseptit, lähdetiedostot, kotivaraston ja ostoslistan.', deleteEverything:'Poista kaikki', deletedAll:'Kaikki paikalliset tiedot poistettu', browserInstall:'Käytä selaimen valikkoa → Asenna sovellus / Lisää aloitusnäyttöön', appStartFailed:'Recipe Vault ei käynnistynyt', noVideoText:'Videon näyteruuduista ei löytynyt luettavaa reseptitekstiä. Lisää ainekset ja ohjeet käsin tarkistuksen aikana.', recipesSaved:'reseptiä tallennettu paikallisesti.', storageUsed:'Selaintallennus:', used:'käytössä', ofAbout:'noin', ingredientsAdded:'ainesta lisätty', importingFirst:'Tuodaan nyt ensimmäinen tiedosto', measurementsEyebrow:'MITAT', measurements:'Mitat', measurementSystem:'Mittajärjestelmä', measurementHelp:'Vaihda reseptien määrät metrijärjestelmän ja USA:n mittojen välillä. Alkuperäiset tuodut määrät säilyvät muuttumattomina.', metric:'Metri', usCustomary:'USA', measurementChanged:'Mittajärjestelmä vaihdettu', approx:'noin'
  },
  it: {
    privateLibrary:'RACCOLTA RICETTE PRIVATA', recipes:'Ricette', cook:'Cucina', import:'Importa', shopping:'Spesa', settings:'Impostazioni',
    searchRecipes:'Cerca ricette, ingredienti o tag…', yourCollection:'LA TUA RACCOLTA', recipeLibrary:'Raccolta ricette', newest:'Più recenti', az:'A–Z', favorites:'Preferiti', noRecipesYet:'Nessuna ricetta', noRecipesText:'Importa da un sito, PDF, foto, Reel/video scaricato o testo. Puoi anche aggiungere una ricetta manualmente.', importFirst:'Importa la prima ricetta',
    whatCanIMake:'COSA POSSO CUCINARE?', matchWhatYouHave:'Abbina ciò che hai', matcherHelp:'Scrivi gli ingredienti liberamente. La ricerca comprende inglese, finlandese e italiano, oltre a plurali, termini di preparazione e sinonimi comuni.', availablePlaceholder:'es. pomodoro, pasta, parmigiano', add:'Aggiungi', includePantry:'Includi dispensa', includePantryHelp:'Usa anche gli ingredienti salvati a casa.', addFewIngredients:'Aggiungi alcuni ingredienti', matchEmptyText:'Le ricette saranno ordinate in base a quanti ingredienti necessari hai già.',
    text:'Testo', website:'Sito web', file:'File', manual:'Manuale', pasteAnyRecipe:'INCOLLA UNA RICETTA', textImport:'Importa testo', pasteRecipePlaceholder:'Incolla qui una ricetta, didascalia, messaggio o nota…', parseRecipe:'Analizza ricetta', fromWeb:'DAL WEB', websiteSocial:'Sito web o link social', websiteHelp:'Le normali pagine di ricette vengono convertite in testo leggibile. Per Instagram, il metodo più affidabile è scaricare il Reel e importare/condividere il video.', importLink:'Importa dal link', websitePrivacy:'L’importazione web usa Jina Reader quando un sito non può essere letto direttamente. L’URL viene inviato al servizio per l’estrazione.', photoPdfVideo:'FOTO · PDF · VIDEO', importFile:'Importa un file', chooseFiles:'Scegli file', fileTypes:'Immagini, PDF e video/Reel di ricette scaricati', takePhoto:'Scatta foto', keepOriginal:'Conserva fonte originale', keepOriginalHelp:'Salva l’immagine, PDF o video importato con la ricetta.', ocrPrivacy:'L’OCR legge inglese, finlandese e italiano. Potrebbe richiedere internet al primo utilizzo; ricette e lista della spesa restano disponibili offline.', startScratch:'PARTI DA ZERO', manualRecipe:'Ricetta manuale', createBlank:'Crea ricetta vuota',
    shoppingList:'LISTA DELLA SPESA', addAnything:'Aggiungi qualsiasi cosa…', clearChecked:'Rimuovi selezionati', listEmpty:'La lista è vuota', listEmptyText:'Aggiungi ingredienti da una ricetta oppure altri articoli manualmente.', atHome:'A CASA', pantry:'Dispensa', pantryHelp:'Gli ingredienti salvati in dispensa vengono esclusi automaticamente quando aggiungi alla spesa quelli mancanti di una ricetta.', pantryPlaceholder:'Aggiungi ingrediente in dispensa…', nothingSaved:'Ancora nessun ingrediente salvato.',
    languageEyebrow:'LINGUA', language:'Lingua', appLanguage:'Lingua dell’app', appLanguageHelp:'Cambia la lingua dell’interfaccia. L’analisi delle ricette comprende sempre inglese, finlandese e italiano.', appearance:'ASPETTO', theme:'Tema', colorTheme:'Tema colore', darkHelp:'La modalità scura usa uno sfondo nero puro.', system:'Sistema', dark:'Scuro', light:'Chiaro', data:'DATI', backupRestore:'Backup e ripristino', backupHelp:'I dati sono salvati localmente su questo dispositivo. Esporta un backup JSON prima di cancellare i dati del browser/app o cambiare telefono.', includeMedia:'Includi file multimediali', includeMediaHelp:'Include foto, PDF e video salvati; il backup può diventare grande.', exportJson:'Esporta JSON', importJson:'Importa JSON', app:'APP', installVault:'Installa Recipe Vault', installHelp:'Installalo nella schermata Home per usarlo come app e importare dal menu Condividi di Android.', installApp:'Installa app', installed:'Installata', shareHelp:'Dopo l’installazione, foto, video e PDF di ricette scaricati possono essere condivisi con Recipe Vault dal normale menu Condividi di Android nei browser supportati.', reset:'RESET', clearData:'Cancella dati app', deleteAll:'Elimina tutte le ricette e le liste',
    save:'Salva', reviewRecipe:'Controlla ricetta', editRecipe:'Modifica ricetta', title:'Titolo', servings:'Porzioni', servingsPlaceholder:'es. 4', category:'Categoria', categoryPlaceholder:'Cena, dolci…', tags:'Tag', tagsPlaceholder:'Italiano, vegetariano, veloce…', ingredients:'Ingredienti', ingredientsPlaceholder:'Un ingrediente per riga', steps:'Procedimento', stepsPlaceholder:'Un passaggio per riga', notes:'Note / informazioni extra', notesPlaceholder:'Consigli, tempi, sostituzioni, conservazione o altre informazioni non adatte a ingredienti o procedimento', sourceUrl:'URL fonte', deleteRecipe:'Elimina ricetta', addToShopping:'Aggiungi alla spesa', cancel:'Annulla', delete:'Elimina', source:'Fonte', optional:'facoltativo', noIngredients:'Nessun ingrediente riconosciuto.', noSteps:'Nessun passaggio riconosciuto.', originalVideo:'Video originale', originalPdf:'PDF originale', openStoredPdf:'Apri PDF salvato ↗', checkWhatIHave:'Controlla cosa ho', alreadyAtHome:'Già a casa', noIngredientsAvailable:'Nessun ingrediente disponibile.',
    all:'Tutti', match:'corrispondenza', ingredientSingular:'ingrediente', ingredientPlural:'ingredienti', atHomeLower:'a casa', available:'disponibili', recipeSingular:'ricetta', recipePlural:'ricette', ranked:'ordinate', itemSingular:'articolo', itemPlural:'articoli', from:'Da', manualItems:'+ articoli manuali', manualLower:'manuale', movedToPantry:'spostato in dispensa', recipeSaved:'Ricetta salvata', recipeDeleted:'Ricetta eliminata', backupExported:'Backup esportato', backupRestored:'Backup ripristinato',
    textSource:'Testo', webSource:'Web', photoSource:'Foto', pdfSource:'PDF', videoSource:'Video', manualSource:'Manuale', sharedSource:'Condiviso', servingsUpper:'PORZIONI', pasteFirst:'Incolla prima una ricetta', parsingText:'Analisi del testo…', parsedReview:'Ricetta analizzata — controlla prima di salvare', pasteLinkFirst:'Incolla prima un link', readingWebsite:'Lettura del sito…', websiteRead:'Sito letto — controlla la ricetta estratta', linkFailed:'Impossibile leggere il link. Scarica/condividi il file oppure incolla il testo della ricetta.', loadingPdf:'Caricamento lettore PDF…', loadingOcr:'Caricamento OCR…', sharedFailed:'Impossibile importare l’elemento condiviso', buildingBackup:'Creazione backup…', readingBackup:'Lettura backup…', restoreBackup:'Ripristinare il backup?', restoreBackupText:'Questo sostituirà le ricette, la dispensa e la lista della spesa attualmente salvate nell’app.', restore:'Ripristina', backupImportFailed:'Impossibile importare il backup', deleteRecipeQ:'Eliminare la ricetta?', deleteRecipeText:'e i relativi file sorgente salvati verranno eliminati da questo dispositivo.', deleteAllQ:'Eliminare tutti i dati dell’app?', deleteAllText:'Questo elimina definitivamente tutte le ricette, i file sorgente, la dispensa e la lista della spesa salvati in questo browser.', deleteEverything:'Elimina tutto', deletedAll:'Tutti i dati locali sono stati eliminati', browserInstall:'Usa il menu del browser → Installa app / Aggiungi alla schermata Home', appStartFailed:'Recipe Vault non si è avviata', noVideoText:'Non è stato rilevato testo di ricetta leggibile nei fotogrammi campionati. Aggiungi ingredienti e procedimento manualmente durante il controllo.', recipesSaved:'ricette salvate localmente.', storageUsed:'Archiviazione browser:', used:'usati', ofAbout:'su circa', ingredientsAdded:'ingredienti aggiunti', importingFirst:'Importazione del primo file', measurementsEyebrow:'MISURE', measurements:'Misure', measurementSystem:'Sistema di misura', measurementHelp:'Passa tra misure metriche e statunitensi. Le quantità originali importate restano salvate senza modifiche.', metric:'Metrico', usCustomary:'USA', measurementChanged:'Sistema di misura cambiato', approx:'circa'
  }
};
function t(key, vars={}) {
  const lang=state?.language || 'en';
  let out=(I18N[lang]&&I18N[lang][key]) || I18N.en[key] || key;
  for(const [k,v] of Object.entries(vars)) out=out.replaceAll(`{${k}}`,String(v));
  return out;
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
}

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
  const fastLanguage = localStorage.getItem('recipe-vault-language');
  if (['en','fi','it'].includes(fastLanguage)) state.language = fastLanguage;
  const fastMeasurements = localStorage.getItem('recipe-vault-measurements');
  if (['metric','us'].includes(fastMeasurements)) state.measurementSystem = fastMeasurements;
  if (!['metric','us'].includes(state.measurementSystem)) state.measurementSystem = 'metric';
  applyTheme();
  applyLanguage();
  renderAll();
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
  return ({recipes:t('recipes'),cook:t('cook'),import:t('import'),shopping:t('shopping'),settings:t('settings')})[page] || 'Recipe Vault';
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
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
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
  return raw.replace(/½/g,' 1/2').replace(/¼/g,' 1/4').replace(/¾/g,' 3/4').replace(/⅓/g,' 1/3').replace(/⅔/g,' 2/3').replace(/⅛/g,' 1/8').trim();
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
function parseIngredientLine(line) {
  let raw = String(line || '').replace(/^[-•*–—]\s*/, '').replace(/^\[Input\]\s*/i,'').trim();
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
  const range = qtyText.match(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)$/);
  let qty = range ? null : parseNumber(qtyText);
  return { kind:'ingredient', raw, qty, qtyText, unit, unitCanonical, name, optional: /\b(optional|to taste|halutessasi|valinnainen|maun mukaan|facoltativ[oa]|a piacere|quanto basta|q\.?b\.?)\b/i.test(raw) };
}
function ingredientToLine(i) {
  if (!i) return '';
  if (i.kind==='group') return `## ${i.name}`;
  const qty = i.qtyText || (Number.isFinite(i.qty) ? String(i.qty) : '');
  return [qty, i.unit, i.name].filter(Boolean).join(' ').trim();
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
function displayQty(item) {
  const converted=convertIngredientAmount(item);
  if(!converted) return formatQty(item);
  return `${converted.converted && converted.approx?'≈ ':''}${converted.text}`;
}
function displayIngredientLine(item) {
  if(!item) return '';
  if(item.kind==='group') return `## ${item.name}`;
  const q=displayQty(item);
  return [q==='—'?'':q,item.name].filter(Boolean).join(' ').trim();
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
  let cleaned=stripMarkdown(raw)
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-•]\s+/, '')
    .replace(/\s+/g,' ')
    .trim();
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
  return /^(add|mix|stir|heat|cook|bake|preheat|combine|whisk|fold|pour|place|season|serve|bring|simmer|boil|fry|roast|blend|chop|slice|beat|knead|spread|top|drain|rinse|marinate|refrigerate|chill|allow|let|scrape|cut|divide|cover|set|scald|lisaa|lisää|sekoita|kuumenna|keitä|keita|paista|esilämmitä|esilammita|yhdistä|yhdista|vatkaa|kaada|laita|mausta|tarjoile|hauduta|kiehauta|pilko|viipaloi|vaivaa|levitä|levita|valuta|huuhtele|marinoi|jäähdytä|jaahdyta|anna|jätä|jata|siivilöi|siiviloi|pyöräytä|pyorayta|pingota|pane|aggiungi|mescola|scalda|cuoci|inforna|preriscalda|unisci|sbatti|versa|metti|condisci|servi|porta|sobbolli|bollire|friggi|arrostisci|frulla|trita|affetta|impasta|stendi|scola|sciacqua|marina|raffredda|lascia|copri|dividi|taglia)/i.test(s);
}
function cleanStepLine(l='') {
  return String(l).replace(/^•\s*/, '').replace(/^\s*(?:step|vaihe|passaggio)?\s*\d+[.):\-]?\s*/i,'').trim();
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
  for(const entry of entries){
    const raw=entry.text.trim();
    const s=cleanStepLine(raw);
    if(!s || BOILERPLATE_RE.test(s) || headingType(s) || isMetadataLine(s) || looksLikeIngredientGroup(s) || looksLikeIngredient(s)) continue;
    const bullet=/^•\s*/.test(raw);
    const numbered=/^(?:\d+[.)]|step\s+\d|vaihe\s+\d|passaggio\s+\d)/i.test(raw.replace(/^•\s*/,''));
    const strongStart=bullet||numbered||/^(add|mix|stir|heat|cook|bake|preheat|combine|whisk|fold|pour|place|season|serve|bring|simmer|boil|fry|roast|blend|chop|slice|beat|knead|spread|top|drain|rinse|marinate|refrigerate|chill|allow|let|scrape|cut|divide|cover|set|scald|lisaa|lisää|sekoita|kuumenna|keitä|keita|paista|esilämmitä|esilammita|yhdistä|yhdista|vatkaa|kaada|laita|mausta|tarjoile|hauduta|kiehauta|pilko|viipaloi|vaivaa|levitä|levita|valuta|huuhtele|marinoi|jäähdytä|jaahdyta|anna|jätä|jata|siivilöi|siiviloi|pyöräytä|pyorayta|pingota|pane|aggiungi|mescola|scalda|cuoci|inforna|preriscalda|unisci|sbatti|versa|metti|condisci|servi|porta|sobbolli|bollire|friggi|arrostisci|frulla|trita|affetta|impasta|stendi|scola|sciacqua|marina|raffredda|lascia|copri|dividi|taglia)(?=\s|$|[,.])/i.test(s);
    if(strongStart){if(current)out.push(current);current=s;}
    else if(current){current+=' '+s;}
    else if(looksLikeStep(s)){current=s;}
  }
  if(current)out.push(current);
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

function extractMetadata(text='') {
  const result=[];
  const patterns=[
    ['Prep time',/(?:prep(?:aration)? time|valmistusaika|tempo di preparazione)\s*[:\-]?\s*([^\n|]{2,45})/i],
    ['Cook time',/(?:cook(?:ing)? time|paistoaika|kypsennysaika|tempo di cottura)\s*[:\-]?\s*([^\n|]{2,45})/i],
    ['Rest / rise',/(?:rest(?:ing)?(?: and rising)? time|kohotus(?:aika)?|lepoaika|riposo|lievitazione)\s*[:\-]?\s*([^\n|]{2,45})/i],
    ['Total time',/(?:total time|kokonaisaika|tempo totale)\s*[:\-]?\s*([^\n|]{2,45})/i]
  ];
  for(const [label,re] of patterns){
    const m=String(text).match(re);if(!m)continue;
    const value=m[1].trim();
    if(/^(annokset|servings|porzioni|persone)$/i.test(value))continue;
    result.push(`${label}: ${value}`);
  }
  const fin=String(text).match(/VALMISTUSAIKA\s+ANNOKSET[\s\n]+([^\n]{2,35}?)\s+(\d+\s+annosta)/i);
  if(fin && !result.some(x=>x.startsWith('Prep time')||x.startsWith('Valmistusaika'))) result.push(`Valmistusaika: ${fin[1].trim()}`);
  return result;
}
function extractServings(lines=[], text='') {
  for(const l of lines){
    let m=l.match(/^(?:servings?|yield)\s*[:\-]?\s*(.+)$/i); if(m) return m[1].trim().replace(/\s{2,}/g,' ');
    m=l.match(/^(?:porzioni?|dosi)\s*[:\-]?\s*(.+)$/i); if(m) return m[1].trim();
    m=l.match(/^(?:annokset|annoksia?)\s*[:\-]?\s*(\d+(?:\s*[-–]\s*\d+)?)/i); if(m) return m[1].trim();
    m=l.match(/\b(\d+(?:\s*[-–]\s*\d+)?)\s+(annosta|porzioni|persone)\b/i); if(m) return m[1].trim();
  }
  const m=String(text).match(/(?:serves?|servings?|yield|annoksia?|annosta|annos|riittää|riittaa|porzioni?|dosi|persone)\s*[:\-]?\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
  return m?.[1]||'';
}

function usefulNotesFromSections(lines, chosenStep) {
  const noteCandidates=collectSectionCandidates(lines,'notes');
  let chosen=pickBestCandidate(noteCandidates,c=>Math.min(c.entries.length,20)+(chosenStep&&c.start>chosenStep.start?4:0),chosenStep?.start??-1);
  if(!chosen) return [];
  return chosen.entries.map(x=>x.text.replace(/^•\s*/,'').trim()).filter(x=>x && x.length<350).slice(0,20);
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
  let title=(source.title||h1?.[1]?.trim()||titlePick?.l||'Untitled recipe').replace(/^(?:title\s*:\s*)/i,'').trim();
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

  const meta=extractMetadata(String(rawText));
  const explicitNotes=usefulNotesFromSections(lines,chosenStep);
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
  const notes=noteParts.join('\n').trim();
  const cleanText=stripMarkdown(String(rawText));
  const body=`${title}\n${cleanText}`;
  return {
    id: uid('recipe'), title:title.slice(0,160), category:inferCategory(body), tags:inferTags(body), servings:extractServings(lines,cleanText),
    ingredients, steps, notes, favorite:false,
    source:{type:source.type||'text',url:source.url||'',label:source.label||'',filename:source.filename||''},
    imageUrl, mediaId:source.mediaId||'',mediaType:source.mediaType||'',thumbnailId:source.thumbnailId||'',createdAt:Date.now(),updatedAt:Date.now()
  };
}

const TAXONOMY_I18N={
  fi:{Recipe:'Resepti',Dessert:'Jälkiruoka',Baking:'Leivonta',Breakfast:'Aamiainen',Soup:'Keitto',Pasta:'Pasta',Salad:'Salaatti',Drink:'Juoma',Sauce:'Kastike',Dinner:'Pääruoka',Italian:'Italialainen',Finnish:'Suomalainen',Mexican:'Meksikolainen',Indian:'Intialainen',Asian:'Aasialainen',Vegetarian:'Kasvis',Vegan:'Vegaaninen',Quick:'Nopea','High protein':'Proteiinipitoinen',Video:'Video',Instagram:'Instagram'},
  it:{Recipe:'Ricetta',Dessert:'Dolce',Baking:'Forno',Breakfast:'Colazione',Soup:'Zuppa',Pasta:'Pasta',Salad:'Insalata',Drink:'Bevanda',Sauce:'Salsa',Dinner:'Piatto principale',Italian:'Italiana',Finnish:'Finlandese',Mexican:'Messicana',Indian:'Indiana',Asian:'Asiatica',Vegetarian:'Vegetariana',Vegan:'Vegana',Quick:'Veloce','High protein':'Ricca di proteine',Video:'Video',Instagram:'Instagram'}
};
function displayTaxonomy(value=''){return TAXONOMY_I18N[state.language]?.[value]||value;}
function sourceDisplay(recipe) {
  const type=recipe.source?.type || 'manual';
  return ({text:t('textSource'),website:t('webSource'),image:t('photoSource'),pdf:t('pdfSource'),video:t('videoSource'),manual:t('manualSource'),shared:t('sharedSource')})[type] || sourceLabel(recipe);
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
  const filterText=f=>f==='All'?t('all'):f==='Favorites'?t('favorites'):({Text:t('textSource'),Web:t('webSource'),Photo:t('photoSource'),PDF:t('pdfSource'),Video:t('videoSource'),Manual:t('manualSource'),Shared:t('sharedSource')})[f]||displayTaxonomy(f);
  $('#recipeFilters').innerHTML = filters.map(f => `<button class="filter-chip ${state.activeRecipeFilter===f?'active':''}" data-filter="${escapeHtml(f)}">${escapeHtml(filterText(f))}</button>`).join('');
  $$('[data-filter]').forEach(b => b.onclick = () => { state.activeRecipeFilter=b.dataset.filter; saveState(); renderRecipeFilters(); renderRecipes(); });
}
function filteredRecipes() {
  const q = normalizeText($('#recipeSearch')?.value || '');
  const filter = state.activeRecipeFilter || 'All';
  let out = recipes.filter(r => {
    if (filter === 'Favorites' && !r.favorite) return false;
    if (filter !== 'All' && filter !== 'Favorites' && sourceLabel(r)!==filter && r.category!==filter) return false;
    if (!q) return true;
    const hay = normalizeText([r.title,r.category,(r.tags||[]).join(' '),(r.ingredients||[]).filter(i=>i.kind!=='group').map(i=>i.name).join(' '),r.notes].join(' '));
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
  const tags = [r.category, ...(r.tags||[])].filter(Boolean).slice(0,2).map(displayTaxonomy);
  return `<article class="recipe-card">
    ${match ? `<div class="match-badge">${Math.round(match.score*100)}% ${t('match')}</div>`:''}
    ${r.favorite ? `<button class="favorite-dot" data-fav="${r.id}" aria-label="Remove favorite">★</button>`:''}
    <button class="card-hit" data-recipe="${r.id}">
      ${img ? `<img class="recipe-thumb" src="${escapeHtml(img)}" alt="" loading="lazy">` : `<div class="recipe-thumb placeholder">⌑</div>`}
      <div class="recipe-card-body">
        <h3>${escapeHtml(r.title)}</h3>
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
  const required=(recipe.ingredients||[]).filter(i=>i.kind!=='group' && !i.optional && i.name);
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
  $('#matchSummary').textContent = `${available.length} ${available.length===1?t('ingredientSingular'):t('ingredientPlural')} ${t('available')} · ${recipes.length} ${recipes.length===1?t('recipeSingular'):t('recipePlural')} ${t('ranked')}`;
  bindRecipeCards($('#matchGrid'));
}

function renderPantry() {
  $('#pantryChips').innerHTML = state.pantry.map((x,i)=>`<span class="chip">${escapeHtml(x)}<button data-remove-pantry="${i}">×</button></span>`).join('') || `<span class="muted" style="font-size:12px">${escapeHtml(t('nothingSaved'))}</span>`;
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
  const ingUnit=ing.unitCanonical||canonicalUnit(ing.unit||'')||ing.unit||'';
  let existing = state.shopping.find(x => canonicalIngredient(x.name)===key && (x.unitCanonical||canonicalUnit(x.unit||'')||x.unit||'')===ingUnit && !x.checked);
  if (!existing && Number.isFinite(ing.qty)) {
    existing = state.shopping.find(x => {
      if(x.checked || canonicalIngredient(x.name)!==key || !Number.isFinite(x.qty)) return false;
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
    state.shopping.push({ id:uid('shop'), name:ing.name || ing.raw, qty:Number.isFinite(ing.qty)?ing.qty:null, qtyText:ing.qtyText||'', unit:ing.unit||'', unitCanonical:ingUnit, checked:false, manual, sources:sourceRecipeId?[sourceRecipeId]:[], createdAt:Date.now() });
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
    const sourceNames=(item.sources||[]).map(id=>recipes.find(r=>r.id===id)?.title).filter(Boolean);
    return `<div class="shopping-item ${item.checked?'checked':''}">
      <input class="shopping-check" type="checkbox" ${item.checked?'checked':''} data-shop-check="${item.id}" aria-label="Check ${escapeHtml(item.name)}">
      <div><div class="shopping-name">${escapeHtml(item.name)}</div><div class="shopping-sub">${shownQty?`<span>${escapeHtml(shownQty)}</span>`:''}${sourceNames.slice(0,2).map(n=>`<span>· ${escapeHtml(n)}</span>`).join('')}${item.manual?`<span>· ${escapeHtml(t('manualLower'))}</span>`:''}</div></div>
      <div class="shopping-actions"><button class="home-btn" data-shop-home="${item.id}" title="I have this at home">⌂</button><button data-shop-delete="${item.id}" title="Delete">×</button></div>
    </div>`;
  }).join('');
  $$('[data-shop-check]').forEach(b=>b.onchange=async()=>{const i=state.shopping.find(x=>x.id===b.dataset.shopCheck);if(i)i.checked=b.checked;await saveState();renderShopping();});
  $$('[data-shop-delete]').forEach(b=>b.onclick=async()=>{state.shopping=state.shopping.filter(x=>x.id!==b.dataset.shopDelete);await saveState();renderShopping();});
  $$('[data-shop-home]').forEach(b=>b.onclick=async()=>{const i=state.shopping.find(x=>x.id===b.dataset.shopHome);if(!i)return;addUniqueIngredient(state.pantry,i.name);state.shopping=state.shopping.filter(x=>x.id!==i.id);await saveState();renderShopping();renderPantry();renderMatches();toast(`${i.name} ${t('movedToPantry')}`);});
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
    if ((r.mediaType||'').startsWith('video/')) sourceMedia=`<div class="detail-section"><h3>${escapeHtml(t('originalVideo'))}</h3><video class="source-media" controls src="${escapeHtml(url)}"></video></div>`;
    if (r.mediaType==='application/pdf') sourceMedia=`<div class="detail-section"><h3>${escapeHtml(t('originalPdf'))}</h3><a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(t('openStoredPdf'))}</a></div>`;
  }
  $('#recipeDetail').innerHTML=`
    ${hero?`<img class="recipe-hero" src="${escapeHtml(hero)}" alt="">`:''}
    <div class="recipe-detail-body">
      <div class="eyebrow">${escapeHtml(sourceDisplay(r).toUpperCase())}${r.servings?` · ${escapeHtml(r.servings)} ${escapeHtml(t('servingsUpper'))}`:''}</div>
      <h2>${escapeHtml(r.title)}</h2>
      <div class="detail-tags">${[r.category,...(r.tags||[])].filter(Boolean).map(displayTaxonomy).map(x=>`<span class="mini-tag">${escapeHtml(x)}</span>`).join('')}</div>
      <div class="detail-actions"><button class="primary" id="detailShopBtn">${escapeHtml(t('addToShopping'))}</button><button class="secondary" id="detailPantryMatchBtn">${escapeHtml(t('checkWhatIHave'))}</button></div>
      <div class="detail-measurements"><span>${escapeHtml(t('measurements'))}</span><div class="language-switch" role="group"><button type="button" class="language-choice" data-measurement="metric">${escapeHtml(t('metric'))}</button><button type="button" class="language-choice" data-measurement="us">${escapeHtml(t('usCustomary'))}</button></div></div>
      <div class="detail-section"><h3>${escapeHtml(t('ingredients'))}</h3><ul class="ingredient-list">${(r.ingredients||[]).map(i=>i.kind==='group'?`<li class="ingredient-group"><strong>${escapeHtml(i.name)}</strong></li>`:`<li><span class="ingredient-qty">${escapeHtml(displayQty(i))}</span><span>${escapeHtml(i.name)}${i.optional?` <small class="muted">(${escapeHtml(t('optional'))})</small>`:''}</span></li>`).join('') || `<li class="muted">${escapeHtml(t('noIngredients'))}</li>`}</ul></div>
      <div class="detail-section"><h3>${escapeHtml(t('steps'))}</h3><ol class="step-list">${(r.steps||[]).map(s=>`<li>${escapeHtml(s)}</li>`).join('') || `<li class="muted">${escapeHtml(t('noSteps'))}</li>`}</ol></div>
      ${r.notes?`<div class="detail-section"><h3>${escapeHtml(t('notes'))}</h3><div class="muted" style="white-space:pre-wrap;line-height:1.5">${escapeHtml(r.notes)}</div></div>`:''}
      ${sourceMedia}
      ${r.source?.url?`<div class="detail-section"><h3>${escapeHtml(t('source'))}</h3><a class="source-link" href="${escapeHtml(r.source.url)}" target="_blank" rel="noopener">${escapeHtml(r.source.url)} ↗</a></div>`:''}
    </div>`;
  $('#detailShopBtn').onclick=()=>openShoppingPicker(r.id);
  $$('[data-measurement]', $('#recipeDetail')).forEach(btn=>{const active=btn.dataset.measurement===(state.measurementSystem||'metric');btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false');btn.onclick=()=>setMeasurementSystem(btn.dataset.measurement);});
  $('#detailPantryMatchBtn').onclick=()=>{ $('#recipeDialog').close(); state.available=[]; go('cook'); toast(state.language==='fi'?'Lisää mitä sinulla on tai käytä kotivarastoa':state.language==='it'?'Aggiungi ciò che hai o usa la dispensa salvata':'Add what you have, or use your saved pantry'); };
  if(!$('#recipeDialog').open) $('#recipeDialog').showModal();
}
function openShoppingPicker(recipeId) {
  const r=recipes.find(x=>x.id===recipeId); if(!r)return;
  pendingShoppingRecipeId=recipeId;
  $('#shoppingIngredientPicker').innerHTML=(r.ingredients||[]).map((i,idx)=>{
    if(i.kind==='group') return `<div class="picker-group">${escapeHtml(i.name)}</div>`;
    const home=fuzzyHas(state.pantry,i);
    return `<label class="picker-item"><input type="checkbox" data-pick-ingredient="${idx}" ${home?'':'checked'}><span><strong>${escapeHtml(displayIngredientLine(i))}</strong>${home?`<span class="at-home-badge">${escapeHtml(t('alreadyAtHome'))}</span>`:''}</span></label>`;
  }).join('') || `<p class="muted">${escapeHtml(t('noIngredientsAvailable'))}</p>`;
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
  $('#editorHeading').textContent=isNew?t('reviewRecipe'):t('editRecipe');
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
  if(!text){toast(t('pasteFirst'));return;}
  setStatus(t('parsingText'));
  const recipe=parseRecipeText(text,{type:'text'});
  setStatus(t('parsedReview'),false);
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
  if(!url){toast(t('pasteLinkFirst'));return;}
  if(!/^https?:\/\//i.test(url)) url='https://'+url;
  setStatus(t('readingWebsite'));
  try {
    const readable=await fetchReadableUrl(url);
    const host=new URL(url).hostname.replace(/^www\./,'');
    const recipe=parseRecipeText(readable,{type:'website',url,label:host});
    if (/instagram\.com$/i.test(host) || host.includes('instagram.com')) recipe.tags=[...new Set([...(recipe.tags||[]),'Instagram'])];
    setStatus(t('websiteRead'),false);
    openEditor(recipe,true);
  } catch(e) {
    setStatus('',false);
    toast(t('linkFailed'));
    console.error(e);
  }
}

async function loadPdfJs() {
  const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  return pdfjs;
}
async function extractPdf(file) {
  setStatus(t('loadingPdf'));
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
    if(!recipe.ingredients.length && !recipe.steps.length) recipe.notes=t('noVideoText');
    return recipe;
  }
  if(type==='text/plain'){
    const text=await file.text();return parseRecipeText(text,{...baseSource,type:'text'});
  }
  throw new Error(`Unsupported file type: ${type||file.name}`);
}
async function handleFiles(fileList) {
  const files=[...fileList];if(!files.length)return;
  if(files.length>1) toast(`${t('importingFirst')}; ${files.length-1} ${state.language==='fi'?'lisää seuraa':state.language==='it'?'altri seguiranno':'more will follow'}`);
  for(const file of files){
    try{
      const recipe=await processFile(file);
      setStatus(`${file.name} extracted — review before saving`,false);
      openEditor(recipe,true);
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

async function exportBackup() {
  setStatus(t('buildingBackup'));
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
  setStatus('',false);toast(t('backupExported'));
}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
async function dataUrlToBlob(dataUrl){const res=await fetch(dataUrl);return await res.blob();}
async function importBackup(file) {
  try{
    setStatus(t('readingBackup'));
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.recipes)) throw new Error('Invalid backup');
    const replace=await confirmAction(t('restoreBackup'),t('restoreBackupText'),t('restore'));
    if(!replace){setStatus('',false);return;}
    await Promise.all(['recipes','media','state'].map(idbClear));
    for(const r of data.recipes) await idbPut('recipes',r);
    if(Array.isArray(data.media)) for(const m of data.media){if(!m.data)continue;await idbPut('media',{id:m.id,type:m.type,name:m.name,createdAt:m.createdAt,blob:await dataUrlToBlob(m.data)});}
    state={...state,...(data.state||{})};await saveState();await loadAll();setStatus('',false);toast(t('backupRestored'));
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
    await saveRecipe(editorDraft);$('#editorDialog').close();setStatus('',false);go('recipes');toast(t('recipeSaved'));
  });
  $('#deleteRecipeBtn').onclick=async()=>{
    if(!editorDraft)return;
    if(await confirmAction(t('deleteRecipeQ'),`“${editorDraft.title}” ${t('deleteRecipeText')}`,t('delete'))){
      await deleteRecipeMedia(editorDraft);await idbDelete('recipes',editorDraft.id);recipes=recipes.filter(r=>r.id!==editorDraft.id);state.shopping=state.shopping.map(i=>({...i,sources:(i.sources||[]).filter(id=>id!==editorDraft.id)}));await saveState();$('#editorDialog').close();renderAll();toast(t('recipeDeleted'));
    }
  };
  $('#confirmShoppingAdd').onclick=async()=>{const r=recipes.find(x=>x.id===pendingShoppingRecipeId);if(!r)return;const selected=$$('[data-pick-ingredient]:checked').map(x=>Number(x.dataset.pickIngredient));selected.forEach(idx=>mergeShoppingIngredient(r.ingredients[idx],r.id,false));await saveState();$('#shoppingDialog').close();renderShopping();toast(`${selected.length} ${t('ingredientsAdded')}`);};

  $('#exportBtn').onclick=exportBackup;
  $('#importBackupInput').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);};
  $('#themeSelect').onchange=async e=>{state.theme=e.target.value;await saveState();applyTheme();};
  $$('[data-language]').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.language)));
  $$('[data-measurement]').forEach(btn=>btn.addEventListener('click',()=>setMeasurementSystem(btn.dataset.measurement)));
  document.addEventListener('change',e=>{if(e.target?.id==='languageSelect') setLanguage(e.target.value);});
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme();});
  $('#clearAllBtn').onclick=async()=>{if(await confirmAction(t('deleteAllQ'),t('deleteAllText'),t('deleteEverything'))){await Promise.all(['recipes','media','state','shared'].map(idbClear));state={pantry:[],available:[],shopping:[],theme:'system',language:state.language||'en',measurementSystem:state.measurementSystem||'metric',activeRecipeFilter:'All'};recipes=[];await saveState();applyTheme();applyLanguage();renderAll();toast(t('deletedAll'));}};

  $('#confirmCancel').onclick=()=>{$('#confirmDialog').close();confirmResolver?.(false);confirmResolver=null;};
  $('#confirmOk').onclick=()=>{$('#confirmDialog').close();confirmResolver?.(true);confirmResolver=null;};
  $('#confirmDialog').addEventListener('cancel',e=>{e.preventDefault();$('#confirmCancel').click();});

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('#installBtn').disabled=false;$('#installBtn').textContent=t('installApp');});
  $('#installBtn').onclick=async()=>{if(!deferredInstallPrompt){toast(t('browserInstall'));return;}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('#installBtn').disabled=true;};
}

async function init(){
  db=await openDb();
  bindEvents();
  await loadAll();
  const hash=location.hash.replace('#','');if(['cook','import','shopping','settings'].includes(hash))go(hash);else go('recipes');
  if('serviceWorker' in navigator){
    try{
      let refreshing=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(refreshing)return;
        refreshing=true;
        location.reload();
      });
      const reg=await navigator.serviceWorker.register('./sw.js?v=6',{updateViaCache:'none'});
      await reg.update().catch(()=>{});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});});
    }catch(e){console.warn('SW registration failed',e);}
  }
  if(matchMedia('(display-mode: standalone)').matches) $('#installBtn').textContent=t('installed');
  await handleSharedImport();
}

init().catch(err=>{console.error(err);toast(t('appStartFailed'));});
