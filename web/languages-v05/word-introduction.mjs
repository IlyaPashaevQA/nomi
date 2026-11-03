import {isAudioTextOnlyCard} from './russian-meaning-choice.mjs';
import {learningObjectId} from './word-learning-loop.mjs';
import {hebrewNumberFormsFor} from './hebrew-number-forms.mjs';
import {englishHebrewGloss} from './hebrew-english-glossary.mjs';
import {pointedHebrew,hebrewPresentationModel,mountHebrewPresentation} from './hebrew-presentation.mjs';
import {playLearnerAudio} from './learner-audio.mjs';
import {luniFrame} from './luni-exercise-ui.mjs';
import {applyProductionMechanicLayout} from './mechanic-layout-profile.mjs';
import {lessonParagraphText} from './lesson-text.mjs';
import {introductionTranslationAudio} from './intro-english-audio.mjs';

export function wordIntroductionModel({
 language,target,image=null,meaning,transcription=null,audioSrc=null,displayTarget=null,
 rootPresentation=null,allowMissingMedia=false,hintText=null,hintAudioSrc=null,
 explanation=null,translation=null,semanticAnchor=null,example=null,audioText=null,mediaPolicy=null,teachingMode=null,imageChoiceSafe=null,meaningRu=null,russianMeaningAudio=null,requiredTranslationAudio=false,pronunciationRu=null,
}){
 const context=semanticAnchor||example||(explanation?.text&&(explanation.language||language)===language?explanation:null);
 const anchor=context?{
  text:String(context.text||'').normalize('NFC'),
  highlight:String(context.highlight||'').normalize('NFC'),
  translation:context.translation?String(context.translation):null,
  translationLanguage:context.translationLanguage||'ru',
  note:context.note?String(context.note):null,
  audioSrc:context.audioSrc||null,
 }:null;
 if(anchor&&(!anchor.text||semanticAnchor&&!anchor.highlight||(anchor.highlight&&!anchor.text.includes(anchor.highlight))))
  throw Error('Introduction context must contain its highlighted form');
 const audioTextOnly=isAudioTextOnlyCard({mediaPolicy,teachingMode,imageChoiceSafe,requiredTranslationAudio,meaningRu,audioSrc,translation,russianMeaningAudio});
 if((!image&&!anchor&&!allowMissingMedia&&!audioTextOnly)||!meaning)throw Error('Introduction needs semantic anchor');
 const shown=displayTarget||(language==='he'?pointedHebrew(target):target);
 const presentation=language==='he'?hebrewPresentationModel(shown,{rootPresentation}):null;
 const numberForms=language==='he'?hebrewNumberFormsFor(target):null;
 const gloss=language==='he'?englishHebrewGloss({target,meaning,translation}):null;
 const needsEnglish=language==='he'&&!gloss&&/[֐-׿]/.test(String(meaning||''));
 const englishMeaning=needsEnglish?'English meaning awaiting review':gloss?.text||meaning;
 const resolvedTranslation=translation?.text&&translation?.language==='en'?
  translation:gloss?{text:gloss.text,language:'en'}:
  needsEnglish?{text:'English meaning awaiting review',language:'en'}:translation;
 const translationAudio=resolvedTranslation?.language==='en'&&!resolvedTranslation.audioSrc?
  introductionTranslationAudio(resolvedTranslation.text,globalThis.__LANGUAGES_SESSION_CONTEXT__?.personId):null;
 return {
  learningObjectId:learningObjectId(language,target),language,target,audioSrc,audioText:audioText||target,displayTarget:shown,rootPresentation,semanticAnchor:anchor,
  image,audioTextOnly,meaningRu,russianMeaningAudio,pronunciationRu,meaning:englishMeaning,transcription:transcription||pronunciationRu,showTranscription:language!=='he'&&!!transcription||audioTextOnly&&!!pronunciationRu,mediaMissing:!image&&!anchor,countsAsTest:false,
  numberForms,
  presentationRevision:presentation?.revision||null,rootHighlightState:presentation?.rootState||'not-applicable',
  hintText:hintText||null,hintAudioSrc:hintAudioSrc||null,
  explanation:explanation?.text?{text:explanation.text,language:explanation.language||language,audioSrc:explanation.audioSrc||null}:null,
  translation:resolvedTranslation?.text&&resolvedTranslation?.language?{
   text:resolvedTranslation.text,language:resolvedTranslation.language,
   ...translationAudio,
   ...(resolvedTranslation.audioSrc?{audioSrc:resolvedTranslation.audioSrc}:{}),
   audioText:resolvedTranslation.audioText||translationAudio?.audioText||resolvedTranslation.text,
  }:null,
 };
}

export function introductionExposurePassed(startedAt,minimumExposureMs,at=Date.now()){
 return Number.isFinite(startedAt)&&Number.isFinite(at)&&Number.isFinite(minimumExposureMs)&&
   minimumExposureMs>=0&&at-startedAt>=minimumExposureMs;
}

export function introductionSwipeAction({dx,dy,durationMs,language='he',backEnabled=true}={}){
 if(![dx,dy,durationMs].every(Number.isFinite)||durationMs<0||durationMs>800||
   Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 const next=language==='he'?dx>0:dx<0;
 return next?'next':backEnabled?'back':null;
}

export function mountWordIntroduction(host,input,{
 onContinue=()=>{},onBack=null,audioEnabled=true,onHint=()=>{},backEnabled=true,useProductionLayout=true,continueLabel=null,
 minimumExposureMs=0,swipeNavigation=false,presentationVersion='legacy',onAudioError=()=>{},
}={}){
 const m=wordIntroductionModel(input);host.lang=m.language;host.dir=m.language==='he'?'rtl':'ltr';
 const modern=presentationVersion==='intro-01';
 const f=luniFrame(host,{eyebrow:m.language==='he'?'מִלָּה חֲדָשָׁה ✦':'New word ✦',prompt:m.displayTarget,instruction:modern?'':m.language==='he'?'הקשיבי למילה, אמרי אותה ולחצי על הבא':'Listen, say the word, then tap Next',dir:m.language==='he'?'rtl':'ltr'});
 f.root.classList.add('luni-introduction');
 if(modern){
  f.root.classList.add('luni-intro-01');
  if(!document.getElementById('intro-01-style')){
   const style=document.createElement('style');style.id='intro-01-style';style.textContent=INTRO_01_CSS;document.head.append(style);
  }
 }
 if(m.language==='he')mountHebrewPresentation(f.root.querySelector('.luni-prompt'),m.displayTarget,{rootPresentation:m.rootPresentation});

 const image=document.createElement('button');image.className='luni-intro-visual';image.type='button';
 // The lesson's authorized image cache returns a same-document blob URL.
 // Repeated practice already accepts blob:; introductions must render it as
 // an image too, never print the opaque address in the child's card.
 const missingImage=()=>{
  image.disabled=true;image.dataset.mediaStatus='missing';
  image.innerHTML='<span aria-hidden="true">▧</span><small>תמונה תתווסף כאן</small>';
  image.setAttribute('aria-label','התמונה עדיין לא נוספה');
 };
 if(m.image&&/^(?:\.\/|blob:)/.test(m.image)){
  const img=document.createElement('img');img.src=m.image;img.alt=m.meaning;img.className='luni-intro-image';
  img.onerror=missingImage;image.append(img);
 }else if(m.image){image.textContent=m.image}
 else if(!m.semanticAnchor&&!m.audioTextOnly)missingImage();
 if(!m.mediaMissing)image.setAttribute('aria-label',m.language==='he'?'לִשְׁמֹעַ שׁוּב':'Listen again');

 const meaning=document.createElement('p');meaning.className='luni-intro-meaning';meaning.textContent=m.meaning;
 const tr=document.createElement('small');tr.className='luni-intro-transcription';tr.textContent=m.showTranscription?m.transcription:'';

 const hint=m.hintText&&m.hintAudioSrc?document.createElement('button'):null;
 if(hint){hint.type='button';hint.className='quiet luni-intro-hint';hint.textContent='🇷🇺';hint.setAttribute('aria-label','Русская подсказка');hint.setAttribute('title','Русская подсказка')}

 const nav=document.createElement('div');nav.className='luni-intro-nav';
 const back=onBack||modern?document.createElement('button'):null;
 if(back){back.type='button';back.className='quiet luni-intro-back';back.textContent=modern?(m.language==='he'?'הקודם':'Previous'):(m.language==='he'?'→':'←');back.disabled=!backEnabled||!onBack;back.setAttribute('aria-label',m.language==='he'?'המילה הקודמת':'Previous word')}
 const next=document.createElement('button');next.type='button';next.className='luni-next';next.textContent=continueLabel||(m.language==='he'?'הבא':'Next');
 const startedAt=Date.now();
 const exposureMs=Math.max(0,Math.min(10000,Number(minimumExposureMs)||0));
 if(exposureMs>0){
  next.disabled=true;
  next.setAttribute('aria-description',m.language==='he'
   ?'התבונני בתמונה והקשיבי לפני שממשיכים'
   :'Look at the image and listen before continuing');
 }
 if(back)nav.append(back);nav.append(next);

 let disposed=false,audio=null,autoplayTimer=null,hintUsed=false,hintCount=0;const active=()=>!disposed&&f.root.isConnected;
 const play=(src,text,language)=>{if(!audioEnabled||!active()||!src)return;if(autoplayTimer){window.clearTimeout(autoplayTimer);autoplayTimer=null}audio?.stop?.();audio=playLearnerAudio({src,text,language,isActive:active,onError:onAudioError})};
 const playTarget=()=>play(m.audioSrc,m.audioText,m.language);
 const playHint=()=>{
  if(!active()||!m.hintAudioSrc)return;
  hintUsed=true;hintCount++;onHint({hintText:m.hintText,hintCount});
  play(m.hintAudioSrc,m.hintText,'ru');
 };
 if(!m.mediaMissing)image.onclick=playTarget;
 if(hint)hint.onclick=playHint;
 if(back)back.onclick=()=>{if(active()&&!back.disabled)onBack?.({hintUsed,hintCount})};
 next.onclick=()=>{
  if(active()&&!next.disabled&&introductionExposurePassed(startedAt,exposureMs)){
   onContinue({hintUsed,hintCount});
  }
 };
 let pointer=null,suppressClick=false,clickTimer=null;
 if(swipeNavigation){
  f.root.style.touchAction='pan-y pinch-zoom';
  f.root.addEventListener('pointerdown',event=>{
   if(!active()||event.isPrimary===false||!['touch','pen'].includes(event.pointerType)||
     event.target.closest('button,input,textarea,a,select'))return;
   pointer={id:event.pointerId,x:event.clientX,y:event.clientY,at:event.timeStamp};
  });
  f.root.addEventListener('pointercancel',()=>{pointer=null});
  f.root.addEventListener('pointerup',event=>{
   const start=pointer;pointer=null;
   if(!start||start.id!==event.pointerId||!active())return;
   const action=introductionSwipeAction({dx:event.clientX-start.x,dy:event.clientY-start.y,
    durationMs:event.timeStamp-start.at,language:m.language,backEnabled:!!back&&!back.disabled});
   if(!action)return;
   suppressClick=true;event.preventDefault();
   clickTimer=globalThis.setTimeout(()=>{suppressClick=false},0);
   if(action==='back')back.click();else next.click();
  });
  f.root.addEventListener('click',event=>{
   if(suppressClick&&event.isTrusted){event.preventDefault();event.stopImmediatePropagation()}
  },true);
 }
 const exposureTimer=exposureMs>0?globalThis.setTimeout(()=>{
  if(active())next.disabled=false;
 },exposureMs):null;

 if(m.image||!m.semanticAnchor&&!m.audioTextOnly)f.stage.append(image);
 if(m.audioTextOnly){
  const panel=document.createElement('section');panel.className='luni-intro-audio-text';panel.dataset.mediaPolicy='audio-text-only-v1';
  const ru=document.createElement('button');ru.type='button';ru.lang='ru';ru.dir='ltr';ru.className='luni-intro-translation';ru.textContent=m.meaningRu+' 🔊';ru.onclick=()=>play(m.russianMeaningAudio.src,'','ru');
  const word=document.createElement('button');word.type='button';word.className='quiet';word.textContent='🔊 מִלָּה';word.onclick=playTarget;
  panel.append(ru,word);f.stage.append(panel);
 }
 if(m.semanticAnchor){
  if(!document.getElementById('intro-context-anchor-css')){
   const s=document.createElement('style');s.id='intro-context-anchor-css';
   s.textContent='.luni-intro-context{width:100%;max-width:680px;border:1px solid #ad8cc7;border-radius:16px;padding:14px;background:#30213fd9;color:#fff3fc;box-sizing:border-box}.luni-intro-context-text{font:650 clamp(23px,4vw,31px)/1.9 Arial,sans-serif;text-align:right;margin:4px 0 12px;white-space:pre-line;overflow-wrap:normal}.luni-intro-context mark{color:#271331;background:#f7d191;border-radius:5px;padding:1px 3px;box-decoration-break:clone;-webkit-box-decoration-break:clone}.luni-intro-context-translation,.luni-intro-context-note{font:16px/1.55 system-ui;text-align:left;margin:8px 0}.luni-intro-context-controls{display:flex;flex-wrap:wrap;gap:9px;justify-content:center}.luni-intro-context button{min-height:44px;padding:8px 12px;border-radius:12px;border:1px solid #c3a1d3;background:#51375f;color:white;font:650 16px system-ui}';
   document.head.append(s);
  }
  const anchor=m.semanticAnchor,box=document.createElement('section');
  box.className='luni-intro-context';box.dataset.semanticAnchor='context';
  const text=document.createElement('p');text.className='luni-intro-context-text';text.lang=m.language;text.dir=m.language==='he'?'rtl':'ltr';
   const shown=lessonParagraphText(anchor.text),start=anchor.highlight?shown.indexOf(anchor.highlight):-1;
   if(start>=0){
    const mark=document.createElement('mark');mark.textContent=anchor.highlight;
    text.append(document.createTextNode(shown.slice(0,start)),mark,document.createTextNode(shown.slice(start+anchor.highlight.length)));
   }else text.textContent=shown;
  box.append(text);
  if(anchor.translation&&(!modern||anchor.translationLanguage!=='ru')){const tr=document.createElement('p');tr.className='luni-intro-context-translation';tr.textContent=anchor.translation;tr.lang=anchor.translationLanguage;tr.dir=anchor.translationLanguage==='he'?'rtl':'ltr';box.append(tr)}
  if(anchor.note&&!modern){const note=document.createElement('p');note.className='luni-intro-context-note';note.textContent=anchor.note;note.lang='ru';note.dir='ltr';box.append(note)}
  const controls=document.createElement('div');controls.className='luni-intro-context-controls';controls.dir='ltr';
  if(m.audioSrc&&(!modern||!m.image)){const b=document.createElement('button');b.type='button';b.textContent=modern&&m.language==='he'?'🔊 מִלָּה':'🔊 Слово';b.dataset.introWordAudio='';b.onclick=playTarget;controls.append(b)}
  if(anchor.audioSrc){const b=document.createElement('button');b.type='button';b.textContent=modern&&m.language==='he'?'🔊 מִשְׁפָּט':'🔊 Предложение';b.dataset.introContextAudio='';b.onclick=()=>play(anchor.audioSrc,anchor.text,m.language);controls.append(b)}
  box.append(controls);f.stage.append(box);
 }
 if(m.numberForms){
  // Shared, non-graded morphology scaffold. This is not another word introduction
  // or evidence of knowing both forms. The original target/prompt stays intact.
  const panel=document.createElement('div');panel.className='luni-intro-number-forms';panel.dir='rtl';
  panel.setAttribute('aria-label','צורות יחיד ורבים');
  if(m.numberForms.type==='pair'){
   const cell=(label,value)=>{
    const box=document.createElement('div');box.className='luni-intro-number-form-cell';
    const lbl=document.createElement('small');lbl.textContent=label;
    const form=document.createElement('strong');form.textContent=value;form.lang='he';form.dir='rtl';
    box.append(lbl,form);return box;
   };
   panel.append(cell('יחיד',m.numberForms.singularPointed),cell(m.numberForms.kind.includes('paired')?'רבים / זוגי':'רבים',m.numberForms.pluralPointed));
  }else{
   const lbl=document.createElement('small');lbl.textContent='בדרך כלל ברבים';
   const value=document.createElement('strong');value.textContent=m.numberForms.display;
   panel.append(lbl,value);
  }
  f.stage.append(panel);
 }
 if(modern){
   if(m.explanation&&!m.semanticAnchor){
   const explanation=document.createElement(m.explanation.audioSrc?'button':'p');
   explanation.className='luni-intro-explanation';explanation.textContent=m.explanation.text;
   explanation.lang=m.explanation.language;explanation.dir=m.explanation.language==='he'?'rtl':'ltr';
   if(m.explanation.audioSrc){explanation.type='button';explanation.onclick=()=>play(m.explanation.audioSrc,m.explanation.text,m.explanation.language)}
   f.stage.append(explanation);
  }
  if(m.translation){
   const translation=document.createElement(m.translation.audioSrc?'button':'p');
   translation.className='luni-intro-translation';translation.textContent=m.translation.text+(m.translation.language==='en'?' 🇬🇧':m.translation.audioSrc?' 🔊':'');
   translation.lang=m.translation.language;translation.dir=m.translation.language==='he'?'rtl':'ltr';
    if(m.translation.audioSrc){translation.type='button';translation.setAttribute('aria-label',m.translation.language==='en'?'Listen in English: '+m.translation.text:m.translation.text);translation.onclick=()=>play(m.translation.audioSrc,m.translation.audioText,m.translation.language)}
   f.stage.append(translation);
  }else if(!m.explanation){meaning.dir='auto';f.stage.append(meaning)}
 }else f.stage.append(meaning);
 if(m.showTranscription)f.stage.append(tr);
 if(hint)f.stage.append(hint);
 f.root.append(nav);
 if(useProductionLayout)applyProductionMechanicLayout(host,{mechanic:'intro',source:'lesson'}).catch(()=>{});
 autoplayTimer=m.audioSrc&&audioEnabled?window.setTimeout(()=>{autoplayTimer=null;playTarget()},120):null;
 return {...m,get hintUsed(){return hintUsed},get hintCount(){return hintCount},destroy(){disposed=true;pointer=null;if(clickTimer)globalThis.clearTimeout(clickTimer);if(autoplayTimer)window.clearTimeout(autoplayTimer);if(exposureTimer)globalThis.clearTimeout(exposureTimer);audio?.stop?.();audio?.audio?.pause?.();f.companion?.destroy?.()}};
}


/* INTRO-01 shared presentation; current owner acceptance uses the existing outer frame. */
const INTRO_01_CSS=`
#alpha20-stage:has(>.luni-intro-01){display:block!important;overflow-y:auto!important;overscroll-behavior:contain;touch-action:pan-y}
#alpha20-stage>.luni-intro-01{height:auto!important;max-height:none!important;overflow:visible!important}
#alpha20-stage>.luni-intro-01>.luni-stage{height:auto!important;max-height:none!important;overflow:visible!important;flex:none!important}

.luni-exercise.luni-intro-01{box-sizing:border-box;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:10px!important;min-height:0!important;height:auto!important;max-height:none!important;padding:16px!important;border-radius:24px;background:rgba(41,24,58,.28)!important;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:#fff4fc}
.luni-intro-01>.luni-eyebrow{font-size:18px!important;line-height:1.3;color:#f4e5fa!important}
.luni-exercise.luni-intro-01>.luni-prompt{font-size:clamp(42px,min(6vw,7dvh),64px)!important;line-height:1.3!important;margin:0!important;color:#fff4fc!important;max-width:100%!important}
.luni-intro-01>.luni-companion-slot{position:absolute!important;inset:0;min-height:0!important;margin:0!important;pointer-events:none}
.luni-intro-number-forms{width:min(100%,440px);display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:nowrap;padding:6px 10px;border:1px solid rgba(232,212,243,.43);border-radius:14px;background:rgba(47,30,60,.22);color:#fff5fd;text-align:center;min-height:46px}
.luni-intro-number-form-cell{display:flex;flex:1;min-width:0;align-items:center;justify-content:center;flex-direction:column;gap:2px}
.luni-intro-number-forms small{display:block;font:650 12px/1.25 Arial,sans-serif;color:#ead7f7}
.luni-intro-number-forms strong{display:block;font:740 clamp(18px,2.9vw,24px)/1.25 Arial,sans-serif;color:#fff5fd;overflow-wrap:anywhere}
.luni-intro-number-forms:not(:has(.luni-intro-number-form-cell)){flex-direction:column;gap:3px}
@media(max-height:560px) and (orientation:landscape){.luni-intro-number-forms{min-height:37px;padding:3px 7px;gap:8px}.luni-intro-number-form-cell{gap:0}.luni-intro-number-forms strong{font-size:18px}.luni-intro-number-forms small{font-size:10px}}
.luni-intro-01>.luni-stage{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;width:100%!important;min-height:0!important}
.luni-intro-01 .luni-intro-visual{flex:none!important;width:clamp(128px,24dvh,240px)!important;height:clamp(128px,24dvh,240px)!important;max-width:100%!important;padding:10px!important;border-radius:22px!important}
.luni-intro-01 .luni-intro-visual[data-media-status="missing"]{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;font-size:36px!important;opacity:1}
.luni-intro-01 .luni-intro-visual small{font-size:18px!important;line-height:1.4;white-space:normal;overflow-wrap:anywhere}
.luni-intro-01 .luni-intro-explanation,.luni-intro-01 .luni-intro-meaning{font-size:clamp(23px,3vw,32px)!important;line-height:1.4!important;margin:0;max-width:100%;overflow-wrap:anywhere;color:#fff4fc!important;text-align:center}
.luni-intro-01 .luni-intro-translation{font-size:clamp(21px,2.6vw,28px)!important;line-height:1.4;margin:0;color:#eee0f7!important;text-align:center;max-width:100%;overflow-wrap:anywhere}
.luni-intro-01 button.luni-intro-translation,.luni-intro-01 button.luni-intro-explanation{min-height:44px;padding:8px 16px;background:#34223d88;border:1px solid #dfc0e577;border-radius:16px;color:#fff4fc}
.luni-intro-01>.luni-feedback:empty{display:none}
.luni-intro-01>.luni-intro-nav{display:flex!important;gap:12px;justify-content:center;position:relative;z-index:12;margin:4px 0 0;width:100%}
.luni-intro-01>.luni-intro-nav button{flex:1;min-width:0!important;max-width:220px;min-height:54px!important;font-size:22px!important;line-height:1.3;padding:10px 12px;border:1px solid #dfc0e577;border-radius:999px;background:#49355d;color:#fff4fc}
.luni-intro-01 button:disabled{opacity:.45;cursor:default}
/* One translucent surface. .28 equals the previous .10 + .20 composite. */
.owner-he-stage>.luni-exercise.luni-intro-01{padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:transparent!important;-webkit-backdrop-filter:none;backdrop-filter:none;width:100%}
.owner-he-stage:has(>.luni-intro-01){min-height:0!important;padding:16px!important;background:rgba(41,24,58,.28)!important;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.owner-hebrew-session--intro .owner-he-session-inner{padding-top:max(60px,calc(env(safe-area-inset-top) + 12px));padding-bottom:max(20px,calc(env(safe-area-inset-bottom) + 12px))}
.owner-hebrew-session--intro .owner-he-lesson-head{margin-bottom:8px}
.owner-hebrew-session--intro .owner-he-progress{margin-bottom:12px}
.owner-hebrew-session--intro .owner-he-lesson-footer{margin-top:10px}
.owner-hebrew-session--intro .owner-he-step-label{direction:ltr;unicode-bidi:isolate;font-size:18px}
@media(max-height:550px){.luni-exercise.luni-intro-01{gap:8px!important}.luni-intro-01 .luni-intro-visual{width:128px!important;height:128px!important}}
`;

