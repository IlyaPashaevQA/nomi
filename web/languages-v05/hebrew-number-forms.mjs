// Shared Hebrew morphology references. A presentation/scaffold over existing
// lexical identities; not a new pack, a learner event, or an automatic mastery.
// Each form is checked against a cited dictionary form. The school practice
// already offers writing the plural from singular and the reverse.
export const HEBREW_NUMBER_FORMS_VERSION='he-number-forms-20261021-v1';

const PAIRS=Object.freeze([
 ['עין','עַיִן','עיניים','עֵינַיִם','body-paired','https://www.pealim.com/he/dict/5022-ayin/'],
 ['אוזן','אֹזֶן','אוזניים','אָזְנַיִם','body-paired','https://www.pealim.com/he/dict/3203-ozen/'],
 ['יד','יָד','ידיים','יָדַיִם','body-paired','https://www.pealim.com/he/dict/4085-yad/'],
 ['רגל','רֶגֶל','רגליים','רַגְלַיִם','body-paired','https://www.pealim.com/he/dict/3168-regel/'],
 ['שן','שֵׁן','שיניים','שִׁנַּיִם','body-multiple','https://www.pealim.com/he/dict/5719-shen/'],
 ['אצבע','אֶצְבַּע','אצבעות','אֶצְבָּעוֹת','body-multiple','https://www.pealim.com/he/dict/4871-etzba/'],
 ['נעל','נַעַל','נעליים','נַעְלַיִם','clothing-paired','https://www.pealim.com/he/dict/4287-naal/'],
 ['גרב','גֶּרֶב','גרביים','גַּרְבַּיִם','clothing-paired','https://www.pealim.com/he/dict/3107-gerev/'],
 ['ענב','עֵנָב','ענבים','עֲנָבִים','ordinary-plural','https://www.pealim.com/he/dict/7002-enav/'],
].map(([singular,singularPointed,plural,pluralPointed,kind,sourceUrl])=>Object.freeze({
 singular,singularPointed,plural,pluralPointed,kind,sourceUrl,
 supportsBothDirections:true,numberSkill:'he.noun-number'
})));

const pluralOnly=Object.freeze({
 'משקפיים':Object.freeze({display:'מִשְׁקָפַיִם',kind:'plural-only',note:'משתמשים בדרך כלל בצורת הרבים',numberSkill:null}),
 'מכנסיים':Object.freeze({display:'מִכְנָסַיִם',kind:'plural-only',note:'משתמשים בדרך כלל בצורת הרבים',numberSkill:null}),
});

const references=new Map();
for(const row of PAIRS){
 if(references.has(row.singular)||references.has(row.plural))throw Error('Duplicate number forms');
 references.set(row.singular,row);references.set(row.plural,row);
}
export function plainHebrewForm(value){
 return String(value??'').normalize('NFD').replace(/[\u0591-\u05C7]/g,'').replace(/\s+/g,' ').trim();
}
export function hebrewNumberFormsFor(target){
 const key=plainHebrewForm(target);
 const pair=references.get(key)||PAIRS.find(r=>plainHebrewForm(r.singularPointed)===key||plainHebrewForm(r.pluralPointed)===key);
 if(pair)return Object.freeze({type:'pair',...pair,shownAs:key===pair.plural||key===plainHebrewForm(pair.pluralPointed)?'plural':'singular'});
 const standalone=pluralOnly[key]||Object.values(pluralOnly).find(w=>plainHebrewForm(w.display)===key);
 if(standalone)return Object.freeze({type:'plural-only',...standalone,plural:key});
 return null;
}
export function hebrewNumberFormPractice(target,direction){
 const forms=hebrewNumberFormsFor(target);
 if(!forms||forms.type!=='pair'||!['to-plural','to-singular'].includes(direction))return null;
 const from=direction==='to-plural'?forms.singular:forms.plural;
 const to=direction==='to-plural'?forms.plural:forms.singular;
 return Object.freeze({
  sourceTarget:forms.singular,from,to,direction,
  prompt:direction==='to-plural'?'כתבי את צורת הרבים.':'כתבי את צורת היחיד.',
  taskMode:'input',skill:forms.numberSkill,
  engine:'existing-school-practice-input', // task metadata, not a new mechanic
  evidenceEligible:false, // needs standard catalog task review/admission
 });
}
export const HEBREW_NUMBER_FORM_PAIRS=PAIRS;

// The existing ten-minute constructor journal now uses the same school-input
// surface for this specific skill. A visible introduction of both forms is
// NOT the assessment: the task UI shows only fromPointed and asks for to.
export function hebrewNumberFormDailyTemplate(target,direction){
 const lesson=hebrewNumberFormPractice(target,direction);
 if(!lesson)return null;
 const pair=hebrewNumberFormsFor(target);
 if(pair?.type!=='pair'||pair.singular!==lesson.sourceTarget)return null;
 return Object.freeze({
  version:HEBREW_NUMBER_FORMS_VERSION,
  sourceTarget:lesson.sourceTarget,
  direction:lesson.direction,
  from:lesson.from,
  fromPointed:direction==='to-plural'?pair.singularPointed:pair.pluralPointed,
  to:lesson.to,
  toPointed:direction==='to-plural'?pair.pluralPointed:pair.singularPointed,
  skill:lesson.skill,
  taskMode:lesson.taskMode,
 });
}
export function gradeHebrewNumberForm(task,value){
 if(!task||task.version!==HEBREW_NUMBER_FORMS_VERSION||
    !['to-plural','to-singular'].includes(task.direction)||
    typeof value!=='string'||!value.trim()||value.length>80)throw Error('Invalid noun-number answer');
 const expected=hebrewNumberFormDailyTemplate(task.sourceTarget,task.direction);
 if(!expected||Object.keys(expected).some(k=>task[k]!==expected[k]))throw Error('Invalid or unreviewed noun-number task');
 // The UI teaches the released vowelized form, which can omit matres
 // present in full unpointed spelling (נַעְלַיִם / נעליים). Both exact
 // authored spellings are accepted, including a typed copy without vowels.
 return [plainHebrewForm(expected.to),plainHebrewForm(expected.toPointed)].includes(plainHebrewForm(value));
}

export const HEBREW_GRADE_ADJUDICATION_VERSION='he-grade-adjudications-20261026-v1';
const TECHNICAL_SHOE_EVENTS=new Set([
 '7f362f4c-8e5b-4425-a2fe-4e867307582c',
 '61503caf-de61-4e47-a0ea-00ac63412e0c'
]);
const PARENT_SAFA_SESSION="1dd01cc1-4077-4b71-8de6-dac8d3323ddf";
const PARENT_SAFA_ANSWERS=new Set(["33daebac-37a8-4616-bc7c-b0112279823a", "52127c67-ec9a-4602-b8f3-bd7cd44019a4", "0bf7a0a5-505a-4f09-967e-0eacb51a9549", "f6c76dd9-a473-416e-939a-d888a5c9817f", "8efd37b2-555a-4b00-8bb1-4f8a8db73d0d", "52352450-e43b-43c9-9c7c-98e59e061a4e", "7d2ad95a-ce66-4341-af7a-a8ab7646efd9", "044cccee-03e6-44b5-bf03-c80921905739", "d7c51e42-02d7-4d55-83ae-d696fa7ddaf1", "886d8069-961c-4ea3-90c9-a681ca01e844", "fe64d1e6-696a-46ff-96dc-8a6e235d3c49", "b895074b-8193-4b07-8dcc-42a6c43df92d", "2e79b8d4-418f-4d29-847f-55a75b50db23", "71c583b0-fe84-450b-96f3-11edf8cc4549", "83a82e38-6a63-4e99-8019-fc6936d48f75", "c62d8271-6220-4ef0-9c73-3800c7ba415b", "954a7a3a-23a1-4011-9d73-c7e498aa2197", "29214be9-f721-4569-aa93-79726fdff0d1", "8b2b4651-3866-4615-ab6a-b1ada5bb1e9a", "64f02e0c-e99b-4e1a-83fe-1b7379b56744", "4cebe60b-6000-46e9-b54b-56b2176d382b", "756c0f16-c840-4aba-9e07-66b13eb89990", "f84811fe-a9d2-4b8b-9067-ea5f5bdc002b", "560a5b10-25ae-4734-995b-40694b8e01dd", "5f53f3e0-856e-4f52-91b7-9b8db6d90f69", "a002eead-55f1-4396-b398-2abfbf2eaac7", "6309c7d5-f341-407d-b609-f678442f1fca", "a550bc4b-de39-443b-b9c0-89fc8903becc", "311bffa0-45a9-47ac-a4ff-a144c5b12386", "79d77b9a-f085-4169-af90-06bb90f13a8d", "789b74ba-f8a3-4773-a90d-914d64653536", "b57511a1-d000-48b1-9b22-70a8a53b23a9", "417b5bac-7eae-4c4e-a28a-712daf1c35eb", "448db771-deb9-4d9b-ab4a-3e25611b7c8e", "1a607712-79a9-4ea9-8527-c1c0a12f0c20", "39175d79-adc2-4bef-a77e-63ce8fce75be", "7fc647c8-ec91-4f8b-8baa-9e0dc6c07cd7", "ce80be22-7486-4c1d-865b-e93ac7a84036", "ca57c538-7ec0-46bb-9a03-221ba8221993", "321b193d-f623-4be8-9f9f-2e35018a82dd", "d8652032-c8ea-4168-87ec-cae720f10e12", "28f89e10-8b7b-49f1-b84d-d8838d5d6e14", "5c05bec8-5d58-4429-a01d-a3e3c37e4df4", "5e1a4a46-ce85-4640-bee4-7f25c075745b"]);
export function hebrewGradeAdjudication(event){
 const d=event?.detail,f=d?.wordForm;
 if(PARENT_SAFA_ANSWERS.has(event?.eventId)&&event.sessionId===PARENT_SAFA_SESSION&&
    d?.readingVersion==='safa-context-common-daily-20261027-v1'&&
    d?.questionId?.startsWith('safa-context:meaning:')&&event.completed===true){
  return {version:'parent-answer-attribution-20261027-v1',kind:'parent-answered',
   actor:'ilia',subject:'dasha',source:'owner-statement-in-chat-20261027',
   rawCorrect:event.correct,rawAssisted:event.assisted};
 }
 if(d?.readingVersion==='safa-context-common-daily-20261027-v1'&&
    ['phrase','letters','sentence'].includes(d.kind)&&event.completed===true){
  return {version:'source-model-attribution-20261027-v1',kind:'visible-model',
   reason:'source-model-visible-in-legacy-renderer',rawCorrect:event.correct,
   rawAssisted:event.assisted};
 }
 if(!TECHNICAL_SHOE_EVENTS.has(event?.eventId)||event.correct!==false||
  event.completed!==true||event.targets?.length!==1||event.targets[0]!=='נעל'||
  f?.version!==HEBREW_NUMBER_FORMS_VERSION||f.sourceTarget!=='נעל'||
  f.direction!=='to-plural'||f.to!=='נעליים'||f.toPointed!=='נַעְלַיִם'||
  d?.value!=='נעלים')return null;
 return {version:HEBREW_GRADE_ADJUDICATION_VERSION,kind:'technical',
  reason:'accepted-model-spelling-rejected-by-old-grader',rawCorrect:false};
}
export function effectiveHebrewEvent(event){
 const adjudication=hebrewGradeAdjudication(event);
 return adjudication?{...event,correct:adjudication.kind==='visible-model'?event.correct:null,
  ...(adjudication.kind==='visible-model'||adjudication.kind==='parent-answered'?{assisted:true}:{}),adjudication}:event;
}

// Recovery is derived from the append-only, content-pinned journal. Word
// knowledge, each number direction, and sentence order remain separate.
export const NUMBER_RECOVERY_VERSION='noun-number-recovery-20261025-v1';
const DAY=86400000;
export function numberFormHistory(form,access,events=[],now=Date.now()){
 return events.map(effectiveHebrewEvent).filter(e=>e?.completed===true&&typeof e.correct==='boolean'&&
  Number.isFinite(e.at)&&e.at<=now&&e.targets?.length===1&&e.targets[0]===form.sourceTarget&&
  e.detail?.wordForm?.version===HEBREW_NUMBER_FORMS_VERSION&&
  e.detail.wordForm.sourceTarget===form.sourceTarget&&e.detail.wordForm.direction===form.direction&&
  e.detail?.contentAccess?.wordId===access.wordId&&
  e.detail.contentAccess.contentSha256===access.contentSha256)
  .sort((a,b)=>a.at-b.at||String(a.eventId||'').localeCompare(String(b.eventId||'')));
}
export function numberFormRecovery(form,access,events=[],now=Date.now()){
 const history=numberFormHistory(form,access,events,now);
 const lastError=history.findLast(e=>!e.correct);
 if(!lastError)return {stage:null,errorEventId:null,history};
 const since=history.filter(e=>e.at>lastError.at);
 const independent=since.findLast(e=>e.correct&&!e.assisted);
 if(independent){
  let dueAt=0,interval=0;
  for(const e of since.filter(e=>e.correct&&!e.assisted)){
   if(e.at<dueAt)continue;
   interval=interval?Math.min(30,interval*2):1;dueAt=e.at+interval*DAY;
  }
  return {stage:'review',errorEventId:lastError.eventId,dueAt,intervalDays:interval,history};
 }
 return {stage:since.some(e=>e.correct&&e.assisted)?'recall':'guided',
  errorEventId:lastError.eventId,history};
}
export function numberFormAnswer(task,value,{helpUsed=false}={}){
 const correct=gradeHebrewNumberForm(task.wordForm,value);
 const support=task.numberSupport;
 if(support&&(support.version!==NUMBER_RECOVERY_VERSION||
  !['guided','recall','review'].includes(support.stage)||typeof support.errorEventId!=='string'))
  throw Error('Invalid number recovery stage');
 const modelShown=support?.stage==='guided';
 return {correct,assisted:!!helpUsed||modelShown,detail:{
  value,mode:'noun-number',wordForm:task.wordForm,
  ...(support?{numberRecovery:{...support,modelShown,helpUsed:!!helpUsed||modelShown}}:{})
 }};
}
