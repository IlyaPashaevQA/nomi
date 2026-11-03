// Hebrew learned status for practice scheduling (NOT a new learner store).
// Parent approves 29 lexical items; exact content SHA is pinned separately.
// Old scored answers remain immutable. Later errors reactivate practice.
export const PARENT_KNOWN_REVIEW_AT=Date.parse('2026-10-22T21:23:00+03:00');
export const HEBREW_KNOWLEDGE_REVIEW_DAY_MS=86400000;
export const PARENT_KNOWN_WORD_VERSIONS=Object.freeze({"פרח": "8d941d42f6cbe509928301f1bd754605902feb2a7174e82df439a2401d557815", "לחם": "4b0ab3b693a0453b50a8119e3a691647f1229a7f562f4ada8ad57e2b0cc64091", "חתול": "ba155e6a8eae6071fdfc5a7ee9620454635edc20de6d542e26e685ce873d0d10", "ילקוט": "63df5783a619b81c5f705d07f803f5c5684589388292e047a766c9f279f3067a", "כדור": "7b854094f3f6a5649a2d350af2f6673bfe2af2aedc810e3b3d1cfb33540b151f", "כלב": "6c9bc6293d80d142ccbaf8dc6a6d0a9fb560b86b1421784e55d4ff296e479029", "אמא": "2a1679e8388cb137380ffa01073260a1edd727b5d9a04d31921b4dc3c01cee07", "כיתה": "2b3fad097b2b540145a290269ffaebe101c5125200832745860547dfe9c3d98c", "ספר": "92e089cfa4b36da28a78ea753dea86c2ed51cf67252c29d770830d417a35e73c", "אבא": "9a6735686aa4c500333f9e3d1a4c5055496ae6b0520775c61735bcedef76dd3f", "דג": "3e3a816261468c65170794ed8bd4b1887706d073733cabace70ca9a4bcc09a5f", "עץ": "6b0c32cb0196d1cfb9331583294b5733764caeb7a2d3a197baf18940a02ba4d6", "ילד": "b57d2bca2ac1e7d02c25d36e722d7f1cfa6ac1157010bf7914ecc088eee759a9", "בית": "848bf9f14945c0d18aa1845a9dc3bdab21c76bf4790a5c14fbab94aac99f41e3", "ילדה": "24ecc529588fbf7b052b89122ec9ba3324faf3ed46230b661788f5617c6917aa", "פטיש": "c4044ac229fefdc9c74cacf79040515b11cbcd69894ba3d20773b336c9dfcb3e", "סכך": "ae32373da23c75b221d909f3d4ed55baa5c7b9bd14fb5647728591b2bc191692", "מים": "8690d5515c932da2d29c8c18c167dabb40739dd20b63d27d3378bad6a54d17c6", "מורה": null, "קורא": "0c3bd37fa3fa823de137d77e2fc33090f32379fd956f8f13f9169fb2ede85a48", "קוראת": "fb09ad3a4f59568b5e94226572812d45bd96294d800c14def54c34687e28ecd9", "שותה": "58c89ebb19bcfc06cb1ea5f7c83d25d13f4cc11d7650431afe13780eb0a60556", "משקפיים": "b403a36cc63062df2f61d0f643314e1533bbeca3984c3dce9a86b8cf6f3f2f32", "אח": "8352e6e26bc71e100eec8bb171d188e89c6db8282090c20957ac8e67ceda0355", "אחות": "f59996a97b6ff67897651145ebf965b5836c93fcd7c68cc5e43a2f4ae71e7a34", "כיס": "c045a1fdd9cf3c7499b85654a272b1cda5edac034a5d4cb5ef296f8cd261e42d", "מעיל": "7f46a910e03469712eb979894188212f0d93fcf21e87ab2a7f2fa4aaf9f6b5ad", "צמות": "0b695c9ed40b733b08e0798abcc57766910c9035deb782b816cf14f0e808b63d", "תלתלים": "d36b464f358c5a8f085b474e21fdef74a02f30b543be77a771e91fdde91e03e2"});
const stages=new Set(['audio-word','audio-picture','meaning-picture','picture-word','constructor']);
const stable=e=>e.correct===true&&e.assisted!==true;
export function hebrewWordKnowledge(word,events=[],now=Date.now()){
 if(!word?.target||!Array.isArray(events)||!Number.isFinite(now))
  return {level:'learning',learned:false,dueAt:null};
 const reviewedHash=PARENT_KNOWN_WORD_VERSIONS[word.target];
 const parentPinned=!!reviewedHash&&reviewedHash===word.contentSha256;
 const graded=events.filter(e=>e&&e.targets?.length===1&&e.targets[0]===word.target&&
    !e.detail?.wordForm&&e.detail?.mode!=='noun-number'&&stages.has(e.mechanic)&&e.completed===true&&typeof e.correct==='boolean'&&
    (!e.detail?.contentAccess?.contentSha256||
     e.detail.contentAccess.contentSha256===word.contentSha256))
  .sort((a,b)=>a.at-b.at||String(a.eventId||'').localeCompare(String(b.eventId||'')));
 // Replay the acquisition/review timeline. Early practice cannot move a due
 // date, and a later error always invalidates the earlier learned state.
 const declared=word.declaredKnowledge;
 const selfPinned=declared?.subject==='ilia'&&declared.actor==='ilia'&&declared.status==='learned'&&
  declared.wordId===(word.id||word.wordId)&&declared.contentSha256===word.contentSha256&&
  Number.isSafeInteger(declared.at)&&declared.at>0&&declared.at<=now;
 const baselineAt=selfPinned?declared.at:parentPinned?PARENT_KNOWN_REVIEW_AT:0;
 let learned=parentPinned||selfPinned,sinceAt=baselineAt;
 let days=7,dueAt=learned?sinceAt+days*HEBREW_KNOWLEDGE_REVIEW_DAY_MS:null;
 let streak=0,lastError=null;
 for(const e of graded){
  if(e.at>now||(parentPinned||selfPinned)&&e.at<=baselineAt)continue;
  if(e.correct===false){learned=false;streak=0;dueAt=null;lastError=e;continue}
  if(!learned){
   streak=stable(e)?streak+1:0;
   if(streak===3){learned=true;sinceAt=e.at;days=7;dueAt=sinceAt+days*HEBREW_KNOWLEDGE_REVIEW_DAY_MS}
  }else if(stable(e)&&e.at>=dueAt){
   sinceAt=e.at;days=days===7?14:30;dueAt=sinceAt+days*HEBREW_KNOWLEDGE_REVIEW_DAY_MS;
  }
 }
 if(!learned)return {level:'learning',learned:false,dueAt:null,
  reason:lastError?'new-error-after-learned':'not-yet-confirmed',parentConfirmed:parentPinned};
 return {level:now>=dueAt?'due-review':'learned',learned:true,dueAt,
  intervalDays:days,acquiredOrReviewedAt:sinceAt,parentConfirmed:parentPinned,
  ownerDeclaredLearned:selfPinned,reason:selfPinned?'owner-declared-from-dasha':parentPinned?'parent-confirmed':'three-successes'};
}
// Russian meaning has its own version-bound evidence and review clock.
export function hebrewMeaningKnowledge(word,events=[],now=Date.now()){
 const audio=word?.russianMeaningAudio;
 if(audio?.status!=='ready')return {level:'unavailable',learned:false,dueAt:null};
 const graded=events.filter(e=>{
  const d=e?.detail?.meaningDirection,s=d?.source;
  return e.completed===true&&e.mechanic==='ru-meaning-word'&&typeof e.correct==='boolean'&&
   e.detail?.contentAccess?.wordId===word.id&&e.detail.contentAccess.contentSha256===word.contentSha256&&
   d?.channel==='spoken-ru-meaning-to-written-he'&&d.target===word.target&&d.correct===e.correct&&
   s?.src===audio.src&&s.sha256===audio.sha256&&s.version===audio.version;
 }).sort((a,b)=>a.at-b.at);
 let streak=0,learned=false,dueAt=null,days=7;const sessions=new Set();
 for(const e of graded){
  if(e.at>now)continue;
  if(e.correct===false){streak=0;learned=false;dueAt=null;sessions.clear();continue}
  if(e.assisted===true||sessions.has(e.sessionId))continue;
  sessions.add(e.sessionId);
  if(!learned&&++streak>=3){learned=true;dueAt=e.at+days*HEBREW_KNOWLEDGE_REVIEW_DAY_MS}
  else if(learned&&e.at>=dueAt){days=days===7?14:30;dueAt=e.at+days*HEBREW_KNOWLEDGE_REVIEW_DAY_MS}
 }
 return {level:learned?(now>=dueAt?'due-review':'learned'):'learning',learned,dueAt};
}
export function shouldPracticeHebrewWord(word,events=[],now=Date.now()){
 if(word?.packId==='torah-chumashim-phrase')return false;
 return hebrewWordKnowledge(word,events,now).level!=='learned'||word?.russianMeaningAudio?.status==='ready'&&hebrewMeaningKnowledge(word,events,now).level!=='learned';
}
