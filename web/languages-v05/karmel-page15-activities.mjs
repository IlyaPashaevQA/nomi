import {mountFocusChoice} from './focus-choice-ui.mjs';
import {mountTwoChoice} from './reading-multi-choice-ui.mjs';

// Five family-reviewed homework questions from the existing story pack.
// Reuse focus-choice and multi-choice/discussion UIs; record only school-reading
// practice in the existing Alpha20 append-only journal, not word mastery.
export const KARMEL_PAGE15=Object.freeze({packId:'omitted-school-content',version:'unavailable',source:'',sourcePages:{},questions:[]});
// One scoped practice event per actual response. Parent-confirmed questions
// remain teaching observations rather than invented global word mastery.
export function karmelPage15PracticeEvent({questionId,value,sessionId,deviceId,eventId,at=Date.now()}={}){
 const task=KARMEL_PAGE15.questions.find(q=>q.id===questionId);
 if(!task||!sessionId||!deviceId||!eventId||!Number.isSafeInteger(at)||at<=0)
  throw Error('Invalid Karmel practice identity');
 let correct=null,selected;
 if(task.kind==='choice'){
  if(typeof value!=='string'||!task.options.includes(value))throw Error('Unknown Karmel choice');
  correct=value===task.answer;selected=value;
 }else if(task.kind==='two'){
  if(!Array.isArray(value)||value.length!==2||!value.every(i=>Number.isInteger(i)&&i>=0&&i<task.options.length)||new Set(value).size!==2)
   throw Error('Invalid Karmel pair');
  selected=[...value].sort((a,b)=>a-b);
  correct=task.answerIndexes.every(i=>selected.includes(i));
 }else if(task.kind==='discussion'){
  if(value!=='discussed')throw Error('Discussion has no right/wrong answer');
  selected=value;
 }else throw Error('Unreleased Karmel test item');
 return {schema:1,eventId,attemptId:eventId,sessionId,deviceId,at,
  courseId:'he-alpha20',courseRevision:KARMEL_PAGE15.version,
  blockId:'reading:'+KARMEL_PAGE15.packId+':page15',
  taskId:'karmel-p15:'+task.id,
  mechanic:task.kind==='choice'?'focus-choice':task.kind==='two'?'multi-choice':'discussion',
  targets:[],correct,completed:true,assisted:true,countsAsEvidence:false,
  detail:{kind:'school-reading-practice',sourceId:'Karmel:Kotar:page15',
   referencePage:task.reference,packId:KARMEL_PAGE15.packId,
   approvedBy:'anya',approvedAt:'2026-10-21',
   response:selected,skill:'he.story-comprehension',masteryClaim:false}};
}
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
export function mountKarmelPage15Activities(host,{personId='ilia',onBack=null,onAttempt=null,priorAttempts=[]}={}){
 if(!host)throw Error('Karmel needs a pack panel');
 let current=0,disposed=false,active=null,result=null,submitted=new Set();
 const owner=['ilia','anya'].includes(personId);
 // Full authored, vowelized form is already the answer key; no source ID or word grading changes.
 const taskList=KARMEL_PAGE15.questions;
 const knownIds=new Set(taskList.map(t=>'karmel-p15:'+t.id));
 const savedIds=new Set(priorAttempts.filter(e=>e?.courseRevision===KARMEL_PAGE15.version&&
  e?.completed===true&&e?.blockId==='reading:'+KARMEL_PAGE15.packId+':page15'&&
  knownIds.has(e.taskId)).map(e=>e.taskId));
 const cleanup=()=>{active?.destroy?.();active=null};
 function draw(){
  if(disposed)return;cleanup();host.className='karmel-page15';host.dir='rtl';host.lang='he';
  host.dataset.karmelRelease='parent-approved-school-reading';
  const task=taskList[current];
  host.replaceChildren();
  const head=el('div','karmel-page15-head');
  head.append(el('h3','',`הַמִּשְׁקָפַיִם שֶׁל כַּרְמֶל · עַמּוּד 15`),el('span','karmel-page15-count',`${current+1} / ${taskList.length}`));
  if(onBack){const back=el('button','karmel-page15-back','← חֲזָרָה לַחֲבִילָה');back.type='button';back.onclick=onBack;head.prepend(back)}
  host.append(head);
  const source=el('div','karmel-page15-sources');
  for(const [url,caption] of [[KARMEL_PAGE15.source,'עַמּוּד 15 · מָטָח'],[KARMEL_PAGE15.sourcePages[task.reference],'הַסִּפּוּר · עַמּוּד '+task.reference]]){
   const a=el('a','',caption);a.href=url;a.target='_blank';a.rel='noopener noreferrer';source.append(a)}
  host.append(source);
  const note=el('p','karmel-page15-note','שְׁאֵלוֹת מֵעַמּוּד 15 · אֻשְּׁרוּ עַל יְדֵי אַנְיָה');host.append(note);
  if(!owner){
   host.append(el('p','karmel-page15-note',savedIds.size+' / '+taskList.length+' תְּשׁוּבוֹת נִשְׁמְרוּ בְּדַף הַזֶּה'));
  }
  const card=el('section','karmel-page15-card');
  const title=el('h4','',task.n+' · '+task.heading);card.append(title);
  const hint=el('p','karmel-page15-prompt',task.help);hint.lang='ru';hint.dir='ltr';card.append(hint);
  const action=el('div','karmel-page15-task');card.append(action);
  const feedback=el('p','karmel-page15-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');card.append(feedback);
  host.append(card);
  const finish=(correct,value,additional='')=>{
   if(submitted.has(task.id))return;
   submitted.add(task.id);
   result={id:task.id,correct,assisted:true,scored:false};
   feedback.textContent=additional||(correct===null?'דִּבַּרְנוּ עַל הַשְּׁאֵלָה.':correct?'נָכוֹן!':'אֶפְשָׁר לִקְרֹא שׁוּב אֶת הַקֶּטַע.');
   if(!owner&&typeof onAttempt==='function'){
    try{
     const promise=onAttempt({questionId:task.id,value,correct});
     Promise.resolve(promise).then(saved=>{
      if(saved?.localSaved)savedIds.add('karmel-p15:'+task.id);
      else submitted.delete(task.id);
      if(disposed||!feedback.isConnected)return;
      feedback.textContent+=' '+(saved?.synced?'הַתְּשׁוּבָה נִשְׁמְרָה בְּכָל הַמַּכְשִׁירִים.':
       saved?.localSaved?'הַתְּשׁוּבָה נִשְׁמְרָה בַּמַּכְשִׁיר. הַסִּנְכְּרוּן מַמְתִּין.':
       'הַתְּשׁוּבָה לֹא נִשְׁמְרָה; אֶפְשָׁר לְנַסּוֹת שׁוּב.');
     }).catch(error=>{
      submitted.delete(task.id);
      if(feedback.isConnected)feedback.textContent='שְׁמִירַת הַתְּשׁוּבָה נִכְשְׁלָה. נַסִּי שׁוּב.';
     });
    }catch(error){submitted.delete(task.id);feedback.textContent='שְׁמִירַת הַתְּשׁוּבָה נִכְשְׁלָה.'}
   }
  };
  if(task.kind==='choice'){
   active=mountFocusChoice(action,{prompt:task.heading,choices:[...task.options],answer:task.answer,
    companionRoaming:false,autoAdvanceMs:250,onResult:r=>finish(r.correct,r.value)});
  }else if(task.kind==='two'){
   active=mountTwoChoice(action,{options:[...task.options],onSubmit:picked=>{
    finish(task.answerIndexes.length===2&&task.answerIndexes.every(i=>picked.includes(i)),picked);
   }});
  }else if(task.kind==='discussion'){
   action.append(el('p','','א. לָמָּה אַבָּא לֹא מֵבִין אֶת כַּרְמֶל?'),el('p','','ב. אֵיךְ לְדַעְתְּכֶם כַּרְמֶל מַרְגִּישָׁה?'));
   const discuss=el('button','karmel-page15-submit','דִּבַּרְתִּי עַל הַשְּׁאֵלוֹת עִם הַהוֹרֶה');discuss.type='button';
   discuss.onclick=()=>finish(null,'discussed','דִּבַּרְנוּ. לִתְשׁוּבָה אִישִׁית אֵין רַק נִסּוּחַ אֶחָד.');action.append(discuss);

  }
  if(owner){
   const parent=el('details','karmel-page15-parent');const summary=el('summary','','לְהוֹרֶה · הַדְרָכָה לִתְשׁוּבָה');
   const text={doctor:'הָרוֹפֵא אָמַר לְהַרְכִּיב מִשְׁקָפַיִם בְּכָל יוֹם.',worry:'שְׁתֵּי סִבּוֹת נְכוֹנוֹת: בֵּית סֵפֶר חָדָשׁ; חֲשָׁשׁ שֶׁהַיְלָדִים יִלְעֲגוּ לָהּ.',dad:'יהיו לה חברים וחברות חדשים.',feelings:'אֶפְשָׁר לְהַסְבִּיר שֶׁקָּשֶׁה לָהּ כִּי הִיא מִתְבַּיֶּשֶׁת בַּמִּשְׁקָפַיִם וְחוֹשֶׁשֶׁת מִתְּגוּבוֹת הַיְלָדִים. בִּשְׁאֵלָה ב׳ מְקַבְּלִים כָּל רֶגֶשׁ שֶׁמֻּסְבָּר בְּעֶזְרַת הַסִּפּוּר.',after:'שָׂמָה אֶת הַמִּשְׁקָפַיִם בַּכִּיס שֶׁל הַמְּעִיל וְנִכְנְסָה לַכִּתָּה. לֹא לְבַלְבֵּל עִם סוֹף הַסִּפּוּר.'};
   parent.append(summary,el('p','',text[task.id]));card.append(parent);
  }
  const navigation=el('div','karmel-page15-nav');
  const prev=el('button','', 'הַקּוֹדֵם');prev.type='button';prev.disabled=current===0;prev.onclick=()=>{if(current>0){current--;submitted.delete(taskList[current].id);draw()}};
  const next=el('button','',current===taskList.length-1?'לְתַרְגֵּל שׁוּב':'הַבָּא');next.type='button';
  next.onclick=()=>{current=current===taskList.length-1?0:current+1;submitted.delete(taskList[current].id);draw()};
  navigation.append(prev,next);host.append(navigation);
 }
 draw();return Object.freeze({destroy(){disposed=true;cleanup()},get current(){return current},get version(){return KARMEL_PAGE15.version}});
}
