// Safa contributes content references to the shared preparation adapter.
import {SAFA_CONTEXT as C,SAFA_CONTEXT_REF as REF,safaContextTask,safaContextMechanic} from './safa-context-catalog.mjs';
import {SAFA_FULL_CARDS as CARDS} from './safa-cave-full-cards.mjs';
import {chooseReadingPreparation} from './reading-unit-preparation.mjs';
import {RUSSIAN_MEANING_AUDIO_SOURCES} from './russian-meaning-audio-sources.mjs';
export const safaContextAdmitted=plan=>plan?.readingUnits?.some(r=>r.id===REF&&r.version===C.version)===true;
export function isScheduledSafaTask(t){
 const q=safaContextTask(t?.readingTask?.questionId);
 return !!q&&t.mode==='safa-context'&&t.readingTask.unitId===REF&&t.readingTask.version===C.version&&t.readingTask.kind===q.kind&&t.mechanic===safaContextMechanic(q)&&Array.isArray(t.targets)&&!t.targets.length&&Array.isArray(t.choices)&&!t.choices.length&&!t.contentAccess&&typeof t.id==='string';
}
const order=[...C.tasks.filter(q=>q.kind==='card').map(q=>q.cardId)];
const words=CARDS.map(c=>({...c,id:c.id,target:c.pointed,displayTarget:c.pointed,packId:REF,practiceGroup:c.learningObjectId,cardIndex:order.indexOf(c.id),allowBuild:false}));
export function safaRussianMeaningAdapter(plan,sourceMap=RUSSIAN_MEANING_AUDIO_SOURCES){
 const card=CARDS.find(c=>c.id==='safa-card:form-15-1');if(!card)return null;
 const source=sourceMap[card.id+'|'+card.contentSha256];
 if(source?.status!=='ready'||!source.src||!/^[a-f0-9]{64}$/.test(source.sha256||'')||!source.version)return null;
 const choices=[card,...CARDS.filter(c=>c.id!==card.id&&c.image===null&&c.pointed!==card.pointed).slice(0,3)];
 if(choices.length!==4)return null;
 return {id:'daily-he:'+plan.sessionId+':'+plan.sequence+':safa-card:form-15-1',mechanic:'ru-meaning-word',mode:'safa-ru-meaning',targets:[card.pointed],choices:choices.map(c=>c.pointed),promptAudio:{src:source.src,sha256:source.sha256,version:source.version,humanQa:source.humanQa||null},sourceAccess:{cardId:card.id,contentSha256:card.contentSha256},countsAsEvidence:false};
}
export function safaRussianMeaningEventDetail(task,detail={}){
 if(task?.mode!=='safa-ru-meaning'||task?.mechanic!=='ru-meaning-word'||!task?.sourceAccess||!task?.promptAudio)return detail;
 return {...detail,mode:'safa-ru-meaning',sourceAccess:{...task.sourceAccess},
  promptAudio:{src:task.promptAudio.src,sha256:task.promptAudio.sha256,version:task.promptAudio.version},
  choices:[...task.choices]};
}
export function safaRussianMeaningUsed(plan,events,sourceMap=RUSSIAN_MEANING_AUDIO_SOURCES){
 const expected=safaRussianMeaningAdapter(plan,sourceMap);if(!expected)return false;
 const attempts=events.filter(e=>e?.sessionId===plan.sessionId&&e?.completed===true&&
  e?.mechanic==='ru-meaning-word'&&e?.detail?.mode==='safa-ru-meaning'&&
  e.detail.sourceAccess?.cardId===expected.sourceAccess.cardId&&
  e.detail.sourceAccess?.contentSha256===expected.sourceAccess.contentSha256&&
  e.detail.promptAudio?.version===expected.promptAudio.version);
 if(!attempts.length)return false;
 if(attempts.some(e=>e.correct===true)||attempts.length>=3)return true;
 const last=events.indexOf(attempts.at(-1));
 return new Set(events.slice(last+1).filter(e=>e?.sessionId===plan.sessionId&&e.completed===true&&typeof e.correct==='boolean'&&e.detail?.mode!=='safa-ru-meaning').map(e=>e.taskId)).size<3;
}
export function isScheduledSafaRussianMeaningTask(t,sourceMap=RUSSIAN_MEANING_AUDIO_SOURCES){
 const card=CARDS.find(c=>c.id==='safa-card:form-15-1'),source=card&&sourceMap?.[card.id+'|'+card.contentSha256];
 return !!card&&source?.status==='ready'&&t?.mode==='safa-ru-meaning'&&t.mechanic==='ru-meaning-word'&&t.sourceAccess?.cardId===card.id&&t.sourceAccess?.contentSha256===card.contentSha256&&t.targets?.length===1&&t.targets[0]===card.pointed&&t.choices?.length===4&&new Set(t.choices).size===4&&t.choices.every(target=>CARDS.some(c=>c.pointed===target))&&t.promptAudio?.src===source.src&&t.promptAudio?.sha256===source.sha256&&t.promptAudio?.version===source.version;
}
export function safaRussianMeaningMedia(task,sourceMap=RUSSIAN_MEANING_AUDIO_SOURCES){
 if(!isScheduledSafaRussianMeaningTask(task,sourceMap))return null;
 const choices=task.choices.map(target=>CARDS.find(c=>c.pointed===target)).map(c=>({id:c.id,target:c.pointed,displayTarget:c.pointed,meaning:c.meaningEn,meaningRu:c.meaningRu,semanticAnchor:c.semanticAnchor,audioSrc:c.audioSrc,audioSha256:c.audioSha256||null}));
 return {asset:choices.find(c=>c.target===task.targets[0]),choices};
}
export function chooseSafaContextTask(plan,events,{now=Date.now(),allowConsecutive=false,introductionOnly=false}={}){
 const q=chooseReadingPreparation({plan,events,now,words,ordinaryAvailable:!allowConsecutive,introductionOnly,unit:{id:REF,version:C.version,historyVersions:[C.version,C.legacyVersion],tasks:C.tasks,readTaskId:'reading:safa:read-with-parent',readyVersion:C.readyVersion}});
 return q?{id:'daily-he:'+plan.sessionId+':'+plan.sequence,mechanic:safaContextMechanic(q),mode:'safa-context',readingTask:{unitId:REF,questionId:q.id,version:C.version,kind:q.kind},targets:[],choices:[],countsAsEvidence:false}:null;
}
export function safaReadinessEvent({deviceId,sessionId,eventId=globalThis.crypto.randomUUID(),at=Date.now()}={}){
 if(!deviceId||!sessionId||!Number.isSafeInteger(at)||at<=0)throw Error('Invalid reading identity');
 return {schema:1,eventId,attemptId:eventId,sessionId,deviceId,courseId:'he-alpha20',courseRevision:C.readyVersion,blockId:REF,taskId:'reading:safa:read-with-parent',mechanic:'read-with-parent',targets:[],correct:null,completed:true,assisted:true,countsAsEvidence:false,at,detail:{kind:'parent-reading-checkpoint',readingUnitId:REF,readWithParent:true,wordMasteryClaim:false}};
}
export function adoptSafaContextAdmission(plan,readingUnits=[]){
 if(!plan||!readingUnits.some(r=>r.id===REF&&r.version===C.version)||safaContextAdmitted(plan))return plan;
 const stale=plan.current?.mode==='safa-context'&&plan.current.readingTask?.version===C.legacyVersion;
 return {...plan,readingUnits:[{id:REF,version:C.version}],...(stale?{
  current:null,draft:[],sequence:plan.sequence+1,
  runtime:{...plan.runtime,phase:'between',feedbackMs:0}
 }:{})};
}
