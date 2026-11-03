// Shared English course teaching history, not a trusted skill/evidence system.
// Canonical course follows v0.5 en-child-l3; no new English storage namespace.
export const ENGLISH_TEACHING_SCHEMA=1;
export const ENGLISH_COURSE_ID='en-child-l3';
export const ENGLISH_TEACHING_COMPONENT='englishTeaching';
export const ENGLISH_TEACHING_REVISION='en-teaching-20261009-v1';
export const ENGLISH_LOCAL_KEY='nomi-english-teaching-v1:dasha';
export const NEW_WORDS_PER_SESSION=10;
export const TEMPORARY_NEW_WORD_CEILING=NEW_WORDS_PER_SESSION; // Deprecated export name.
const KINDS=new Set(['lesson-start','introduction','response','lesson-complete','lesson-checkpoint','word-reviewed']);
const STAGES=new Set(['start','intro','read-swatch','hear-swatch','en-he','he-en','picture-word','hear-picture','build-word','end']);
const idPattern=/^[a-z0-9][a-z0-9:_\-.]{1,99}$/i;
const isId=x=>typeof x==='string'&&idPattern.test(x);
const safeInt=x=>Number.isInteger(x)&&x>=0;
export const freshEnglishTeachingState=()=>({schema:ENGLISH_TEACHING_SCHEMA,courseId:ENGLISH_COURSE_ID,events:[]});

export function validateEnglishTeachingState(state){
 if(!state||state.schema!==1||state.courseId!==ENGLISH_COURSE_ID||!Array.isArray(state.events)||
   state.events.length>10000||Object.keys(state).some(k=>!['schema','courseId','events'].includes(k)))
   throw Error('Invalid English teaching history');
 const events=new Map(),attempts=new Map();
 for(const e of state.events){
  if(!e||e.schema!==1||e.courseId!==ENGLISH_COURSE_ID||e.revision!==ENGLISH_TEACHING_REVISION||
    !KINDS.has(e.kind)||!STAGES.has(e.stage)||!isId(e.eventId)||!isId(e.attemptId)||
    !isId(e.sessionId)||!isId(e.deviceId)||!isId(e.packId)||!isId(e.taskId)||
    !safeInt(e.at)||e.at<1600000000000||e.countsAsEvidence!==false||
    typeof e.completed!=='boolean'||typeof e.usedHint!=='boolean'||
    (e.correct!==null&&typeof e.correct!=='boolean'))
   throw Error('Malformed English teaching event');
  if(![null,''].includes(e.itemId)&&!/^en:[a-z-]+$/.test(e.itemId||''))
   throw Error('Invalid English learning item');
  if(e.runtime){
   const r=e.runtime;
   if(r.version!==1||r.scope!=='qa'||!Number.isFinite(r.elapsedMs)||r.elapsedMs<0||r.elapsedMs>600000||
    !['question','answer','card','between','done'].includes(r.phase)||
    !Array.isArray(r.pauses)||new Set(r.pauses).size!==r.pauses.length||
    r.pauses.some(p=>!['manual','hidden','home','technical'].includes(p))||
    !Number.isFinite(r.feedbackMs)||r.feedbackMs<0||r.feedbackMs>3000||
    (r.taskId!==null&&!isId(r.taskId))||
    (['question','answer','card'].includes(r.phase)&&r.taskId===null))
    throw Error('Invalid isolated lesson runtime');
  }
  if(e.runtime?.presentation){
   const p=e.runtime.presentation;
   if(p.taskId!==e.runtime.taskId||!isId(p.taskId)||p.mediaReady!==true||
     !Array.isArray(p.choices)||p.choices.length<2||p.choices.length>8||
     new Set(p.choices).size!==p.choices.length||p.choices.some(id=>!/^en:[a-z-]+$/.test(id))||
     !safeInt(p.promptPlays)||p.promptPlays>1000)throw Error('Invalid question presentation');
  }
  if(e.answerId!==undefined&&(!e.runtime||e.kind!=='response'||
    !e.runtime.presentation?.choices.includes(e.answerId)||
    e.correct!==(e.answerId===e.itemId)))throw Error('Invalid selected answer');
  if(e.kind==='word-reviewed'){
   if(e.stage!=='end'||!e.itemId||e.correct!==null||e.completed||e.runtime||
    e.qaReview?.scope!=='qa'||e.qaReview.outcome!=='restore'||
    typeof e.qaReview.note!=='string'||e.qaReview.note.trim().length<6||e.qaReview.note.length>1000)
    throw Error('Invalid QA word review');
  }else if(e.qaReview!==undefined)throw Error('Review payload on wrong event');
  if(e.kind==='lesson-checkpoint'&&(!e.runtime||e.stage!=='start'||e.itemId!==null||e.correct!==null||e.completed))
   throw Error('Invalid lesson checkpoint');
  if(e.kind==='lesson-start'){
   if(e.stage!=='start'||e.itemId!==null||e.completed!==false||e.correct!==null||
    !Array.isArray(e.tasks)||e.tasks.length<1||e.tasks.length>(e.runtime?100:30)||
    e.tasks.some(t=>!isId(t))||new Set(e.tasks).size!==e.tasks.length)
    throw Error('Malformed English lesson start');
  }else{
   if(Object.hasOwn(e,'tasks'))throw Error('English task list only belongs on start');
   if(e.kind==='lesson-complete'&&(e.stage!=='end'||e.itemId!==null||!e.completed||e.correct!==null))
    throw Error('Malformed English lesson completion');
   if(e.kind==='introduction'&&(!e.itemId||e.stage!=='intro'||e.correct!==null))
    throw Error('Malformed English word introduction');
   if(e.kind==='response'&&(!e.itemId||!['read-swatch','hear-swatch','en-he','he-en','picture-word','hear-picture','build-word'].includes(e.stage)||
     (e.correct===null&&e.completed)))throw Error('Malformed English response');
  }
  if(events.has(e.eventId))throw Error('Duplicate English event ID');
  if(attempts.has(e.attemptId))throw Error('Duplicate English attempt ID');
  events.set(e.eventId,e);attempts.set(e.attemptId,e);
 }
 return state;
}

export function mergeEnglishTeachingStates(a,b){
 validateEnglishTeachingState(a);validateEnglishTeachingState(b);
 const merged=new Map(),attempts=new Map();
 for(const event of [...a.events,...b.events]){
  const prior=merged.get(event.eventId);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(event))throw Error('Conflicting English teaching event');
  const previous=attempts.get(event.attemptId);
  if(previous&&previous.eventId!==event.eventId)throw Error('Conflicting English attempt ID');
  merged.set(event.eventId,event);attempts.set(event.attemptId,event);
 }
 return {schema:1,courseId:ENGLISH_COURSE_ID,
   events:[...merged.values()].sort((a,b)=>a.at-b.at||a.eventId.localeCompare(b.eventId))};
}

const uuid=()=>globalThis.crypto?.randomUUID?.()||('e-'+Date.now()+'-'+Math.random().toString(16).slice(2));
export function makeEnglishTeachingEvent({kind,stage,sessionId,deviceId,packId,taskId,itemId=null,
 completed=false,correct=null,usedHint=false,tasks=null,runtime=null,answerId=null,qaReview=null,at=Date.now(),idFn=uuid}){
 const event={schema:1,revision:ENGLISH_TEACHING_REVISION,eventId:idFn(),
  attemptId:idFn(),sessionId,deviceId,packId,taskId,itemId,kind,stage,
  completed,correct,usedHint,countsAsEvidence:false,at};
 if(kind==='lesson-start')event.tasks=[...(tasks||[])];
 if(runtime)event.runtime=structuredClone(runtime);
 if(answerId!==null)event.answerId=answerId;
 if(qaReview!==null)event.qaReview=structuredClone(qaReview);
 validateEnglishTeachingState({schema:1,courseId:ENGLISH_COURSE_ID,
  events:[{...event,courseId:ENGLISH_COURSE_ID}]});
 return {...event,courseId:ENGLISH_COURSE_ID};
}

export function englishIntroducedItems(state){
 validateEnglishTeachingState(state);
 return new Set(state.events.filter(e=>e.kind==='introduction'&&e.completed)
  .map(e=>e.itemId));
}

export function englishFamiliarItems(state,parentFamiliarity=null){
 const known=englishIntroducedItems(state);
 // Earlier guided/pilot routes deliberately omitted introductions. A recorded
 // completed correct answer establishes prior exposure, never mastery.
 for(const e of state.events)if(e.kind==='response'&&e.completed&&e.correct===true)
  known.add(e.itemId);
 if(parentFamiliarity!==null){
  const p=parentFamiliarity;
  if(p.schema!=='nomi-parent-familiarity-projection-v1'||p.learner!=='dasha'||
    typeof p.revision!=='string'||!Array.isArray(p.familiar)||p.countsAsMastery!==false||
    p.countsAsCorrect!==false||p.scoredEvidence!==false)
   throw Error('Invalid parent familiarity snapshot');
  for(const row of p.familiar){
   if(!['en','he'].includes(row.language)||typeof row.target!=='string'||
     row.learningObjectId!=='lexeme:'+row.language+':'+row.target)
    throw Error('Invalid parent familiar word');
   if(row.language==='en')known.add('en:'+row.target);
  }
 }
 return known;
}

export function englishRouteCompletion(state,packId,{requiredIntroItems=[]}={}){
 validateEnglishTeachingState(state);
 if(!state.events.some(e=>e.kind==='lesson-complete'&&e.packId===packId))return false;
 const introduced=englishIntroducedItems(state);
 return requiredIntroItems.every(id=>introduced.has(id));
}

export function resumeEnglishSession(state,packId=null){
 validateEnglishTeachingState(state);
 const starts=state.events.filter(e=>e.kind==='lesson-start'&&(!packId||e.packId===packId))
  .sort((a,b)=>b.at-a.at||b.eventId.localeCompare(a.eventId));
 // An older interrupted attempt must not revive after a newer successfully
 // completed session for that same pack. Other unfinished packs stay resumable.
 const completions=new Map();
 for(const e of state.events.filter(e=>e.kind==='lesson-complete')){
  const previous=completions.get(e.packId)||0;
  if(e.at>previous)completions.set(e.packId,e.at);
 }
 for(const start of starts){
  if((completions.get(start.packId)||0)>=start.at)continue;
  if(state.events.some(e=>e.sessionId===start.sessionId&&e.kind==='lesson-complete'))continue;
  const events=state.events.filter(e=>e.sessionId===start.sessionId&&e.completed&&
    (e.kind==='introduction'||e.kind==='response'));
  const finished=new Set(events.map(e=>e.taskId));
  if(start.runtime){
   const latest=state.events.filter(e=>e.sessionId===start.sessionId&&e.runtime)
    .sort((a,b)=>a.at-b.at||a.eventId.localeCompare(b.eventId)).at(-1);
   const runtime=structuredClone(latest.runtime);
   return {sessionId:start.sessionId,packId:start.packId,nextTaskId:runtime.taskId,
    readyToFinish:runtime.phase==='done',completedTaskIds:finished,start,runtime};
  }
  const next=start.tasks.find(id=>!finished.has(id));
  return {sessionId:start.sessionId,packId:start.packId,nextTaskId:next||null,
   readyToFinish:!next,completedTaskIds:finished,start};
 }
 return null;
}
const israelDay=timestamp=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jerusalem',year:'numeric',
   month:'2-digit',day:'2-digit'}).formatToParts(timestamp);
 const m=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return m.year+'-'+m.month+'-'+m.day;
};
export function introductionsOnIsraelDay({englishState,hebrewEnvelope=null,at=Date.now()}={}){
 validateEnglishTeachingState(englishState);
 const day=israelDay(at),seen=new Set();
 const inDay=e=>safeInt(e?.at)&&israelDay(e.at)===day;
 // A repeated legacy introduction on another day is not a new word.
 // Count the first completed introduction, independent of event array order.
 const first=new Map();
 for(const e of englishState.events){
  if(e.kind!=='introduction'||!e.completed)continue;
  const previous=first.get(e.itemId);
  if(!previous||e.at<previous.at)first.set(e.itemId,e);
 }
 for(const e of first.values())if(inDay(e))seen.add(e.itemId);
 if(hebrewEnvelope&&typeof hebrewEnvelope==='object'){
  for(const e of hebrewEnvelope.alpha20?.events||[]){
   if(inDay(e)&&e.mechanic==='intro'&&e.completed===true)
    for(const target of e.targets||[])if(typeof target==='string')seen.add('he:'+target);
  }
  for(const e of hebrewEnvelope.autumn1?.events||[]){
   if(inDay(e)&&e.stage==='introduce'&&e.completed===true&&typeof e.targetId==='string')
    seen.add('he-autumn:'+e.targetId);
  }
 }
 return seen;
}
export function englishSessionBudget({englishState,sessionId=null,
 ceiling=NEW_WORDS_PER_SESSION}={}){
 if(!safeInt(ceiling)||ceiling>30)throw Error('Invalid session introduction ceiling');
 validateEnglishTeachingState(englishState);
 const english=new Set(englishState.events.filter(e=>
  sessionId!==null&&e.sessionId===sessionId&&e.kind==='introduction'&&e.completed===true
 ).map(e=>e.itemId));
 return {sessionId,ceiling,used:english.size,
  remaining:Math.max(0,ceiling-english.size),introducedIds:english};
}

// Compatibility API for the older store adapter that is still covered by the
// unified Hub preflight. New lesson code must use englishSessionBudget instead.
export function englishDailyBudget({englishState,hebrewEnvelope,at=Date.now(),
 ceiling=5}={}){
 if(!safeInt(ceiling)||ceiling>30)throw Error('Invalid daily introduction ceiling');
 if(hebrewEnvelope===undefined)throw Error('Daily budget requires shared-language snapshot');
 const observed=introductionsOnIsraelDay({englishState,hebrewEnvelope,at});
 const english=new Set([...observed].filter(key=>key.startsWith('en:')));
 return {date:israelDay(at),ceiling,used:english.size,
  remaining:Math.max(0,ceiling-english.size),introducedIds:english};
}

// Candidate contents may be authored before approval. The learner adapter must
// validate release status separately before mounting a real Dasha session.
export function buildEnglishColourTasks(items,{packId='colours-a',introIds=[],reviewIds=[]}={}){
 if(!Array.isArray(items)||items.length!==8)throw Error('Invalid English colours');
 const set=new Set(items.map(i=>i.id));
 const ids=[...introIds,...reviewIds];
 if(ids.length<1||ids.length>5||new Set(ids).size!==ids.length||ids.some(x=>!set.has(x)))
  throw Error('Unknown or repeated English colour');
 const intros=introIds.map(id=>({id:'intro:en:'+id,kind:'introduction',itemId:'en:'+id,stage:'intro'}));
 const practice=ids.map((id,index)=>({id:'practice:'+packId+':'+id+':'+index,
   kind:'response',itemId:'en:'+id,stage:['read-swatch','hear-swatch','en-he','he-en','read-swatch'][index]}));
 return [...intros,...practice];
}
