import {wordChoiceCompatible} from './word-loop-semantics.mjs';
import {ALPHA20_COURSE} from './alpha20-course.mjs';
import {AUTUMN_TARGETS} from './dasha-hebrew-autumn-course-v1.mjs';
import {HEBREW_LESSON1_TARGETS} from './word-loop-assets.mjs';
import {createLanguageDailyPlan} from './language-daily-queue.mjs';
import {shouldPracticeHebrewWord} from './hebrew-known-word-policy.mjs';
import {pictureChoiceAllowed} from './russian-meaning-choice.mjs';
export const WINTER_PICTURE_OVERRIDE=Object.freeze({target:'חורף',sourceId:'he:חורף',sourceSha256:'733d30e39c7db22d750e5e63df63f50cf2744b08f55b63812715bc15fb72a4bc',imageChoiceSafe:false});
export const effectiveImageChoiceSafe=w=>pictureChoiceAllowed({target:w?.target,sourceId:w?.id,sourceSha256:w?.sourceImageSha256||w?.imageSha256},WINTER_PICTURE_OVERRIDE)&&w?.imageChoiceSafe!==false;
export const STARTER_GROUPS=Object.freeze([
 {id:'family',title:'המשפחה והבית',words:['אמא','אבא','ילד','ילדה','בית']},
 {id:'classroom',title:'בכיתה',words:['ספר','כיתה','מורה','קורא','קוראת']},
 {id:'nature',title:'חיות וטבע',words:['כלב','חתול','דג','עץ','פרח']},
 {id:'after-school',title:'אחרי הלימודים',words:['ילקוט','כדור','מים','לחם','שותה']},
].map(x=>Object.freeze({...x,words:Object.freeze(x.words)})));
const art=id=>'./assets/nomi-v2/home/pack-'+id+'-r7.webp?v=1';
export const HEBREW_PACKS=Object.freeze([
 ...STARTER_GROUPS.map((x,index)=>({...x,id:'starter-'+x.id,family:'starter',index,art:art(x.id),route:'pack/starter-'+x.id})),
 ...[0,1].map(index=>({id:'autumn-'+index,title:index?'סתיו — פרחים וציפורים':'סתיו — בגן',family:'autumn',index,words:AUTUMN_TARGETS.slice(index*5,index*5+5).map(x=>x.word),art:art(index?'autumn-flowers':'autumn-garden'),route:'pack/autumn-'+index})),
 {id:'sukkot-plants',title:'סוכות — ארבעת המינים',family:'sukkot',words:['אתרוג','הדס','ערבה','לולב','סכה'],art:art('sukkot-plants'),route:'pack/sukkot-plants'},
 {id:'sukkot-building',title:'סוכות — בונים סוכה',family:'sukkot',words:['סכה','סכך','פטיש','מסמר','לולב'],art:art('sukkot-building'),route:'pack/sukkot-building'},
].map(x=>Object.freeze({...x,words:Object.freeze(x.words)})));
export const HEBREW_STARTER_COURSE=Object.freeze({
 ...ALPHA20_COURSE,revision:'starter-themed-five-20261008-v1',title:'מילים ראשונות',
 blocks:STARTER_GROUPS.map(group=>{
  const id='starter-v1-'+group.id,tasks=[],add=(suffix,mechanic,targets,detail={})=>tasks.push({id:id+'-'+suffix,mechanic,targets,qa:'teaching-only',countsAsEvidence:false,...detail});
  group.words.forEach((word,i)=>add('intro-'+i,'intro',[word]));
  group.words.forEach((word,i)=>add('picture-'+i,'meaning-picture',[word],{choices:[...group.words]}));
  group.words.slice(0,3).forEach((word,i)=>add('sound-'+i,'audio-picture',[word],{choices:[...group.words]}));
  group.words.slice(0,2).forEach((word,i)=>add('build-'+i,'constructor',[word],{mode:'letters',units:Array.from(word),answer:word}));
  return {id,title:group.title,words:[...group.words],tasks,stopRule:'Short five-word practice; teaching history only'};
 })
});
export function hebrewPack(id){return HEBREW_PACKS.find(x=>x.id===id)||null}
export function validateHebrewPackCatalog(){
 if(HEBREW_PACKS.some(x=>x.words.length!==5))throw Error('Every pack must contain five words');
 const initial=STARTER_GROUPS.flatMap(x=>x.words),required=ALPHA20_COURSE.vocabulary.map(x=>x.target);
 if(new Set(initial).size!==20||initial.some(x=>!required.includes(x)))throw Error('Starter must preserve all twenty words exactly once');
 if(HEBREW_PACKS.filter(x=>x.family==='sukkot').some(x=>x.words.some(w=>!HEBREW_LESSON1_TARGETS.includes(w))))throw Error('Unreviewed Sukkot word');
 return {packs:HEBREW_PACKS.length,uniqueWords:new Set(HEBREW_PACKS.flatMap(x=>x.words)).size};
}
validateHebrewPackCatalog();


// Adapt approved cards to the existing Alpha20 renderer/store. No copied words
// or parallel course history: original word IDs are retained in event detail.
// Optional authored load cap; it does not alter daily limits or review eligibility.
function capContentIntroductions(words,introduced){
 const counts=new Map();
 return [...words].sort((a,b)=>(b.priority||0)-(a.priority||0)||(a.packAddedAt||0)-(b.packAddedAt||0)||(a.cardIndex||0)-(b.cardIndex||0)).filter(w=>{
  if(introduced.has(w.target)||!w.introductionGroup)return true;
  if(!Number.isSafeInteger(w.maxNewPerLesson)||w.maxNewPerLesson<1)throw Error('Invalid content introduction cap');
  const n=counts.get(w.introductionGroup)||0;if(n>=w.maxNewPerLesson)return false;
  counts.set(w.introductionGroup,n+1);return true;
 });
}
export function approvedHebrewCourse(pack,{introduced=new Set(),remainingNew=10}={}){
 const known=word=>introduced.has(word.target);
 const selected=capContentIntroductions(pack.words,introduced).filter(w=>known(w)||remainingNew-->0);
 const tasks=[],words=selected.map(w=>w.target);
 for(const w of selected){
  const stamp={wordId:w.id,contentSha256:w.contentSha256,packId:pack.id};
  const id='access:'+w.id+':'+w.contentSha256.slice(0,12);
  const add=(stage,detail={})=>tasks.push({id:id+':'+stage,mechanic:stage,targets:[w.target],contentAccess:stamp,qa:'teaching-only',countsAsEvidence:false,...detail});
  if(!known(w))add('intro');
 }
 for(const stage of ['meaning-picture','audio-picture','audio-word','constructor'])for(const w of selected){
  if(stage.includes('picture')&&(!w.image||w.imageChoiceSafe===false)||stage==='audio-word'&&(!w.audioSrc||w.image&&w.imageChoiceSafe!==false)||stage==='constructor'&&(w.allowBuild===false||w.target.includes(' ')))continue;
  const options=selected.filter(x=>wordChoiceCompatible(w,x)&&(stage.includes('picture')?x.image&&x.imageChoiceSafe!==false:true));
  if(stage!=='constructor'&&options.length<2)continue;
  const stamp={wordId:w.id,contentSha256:w.contentSha256,packId:pack.id};
  tasks.push({id:'access:'+w.id+':'+w.contentSha256.slice(0,12)+':'+stage,
    mechanic:stage,targets:[w.target],choices:options.map(x=>x.target),contentAccess:stamp,
    qa:'teaching-only',countsAsEvidence:false,
    ...(stage==='constructor'?{mode:'letters',units:[...w.target],answer:w.target,displayAnswer:w.displayTarget}:{})});
 }
 return {id:'he-alpha20',revision:'approved-packs-v1',direction:'rtl',introPresentation:'intro-01',accessVersion:1,
  blocks:[{id:'access:'+pack.id,title:pack.title,words,tasks}],vocabulary:selected};
}


// One language plan over the existing admitted catalogue. Packs contribute
// content/priority only; identity, timing and history remain shared.
export function hebrewDailyWords(packs){
 const byId=new Map();
 for(const [pi,p] of packs.entries())for(const [wi,w] of p.words.entries()){
  const priority=({torah:3,school:2,additional:1})[p.priority]??(Number.isFinite(p.priority)?p.priority:/torah/i.test(p.id)?3:/school|safa/i.test(p.id)?2:1);
  const row={...w,packId:p.id,priority,packAddedAt:p.addedAt??p.fifo??pi,cardIndex:wi};
  const prior=byId.get(w.id);
  if(prior&&prior.contentSha256!==w.contentSha256)throw Error('Conflicting Hebrew card versions');
  if(!prior||row.priority>prior.priority)byId.set(w.id,row);
 }
 return [...byId.values()].sort((a,b)=>b.priority-a.priority||a.packAddedAt-b.packAddedAt||a.cardIndex-b.cardIndex);
}
export function hebrewDailyStart(words,{introduced=new Set(),remainingNew=10,events=[]}={},now=Date.now()){
 const active=capContentIntroductions(words.filter(w=>shouldPracticeHebrewWord(w,events,now)),introduced);
 const selected=createLanguageDailyPlan({personId:'dasha',now,language:'he',newWordOrder:'priority-fifo',maxTasks:Math.max(1,active.length),maxNew:remainingNew,
  // remainingNew is already the server policy minus today's first encounters.
  languageCaps:{he:remainingNew,en:0},newWordsUsed:{he:0,en:0},candidates:active.map(w=>({
   personId:'dasha',language:'he',lexemeId:w.id,state:'unknown',introduced:introduced.has(w.target),evidenceClass:'learner',
   contentStatus:'released',priority:w.priority,packAddedAt:Math.max(0,w.packAddedAt+1),cardIndex:w.cardIndex}))});
 const ids=new Set(selected.selected.filter(x=>x.kind==='introduce').map(x=>x.lexemeId));
 const intro=active.filter(w=>ids.has(w.id));
 const plan=active.filter(w=>introduced.has(w.target)||intro.includes(w)).map(w=>({
  wordId:w.id,contentSha256:w.contentSha256,priority:w.priority}));
 return {version:1,sessionId:globalThis.crypto.randomUUID(),status:'active',startedAt:now,
  plan,introIds:intro.map(w=>w.id),current:null,sequence:0,
  runtime:{elapsedMs:0,pauses:[],phase:'between',feedbackMs:0},reason:null};
}
export function hebrewDailyTask(p,words,events,{remainingNew=10,memory={},minimumChoices=2,now=Date.now()}={}){
 const admitted=words.filter(w=>p.plan.some(x=>x.wordId===w.id&&x.contentSha256===w.contentSha256));
 const introduced=new Set(events.filter(e=>e.mechanic==='intro'&&e.completed).flatMap(e=>e.targets||[]));
 const history=events.filter(e=>e.sessionId===p.sessionId&&e.correct!==null&&typeof e.correct==='boolean');
 const wrong=new Map();for(const e of history)if(e.correct===false)for(const t of e.targets||[])wrong.set(t,(wrong.get(t)||0)+1);
 const usable=admitted.filter(w=>(wrong.get(w.target)||0)<3);
 const intro=remainingNew>0?usable.find(w=>p.introIds.includes(w.id)&&!introduced.has(w.target)):null;
 const task=(w,mechanic,choices=[])=>({id:'daily-he:'+p.sessionId+':'+p.sequence,
  mechanic,targets:[w.target],choices,contentAccess:{wordId:w.id,contentSha256:w.contentSha256,packId:w.packId},
  ...(mechanic==='ru-meaning-word'?{promptAudio:{...w.russianMeaningAudio}}:{}),
  ...(mechanic==='constructor'?{mode:'letters',units:[...w.target],answer:w.target,displayAnswer:w.displayTarget}:{}),
  countsAsEvidence:false});
 if(intro)return task(intro,'intro');
 const known=usable.filter(w=>!p.introIds.includes(w.id)||introduced.has(w.target));
 const eligible=known.filter(w=>{
  const i=history.findLastIndex(e=>e.targets?.includes(w.target)&&(e.correct===false||e.assisted));
  return i<0||new Set(history.slice(i+1).filter(e=>!e.targets?.includes(w.target)).map(e=>e.taskId)).size>=3;
 });
 const last=history.at(-1),lastTwo=history.slice(-2),count=(w,stage=null)=>history.filter(e=>e.targets?.includes(w.target)&&(!stage||e.mechanic===stage)).length;
 // Shared usage groups balance forms of one lexeme without propagating grades.
 const groupOf=new Map(known.map(w=>[w.target,w.practiceGroup||w.id]));
 const groupCount=w=>history.filter(e=>e.targets?.some(t=>groupOf.get(t)===(w.practiceGroup||w.id))).length;
 let options=eligible.flatMap(w=>{
  const distinct=known.filter(x=>effectiveImageChoiceSafe(x)&&wordChoiceCompatible(w,x)&&(x.id===w.id||x.image!==w.image&&x.displayTarget!==w.displayTarget));
  const textChoices=known.filter(x=>wordChoiceCompatible(w,x)&&(x.id===w.id||x.displayTarget!==w.displayTarget));
  const kinds=[],minimum=w.choiceCohort?2:minimumChoices;
  const pictures=distinct.filter(x=>x.image);
  if(effectiveImageChoiceSafe(w)&&w.image&&pictures.length>=minimum)kinds.push('meaning-picture');
  if(effectiveImageChoiceSafe(w)&&w.image&&distinct.length>=minimum)kinds.push('picture-word');
  if(effectiveImageChoiceSafe(w)&&w.audioSrc&&w.image&&pictures.length>=minimum)kinds.push('audio-picture');
  if(w.audioSrc&&textChoices.length>=minimum)kinds.push('audio-word');
  if(w.russianMeaningAudio?.src&&w.russianMeaningAudio?.sha256&&w.russianMeaningAudio?.version&&textChoices.length>=4)kinds.push('ru-meaning-word');
  if(w.allowBuild!==false&&w.target&&!w.target.includes(' ')&&w.displayTarget)kinds.push('constructor');
  // Due reviews lead; optional early practice remains available in another
  // same-day lesson. Only a due independent answer can extend the interval.
  return kinds.map(stage=>({w,stage,choices:[w.target,...(['audio-word','ru-meaning-word'].includes(stage)?textChoices:distinct).filter(x=>x.id!==w.id).map(x=>x.target)].slice(0,4)}));
 });
 // The first four active minutes favour the admitted Torah words, while later
 // selection returns to overdue/new-word practice. Admission always wins.
 if(p.runtime.elapsedMs<240000&&options.some(x=>x.w.priority>=3))options=options.filter(x=>x.w.priority>=3);
 // First practice belongs to this lesson even when INTRO schedules tomorrow's
 // independent recall. Keep the full admitted pool for valid distractors.
 const introducedHere=new Set(events.filter(e=>e.sessionId===p.sessionId&&
  e.mechanic==='intro'&&e.completed===true&&e.detail?.contentAccess)
  .map(e=>e.detail.contentAccess.wordId+'|'+e.detail.contentAccess.contentSha256));
 const firstPractice=options.filter(x=>introducedHere.has(x.w.id+'|'+x.w.contentSha256)&&count(x.w)===0);
 if(firstPractice.length){
  const recognition=firstPractice.filter(x=>x.stage!=='constructor');
  options=recognition.length?recognition:firstPractice;
 }
 if(options.some(x=>!last?.targets?.includes(x.w.target)))options=options.filter(x=>!last?.targets?.includes(x.w.target));
 if(lastTwo.length===2&&lastTwo[0].mechanic===lastTwo[1].mechanic&&options.some(x=>x.stage!==lastTwo[1].mechanic))options=options.filter(x=>x.stage!==lastTwo[1].mechanic);
 const due=x=>memory[x.w.id+'|'+x.stage]?.dueAt??0;
 options.sort((a,b)=>Number(due(b)<=now)-Number(due(a)<=now)||groupCount(a.w)-groupCount(b.w)||count(a.w)-count(b.w)||count(a.w,a.stage)-count(b.w,b.stage)||a.w.cardIndex-b.w.cardIndex||a.stage.localeCompare(b.stage));
 const selected=options[0];return selected?task(selected.w,selected.stage,selected.choices):null;
}


export function hebrewDailyPictureTaskSafe(task,words){
 if(!['meaning-picture','audio-picture','picture-word'].includes(task?.mechanic))return true;
 const targets=[...(task.targets||[]),...(task.mechanic==='picture-word'?[]:task.choices||[])];
 return targets.every(target=>{const word=words.find(w=>w.target===target);return !!word&&effectiveImageChoiceSafe(word)});
}
