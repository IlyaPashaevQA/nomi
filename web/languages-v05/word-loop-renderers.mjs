import {mountOrbitChoice} from './orbit-choice-ui.mjs';
import {playLearnerAudio} from './learner-audio.mjs';
import {mountBubbleConstructor} from './bubble-constructor-ui.mjs';
import {wordBuildPlan} from './word-learning-loop.mjs';
import {applyLearningBubbleContract} from './learning-bubble-contract.mjs';
import {presentHebrew} from './nikud-fading.mjs';
import {applyLessonProfile} from './acceptance-run-profile.mjs';
import {applyProductionMechanicLayout} from './mechanic-layout-profile.mjs';

import {normalizeWordResponse,selectWordChoices,wordStagePresentation} from './word-loop-semantics.mjs';

const label=(language,text,level)=>language==='he'?presentHebrew(text,level):text;
const profiles={'meaning-picture':'meaning-picture','audio-picture':'audio-picture','picture-word':'picture-word','audio-word':'audio-word','ru-meaning-word':'audio-word','word-build':'constructor'};
function installStyles(){
 if(document.getElementById('nomi-lesson1-stage-styles'))return;
 const style=document.createElement('style');style.id='nomi-lesson1-stage-styles';
 style.textContent=`
 .word-loop-stage .orbit-choice-prompt,.word-loop-stage .luni-prompt{font-family:Arial,'Helvetica Neue','DejaVu Sans',sans-serif!important;font-size:calc(38px * var(--mechanic-prompt-scale,1))!important;overflow-wrap:anywhere}
 .word-loop-stage .orbit-answer,.word-loop-stage .luni-input{font-family:Arial,'Helvetica Neue','DejaVu Sans',sans-serif!important;font-size:calc(30px * var(--mechanic-answer-scale,1))!important}
 .word-loop-stage .orbit-stimulus-word{font-family:Arial,'Helvetica Neue','DejaVu Sans',sans-serif!important;font-size:calc(42px * var(--mechanic-center-scale,1))!important;white-space:nowrap!important;overflow-wrap:normal!important;word-break:keep-all!important}
 .word-loop-stage .luni-intro-visual{overflow:hidden;padding:0!important}
 .word-loop-stage .luni-intro-image{display:block;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important}
 .word-loop-stage .orbit-answer-image,.word-loop-stage .orbit-token-image{display:block;width:clamp(60px,18vw,112px);height:clamp(60px,18vw,112px);max-width:100%;object-fit:contain;pointer-events:none}
 @media (min-width:700px) and (pointer:coarse){
  /* Shared pupil tablet emphasis; still bounded by Orbit's geometry guard. */
  #alpha20-stage .word-loop-stage .orbit-answer-image,
  #alpha20-stage .word-loop-stage .orbit-token-image,
  #autumn-stage .word-loop-stage .orbit-answer-image,
  #autumn-stage .word-loop-stage .orbit-token-image{width:clamp(110px,15vw,160px)!important;height:clamp(110px,15vw,160px)!important}
  #alpha20-stage .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer,
  #autumn-stage .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer{
    width:min(21vw,200px)!important;height:min(21vw,200px)!important}
 }
 .word-loop-stage[data-word-stage="audio-picture"] .orbit-choice-prompt{font-size:65px!important;font-family:Arial,sans-serif!important}
 .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer{width:160px!important;height:160px!important;max-width:none!important;box-sizing:border-box;display:grid;place-items:center}
 .word-loop-stage[data-word-stage="audio-picture"] .orbit-nomi{width:169px!important;height:169px!important}
 .word-loop-stage[data-word-stage="audio-picture"] .orbit-nomi .luni-companion-small .luni-mascot{width:169px!important}
 @media (max-width:480px){
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer{width:140px!important;height:140px!important}
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer-image{width:clamp(68px,20vw,92px)!important;height:clamp(68px,20vw,92px)!important}
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-nomi{width:148px!important;height:148px!important}
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-nomi .luni-companion-small .luni-mascot{width:148px!important}
 }
 @media (max-width:430px) and (max-height:720px){
  .word-loop-stage .orbit-choice{gap:6px!important}
  .word-loop-stage .orbit-choice-stage{min-height:340px!important}
  .word-loop-stage .orbit-choice-prompt,.word-loop-stage .luni-prompt{
   font-size:clamp(28px,calc(32px * var(--mechanic-prompt-scale,1)),40px)!important;
   line-height:1.16!important
  }
  .word-loop-stage .orbit-answer,.word-loop-stage .luni-input{
   font-size:clamp(21px,calc(25px * var(--mechanic-answer-scale,1)),31px)!important
  }
  .word-loop-stage .orbit-stimulus-word{
   font-size:clamp(30px,calc(36px * var(--mechanic-center-scale,1)),42px)!important
  }
  .word-loop-stage[data-word-stage="picture-word"] .orbit-choice-prompt,
  .word-loop-stage[data-word-stage="audio-word"] .orbit-choice-prompt{
   font-size:clamp(34px,calc(40px * var(--mechanic-prompt-scale,1)),46px)!important;
   line-height:1.12!important
  }
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-choice-prompt{
   font-size:clamp(42px,12vw,48px)!important;
   line-height:1.12!important
  }
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer{
   width:110px!important;height:110px!important;min-height:0!important;padding:4px 8px!important
  }
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-answer-image{
   width:clamp(62px,18vw,78px)!important;height:clamp(62px,18vw,78px)!important
  }
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-nomi{
   width:112px!important;height:112px!important
  }
  .word-loop-stage[data-word-stage="audio-picture"] .orbit-nomi .luni-companion-small .luni-mascot{
   width:112px!important
  }
 }
 .word-loop-stage .word-loop-recall-cue{display:block;justify-self:center;width:min(42vw,170px);height:min(42vw,170px);object-fit:contain;pointer-events:none}
 .word-loop-stage .word-loop-free-field{min-height:0;display:grid;gap:12px;min-width:0}
 .word-loop-stage .word-loop-free-field .luni-input{box-sizing:border-box;min-width:0;max-width:100%;touch-action:auto!important;user-select:text!important;-webkit-user-select:text!important}
 .word-loop-stage .word-loop-free-field .luni-next{min-height:44px}\n .word-loop-stage .word-loop-free-field.is-wrong .luni-input{border-color:#d95f68!important;box-shadow:0 0 0 5px #d95f6820!important}\n .word-loop-stage .word-loop-free-field.is-wrong{animation:word-loop-wrong-shake .28s ease-out}\n .word-loop-stage .demo-feedback.word-loop-wrong-feedback{color:#b8424c!important;font-weight:800;font-size:clamp(20px,5vw,28px)!important}\n @keyframes word-loop-wrong-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}55%{transform:translateX(7px)}78%{transform:translateX(-3px)}}
 .word-loop-stage .word-loop-media-note{grid-column:1/-1;text-align:center;font-size:16px}
 .word-loop-stage .word-loop-media-retry{display:block;margin:8px auto;min-height:44px}
 .word-loop-stage .word-loop-media-note[hidden]{display:none}
 `;
 document.head.append(style);
}

export function mountWordStage(host,{language,asset,stage,choices=[],promptAudio=null,build=null,nikudLevel='full-nikud',trialIndex=0,audioEnabled=true,requireAuditoryPlayback=false,externalFeedback=false,onTechnicalFailure=()=>{},onResult=()=>{}}){
 if(!profiles[stage])throw Error('Unsupported word stage');
 installStyles();host.lang=language;host.dir=language==='he'?'rtl':'ltr';
 host.classList.remove('word-build','luni-word-build','luni-exercise-host');host.classList.add('word-loop-stage');
 host.dataset.wordStage=stage;
 applyLessonProfile(host,profiles[stage]);
 const referenceAudioSrc=asset.audioSrc||null,referenceAudioText=asset.target;
 const questionAudio=stage==='ru-meaning-word'?promptAudio:null;
 let disposed=false,submitted=false,media=null,audio=null,audioPlayCount=0,audioCompleted=false,audioFailed=false,postCorrectReference=true,feedbackTimer=null;
 const removers=[];
 const active=()=>!disposed&&host.isConnected;
 let audioCompanion=null,updateAudioButtons=()=>{};
 const listen=()=>{const src=questionAudio?.src||referenceAudioSrc,text=questionAudio?'':referenceAudioText,audioLanguage=questionAudio?'ru':language;if(!audioEnabled||!active()||submitted||!src)return;audio?.stop?.();audioPlayCount++;audioCompleted=false;audioFailed=false;updateAudioButtons();audio=playLearnerAudio({src,text,language:audioLanguage,isActive:active,onStart:()=>audioCompanion?.setState('speaking'),onEnd:()=>{audioCompleted=true;updateAudioButtons();audioCompanion?.setState('watching')},onError:()=>{audioFailed=true;updateAudioButtons();if(requireAuditoryPlayback)onTechnicalFailure(questionAudio?'ru-audio-unavailable':'audio-blocked');audioCompanion?.setState('watching')}})};
 const emit=result=>{
  if(!active()||submitted)return;
  const payload={...result,audioEvidence:stage.startsWith('audio')||questionAudio?{playCount:audioPlayCount,completed:audioCompleted,failed:audioFailed,source:questionAudio?.src||asset.audioSrc||null,sha256:questionAudio?.sha256||asset.audioSha256||null,version:questionAudio?.version||null,humanQa:questionAudio?.humanQa||asset.audioHumanQa||null}:null,presentation:wordStagePresentation(stage,{nikudLevel,mediaReady:media?.ready()===true})};
  if(result.correct!==false||externalFeedback){submitted=true;host.querySelectorAll('button,input').forEach(x=>x.disabled=true)}
  if((!externalFeedback||questionAudio)&&postCorrectReference&&result.correct===true&&audioEnabled&&referenceAudioSrc){
   let delivered=false;
   const done=()=>{if(delivered||!active())return;delivered=true;if(feedbackTimer){clearTimeout(feedbackTimer);feedbackTimer=null}onResult(payload)};
   audio?.stop?.();
   audio=playLearnerAudio({src:referenceAudioSrc,text:referenceAudioText,
    language,isActive:active,onEnd:done,onError:reason=>{
     // A fallback notification means the released clip failed and TTS has
     // begun. It is not the end of the spoken word. Wait for onEnd instead.
     if(reason!=='fallback')done();
    }});
   feedbackTimer=setTimeout(done,4800);
   return;
  }
  onResult(payload);
 };
 const watchImages=(images,onReady)=>{
  const note=document.createElement('div');note.className='word-loop-media-note';note.setAttribute('role','status');
  const text=document.createElement('span'),retry=document.createElement('button');
  retry.type='button';retry.className='quiet word-loop-media-retry';retry.textContent='נסי שוב';note.append(text,retry);host.append(note);
  let retryCount=0;
  const ready=()=>images.length>0&&images.every(x=>x.complete&&x.naturalWidth>0);
  const update=()=>{
   if(!active())return;
   const failed=images.some(x=>x.complete&&!x.naturalWidth);
   note.hidden=ready();text.textContent=failed?'התמונה לא נטענה. נסי שוב.':'טוענים תמונות…';retry.hidden=!failed;
   onReady(ready()&&!submitted);
  };
  images.forEach(img=>{img.addEventListener('load',update);img.addEventListener('error',update);removers.push(()=>{img.removeEventListener('load',update);img.removeEventListener('error',update)})});
  retry.onclick=()=>{
   if(!active()||submitted)return;++retryCount;
   images.filter(x=>!x.naturalWidth).forEach(img=>{const url=new URL(img.src,location.href);url.searchParams.set('lesson-retry',String(retryCount));img.src=url.href});update();
  };
  update();return {ready};
 };

 if(stage==='meaning-picture'||['audio-picture','audio-word','picture-word','ru-meaning-word'].includes(stage)){
  const selected=selectWordChoices(asset,choices,trialIndex);
  const pictures=stage==='meaning-picture'||stage==='audio-picture';
  const reading=stage==='meaning-picture';
  // Word recognition has one audio policy in Hebrew and English: reading
  // is silent before the answer; afterwards replay the released reference
  // word on every correct attempt (including audio-first exercises).
  postCorrectReference=true;
  const options=selected.map(c=>({text:pictures?c.image:label(language,c.displayTarget||c.target,nikudLevel),value:c.target,kind:pictures?'image':'text',label:pictures?c.meaning:label(language,c.displayTarget||c.target,nikudLevel)}));
  const prompt=reading?'אֵיזוֹ תְּמוּנָה מַתְאִימָה לַמִּלָּה?':stage==='ru-meaning-word'?'🔊':stage==='audio-word'?'אֵיזוֹ מִלָּה שָׁמַעְתְּ?':stage==='audio-picture'?'אֵיזוֹ תְּמוּנָה שָׁמַעְתְּ?':'אֵיזוֹ מִלָּה מַתְאִימָה?';
  mountOrbitChoice(host,{prompt,options,answer:asset.target,
   draggable:reading?'word':stage==='picture-word'?'image':'nomi',
   stimulus:reading?label(language,asset.displayTarget||asset.target,nikudLevel):stage==='picture-word'?asset.image:'',
   // Reading is deliberately silent: no target playback or read-aloud button.
   onPlay:stage.startsWith('audio')||questionAudio?listen:null,
   onResult:r=>emit({...r,usedHint:false})});
  if(reading){host.dataset.presentation='written-word-to-image';host.querySelector('.orbit-stimulus-word').dataset.nikudLevel=nikudLevel;}
  if(stage.startsWith('audio')||questionAudio){audioCompanion={setState:state=>host.querySelector('.orbit-nomi .luni-mascot')?.setAttribute('data-state',state)};window.setTimeout(()=>{if(active()&&!submitted)listen()},120);}
  const buttons=[...host.querySelectorAll('.orbit-answer')];
  updateAudioButtons=()=>buttons.forEach(b=>{
   const img=b.querySelector('.orbit-answer-image');
   b.disabled=!!img&&img.complete&&!img.naturalWidth||
    requireAuditoryPlayback&&(stage.startsWith('audio')||questionAudio)&&(!audioCompleted||audioFailed);
  });
  updateAudioButtons();
  if(requireAuditoryPlayback&&(stage.startsWith('audio')||questionAudio)&&!(questionAudio?.src||referenceAudioSrc))onTechnicalFailure(questionAudio?'ru-audio-unavailable':'audio-unavailable');
  if(pictures||stage==='picture-word'){
   media=watchImages([...host.querySelectorAll('.orbit-answer-image,.orbit-token-image')],updateAudioButtons);
  }
 }else if(stage==='word-build'){
  host.replaceChildren();
  const level=build?.level||'guided',plan=wordBuildPlan({language,target:asset.target,level,distractors:asset.distractorLetters});
  const distractors=['distractors','blind-length'].includes(level)?asset.distractorLetters:[];
  mountBubbleConstructor(host,{mode:'letters',target:asset.target,parts:[...normalizeWordResponse(asset.target,language).replace(/\s/g,'')],distractors,language,
   initialPlaced:build?.initialPlaced||0,
   onResult:r=>emit({correct:r.correct,buildLevel:plan.level,usedHint:plan.assistance.hints>0})});
 }
 applyLearningBubbleContract(host);
 applyProductionMechanicLayout(host,{mechanic:profiles[stage]||stage,source:'lesson'}).catch(()=>{});
 return {destroy(){disposed=true;if(feedbackTimer){clearTimeout(feedbackTimer);feedbackTimer=null}removers.forEach(fn=>fn());audio?.stop?.();audio?.audio?.pause?.();host.querySelectorAll('.luni-companion').forEach(x=>x.remove());host.getAnimations?.({subtree:true}).forEach(a=>a.cancel())}};
}

