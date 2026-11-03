import {READING_DAILY_MAX,readingReviewDueAt,isReadingComprehensionAttempt} from './reading-unit-catalog.mjs';
// Content adapter for an admitted ReadingUnit. Selection uses the SAME daily
// vocabulary engine; no pack-local progression, timer, journal or mastery.
import {hebrewDailyTask} from './hebrew-pack-catalog.mjs';

export function chooseReadingPreparation({plan,events,unit,words,ordinaryAvailable=true,introductionOnly=false,now=Date.now()}){
 if(plan?.status!=='active'||!plan.readingUnits?.some(x=>x.id===unit.id&&x.version===unit.version))return null;
 const history=events.filter(e=>e.completed===true);
 const current=history.filter(e=>e.sessionId===plan.sessionId);
 const own=e=>e?.detail?.readingRef===unit.id&&unit.historyVersions.includes(e.detail.readingVersion);
 // Share the lesson with ordinary words, number forms and sentence tasks.
 const seen=new Set(history.filter(e=>own(e)&&e.detail.kind==='card').flatMap(e=>e.detail.unitIds||[]));
 const use=w=>current.filter(e=>own(e)&&e.detail.kind!=='card'&&e.detail.unitIds?.includes(w.unitId)).length;
 const pool=words.filter(w=>use(w)<3);
 
 const projected=history.flatMap(e=>{
  const q=unit.tasks.find(q=>q.id===e.detail?.questionId);
  if(!own(e)||e.detail.readingVersion!==unit.version||q?.kind!=='word')return [];
  const w=words.find(w=>w.id===q.cardId);
  return w?[{...e,mechanic:q.stage,targets:[w.target]}]:[];
 });
 // A source family introduction admits its forms for practice; no successes
 // or production knowledge are propagated between those forms.
 for(const w of words)if(seen.has(w.unitId))projected.push({
  mechanic:'intro',completed:true,correct:null,assisted:true,targets:[w.target]
 });
 const refs=pool.map(w=>({wordId:w.id,contentSha256:w.contentSha256}));
 const intro=pool.find(w=>!seen.has(w.unitId));
  if(introductionOnly)return intro?unit.tasks.find(q=>q.kind==='card'&&q.cardId===intro.id)||null:null;
  if(ordinaryAvailable&&own(current.at(-1)))return null;
 const p={...plan,plan:refs,introIds:intro?[intro.id]:[]};
 const candidate=pool.length?hebrewDailyTask(p,pool,projected,{remainingNew:intro?1:0,now}):null;
 if(candidate?.mechanic==='intro')return unit.tasks.find(q=>q.kind==='card'&&q.cardId===candidate.contentAccess.wordId)||null;
 const lastReading=current.filter(e=>own(e)&&['phrase','sentence','sequence','number','choice'].includes(e.detail.kind)).at(-1);
 const ordinarySince=current.filter(e=>e.at>(lastReading?.at||0)&&!own(e)&&e.mechanic!=='intro'&&typeof e.correct==='boolean').length;
 if(ordinarySince>=4){
  const readAt=Math.max(0,...history.filter(e=>e.taskId===unit.readTaskId&&e.courseRevision===unit.readyVersion).map(e=>e.at||0));
  const read=readAt>0;
  const readingRoom=current.filter(isReadingComprehensionAttempt).length<READING_DAILY_MAX;
  const practice=unit.tasks.filter(q=>!['word','card'].includes(q.kind)&&(q.phase!=='after-reading'||read)&&
   (!['choice','sequence'].includes(q.kind)||readingRoom)&&q.requiredUnits.every(id=>seen.has(id))&&q.unitIds.every(id=>current.filter(e=>own(e)&&e.detail.kind!=='card'&&e.detail.unitIds?.includes(id)).length<3));
  const recent=q=>history.filter(e=>own(e)&&e.detail.questionId===q.id);
  const allowed=practice.filter(q=>{
   const rows=recent(q),latest=rows.at(-1);
   return !latest||latest.sessionId!==plan.sessionId&&readingReviewDueAt(latest,readAt)<=now;
  }).sort((a,b)=>recent(a).length-recent(b).length||unit.tasks.indexOf(a)-unit.tasks.indexOf(b));
  if(allowed.length)return allowed[0];
 }
 if(!candidate)return null;
 return unit.tasks.find(q=>q.kind==='word'&&q.cardId===candidate.contentAccess.wordId&&q.stage===candidate.mechanic)||null;
}

// Only presentation fields for the child. The accepted editorial record stays
// intact and remains available to the parent review screen.
export function readingCardAsset(c){
 return {language:'he',target:c.pointed,displayTarget:c.pointed,choiceKey:c.id,
  learningObjectId:c.learningObjectId,sourceFormId:c.id,
  image:c.image,meaning:c.meaningEn,audioSrc:c.audioSrc,audioText:c.audioText,
  audioSha256:c.audioSha256,rootPresentation:c.rootPresentation,
  translation:{text:c.meaningEn,language:'en'},
  semanticAnchor:{text:c.semanticAnchor.text,highlight:c.semanticAnchor.highlight,
   audioSrc:c.semanticAnchor.audioSrc}};
}
