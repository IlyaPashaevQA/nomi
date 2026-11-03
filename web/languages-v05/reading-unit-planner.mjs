import {READING_DAILY_MAX,readingReviewDueAt,isReadingComprehensionAttempt} from './reading-unit-catalog.mjs';
// Scheduled reading task adapter for EXISTING Hebrew ten-minute planner.
// Parent/readiness marker and graded tasks live in the existing Alpha20 events;
// no extra game, timer, independent score journal or read-text vocabulary pack.
import {isScheduledSafaTask,safaReadinessEvent} from './safa-context-daily.mjs';
import {KARMEL_PAGE15} from './karmel-page15-activities.mjs';
import {KARMEL_READING_TASKS,KARMEL_READING_REF,
  KARMEL_READY_VERSION,KARMEL_TASK_VERSION,readingHistoryStatus,
  isRecordedKarmelQuestion} from './reading-unit-catalog.mjs';

export {READING_DAILY_MAX} from './reading-unit-catalog.mjs';
const uuid=()=>globalThis.crypto?.randomUUID?.()||'reading-'+Date.now()+'-'+Math.random().toString(16).slice(2);
export function readingReadinessEvent({deviceId,sessionId,eventId=uuid(),at=Date.now(),readingUnitId=KARMEL_READING_REF}={}){
 if(readingUnitId==='reading:safa-cave-v1')return safaReadinessEvent({deviceId,sessionId,eventId,at});
 if(!deviceId||!sessionId||!Number.isSafeInteger(at)||at<=0)
  throw Error('Missing scoped family reading identity');
 return {schema:1,eventId,attemptId:eventId,sessionId,deviceId,
  courseId:'he-alpha20',courseRevision:KARMEL_READY_VERSION,
  blockId:'reading:'+KARMEL_PAGE15.packId+':pages13-14',
  taskId:'reading:karmel:read-with-parent',mechanic:'read-with-parent',
  targets:[],correct:null,completed:true,assisted:true,countsAsEvidence:false,at,
  detail:{kind:'parent-reading-checkpoint',readingUnitId:KARMEL_READING_REF,
   packId:KARMEL_PAGE15.packId,sourceId:'Karmel:Kotar:pages13-14',
   readWithParent:true,wordMasteryClaim:false}};
}
export function eligibleReadingTasks(plan,words,events,now=Date.now()){
 if(!plan?.sessionId||plan?.status!=='active'||!Number.isFinite(plan.runtime?.elapsedMs)||
  plan.runtime.elapsedMs<120000)return [];
 const pack=KARMEL_PAGE15.packId;
 const eligible=words.some(w=>w.packId===pack&&w.contentSha256);
 // First text-based lesson precedes the family read-aloud.
 // Learned single-word items are still valid source context.
 if(!eligible)return [];
 const current=events.filter(e=>e.sessionId===plan.sessionId&&e.completed===true);
 const readingAttempts=current.filter(isRecordedKarmelQuestion);
 if(current.filter(isReadingComprehensionAttempt).length>=READING_DAILY_MAX)return [];
 const lastReading=readingAttempts.at(-1)?.at||0;
 const parentReadingAt=events.filter(e=>e.taskId==='reading:karmel:read-with-parent'&&
  e.completed===true&&e.courseRevision===KARMEL_READY_VERSION)
  .reduce((last,e)=>Math.max(last,e.at||0),0);
 const ordinarySince=lastReading?
  current.filter(e=>e.at>lastReading&&e.mechanic!=='intro'&&
     e.detail?.readingVersion!==KARMEL_TASK_VERSION).length:
  current.filter(e=>e.mechanic!=='intro'&&e.detail?.readingVersion!==KARMEL_TASK_VERSION).length;
 if(ordinarySince<4)return [];
 return KARMEL_READING_TASKS.map(q=>{
  const seen=events.filter(e=>isRecordedKarmelQuestion(e)&&e.detail.questionId===q.id);
  const latest=seen.at(-1);
  // One immediate next-lesson consolidation when a parent reads after
  // the learner's first attempt; following reviews respect spaced timing.
    const dueAt=readingReviewDueAt(latest,parentReadingAt);
  return {question:q,uses:seen.length,dueAt};
 }).filter(row=>row.dueAt<=now).sort((a,b)=>a.uses-b.uses||a.dueAt-b.dueAt||
    KARMEL_READING_TASKS.indexOf(a.question)-KARMEL_READING_TASKS.indexOf(b.question));
}
export function chooseHebrewReadingTask(plan,words,events,{now=Date.now()}={}){
 const candidates=eligibleReadingTasks(plan,words,events,now);
 if(!candidates.length)return null;
 const q=candidates[0].question;
 return {
  id:'daily-he:'+plan.sessionId+':'+plan.sequence,
  mechanic:q.kind==='constructor'?'constructor':q.kind==='two'?'multi-choice':q.kind==='discussion'?'discussion':'focus-choice',
  mode:'reading-comprehension',
  readingTask:{unitId:KARMEL_READING_REF,questionId:q.id,version:KARMEL_TASK_VERSION,kind:q.kind},
  targets:[],choices:[],countsAsEvidence:false,
 };
}
export function isScheduledReadingTask(task){
 if(isScheduledSafaTask(task))return true;
 return !!task&&typeof task.id==='string'&&task.mode==='reading-comprehension'&&
  task.readingTask?.unitId===KARMEL_READING_REF&&
  task.readingTask?.version===KARMEL_TASK_VERSION&&
  KARMEL_READING_TASKS.some(q=>q.id===task.readingTask.questionId&&
   q.kind===task.readingTask.kind&&
   task.mechanic===(q.kind==='constructor'?'constructor':q.kind==='two'?'multi-choice':q.kind==='discussion'?'discussion':'focus-choice'))&&
  Array.isArray(task.targets)&&task.targets.length===0&&
  Array.isArray(task.choices)&&task.choices.length===0&&
  !task.contentAccess;
}
