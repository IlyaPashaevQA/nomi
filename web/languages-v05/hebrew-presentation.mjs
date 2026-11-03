// Learner-facing Hebrew support. Keys/evidence retain source orthography.
export const HEBREW_READING_STAGE='pointed-default';
const pointed=new Map(Object.entries({
 'זכר':'זָכָר','נקבה':'נְקֵבָה','חג':'חַג','אתרוג':'אֶתְרוֹג','הדס':'הֲדַס','פטיש':'פַּטִּישׁ','מסמר':'מַסְמֵר','אורח':'אוֹרֵחַ','ערבה':'עֲרָבָה','אורחת':'אוֹרַחַת','שמחה':'שִׂמְחָה','סכה':'סֻכָּה','תורה':'תּוֹרָה','שרשרת':'שַׁרְשֶׁרֶת',
 'אמא':'אִמָּא','אבא':'אַבָּא','ילד':'יֶלֶד','ילדה':'יַלְדָּה','בית':'בַּיִת','ספר':'סֵפֶר','כיתה':'כִּתָּה','מורה':'מוֹרָה','תיק':'תִּיק','ילקוט':'יַלְקוּט','כדור':'כַּדּוּר',
 'כלב':'כֶּלֶב','חתול':'חָתוּל','דג':'דָּג','עץ':'עֵץ','פרח':'פֶּרַח','מים':'מַיִם','לחם':'לֶחֶם','קורא':'קוֹרֵא','קוראת':'קוֹרֵאת','שותה':'שׁוֹתֶה',
 'סועד':'סוֹעֵד','סועדת':'סוֹעֶדֶת','חוגג':'חוֹגֵג','חוגגת':'חוֹגֶגֶת','בונה':'בּוֹנֶה','מארח':'מְאָרֵחַ','מארחת':'מְאָרַחַת','אוכל':'אוֹכֵל','אוכלת':'אוֹכֶלֶת','יושב':'יוֹשֵׁב','יושבת':'יוֹשֶׁבֶת','שמח':'שָׂמֵחַ',
 'זכר או נקבה?':'זָכָר אוֹ נְקֵבָה?','מה הצורה בנקבה?':'מַהִי הַצּוּרָה בִּנְקֵבָה?','כתבי את צורת הרבים.':'כִּתְבִי אֶת צוּרַת הָרַבִּים.','כתבי את צורת היחיד.':'כִּתְבִי אֶת צוּרַת הַיָּחִיד.',
 'מה נתרגל היום?':'מָה נְתַרְגֵּל הַיּוֹם?',
 'מילים, משפטים ומספרים מהחומר שלך.':'מִלִּים, מִשְׁפָּטִים וּמִסְפָּרִים מֵהַחֹמֶר שֶׁלָּךְ.',
 'אפשר לעצור בכל רגע ולחזור לכאן.':'אֶפְשָׁר לַעֲצֹר בְּכָל רֶגַע וְלַחֲזֹר לְכָאן.',
 'התשובה שלך':'הַתְּשׁוּבָה שֶׁלָּךְ',
 'בודקים':'בּוֹדְקִים',
 'כתבי תשובה לפני שממשיכים.':'כִּתְבִי תְּשׁוּבָה לִפְנֵי שֶׁמַּמְשִׁיכִים.',
 'לחצי על המילים לפי הסדר. לחצי שוב על מילה כדי להחזיר אותה.':'לַחֲצִי עַל הַמִּלִּים לְפִי הַסֵּדֶר. לַחֲצִי שׁוּב עַל מִלָּה כְּדֵי לְהַחֲזִיר אוֹתָהּ.',
 'המשפט שלך':'הַמִּשְׁפָּט שֶׁלָּךְ',
 'כל הכבוד, סיימת!':'כָּל הַכָּבוֹד, סִיַּמְתְּ!',
 'איזו מילה דומה במשמעות?':'אֵיזוֹ מִלָּה דּוֹמָה בַּמַּשְׁמָעוּת?',
 'כתבי מילה הפוכה.':'כִּתְבִי מִלָּה הֲפוּכָה.',
 'סדרי את המילים למשפט.':'סַדְּרִי אֶת הַמִּלִּים לְמִשְׁפָּט.',
 'בחרי מילה להשלמת המשפט.':'בַּחֲרִי מִלָּה לְהַשְׁלָמַת הַמִּשְׁפָּט.',
 'איזה מספר מתאים למילים?':'אֵיזֶה מִסְפָּר מַתְאִים לַמִּלִּים?',
 'בחרי את הסימן המתאים.':'בַּחֲרִי אֶת הַסִּימָן הַמַּתְאִים.',
 'חשבי וכתבי את התשובה.':'חַשְּׁבִי וְכִתְבִי אֶת הַתְּשׁוּבָה.',
 'מילים ראשונות':'מִלִּים רִאשׁוֹנוֹת',
 'יחיד ורבים':'יָחִיד וְרַבִּים',
 'מילים דומות והפכים':'מִלִּים דּוֹמוֹת וַהֲפָכִים',
 'בונים משפטים':'בּוֹנִים מִשְׁפָּטִים',
 'מספרים והשוואה':'מִסְפָּרִים וְהַשְׁוָאָה',
 'מתרגלים חיבור':'מְתַרְגְּלִים חִבּוּר',
 'מתרגלים חיסור':'מְתַרְגְּלִים חִסּוּר',
 'סועדים':'סוֹעֲדִים',
 'סועדות':'סוֹעֲדוֹת',
 'חוגגים':'חוֹגְגִים',
 'חוגגות':'חוֹגְגוֹת',
 'מארחים':'מְאָרְחִים',
 'מארחות':'מְאָרְחוֹת',
 'אוכלים':'אוֹכְלִים',
 'אוכלות':'אוֹכְלוֹת',
 'יושבים':'יוֹשְׁבִים',
 'יושבות':'יוֹשְׁבוֹת',
 'שמחים':'שְׂמֵחִים',
 'שמחות':'שְׂמֵחוֹת',
 'חגים':'חַגִּים',
 'הדסים':'הֲדַסִּים',
 'מסמרים':'מַסְמְרִים',
 'שרשראות':'שַׁרְשְׁרָאוֹת',
 'ארוחה':'אֲרוּחָה',
 'סעודה':'סְעוּדָה',
 'עצובה':'עֲצוּבָה',
 'עומד':'עוֹמֵד',
 'קל':'קַל',
 'מעל':'מֵעַל',
 'מתחת':'מִתַּחַת',
 'כבד':'כָּבֵד',
 'ארוך':'אָרוֹךְ',
 'גדולה':'גְּדוֹלָה',
 'ארבעים':'אַרְבָּעִים',
 'קצר':'קָצָר',
 'קטנה':'קְטַנָּה',
 'קשוט':'קִשּׁוּט',
 'אושפיזין':'אוּשְׁפִּיזִין',
 'צהלה':'צָהֳלָה',
 'עטור':'עָטוּר',
 'אתרוגים':'אֶתְרוֹגִים',
 'אורחות':'אוֹרְחוֹת',
 'סכות':'סֻכּוֹת',
 'אורחים':'אוֹרְחִים',
 'אני':'אֲנִי',
 'במשך':'בְּמֶשֶׁךְ',
 'ימים':'יָמִים',
 'המון':'הֲמוֹן',
 'שלי':'שֶׁלִּי',
 'הילדים':'הַיְלָדִים',
 'על':'עַל',
 'את':'אֶת',
 'המינים':'הַמִּינִים',
 'סכך':'סְכָךְ',
 'לולב':'לוּלָב',
 'אסיף':'אָסִיף',
 'שלושים ואחת':'שְׁלוֹשִׁים וְאַחַת',
 'ארבעים ושמונה':'אַרְבָּעִים וּשְׁמוֹנֶה',
 'שישים ושבע':'שִׁשִּׁים וָשֶׁבַע',
 'שמונים וארבע':'שְׁמוֹנִים וְאַרְבַּע',
 'תשעים':'תִּשְׁעִים',
 'שלוש עשרה':'שְׁלוֹשׁ עֶשְׂרֵה',
 'ומשפחתי':'וּמִשְׁפַּחְתִּי',
 'בנינו':'בָּנִינוּ',
 'נחג':'נֶחְגָּג',
 'שבעה':'שִׁבְעָה',
 'הכנתי':'הֵכַנְתִּי',
 'קשוטים':'קִשּׁוּטִים',
 'לסכה':'לַסֻּכָּה',
 'למדו':'לָמְדוּ',
 'בכתה':'בַּכִּתָּה',
 'הבאתי':'הֵבֵאתִי',
 'ארבעת':'אַרְבַּעַת',
 'חג האסיף':'חַג הָאָסִיף',
 'חג סכות':'חַג סֻכּוֹת',
 'אני ומשפחתי בנינו סכה גדולה':'אֲנִי וּמִשְׁפַּחְתִּי בָּנִינוּ סֻכָּה גְּדוֹלָה',
 'סכות נחג במשך שבעה ימים':'סֻכּוֹת נֶחְגָּג בְּמֶשֶׁךְ שִׁבְעָה יָמִים',
 'הכנתי המון קשוטים לסכה שלי':'הֵכַנְתִּי הֲמוֹן קִשּׁוּטִים לַסֻּכָּה שֶׁלִּי',
 'הילדים למדו בכתה על אושפיזין':'הַיְלָדִים לָמְדוּ בַּכִּתָּה עַל אוּשְׁפִּיזִין',
 'הבאתי את ארבעת המינים לסכה':'הֵבֵאתִי אֶת אַרְבַּעַת הַמִּינִים לַסֻּכָּה',
 'ארבעת המינים':'אַרְבַּעַת הַמִּינִים',
 'מתארחים':'מִתְאָרְחִים','חג הסוכות':'חַג הַסֻּכּוֹת','בני ישראל':'בְּנֵי יִשְׂרָאֵל','ארבעה ימים':'אַרְבָּעָה יָמִים',
 'בני ישראל הלכו ___ שנה במדבר.':'בְּנֵי יִשְׂרָאֵל הָלְכוּ ___ שָׁנָה בַּמִּדְבָּר.',
 'ב___ נהוג לאכל ולעתים לישון.':'בַּ___ נָהוּג לֶאֱכֹל וּלְעִתִּים לִישׁוֹן.',
 '___ הוא הכסוי שמכסה את הסכה.':'___ הוּא הַכִּסּוּי שֶׁמְּכַסֶּה אֶת הַסֻּכָּה.',
 '___ הם: לולב, הדס, אתרוג וערבה.':'___ הֵם: לוּלָב, הֲדַס, אֶתְרוֹג וַעֲרָבָה.'
}));
export function pointedHebrew(value){return pointed.get(String(value))||String(value)}
export function hebrewReadingSupport(){return {stage:HEBREW_READING_STAGE,defaultPointed:true,temporaryHelp:false,unlockRequires:'verified-unpointed-reading-milestone'}}

export const HEBREW_PRESENTATION_REVISION='he-v05-root-nikud-r1';
const HEBREW_MARK=/[\u0591-\u05c7]/u;
const HEBREW_FINALS=Object.freeze({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'});
const rootLetter=value=>HEBREW_FINALS[value]||value;

export function hebrewGraphemeClusters(value){
 const source=String(value??'').normalize('NFC'),clusters=[];
 for(const ch of source){
  if(HEBREW_MARK.test(ch)&&clusters.length)clusters[clusters.length-1].text+=ch;
  else clusters.push({clusterId:'g'+clusters.length,text:ch});
 }
 return clusters.map(x=>{const chars=[...x.text],base=chars.find(ch=>!HEBREW_MARK.test(ch))||'',marks=chars.filter(ch=>HEBREW_MARK.test(ch));return Object.freeze({...x,base,marks:Object.freeze(marks),hasNikud:marks.length>0})});
}

export function hebrewPresentationModel(value,{rootPresentation=null}={}){
 const clusters=hebrewGraphemeClusters(value).map(x=>({...x,isRoot:false,radicalIndexes:[]}));
 const base={revision:HEBREW_PRESENTATION_REVISION,value:String(value??'').normalize('NFC'),clusters,rootState:'omitted-unreviewed',rootHighlighted:false};
 if(!rootPresentation||rootPresentation.status!=='reviewed')return base;
 const radicals=rootPresentation.radicals,clusterIds=rootPresentation.clusterIds;
 if(!Array.isArray(radicals)||!Array.isArray(clusterIds)||radicals.length!==clusterIds.length||!radicals.length)return {...base,rootState:'omitted-invalid-reviewed-mapping'};
 const byId=new Map(clusters.map(x=>[x.clusterId,x])),validated=[];
 for(let i=0;i<radicals.length;i++){
  const id=clusterIds[i],radical=String(radicals[i]??'').normalize('NFC');
  if(id===null){validated.push(null);continue}
  const cluster=byId.get(id);
  if(!cluster||!radical||rootLetter(cluster.base)!==rootLetter(radical))return {...base,rootState:'omitted-invalid-reviewed-mapping'};
  validated.push(cluster);
 }
 for(let i=0;i<validated.length;i++){const cluster=validated[i];if(cluster){cluster.isRoot=true;cluster.radicalIndexes.push(i)}}
 return {...base,rootState:'reviewed',rootHighlighted:clusters.some(x=>x.isRoot)};
}

export function mountHebrewPresentation(element,value,{rootPresentation=null}={}){
 if(!element)return hebrewPresentationModel(value,{rootPresentation});
 const model=hebrewPresentationModel(value,{rootPresentation});
 element.replaceChildren();
 element.dataset.presentationRevision=model.revision;
 element.dataset.rootState=model.rootState;
 for(const cluster of model.clusters){
  const span=document.createElement('span');
  span.className='hebrew-grapheme'+(cluster.isRoot?' hebrew-root-grapheme':'')+(cluster.hasNikud?' has-nikud':'');
  span.dataset.clusterId=cluster.clusterId;
  if(cluster.isRoot)span.dataset.radicalIndexes=cluster.radicalIndexes.join(',');
  span.textContent=cluster.text;
  element.append(span);
 }
 return model;
}
