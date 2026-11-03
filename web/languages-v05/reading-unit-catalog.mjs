import {SAFA_CONTEXT} from './safa-context-catalog.mjs';
// Versioned reading-material refs. Karmel is a released school reading
// source; Safa is an OWNER-ONLY unpublished source without learner words/media.
// Neither material creates a separate learning runner or lexical identity.
import {KARMEL_PAGE15} from './karmel-page15-activities.mjs';

export const READING_UNIT_REVISION='reading-units-20261027-v2';
export const KARMEL_READING_REF='reading:karmel-glasses-v1';
export const SAFA_READING_REF='reading:safa-cave-v1';
export const KARMEL_TASK_VERSION='karmel-reading-timed-20261022-v1';
export const KARMEL_READY_VERSION='karmel-reading-with-parent-20261022-v1';

export const READING_UNITS=Object.freeze([]);

// Deliberately SHORT, source-matched context, not replacement pages.
// The full copyrighted original stays at the official source link. Confirmed
// against publicly accessible Kotar HTML text on 22 October 2026; human
// learner UX QA remains open.
export const KARMEL_READING_EXCERPTS=Object.freeze({});

export const KARMEL_ORDER_THREE=Object.freeze([]);

export const KARMEL_READING_TASKS=Object.freeze([]);

export function karmelReadingTask(id){return KARMEL_READING_TASKS.find(q=>q.id===id)||null;}
export function isReadingAnswerValid(task,response){
 if(!task)return false;
 if(task.kind==='choice')return typeof response==='string'&&task.options.includes(response);
 if(task.kind==='two')return Array.isArray(response)&&response.length===2&&
   response.every(x=>Number.isInteger(x)&&x>=0&&x<task.options.length)&&
   new Set(response).size===2&&response[0]<response[1];
 if(task.kind==='discussion')return response==='discussed';
 if(task.kind==='constructor')return Array.isArray(response)&&response.length===3&&
   response.every(x=>typeof x==='string')&&response.every(x=>task.expected.includes(x))&&
   new Set(response).size===3;
 return false;
}
export function gradeKarmelReading(task,response){
 if(!isReadingAnswerValid(task,response))throw Error('Invalid reading response');
 if(task.kind==='discussion')return null;
 if(task.kind==='choice')return response===task.answer;
 if(task.kind==='two')return task.answerIndexes.every((value,i)=>value===response[i]);
 return task.expected.every((value,i)=>value===response[i]);
}
// Scheduled questions are saved inside the common HE daily contract,
// whose event.courseRevision is "he-daily-v1". Reading identity therefore
// lives in detail.readingVersion / readingRef, not courseRevision alone.
export function isRecordedKarmelQuestion(event){
 const detail=event?.detail;
 return event?.completed===true &&
  detail?.readingVersion===KARMEL_TASK_VERSION &&
  KARMEL_READING_TASKS.some(q=>q.id===detail.questionId) &&
  (detail.readingRef===KARMEL_READING_REF ||
   detail.readingUnitId===KARMEL_READING_REF ||
   event.courseRevision===KARMEL_TASK_VERSION);
}

export function readingHistoryStatus(events=[],id=KARMEL_READING_REF){
 const marked=events.some(e=>e?.courseRevision===KARMEL_READY_VERSION&&
  e.taskId==='reading:karmel:read-with-parent'&&e.correct===null&&
  e.completed===true&&e.detail?.readingUnitId===id);
 const attempts=id===KARMEL_READING_REF?
  events.filter(isRecordedKarmelQuestion):[];
 return {marked,attempts:attempts.length,independentCorrect:attempts.filter(e=>e.correct===true&&!e.assisted).length,
  assistedCorrect:attempts.filter(e=>e.correct===true&&e.assisted).length};
}


// Shared existing reading policy; content adapters do not invent intervals.
export const READING_DAILY_MAX=2;
export function readingReviewDueAt(latest,parentReadingAt=0){
 if(!latest)return 0;
 return parentReadingAt>latest.at?parentReadingAt:
  latest.at+(latest.correct===true?24:3)*3600000;
}
export function isReadingComprehensionAttempt(e){
 if(e?.completed!==true)return false;
 const d=e.detail||{};
 return isRecordedKarmelQuestion(e)||d.mode==='reading-comprehension'||d.mode==='safa-context'&&
  (d.kind==='sequence'||d.kind==='choice'&&
   (d.skill?.startsWith('he.reading.')||d.skill==='he.verb.meaning'));
}
