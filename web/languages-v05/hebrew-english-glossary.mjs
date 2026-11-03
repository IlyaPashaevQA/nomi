// Display-only English glosses for older Hebrew cards that historically
// used a Hebrew-language explanation (or the word itself) as "meaning".
// This module is intentionally outside the content SHA-signed lexical catalog.
// Versioned editorial translation, NOT automatically approved spoken English.
export const HEBREW_GLOSS_REVISION='he-en-gloss-overlay-20261022-v1';

const rows=Object.freeze([
 ['he:פרח','פרח','flower'],
 ['he:מים','מים','water'],
 ['he:חצב','חצב','sea squill (autumn flower)'],
 ['he:עץ','עץ','tree'],
 ['he:ציפורים נודדות','ציפורים נודדות','migrating birds'],
 ['he:עלי שלכת','עלי שלכת','fallen autumn leaves'],
 ['he:עונת מעבר','עונת מעבר','transitional season'],
 ['he:סתוונית','סתוונית','autumn crocus'],
 ['he:נחליאלי','נחליאלי','wagtail (bird)'],
 ['he:להקת חסידות','להקת חסידות','flock of storks'],
 ['he:לבוש ארוך','לבוש ארוך','long-sleeved clothing'],
 ['he:חלזון השדה','חלזון השדה / שבלול','field snail / snail'],
 ['he:היורה','היורה','first autumn rain'],
 ['he:מורה','מורה','teacher'],
 ['he:כיתה','כיתה','classroom'],
 ['he:ילד','ילד','boy'],
 ['he:דג','דג','fish'],
 ['he:אתרוג','אתרוג','citron (etrog)'],
 ['he:הדס','הדס','myrtle branch'],
 ['he:ערבה','ערבה','willow branch'],
 ['he:לולב','לולב','palm frond (lulav)'],
 ['he:סכה','סכה','sukkah (festival booth)'],
 ['he:סכך','סכך','sukkah roof covering (s\u2019chach)'],
 ['he:פטיש','פטיש','hammer'],
 ['he:מסמר','מסמר','nail'],
 ['he:אמא','אמא','mother'],
 ['he:אבא','אבא','father'],
 ['he:ילדה','ילדה','girl'],
 ['he:בית','בית','house'],
 ['he:ספר','ספר','book'],
 ['he:קורא','קורא','reads (masculine)'],
 ['he:קוראת','קוראת','reads (feminine)'],
 ['he:כלב','כלב','dog'],
 ['he:חתול','חתול','cat'],
 ['he:ילקוט','ילקוט','schoolbag'],
 ['he:לחם','לחם','bread'],
 ['he:שותה','שותה','drinks (masculine)'],
].map(([wordId,target,english])=>Object.freeze({wordId,target,english,
  version:HEBREW_GLOSS_REVISION,approval:'editorial-text-only; English audio unapproved'})));

const map=new Map();
for(const row of rows){
 if(map.has(row.wordId)||!/^[\x20-\x7e\u2019]+$/.test(row.english))
   throw Error('Duplicate or invalid English gloss: '+row.wordId);
 map.set(row.wordId,row);
}
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0591-\u05c7]/g,'').trim();
const isEnglish=s=>/^[\u0000-\u007f\u2019\u2014]+$/.test(String(s||''))&&/[a-zA-Z]/.test(String(s||''));

export function englishHebrewGloss({id,target,meaning,translation}={}){
 const original=translation?.language==='en'&&isEnglish(translation.text)?translation.text:
  isEnglish(meaning)?meaning:null;
 if(original)return Object.freeze({text:original,source:'original',revision:null});
 const entry=map.get(id||'he:'+normalize(target));
 if(entry&&normalize(entry.target)===normalize(target))
  return Object.freeze({text:entry.english,source:'editorial-display',revision:HEBREW_GLOSS_REVISION});
 return null;
}
export function englishGlossWord(word){
 if(!word||word.language!=='he')return word;
 const row=englishHebrewGloss(word);
 if(!row)return {...word,missingEnglishGloss:true};
 if(row.source==='original'){
   if(word.translation?.language==='en'&&isEnglish(word.translation.text))return word;
   return {...word,translation:{text:row.text,language:'en'}};
 }
 const oldMeaning=word.meaning;
 return {...word,meaning:row.text,
  translation:{text:row.text,language:'en'},
  // Keep a non-English explanation available in its original language, but
  // never duplicate it with the English meaning or claim new audio.
  originalMeaning:oldMeaning,
  englishGlossRevision:row.revision};
}
export function englishGlossPacks(packs){
 if(!Array.isArray(packs))throw Error('Expected word packs');
 return packs.map(pack=>({...pack,words:(pack.words||[]).map(englishGlossWord)}));
}
export function englishGlossAudit(packs){
 const seen=new Map();
 for(const pack of packs||[])for(const word of pack.words||[])seen.set(word.id,word);
 const missing=[...seen.values()].filter(w=>!englishHebrewGloss(w));
 return {total:seen.size,missing:missing.map(w=>({id:w.id,target:w.target})),
  overlayCount:[...seen.values()].filter(w=>englishHebrewGloss(w)?.source==='editorial-display').length,
  sourceEnglishCount:[...seen.values()].filter(w=>englishHebrewGloss(w)?.source==='original').length};
}
export const HEBREW_ENGLISH_GLOSS_ENTRIES=rows;
