// Dasha Languages — school-aligned Hebrew Autumn lesson.
// The exported catalog describes available mechanics; learner sessions are adaptive and bounded.
import {mountWordIntroduction} from './word-introduction.mjs';
import {mountWordStage} from './word-loop-renderers.mjs';
import {mountBubbleMatch} from './bubble-match-ui.mjs';
import {mountBubbleConstructor} from './bubble-constructor-ui.mjs';
import {mountHandwriting} from './handwriting-ui.mjs';
import {mountOrbitChoice} from './orbit-choice-ui.mjs';
import {releasedAsset} from './asset-release-manifest.mjs';
import {AUTUMN1_PILOT} from './asset-pilot-autumn1-manifest.mjs?v=20261007-hila1';
import {optionalLanguagesSessionContext} from './session-context.mjs';
import {applyProductionMechanicLayout} from './mechanic-layout-profile.mjs';
import {availableWordLearningStages,nextBuildLevel,wordNeedsReview} from './word-learning-loop.mjs';
import {openAutumn1Store,autumn1TargetHistory,autumn1DeviceId} from './autumn1-store.mjs';
import {playLearnerAudio} from './learner-audio.mjs';
import {mountHebrewPresentation} from './hebrew-presentation.mjs';
import {luni} from './luni-art.mjs';
import {mountInstructionAudio} from './instruction-audio.mjs';

const freeze=value=>Object.freeze(value);
const media=(targetId,kind)=>freeze({kind:'placeholder',status:'missing',slotId:`he-autumn-1:${kind}:${targetId}:v1`});
const reviewedRoot=(lexeme,radicals,clusterIds,sourceRefs)=>freeze({
 status:'reviewed',lexeme,radicals:freeze(radicals),clusterIds:freeze(clusterIds),
 reviewRevision:'autumn1-root-r1',reviewedAt:'2026-10-07',reviewer:'EnglishLab morphology review',sourceRefs:freeze(sourceRefs)
});
const target=(id,word,pointed,support,rootPresentation=null)=>freeze({id,word,pointed,support,rootPresentation,image:media(id,'image'),audio:media(id,'audio')});

export const AUTUMN_TARGETS=freeze([
 target('first-rain','היורה','הַיּוֹרֶה','הגשם הראשון של הסתיו'),
 target('long-clothes','לבוש ארוך','לְבוּשׁ אָרֹךְ','בגדים שמכסים את הידיים והרגליים',reviewedRoot('לבוש',['ל','ב','ש'],['g0','g1','g3'],['Pealim:לבוש','Wiktionary:לבוש'])),
 target('transition-season','עונת מעבר','עוֹנַת מַעֲבָר','עונה בין הקיץ לחורף',reviewedRoot('מעבר',['ע','ב','ר'],['g6','g7','g8'],['Pealim:מעבר','Wiktionary:מעבר'])),
 target('field-snail','חלזון השדה / שבלול','חִלָּזוֹן הַשָּׂדֶה / שַׁבְּלוּל','חילזון שיוצא אחרי הגשם'),
 target('wagtail','נחליאלי','נַחֲלִיאֵלִי','ציפור קטנה שמגיעה בסתיו'),
 target('crocus','סתוונית','סִתְוָנִית','פרח שמופיע בסתיו'),
 target('fallen-leaves','עלי שלכת','עֲלֵי שַׁלֶּכֶת','עלים שהתייבשו ונשרו',reviewedRoot('שלכת',['ש','ל','ך'],['g4','g5','g6'],['Pealim:שלכת'])),
 target('storks','להקת חסידות','לַהֲקַת חֲסִידוֹת','קבוצה של חסידות נודדות'),
 target('squill','חצב','חָצָב','פרח גבוה שפורח בסוף הקיץ ובסתיו'),
 target('migrating-birds','ציפורים נודדות','צִפּוֹרִים נוֹדְדוֹת','ציפורים שעוברות לארץ אחרת',reviewedRoot('נודדות',['נ','ד','ד'],['g7','g9','g10'],['משרד-החינוך:נ-ד-ד','Avnion:נודד']))
 ]);

export const AUTUMN_RU_HINTS=freeze({
 'first-rain':freeze({text:'первый осенний дождь',audioSrc:'./audio/uploaded/a175f7cb7c5367db.mp3'}),
 'long-clothes':freeze({text:'длинная одежда',audioSrc:'./audio/uploaded/3cf70d5cb43a6c51.mp3'}),
 'transition-season':freeze({text:'переходный сезон',audioSrc:'./audio/uploaded/2e0d90340cae6bb0.mp3'}),
 'field-snail':freeze({text:'полевая улитка',audioSrc:'./audio/uploaded/0c96476ac48b6214.mp3'}),
 'wagtail':freeze({text:'трясогузка',audioSrc:'./audio/uploaded/0215af98b2db83c2.mp3'}),
 'crocus':freeze({text:'осенний крокус',audioSrc:'./audio/uploaded/89e615ee5a303507.mp3'}),
 'fallen-leaves':freeze({text:'опавшие листья',audioSrc:'./audio/uploaded/87e3c6e856eac8b1.mp3'}),
 'storks':freeze({text:'стая аистов',audioSrc:'./audio/uploaded/2e3568d392620359.mp3'}),
 'squill':freeze({text:'хацав, осенний цветок',audioSrc:'./audio/uploaded/1ba24a837f0161ff.mp3'}),
 'migrating-birds':freeze({text:'перелётные птицы',audioSrc:'./audio/uploaded/340b3900f2adf137.mp3'})
});

export const AUTUMN_POINTED_SUPPORT=freeze({
 'first-rain':'הַגֶּשֶׁם הָרִאשׁוֹן שֶׁל הַסְּתָיו',
 'long-clothes':'בְּגָדִים שֶׁמְּכַסִּים אֶת הַיָּדַיִם וְהָרַגְלַיִם',
 'transition-season':'עוֹנָה בֵּין הַקַּיִץ לַחוֹרֶף',
 'field-snail':'חִלָּזוֹן שֶׁיּוֹצֵא אַחֲרֵי הַגֶּשֶׁם',
 'wagtail':'צִפּוֹר קְטַנָּה שֶׁמַּגִּיעָה בַּסְּתָיו',
 'crocus':'פֶּרַח שֶׁמּוֹפִיעַ בַּסְּתָיו',
 'fallen-leaves':'עָלִים שֶׁהִתְיַבְּשׁוּ וְנָשְׁרוּ',
 'storks':'קְבוּצָה שֶׁל חֲסִידוֹת נוֹדְדוֹת',
 'squill':'פֶּרַח גָּבוֹהַּ שֶׁפּוֹרֵחַ בְּסוֹף הַקַּיִץ וּבַסְּתָיו',
 'migrating-birds':'צִפּוֹרִים שֶׁעוֹבְרוֹת לְאֶרֶץ אַחֶרֶת'
});

export const AUTUMN_COMPREHENSION=freeze([
 freeze({id:'when-autumn',question:'מתי מגיע הסתיו?',answer:'הסתיו מגיע אחרי הקיץ ולפני החורף.',options:freeze(['באמצע הקיץ.','הסתיו מגיע אחרי הקיץ ולפני החורף.','אחרי האביב.'])}),
 freeze({id:'leaves-in-autumn',question:'מה קורה לעלים בעונת הסתיו?',answer:'העלים משנים את צבעם, מתייבשים ונושרים מהעצים.',options:freeze(['העלים משנים את צבעם, מתייבשים ונושרים מהעצים.','העלים הופכים לפרחים.','העלים גדלים מהר יותר.'])}),
 freeze({id:'leaves-return',question:'מתי יצמחו העלים בחזרה על העצים?',answer:'העלים יצמחו בחזרה בעונת האביב.',options:freeze(['בעונת החורף.','בעונת הקיץ.','העלים יצמחו בחזרה בעונת האביב.'])})
]);

// Preserve the authored Stage-A catalog for provenance/QA. It is not a compulsory learner route.
const rotate=(values,n)=>freeze([...values.slice(n%values.length),...values.slice(0,n%values.length)]);
const otherTargets=(index)=>[AUTUMN_TARGETS[(index+3)%10],AUTUMN_TARGETS[(index+7)%10]];
const steps=[];
for(const t of AUTUMN_TARGETS)steps.push(freeze({id:`introduce-${t.id}`,stage:'introduce',mechanic:'introduction',targetId:t.id}));
AUTUMN_TARGETS.forEach((t,i)=>steps.push(freeze({id:`focus-${t.id}`,stage:'practice',mechanic:'focus-choice',targetId:t.id,options:rotate([t,...otherTargets(i)],i)})));
AUTUMN_TARGETS.forEach((t,i)=>steps.push(freeze({id:`build-${t.id}`,stage:'practice',mechanic:'word-build',targetId:t.id,letters:freeze(rotate([...t.word.replace(/[\s/]/g,'')],i+1))})));
AUTUMN_TARGETS.forEach((t,i)=>steps.push(freeze({id:`listen-${t.id}`,stage:'practice',mechanic:'audio-picture',targetId:t.id,options:rotate([t,...otherTargets(i)],i+1)})));
for(const q of AUTUMN_COMPREHENSION)steps.push(freeze({id:`comprehension-${q.id}`,stage:'comprehension',mechanic:'focus-choice',questionId:q.id,options:q.options}));

export const DASHA_HEBREW_AUTUMN_COURSE_V1=freeze({
 version:'dasha-he-autumn-1-beta3',courseId:'he-school-autumn-1',title:'סתיו 1',direction:'rtl',theme:'garden',companion:'Nomi',
 publicationStatus:'supervised-beta',betaLearners:freeze(['ilia','anya','dasha']),learnerHistoryEligible:true,provenance:'School Now · 2026-10-06-he-autumn-signs',
 evidencePolicy:'teaching-only-no-mastery-evidence',targets:AUTUMN_TARGETS,comprehension:AUTUMN_COMPREHENSION,steps:freeze(steps)
});

export function validateDashaHebrewAutumnCourseV1(){
 const c=DASHA_HEBREW_AUTUMN_COURSE_V1;
 if(c.targets.length!==10||new Set(c.targets.map(t=>t.id)).size!==10)throw Error('expected 10 unique targets');
 if(c.comprehension.length!==3)throw Error('expected 3 comprehension questions');
 if(c.steps.slice(0,10).some(x=>x.stage!=='introduce'))throw Error('all targets must be introduced first');
 if(c.targets.some(t=>t.image.status!=='missing'||t.audio.status!=='missing'||!t.image.slotId||!t.audio.slotId))throw Error('missing stable media placeholder');
 if(new Set(c.targets.flatMap(t=>[t.image.slotId,t.audio.slotId])).size!==20)throw Error('duplicate media slot');
 if(c.steps.length!==43)throw Error('unexpected route length');
 return {targets:10,comprehension:3,steps:43,mediaPlaceholders:20,mechanics:[...new Set(c.steps.map(s=>s.mechanic))]};
}

const targetBy=id=>AUTUMN_TARGETS.find(t=>t.id===id);
const primaryForm=t=>t.word.split('/')[0].trim();
const candidateAudio=new Map(AUTUMN1_PILOT.rows.map(row=>[row.target,row.audio]));
const releasedFor=t=>{
 const asset=releasedAsset('he',t.word)||releasedAsset('he',primaryForm(t))||null;
 return {target:t.pointed,plainTarget:t.word,display:t.pointed,meaning:AUTUMN_POINTED_SUPPORT[t.id]||t.support,image:asset?.image||null,audioSrc:asset?.audio||null,audioSha256:asset?.audioSha256||null,audioHumanQa:asset?.audioHumanQa||null,distractorLetters:[]};
};
function runtimeAsset(t,{personId='qa',learner=false}={}){
 const base=releasedFor(t),candidate=candidateAudio.get(primaryForm(t));
 // Playback eligibility follows the same declared family beta as the lesson.
 const betaAudio=(!learner||DASHA_HEBREW_AUTUMN_COURSE_V1.betaLearners.includes(personId))&&candidate?.src?candidate:null;
 return {...base,audioSrc:base.audioSrc||betaAudio?.runtimeSrc||betaAudio?.src||null,audioSha256:base.audioSha256||betaAudio?.sha256||null,audioHumanQa:base.audioHumanQa||(betaAudio?'needs-human-review':null),audioKind:base.audioSrc?'released':betaAudio?'beta-candidate':null,rootPresentation:t.rootPresentation||null};
}
export function autumnMediaCoverage(options={}){
 let images=0,audio=0;
 for(const t of AUTUMN_TARGETS){const a=options.beta?runtimeAsset(t,options):releasedFor(t);if(a.image)images++;if(a.audioSrc)audio++}
 return {images,audio,ready:images+audio,total:AUTUMN_TARGETS.length*2};
}

// Available-mechanic catalog retained for QA/tests. Learners no longer traverse this list linearly.
export function autumnRuntimePlan(){
 const tasks=[];
 for(const t of AUTUMN_TARGETS)tasks.push({id:'intro-'+t.id,mechanic:'intro',targetId:t.id});
 AUTUMN_TARGETS.forEach((t,i)=>tasks.push({id:'meaning-'+t.id,mechanic:'match',targetId:t.id,choices:[t,...otherTargets(i)].map(x=>x.id)}));
 for(const t of AUTUMN_TARGETS)tasks.push({id:'build-'+t.id,mechanic:'constructor',targetId:t.id});
 for(let i=0;i<AUTUMN_TARGETS.length;i+=2)tasks.push({id:'bubble-'+(i/2+1),mechanic:'bubble-match',targetIds:AUTUMN_TARGETS.slice(i,i+2).map(x=>x.id)});
 for(const id of ['first-rain','wagtail','crocus','squill'])tasks.push({id:'write-'+id,mechanic:'handwriting',targetId:id});
 for(const q of AUTUMN_COMPREHENSION)tasks.push({id:'comprehension-'+q.id,mechanic:'match',questionId:q.id});
 const imageReady=AUTUMN_TARGETS.filter(t=>!!releasedFor(t).image);
 for(const t of AUTUMN_TARGETS){const a=releasedFor(t);if(a.image&&imageReady.length>=3)tasks.push({id:'media-meaning-picture-'+t.id,mechanic:'meaning-picture',targetId:t.id});if(a.image)tasks.push({id:'media-picture-word-'+t.id,mechanic:'picture-word',targetId:t.id});if(a.audioSrc)tasks.push({id:'media-audio-word-'+t.id,mechanic:'audio-word',targetId:t.id});if(a.audioSrc&&a.image&&imageReady.length>=3)tasks.push({id:'media-audio-picture-'+t.id,mechanic:'audio-picture',targetId:t.id})}
 return tasks;
}

const successful=(history,stage)=>history.some(e=>e.stage===stage&&e.correct===true&&!e.usedHint);
const introduced=history=>history.some(e=>e.stage==='introduce');
function unresolvedStages(history,available){
 return available.filter(stage=>{
  const rows=history.filter(e=>e.stage===stage&&e.correct!==null);
  if(!rows.length)return false;
  let independent=-1,need=-1;
  rows.forEach((e,i)=>{
   if(e.correct===true&&!e.usedHint)independent=i;
   if(e.correct===false||(e.correct===true&&e.usedHint))need=i;
  });
  return need>independent;
 });
}
function nextAvailableStage(history,{hasAudio}={}){
 if(!introduced(history))return 'introduce';
 const available=availableWordLearningStages({hasAudio}).filter(x=>x!=='introduce');
 const unresolved=unresolvedStages(history,available);
 if(unresolved.length)return unresolved[0];
 for(const stage of available)if(!successful(history,stage))return stage;
 return 'word-build';
}
function targetPriority(history,{hasAudio}={}){
 const available=availableWordLearningStages({hasAudio}).filter(x=>x!=='introduce');
 const unresolved=unresolvedStages(history,available).length;
 const successes=history.filter(e=>e.correct===true&&!e.usedHint&&e.stage!=='introduce').length;
 const last=history.length?history.at(-1).at:0;
 return {unresolved,successes,last};
}
export function autumnAdaptiveNext(state,{personId='qa',learner=false,lastTargetId=null,avoidTargetId=null,targetIds=null}={}){
 const rows=AUTUMN_TARGETS.map((t,index)=>{
  const history=autumn1TargetHistory(state,t.id),asset=runtimeAsset(t,{personId,learner}),stage=nextAvailableStage(history,{hasAudio:!!asset.audioSrc}),p=targetPriority(history,{hasAudio:!!asset.audioSrc});
  return {target:t,index,history,stage,asset,...p};
 }).filter(x=>!targetIds||targetIds.includes(x.target.id));
 const intro=rows.find(x=>x.stage==='introduce');if(intro)return intro;
 rows.sort((a,b)=>b.unresolved-a.unresolved||a.successes-b.successes||a.last-b.last||a.index-b.index);
 if(avoidTargetId&&rows.length>1&&rows[0].target.id===avoidTargetId)return rows.find(x=>x.target.id!==avoidTargetId)||rows[0];
 if(rows.length>1&&rows[0].target.id===lastTargetId&&rows[0].unresolved===0) return rows[1];
 return rows[0];
}

function mediaChoices(target,options,{requireImage=false}={}){
 const all=AUTUMN_TARGETS.filter(t=>!options.targetIds||options.targetIds.includes(t.id)).map(t=>({t,a:runtimeAsset(t,options)})).filter(x=>x.t.id===target.id||!requireImage||x.a.image);
 const own=all.find(x=>x.t.id===target.id),rest=all.filter(x=>x.t.id!==target.id);
 return [own,...rest].filter(Boolean).slice(0,3).map(x=>x.a);
}
const uuid=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const PRACTICE_LIMIT=8;

export function mountDashaHebrewAutumnCourseV1({app,onExit=()=>{},onPackComplete=null,personId=null,learner=false,initialPack=null,storeOverride=null}={}){
 validateDashaHebrewAutumnCourseV1();
 const context=optionalLanguagesSessionContext();personId=personId||context?.personId||'qa';
 if(learner&&!['ilia','anya','dasha'].includes(personId)){
  app.innerHTML='<section class="card panel"><h1 dir="rtl">סתיו 1</h1><p>הַשִּׁעוּר מוֹפִיעַ בַּתַּפְרִיט, אֲבָל עֲדַיִן לֹא פֻּרְסַם לַתַּלְמִידָה.</p><button class="quiet" id="autumn-locked-back">←</button></section>';
  app.querySelector('#autumn-locked-back').onclick=onExit;return {destroy(){}};
 }
 const options={personId,learner,targetIds:null};
 let packIndex=0;
 const packTargets=()=>AUTUMN_TARGETS.slice(packIndex*5,packIndex*5+5);
 // Owner mirror injects a per-visit RAM store seeded from Dasha's server
 // history. It must NEVER open the production Autumn store under Ilia's ID.
 if(storeOverride&&learner)throw Error('Cannot override a real learner store');
 if(storeOverride&&storeOverride.owner!=='nomi-owner-mirror-ephemeral')
  throw Error('Autumn mirror needs a constrained memory-only store');
 const store=storeOverride||openAutumn1Store({isolated:!learner,ownerOverride:personId});
 let state=store.load(),active=null,audio=null,timer=null,disposed=false,lastTargetId=null,deferredTargetId=null,practiceDone=0,wordBankOpen=false,renderEpoch=0,introBrowseIndex=null;
 const sessionId=uuid(),deviceId=learner?autumn1DeviceId():('qa-'+uuid());
 const cleanup=()=>{active?.destroy?.();active=null;audio?.stop?.();audio=null;if(timer){clearTimeout(timer);timer=null}};
 const playExternal=(src,text,language)=>{if(!src||disposed)return;audio?.stop?.();audio=playLearnerAudio({src,text,language,isActive:()=>!disposed})};
 const append=async({targetId,stage,mechanic,correct=null,completed=false,assisted=false,usedHint=false,buildLevel=null,detail=null})=>{
  const event={schema:1,eventId:uuid(),attemptId:uuid(),sessionId,deviceId,courseId:DASHA_HEBREW_AUTUMN_COURSE_V1.courseId,courseRevision:DASHA_HEBREW_AUTUMN_COURSE_V1.version,taskId:stage+'-'+targetId,targetId,stage,mechanic,correct,completed,assisted,usedHint,buildLevel,detail,countsAsEvidence:false,at:Date.now()};
  const local=store.appendLocal(event);state=local.state;if(learner)store.sync().then(x=>{if(!disposed&&x?.state)state=x.state}).catch(()=>{});
  return event;
 };
 const introCount=()=>packTargets().filter(t=>introduced(autumn1TargetHistory(state,t.id))).length;
 const betaCoverage=()=>autumnMediaCoverage({...options,beta:true});
 const introRow=index=>{const t=AUTUMN_TARGETS[index],history=autumn1TargetHistory(state,t.id);return {target:t,index,history,stage:'introduce',asset:runtimeAsset(t,options)}};

 const shell=row=>{
  cleanup();app.lang='he';app.dir='rtl';app.className='autumn-learning-engine-host nomi-v2 nomi-v2-autumn';
  const isIntro=row.stage==='introduce',number=isIntro?row.index-packIndex*5+1:practiceDone+1,total=isIntro?5:PRACTICE_LIMIT;
  const learnerTools='<button class="quiet" id="autumn-words">5 מילים</button>'+(isIntro?'':'<button class="quiet autumn-skip" id="autumn-skip">לא זוכרת</button>');
  app.innerHTML='<div class="task-shell narrow alpha20-shell autumn-engine-shell"><div class="task-top"><button class="quiet" id="autumn-exit">×</button><strong>סתיו 1</strong><div class="alpha20-task-count" dir="ltr">'+number+' / '+total+'</div></div><div class="alpha20-progress"><i style="--p:'+Math.round((number-1)/Math.max(1,total)*100)+'%"></i></div>'+'<div id="autumn-stage" data-mechanic-viewport="true"></div><div class="autumn-lesson-tools">'+learnerTools+'</div></div>';
  app.querySelector('#autumn-exit').onclick=onExit;app.querySelector('#autumn-words').onclick=()=>showWordBank(row,{entry:false});
  app.querySelector('#autumn-skip')?.addEventListener('click',()=>skipRow(row));
  const stage=app.querySelector('#autumn-stage');stage.dataset.layoutPolicy='responsive';return stage;
 };

 const showWordBank=(returnRow=null,{entry=false}={})=>{
  cleanup();wordBankOpen=true;app.lang='he';app.dir='rtl';app.className='autumn-learning-engine-host nomi-v2 nomi-v2-autumn';
  const card=t=>{
   const a=runtimeAsset(t,options),h=AUTUMN_RU_HINTS[t.id];
   return '<article class="autumn-word-card nomi-v2-glass nomi-v2-card" dir="rtl" data-word-card="'+t.id+'">'+
    '<button type="button" class="autumn-word-image" data-he-audio="'+t.id+'" aria-label="לשמוע את המילה">'+(a.image?'<img src="'+a.image+'" alt="">':'')+'</button>'+
    '<b>'+t.pointed+'</b><small class="autumn-word-ru" dir="ltr">'+h.text+'</small>'+
    '<button type="button" class="quiet autumn-word-ru-audio" data-ru-audio="'+t.id+'" aria-label="Русская подсказка" title="Русская подсказка">🇷🇺</button></article>';
  };
  const cards=[0,1,2,3,4].map(copy=>packTargets().map(t=>card(t).replace('data-word-card="'+t.id+'"','data-carousel-copy="'+copy+'" data-word-card="'+t.id+'"')).join('')).join('');
  const action=entry?'מַמְשִׁיכִים ✦':'חזרה';
  const nomi=luni('idle').replace('class="luni-mascot"','class="luni-mascot" data-nomi-art="autumn-guide"');
  app.innerHTML='<div class="task-shell narrow alpha20-shell autumn-engine-shell autumn-word-bank-shell nomi-v2-autumn-overview">'+
   '<div class="task-top autumn-v2-top"><button class="quiet" id="autumn-bank-exit">×</button><div class="autumn-v2-heading"><strong>5 מילים · סתיו</strong><small>מגלים, מקשיבים ומשחקים</small></div><span></span></div>'+
   '<div class="autumn-v2-nomi" aria-hidden="true">'+nomi+'<span>הקש על התמונה כדי לשמוע</span></div>'+
   '<div class="autumn-word-bank nomi-v2-fade-edge" dir="ltr">'+cards+'</div>'+
   '<div class="autumn-bank-actions"><button class="nomi-v2-cta" id="autumn-bank-continue">'+action+'</button></div></div>';
  app.querySelector('#autumn-bank-exit').onclick=onExit;
  app.querySelectorAll('[data-word-card]').forEach(cardEl=>{
    const t=targetBy(cardEl.dataset.wordCard);
    const word=cardEl.querySelector('b');
    if(t&&word)mountHebrewPresentation(word,t.pointed,{rootPresentation:t.rootPresentation});
  });
  app.querySelectorAll('[data-he-audio]').forEach(btn=>btn.onclick=()=>{const t=targetBy(btn.dataset.heAudio),a=runtimeAsset(t,options);playExternal(a.audioSrc,primaryForm(t),'he')});
  app.querySelectorAll('[data-ru-audio]').forEach(btn=>btn.onclick=()=>{const h=AUTUMN_RU_HINTS[btn.dataset.ruAudio];playExternal(h.audioSrc,h.text,'ru')});
  const bank=app.querySelector('.autumn-word-bank');
  let carouselAdjusting=false,cycleWidth=0,focusFrame=0;
  const measureCycle=()=>{
   const first=bank.querySelector('[data-carousel-copy="0"][data-word-card="'+packTargets()[0].id+'"]');
   const middle=bank.querySelector('[data-carousel-copy="2"][data-word-card="'+packTargets()[0].id+'"]');
   cycleWidth=first&&middle?(middle.offsetLeft-first.offsetLeft)/2:0;
   return {first,middle};
  };
  const updateFocus=()=>{
   const center=bank.getBoundingClientRect().left+bank.clientWidth/2;
   let best=null,bestDistance=Infinity;
   bank.querySelectorAll('.autumn-word-card').forEach(el=>{
    const r=el.getBoundingClientRect(),distance=Math.abs(r.left+r.width/2-center);
    if(distance<bestDistance){bestDistance=distance;best=el}
    const proximity=Math.max(0,1-distance/Math.max(1,bank.clientWidth*.65));el.style.setProperty('--carousel-opacity',String(.86+.14*proximity));el.style.setProperty('--carousel-scale',String(.97+.03*proximity));
   });
   bank.querySelectorAll('.autumn-word-card').forEach(el=>el.classList.toggle('is-carousel-focus',el===best));
  };
  const scheduleFocus=()=>{if(focusFrame)return;focusFrame=requestAnimationFrame(()=>{focusFrame=0;updateFocus()})};
  const centerMiddle=()=>{
   const {middle}=measureCycle();if(!middle||!cycleWidth)return;
   bank.scrollLeft=middle.offsetLeft-(bank.clientWidth-middle.getBoundingClientRect().width)/2;
   updateFocus();
  };
  let carouselIdleTimer=0;
  const normalizeInfinite=()=>{
   carouselIdleTimer=0;
   if(carouselAdjusting||!cycleWidth)return;
   const left=bank.scrollLeft;
   let next=left;
   // Do not teleport while a finger or momentum scroll is active. WebKit can
   // otherwise fight scroll-snap and pin the carousel around one card.
   // Wrap only deep inside an outer copy. A wide middle zone prevents
   // WebKit scroll-snap from bouncing between a snapped card and a wrap boundary.
   if(left<cycleWidth*.75)next=left+cycleWidth*2;
   else if(left>cycleWidth*3.25)next=left-cycleWidth*2;
   if(Math.abs(next-left)>.5){
    carouselAdjusting=true;
    bank.style.scrollSnapType='none';
    bank.scrollLeft=next;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
     bank.style.scrollSnapType='';
     carouselAdjusting=false;
     normalizeInfinite();
    }));
   }else updateFocus();
  };
  const keepInfinite=()=>{
   scheduleFocus();
   clearTimeout(carouselIdleTimer);
   normalizeInfinite();
  };
  // Repeated copies preserve the visible word when crossing a wrap boundary.
  bank.addEventListener('scroll',keepInfinite,{passive:true});
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!bank.isConnected)return;centerMiddle();updateFocus()}));
  const observer=new ResizeObserver(()=>{measureCycle();scheduleFocus()});observer.observe(bank);
  active={destroy(){observer.disconnect();bank.removeEventListener('scroll',keepInfinite);if(focusFrame)cancelAnimationFrame(focusFrame);clearTimeout(carouselIdleTimer)}};
  app.querySelector('#autumn-bank-continue').onclick=()=>{
   wordBankOpen=false;
   if(entry){
    const pending=AUTUMN_TARGETS.findIndex(t=>!introduced(autumn1TargetHistory(state,t.id)));
    introBrowseIndex=pending>=0?pending:0;
    render(introRow(introBrowseIndex));
    return;
   }
   if(returnRow?.stage==='introduce'){introBrowseIndex=returnRow.index;render(introRow(returnRow.index));}
   else if(returnRow)render(returnRow);else sessionComplete();
  };
 };

 const showRepairCard=row=>{
  cleanup();const t=row.target,a=row.asset;
  app.lang='he';app.dir='rtl';app.className='autumn-learning-engine-host nomi-v2 nomi-v2-autumn';
  app.innerHTML='<div class="task-shell narrow alpha20-shell autumn-engine-shell is-repair"><div class="task-top"><button class="quiet" id="autumn-repair-exit">×</button><strong>סתיו 1</strong><span></span></div><section class="card panel autumn-repair-card"><p class="muted">נזכור את המילה ואז ננסה שוב</p>'+(a.image?'<img class="autumn-repair-image" src="'+a.image+'" alt="">':'')+'<h1 dir="rtl">'+t.pointed+'</h1><p dir="rtl">'+t.support+'</p><button class="quiet" id="autumn-repair-audio" type="button">🔊 לשמוע</button><button class="primary" id="autumn-repair-again" type="button">ננסה שוב</button></section></div>';
  app.querySelector('#autumn-repair-exit').onclick=onExit;
  app.querySelector('#autumn-repair-audio').onclick=()=>playExternal(a.audioSrc,primaryForm(t),'he');
  app.querySelector('#autumn-repair-again').onclick=()=>render(row);
 };
 const finish=async(row,result={})=>{
  const correct=result.correct??true;
  await append({targetId:row.target.id,stage:row.stage,mechanic:row.stage,correct:row.stage==='introduce'?null:correct,completed:correct!==false,assisted:row.stage==='introduce'||!!result.assisted||!!result.usedHint,usedHint:!!result.usedHint,buildLevel:result.buildLevel||null,detail:result});
  lastTargetId=row.target.id;
  if(row.stage==='introduce')return;
  if(correct===false){showRepairCard(row);return}
  cleanup();practiceDone++;
  timer=setTimeout(()=>render(),420);
 };

 const skipRow=async row=>{
  await append({targetId:row.target.id,stage:row.stage,mechanic:row.stage,correct:false,completed:false,assisted:false,usedHint:false,detail:{outcome:'unknown',userAction:'skip'}});
  lastTargetId=row.target.id;showRepairCard(row);
 };

 const attachPracticeHint=(stage,row,onUse)=>{
  const h=AUTUMN_RU_HINTS[row.target.id];if(!h)return;
  const button=document.createElement('button');button.type='button';button.className='quiet autumn-task-ru-hint';button.textContent='🇷🇺';button.setAttribute('aria-label','Русская подсказка');button.setAttribute('title','Русская подсказка');
  button.onclick=()=>{onUse();playExternal(h.audioSrc,h.text,'ru')};
  stage.append(button);
 };

 function mountRow(stage,row){
  const t=row.target,a=row.asset;
  if(row.stage==='introduce'){
   const h=AUTUMN_RU_HINTS[t.id],already=introduced(row.history);
   return mountWordIntroduction(stage,{language:'he',target:t.word,displayTarget:t.pointed,image:a.image,meaning:a.meaning,audioSrc:a.audioSrc,rootPresentation:t.rootPresentation,allowMissingMedia:false,hintText:h.text,hintAudioSrc:h.audioSrc},{
    useProductionLayout:false,continueLabel:row.index===packIndex*5+4?'למשחקים':'הבא',audioEnabled:!!a.audioSrc,backEnabled:row.index>packIndex*5,onBack:row.index>packIndex*5?()=>{introBrowseIndex=row.index-1;render(introRow(introBrowseIndex))}:null,
    onContinue:async meta=>{
     if(!already)await append({targetId:t.id,stage:'introduce',mechanic:'introduce',correct:null,completed:true,assisted:true,usedHint:!!meta?.hintUsed,detail:{media:{image:!!a.image,audio:!!a.audioSrc},hintCount:meta?.hintCount||0}});
     if(row.index<packIndex*5+4){introBrowseIndex=row.index+1;render(introRow(introBrowseIndex));}
     else{introBrowseIndex=null;render();}
    }
   });
  }
  let taskHintUsed=false,handle;
  if(['meaning-picture','audio-picture','picture-word','audio-word'].includes(row.stage)){
   const choices=mediaChoices(t,options,{requireImage:['meaning-picture','audio-picture'].includes(row.stage)});
   handle=mountWordStage(stage,{language:'he',asset:a,stage:row.stage,choices,nikudLevel:'full-nikud',trialIndex:state.events.length,audioEnabled:!!a.audioSrc,onResult:r=>finish(row,{...r,correct:!!r.correct,usedHint:taskHintUsed||!!r.usedHint,assisted:taskHintUsed||!!r.assisted})});
   attachPracticeHint(stage,row,()=>{taskHintUsed=true});return handle;
  }
  if(row.stage==='word-build'){
   const plain=primaryForm(t),pointed=t.pointed.split('/')[0].trim(),words=pointed.split(/\s+/).filter(Boolean),buildHistory=row.history.filter(x=>x.stage==='word-build'&&x.buildLevel),level=nextBuildLevel(buildHistory.map(x=>({level:x.buildLevel,correct:x.correct,usedHint:x.usedHint})));
   const instructionHost=document.createElement('div');instructionHost.className='autumn-build-instruction';const instructionText=document.createElement('span');instructionText.textContent=words.length>1?'סַדְּרִי אֶת הַמִּלִּים':'סַדְּרִי אֶת הָאוֹתִיּוֹת וּבְנִי אֶת הַמִּלָּה';instructionHost.append(instructionText);stage.append(instructionHost);
   mountInstructionAudio(instructionHost,{text:words.length>1?'סַדְּרִי אֶת הַמִּלִּים':'סַדְּרִי אֶת הָאוֹתִיּוֹת וּבְנִי אֶת הַמִּלָּה',language:'he',autoPlay:false,label:'לשמוע את ההוראה'});
   const opts={language:'he',distractors:level==='distractors'||level==='blind-length'?['א','מ','ת']:[],onResult:r=>finish(row,{...r,correct:!!r.correct,buildLevel:level,usedHint:taskHintUsed||!!r.usedHint,assisted:taskHintUsed||!!r.assisted})};
   if(words.length>1){opts.mode='phrase';opts.expected=words}else{opts.mode='letters';opts.target=pointed;opts.parts=Array.from(new Intl.Segmenter('he',{granularity:'grapheme'}).segment(pointed),x=>x.segment)}
   handle=mountBubbleConstructor(stage,opts);stage.querySelector('.bubble-constructor').prepend(instructionHost);attachPracticeHint(stage,row,()=>{taskHintUsed=true});return handle;
  }
  throw Error('Unsupported Autumn adaptive stage: '+row.stage);
 }

 function sessionComplete(){
  cleanup();try{if(learner)onPackComplete?.(packIndex)}catch{}const weak=packTargets().filter(t=>{const h=autumn1TargetHistory(state,t.id),a=runtimeAsset(t,options);return targetPriority(h,{hasAudio:!!a.audioSrc}).unresolved>0}).length;
  app.innerHTML='<section class="card panel alpha20-block-complete autumn-complete"><h1 dir="rtl">כָּל הַכָּבוֹד!</h1><p dir="rtl">סיימנו סבב קצר. נומי תזכור במה כדאי להתאמן בפעם הבאה.</p><p class="muted">'+(weak?('מילים שנחזור אליהן: '+weak):'כל הכבוד על התרגול')+'</p><div class="word-loop-completion-actions"><button class="primary" id="autumn-more">עוד סבב</button><button class="quiet" id="autumn-done">חזרה לעברית</button><button class="quiet" id="autumn-review-words">5 מילים</button></div></section>';
  app.querySelector('#autumn-more').onclick=()=>{practiceDone=0;render()};app.querySelector('#autumn-done').onclick=onExit;app.querySelector('#autumn-review-words').onclick=()=>showWordBank(null,{entry:false});
 }

 async function render(forcedRow=null){
  if(disposed||wordBankOpen)return;const epoch=++renderEpoch;
  if(introCount()===5&&practiceDone>=PRACTICE_LIMIT){sessionComplete();return}
  const avoidTargetId=deferredTargetId;deferredTargetId=null;
  const row=forcedRow||autumnAdaptiveNext(state,{...options,lastTargetId,avoidTargetId});const stage=shell(row);
  try{active=mountRow(stage,row);await applyProductionMechanicLayout(stage,{mechanic:row.stage==='word-build'?'constructor':row.stage,source:'lesson'})}
  catch(error){if(epoch!==renderEpoch)return;stage.innerHTML='<section class="card panel word-loop-save-error" role="alert"><h1>עוֹד רֶגַע</h1><p>'+String(error?.message||error)+'</p><button class="primary" id="autumn-retry">נַסִּי שׁוּב</button></section>';stage.querySelector('#autumn-retry').onclick=()=>render(row)}
 }

 function showPacks(){
  cleanup();wordBankOpen=false;app.lang='he';app.dir='rtl';app.className='autumn-learning-engine-host nomi-v2 nomi-v2-autumn';
  app.innerHTML='<section class="autumn-pack-menu nomi-glass"><button class="quiet" data-pack-back>×</button><h1>סתיו</h1><p>חמש מילים בכל חלק</p><div class="autumn-packs">'+[0,1].map(i=>'<button class="kuromi-topic" data-autumn-pack="'+i+'"><strong>חלק '+(i+1)+'</strong><small>'+AUTUMN_TARGETS.slice(i*5,i*5+5).map(x=>x.pointed).join(' · ')+'</small></button>').join('')+'</div></section>';
  app.querySelector('[data-pack-back]').onclick=onExit;
  app.querySelectorAll('[data-autumn-pack]').forEach(b=>b.onclick=()=>{packIndex=Number(b.dataset.autumnPack);options.targetIds=packTargets().map(x=>x.id);practiceDone=0;lastTargetId=null;render()});
 }
 app.className='autumn-learning-engine-host nomi-v2 nomi-v2-autumn';app.innerHTML='<section class="autumn-loading" role="status">פותחים את השיעור…</section>';
 (async()=>{try{const hydrated=await store.hydrate();if(hydrated?.state)state=hydrated.state}catch{}if(!disposed){if(Number.isInteger(initialPack)&&initialPack>=0&&initialPack<2){packIndex=initialPack;options.targetIds=packTargets().map(x=>x.id);render()}else showPacks()}})();
 return {destroy(){disposed=true;cleanup()}};
}
