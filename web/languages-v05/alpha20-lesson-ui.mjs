import {selectWordChoices} from './word-loop-semantics.mjs';
import {ALPHA20_COURSE} from './alpha20-course.mjs';
import {alpha20ReleasedAsset,alpha20ReleasedCoverage,warmAlpha20Block} from './alpha20-media.mjs';
import {openAlpha20Store,alpha20Progress,alpha20DeviceId,alpha20SyncIssue} from './alpha20-store.mjs';
import {mountWordIntroduction} from './word-introduction.mjs?v=20261022-english-gloss-v1';
import {mountWordStage} from './word-loop-renderers.mjs';
import {mountBubbleMatch} from './bubble-match-ui.mjs';
import {mountBubbleConstructor} from './bubble-constructor-ui.mjs';
import {mountSchoolWrittenInput} from './school-written-input.mjs';
import {mountNumberDailyTask} from './number-daily-ui.mjs';
import {isScheduledSafaTask,isScheduledSafaRussianMeaningTask,safaRussianMeaningMedia,safaRussianMeaningEventDetail,safaContextAdmitted,adoptSafaContextAdmission} from './safa-context-daily.mjs';
import {mountSafaContextTask,safaContextTaskMedia,safaContextAnswer} from './safa-context-task-ui.mjs';
import {isScheduledReadingTask} from './reading-unit-planner.mjs';
import {isScheduledSentenceTask,sentenceAdmitted} from './sentence-daily.mjs';
import {mountSentenceDailyTask} from './sentence-daily-ui.mjs';
import {mountKarmelReadingTask,validateMountedKarmelReading} from './reading-unit-task-ui.mjs';
import {KARMEL_READING_TASKS} from './reading-unit-catalog.mjs';
import {mountHandwriting} from './handwriting-ui.mjs';
import {mountOrbitChoice} from './orbit-choice-ui.mjs';
import {pointedHebrew} from './hebrew-presentation.mjs';
import {applyProductionMechanicLayout,fetchProductionMechanicLayouts} from './mechanic-layout-profile.mjs';
import {showLuniAcknowledgment,showLuniPraise} from './luni-companion.mjs';
import {createNomiLessonShell} from './nomi-lesson-shell.mjs';
import {createActiveLessonClock} from './english-learning-session.mjs';
import {hebrewDailyWords,hebrewDailyStart,hebrewDailyPictureTaskSafe} from './hebrew-pack-catalog.mjs';
import {chooseHebrewDailyTask,shouldRollHebrewDailyPlan,
 shouldCloseOvernightHebrewLesson} from './hebrew-daily-priority.mjs';
import {createLessonImageCache} from './lesson-image-cache.mjs';
import {ownerHebrewDailyStart} from './owner-hebrew-daily-plan.mjs';
import {loadLearnerContentAccess,hebrewAccessLearningState} from './content-access-client.mjs';
import {playLearnerAudio} from './learner-audio.mjs';
import {meaningDirectionEvidence} from './russian-meaning-choice.mjs';
import {initialSimpleSpacing,applySimpleSpacing} from './memory.mjs';

const delay=(fn,ms=650)=>globalThis.setTimeout(fn,ms);
const uuid=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(16).slice(2));

// A completed pack is still available for PRACTICE. Choose low-risk visual
// recognition/word-building tasks; do not repeat first introductions or force
// audio-only questions during the physical iPad sound acceptance gate.
export const alpha20ReviewTasks=block=>(block?.tasks||[]).filter(task=>
  task.mechanic==='meaning-picture'||task.mechanic==='constructor');

// With school-standard nikud, vowel letters in unpointed spelling may be
// absent: כיתה is displayed and built as כִּתָּה (כ·ת·ה), WITHOUT י.
// Segment the approved visible pointed form into graphemes; never index it
// by the unpointed four-letter source or invent repeated final characters.
const plainHebrew=value=>String(value).normalize('NFD').replace(/[\u0591-\u05c7]/g,'');
// A second letter-building attempt gets a SPOKEN cue only after a genuine
// earlier wrong constructor answer for this exact, unchanged lexical card.
// Initial constructors remain unaided. A later correct build resets the cue.
// The history can span sessions/days, but a replacement word version does
// not inherit an old cue. This reads past learner events without writing.
export function shouldSpeakConstructorAfterError(events,task,{phase='task'}={}){
  if(phase!=='task'||!task||task.mechanic!=='constructor'||
     (task.mode||'letters')!=='letters'||task.wordForm||
     !Array.isArray(task.targets)||task.targets.length!==1||
     !Array.isArray(events))return false;
  const word=task.targets[0],access=task.contentAccess;
  if(typeof word!=='string'||!word||typeof access?.contentSha256!=='string')return false;
  const prior=events.filter(e=>e?.completed===true&&e.mechanic==='constructor'&&
    e.targets?.length===1&&e.targets[0]===word&&
    typeof e.correct==='boolean'&&e.detail?.mode==='letters'&&
    e.detail?.contentAccess?.contentSha256===access.contentSha256&&
    Number.isFinite(e.at));
  const last=prior.sort((a,b)=>a.at-b.at||
    String(a.eventId||'').localeCompare(String(b.eventId||''))).at(-1);
  return last?.correct===false;
}

export function alpha20ConstructorParts(task){
  const units=(task?.units||[]).map(String);
  if(!units.length)return [];
  const spelled=units.join('');
  if(plainHebrew(spelled)!==plainHebrew(task.answer))
    throw Error('Constructor units do not match the printed word');
  const vowels=task.displayAnswer||pointedHebrew(task.answer);
  const split=value=>[...new Intl.Segmenter('he',{granularity:'grapheme'}).segment(String(value))]
    .map(x=>x.segment);
  const graphemes=split(vowels);
  // The Word Builder's letter mode has one button per VISIBLE written letter.
  // An omitted spelling-only yod is not a playable letter in this school pack.
  if((task.mode||'letters')==='letters')return graphemes;
  const n=units.map(unit=>split(unit).length);
  if(n.reduce((a,b)=>a+b,0)!==graphemes.length)return units;
  let cursor=0;
  const annotated=units.map((unit,i)=>{
    const text=graphemes.slice(cursor,cursor+n[i]).join('');cursor+=n[i];return text;
  });
  return annotated.every((text,i)=>plainHebrew(text)===plainHebrew(units[i]))
    ?annotated:units;
}

export function mountAlpha20Lesson(host,{
  onExit=()=>{},
  initialBlock=null,
  onTaskBoundary=null,
  onBlockExhausted=null,
  onTechnicalFailure=()=>{},
  assistance=()=>false,
  eventDetail=()=>null,
  minimumIntroMs=0,previewOnly=false,
  admissionCheck=null,
  course=ALPHA20_COURSE,
  mediaResolver=alpha20ReleasedAsset,
  coverage=alpha20ReleasedCoverage,
  store=openAlpha20Store(),
  daily=null,
}={}){
  let disposed=false,active=null,praiseHandle=null,state=null,blockIndex=null,timer=null,saving=false,renderEpoch=0,pendingSave=null,lastPraise='';
  let repeatOnly=false,repeatDone=new Set();
  const beginRepeat=()=>{repeatOnly=true;repeatDone=new Set();host.dataset.alpha20ReviewMode='practice-only'};

  const previousDir=host.getAttribute('dir');
  if(course.direction)host.setAttribute('dir',course.direction);
  document.body.classList.add('alpha20-active');
  // Safari ignores user-scalable=no in some modes. Block only zoom gestures
  // while this lesson is mounted; ordinary one-finger scrolling stays native.
  const blockLessonZoom=event=>{
    if(event.type.startsWith('gesture')||event.touches?.length>1||event.type==='wheel'&&event.ctrlKey)event.preventDefault();
  };
  const lessonZoomEvents=['gesturestart','gesturechange','gestureend','touchmove','wheel'];
  for(const type of lessonZoomEvents)document.addEventListener(type,blockLessonZoom,{passive:false,capture:true});
  if(!document.getElementById('nomi-lesson-no-zoom-css')){
    const style=document.createElement('style');style.id='nomi-lesson-no-zoom-css';
    style.textContent='html:has(body.alpha20-active),body.alpha20-active,.alpha20-active .task-shell{touch-action:pan-x pan-y!important}';
    document.head.append(style);
  }

  delete host.dataset.alpha20ReviewMode;
  delete host.dataset.alpha20SavePhase;
  // Historical replay has no persisted device identity and never writes
  // device-ID/localStorage just because the lesson view was opened.
  if(previewOnly&&!['historical-visual-only','nomi-owner-mirror-ephemeral'].includes(store?.owner))
    throw Error('Visual-only lesson requires an isolated in-memory store');
  let sessionId=uuid();const deviceId=previewOnly?'replay-no-device':alpha20DeviceId();
  const cleanup=()=>{active?.destroy?.();active=null;praiseHandle?.destroy?.();praiseHandle=null;if(timer){clearTimeout(timer);timer=null}};
  const safeMedia=target=>mediaResolver(target);
  const warm=block=>warmAlpha20Block(block,{mediaResolver});
  const progress=()=>alpha20Progress(state,course);

  const eventFor=(task,{correct=null,completed=false,assisted=false,detail=null}={})=>{
    const now=Date.now();
    return {
      schema:1,eventId:uuid(),attemptId:uuid(),sessionId,deviceId,
      courseId:course.id,courseRevision:course.revision,blockId:course.blocks[blockIndex]?.id||null,
      taskId:task.id,mechanic:task.mechanic,targets:[...task.targets],
      correct,completed,assisted:isScheduledReadingTask(task)||isScheduledSentenceTask(task)?!!assisted:assisted||assistance()||!!(daily&&task.resumed),detail:safaRussianMeaningEventDetail(task,{...(detail||{}),...(eventDetail()||{}),...(task.contentAccess?{contentAccess:task.contentAccess}:{})}),countsAsEvidence:false,at:now,
    };
  };
  async function save(task,result,onSaved=renderCurrent){
    if(disposed||saving)return false;
    const accessEpoch=renderEpoch;
    if(admissionCheck){try{if(!(await admissionCheck(task))){cleanup();onExit();return false}}catch{host.dataset.alpha20Blocked='access-unavailable';return false}}
    if(disposed||saving||renderEpoch!==accessEpoch)return false;
    // Historical/owner preview remains isolated and never records answers.
    // Real completed-pack practice uses the SAME append-only learner journal,
    // with an explicit reviewPractice marker; it never confers mastery.
    if(repeatOnly&&previewOnly){
      if(result.completed===true)repeatDone.add(task.id);
      host.dataset.alpha20SavePhase='preview-only';
      return true;
    }
    saving=true;
    const epoch=renderEpoch,savedStage=host.querySelector('#alpha20-stage');
    if(savedStage){savedStage.inert=true;savedStage.setAttribute('aria-busy','true')}
    const event=pendingSave?.taskId===task.id?pendingSave:eventFor(task,{
      ...result,detail:repeatOnly?{...(result.detail||{}),reviewPractice:true}:result.detail,
    });
    try{
      host.dataset.alpha20SavePhase='local';
      // Learner progression waits only for the append-only local commit. Remote
      // reconciliation is deliberately lower priority and cannot demand that an
      // already accepted answer be tapped again on a slow/offline device.
      const x=store.appendLocal?store.appendLocal(event):await store.append(event);
      pendingSave=null;
      if(disposed||epoch!==renderEpoch)return false;
      state=x.state;
      if(repeatOnly&&result.completed===true)repeatDone.add(task.id);
      host.dataset.alpha20Sync=x.synced?'synced':'pending';
      if(!x.synced)host.dataset.alpha20SyncError=String(x.error?.message||'sync-unavailable').slice(0,100);
      else delete host.dataset.alpha20SyncError;
      host.dataset.alpha20SavePhase='committed';
      if(store.sync){
        host.dataset.alpha20Sync='pending';
        store.sync().then(remote=>{
          if(disposed)return;
          state=remote.state||state;
          host.dataset.alpha20Sync=remote.synced?'synced':'pending';
          if(remote.synced)delete host.dataset.alpha20SyncError;
          else host.dataset.alpha20SyncError=String(remote.error?.message||'sync-unavailable').slice(0,100);
        }).catch(error=>{
          if(disposed)return;
          host.dataset.alpha20Sync='pending';
          host.dataset.alpha20SyncError=String(error?.message||'sync-unavailable').slice(0,100);
        });
      }
      return true;
    }catch(error){
      if(disposed||epoch!==renderEpoch)return false;
      pendingSave=event;
      host.dataset.alpha20SaveError=String(error?.message||'save-failed').slice(0,120);
      const stage=host.querySelector('#alpha20-stage');
      if(stage)stage.innerHTML='<section class="card panel word-loop-save-error" role="alert"><h1>לֹא הִצְלַחְנוּ לִשְׁמֹר</h1><p>הַתַּרְגִּיל לֹא נִמְחַק.</p><button type="button" class="primary" id="alpha20-retry">נַסִּי שׁוּב</button></section>';
      stage?.querySelector('#alpha20-retry')?.addEventListener('click',async()=>{if(await save(task,result,onSaved))onSaved()});
      return false;
    }finally{saving=false;if(savedStage){savedStage.inert=false;savedStage.removeAttribute('aria-busy')}}
  }
  const shell=(task,number,total)=>{
    cleanup();renderEpoch++;
    const frame=createNomiLessonShell(host,{
      language:'he',
      sectionTitle:course.blocks[blockIndex]?.title||'מִלִּים רִאשׁוֹנוֹת',
      sectionIndex:blockIndex+1,sectionTotal:course.blocks.length,
      taskIndex:number,taskTotal:total,mechanic:task.mechanic,
      onExit:()=>{cleanup();if(initialBlock!==null)onExit();else renderBlocks()},
    });
    frame.stage.dataset.lessonTaskId=task.id||'';
    return frame.stage;
  };
  const finishTask=async(task,result={})=>{
    if(daily){await dailyAnswer(task,result);return}
    const advance=()=>{
      if(disposed)return;
      const stage=host.querySelector('#alpha20-stage');
      if(stage){
        stage.inert=true;praiseHandle?.destroy?.();
        if(result.correct===true){praiseHandle=showLuniPraise(stage,{previous:lastPraise});lastPraise=praiseHandle.phrase}
        else praiseHandle=showLuniAcknowledgment(stage);
      }
      timer=delay(async()=>{
        if(disposed)return;
        if(onTaskBoundary){try{if(await onTaskBoundary(task,result)===false)return}catch{host.dataset.pilotBoundaryError="unavailable";return}}
        renderCurrent();
      },900);
    };
    if(await save(task,{...result,completed:true},advance))advance();
  };
  const wrongAttempt=async(task,result={})=>{
    if(daily){await dailyAnswer(task,result);return}
    if(!course.accessVersion){await save(task,{...result,completed:false});return}
    if(!(await save(task,{...result,completed:true})))return;
    cleanup();
    const media=safeMedia(task.targets[0]),stage=host.querySelector('#alpha20-stage');
    if(!stage)return;
    stage.replaceChildren();
    active=mountWordIntroduction(stage,{...media,language:'he',displayTarget:media.displayTarget||media.display,
      meaning:media.meaning||media.display},{presentationVersion:'intro-01',useProductionLayout:false});
    stage.querySelector('.luni-intro-nav')?.remove();
    timer=delay(()=>{if(!disposed)renderCurrent()},3000);
  };

  function mountMatch(stage,task){
    let pairIndex=0,current=null;
    const pairs=task.pairs||[];
    const draw=()=>{
      current?.destroy?.();current=null;
      const [left,right]=pairs[pairIndex];
      const distractors=task.targets.filter(x=>x!==left&&x!==right);
      const otherRights=pairs.map(x=>x[1]).filter(x=>x!==right);
      const pool=[right,...otherRights,...distractors].filter((x,i,a)=>a.indexOf(x)===i).slice(0,3);
      if(pool.length<2){
        const fallback=course.blocks[blockIndex].words.find(x=>x!==left&&x!==right);
        if(fallback)pool.push(fallback);
      }
      current=mountOrbitChoice(stage,{
        prompt:'מַהִי הַצּוּרָה הַמַּתְאִימָה?',
        draggable:'word',stimulus:pointedHebrew(left),
        options:selectWordChoices({target:right,language:'he'},pool.map(target=>({target})),sessionId+':'+task.id+':'+pairIndex).map(({target:value})=>({text:pointedHebrew(value),value})),answer:right,
        onResult:async r=>{
          if(!r.correct){await wrongAttempt(task,{correct:false,detail:{pairIndex,value:r.value}});return}
          const advance=()=>{
            if(disposed)return;
            pairIndex++;
            if(pairIndex<pairs.length){timer=delay(draw,520)}
            else finishTask(task,{correct:true,detail:{pairs:pairs.length}});
          };
          if(await save(task,{correct:true,completed:false,detail:{pairIndex,value:r.value}},advance))advance();
        }
      });
      applyProductionMechanicLayout(stage,{mechanic:'match',source:'lesson'}).catch(()=>{});
    };
    draw();
    return {destroy(){current?.destroy?.()}};
  }

  function mountTask(stage,task,introductionOptions={}){
    const allMedia=targets=>targets.map(safeMedia);
    if(task.mechanic==='intro'){
      const media=safeMedia(task.targets[0]);
      const intros=course.blocks[blockIndex].tasks.filter(t=>t.mechanic==='intro'),introIndex=intros.findIndex(t=>t.id===task.id);
      return mountWordIntroduction(stage,{...media,language:'he',target:media.target,displayTarget:media.displayTarget||media.display,meaning:media.meaning||media.display},{
        presentationVersion:course.introPresentation,
        ...(course.accessVersion&&!daily?{backEnabled:introIndex>0,onBack:introIndex>0?()=>renderCurrent(intros[introIndex-1]):null,swipeNavigation:true}:{}),
        ...introductionOptions,
        minimumExposureMs:minimumIntroMs,
        ...(daily?{onAudioError:()=>dailyPause('technical',true)}:{}),
        onContinue:()=>{if(!daily&&course.accessVersion&&progress().completedTaskIds.has(task.id)){renderCurrent(intros[introIndex+1]||null);return}finishTask(task,{correct:null,assisted:true,detail:{kind:'introduction'}})}
      });
    }
    if(['meaning-picture','audio-picture','picture-word','audio-word','ru-meaning-word'].includes(task.mechanic)){
      const sourceMedia=isScheduledSafaRussianMeaningTask(task)?safaRussianMeaningMedia(task):null;
      const media=sourceMedia?.asset||safeMedia(task.targets[0]),choices=sourceMedia?.choices||allMedia(task.choices||course.blocks[blockIndex].words);
      return mountWordStage(stage,{language:'he',asset:media,stage:task.mechanic,choices,promptAudio:task.promptAudio||null,nikudLevel:'full-nikud',trialIndex:daily?task.id:state.events.length,audioEnabled:!daily||cp().runtime.phase==='task',requireAuditoryPlayback:(!!onTaskBoundary||!!daily)&&!previewOnly,externalFeedback:!!daily,onTechnicalFailure:daily?()=>dailyPause('technical',true):onTechnicalFailure,
        onResult:r=>{const detail={value:r.value,presentation:r.presentation,audioEvidence:r.audioEvidence,...(task.mechanic==='ru-meaning-word'?{meaningDirection:meaningDirectionEvidence({target:task.targets[0],correct:r.correct,audio:task.promptAudio})}:{})};return r.correct?finishTask(task,{correct:true,detail}):wrongAttempt(task,{correct:false,detail})}});
    }
    if(task.mechanic==='bubble-match'){
      const pairs=(task.pairs||[]).map(pair=>{
        const target=String(pair.wordRef||'').replace(/^he:/,'')||String(pair.imageRef||'').replace(/^he:/,'');
        const media=safeMedia(target);
        return {visual:{kind:'image',src:media.image,label:media.display},word:media.display};
      });
      return mountBubbleMatch(stage,{pairs,seed:sessionId+':'+task.id,onComplete:()=>finishTask(task,{correct:true,detail:{pairs:pairs.length}})});
    }
    if(task.mechanic==='match')return mountMatch(stage,task);
    if(task.mechanic==='constructor'&&task.wordForm){
      return mountNumberDailyTask(stage,{task,onAnswer:result=>result.correct?
        finishTask(task,result):wrongAttempt(task,result)});
    }
    if(task.mechanic==='constructor'){
      const mode=task.mode||'letters';
      // Answer feedback renders the same task while phase=feedback. NEVER
      // speak a "next attempt" cue during correction of the current error.
      const cue=!!daily&&shouldSpeakConstructorAfterError(state.events,task,
        {phase:cp().runtime.phase});
      const cueMedia=cue?safeMedia(task.targets[0]):null;
      let spoken=false,playback=null;
      const audioHint=()=>cue?{
        type:'prior-letter-constructor-error',offered:true,played:spoken,
        audioSha256:cueMedia?.audioSha256||null,
      }:null;
      const finish=r=>{
        const result={correct:r.correct,assisted:spoken,detail:{
          value:r.value,mode,...(cue?{audioHint:audioHint()}:{})
        }};
        return r.correct?finishTask(task,result):wrongAttempt(task,result);
      };
      const opts={mode,language:'he',distractors:[],...(daily?{initialTokens:state.dailyLesson?.draft||[],onChange:tokens=>dailyDraft(tokens)}:{}),onResult:finish};
      if(['sentence','phrase','text'].includes(mode))opts.expected=task.units.map(pointedHebrew);
      else{
        opts.target=task.displayAnswer||pointedHebrew(task.answer);
        opts.parts=alpha20ConstructorParts(task);
      }
      const builder=mountBubbleConstructor(stage,opts);
      if(!cue)return builder;
      const media=cueMedia;
      const replay=document.createElement('button');
      replay.type='button';replay.className='quiet nomi-constructor-spoken-retry';
      replay.lang='he';replay.dir='rtl';
      replay.textContent='🔊 לִשְׁמֹעַ שׁוּב';
      replay.setAttribute('aria-label','הקשיבי למילה שוב לפני בנייתה');
      replay.style.cssText='display:block;margin:4px auto 9px;min-height:44px;max-width:100%;padding:7px 14px;border-radius:16px';
      stage.prepend(replay);
      let destroyed=false;
      const play=()=>{
        if(destroyed||disposed||!replay.isConnected||
           cp().runtime.pauses.length||cp().runtime.phase!=='task')return;
        playback?.stop?.();
        playback=playLearnerAudio({
          src:media.audioSrc||null,text:media.displayTarget||task.targets[0],language:'he',
          isActive:()=>!destroyed&&!disposed&&replay.isConnected&&
            cp().runtime.phase==='task'&&!cp().runtime.pauses.length,
          onStart:()=>{spoken=true;replay.dataset.audioHintPlayed='true'},
          onError:reason=>{
            // Released audio may fall back to its normal TTS. This is NOT
            // proof that the word was heard until onStart actually fires.
            if(reason!=='fallback'&&!destroyed)dailyPause('technical',true);
          }
        });
      };
      replay.addEventListener('click',play);
      // Same auto-play timing as the current sound→picture mechanic; a
      // visible replay button handles iOS gesture restrictions if needed.
      const start=delay(play,120);
      return {destroy(){destroyed=true;clearTimeout(start);
        playback?.stop?.();builder.destroy?.()}};
    }
    if(task.mechanic==='handwriting'){
      const media=safeMedia(task.targets[0]);
      return mountHandwriting(stage,{target:media.display,mode:task.mode||'copy',font:'gveret',stimulus:media.image,
        onDone:r=>{if(r.strokeCount)finishTask(task,{correct:null,assisted:task.mode!=='free',detail:{strokeCount:r.strokeCount,mode:r.mode}})}});
    }
    throw Error('Unsupported Alpha-20 mechanic: '+task.mechanic);
  }

  async function renderCurrent(forcedTask=null){
    if(disposed)return;
    if(daily){await renderDaily();return}
    const block=course.blocks[blockIndex],p=progress(),done=p.completedTaskIds;
    const available=repeatOnly?alpha20ReviewTasks(block):block.tasks;
    const task=forcedTask||(repeatOnly?available.find(x=>!repeatDone.has(x.id)):available.find(x=>!done.has(x.id)));
    if(!task){renderBlockComplete();return}
    const number=available.findIndex(x=>x.id===task.id)+1,stage=shell(task,number,available.length);
    const epoch=renderEpoch;
    try{
      if(admissionCheck&&!(await admissionCheck(task))){onExit();return}
      await warm(block);
      if(disposed||epoch!==renderEpoch)return;
      warm(course.blocks[blockIndex+1]).catch(()=>{});
      active=mountTask(stage,task);
      if(!stage.children.length)throw Error('Nomi exercise mounted an empty surface');
      await waitDaily(()=>applyProductionMechanicLayout(stage,{mechanic:task.mechanic,source:'lesson'}));
    }catch(error){
      if(disposed||epoch!==renderEpoch)return;
      stage.innerHTML='<section class="card panel word-loop-save-error" role="alert"><h1>עוֹד רֶגַע</h1><p>'+String(error.message||error)+'</p></section>';
      host.dataset.alpha20Blocked='media-or-renderer';
    }
  }

  function renderBlockComplete(){
    cleanup();
    if(onBlockExhausted){host.dataset.alpha20Exhausted="true";onBlockExhausted();return;}
    const completedReview=repeatOnly;
    const next=course.blocks.findIndex((_,i)=>i>blockIndex&&!progress().blocks[i].done);
    const part=course.blocks[blockIndex];
    const total=completedReview?Math.max(1,alpha20ReviewTasks(part).length):Math.max(1,part.tasks.length);
    // Use the same Nomi lesson frame and colours as real questions. Old
    // completion card inherited a white parent/QA sheet and looked broken.
    const frame=createNomiLessonShell(host,{
      language:'he',sectionTitle:part.title,sectionIndex:blockIndex+1,
      sectionTotal:course.blocks.length,taskIndex:total,taskTotal:total,
      mechanic:'completion',onExit
    });
    frame.progress.setAttribute('aria-valuenow',String(total));
    frame.progress.querySelector('i')?.style.setProperty('--p','100%');
    frame.stage.innerHTML='<section class="alpha20-complete-card" dir="rtl">'+
      '<p class="alpha20-complete-eyebrow">✦ Nomi · עברית ✦</p>'+
      '<h1>כָּל הַכָּבוֹד!</h1>'+
      '<p>'+(completedReview?'סיימנו תרגול חוזר. אפשר לתרגל שוב מתי שרוצים.':
          'סִיַּמְנוּ אֶת חֵלֶק '+(blockIndex+1)+' מִתּוֹךְ '+course.blocks.length+'.')+'</p>'+
      '<p class="alpha20-complete-note">'+(completedReview?
          'התרגול לא משנה את ההתקדמות שכבר נשמרה.':
          'אפשר לחזור ולתרגל את המילים האלה שוב.')+'</p>'+
      '<div class="alpha20-complete-actions">'+
        '<button type="button" class="primary" id="alpha20-repeat">לתרגל שוב</button>'+
        '<button type="button" class="quiet" id="alpha20-next">'+
          (initialBlock!==null?'חזרה לחבילות':next>=0?'החלק הבא':'חזרה לגן')+
        '</button>'+
      '</div></section>';
    host.querySelector('#alpha20-repeat').onclick=()=>{beginRepeat();renderCurrent()};
    host.querySelector('#alpha20-next').onclick=()=>{
      if(initialBlock!==null){onExit();return}
      if(next>=0){blockIndex=next;repeatOnly=false;repeatDone.clear();renderCurrent()}
      else onExit()
    };
  }

  function renderBlocks(){
    cleanup();renderEpoch++;pendingSave=null;
    const p=progress();
    host.className='alpha20-lesson-host nomi-v2 nomi-v2-autumn';
    host.innerHTML='<div class="course-shell narrow alpha20-block-menu"><div class="course-head"><button class="quiet" id="alpha20-home">←</button><span class="course-tag">עברית</span></div><section class="card panel"><div class="eyebrow">מִלִּים רִאשׁוֹנוֹת</div><h1>4 חֲלָקִים · 5 מִלִּים בְּכָל חֵלֶק</h1><p class="muted">כָּל חֵלֶק עוֹצֵר בִּנְקֻדַּת מְנוּחָה. אֶפְשָׁר לַחֲזֹר מֵאוֹתוֹ מָקוֹם.</p><div id="alpha20-blocks"></div></section></div>';
    host.querySelector('#alpha20-home').onclick=onExit;
    const box=host.querySelector('#alpha20-blocks');
    course.blocks.forEach((block,i)=>{
      const x=p.blocks[i],b=document.createElement('button');b.className='secondary alpha20-block-card';b.dataset.block=String(i);
      b.innerHTML='<strong>חֵלֶק '+(i+1)+'</strong><small>'+block.words.map(pointedHebrew).join(' · ')+'</small><span>'+x.complete+' / '+x.total+(x.done?' ✓':'')+'</span>';
      b.disabled=!!store.owner&&i>0&&!p.blocks.slice(0,i).every(x=>x.done);
      b.onclick=()=>{if(b.disabled)return;blockIndex=i;repeatOnly=false;repeatDone.clear();
        if(p.blocks[i]?.done)beginRepeat();
        renderCurrent()};box.append(b);
    });
    if(p.courseDone){
      const done=document.createElement('p');done.className='technical ok';done.textContent='✓ סיימנו את ארבעת החלקים';box.after(done);
    }
  }

  // Optional common timed-language mode of this renderer. No separate pack
  // player, storage namespace or learner journal is introduced.
  let dailyReadingUnits=[];
  let dailyIntroductionView=null;
  let dailyWords=[],dailyKnown=new Set(),dailyRemaining=10,dailyMemory={},dailyBusy=false,dailyInterval=null,lastClockSave=0,feedbackAudio=null,dailyEpoch=0,dailyStorageError=false,latestDailyAdmissionAt=0;
  const dailyImageCache=daily?createLessonImageCache():null;
  const dailyClock=createActiveLessonClock({readPending:()=>state?.dailyLesson});
  const cp=()=>state.dailyLesson;
  let dailyWaiting=0,dailyWaitBase=null;
  // Network/media preparation consumes no active learning time. Manual and
  // hidden pause reasons remain independent while the request is in flight.
  function dailyTime(){
    const rt=dailyClock.current();
    if(rt&&dailyWaiting&&dailyWaitBase){
      rt.elapsedMs=dailyWaitBase.elapsedMs;rt.feedbackMs=dailyWaitBase.feedbackMs;
      dailyClock.adopt(rt,cp().sessionId);
    }
    return rt;
  }
  async function waitDaily(job){
    if(!daily||!state?.dailyLesson)return job();
    if(dailyWaiting++===0)dailyWaitBase=dailyClock.current();
    try{return await job()}finally{dailyTime();dailyWaiting--;if(!dailyWaiting)dailyWaitBase=null}
  }
  const stopFeedback=()=>{feedbackAudio?.stop?.();feedbackAudio=null};
  function commitDaily(next,event=null){
    let result;
    try{result=store.saveLesson(next,event)}catch(error){
      dailyStorageError=true;stopFeedback();cleanup();dailyEpoch++;
      if(state?.dailyLesson)dailyClock.adopt({...cp().runtime,pauses:['technical']},cp().sessionId);
      const stage=host.querySelector('#alpha20-stage')||host;
      stage.inert=false;stage.innerHTML='<section class="card panel" role="alert"><h1>לא הצלחנו לשמור</h1><p>התשובה נשמרת כאן עד שננסה שוב.</p><button type="button" class="primary" data-daily-save-retry>לנסות שוב</button></section>';
      stage.querySelector('[data-daily-save-retry]').onclick=()=>{
        try{dailyStorageError=false;commitDaily(next,event);dailyBusy=false;void syncDaily();void renderDaily()}catch{}
      };
      throw error;
    }
    state=result.state;
    dailyClock.adopt(cp().runtime,cp().sessionId);host.dataset.alpha20Sync='pending';
    return cp();
  }
  let dailySyncError=null;
  function showDailySync(){
    const top=host.querySelector('.task-top');if(!top)return;
    let note=top.querySelector('[data-daily-sync-state]');
    if(!note){note=document.createElement('p');note.dataset.dailySyncState='';note.setAttribute('role','status');top.append(note)}
    note.style.cssText='margin:2px 0;font:600 13px system-ui;color:#fff4db;max-width:28em';
    note.hidden=!dailySyncError;
    note.textContent=dailySyncError?'התשובות נשמרו במכשיר הזה. השמירה בשרת עדיין לא הושלמה; נסי שוב לפני מעבר למכשיר אחר.':'';
  }
  function syncDaily(){
    return store.sync().then(result=>{
      if(disposed)return result;
      host.dataset.alpha20Sync=result.synced?'synced':'pending';
      dailySyncError=result.synced?null:result.error||dailySyncError;showDailySync();
      if(result.error&&/too large|request size|quota|capacity/i.test(result.error.message)&&!cp().runtime.pauses.includes('technical'))dailyPause('technical',true);
      // A fork is a real conflict, never a reason to discard either answer.
      if(result.error&&/changed|Conflicting|checkpoint|conflict/i.test(result.error.message)&&!cp().runtime.pauses.includes('conflict'))dailyPause('conflict',true);
      return result;
    });
  }
  function dailyDraft(tokens){if(dailyBusy||cp().runtime.phase!=='task')return;commitDaily({...cp(),runtime:dailyTime(),draft:tokens});void syncDaily()}
  function dailyHeader(){
    const p=cp(),rt=dailyTime();if(!rt)return;
    const clock=host.querySelector('.alpha20-task-count');
    const seconds=Math.ceil(Math.max(0,600000-rt.elapsedMs)/1000);
    const visibleTime=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    clock?.remove();
    // One visible countdown over the shared active-time checkpoint.
    let visible=document.getElementById('nomi-daily-visible-clock');
    if(p.status==='active'&&!disposed){
      if(!visible){
        visible=document.createElement('output');
        visible.id='nomi-daily-visible-clock';
        visible.className='nomi-daily-visible-clock';
        visible.setAttribute('role','timer');
        visible.setAttribute('aria-label','זמן שנותר בשיעור');
        visible.setAttribute('aria-live','off');
        visible.dir='ltr';
        document.body.append(visible);
      }
      visible.textContent=visibleTime;
      visible.dataset.lessonSession=p.sessionId;
    }else visible?.remove();
    const rail=host.querySelector('.alpha20-progress');
    rail?.setAttribute('aria-valuemax','600000');rail?.setAttribute('aria-valuenow',String(Math.round(rt.elapsedMs)));
    rail?.querySelector('i')?.style.setProperty('--p',Math.round(rt.elapsedMs/6000)+'%');
    const title=host.querySelector('[data-lesson-section]');if(title)title.textContent='עברית';
    const top=host.querySelector('.task-top');
    if(top&&!top.querySelector('[data-daily-pause]')){
      const b=document.createElement('button');b.type='button';b.className='quiet';b.dataset.dailyPause='';b.textContent='הפסקה';b.onclick=()=>dailyPause('manual',true);top.append(b);
    }
    showDailySync();
    host.dataset.lessonPhase=p.runtime.phase;host.dataset.lessonSession=p.sessionId;
  }
  function dailyPause(reason,enabled){
    if(disposed||dailyStorageError||!state?.dailyLesson||cp().status==='complete')return;
    const rt=dailyTime(),set=new Set(rt.pauses);enabled?set.add(reason):set.delete(reason);
    commitDaily({...cp(),current:cp().current?{...cp().current,resumed:true}:null,runtime:{...rt,pauses:[...set]}});stopFeedback();cleanup();dailyEpoch++;
    void syncDaily();void renderDaily();
  }
  const visibility=()=>dailyPause('hidden',document.hidden);
  const pageHide=()=>{if(!dailyStorageError&&state?.dailyLesson&&cp().status==='active'){const rt=dailyTime();commitDaily({...cp(),runtime:{...rt,pauses:[...new Set([...rt.pauses,'hidden'])]}});stopFeedback();void syncDaily()}};
  function stopDaily(){
    document.getElementById('nomi-daily-visible-clock')?.remove();
    if(dailyInterval)clearInterval(dailyInterval);
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);
    if(!dailyStorageError&&state?.dailyLesson&&cp().status==='active'){
      commitDaily({...cp(),runtime:{...dailyTime(),pauses:[...new Set([...cp().runtime.pauses,'manual'])]}});void syncDaily();
    }
    stopFeedback();dailyImageCache?.destroy();dailyEpoch++;
  }
  async function refreshDaily(){
    const [access,history]=await waitDaily(()=>Promise.all([loadLearnerContentAccess(),hebrewAccessLearningState()]));
    dailyWords=hebrewDailyWords(access.catalog);dailyKnown=history.introduced;dailyReadingUnits=access.readingUnits||[];
    const local=store.load();
    const serverIds=new Set((history.envelope.alpha20?.events||[]).map(e=>e.eventId));
    const pendingIntro=new Set(local.events.filter(e=>!serverIds.has(e.eventId)&&e.mechanic==='intro'&&e.completed&&!dailyKnown.has(e.targets?.[0])).flatMap(e=>e.targets));
    dailyRemaining=Math.max(0,history.remainingNew-pendingIntro.size);
    // Use only server-admitted observations for interval increases. Local raw
    // answers remain practice history until their own server reconciliation.
    dailyMemory={};
    for(const row of access.dailyObservations||[]){
      const key=row.itemId+'|'+row.channelId;
      const m=dailyMemory[key]||initialSimpleSpacing({itemId:row.itemId,channelId:row.channelId,sourceClass:'live',legacyDueAt:row.kind==='exposure'?null:0});
      dailyMemory[key]=applySimpleSpacing(m,row);
    }
    const stillAllowed=new Set(dailyWords.map(w=>w.image).filter(Boolean));
    dailyImageCache?.retain(stillAllowed);
    mediaResolver=target=>{
      const w=dailyWords.find(w=>w.target===target);
      if(!w)throw Error('Word no longer admitted');
      return {...w,image:dailyImageCache?.get(w.image)||w.image,display:w.displayTarget};
    };
    latestDailyAdmissionAt=Date.now();
    return access;
  }
  async function startDaily(hydrated){
    if(!hydrated.synced){
      const issue=alpha20SyncIssue(hydrated.error);
      if(issue==='session-expired'){
        // Personal Hub had rotated its old process-local signature after a
        // restart; reloading this authorized HTML reissues the scoped context.
        // Only one automatic reload per minute. Never clear localStorage.
        const key='nomi:languages:one-session-refresh:'+store.owner;
        let recent=false;
        try{
          const last=Number(window.sessionStorage.getItem(key)||0);
          recent=Number.isFinite(last)&&Date.now()-last<60000;
          if(!recent)window.sessionStorage.setItem(key,String(Date.now()));
        }catch{recent=true}
        if(!recent&&typeof location.reload==='function'){location.reload();return}
      }
      // Retry a transient transport timeout ONCE without changing a single
      // learner event or checkpoint. Concurrent/forked histories stay locked.
      if(issue==='network'){
        const retried=await store.sync();
        if(retried?.synced){state=retried.state;hydrated=retried}
      }
      if(!hydrated.synced){
        const message=issue==='session-expired'?'ההרשאה לעבודה פגה. יש לרענן את הדף כדי להמשיך בלי למחוק את ההתקדמות.'
          :issue==='concurrent-checkpoint'?'השיעור השתנה במכשיר אחר. המידע נשמר, ויש לרענן כדי לבדוק את הגרסה החדשה.'
          :'הסנכרון עדיין לא הצליח. התשובות במכשיר נשמרו, ואפשר לרענן ולנסות שוב.';
        throw Error(message);
      }
    }
    try{window.sessionStorage.removeItem('nomi:languages:one-session-refresh:'+store.owner)}catch{}
    if(typeof store.saveLesson!=='function')throw Error('Shared checkpoint unavailable');
    await refreshDaily();if(disposed)return;
    blockIndex=0;
    // Never resurrect yesterday's unfinished clock as today's ten minutes.
    // Lazy closure happens on the FIRST connected lesson opening after
    // 02:00 Israel; event history and the exact elapsed active ms survive.
    // This must sync BEFORE creating the new checkpoint on another device.
    if(state.dailyLesson?.status==='active'&&
       shouldCloseOvernightHebrewLesson(state.dailyLesson,Date.now())){
      const old=state.dailyLesson;
      commitDaily({...old,status:'complete',current:null,draft:[],
       reason:'overnight-02:00-incomplete',
       runtime:{...old.runtime,pauses:[],phase:'complete'}});
      const overnight=await waitDaily(()=>syncDaily());
      if(!overnight?.synced)
       throw Error('Previous overnight Hebrew lesson closure not synced');
    }
    if(state.dailyLesson?.status==='active'&&shouldRollHebrewDailyPlan(state.dailyLesson,dailyWords)){
      // The previous lesson has outlived major catalogue re-versioning. Its
      // answers remain in the append-only journal; do not force the child to
      // spend the rest of the clock on just 4 still-matching words.
      const p=state.dailyLesson;
      commitDaily({...p,status:'complete',current:null,reason:'catalog-version-updated',
        runtime:{...p.runtime,pauses:[],phase:'complete'}});
      const closure=await waitDaily(()=>syncDaily());
      if(!closure?.synced)throw Error('Previous Hebrew lesson closure not synced');
    }
    const previous=state.dailyLesson;
    if(!previous||previous.status==='complete'){
      const next=store.owner==='ilia'
        ?ownerHebrewDailyStart(dailyWords,{introduced:dailyKnown,perSessionNew:Math.min(10,dailyRemaining),events:state.events})
        :hebrewDailyStart(dailyWords,{introduced:dailyKnown,remainingNew:dailyRemaining,events:state.events});
      commitDaily({...next,...(dailyReadingUnits.length?{readingUnits:dailyReadingUnits}:{}),...(previous?{changeId:previous.changeId}:{})});
    }else{
      const admitted=adoptSafaContextAdmission(previous,dailyReadingUnits);
      commitDaily({...admitted,current:admitted.current?{...admitted.current,resumed:true}:null,runtime:{...admitted.runtime,pauses:admitted.runtime.pauses.filter(x=>x!=='hidden'&&x!=='manual')}});
    }
    sessionId=cp().sessionId;
    // Resume is causal and must be acknowledged before accepting another
    // device's answer. A concurrent device sees a conflict instead of a reset.
    const ack=await waitDaily(()=>syncDaily());if(!ack?.synced)throw Error('השיעור פתוח במכשיר אחר או שהחיבור לא זמין');
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);
    dailyInterval=setInterval(()=>{
      if(disposed||dailyStorageError||!state?.dailyLesson||cp().status!=='active'||dailyBusy)return;
      const rt=dailyTime();dailyHeader();
      if(rt.pauses.length)return;
      if(rt.phase==='card'&&rt.feedbackMs>=3000){void advanceDaily();return}
      if(Date.now()-lastClockSave>=5000){lastClockSave=Date.now();commitDaily({...cp(),runtime:rt});void syncDaily()}
    },200);
    if(document.hidden)dailyPause('hidden',true);else await renderDaily();
  }
  async function advanceDaily(){
    if(disposed||dailyBusy)return;dailyBusy=true;
    try{
      stopFeedback();cleanup();
      const rt=dailyTime();
      commitDaily({...cp(),current:null,draft:[],runtime:{...rt,phase:'between',feedbackMs:0}});
      await waitDaily(()=>syncDaily());dailyBusy=false;await renderDaily();
    }catch(error){dailyBusy=false;dailyPause('technical',true)}
  }
  async function dailyAnswer(task,result){
    if(disposed||dailyBusy||cp().runtime.pauses.length||cp().runtime.phase!=='task'||cp().current?.id!==task.id)return;
    dailyBusy=true;host.querySelector('#alpha20-stage')?.setAttribute('inert','');
    try{
      const access=await waitDaily(()=>loadLearnerContentAccess());
      latestDailyAdmissionAt=Date.now();
      const nowAllowed=hebrewDailyWords(access.catalog);
      const reading=isScheduledReadingTask(task);
      const sentence=isScheduledSentenceTask(task);
      const admitted=sentence?sentenceAdmitted(task,nowAllowed):isScheduledSafaRussianMeaningTask(task)?safaContextAdmitted({...cp(),readingUnits:access.readingUnits}):reading?(isScheduledSafaTask(task)?safaContextAdmitted({...cp(),readingUnits:access.readingUnits}):nowAllowed.some(w=>w.packId==='he-school-karmel-glasses-20261020')):
       nowAllowed.some(w=>w.id===task.contentAccess?.wordId&&w.contentSha256===task.contentAccess?.contentSha256);
      if(!admitted||
          !isScheduledSafaRussianMeaningTask(task)&&(task.choices||[]).some(t=>!nowAllowed.some(w=>w.target===t))){
        commitDaily({...cp(),current:null,sequence:cp().sequence+1,draft:[],reason:'content-withdrawn',runtime:{...dailyTime(),phase:'between'}});
        dailyBusy=false;await renderDaily();return;
      }
      if(disposed||cp().current?.id!==task.id||cp().runtime.pauses.length){dailyBusy=false;return}
      // The event and next phase use one durable local commit. An interruption
      // after this point can replay feedback, but can never replay the answer.
      const event=eventFor(task,{...result,completed:true,detail:{...result.detail,dailyContract:'he-daily-v1',choices:task.choices||[]}});
      const rt=dailyTime();
      const sourceFormCorrection=isScheduledSafaTask(task)&&['word','number'].includes(task.readingTask.kind)&&result.correct===false;
      const next=reading&&!sourceFormCorrection||task.mechanic==='intro'||result.correct===true?
        {...cp(),current:null,draft:[],sequence:cp().sequence+1,lastCorrect:result.correct,
          runtime:{...rt,phase:'between',feedbackMs:0}}:
        {...cp(),draft:[],sequence:cp().sequence+1,lastCorrect:result.correct,
          runtime:{...rt,phase:task.wordForm||sentence?'card':'feedback',feedbackMs:0}};
      commitDaily(next,event);pendingSave=null;dailyIntroductionView=null;
      // Successful introductions count immediately even when transmission is
      // delayed; future plans reconcile against the authoritative journal.
      if(task.mechanic==='intro'){dailyRemaining=Math.max(0,dailyRemaining-1);dailyKnown.add(task.targets[0])}
      void syncDaily();dailyBusy=false;await renderDaily();
    }catch(error){dailyBusy=false;dailyPause('technical',true)}
  }
  function introductionEntries(task){
    const entries=[];
    for(const e of state.events){
      if(e.sessionId!==cp().sessionId||e.completed!==true)continue;
      if(e.mechanic==='intro'){
        const w=dailyWords.find(w=>w.id===e.detail?.contentAccess?.wordId&&
          w.contentSha256===e.detail.contentAccess.contentSha256);
        if(w)entries.push({id:e.eventId,media:safeMedia(w.target)});
      }else if(e.detail?.kind==='card'&&e.detail?.mode==='safa-context'){
        const media=safaContextTaskMedia({readingTask:{questionId:e.detail.questionId}});
        if(media&&safaContextAdmitted(cp()))entries.push({id:e.eventId,media});
      }
    }
    const media=isScheduledSafaRussianMeaningTask(task)?safaRussianMeaningMedia(task).asset:isScheduledSafaTask(task)?safaContextTaskMedia(task):safeMedia(task.targets[0]);
    entries.push({id:task.id,media});
    return entries;
  }
  function mountDailyIntroduction(stage,task){
    const entries=introductionEntries(task),last=entries.length-1;
    const index=dailyIntroductionView?.taskId===task.id?
      Math.min(last,dailyIntroductionView.index):last;
    const browse=i=>{dailyIntroductionView={taskId:task.id,index:i};void renderDaily()};
    return mountWordIntroduction(stage,entries[index].media,{
      presentationVersion:'intro-01',useProductionLayout:false,
      minimumExposureMs:index===last?Math.max(minimumIntroMs,1500):0,
      backEnabled:index>0,onBack:index>0?()=>browse(index-1):null,swipeNavigation:true,
      onAudioError:()=>dailyPause('technical',true),
      onContinue:()=>{
        if(index<last){browse(index+1);return}
        void dailyAnswer(task,isScheduledSafaTask(task)?safaContextAnswer({
          questionId:task.readingTask.questionId,response:'viewed'}):
          {correct:null,assisted:true,detail:{kind:'introduction'}});
      },
    });
  }
  function dailyWordFeedback(stage,task,epoch){
    stage.inert=true;
    const media=isScheduledSafaRussianMeaningTask(task)?safaRussianMeaningMedia(task).asset:isScheduledSafaTask(task)?safaContextTaskMedia(task):safeMedia(task.targets[0]);
    const answer=document.createElement('p');answer.className='daily-correct-answer';answer.dir='rtl';
    answer.textContent=media.displayTarget||media.target;
    if(media.semanticAnchor?.note&&isScheduledSafaRussianMeaningTask(task)){
      const explanation=document.createElement('p');explanation.className='daily-meaning-explanation';explanation.lang='ru';explanation.dir='ltr';
      explanation.textContent=media.semanticAnchor.note+' '+media.semanticAnchor.translation;stage.append(explanation);
    }
    answer.style.cssText='position:absolute;inset:auto 12% 8px;text-align:center;padding:8px;border-radius:16px;background:#352044ee;color:white;font-size:24px;z-index:5';stage.append(answer);
    feedbackAudio=playLearnerAudio({src:media.audioSrc,text:media.audioText||media.target,language:'he',
      isActive:()=>!disposed&&epoch===dailyEpoch&&!cp().runtime.pauses.length,
      onEnd:()=>{if(disposed||epoch!==dailyEpoch)return;
        commitDaily({...cp(),current:null,draft:[],runtime:{...dailyTime(),phase:'between',feedbackMs:0}});
        void syncDaily();void renderDaily()},
      onError:()=>{if(!disposed&&epoch===dailyEpoch)dailyPause('technical',true)}});
  }
  async function renderDaily(){
    if(disposed||dailyStorageError||dailyBusy||!state?.dailyLesson)return;
    const epoch=++dailyEpoch,p=cp(),rt=dailyTime();stopFeedback();
    if(p.status==='complete'){
      const stage=shell({mechanic:'completion'},1,1);dailyHeader();
      stage.innerHTML=cp().reason==='content-exhausted'?
         '<section class="alpha20-complete-card" dir="rtl"><h1>סיימנו את התרגילים הזמינים</h1><p>כל התשובות נשמרו. היום סיימנו לפני עשר דקות; נחזור עם תרגילים מתאימים נוספים.</p><button type="button" class="primary" data-daily-home>חזרה לעברית</button></section>':
         cp().reason==='catalog-version-updated'?
        '<section class="alpha20-complete-card" dir="rtl"><h1>המילים התעדכנו</h1><p>כל התשובות נשמרו. בפעם הבאה נתרגל עם המילים העדכניות.</p><button type="button" class="primary" data-daily-home>חזרה לעברית</button></section>':
        cp().reason==='overnight-02:00-incomplete'?
        '<section class="alpha20-complete-card" dir="rtl"><h1>השיעור של אתמול נשמר</h1><p>מה שהספקת אתמול נספר ונשמר. היום מתחילים שיעור חדש.</p><button type="button" class="primary" data-daily-home>חזרה לעברית</button></section>':
        '<section class="alpha20-complete-card" dir="rtl"><h1>כָּל הַכָּבוֹד!</h1><p>סיימנו את השיעור. אפשר להתאמן שוב מתי שרוצים.</p><button type="button" class="primary" data-daily-home>חזרה</button></section>';
      host.querySelector('[data-daily-pause]')?.remove();stage.querySelector('[data-daily-home]').onclick=onExit;return;
    }
    if(rt.pauses.length){
      const stage=shell({mechanic:'pause'},1,1);dailyHeader();host.querySelector('[data-daily-pause]')?.remove();
      const conflict=rt.pauses.includes('conflict');
      stage.innerHTML='<section class="alpha20-complete-card" dir="rtl" role="status"><h1>הַפְסָקָה</h1><p>'+
       (conflict?'השיעור השתנה במכשיר אחר. המקום נשמר.':
       rt.pauses.includes('content')?'צריך עוד תרגילים מאושרים. השיעור לא הושלם והזמן נעצר.':
       rt.pauses.includes('technical')&&host.dataset.alpha20RenderError?
         'הַתַּרְגִּיל לֹא נִטְעַן. הַזְּמַן נֶעֱצַר וְהַהִתְקַדְּמוּת נִשְׁמְרָה.':
       rt.pauses.includes('technical')?'צריך לבדוק את החיבור או הצליל. המקום נשמר.':'נמשיך מאותו מקום.')+
       '</p><button type="button" class="primary" data-daily-resume>'+
       (rt.pauses.includes('technical')?'לְנַסּוֹת שׁוּב':'ממשיכים')+'</button></section>';
      stage.querySelector('[data-daily-resume]').onclick=async()=>{
        if(conflict){location.reload();return}
        try{
          await refreshDaily();
          const current=dailyTime();
          delete host.dataset.alpha20RenderError;
          commitDaily({...cp(),runtime:{...current,pauses:document.hidden?['hidden']:[]}});
          await renderDaily();
        }catch{stage.querySelector('p').textContent='החיבור עדיין לא זמין. המקום נשמר.'}
      };return;
    }
    if(rt.phase==='between'){
      if(shouldCloseOvernightHebrewLesson(p,Date.now())){
        // A 01:55-02:05 active session is not cut off mid-answer. Its completed
        // task has already been journalled; stop at the next safe boundary.
        commitDaily({...p,status:'complete',current:null,draft:[],
         reason:'overnight-02:00-incomplete',
         runtime:{...rt,pauses:[],phase:'complete'}});
        void syncDaily();return renderDaily();
      }
      if(rt.elapsedMs>=600000){commitDaily({...p,status:'complete',reason:'timer',runtime:{...rt,phase:'complete'}});void syncDaily();return renderDaily()}
      try{
        if(!dailyWords.length||Date.now()-latestDailyAdmissionAt>12000)await refreshDaily();
      }catch{dailyPause('technical',true);return}
      if(disposed||epoch!==dailyEpoch)return;
      if(shouldRollHebrewDailyPlan(cp(),dailyWords)){
        // A safe, explicitly journalled lesson boundary. Content withdrawn
        // mid-session cannot reduce the vocabulary to a repetitive handful.
        const previous=cp();
        commitDaily({...previous,status:'complete',current:null,reason:'catalog-version-updated',
          runtime:{...dailyTime(),pauses:[],phase:'complete'}});
        void syncDaily();return renderDaily();
      }
      const task=chooseHebrewDailyTask(cp(),dailyWords,state.events,{remainingNew:dailyRemaining,memory:dailyMemory});
      if(!task){
         commitDaily({...cp(),status:'complete',current:null,draft:[],reason:'content-exhausted',
          runtime:{...dailyTime(),pauses:[],phase:'complete'}});
         void syncDaily();return renderDaily();
       }
      commitDaily({...cp(),current:task,runtime:{...dailyTime(),phase:'task'}});void syncDaily();return renderDaily();
    }
    const task=p.current;
    const valid=task&&hebrewDailyPictureTaskSafe(task,dailyWords)&&(isScheduledSentenceTask(task)?sentenceAdmitted(task,dailyWords):isScheduledSafaRussianMeaningTask(task)?safaContextAdmitted(cp()):isScheduledReadingTask(task)?
      (isScheduledSafaTask(task)?safaContextAdmitted(cp()):dailyWords.some(w=>w.packId==='he-school-karmel-glasses-20261020')):
      dailyWords.some(w=>w.id===task.contentAccess?.wordId&&w.contentSha256===task.contentAccess?.contentSha256)&&
      (task.choices||[]).every(t=>dailyWords.some(w=>w.target===t)));
    if(!valid){
      // Revocation removes an exercise without recording a learner failure.
      commitDaily({...p,current:null,sequence:p.sequence+1,draft:[],reason:'content-withdrawn',runtime:{...rt,phase:'between'}});return renderDaily();
    }
    course={...course,direction:'rtl',accessVersion:1,introPresentation:'intro-01',revision:'he-daily-v1',
      vocabulary:dailyWords,blocks:[{id:'he-daily',title:'עברית',words:dailyWords.map(w=>w.target),tasks:[task]}]};
    const stage=shell(rt.phase==='card'?{...task,mechanic:'intro'}:task,1,1);dailyHeader();
    if(rt.phase==='task'&&(task.mechanic==='intro'||isScheduledSafaTask(task)&&task.readingTask.kind==='card')){
      try{
        active=mountDailyIntroduction(stage,task);
        if(!stage.children.length)throw Error('Nomi introduction mounted an empty surface');
      }catch(error){host.dataset.alpha20RenderError='intro-surface';console.error('Shared introduction unavailable',error);dailyPause('technical',true)}
      return;
    }
    if(isScheduledSentenceTask(task)){
      try{
        active=mountSentenceDailyTask(stage,{task,correction:rt.phase==='card',
          helpUsed:!!task.resumed||!!assistance(),initialTokens:p.draft||[],
          onChange:dailyDraft,onAnswer:result=>dailyAnswer(task,result)});
      }catch(error){
        if(disposed||epoch!==dailyEpoch)return;
        host.dataset.alpha20RenderError='sentence-surface';
        console.error('Nomi sentence render guard',error);
        dailyPause('technical',true);
      }
      return;
    }
    if(task.wordForm){
      try{
        active=mountNumberDailyTask(stage,{task,correction:rt.phase==='card',
          helpUsed:!!task.resumed||!!assistance(),initialValue:p.draft?.[0]||'',
          onChange:value=>dailyDraft([value]),onAnswer:result=>dailyAnswer(task,result)});
      }catch(error){
        if(disposed||epoch!==dailyEpoch)return;
        host.dataset.alpha20RenderError='number-surface';
        console.error('Nomi number render guard',error);dailyPause('technical',true);
      }
      return;
    }
    if(isScheduledSafaTask(task)){
      try{
        if(rt.phase==='card'){
          // A saved pre-release correction already showed the reference word.
          // Finish it without recording another answer or replaying its card.
          commitDaily({...cp(),current:null,runtime:{...dailyTime(),phase:'between',feedbackMs:0}});return renderDaily();
        }
        active=mountSafaContextTask(stage,{taskId:task.readingTask.questionId,audioEnabled:rt.phase==='task',initialTokens:cp().draft||[],onChange:dailyDraft,initialHintUsed:task.instructionHelpUsed===true,trialIndex:daily?task.id:state.events.length,onTechnicalFailure:()=>dailyPause('technical',true),
         onHintUsed:()=>{commitDaily({...cp(),current:{...cp().current,instructionHelpUsed:true},runtime:dailyTime()});void syncDaily()},onAnswer:result=>dailyAnswer(task,result)});
        if(rt.phase==='feedback')dailyWordFeedback(stage,task,epoch);
      }catch(error){console.error('Safa context surface unavailable',error);dailyPause('technical',true)}
      return;
    }
    if(isScheduledReadingTask(task)){
      const q=KARMEL_READING_TASKS.find(row=>row.id===task.readingTask.questionId);
      try{
        if(!q)throw Error('Released reading question missing from catalog');
        // Shared learner journal and clock; a broken interface must never
        // count as an incorrect attempt or silently consume lesson time.
        active=mountKarmelReadingTask(stage,{
          taskId:q.id,initialTokens:cp().draft||[],onChange:dailyDraft,initialHintUsed:task.instructionHelpUsed===true,trialIndex:daily?task.id:state.events.length,onTechnicalFailure:()=>dailyPause('technical',true),
          onHintUsed:()=>{commitDaily({...cp(),current:{...cp().current,instructionHelpUsed:true},runtime:dailyTime()});void syncDaily()},onAnswer:result=>dailyAnswer(task,result)
        });
        validateMountedKarmelReading(stage,q);
      }catch(error){
        if(disposed||epoch!==dailyEpoch)return;
        host.dataset.alpha20RenderError='reading-surface';
        console.error('Nomi reading render guard', {
          type:q?.kind||'unknown',question:q?.id||'unknown'
        },error);
        // This records only a paused checkpoint, never a graded answer.
        try{dailyPause('technical',true)}catch(storageError){
          console.error('Nomi reading pause could not persist',storageError);
          // The existing save-error path owns recovery if storage is full.
        }
      }
      return;
    }
    if(rt.phase==='card'){
      commitDaily({...cp(),current:null,runtime:{...dailyTime(),phase:'between',feedbackMs:0}});return renderDaily();
    }
    try{
      const needed=[...new Set([...task.targets,...(task.choices||[])])];
      // Read approved images once per lesson, not 40 times from a private
      // no-store endpoint. No permanent disk/browser cache or server write.
      if(dailyImageCache){
        await waitDaily(()=>dailyImageCache.primeMany(needed.map(t=>{
          const w=dailyWords.find(row=>row.target===t);return w?.image;
        }).filter(Boolean)));
      }
      if(!isScheduledSafaRussianMeaningTask(task))await waitDaily(()=>warm({words:needed,tasks:[task]}));
      if(disposed||epoch!==dailyEpoch)return;
      active=mountTask(stage,task);
      await waitDaily(()=>applyProductionMechanicLayout(stage,{mechanic:task.mechanic,source:'lesson'}));
      if(disposed||epoch!==dailyEpoch)return;
      if(rt.phase==='feedback'){
        dailyWordFeedback(stage,task,epoch);
      }
    }catch(error){
      if(!disposed&&epoch===dailyEpoch){
        host.dataset.alpha20RenderError='task-surface';
        console.error('Nomi daily task render failed',{mechanic:task.mechanic},error);
        try{dailyPause('technical',true)}catch(storageError){
          console.error('Nomi daily render pause failed',storageError);
        }
      }
    }
  }

  host.innerHTML='<section class="card panel"><h1>טוֹעֲנִים אֶת הַשִּׁעוּר…</h1></section>';
  (async()=>{
    try{
      const c=coverage();
      if(c.ready!==c.total)throw Error('Alpha-20 released media '+c.ready+'/'+c.total);
      const hydrated=await store.hydrate();if(disposed)return;state=hydrated.state;
      await fetchProductionMechanicLayouts();if(disposed)return;
      if(daily){await startDaily(hydrated);return}
      warm(course.blocks[progress().blocks.findIndex(x=>!x.done)]).catch(()=>{});
      host.dataset.alpha20Sync=hydrated.synced?'synced':'pending';
      if(Number.isInteger(initialBlock)&&course.blocks[initialBlock]){
        blockIndex=initialBlock;
        if(progress().blocks[initialBlock]?.done)beginRepeat();
        renderCurrent();
      }else renderBlocks();
    }catch(error){
      if(disposed)return;
      host.dataset.alpha20Blocked='startup';
      host.innerHTML='<section class="card panel word-loop-save-error" role="alert"><h1>הַשִּׁעוּר עוֹד לֹא מוּכָן</h1><p>'+String(error.message||error)+'</p><button class="primary" id="alpha20-reconnect">לרענן ולנסות שוב</button><button class="quiet" id="alpha20-back">←</button></section>';
      host.querySelector('#alpha20-reconnect').onclick=()=>location.reload();
      host.querySelector('#alpha20-back').onclick=onExit;
    }
  })();

  return{get sessionId(){return sessionId},deviceId,destroy(){for(const type of lessonZoomEvents)document.removeEventListener(type,blockLessonZoom,{capture:true});if(daily)stopDaily();disposed=true;cleanup();document.body.classList.remove('alpha20-active');delete host.dataset.alpha20ReviewMode;if(previousDir===null)host.removeAttribute('dir');else host.setAttribute('dir',previousDir)}};
}

