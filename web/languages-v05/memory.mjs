import { ref, scope } from './domain.mjs';
import { independent } from './evidence.mjs';

// Shared memory boundary. The original observation contract remains unchanged.
export function emptyMemoryState(owner, task) {
  scope(owner); ref(task.itemRef); ref(task.skillRef);
  return { ...owner, itemRef: task.itemRef, skillRef: task.skillRef, channelId: task.channelId,
    adapter: null, adapterVersion: null, status: 'uninitialized', lastEligibleObservation: null,
    dueAt: null, stability: null, difficulty: null, retrievability: null };
}
export function memoryEligible(observation) { return observation.task.memoryEligible && independent(observation); }

export const SIMPLE_SPACING_VERSION='simple-spacing-v1';
export const MEMORY_DAY_MS=86400000;

// Scheduling is not mastery and not a trusted-evidence projection. Rehearsal
// callers keep QA scope; live use must supply server-admitted observations.
export function initialSimpleSpacing({itemId,channelId,sourceClass='qa',legacyDueAt=null}){
 if(!itemId||!channelId||!['qa','live'].includes(sourceClass)||
   legacyDueAt!==null&&(!Number.isSafeInteger(legacyDueAt)||legacyDueAt<0))
  throw Error('Invalid memory identity or legacy due date');
 return {itemId,channelId,sourceClass,schedulerVersion:SIMPLE_SPACING_VERSION,
  status:legacyDueAt===null?'unseen':'legacy_unverified',dueAt:legacyDueAt,
  intervalMs:legacyDueAt===null?null:MEMORY_DAY_MS,lastEligibleReviewAt:null,
  lastExposureAt:null,eligibleSuccessCount:0,lapseCount:0,
  stability:null,difficulty:null,retrievability:null,lastEventId:null,lastDecision:null};
}
export function applySimpleSpacing(state,{eventId,at,kind,observation=null}){
 if(state.schedulerVersion!==SIMPLE_SPACING_VERSION||!eventId||
   !Number.isSafeInteger(at)||at<1600000000000||!['exposure','retrieval','practice-error'].includes(kind))
  throw Error('Invalid memory transition');
 const next={...state,lastEventId:eventId};
 // A wrong answer in an approved thematic pack is a reason to rehearse,
 // not verified mastery evidence. Keep it separate from the trusted reviewer.
 if(kind==='practice-error'){
  next.status='learning';next.intervalMs=MEMORY_DAY_MS;next.dueAt=at+MEMORY_DAY_MS;
  next.lastExposureAt=at;next.lastDecision='practice-error-next-day';
  next.lastPracticeErrorAt=at;
  next.eligibleSuccessCount=0;next.practiceErrorCount=(next.practiceErrorCount||0)+1;
  return next;
 }
 if(kind==='exposure'){
  next.lastExposureAt=at;next.lastDecision='exposure-only';
  if(next.dueAt===null){next.dueAt=at+MEMORY_DAY_MS;next.intervalMs=MEMORY_DAY_MS;next.status='learning'}
  return next;
 }
 // Missing presentation/grade, technical failures and caller flags cannot
 // manufacture an eligible observation. The adapter consumes the full contract.
 if(!observation||observation.validity!=='valid'||
   observation.dataClass!==state.sourceClass||!observation.task?.memoryEligible||
   !['correct','incorrect'].includes(observation.outcome)){
  next.lastDecision='not-gradeable';return next;
 }
 if(observation.outcome==='incorrect'){
  next.status='learning';next.intervalMs=MEMORY_DAY_MS;next.dueAt=at+MEMORY_DAY_MS;
  next.lapseCount++;next.lastExposureAt=at;next.lastDecision='failure-next-day';
  // Relearning starts with a one-day independent check, then doubles again.
  next.eligibleSuccessCount=0;return next;
 }
 if(!memoryEligible(observation)){
  next.lastDecision='assisted-or-exposed';return next;
 }
 if(state.dueAt!==null&&at<state.dueAt){
  next.lastDecision='early-practice';return next;
 }
 next.intervalMs=state.eligibleSuccessCount===0?MEMORY_DAY_MS:
  Math.min(30*MEMORY_DAY_MS,Math.max(MEMORY_DAY_MS,(state.intervalMs||MEMORY_DAY_MS)*2));
 next.dueAt=at+next.intervalMs;next.lastEligibleReviewAt=at;
 // Only an actual due independent check resolves a past pack mistake.
 next.lastPracticeErrorAt=null;
 next.eligibleSuccessCount++;next.status='review';next.lastDecision='due-independent-success';
 return next;
}
