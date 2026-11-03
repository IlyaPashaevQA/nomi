// Shared English Colours teaching controller. QA and future authorized learner
// runtime call the same state machine with different store capabilities.
import {
 englishSessionBudget,englishIntroducedItems,englishFamiliarItems,englishRouteCompletion,
 resumeEnglishSession,buildEnglishColourTasks,makeEnglishTeachingEvent,
 validateEnglishTeachingState,TEMPORARY_NEW_WORD_CEILING,
} from './english-teaching-model.mjs';
import {createLanguageDailyPlan} from './language-daily-queue.mjs';
import {initialSimpleSpacing,applySimpleSpacing,MEMORY_DAY_MS} from './memory.mjs';

export const ENGLISH_COLOUR_LESSONS=Object.freeze([
 Object.freeze({packId:'en-colours-a',label:'Colours · first five',
  newItems:Object.freeze(['black','white','brown','grey','red']),
  reviews:Object.freeze([])}),
 Object.freeze({packId:'en-colours-b',label:'Colours · three more',
  newItems:Object.freeze(['blue','green','yellow']),
  reviews:Object.freeze(['black','white'])}),
]);

export const ENGLISH_SCHOOL_LESSONS=Object.freeze([
 Object.freeze({packId:'en-school-b-20261019',label:'B b · 19.10.2026',
  newItems:Object.freeze(['banana','balloon','baby','ball','bag']),reviews:Object.freeze([])}),
]);
export const ENGLISH_COLOUR_ADDITIONS=Object.freeze({packId:'en-colours-c',groupId:'en:colours',newItems:Object.freeze(['orange','pink','purple']),reviews:Object.freeze([])});
const ENGLISH_LESSONS=Object.freeze([...ENGLISH_COLOUR_LESSONS,...ENGLISH_SCHOOL_LESSONS,ENGLISH_COLOUR_ADDITIONS]);
export const ENGLISH_SCHOOL_STAGES=Object.freeze(['picture-word','hear-picture','build-word']);
export function buildEnglishSchoolTasks(items,{packId,introIds=[],reviewIds=[]}={}){
 const pack=ENGLISH_SCHOOL_LESSONS.find(p=>p.packId===packId);
 const ids=[...introIds,...reviewIds];
 if(!pack||!Array.isArray(items)||new Set(items.map(i=>i.id)).size!==items.length||
  !ids.length||ids.length>5||new Set(ids).size!==ids.length||
  ids.some(id=>!pack.newItems.includes(id)||!items.some(i=>i.id===id)))
  throw Error('Invalid school English targets');
 const tasks=introIds.map(id=>({id:'intro:en:'+id,kind:'introduction',itemId:'en:'+id,stage:'intro'}));
 for(const [round,stage] of ENGLISH_SCHOOL_STAGES.entries()){
  const offset=(round*2)%ids.length,order=[...ids.slice(offset),...ids.slice(0,offset)];
  for(const id of order)tasks.push({id:'school:'+packId+':'+id+':'+stage,
   kind:'response',itemId:'en:'+id,stage});
 }
 return tasks;
}
const buildEnglishLessonTasks=(items,options)=>ENGLISH_SCHOOL_LESSONS.some(p=>p.packId===options.packId)
 ?buildEnglishSchoolTasks(items,options):buildEnglishColourTasks(items,options);


export const ENGLISH_SESSION_MS=10*60*1000;

// Active-time accounting shared by the existing HE and EN controllers.
// Content selection, identity and persistence stay with their current stores.
export function createActiveLessonClock({readPending,monotonicNow=()=>globalThis.performance.now(),durationMs=600000}={}){
 if(typeof readPending!=='function'||typeof monotonicNow!=='function'||!Number.isFinite(durationMs)||durationMs<=0)throw Error('Invalid lesson clock');
 let clock=null,anchor=monotonicNow();
 const adopt=(value,sessionId)=>{
  clock={sessionId,value:structuredClone(value)};anchor=monotonicNow();
 };
 const current=()=>{
  const p=readPending();
  if(!p?.runtime){clock=null;return null}
  if(clock?.sessionId!==p.sessionId||p.runtime.revision!==undefined&&clock.value.revision!==p.runtime.revision)adopt(p.runtime,p.sessionId);
  const now=monotonicNow(),delta=Math.max(0,now-anchor);anchor=now;
  if(!clock.value.pauses.length){
   clock.value.elapsedMs=Math.min(durationMs,clock.value.elapsedMs+delta);
   if(clock.value.phase==='card')clock.value.feedbackMs=Math.min(3000,clock.value.feedbackMs+delta);
  }
  return structuredClone(clock.value);
 };
 return Object.freeze({current,adopt,reset(){clock=null;anchor=monotonicNow()}});
}
export function afterLessonFeedback(runtime,correct){
 return {...runtime,phase:correct?'between':'card',feedbackMs:0};
}

const dailyId=/^daily:en:([a-z-]+):(picture-word|hear-picture|build-word|read-swatch|hear-swatch|en-he|he-en):([0-9]+)$/;
// Existing mechanics, selected by content capability; no pack-specific rounds.
export function englishPracticePool(items,ids){
 const eligible=items.filter(i=>ids.includes(i.id));
 return eligible.flatMap(item=>{
  const visual=item.image?'picture-word':item.color?'read-swatch':null;
  const kinds=[];
  if(visual&&eligible.filter(i=>i.image||i.color).length>=2)kinds.push(visual);
  if(item.audio&&visual&&eligible.filter(i=>i.image||i.color).length>=2)
   kinds.push(item.image?'hear-picture':'hear-swatch');
  if(/^[a-z]+$/.test(item.english||''))kinds.push('build-word');
  return kinds.map(stage=>({id:'daily:en:'+item.id+':'+stage+':0',kind:'response',
   itemId:'en:'+item.id,stage}));
 });
}
export function chooseEnglishPractice(pool,events,sessionId,excludedIds=[],{memory=null,at=null}={}){
 const history=events.filter(e=>e.kind==='response');
 const current=history.filter(e=>e.sessionId===sessionId);
 const excluded=new Set(excludedIds);
 // Only new, explicitly identified runtime attempts are used for this gate.
 // Legacy skips do not contain enough information to be reclassified as errors.
 for(const id of englishExcludedWords(events))excluded.add(id);
 const recent=current.at(-1),lastTwo=current.slice(-2);
 let options=pool.filter(t=>!excluded.has(t.itemId));
 options=options.filter(t=>{
  const index=current.findLastIndex(e=>e.itemId===t.itemId&&(e.correct===false||e.usedHint));
  if(index<0)return true;
  // A delayed independent success clears the debt; a hint never does.
  if(current.slice(index+1).some(e=>e.itemId===t.itemId&&e.correct===true&&!e.usedHint))return true;
  return new Set(current.slice(index+1).filter(e=>e.itemId!==t.itemId).map(e=>e.taskId)).size>=3;
 });
 if(options.some(t=>t.itemId!==recent?.itemId))options=options.filter(t=>t.itemId!==recent?.itemId);
 if(lastTwo.length===2&&lastTwo[0].stage===lastTwo[1].stage&&options.some(t=>t.stage!==lastTwo[1].stage))
  options=options.filter(t=>t.stage!==lastTwo[1].stage);
 // Due channels are tested before optional early practice. Newly introduced
 // words and unsupported/guided channels remain available as learning.
 const due=t=>memory?.channels[t.itemId+'|'+memoryChannel(t.stage)];
 if(memory&&Number.isFinite(at)&&options.some(t=>due(t)?.dueAt<=at))
  options=options.filter(t=>due(t)?.dueAt<=at);
 const count=(rows,t,skill)=>rows.filter(e=>e.itemId===t.itemId&&(!skill||e.stage===t.stage)).length;
 options.sort((a,b)=>count(current,a,false)-count(current,b,false)||
  count(history,a,true)-count(history,b,true)||a.id.localeCompare(b.id));
 if(!options.length)return null;
 const selected=options[0],index=current.length;
 return {...selected,id:selected.id.replace(/:0$/,':'+index),
  reason:'least-practised-compatible-skill'};
}


const memoryChannel=stage=>({
 'picture-word':'picture-to-word','read-swatch':'word-to-picture',
 'hear-picture':'sound-to-picture','hear-swatch':'sound-to-picture',
 'en-he':'en-to-he-meaning','he-en':'he-to-en-meaning',
})[stage]||null;

export function englishExcludedWords(events){
 const counts=new Map(),excluded=new Set();
 for(const e of events){
  if(e.kind==='word-reviewed'&&e.qaReview?.scope==='qa'){
   excluded.delete(e.itemId);
   for(const key of counts.keys())if(key.endsWith('|'+e.itemId))counts.delete(key);
  }else if(e.kind==='response'&&e.runtime?.scope==='qa'&&e.correct===false){
   const key=e.sessionId+'|'+e.itemId;
   counts.set(key,(counts.get(key)||0)+1);
   if(counts.get(key)>=3)excluded.add(e.itemId);
  }
 }
 return excluded;
}

// Derived from the existing journal, never stored as a second source of truth.
// Old answers remain readable; insufficient old conditions are not reconstructed.
export function englishMemoryProjection(state,items,parentFamiliarity=null){
 validateEnglishTeachingState(state);
 const channels=new Map(),allTasks=englishPracticePool(items,items.map(i=>i.id));
 const channelIds=itemId=>[...new Set(allTasks.filter(t=>t.itemId===itemId)
  .map(t=>memoryChannel(t.stage)).filter(Boolean))];
 const introduced=englishIntroducedItems(state);
 for(const itemId of englishFamiliarItems(state,parentFamiliarity)){
  if(introduced.has(itemId))continue;
  for(const channelId of channelIds(itemId))channels.set(itemId+'|'+channelId,
   initialSimpleSpacing({itemId,channelId,sourceClass:'qa',legacyDueAt:0}));
 }
 const events=[...state.events].sort((a,b)=>a.at-b.at||a.eventId.localeCompare(b.eventId));
 const exposedInSession=new Set();
 for(const e of events){
  if(e.kind==='introduction'&&e.completed){
   for(const channelId of channelIds(e.itemId)){
    const key=e.itemId+'|'+channelId;
    let m=channels.get(key);
    if(!m){
     m=initialSimpleSpacing({itemId:e.itemId,channelId,sourceClass:'qa',
      legacyDueAt:e.runtime?.scope==='qa'?null:e.at+MEMORY_DAY_MS});
    }
    channels.set(key,applySimpleSpacing(m,{eventId:e.eventId,at:e.at,kind:'exposure'}));
   }
   exposedInSession.add(e.sessionId+'|'+e.itemId);
  }
  if(e.kind!=='response')continue;
  const seenKey=e.sessionId+'|'+e.itemId,channelId=memoryChannel(e.stage);
  const key=e.itemId+'|'+channelId,m=channels.get(key),p=e.runtime?.presentation;
  if(m&&e.runtime?.scope==='qa'){
   const listening=['hear-picture','hear-swatch'].includes(e.stage);
   const gradeable=p?.taskId===e.taskId&&p.mediaReady===true&&
    p.choices.length>=2&&p.choices.includes(e.itemId)&&p.choices.includes(e.answerId)&&
    e.correct===(e.answerId===e.itemId)&&(!listening||p.promptPlays>=1);
   const observation=gradeable?{dataClass:'qa',validity:'valid',
    outcome:e.correct?'correct':'incorrect',fresh:!exposedInSession.has(seenKey),
    assistance:{modelShown:false,transcriptShown:false,hints:Number(e.usedHint),
     replays:Math.max(0,p.promptPlays-(listening?1:0)),teacherHelp:false},
    rater:{kind:'rule',version:'english-choice-v1'},task:{memoryEligible:true}}:null;
   channels.set(key,applySimpleSpacing(m,{eventId:e.eventId,at:e.at,kind:'retrieval',observation}));
  }
  // Every answered target is revealed by the existing feedback, including
  // cross-channel questions. It cannot become a fresh delayed test this session.
  exposedInSession.add(seenKey);
 }
 const byItem={};
 for(const [key,m] of channels){(byItem[m.itemId]??=[]).push(key)}
 return {version:'simple-spacing-v1',sourceClass:'qa',trustedEvidence:false,
  channels:Object.fromEntries(channels),byItem,excludedWordIds:[...englishExcludedWords(events)]};
}

const uuid=()=>globalThis.crypto?.randomUUID?.()||('e-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const stages=['read-swatch','hear-swatch','en-he','he-en','read-swatch'];
const itemToken=value=>typeof value==='string'&&/^[a-z-]+$/.test(value);
export function resolveEnglishColourTask(taskId,items,packId){
 const daily=dailyId.exec(taskId||'');
 if(daily){
  const item=items.find(i=>i.id===daily[1]);
  if(!item)throw Error('Saved English lesson needs its original content; history retained');
  return {id:taskId,kind:'response',itemId:'en:'+item.id,stage:daily[2],item};
 }
 if(packId==='en-daily'&&/^intro:en:[a-z-]+$/.test(taskId||'')){
  const item=items.find(i=>'intro:en:'+i.id===taskId);
  if(!item)throw Error('Missing daily introduction content');
  return {id:taskId,kind:'introduction',itemId:'en:'+item.id,stage:'intro',item};
 }
 const pack=ENGLISH_LESSONS.find(x=>x.packId===packId);
 if(!pack)throw Error('Unknown English lesson');
 const all=new Set([...pack.newItems,...pack.reviews]);
 const intro=/^intro:en:([a-z-]+)$/.exec(taskId||'');
 if(intro){
  if(!all.has(intro[1]))throw Error('Unknown English introduction');
  return {id:taskId,kind:'introduction',itemId:'en:'+intro[1],stage:'intro',
   item:items.find(i=>i.id===intro[1])};
 }
 const school=/^school:(en-school-b-20261019):([a-z-]+):(picture-word|hear-picture|build-word)$/.exec(taskId||'');
 if(school){
  if(school[1]!==packId||!all.has(school[2]))throw Error('Unknown school English exercise');
  return {id:taskId,kind:'response',itemId:'en:'+school[2],stage:school[3],
   item:items.find(i=>i.id===school[2])};
 }
 const answer=/^practice:(en-colours-[ab]):([a-z-]+):([0-4])$/.exec(taskId||'');
 if(!answer||answer[1]!==packId||!all.has(answer[2])||!itemToken(answer[2]))
  throw Error('Unknown English exercise');
 return {id:taskId,kind:'response',itemId:'en:'+answer[2],
  stage:stages[Number(answer[3])],item:items.find(i=>i.id===answer[2])};
}

export function englishColourLessonDraft(items,packId,state,{
 hebrewEnvelope,at=Date.now(),ceiling=TEMPORARY_NEW_WORD_CEILING,
}={}){
 validateEnglishTeachingState(state);
 const pack=ENGLISH_LESSONS.find(x=>x.packId===packId);
 if(!pack||!Array.isArray(items)||items.length<pack.newItems.length)throw Error('Unknown English colour pack');
 const budget=englishSessionBudget({englishState:state,ceiling});
 const known=englishIntroducedItems(state);
 const needs=pack.newItems.filter(x=>!known.has('en:'+x));
 const newIds=needs.slice(0,budget.remaining);
 const eligible=[...pack.newItems,...pack.reviews].filter(x=>
  known.has('en:'+x)||newIds.includes(x)).slice(0,5);
 if(!eligible.length)return {status:'rest',packId,pack,budget,
  reason:budget.remaining===0?'session-budget-used':'no-eligible-words'};
 const practiceIds=eligible.filter(x=>!newIds.includes(x));
 const tasks=buildEnglishLessonTasks(items,{packId,introIds:newIds,reviewIds:practiceIds});
 return {status:newIds.length?'new':'review',packId,pack,budget,
  introIds:newIds,reviewIds:practiceIds,tasks};
}

// Adapter from the existing content groups and teaching journal. Familiarity
// means a completed introduction, never mastery. Due dates are caller-owned;
// an unscheduled legacy item remains available for practice, not fabricated as
// a successful spaced-retrieval result. No state is written here.
export function englishDailyLessonDraft(items,packId,state,{
 hebrewEnvelope,at=Date.now(),ceiling,mode,reviewDueAt={},excludedWordIds=[],mixed=false,memory=null,parentFamiliarity=null,
}={}){
 validateEnglishTeachingState(state);
 if(!['qa','learner'].includes(mode)||!Number.isSafeInteger(ceiling))
  throw Error('Daily lesson requires explicit history class and limit');
 const pack=mixed&&packId==='en-daily'?{packId,label:'English'}:ENGLISH_LESSONS.find(x=>x.packId===packId);
 if(!pack||!Array.isArray(items))throw Error('Unknown English content group');
 const budget=englishSessionBudget({englishState:state,ceiling});
 const introduced=englishFamiliarItems(state,parentFamiliarity);
 if(memory){
  excludedWordIds=[...excludedWordIds,...memory.excludedWordIds.map(id=>id.replace(/^en:/,''))];
  reviewDueAt=Object.fromEntries(Object.entries(memory.byItem).map(([id,keys])=>
   [id.replace(/^en:/,''),Math.min(...keys.map(key=>memory.channels[key].dueAt??0))]));
 }
 const packWords=new Set(mixed?items.map(i=>i.id):[...pack.newItems,...pack.reviews]);
 const candidates=items.filter(item=>packWords.has(item.id)).map(item=>{
  const familiar=introduced.has('en:'+item.id);
  const origin=ENGLISH_LESSONS.findIndex(group=>group.newItems.includes(item.id));
  if(origin<0)throw Error('English content missing from registry');
  return {lexemeId:'lexeme:en:'+item.id,language:'en',personId:'dasha',
   state:'unknown',introduced:familiar,mode,evidenceClass:mode,
   contentStatus:mode==='qa'?'qa-only':item.contentStatus,
   packAddedAt:origin,cardIndex:ENGLISH_LESSONS[origin].newItems.indexOf(item.id),
   dueAt:reviewDueAt[item.id]??0,courseRefs:ENGLISH_LESSONS.filter(p=>p.newItems.includes(item.id)).map(p=>p.packId)};
 });
 const plan=createLanguageDailyPlan({personId:'dasha',language:'en',mode,now:at,
  candidates,maxTasks:mixed?Math.max(1,items.length):5,maxNew:ceiling,languageCaps:{en:ceiling,he:10},
  newWordsUsed:{en:budget.used,he:0},
  excludedWordIds:excludedWordIds.map(id=>id.startsWith('lexeme:en:')?id:'lexeme:en:'+id)});
 const ids=kind=>plan.selected.filter(word=>word.kind===kind).map(word=>word.lexemeId.replace(/^lexeme:en:/,''));
 const introIds=ids('introduce'),reviewIds=ids('review');
 // Additional sessions may practise familiar words early, while
 // keeping their actual due dates. Excluded words never enter this fallback.
 const excluded=new Set(excludedWordIds.map(id=>id.replace(/^(lexeme:)?en:/,'')));
 const earlyPracticeIds=mixed&&memory?items.filter(i=>introduced.has('en:'+i.id)&&
  !reviewIds.includes(i.id)&&!excluded.has(i.id)).map(i=>i.id):[];
 if(!plan.selected.length&&!earlyPracticeIds.length)return {status:'rest',packId,pack,budget,plan,
  reason:budget.remaining===0?'session-budget-used':'no-eligible-words'};
 // Existing task identities are retained for in-progress legacy checkpoints.
 // Shared adaptive mechanics and the timed task boundary are the next layer.
 const tasks=mixed?[
  ...introIds.map(id=>({id:'intro:en:'+id,kind:'introduction',itemId:'en:'+id,stage:'intro'})),
  ...englishPracticePool(items,[...introIds,...reviewIds,...earlyPracticeIds])
 ]:buildEnglishLessonTasks(items,{packId,introIds,reviewIds});
 return {status:introIds.length?'new':'review',packId,pack,budget,plan,introIds,reviewIds,earlyPracticeIds,tasks};
}

export function englishLessonSummary(state,packId){
 validateEnglishTeachingState(state);
 const events=state.events.filter(e=>e.packId===packId);
 const introduced=new Set(events.filter(e=>e.kind==='introduction'&&e.completed).map(e=>e.itemId));
 const independentCorrect=events.filter(e=>e.kind==='response'&&e.correct===true&&!e.usedHint);
 const wrong=events.filter(e=>e.kind==='response'&&e.correct===false);
 const helped=events.filter(e=>e.kind==='response'&&e.usedHint);
 return {introduced:introduced.size,independentCorrect:independentCorrect.length,
  wrongAttempts:wrong.length,assistedAttempts:helped.length,
  fullPackCompleted:englishRouteCompletion(state,packId,
   {requiredIntroItems:(ENGLISH_LESSONS.find(p=>p.packId===packId)?.newItems||[]).map(x=>'en:'+x)})};
}

export function openEnglishLearningSession({store,items,deviceId='qa-device',
 hebrewEnvelope,now=()=>Date.now(),newWordsPerSession,
 newWordsPerDay=TEMPORARY_NEW_WORD_CEILING,
 idFn=uuid,dailyPlanning=false,timedDaily=false,parentFamiliarity=null,monotonicNow=()=>globalThis.performance.now()}={}){
 if(!store||!Array.isArray(items)||(!timedDaily&&![5,8].includes(items.length))||
    !items.length||new Set(items.map(i=>i.id)).size!==items.length||items.some(i=>!itemToken(i?.id)))
  throw Error('English lesson needs validated content and store');
 if(hebrewEnvelope===undefined)throw Error('English lesson needs verified shared-language context');
 // Backend admission and release migration are not complete. The opt-in can
 // only be used with the existing capability-checked isolated owner store.
 if((dailyPlanning||timedDaily)&&store.isolated!==true)throw Error('Daily integration is owner QA only');
 if(timedDaily&&!dailyPlanning)throw Error('Timed lesson requires daily planning');
 const sessionCeiling=newWordsPerSession??newWordsPerDay;
 if(!Number.isSafeInteger(sessionCeiling)||sessionCeiling<0||sessionCeiling>30)
  throw Error('Invalid session introduction ceiling');
 const commit=event=>{
  const saved=store.appendLocal(event);
  if(!saved?.state||!saved?.state.events.some(x=>x.eventId===event.eventId))
   throw Error('English event was not committed');
  if(!store.isolated)store.sync?.().catch(()=>{}); // async; do not block a locally committed step
  return saved.state;
 };
 // Millisecond timestamps can coincide on fast taps. Make them strictly
 // monotonic against already committed events so server-side causal validation
 // and multi-device merge cannot reorder a correct answer before an error.
 let lastIssuedAt=0;
 const record=(data,sessionId,packId)=>{
  const latest=store.load().events.at(-1)?.at||0;
  const issuedAt=Math.max(now(),lastIssuedAt+1,latest+1);
  lastIssuedAt=issuedAt;
  return makeEnglishTeachingEvent({...data,sessionId,deviceId,packId,
   at:issuedAt,idFn});
 };

 // Timed lessons use the same append-only journal and isolated store.
 // Legacy starts have no runtime metadata and retain their original cursor.
 let pendingWrite=null;
 const rawPending=()=>resumeEnglishSession(store.load());
 const activeClock=createActiveLessonClock({readPending:rawPending,monotonicNow,durationMs:ENGLISH_SESSION_MS});
 const runtime=()=>activeClock.current();
 const commitRuntime=(data,rt,p=rawPending())=>{
  if(!p)throw Error('No active English session');
  // Retrying a failed durable write reuses the same event/attempt identity.
  const event=pendingWrite||record({...data,runtime:rt},p.sessionId,p.packId);
  pendingWrite=event;
  commit(event);
  pendingWrite=null;activeClock.adopt(event.runtime,p.sessionId);
  return event;
 };
 const checkpoint=(rt=runtime())=>{
  if(!rt)return null;
  return commitRuntime({kind:'lesson-checkpoint',stage:'start',taskId:'checkpoint:'+idFn()},rt);
 };
 const pause=(reason='manual')=>{
  if(!['manual','hidden','home','technical'].includes(reason))throw Error('Unknown pause reason');
  const rt=runtime();if(!rt)return;
  if(!rt.pauses.includes(reason))rt.pauses.push(reason);
  if(pendingWrite){activeClock.adopt(rt,rawPending().sessionId);return}
  checkpoint(rt);
 };
 const resumeClock=(reason='manual')=>{
  const rt=runtime();if(!rt)return;
  rt.pauses=rt.pauses.filter(r=>r!==reason);checkpoint(rt);
 };
 const retrySave=()=>{
  if(!pendingWrite)return;
  const event=pendingWrite;commit(event);pendingWrite=null;
  activeClock.adopt(event.runtime,event.sessionId);
 };
 const advance=()=>{
  const p=rawPending(),rt=runtime();
  if(!rt)return resume();
  if(rt.pauses.length)return resume();
  if(rt.phase==='card'&&rt.feedbackMs>=3000){rt.phase='between';rt.feedbackMs=0}
  if(rt.phase!=='between')return resume();
  if(rt.elapsedMs>=ENGLISH_SESSION_MS){rt.phase='done';rt.taskId=null;delete rt.presentation;checkpoint(rt);return resume()}
  const state=store.load();
  const done=new Set(state.events.filter(e=>e.sessionId===p.sessionId&&e.kind==='introduction'&&e.completed).map(e=>e.taskId));
  const intro=p.start.tasks.find(t=>t.startsWith('intro:')&&!done.has(t));
  if(intro){rt.taskId=intro;rt.phase='question'}
  else{
   const introduced=englishFamiliarItems(state,parentFamiliarity);
   const pool=p.start.tasks.filter(t=>t.startsWith('daily:')).map(t=>resolveEnglishColourTask(t,items,p.packId))
    .filter(t=>introduced.has(t.itemId));
   const next=chooseEnglishPractice(pool,state.events,p.sessionId,[],{memory:englishMemoryProjection(state,items,parentFamiliarity),at:now()});
   rt.taskId=next?.id||null;rt.phase=next?'question':'done';
  }
  delete rt.presentation;
  checkpoint(rt);return resume();
 };
 const feedbackAudioDone=()=>{
  const rt=runtime();
  if(!rt||rt.pauses.length||rt.phase!=='answer')return;
  const p=rawPending();
  const answer=store.load().events.filter(e=>e.sessionId===p.sessionId&&e.kind==='response').at(-1);
  Object.assign(rt,afterLessonFeedback(rt,answer?.correct===true));
  checkpoint(rt);return advance();
 };

 const resume=()=>{
  const state=store.load(),unfinished=resumeEnglishSession(state);
  if(!unfinished)return null;
  const task=unfinished.nextTaskId?resolveEnglishColourTask(
   unfinished.nextTaskId,items,unfinished.packId):null;
  if(task&&!task.item)throw Error('Saved English lesson needs its original content; history retained');
  return {...unfinished,task,...(unfinished.runtime?{runtime:runtime()}: {})};
 };
 const start=(packId,{diagnosticOnly=false,reviewIds=null,introIds=null,omitListeningStages=false}={})=>{
  const pending=resume();
  if(pending)return {status:'resumed',...pending};
  if(dailyPlanning&&(diagnosticOnly||reviewIds!==null||introIds!==null))
   throw Error('Daily plan cannot be overridden with pack-specific target lists');
  const memory=timedDaily?englishMemoryProjection(store.load(),items,parentFamiliarity):null;
  let draft=(dailyPlanning?englishDailyLessonDraft:englishColourLessonDraft)(items,packId,store.load(),
   {hebrewEnvelope,at:now(),ceiling:sessionCeiling,...(dailyPlanning?{mode:'qa',mixed:timedDaily,memory,parentFamiliarity}:{})});
  if(diagnosticOnly){
   const pack=ENGLISH_LESSONS.find(x=>x.packId===packId);
   const ids=reviewIds||['black','white','brown','grey'];
   if(!pack||!Array.isArray(ids)||!ids.length||ids.some(x=>![...pack.newItems,...pack.reviews].includes(x)))throw Error('Unknown diagnostic colour');
   draft={status:'review',packId,pack,budget:draft.budget,introIds:[],reviewIds:ids,tasks:buildEnglishLessonTasks(items,{packId,introIds:[],reviewIds:ids})};
  }
  if(!diagnosticOnly&&introIds!==null){
   const pack=ENGLISH_LESSONS.find(x=>x.packId===packId);
   const known=englishIntroducedItems(store.load());
   const budget=englishSessionBudget({englishState:store.load(),ceiling:sessionCeiling});
   if(!pack||!Array.isArray(introIds)||introIds.some(x=>!pack.newItems.includes(x)))throw Error('Unknown pilot introduction');
   const newIds=introIds.filter(x=>!known.has('en:'+x)).slice(0,budget.remaining);
   const reviews=(reviewIds||[]).filter(x=>!newIds.includes(x));
   if(reviews.some(x=>![...pack.newItems,...pack.reviews].includes(x)))throw Error('Unknown pilot review');
   const selectedReviews=reviews.slice(0,5-newIds.length);
   draft={status:newIds.length?'new':'review',packId,pack,budget,introIds:newIds,reviewIds:selectedReviews,
    tasks:newIds.length+selectedReviews.length?buildEnglishLessonTasks(items,{packId,introIds:newIds,reviewIds:selectedReviews}):[]};
   if(!draft.tasks.length)return {status:'rest',packId,pack,budget,reason:'no-eligible-words'};
  }
  if(draft.status==='rest')return draft;
  // A fixed candidate lesson assigns the second colour the audio-only
  // stage :1. For this private Safari pilot, REPLACE that stage with the
  // schema-supported visual read-swatch variant :4. Dropping :1 outright
  // silently removed white from Dasha's four-colour first round.
  const lessonTasks=omitListeningStages?draft.tasks.map(task=>
   task.stage==='hear-swatch'&&task.kind==='response'
    ?{...task,id:task.id.replace(/:1$/,':4'),stage:'read-swatch'}:task):draft.tasks;
  if(!lessonTasks.length)throw Error('No safe English pilot exercises');
  const sessionId=idFn(),tasks=lessonTasks.map(t=>t.id);
  const taskId='lesson-start:'+packId;
  const initialRuntime=timedDaily?{version:1,scope:'qa',elapsedMs:0,pauses:[],
   phase:'between',taskId:null,feedbackMs:0}:null;
  commit(record({kind:'lesson-start',stage:'start',taskId,tasks,
   ...(initialRuntime?{runtime:initialRuntime}:{})},sessionId,packId));
  activeClock.reset();
  if(initialRuntime)advance();
  return {status:'started',...resume(),draft};
 };
 const saveIntroduction=(taskId)=>{
  const pending=resume();
  if(!pending||pending.readyToFinish||pending.nextTaskId!==taskId||
    pending.task.kind!=='introduction')throw Error('English introduction out of order');
  const rt=runtime();
  if(rt){
   if(rt.pauses.length||rt.phase!=='question')throw Error('Lesson is paused or showing feedback');
   rt.phase='between';rt.taskId=null;
   commitRuntime({kind:'introduction',stage:'intro',itemId:pending.task.itemId,taskId,completed:true},rt);
   return advance();
  }
  commit(record({kind:'introduction',stage:'intro',itemId:pending.task.itemId,
   taskId,completed:true},pending.sessionId,pending.packId));
  return resume();
 };
 const saveResponse=(taskId,{correct,usedHint=false,skipped=false,answerId=null}={})=>{
  const pending=resume();
  if(!pending||pending.readyToFinish||pending.nextTaskId!==taskId||
    pending.task.kind!=='response'||typeof correct!=='boolean'&&skipped!==true)
   throw Error('English response out of order');
  const rt=runtime();
  if(rt){
   if(rt.pauses.length||rt.phase!=='question'||skipped)throw Error('No answer allowed while paused, in feedback or technically skipped');
   if(answerId!==null){
    const p=rt.presentation;
    if(!p||p.taskId!==taskId||!p.mediaReady||!p.choices.includes(answerId)||
      correct!==(answerId===pending.task.itemId)||
      ['hear-picture','hear-swatch'].includes(pending.task.stage)&&p.promptPlays<1)
     throw Error('Answer does not match the presented, playable question');
   }
   rt.phase='answer';rt.feedbackMs=0;
   commitRuntime({kind:'response',stage:pending.task.stage,itemId:pending.task.itemId,
    taskId,correct,completed:true,usedHint,...(answerId!==null?{answerId}:{})},rt);
   return resume();
  }
  const value=skipped?false:correct;
  const completed=!!(value||skipped);
  commit(record({kind:'response',stage:pending.task.stage,itemId:pending.task.itemId,
   taskId,correct:value,completed,usedHint:usedHint||skipped},
   pending.sessionId,pending.packId));
  return resume();
 };

 const presentQuestion=(taskId,{choices=[]}={})=>{
  const p=resume(),rt=runtime();
  if(!rt||rt.pauses.length||rt.phase!=='question'||p.nextTaskId!==taskId||
   p.task.kind!=='response'||choices.length<2||new Set(choices).size!==choices.length||
   !choices.includes(p.task.itemId)||choices.some(id=>!items.some(i=>'en:'+i.id===id)))
   throw Error('Invalid presented English question');
  if(rt.presentation){
   if(JSON.stringify(rt.presentation.choices)!==JSON.stringify(choices))
    throw Error('Saved question choices changed');
   return;
  }
  rt.presentation={taskId,choices:[...choices],mediaReady:true,promptPlays:0};
  checkpoint(rt);
 };
 const promptPlayed=taskId=>{
  const rt=runtime();
  if(!rt||rt.pauses.length||rt.phase!=='question'||rt.taskId!==taskId||!rt.presentation)
   throw Error('No presented question for completed prompt');
  rt.presentation.promptPlays++;checkpoint(rt);
 };
 const reviewExcludedWord=(itemId,note)=>{
  if(!store.isolated||typeof note!=='string'||note.trim().length<6||note.length>1000||
    !englishExcludedWords(store.load().events).has(itemId))
   throw Error('A currently excluded QA word and an explicit review note are required');
  commit(record({kind:'word-reviewed',stage:'end',taskId:'review:'+itemId,
   itemId,qaReview:{scope:'qa',outcome:'restore',note:note.trim()}},idFn(),'en-daily'));
 };

 const finish=()=>{
  const pending=resume();
  if(!pending?.readyToFinish)throw Error('English lesson is unfinished');
  commit(record({kind:'lesson-complete',stage:'end',taskId:'lesson-end:'+pending.packId,
   completed:true},pending.sessionId,pending.packId));
  return {status:'completed',packId:pending.packId,
   summary:englishLessonSummary(store.load(),pending.packId)};
 };
 return Object.freeze({resume,start,saveIntroduction,saveResponse,finish,
  advance,pause,resumeClock,checkpoint,retrySave,feedbackAudioDone,presentQuestion,promptPlayed,reviewExcludedWord,
  get memory(){return englishMemoryProjection(store.load(),items,parentFamiliarity)},
  get familiarItems(){return englishFamiliarItems(store.load(),parentFamiliarity)},
  get runtime(){return runtime()},
  get state(){return store.load()},get isolated(){return store.isolated===true},
  get budget(){return englishSessionBudget({englishState:store.load(),
    sessionId:rawPending()?.sessionId??null,ceiling:sessionCeiling})},
  summary:packId=>englishLessonSummary(store.load(),packId)});
}
