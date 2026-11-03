// Shared source-form adapter. All controls are the approved existing mechanics.
import {mountWordIntroduction} from './word-introduction.mjs';
import {mountWordStage} from './word-loop-renderers.mjs';
import {mountReadingUnitTask,ensureReadingTaskStyles} from './reading-unit-task-ui.mjs';
import {mountSchoolWrittenInput} from './school-written-input.mjs';
import {readingCardAsset} from './reading-unit-preparation.mjs';

export function mountReadingPreparationTask(host,{question:q,cards,onAnswer,answerFor,
 trialIndex=0,initialTokens=[],onChange=()=>{},initialHintUsed=false,
 onHintUsed=()=>{},onTechnicalFailure=()=>{},introductionOptions={},audioEnabled=true}){
 ensureReadingTaskStyles();
 let tool=null,disposed=false,submitted=false;
 const hint=q.supported===true||initialHintUsed===true;
 const submit=async(response,audioEvidence=null)=>{
  if(disposed||submitted)return;submitted=true;
  try{await onAnswer(answerFor({questionId:q.id,response,hintUsed:hint,audioEvidence}))}
  catch(error){submitted=false;throw error}
 };
 host.className='';host.lang='he';host.dir='rtl';host.dataset.readingTask=q.id;
 const card=cards.find(c=>c.id===q.cardId);
 if(q.kind==='card'){
  tool=mountWordIntroduction(host,readingCardAsset(card),{
   presentationVersion:'intro-01',minimumExposureMs:1500,
   ...introductionOptions,onAudioError:onTechnicalFailure,onContinue:()=>void submit('viewed')});
  host.classList.add('nomi-reading-preparation');
 }else if(q.kind==='word'){
  const asset=readingCardAsset({...card,audioSha256:q.audioSha256});
  tool=mountWordStage(host,{language:'he',asset,stage:q.stage,
   choices:q.choiceCardIds.map(id=>readingCardAsset(cards.find(c=>c.id===id))),
   trialIndex,requireAuditoryPlayback:true,externalFeedback:true,audioEnabled,onTechnicalFailure,
   onResult:r=>void submit(r.value,r.audioEvidence)});
 }else if(q.kind==='number'){
  // Same school input as number-daily-ui. This measures written number form,
  // never a choice recognition or vocabulary score.
  host.className='nomi-reading-task';
  const title=document.createElement('h2');title.textContent=q.prompt;
  const source=document.createElement('p');source.className='nomi-number-stimulus';source.textContent=q.from;
  const work=document.createElement('div');work.className='nomi-reading-task-work';
  const status=document.createElement('p');status.setAttribute('role','status');
  host.replaceChildren(title,source,work,status);
  tool=mountSchoolWrittenInput(work,{initialValue:initialTokens[0]||'',onChange:value=>onChange([value]),
   onSubmit:async value=>{status.textContent='שׁוֹמְרִים…';try{await submit(value)}catch{status.textContent='נַסִּי שׁוּב'}}});
 }else{
  tool=mountReadingUnitTask(host,{
   question:{...q,question:[q.prompt,q.stimulus].filter(Boolean).join('\n'),
    kind:q.kind==='choice'?'choice':'constructor',options:q.choices,
    excerpt:{text:q.context||(Array.isArray(q.expected)?q.expected.join('\n'):card?.pointed||q.expected)||''},
    constructorMode:q.kind==='letters'?'letters':q.kind==='sequence'?'text':'sentence',
    numberedSlots:q.kind==='sequence',target:q.kind==='letters'?q.expected:null},
   initialTokens,onChange,initialHintUsed:hint,onHintUsed,
   answerFor:({response,hintUsed})=>answerFor({questionId:q.id,response,hintUsed}),
   trialIndex,onAnswer});
 }
 host.dataset.readingTask=q.id;
 return {destroy(){disposed=true;tool?.destroy?.()}};
}
