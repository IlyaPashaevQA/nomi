import {mountLuniCompanion} from './luni-companion.mjs';
import {pointedHebrew} from './hebrew-presentation.mjs';
import {markLearningBubble} from './learning-bubble-contract.mjs';

const strip=s=>String(s??'').normalize('NFD').replace(/[\u0591-\u05c7]/g,'').trim();
const normalizeToken=s=>strip(s).replace(/\s+/g,' ');
const MODE_JOIN=Object.freeze({letters:'',chunks:'',phrase:' ',sentence:' ',text:' '});

export const CONSTRUCTOR_MODES=Object.freeze(['letters','chunks','phrase','sentence','text']);

export function constructorDemo(mode='letters'){
  if(mode==='chunks')return{mode,target:'מסמר',parts:['מס','מר'],distractors:['פט','יש']};
  if(mode==='phrase')return{mode,expected:['חג','שמח'],distractors:['סוכה']};
  if(mode==='sentence')return{mode,expected:['הילדים','למדו','אושפיזין','בכיתה'],distractors:['היום']};
  if(mode==='text')return{mode,expected:['הילדים למדו','אושפיזין בכיתה'],distractors:['בחג הסוכות']};
  return{mode:'letters',target:'סוכה',parts:['ס','ו','כ','ה'],distractors:['מ','ש']};
}

export function mountBubbleConstructor(host,{mode='letters',target='',parts=null,expected=null,distractors=[],language='he',initialPlaced=0,initialTokens=null,onChange=()=>{},progressiveSlots=false,numberedSlots=false,presentation='pointed',renderToken=null,onResult=()=>{}}={}){
  if(!host||!CONSTRUCTOR_MODES.includes(mode))throw Error('Bubble constructor needs a supported mode');
  if(progressiveSlots&&mode!=='letters')throw Error('Progressive slots require letter mode');
  if(!['pointed','literal'].includes(presentation))throw Error('Unknown constructor token presentation');
  const presented=text=>presentation==='literal'?text:pointedHebrew(text);
  const joiner=MODE_JOIN[mode];
  const baseExpected=(expected?.length?expected:(parts?.length?parts:(target?[...strip(target).replace(/\s/g,'')]:[]))).map(String);
  if(!baseExpected.length)throw Error('Bubble constructor needs expected tokens');

  host.replaceChildren();
  host.classList.add('bubble-constructor-host');
  const root=document.createElement('div');root.className=numberedSlots?'nomi-reading-sequence-constructor':'bubble-constructor';root.dataset.constructorMode=mode;root.dataset.progressiveSlots=String(progressiveSlots);root.dataset.numberedSlots=String(numberedSlots);
  const top=document.createElement('div');top.className=numberedSlots?'sequence-bank':'constructor-bank constructor-bank-top';
  const field=document.createElement('div');field.className=numberedSlots?'sequence-field':'constructor-field';
  const answer=document.createElement('div');answer.className=numberedSlots?'sequence-answer-zone':'constructor-answer-zone';answer.dir=language==='he'?'rtl':'ltr';
  const answerHint=document.createElement('span');answerHint.className='constructor-answer-hint';answerHint.textContent=language==='he'?'כָּאן בּוֹנִים':language==='en'?'Build here':'Собери здесь';
  answer.append(answerHint);
  const nomiAnchor=document.createElement('div');nomiAnchor.className='constructor-nomi-anchor luni-companion-slot';
  field.append(answer,nomiAnchor);
  const bottom=document.createElement('div');bottom.className=numberedSlots?'sequence-bank-bottom':'constructor-bank constructor-bank-bottom';
  const feedback=document.createElement('p');feedback.className=numberedSlots?'sequence-feedback':'demo-feedback constructor-feedback';feedback.setAttribute('aria-live','polite');
  root.append(top,field,bottom,feedback);host.append(root);

  const companion=numberedSlots?{setState(){},destroy(){}}:mountLuniCompanion(nomiAnchor,{state:'building',roaming:true,strictAvoidance:true,calm:true,label:'נוֹמִי'});
  const bankTokens=[...baseExpected,...distractors.map(String)].map((text,id)=>({id,text}));
  const ordered=bankTokens.slice().sort((a,b)=>(((a.id*7+baseExpected.length*3)%17)-((b.id*7+baseExpected.length*3)%17))||a.id-b.id);
  let placed=bankTokens.slice(0,Math.max(0,Math.min(Number(initialPlaced)||0,baseExpected.length))),lastWrongKey='',destroyed=false;
  if(initialTokens){const used=new Set();placed=initialTokens.map(text=>{const t=bankTokens.find(t=>t.text===text&&!used.has(t.id));if(!t)throw Error('Invalid saved constructor response');used.add(t.id);return t})}

  const expectedKey=baseExpected.map(normalizeToken).join('\u0001');
  const value=()=>placed.map(x=>x.text);
  const valueKey=()=>value().map(normalizeToken).join('\u0001');
  const displayValue=()=>value().join(joiner);

  function grade(){
    if(placed.length!==baseExpected.length)return;
    const correct=valueKey()===expectedKey;
    const key=valueKey();
    root.classList.toggle('constructor-correct',correct);
    root.classList.toggle('constructor-wrong',!correct);
    feedback.textContent=correct?(language==='he'?'✓ מְצֻיָּן!':language==='en'?'✓ Well done!':'✓ Отлично!'):(language==='he'?'נְנַסֶּה שׁוּב':language==='en'?'Try again':'Попробуй ещё');
    companion.setState(correct?'cheering':'oops');
    if(correct||key!==lastWrongKey){
      if(!correct)lastWrongKey=key;
      onResult({correct,value:displayValue(),tokens:value(),mode});
    }
  }
  function clearGrade(){
    root.classList.remove('constructor-correct','constructor-wrong');feedback.textContent='';companion.setState('building');
  }
  function put(item,btn){
    if(destroyed||placed.length>=baseExpected.length||placed.some(x=>x.id===item.id))return false;
    if(progressiveSlots&&normalizeToken(item.text)!==normalizeToken(baseExpected[placed.length])){
      clearGrade();
      feedback.textContent=language==='he'?'נְנַסֶּה אוֹת אַחֶרֶת':'Try another letter';
      companion.setState('oops');
      root.dataset.progressiveLastAttempt='wrong-letter';
      return false;
    }
    clearGrade();
    root.dataset.progressiveLastAttempt='correct-letter';
    placed.push(item);btn.classList.remove('constructor-dragging');draw();onChange(value());grade();return true;
  }
  function remove(id){
    if(destroyed)return;const at=placed.findIndex(x=>x.id===id);if(at<0)return;
    clearGrade();placed.splice(at,1);draw();onChange(value());
  }
  function inAnswer(clientX,clientY){
    const r=answer.getBoundingClientRect();return clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom;
  }
  function wireDrag(btn,item){
    let drag=null;
    btn.onpointerdown=e=>{
      if(btn.disabled||(e.pointerType==='mouse'&&e.button!==0))return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
      btn.setPointerCapture?.(e.pointerId);btn.classList.add('constructor-dragging');e.preventDefault();
    };
    btn.onpointermove=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
      btn.style.transform=`translate3d(${dx}px,${dy}px,0) scale(1.05)`;e.preventDefault();
      answer.classList.toggle('constructor-drop-ready',inAnswer(e.clientX,e.clientY));
    };
    const end=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const moved=drag.moved,drop=inAnswer(e.clientX,e.clientY);
      drag=null;btn.classList.remove('constructor-dragging');btn.style.transform='';answer.classList.remove('constructor-drop-ready');
      if(drop||!moved)put(item,btn);
    };
    btn.onpointerup=end;btn.onpointercancel=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;btn.classList.remove('constructor-dragging');btn.style.transform='';answer.classList.remove('constructor-drop-ready')};
    // Keep keyboard/mouse activation equivalent to a tap. Pointer-up may have
    // already placed the token; put() is idempotent for an already placed id.
    btn.onclick=e=>{e.preventDefault();put(item,btn)};
  }
  function drawTokenLabel(button,text){
    if(renderToken){
      renderToken(button,presented(text));
      if(!button.textContent)throw Error('Constructor token decoration removed label');
    }else button.textContent=presented(text);
  }
  function bankButton(item){
    const b=document.createElement('button');b.type='button';b.className=numberedSlots?'sequence-token':'constructor-token learning-token-bubble';drawTokenLabel(b,item.text);b.dataset.tokenId=String(item.id);
    markLearningBubble(b,{force:mode==='text'?'phrase':null});b.disabled=placed.some(x=>x.id===item.id);if(numberedSlots)b.onclick=()=>put(item,b);else wireDrag(b,item);return b;
  }
  function answerButton(item){
    const b=document.createElement('button');b.type='button';b.className=numberedSlots?'sequence-answer-bubble':'constructor-answer-bubble learning-answer-bubble';drawTokenLabel(b,item.text);b.dataset.tokenId=String(item.id);markLearningBubble(b,{force:mode==='text'?'phrase':null});b.onclick=()=>remove(item.id);return b;
  }
  function draw(){
    top.replaceChildren();bottom.replaceChildren();
    ordered.forEach((item,i)=>(numberedSlots?top:i%2?bottom:top).append(bankButton(item)));
    answer.replaceChildren();
    if(numberedSlots){
      baseExpected.forEach((_,index)=>{
        const slot=document.createElement('div');slot.className='constructor-numbered-slot';
        const number=document.createElement('span');number.className='constructor-slot-number';number.textContent=String(index+1);
        slot.append(number);
        if(placed[index])slot.append(answerButton(placed[index]));
        else{
          const hint=document.createElement('span');hint.className='constructor-slot-placeholder';
          hint.textContent=language==='he'?['מה קרה בהתחלה?','מה קרה אחר כך?','מה קרה בסוף?'][index]||'המשפט הבא':'Next sentence';
          slot.append(hint);
        }
        answer.append(slot);
      });
    }else if(progressiveSlots){
      placed.forEach(item=>answer.append(answerButton(item)));
      if(placed.length<baseExpected.length){
       const empty=document.createElement('span');
       empty.className='constructor-progressive-open-slot';
       empty.dataset.progressiveOpenSlot='';
       empty.setAttribute('aria-label',
        language==='he'?'הָאוֹת הַבָּאָה':'Next letter');
       empty.setAttribute('role','img');
       answer.append(empty); // Standard Hebrew RTL order
      }
    }else if(!placed.length)answer.append(answerHint);
    else placed.forEach(item=>answer.append(answerButton(item)));
  }
  draw();
  if(initialTokens?.length===baseExpected.length)queueMicrotask(()=>{if(!destroyed)grade()});
  return{
    mode,
    value:displayValue,
    tokens:value,
    reset(){placed=[];lastWrongKey='';clearGrade();draw()},
    destroy(){destroyed=true;companion.destroy?.();host.replaceChildren()}
  };
}

