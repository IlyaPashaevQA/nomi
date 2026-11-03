import {chooseSafaContextTask,safaRussianMeaningAdapter,safaRussianMeaningUsed} from './safa-context-daily.mjs';
import {hebrewDailyTask} from './hebrew-pack-catalog.mjs';
import {wordChoiceCompatible} from './word-loop-semantics.mjs';
import {HEBREW_NUMBER_FORMS_VERSION,hebrewNumberFormDailyTemplate,numberFormRecovery,NUMBER_RECOVERY_VERSION} from './hebrew-number-forms.mjs';
import {chooseHebrewReadingTask} from './reading-unit-planner.mjs';
import {chooseHebrewSentenceTask} from './sentence-daily.mjs';
import {shouldPracticeHebrewWord,hebrewWordKnowledge} from './hebrew-known-word-policy.mjs';

// The Israel school day rolls at 02:00 local time. This is the session
// boundary, distinct from any catalog or individual daily *word* limit.
// Use calendar arithmetic on local date parts (not subtracting 2h in UTC:
// Israel changes offset for daylight saving time).
const israelClock=new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',hourCycle:'h23',
});
export const HEBREW_OVERNIGHT_CUTOFF_LOCAL_HOUR=2;
export function hebrewSessionSchoolDayKey(at=Date.now()){
 if(!Number.isFinite(at)||at<0)throw Error('Invalid Hebrew session timestamp');
 const parts=Object.fromEntries(israelClock.formatToParts(new Date(at))
  .filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const {year,month,day,hour}=parts;
 if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day)||
    !Number.isInteger(hour)||hour<0||hour>23)throw Error('Invalid Israel calendar data');
 const date=new Date(Date.UTC(year,month-1,day-(hour<HEBREW_OVERNIGHT_CUTOFF_LOCAL_HOUR?1:0)));
 return date.toISOString().slice(0,10);
}
export function shouldCloseOvernightHebrewLesson(plan,now=Date.now()){
 if(!plan||plan.status!=='active')return false;
 if(!Number.isFinite(plan.startedAt)||plan.startedAt<=0)return false;
 if(!Number.isFinite(now)||now<plan.startedAt)return false;
 return hebrewSessionSchoolDayKey(now)>hebrewSessionSchoolDayKey(plan.startedAt);
}

// Canonical Hebrew cards are content-addressed. A paused 10-minute lesson can
// outlive owner catalogue edits. Do NOT silently narrow it to the last four
// matching cards and drill them forever; the checkpoint stays append-only.
export function hebrewDailyPlanIntegrity(plan,words){
 const current=new Map(words.map(w=>[w.id,w]));
 const rows=plan?.plan||[];
 let valid=0,changed=0,withdrawn=0;
 for(const ref of rows){
  const word=current.get(ref.wordId);
  if(!word)withdrawn++;
  else if(word.contentSha256!==ref.contentSha256)changed++;
  else valid++;
 }
 return {total:rows.length,valid,changed,withdrawn};
}
export function shouldRollHebrewDailyPlan(plan,words){
 const x=hebrewDailyPlanIntegrity(plan,words);
 // Small deliberate sessions are NOT considered corrupt, even with 4 words.
 // With a broad pinned plan and a destroyed version overlap, start a fresh
 // lesson at a SAFE boundary rather than inflate repetition counts.
 return x.total>=10 && x.valid<Math.min(8,Math.ceil(x.total/2));
}

export const HEBREW_DAILY_MAX_SAME_WORD_PRACTICES=3;
const fourChoices=new Set(['meaning-picture','picture-word','audio-picture','audio-word','ru-meaning-word']);

// Image backgrounds and visual art families may differ across released packs.
// This is a presentation hint, NOT catalogue evidence or a change in admission:
// opaque school imagery must not be mixed with transparent legacy cutouts.
// Uploaded artwork of the same source batch is a best-effort cohort, not a
// guarantee that human-reviewed art styles actually match.
export function hebrewVisualCohort(word){
 const src=String(word?.image||'');
 const batch=src.match(/^\.\/assets\/candidates\/([^/]+)\//);
 if(batch)return 'candidate:'+batch[1];
 if(src.startsWith('./assets/uploaded/'))
  return 'uploaded:'+(word?.source==='existing'?'legacy':'school');
 const slash=src.lastIndexOf('/');
 return 'other:'+(slash>=0?src.slice(0,slash):'unknown');
}

export function hebrewDailyFourChoiceTask(task,plan,words,events){
 if(!task||!fourChoices.has(task.mechanic))return task;
 const released=new Map(words.map(w=>[w.id,w]));
 const introDone=new Set(events.filter(e=>e.mechanic==='intro'&&e.completed===true)
   .flatMap(e=>e.targets||[]));
 const admitted=(plan.plan||[]).map(ref=>{
  const w=released.get(ref.wordId);
  // Parent explicitly retired isolated Torah tokens even as distractors.
  return w?.packId!=='torah-chumashim-phrase'&&
    w?.contentSha256===ref.contentSha256&&
    (!plan.introIds?.includes(ref.wordId)||introDone.has(w.target))?w:null;
 }).filter(Boolean);
 const target=admitted.find(w=>w.target===task.targets[0]);
 if(!target)return null;
 const distinct=admitted.filter(w=>wordChoiceCompatible(target,w)&&w.id!==target.id&&w.target!==target.target&&
   (w.displayTarget||w.target)!==(target.displayTarget||target.target));
 const isPicture=task.mechanic.endsWith('-picture');
 const cohort=hebrewVisualCohort(target);
 // Never make a four-image problem in which the sole opaque/transparent or
 // different-batch picture trivially betrays the answer.
 const matched=distinct.filter(w=>w.image&&w.image!==target.image&&
   hebrewVisualCohort(w)===cohort);
 const choices=isPicture?matched:distinct;
 // Authored contrast groups use their reviewed pair; ordinary vocabulary keeps four choices.
 const minimum=target.choiceCohort?1:3;
 let mechanic=task.mechanic,pool=choices;
 if(pool.length<minimum&&isPicture){
  mechanic=task.mechanic==='audio-picture'?'audio-word':'picture-word';
  pool=distinct; // Four written choices need not share an art style.
 }
 if(pool.length<minimum)return null; // Never borrow an unrelated distractor to fill a contrast.
 // Rotate same-style distractors across attempts, not the same obvious trio.
 const offset=Math.abs(Number(plan.sequence)||0)%pool.length;
 const rotated=[...pool.slice(offset),...pool.slice(0,offset)];
 const selected=[target.target,...rotated.slice(0,3).map(w=>w.target)];
 return {...task,mechanic,choices:selected};
}

// Morphology does not introduce another word or another mechanic. We reuse
// SCHOOL_LESSONS.forms' school-form input surface and the existing constructor
// task identity/journal. The grammar subskill is distinguishable in metadata.
export function chooseHebrewNumberFormTask(plan,words,events,{memory={},now=Date.now()}={}){
 if(!plan?.sessionId||!Number.isFinite(plan?.runtime?.elapsedMs)||plan.runtime.elapsedMs<240000)
  return null; // preserve the first four minutes for already prioritized Torah
 const history=events.filter(e=>e.sessionId===plan.sessionId&&e.completed===true);
 const practice=history.filter(e=>e.mechanic!=='intro');
 const morph=practice.filter(e=>e.detail?.wordForm?.version===HEBREW_NUMBER_FORMS_VERSION);
 if(practice.length<4||morph.length>=3)return null;
 const sinceLast=practice.slice(morph.length?practice.findLastIndex(e=>e.detail?.wordForm?.version===HEBREW_NUMBER_FORMS_VERSION)+1:0)
  .filter(e=>e.detail?.wordForm?.version!==HEBREW_NUMBER_FORMS_VERSION).length;
 if(sinceLast<4)return null;
 const available=new Map(words.map(w=>[w.id,w]));
 const introCompleted=new Set(events.filter(e=>e.mechanic==='intro'&&e.completed===true).flatMap(e=>e.targets||[]));
 const last=practice.at(-1);
 const candidates=[];
 for(const row of plan.plan||[]){
  const word=available.get(row.wordId);
  if(!word||word.contentSha256!==row.contentSha256||
     (plan.introIds||[]).includes(word.id)&&!introCompleted.has(word.target)||
     last?.targets?.includes(word.target))continue;
  // Known forms only, and only after actual recognition of the canonical
  // singular target. A parent familiarity flag alone does not count.
  const recognized=events.some(e=>e.completed===true&&e.correct===true&&e.targets?.includes(word.target)&&
    ['meaning-picture','picture-word','audio-picture','audio-word'].includes(e.mechanic));
  if(!recognized)continue;
  for(const direction of ['to-plural','to-singular']){
   const form=hebrewNumberFormDailyTemplate(word.target,direction);
   if(!form)continue;
   const repair=numberFormRecovery(form,{wordId:word.id,contentSha256:word.contentSha256},events,now);
   if(repair.stage)continue; // recovery/review has its own bounded lane
   const channel='noun-number:'+direction,spaced=memory[word.id+'|'+channel];
   const old=events.filter(e=>e.detail?.wordForm?.version===HEBREW_NUMBER_FORMS_VERSION&&
    e.detail.wordForm.sourceTarget===word.target&&e.detail.wordForm.direction===direction);
   if(old.length&&spaced&&Number.isFinite(spaced.dueAt)&&spaced.dueAt>now)continue;
   candidates.push({word,form,uses:old.length,
    thisSession:old.filter(e=>e.sessionId===plan.sessionId).length,
    due:old.length?spaced?.dueAt??0:-1});
  }
 }
 if(!candidates.length)return null;
 candidates.sort((a,b)=>a.thisSession-b.thisSession||a.uses-b.uses||a.due-b.due||
   b.word.priority-a.word.priority||a.word.cardIndex-b.word.cardIndex||
   a.word.id.localeCompare(b.word.id)||a.form.direction.localeCompare(b.form.direction));
 const chosen=candidates[0],w=chosen.word;
 return {id:'daily-he:'+plan.sessionId+':'+plan.sequence,
  mechanic:'constructor',mode:'noun-number',targets:[w.target],choices:[],
  contentAccess:{wordId:w.id,contentSha256:w.contentSha256,packId:w.packId},
  wordForm:chosen.form,countsAsEvidence:false};
}


// A failed morphology channel gets teaching support and a later independent
// check, including errors inherited from the previous lesson. Never hand-edit
// a learner plan or retire the base word because its plural was misspelled.
export function chooseHebrewNumberRecoveryTask(plan,words,events,{now=Date.now()}={}){
 if(!plan?.sessionId||plan.status!=='active'||plan.runtime?.elapsedMs>=600000)return null;
 const current=events.filter(e=>e.sessionId===plan.sessionId&&e.completed===true&&typeof e.correct==='boolean');
 if(current.length<4)return null;
 const lastRepair=current.findLastIndex(e=>e.detail?.numberRecovery?.version===NUMBER_RECOVERY_VERSION);
 if(lastRepair>=0&&current.slice(lastRepair+1).filter(e=>!e.detail?.wordForm&&e.targets?.length===1).length<3)return null;
 if(current.filter(e=>e.detail?.numberRecovery?.version===NUMBER_RECOVERY_VERSION).length>=4)return null;
 const candidates=[];
 for(const w of words){
  const inPlan=(plan.plan||[]).some(r=>r.wordId===w.id&&r.contentSha256===w.contentSha256);
  // Grammar repair must survive the base word leaving isolated-word drills.
  const introduced=inPlan&&!(plan.introIds||[]).includes(w.id)||
   events.some(e=>e.mechanic==='intro'&&e.completed&&e.targets?.includes(w.target))||
   hebrewWordKnowledge(w,events,now).learned;
  if(!introduced)continue;
  const access={wordId:w.id,contentSha256:w.contentSha256,packId:w.packId};
  for(const direction of ['to-plural','to-singular']){
   const form=hebrewNumberFormDailyTemplate(w.target,direction);if(!form)continue;
   const state=numberFormRecovery(form,access,events,now);
   if(!state.stage||state.stage==='review'&&state.dueAt>now)continue;
   const ownCurrent=state.history.filter(e=>e.sessionId===plan.sessionId);
   // Two repairs per direction per lesson; unresolved work survives tomorrow.
   if(ownCurrent.filter(e=>e.detail?.numberRecovery).length>=2)continue;
   const last=ownCurrent.at(-1),lastAny=current.at(-1);
   if(lastAny?.targets?.includes(w.target))continue;
   if(last&&current.filter(e=>e.at>last.at&&!e.targets?.includes(w.target)).length<3)continue;
   const errorAt=state.history.find(e=>e.eventId===state.errorEventId)?.at||0;
   candidates.push({w,form,access,state,last:state.history.at(-1),errorDay:hebrewSessionSchoolDayKey(errorAt)});
  }
 }
 candidates.sort((a,b)=>b.errorDay.localeCompare(a.errorDay)||a.last.at-b.last.at||a.w.id.localeCompare(b.w.id)||a.form.direction.localeCompare(b.form.direction));
 const x=candidates[0];if(!x)return null;
 return {id:'daily-he:'+plan.sessionId+':'+plan.sequence,mechanic:'constructor',mode:'noun-number',
  targets:[x.w.target],choices:[],countsAsEvidence:false,contentAccess:x.access,wordForm:x.form,
  numberSupport:{version:NUMBER_RECOVERY_VERSION,stage:x.state.stage,errorEventId:x.state.errorEventId}};
}

// A second same-day lesson can have no new-word budget and only a few
// unsettled words. Keep the shared lesson running with varied, early practice
// of OTHER already-known words between reading/forms/sentences. Each lexical
// target appears at most once in this fallback circuit; no new introductions,
// no Torah fragments, and early answers cannot advance spaced review.
export function chooseHebrewKnownBridgeTask(plan,words,events,{memory={},now=Date.now()}={}){
 const lexical=events.filter(e=>!e.detail?.wordForm&&e.detail?.mode!=='noun-number');
 const used=new Set(lexical.filter(e=>e.sessionId===plan.sessionId&&e.completed===true).flatMap(e=>e.targets||[]));
 const known=words.filter(w=>w.packId!=='torah-chumashim-phrase'&&!used.has(w.target)&&hebrewWordKnowledge(w,events,now).learned);
 if(!known.length)return null;
 const lastSeen=w=>Math.max(0,...lexical.filter(e=>e.completed===true&&e.targets?.includes(w.target)).map(e=>e.at||0));
 // Oldest practiced targets first, then a stable vocabulary identity.
 const order=[...known].sort((a,b)=>lastSeen(a)-lastSeen(b)||a.id.localeCompare(b.id));
 const pool=words.filter(w=>w.packId!=='torah-chumashim-phrase'&&hebrewWordKnowledge(w,events,now).learned);
 const bridgePlan={...plan,introIds:[],plan:pool.map(w=>({wordId:w.id,contentSha256:w.contentSha256}))};
 // Balance available reading/writing/listening without letting an impossible
 // focused task hide the rest of the approved catalogue.
 const family=m=>m==='constructor'?'writing':m.startsWith('audio')||m==='ru-meaning-word'?'listening':'reading';
 const counts={reading:0,writing:0,listening:0};
 for(const e of lexical)if(e.sessionId===plan.sessionId&&e.completed===true&&e.targets?.length===1&&typeof e.correct==='boolean')
  counts[family(e.mechanic)]++;
 for(const preferred of order){
  const focus={...bridgePlan,plan:[{wordId:preferred.id,contentSha256:preferred.contentSha256}]};
  // A multiword item has no letter-constructor. The ordinary one-item
  // engine cannot make distractors, but the full bridge pool can.
  const task=hebrewDailyTask(focus,words,lexical,{remainingNew:0,memory,now})||{
   id:'daily-he:'+plan.sessionId+':'+plan.sequence,targets:[preferred.target],choices:[],
   contentAccess:{wordId:preferred.id,contentSha256:preferred.contentSha256,packId:preferred.packId},
   countsAsEvidence:false
  };
  const mechanics=['picture-word','constructor','audio-word'].filter(m=>
   m==='constructor'&&!!preferred.displayTarget&&!preferred.target.includes(' ')||
   m==='picture-word'&&!!preferred.image||m==='audio-word'&&!!preferred.audioSrc)
   .sort((a,b)=>counts[family(a)]-counts[family(b)]||['picture-word','constructor','audio-word'].indexOf(a)-['picture-word','constructor','audio-word'].indexOf(b));
  for(const mechanic of mechanics){
   const candidate=hebrewDailyFourChoiceTask({...task,mechanic,choices:[],
    mode:mechanic==='constructor'?'letters':undefined},bridgePlan,words,events);
   if(candidate)return candidate;
  }
 }
 return null;
}

// Policy stays OUTSIDE the checksum-pinned Hebrew content catalogue. Errors
// from admitted packs are scheduling hints only, never trusted mastery.
export function chooseHebrewDailyTask(plan,words,events,{remainingNew=10,memory={},now=Date.now(),russianSourceMap}={}){
 // Ordinary word orbits require four valid choices; reviewed contrast pairs retain two.
 const options={remainingNew,memory,minimumChoices:4,now,russianSourceMap};
 const wordEvents=events.filter(e=>!e.detail?.wordForm&&e.detail?.mode!=='noun-number');
 // A word cannot occupy the whole ten minutes. Once it has had three
 // practice questions in this session it cools down; other admitted words
 // and channels take the place. Introductions do not count as practice.
 const usage=new Map();
 for(const e of wordEvents){
  if(e.sessionId!==plan.sessionId||e.completed!==true||e.mechanic==='intro')continue;
  for(const target of e.targets||[])usage.set(target,(usage.get(target)||0)+1);
 }
 const released=new Map(words.map(w=>[w.id,w]));
 // A complete initial circuit is at most three exercises per word. Very fast
 // learners may exhaust that circuit before their ten minutes are up. Start
 // another FAIR circuit of one additional attempt per word, instead of ending
 // the session early or drilling the last one/two available words repeatedly.
 // Keep words with three wrong attempts out of the active exercise pool.
 const mistaken=new Map();
 for(const e of wordEvents){
  if(e.sessionId!==plan.sessionId||e.completed!==true||e.correct!==false)continue;
  for(const t of e.targets||[])mistaken.set(t,(mistaken.get(t)||0)+1);
 }
 const activeRefs=(plan.plan||[]).filter(ref=>{
  const w=released.get(ref.wordId);
  // Learned = out of repetitive drill until a scheduled recall is due.
  // An error after the parent's confirmed-known checkpoint reactivates it.
  // Torah's five phrase tokens leave isolated word drills entirely and
  // remain available for connected-text work without altering history.
  return !!w&&w.contentSha256===ref.contentSha256&&
    (mistaken.get(w.target)||0)<3&&
    shouldPracticeHebrewWord(w,events,now);
 });
 const minUse=activeRefs.length?Math.min(...activeRefs.map(ref=>usage.get(released.get(ref.wordId).target)||0)):0;
 const roundLimit=Math.max(HEBREW_DAILY_MAX_SAME_WORD_PRACTICES,minUse+1);
 const remainingRefs=activeRefs.filter(ref=>
  (usage.get(released.get(ref.wordId).target)||0)<roundLimit);
 const finish=task=>hebrewDailyFourChoiceTask(task,plan,words,events);
 // Never disable an INTRO because its word already appeared in other
 // activities: all published first-contact cards precede the games.
 const pendingIntro=hebrewDailyTask(plan,words,wordEvents,options);
 if(pendingIntro?.mechanic==='intro')return finish(pendingIntro);
 const sourceIntro=chooseSafaContextTask(plan,events,{now,introductionOnly:true});
 if(sourceIntro)return sourceIntro;
 const newHere=new Set(events.filter(e=>e.sessionId===plan.sessionId&&e.mechanic==='intro'&&e.completed===true).map(e=>e.detail?.contentAccess?.wordId).filter(Boolean));
 const firstNewPending=newHere.size>0&&!events.some(e=>e.sessionId===plan.sessionId&&typeof e.correct==='boolean'&&newHere.has(e.detail?.contentAccess?.wordId));
 if(firstNewPending&&pendingIntro)return finish(pendingIntro);
 const sourceMeaning=!firstNewPending&&!safaRussianMeaningUsed(plan,events,options.russianSourceMap)&&safaRussianMeaningAdapter(plan,options.russianSourceMap);
 if(sourceMeaning)return sourceMeaning;
 const safa=chooseSafaContextTask(plan,events,{now});if(safa)return safa;
 const recovery=chooseHebrewNumberRecoveryTask(plan,words,events,{now});
 if(recovery)return recovery;
 if(!remainingRefs.length){
  const reading=chooseHebrewReadingTask(plan,words,events,{now});
  return reading||chooseHebrewSentenceTask(plan,words,events,{now})||
   chooseHebrewKnownBridgeTask(plan,words,events,{memory,now})||chooseSafaContextTask(plan,events,{now,allowConsecutive:true})||null;
 }
 const workingPlan=remainingRefs.length===(plan.plan||[]).length?plan:{...plan,plan:remainingRefs};
 let baseline=hebrewDailyTask(workingPlan,words,wordEvents,options);
 if(!baseline){
  // The checksum-pinned bank cannot form a choice task from ONE remaining
  // target, even though the FULL approved session still offers distractors.
  // Complete that fair turn using the same mechanic engine and journal.
  const recent=events.filter(e=>e.sessionId===plan.sessionId&&typeof e.correct==='boolean');
  const eligible=remainingRefs.map(ref=>released.get(ref.wordId)).find(w=>{
   const i=recent.findLastIndex(e=>e.targets?.includes(w.target)&&(e.correct===false||e.assisted));
   return i<0||new Set(recent.slice(i+1).filter(e=>!e.targets?.includes(w.target)).map(e=>e.taskId)).size>=3;
  });
  if(eligible)baseline={
   id:'daily-he:'+plan.sessionId+':'+plan.sequence,
   mechanic:eligible.audioSrc?'audio-word':'meaning-picture',targets:[eligible.target],choices:[],
   contentAccess:{wordId:eligible.id,contentSha256:eligible.contentSha256,packId:eligible.packId},
   countsAsEvidence:false
  };
 }
 // INTRO is a full opening phase. Neither Torah urgency nor error practice
 // can preempt a pending introduction already admitted to THIS lesson plan.
 if(baseline?.mechanic==='intro')return finish(baseline);
 const hasRecognition=(target)=>events.some(e=>e.correct===true&&e.completed===true&&
   (e.targets||[]).includes(target)&&['meaning-picture','picture-word','audio-picture','audio-word'].includes(e.mechanic));
 const comprehensionFirst=(task)=>{
  if(!task||task.mechanic!=='constructor'||hasRecognition(task.targets?.[0]))return task;
  // A new word should have at least one recognition exercise before an
  // unaided letter-constructor, rather than require guessing the spelling.
  const postponed={...memory};
  for(const w of words){
   if(hasRecognition(w.target))continue;
   const key=w.id+'|constructor';
   postponed[key]={...(memory[key]||{}),dueAt:now+86400000};
  }
  const alternative=hebrewDailyTask(workingPlan,words,wordEvents,{...options,remainingNew:0,memory:postponed});
  return alternative&&alternative.mechanic!=='constructor'&&finish(alternative)?alternative:task;
 };
 if(plan.runtime?.elapsedMs<240000){
  // Parent-confirmed familiar Torah words need PRACTICE, not redundant new
  // introductions. Do not alter the pinned plan or use a second lesson engine.
  const torah=hebrewDailyTask(workingPlan,words,wordEvents,{...options,remainingNew:0});
  const target=words.find(w=>w.target===torah?.targets?.[0]);
  if(torah?.mechanic!=='intro'&&target?.priority>=3)return finish(comprehensionFirst(torah));
 }
 if(plan.runtime?.elapsedMs>=240000){
  const reading=chooseHebrewReadingTask(workingPlan,words,events,{now});
  if(reading)return reading;
  const sentence=chooseHebrewSentenceTask(plan,words,events,{now});
  if(sentence)return sentence;
  const form=chooseHebrewNumberFormTask(workingPlan,words,events,{memory,now});
  if(form)return form;
 }
 if(!baseline)return chooseHebrewKnownBridgeTask(plan,words,events,{memory,now})||chooseSafaContextTask(plan,events,{now,allowConsecutive:true});
 const pending=Object.entries(memory)
  .filter(([,state])=>(state?.lastPracticeErrorAt>0||state?.lastDecision==='practice-error-next-day')&&
   Number.isFinite(state.dueAt)&&state.dueAt<=now);
 // The most recent mistake-day comes first: an old backlog must not drown
 // out yesterday's newly discovered difficulty in a ten-minute session.
 const israeliDay=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
 const latest=Math.max(0,...pending.map(([,m])=>m.lastPracticeErrorAt||m.lastExposureAt||0));
 const dueKeys=new Set(pending.filter(([,m])=>israeliDay(m.lastPracticeErrorAt||m.lastExposureAt||0)===israeliDay(latest)).map(([key])=>key));
 if(!dueKeys.size)return finish(comprehensionFirst(baseline));
 const admitted=new Set((workingPlan.plan||[]).map(row=>row.wordId+'|'+row.contentSha256));
 if(!words.some(w=>admitted.has(w.id+'|'+w.contentSha256)&&
    [...dueKeys].some(key=>key.startsWith(w.id+'|'))))return finish(comprehensionFirst(baseline));
 // Keep the complete choice pool (a single focused word would lose visual
 // distractors). Make every OTHER channel not-due in a transient projection.
 const channels=['meaning-picture','picture-word','audio-picture','audio-word','ru-meaning-word','constructor'];
 const prioritizedMemory=Object.fromEntries(words.flatMap(w=>channels.map(channel=>{
  const key=w.id+'|'+channel;
  return [key,{...memory[key],dueAt:dueKeys.has(key)?0:now+60000}];
 })));
 const selected=hebrewDailyTask(workingPlan,words,wordEvents,{...options,remainingNew:0,memory:prioritizedMemory});
 return finish(comprehensionFirst(selected&&dueKeys.has(selected.contentAccess.wordId+'|'+selected.mechanic)?selected:baseline));
}
