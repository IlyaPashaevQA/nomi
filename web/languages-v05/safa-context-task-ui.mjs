// Content lookup and result envelope only. No Safa renderer, CSS or progression.
import {SAFA_CONTEXT as C,SAFA_CONTEXT_REF as REF,safaContextTask,gradeSafaContext} from './safa-context-catalog.mjs';
import {SAFA_FULL_CARDS as CARDS} from './safa-cave-full-cards.mjs';
import {readingCardAsset} from './reading-unit-preparation.mjs';
import {mountReadingPreparationTask} from './reading-unit-preparation-ui.mjs';
export function safaContextAnswer({questionId,response,hintUsed=false,audioEvidence=null}={}){
 const q=safaContextTask(questionId);
 if(!q||typeof hintUsed!=='boolean')throw Error('Invalid Safa observation');
 const assisted=hintUsed||q.supported===true;
 return {correct:gradeSafaContext(q,response),assisted,detail:{
  mode:'safa-context',readingRef:REF,readingVersion:C.version,questionId:q.id,
  kind:q.kind,skill:q.skill,unitIds:q.unitIds||[],response,hintUsed:assisted,
  countsAsWordMastery:false,...(q.kind==='word'&&q.stage.startsWith('audio')?{audioEvidence}:{})}};
}
export function mountSafaContextTask(host,options={}){
 const q=safaContextTask(options.taskId);
 if(!q||!host)throw Error('Unknown Safa task');
 host.dataset.safaContextTask=q.id;
 return mountReadingPreparationTask(host,{...options,question:q,cards:CARDS,answerFor:safaContextAnswer});
}

export function safaContextTaskMedia(task){
 const q=safaContextTask(task?.readingTask?.questionId);
 const c=CARDS.find(c=>c.id===q?.cardId||q?.kind==='number'&&c.pointed===q.expected);
 return c?readingCardAsset(c):null;
}
