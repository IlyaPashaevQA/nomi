import {shouldPracticeHebrewWord} from './hebrew-known-word-policy.mjs';
import {createLanguageDailyPlan} from './language-daily-queue.mjs';

// Authorized Ilia learner wrapper over the SAME planner and same task bank as
// Dasha. A ten-word INTRO batch is a per-SESSION workload ceiling, not a daily
// limit: returning for another 10-minute session can introduce more words.
// Do not edit checksum-pinned hebrew-pack-catalog.mjs for profile variations.
export function ownerHebrewDailyStart(words,{introduced=new Set(),perSessionNew=10,events=[],now=Date.now()}={}){
 if(!Array.isArray(words)||!Number.isSafeInteger(perSessionNew)||perSessionNew<0||perSessionNew>10)
  throw Error('Invalid owner Hebrew lesson batch');
 const active=words.filter(w=>shouldPracticeHebrewWord(w,events,now));
 const selected=createLanguageDailyPlan({personId:'ilia',now,language:'he',
  newWordOrder:'priority-fifo',maxTasks:Math.max(1,active.length),maxNew:perSessionNew,
  languageCaps:{he:perSessionNew,en:perSessionNew},newWordsUsed:{he:0,en:0},
  candidates:active.map(w=>({personId:'ilia',language:'he',lexemeId:w.id,state:'unknown',
   introduced:introduced.has(w.target),evidenceClass:'learner',contentStatus:'released',
   priority:(w.reviewOnly?1000:0)+w.priority,packAddedAt:Math.max(0,w.packAddedAt+1),cardIndex:w.cardIndex}))});
 const ids=new Set(selected.selected.filter(x=>x.kind==='introduce').map(x=>x.lexemeId));
 const intro=active.filter(w=>ids.has(w.id));
 const plan=active.filter(w=>introduced.has(w.target)||ids.has(w.id)).map(w=>({
  wordId:w.id,contentSha256:w.contentSha256,priority:w.priority}));
 return {version:1,sessionId:globalThis.crypto.randomUUID(),status:'active',startedAt:now,
  plan,introIds:intro.map(w=>w.id),current:null,sequence:0,
  runtime:{elapsedMs:0,pauses:[],phase:'between',feedbackMs:0},reason:null};
}
