// Presentation adapter for SOURCE-LINKED reading tasks. It reuses the
// existing FocusChoice, 2-choice control, and BubbleConstructor. No standalone
// lesson timer or second progress store is created.
import {selectWordChoices} from './word-loop-semantics.mjs';
import {lessonParagraphText} from './lesson-text.mjs';
import {mountFocusChoice} from './focus-choice-ui.mjs';
import {mountBubbleConstructor} from './bubble-constructor-ui.mjs';
import {mountTwoChoice} from './reading-multi-choice-ui.mjs';
import {KARMEL_READING_TASKS,KARMEL_READING_REF,KARMEL_TASK_VERSION,gradeKarmelReading} from './reading-unit-catalog.mjs';
import {KARMEL_PAGE15} from './karmel-page15-activities.mjs';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
export const READING_HINT_CONTRACT='source-fragment-assistance-20261022-v1';

// Reading options can differ only by nikud (learned/taught); their exact
// authored form is the identity, independent of lexical recall normalization.
export function readingChoiceOptions(options,answer,trialIndex=0){
 const item=target=>({target,choiceKey:target.normalize('NFC')});
 return selectWordChoices(item(answer),options.map(item),trialIndex).map(x=>x.target);
}

export function readingAnswer({questionId,response,hintUsed=false}={}){
 const q=KARMEL_READING_TASKS.find(x=>x.id===questionId);
 if(!q||typeof hintUsed!=='boolean')throw Error('Unreleased reading question');
 const correct=gradeKarmelReading(q,response);
 return Object.freeze({
  correct,assisted:hintUsed,
  detail:{
   mode:'reading-comprehension',readingRef:KARMEL_READING_REF,
   readingVersion:KARMEL_TASK_VERSION,sourceId:q.sourceId,questionId:q.id,
   response,sourcePage:q.sourcePage,sourceExcerptId:q.id,
   hintUsed,skill:q.skill,sourceHelpVersion:READING_HINT_CONTRACT,
   countsAsWordMastery:false,
  },
 });
}


// A release-gate invariant, not a new teaching mechanic. New reading tasks
// must mount actual content, a usable answer control and a status region.
export function validateMountedKarmelReading(stage, question){
 if(!stage||!question)throw Error('Missing reading stage or approved question');
 const heading=stage.querySelector('h2');
 const excerpt=stage.querySelector('.nomi-reading-excerpt');
 const answers=stage.querySelector('.nomi-reading-task-work');
 const status=stage.querySelector('.nomi-reading-task-status');
 const expected=question.options?.length||0;
 const buttons=answers?.querySelectorAll('button').length||0;
 if(!heading?.textContent||!excerpt?.textContent||!answers||!status||
    ((question.kind==='choice'||question.kind==='two')&&buttons<expected)||
    (question.kind==='constructor'&&!answers.querySelector('.bubble-constructor')&&!answers.querySelector('.nomi-reading-sequence-constructor'))||
    (question.kind==='discussion'&&buttons<1)){
  throw Error('Incomplete Nomi reading surface: '+question.id);
 }
 return true;
}

const css=`
.nomi-reading-how{min-height:36px;padding:3px 10px;border:1px solid #dcc6ef;border-radius:10px;color:#fff;background:#59446c;font:inherit}
.nomi-reading-sequence-constructor{display:flex;flex-direction:column;gap:12px;width:100%;height:auto;min-height:0;box-sizing:border-box;padding:3px}
.nomi-reading-sequence-constructor .sequence-bank{display:flex;flex-direction:column;gap:8px;width:100%;box-sizing:border-box}
.nomi-reading-sequence-constructor .sequence-bank-bottom,
.nomi-reading-sequence-constructor .constructor-nomi-anchor{display:none!important}
.nomi-reading-sequence-constructor .sequence-token,
.nomi-reading-sequence-constructor .sequence-answer-bubble{box-sizing:border-box;position:static;display:block;transform:none;min-height:48px;width:100%;max-width:100%;height:auto;padding:9px 14px;white-space:normal;overflow-wrap:break-word;border:1px solid #ebc7ee;border-radius:16px;color:#fff8ff;background:linear-gradient(#794b7d,#4b2c58);font:700 clamp(17px,2vw,23px)/1.45 system-ui;touch-action:pan-y;cursor:pointer}
.nomi-reading-sequence-constructor .sequence-token:disabled{display:none}
.nomi-reading-sequence-constructor .sequence-field{display:block;width:100%;height:auto}
.nomi-reading-sequence-constructor .sequence-answer-zone{display:flex;flex-direction:column;gap:8px;width:100%;height:auto}
.nomi-reading-sequence-constructor .constructor-numbered-slot{display:flex;align-items:center;gap:10px;min-height:48px;width:100%;border:1px dashed #d8b8ed;border-radius:14px;padding:5px 9px;box-sizing:border-box}
.nomi-reading-sequence-constructor .constructor-slot-number{display:grid;place-items:center;flex:0 0 30px;height:30px;border-radius:50%;background:#ead8f7;color:#372348;font:750 19px system-ui}
.nomi-reading-sequence-constructor .constructor-slot-placeholder{font:600 clamp(15px,1.7vw,18px) system-ui}
.nomi-reading-sequence-constructor .sequence-answer-bubble{min-width:0;flex:1;width:auto;min-height:40px;margin:0}
.nomi-reading-sequence-constructor .sequence-feedback{margin:0;min-height:20px;text-align:center;font:650 16px system-ui}
/* Only the approved reading-comprehension adapter; other Luni, English,
   word-recognition and BubbleConstructor mechanics retain their layout. */
.nomi-reading-task{
 box-sizing:border-box;display:grid;min-height:0;max-height:100%;gap:clamp(4px,.85dvh,9px);
 grid-template-rows:auto minmax(68px,auto) auto minmax(0,1fr) auto;
 width:min(100%,1000px);margin:0 auto;padding:clamp(8px,1.2vw,14px);
 border:1px solid #9c7dba;border-radius:18px;background:#382747e8;color:#fff8ff;
 overflow:hidden;align-content:stretch;
}
#alpha20-stage.nomi-reading-task{
 display:grid!important;grid-template-rows:auto minmax(68px,auto) auto minmax(0,1fr) auto!important;
 height:100%!important;max-height:100%!important;min-height:0!important;
 padding:clamp(8px,1.2vw,14px)!important;overflow:hidden!important;
}
.nomi-reading-task>.nomi-reading-instruction{
 margin:0;text-align:right;font:600 clamp(15px,1.8vw,18px)/1.35 system-ui;
 color:#f5e9fa;
}
.nomi-reading-task>.nomi-reading-excerpt{
 min-width:0;min-height:0;max-height:clamp(78px,18dvh,145px);
 overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
 border:1px solid #d4b5e2;background:#251b30;border-radius:13px;
 padding:clamp(7px,1vw,11px);box-sizing:border-box;
 font:600 clamp(16px,2.25vw,22px)/1.55 system-ui;text-align:right;color:#fff8ff;
 overflow-wrap:anywhere;
}
.nomi-reading-task .nomi-reading-excerpt p{margin:0 0 3px}
.nomi-reading-task .nomi-reading-excerpt a{display:inline-block;color:#ded0f2;font-size:12px;text-align:right}
.nomi-reading-task>h2{
 min-width:0;min-height:0;margin:0!important;text-align:center;color:#fff8ff;
 font:750 clamp(20px,2.45vw,29px)/1.35 system-ui;
}
.nomi-reading-task>.nomi-reading-work-wrap{
 position:relative;min-height:0;min-width:0;height:100%;overflow:hidden;
}
.nomi-reading-task .nomi-reading-task-work{
 position:relative;min-width:0;min-height:0;height:100%;
 overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;
 -webkit-overflow-scrolling:touch;touch-action:pan-y;
 scroll-padding-block:10px;padding:2px 7px 9px;box-sizing:border-box;
}
.nomi-reading-task .nomi-reading-scroll-note{
 position:absolute;z-index:3;bottom:4px;left:50%;transform:translateX(-50%);
 padding:4px 12px;border:1px solid #cfb5e5cc;border-radius:100px;
 background:#332343f2;color:#fff4ff;pointer-events:none;
 white-space:nowrap;font:650 13px/1.3 system-ui;box-shadow:0 3px 10px #16112466;
}
.nomi-reading-task .nomi-reading-scroll-note[hidden]{display:none!important}
.nomi-reading-task .focus-choice{
 min-width:0;min-height:0!important;height:auto!important;padding:0!important;
 margin:0!important;display:block!important;gap:0!important;
}
/* Prompt already appears in the <h2> immediately above the work area. */
.nomi-reading-task .focus-choice>.focus-stimulus,
.nomi-reading-task .focus-choice>.luni-companion-slot{display:none!important}
.nomi-reading-task .focus-options{
 display:grid!important;gap:clamp(8px,1.2vw,13px)!important;
 align-items:stretch!important;margin:0!important;
}
.nomi-reading-task .focus-option,
.nomi-reading-task .karmel-page15-choice{
 box-sizing:border-box;min-width:0;width:100%!important;max-width:100%;
 min-height:clamp(54px,7.5dvh,92px)!important;height:auto!important;
 padding:clamp(8px,1.1vw,14px)!important;white-space:normal;
 overflow-wrap:break-word;text-align:center;
 font:700 clamp(16px,2vw,23px)/1.45 system-ui!important;
 border-radius:clamp(12px,1.7vw,22px);
}
.nomi-reading-task .focus-options-3 .focus-option:last-child{
 width:100%!important;grid-column:auto!important;justify-self:stretch!important;
}
.nomi-reading-task .focus-feedback{min-height:24px;font-size:16px;line-height:1.3;margin-top:5px}
.nomi-reading-task .karmel-page15-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.nomi-reading-task .karmel-page15-choice{text-align:right}
.nomi-reading-task .karmel-page15-submit{
 display:block;min-height:48px;width:min(100%,260px);margin:9px auto 0;
 border-radius:14px;border:1px solid #f0d5fa;color:#2a1940;background:#f0d5fa;
 font:700 19px system-ui;
}
.nomi-reading-task .bubble-constructor{height:auto!important;min-height:330px!important}
.nomi-reading-task .constructor-token{white-space:normal;overflow-wrap:anywhere}
.nomi-reading-task>.nomi-reading-task-status{
 margin:0;min-height:20px;text-align:center;font:600 14px/1.35 system-ui;
}
/* Three legible answers fit on ONE row on the landscape tablet. 4-choice
   questions use 2 rows. For narrow devices, the answer area itself scrolls. */
@media (min-width:700px){
 .nomi-reading-task .focus-options-3{grid-template-columns:repeat(3,minmax(0,1fr))!important}
 .nomi-reading-task .focus-options-4{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media (max-width:699px){
 .nomi-reading-task .focus-options-3,
 .nomi-reading-task .focus-options-4{grid-template-columns:minmax(0,1fr)!important}
 .nomi-reading-task .karmel-page15-two{grid-template-columns:minmax(0,1fr)}
 .nomi-reading-task .focus-option{min-height:52px!important}
}
@media (max-height:560px) and (orientation:landscape){
 .nomi-reading-task{gap:4px;padding:7px}
 #alpha20-stage.nomi-reading-task{gap:4px!important;padding:7px!important}
 .nomi-reading-task>.nomi-reading-instruction{font-size:14px}
 .nomi-reading-task>.nomi-reading-excerpt{max-height:clamp(70px,18dvh,112px);font-size:16px}
 .nomi-reading-task>h2{font-size:clamp(19px,2.1vw,24px)}
 .nomi-reading-task .focus-option{font-size:clamp(15px,1.8vw,20px)!important;min-height:52px!important}
}
`;

export function ensureReadingTaskStyles(){
 if(!document.getElementById('nomi-reading-task-css')){
  const style=el('style');style.id='nomi-reading-task-css';style.textContent=css;document.head.append(style);
 }
}

export function mountKarmelReadingTask(host,options={}){
 return mountReadingUnitTask(host,{...options,question:KARMEL_READING_TASKS.find(q=>q.id===options.taskId)});
}
export function mountReadingUnitTask(host,{question:q,onAnswer=()=>{},answerFor=readingAnswer,trialIndex=0,previewOnly=false,initialTokens=[],onChange=()=>{},initialHintUsed=false,onHintUsed=()=>{}}={}){
 if(!host||!q)throw Error('Reading task not in published catalog');
 ensureReadingTaskStyles();
 let hintUsed=initialHintUsed===true,disposed=false,submitted=false,mechanic=null;
 host.lang='he';host.dir='rtl';host.className='nomi-reading-task';host.dataset.readingTask=q.id;
 const title=el('h2','',q.question),excerpt=el('div','nomi-reading-excerpt');
 // Approved text comes FIRST. Reading the normal source fragment is the
 // exercise, NOT an optional hint and not evidence of independent word recall.
 excerpt.hidden=false;excerpt.dir='rtl';excerpt.lang='he';
  const text=el('p','',lessonParagraphText(q.excerpt.text));
 const link=el('a','','הַסִּפּוּר הַמְּקוֹרִי · עַמּוּד '+q.sourcePage);
 link.href=KARMEL_PAGE15.sourcePages[q.sourcePage]||KARMEL_PAGE15.source;
 link.target='_blank';link.rel='noopener noreferrer';
 excerpt.append(text);if(q.sourcePage)excerpt.append(link);
 const work=el('div','nomi-reading-task-work');
 const status=el('p','nomi-reading-task-status');
 const workWrap=el('div','nomi-reading-work-wrap');
 const scrollNote=el('span','nomi-reading-scroll-note','↓ עוֹד תְּשׁוּבוֹת לְמַטָּה');
 scrollNote.hidden=true;scrollNote.setAttribute('aria-hidden','true');
 workWrap.append(work,scrollNote);
 work.setAttribute('role','region');
 work.setAttribute('aria-label','תְּשׁוּבוֹת וּפְעֻלּוֹת לַשְּׁאֵלָה');
 work.tabIndex=0;
 status.setAttribute('role','status');
 const lead=el('p','nomi-reading-instruction',q.kind==='constructor'?
  'לַחֲצִי עַל הַמִּשְׁפָּטִים לְפִי הַסֵּדֶר: מָה קָרָה בַּהַתְחָלָה?':
  'קִרְאִי אֶת הַקֶּטַע וְעֲנִי עַל הַשְּׁאֵלָה');
 host.replaceChildren(lead,excerpt,title,workWrap,status);
 // Scroll only inside the answering mechanic; the lesson shell and visible
 // global timer remain fixed. This indicator is never counted as an answer.
 let scrollObserver=null;
 const updateScrollNote=()=>{
  if(disposed||!work.isConnected)return;
  scrollNote.hidden=!(work.scrollHeight>work.clientHeight+10&&
    work.scrollTop+work.clientHeight<work.scrollHeight-6);
 };
 work.addEventListener('scroll',updateScrollNote,{passive:true});
 const submit=async response=>{
  if(disposed||submitted)return;
  let observation;
  try{observation=answerFor({questionId:q.id,response,hintUsed})}
  catch{status.textContent='הַתְּשׁוּבָה לֹא זְמִינָה לְבְדִיקָה';return}
  submitted=true;
  // Capturing hintUsed at the moment of submission prevents toggling it back.
  status.textContent=previewOnly?'זֹאת תְּצוּגַת מְקֻדֶּמֶת, בְּלִי צִיּוּן':
   'שׁוֹמְרִים אֶת הַתְּשׁוּבָה…';
  try{
   await onAnswer(observation);
   if(!disposed&&status.isConnected&&previewOnly)status.textContent='מְתַרְגְּלִים עִם הַטֶּקְסְט, לְלֹא שְׁמִירָה.';
  }catch{
   submitted=false;
   if(!disposed&&status.isConnected)status.textContent='הַשְּׁמִירָה לֹא הוּשְׁלְמָה. אֶפְשָׁר לְנַסּוֹת שׁוּב.';
  }
 };
 if(q.kind==='choice'){
  mechanic=mountFocusChoice(work,{prompt:q.question,choices:readingChoiceOptions(q.options,q.answer,trialIndex),answer:q.answer,
   companionRoaming:false,autoAdvanceMs:250,onResult:r=>void submit(r.value)});
 }else if(q.kind==='two'){
  mechanic=mountTwoChoice(work,{options:[...q.options],onSubmit:value=>void submit(value)});
 }else if(q.kind==='discussion'){
  const discuss=el('button','karmel-page15-submit','דִּבַּרְתִּי עַל הַשְּׁאֵלָה');
  discuss.type='button';discuss.onclick=()=>void submit('discussed');work.append(discuss);
 }else if(q.kind==='constructor'){
  mechanic=mountBubbleConstructor(work,{mode:q.constructorMode||'text',language:'he',
   presentation:q.constructorMode==='letters'?'pointed':'literal',target:q.target||'',expected:q.constructorMode==='letters'?null:[...q.expected],numberedSlots:q.numberedSlots??true,initialTokens,
   onChange:tokens=>{status.textContent='נבחרו '+tokens.length+' מתוך '+q.expected.length+'. לשינוי, לחצי על משפט שבחרת.';onChange(tokens)},
   onResult:result=>void submit(q.constructorMode==='letters'?result.value:result.tokens)});
 }
 if(q.kind==='constructor'){
  const help=el('button','nomi-reading-how','איך עושים?');help.type='button';
  help.onclick=()=>{
   hintUsed=true;onHintUsed();
   status.textContent='לחצי על המשפט שקרה ראשון. הוא יעבור למקום 1. אחריו בחרי את המשפט הבא. לשינוי, לחצי על משפט שכבר בחרת.';
   status.scrollIntoView?.({block:'nearest'});
  };
  lead.append(document.createTextNode(' '),help);
 }
 // Observe content and viewport changes without a second lesson engine.
 if(typeof ResizeObserver==='function'){
  scrollObserver=new ResizeObserver(updateScrollNote);
  scrollObserver.observe(work);
  if(work.firstElementChild)scrollObserver.observe(work.firstElementChild);
 }
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(updateScrollNote);
 else updateScrollNote();
 return Object.freeze({get hintUsed(){return hintUsed},get taskId(){return q.id},
  destroy(){disposed=true;scrollObserver?.disconnect();mechanic?.destroy?.();mechanic=null}});
}
