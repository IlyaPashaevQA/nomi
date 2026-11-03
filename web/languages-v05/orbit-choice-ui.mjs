import {mountLuniCompanion} from './luni-companion.mjs';
import {applyLearningBubbleContract} from './learning-bubble-contract.mjs';

const CONTACT_RATIO = 0.12;
const DROP_RATIO = 0.34;
const viewportGeometry=new WeakMap();
export function resetOrbitGeometry(root){
  const saved=viewportGeometry.get(root);
  if(saved)for(const [el,style] of saved.styles){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style)}
  viewportGeometry.delete(root);
}

export function orbitTextAnswerBox(stageWidth,naturalTextWidth,{tablet=false,large=false,learner=false}={}){
  const baseFont=(tablet?(learner?30:21):30)*(large?2:1);
  const diameter=large?(tablet?140:118):(tablet?(learner?115:96):92);
  const padding=tablet?(learner?34:30):28;
  const maxWidth=Math.max(diameter,Math.min(stageWidth*.46,(stageWidth-28)/2));
  const required=Math.max(1,naturalTextWidth)+padding;
  const fontSize=required>maxWidth?Math.max(16,baseFont*maxWidth/required):baseFont;
  const scaledText=naturalTextWidth*(fontSize/baseFont);
  return {fontSize,width:Math.max(diameter,Math.min(maxWidth,scaledText+padding)),height:diameter,maxWidth};
}
function fitOrbitTextAnswers(root){
  const stage=root.querySelector('.orbit-choice-stage');if(!stage)return;
  const view=root.ownerDocument?.defaultView||globalThis;
  const tablet=(view.innerWidth||stage.clientWidth)>=700&&view.matchMedia?.('(pointer:coarse)')?.matches===true;
  const large=root.closest('[data-four-enlarged-answers="true"]')!==null;
  const learner=tablet&&!!root.closest('#alpha20-stage,#autumn-stage');
  const baseFont=(tablet?(learner?30:21):30)*(large?2:1);
  for(const button of stage.querySelectorAll('.orbit-answer:not(.orbit-image)')){
    button.style.setProperty('font-size',baseFont+'px','important');
    button.style.setProperty('line-height','1.1','important');
    button.style.setProperty('white-space','nowrap','important');
    button.style.setProperty('width','max-content','important');
    button.style.setProperty('height','auto','important');
    button.style.setProperty('min-width','0','important');
    button.style.setProperty('min-height','0','important');
    const range=button.ownerDocument.createRange();range.selectNodeContents(button);
    const natural=Math.max(1,range.getBoundingClientRect().width);range.detach?.();
    const box=orbitTextAnswerBox(stage.clientWidth,natural,{tablet,large,learner});
    button.style.setProperty('font-size',box.fontSize+'px','important');
    button.style.setProperty('width',box.width+'px','important');
    button.style.setProperty('min-width',box.width+'px','important');
    button.style.setProperty('max-width',box.width+'px','important');
    button.style.setProperty('height',box.height+'px','important');
    button.style.setProperty('min-height',box.height+'px','important');
    button.style.setProperty('max-height',box.height+'px','important');
    button.style.setProperty('padding','0 14px','important');
    button.style.setProperty('border-radius','999px','important');
    button.style.setProperty('display','grid','important');
    button.style.setProperty('place-items','center','important');
  }
}

// Last-line geometry guard: presentation profiles may style controls, never merge them.
export function orbitSafeLayout(width,height,answers,token,gap=14,maxHeight=Infinity){
  const padding=12,cell=(width-padding*2-gap)/2;
  const needed=Math.max(0,...answers.slice(0,2).map(r=>r.height))+Math.max(0,...answers.slice(2).map(r=>r.height))+token.height;
  const scale=Math.min(1,(maxHeight-padding*2-gap*2)/Math.max(1,needed));
  const sizes=answers.map(r=>({width:Math.max(44,Math.min(r.width*scale,cell)),height:Math.max(44,r.height*scale)}));
  token={width:Math.max(44,token.width*scale),height:Math.max(44,token.height*scale)};
  const top=Math.max(0,...sizes.slice(0,2).map(r=>r.height));
  const bottom=Math.max(0,...sizes.slice(2).map(r=>r.height));
  height=Math.max(Math.min(height,maxHeight),padding*2+top+bottom+token.height+gap*2);
  return {height,answers:sizes.map((r,i)=>({...r,x:i%2?width-padding-r.width:padding,y:i<2?padding:height-padding-r.height})),
    token:{width:Math.min(token.width,width-padding*2),height:token.height,x:(width-Math.min(token.width,width-padding*2))/2,y:padding+top+gap+(height-padding*2-top-bottom-gap*2-token.height)/2}};
}
export function enforceOrbitGeometry(root){
  const stage=root.querySelector('.orbit-choice-stage');
  if(!stage?.isConnected)return;
  const answers=[...stage.querySelectorAll('.orbit-answer')],token=stage.querySelector('.orbit-token');
  if(!token||token.classList.contains('dragging'))return;
  // The same geometry guard serves Studio and lessons. A bounded task canvas
  // supplies the available height, including its surrounding banner/safe areas.
  const canvas=root.closest('[data-mechanic-viewport]');
  let maxHeight=Infinity;
  if(canvas){
    const box=canvas.getBoundingClientRect(),key=[box.width,box.height].join('|');
    if(viewportGeometry.get(root)?.key!==key){
      resetOrbitGeometry(root);
      viewportGeometry.set(root,{key,styles:[...root.querySelectorAll('.orbit-choice-prompt,.orbit-choice-stage,.orbit-answer,.orbit-token,img,.orbit-token .luni-companion,.orbit-token .luni-mascot,.orbit-token svg')].map(el=>[el,el.getAttribute('style')])});
    }
    const prompt=root.querySelector('.orbit-choice-prompt'),feedback=root.querySelector('.demo-feedback');
    const bounds=canvas.getBoundingClientRect();
    const available=Math.max(0,bounds.bottom-root.getBoundingClientRect().top);
    const cap=Math.max(44,available*.26);
    if(prompt.getBoundingClientRect().height>cap){
      const size=parseFloat(globalThis.getComputedStyle(prompt).fontSize);
      prompt.style.setProperty('height','auto','important');
      prompt.style.setProperty('min-height','0','important');
      prompt.style.setProperty('font-size',Math.max(24,size*cap/Math.max(cap,prompt.scrollHeight))+'px','important');
    }
    const feedbackHeight=feedback?Math.max(28,feedback.getBoundingClientRect().height)+28:0;
    maxHeight=Math.max(184,bounds.bottom-stage.getBoundingClientRect().top-feedbackHeight-20);
  }
  fitOrbitTextAnswers(root);
  const rects=[...answers,token].map(el=>el.getBoundingClientRect()),field=stage.getBoundingClientRect();
  const overlap=(a,b)=>a.left<b.right+10&&a.right+10>b.left&&a.top<b.bottom+10&&a.bottom+10>b.top;
  const unsafe=rects.some((r,i)=>r.left<field.left||r.right>field.right||r.top<field.top||r.bottom>field.bottom||rects.slice(i+1).some(q=>overlap(r,q)));
  if(!unsafe&&field.height<=maxHeight)return;
  const layout=orbitSafeLayout(stage.clientWidth,stage.clientHeight,rects.slice(0,-1),rects.at(-1),14,maxHeight);
  stage.style.setProperty('min-height',layout.height+'px','important');
  stage.style.setProperty('height',layout.height+'px','important');
  [...answers,token].forEach((el,i)=>{
    const r=i<answers.length?layout.answers[i]:layout.token;
    for(const [k,v] of Object.entries({left:r.x+'px',top:r.y+'px',right:'auto',bottom:'auto',width:r.width+'px',minWidth:'0',maxWidth:r.width+'px',height:r.height+'px',translate:'0 0',transform:'none',boxSizing:'border-box'}))
      el.style.setProperty(k.replace(/[A-Z]/g,x=>'-'+x.toLowerCase()),v,'important');
    // Drag transforms belong to the interaction, not the saved layout.
    el.style.removeProperty('transform');
    if(canvas)el.querySelectorAll('img').forEach(img=>{
      const inset=el.classList.contains('orbit-answer')?18:0;
      const maxWidth=Math.max(1,r.width-inset*2),maxHeight=Math.max(1,r.height-inset*2);
      if(el.classList.contains('orbit-answer')){
        el.style.setProperty('overflow','hidden','important');
        el.style.setProperty('display','grid','important');
        el.style.setProperty('place-items','center','important');
      }
      // Fit from the available box, never from a previously shrunk rendering.
      // Intrinsic image size and repeated ResizeObserver passes must not compound.
      img.style.setProperty('width',maxWidth+'px','important');
      img.style.setProperty('height',maxHeight+'px','important');
      img.style.setProperty('max-width','100%','important');
      img.style.setProperty('max-height','100%','important');
      img.style.setProperty('object-fit','contain','important');
      img.style.setProperty('object-position','center','important');
      img.style.setProperty('translate','0 0','important');
      img.style.setProperty('margin','auto','important');
    });
    if(canvas)el.querySelectorAll('.luni-companion,.luni-mascot,.luni-mascot svg').forEach(companion=>{
      for(const property of ['width','height','max-width','max-height'])companion.style.setProperty(property,'100%','important');
    });
  });
  root.dataset.geometryGuard='collision-free';
}

export function mountOrbitChoice(host,{prompt='',options=[],answer,draggable='nomi',stimulus='',companion=true,onPlay=null,onResult=()=>{},feedbackLabels=null}={}){
  if(!host||options.length<2)throw Error('Orbit choice needs options');
  host.replaceChildren();

  const root=document.createElement('div');
  root.className='orbit-choice';
  const q=document.createElement('div');
  q.className='orbit-choice-prompt';
  q.textContent=prompt;
  const stage=document.createElement('div');
  stage.className='orbit-choice-stage orbit-count-'+options.length;
  const feedback=document.createElement('p');
  feedback.className='demo-feedback';
  root.append(q,stage,feedback);
  const trace=()=>{};
  host.append(root);

  const buttons=options.map((o,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='orbit-answer orbit-pos-'+i+(o.kind==='image'?' orbit-image':'');
    if(o.kind==='image'&&/^(?:\.\/|blob:)/.test(o.text)){
      const img=document.createElement('img');
      img.src=o.text;
      img.alt=o.label||'';
      img.className='orbit-answer-image';
      b.append(img);
    }else b.textContent=o.text;
    b.dataset.value=o.value??o.text;
    stage.append(b);
    return b;
  });

  let comp=null,token;
  if(draggable==='nomi'){
    const slot=document.createElement('div');
    slot.className='orbit-token orbit-nomi';
    stage.append(slot);
    comp=mountLuniCompanion(slot,{state:'watching',size:'small',label:'נוֹמִי'});
    token=slot;
    if(onPlay){
      const replay=comp?.element||slot.querySelector('.luni-companion')||slot;
      replay.setAttribute('role','button');
      replay.setAttribute('tabindex','0');
      replay.setAttribute('aria-label','לִשְׁמֹעַ שׁוּב');
      replay.onclick=null;
      replay.onkeydown=e=>{
        if((e.key==='Enter'||e.key===' ')&&!active){
          e.preventDefault();
          e.stopPropagation();
          onPlay(e);
        }
      };
    }
  }else{
    token=document.createElement('button');
    token.type='button';
    token.className='orbit-token orbit-stimulus '+(draggable==='image'?'orbit-stimulus-image':'orbit-stimulus-word');
    if(draggable==='image'&&/^(?:\.\/|blob:)/.test(stimulus)){
      const img=document.createElement('img');
      img.src=stimulus;
      img.alt='';
      img.className='orbit-token-image';
      token.append(img);
    }else token.textContent=stimulus;
    stage.append(token);
    if(companion){
      const side=document.createElement('div');
      side.className='orbit-side-nomi';
      stage.append(side);
      comp=mountLuniCompanion(side,{state:'watching',size:'small',label:'נוֹמִי',roaming:true,strictAvoidance:true,calm:true,hardAvoidance:true});
    }
  }

  applyLearningBubbleContract(root);
  const geometry=()=>enforceOrbitGeometry(root);
  const resize=new globalThis.ResizeObserver(geometry);resize.observe(stage);buttons.forEach(b=>resize.observe(b));
  const canvas=root.closest('[data-mechanic-viewport]');if(canvas)resize.observe(canvas);
  globalThis.requestAnimationFrame(geometry);document.fonts?.ready.then(()=>{if(root.isConnected)geometry()});

  let locked=false;
  let active=false,start=null,contact=null,baseX=0,baseY=0;

  function choose(b){
    trace('CHOOSE',b);
    if(locked||!b||b.disabled){
      trace('CHOOSE-BLOCKED',b);
      return null;
    }
    const ok=b.dataset.value===answer;
    b.classList.add(ok?'is-correct':'is-wrong');
    if(draggable==='nomi')token.classList.remove('is-correct','is-wrong');
    else{token.classList.toggle('is-correct',ok);token.classList.toggle('is-wrong',!ok)}
    feedback.textContent=ok?'✓ '+(feedbackLabels?.correct||'מְצֻיָּן!'):(feedbackLabels?.wrong||'נְנַסֶּה שׁוּב');
    comp?.setState(ok?'cheering':'watching');
    trace(ok?'RESULT-OK':'RESULT-WRONG',b);
    onResult({correct:ok,value:b.dataset.value});

    if(ok){
      locked=true;
      return true;
    }

    active=false;
    token.classList.remove('dragging');
    const tr=token.getBoundingClientRect(),br=b.getBoundingClientRect(),sr=stage.getBoundingClientRect();
    const tc={x:tr.left+tr.width/2,y:tr.top+tr.height/2};
    const bc={x:br.left+br.width/2,y:br.top+br.height/2};
    const d=Math.hypot(tc.x-bc.x,tc.y-bc.y)||1;
    const force=64;
    const dx=(tc.x-bc.x)/d*force,dy=(tc.y-bc.y)/d*force;
    const current=token.style.transform||'translate(0px,0px)';
    const mx=Math.max(sr.left+tr.width/2,Math.min(tc.x+dx,sr.right-tr.width/2))-tc.x;
    const my=Math.max(sr.top+tr.height/2,Math.min(tc.y+dy,sr.bottom-tr.height/2))-tc.y;
    const bounced=`${current} translate(${mx}px,${my}px)`;
    const rebound=token.animate(
      [{transform:current,offset:0},{transform:`${bounced} scale(.98)`,offset:.48},{transform:'translate(0px,0px)',offset:1}],
      {duration:360,easing:'cubic-bezier(.18,.82,.24,1)'}
    );
    baseX=0;baseY=0;
    rebound.onfinish=()=>{if(!active)token.style.transform='translate(0px,0px)'};
    setTimeout(()=>{
      b.classList.remove('is-wrong');
      token.classList.remove('is-wrong');
    },420);
    return false;
  }

  buttons.forEach(b=>b.onclick=()=>choose(b));

  function touchingAnswer(){
    const tr=token.getBoundingClientRect();
    let best=null,area=0,ratio=0;
    for(const b of buttons){
      if(b.disabled)continue;
      const r=b.getBoundingClientRect();
      const w=Math.max(0,Math.min(tr.right,r.right)-Math.max(tr.left,r.left));
      const h=Math.max(0,Math.min(tr.bottom,r.bottom)-Math.max(tr.top,r.top));
      const a=w*h;
      const base=Math.max(1,Math.min(tr.width*tr.height,r.width*r.height));
      if(a>area){
        area=a;
        best=b;
        ratio=a/base;
      }
    }
    return {best,ratio};
  }

  function checkContact(){
    const {best,ratio}=touchingAnswer();
    const hit=best&&ratio>=CONTACT_RATIO?best:null;
    buttons.forEach(b=>b.classList.toggle('is-contact',b===hit));
    if(hit!==contact){
      contact=hit;
      trace(hit?'CONTACT':'MOVE',hit);
    }
  }

  function resetToken(){
    const current=token.style.transform||'translate(0px,0px)';
    token.animate(
      [{transform:current},{transform:'translate(0,0)'}],
      {duration:280,easing:'cubic-bezier(.2,.8,.2,1)'}
    );
    token.style.transform='';
    baseX=0;baseY=0;
  }

  function clearContact(){
    contact=null;
    buttons.forEach(b=>b.classList.remove('is-contact'));
  }

  token.onpointerdown=e=>{
    if(locked)return;
    trace('DOWN');
    active=true;
    contact=null;
    const grabRect=token.getBoundingClientRect();
    start={
      x:e.clientX,
      y:e.clientY,
      baseX,
      baseY,
      grabOffsetX:e.clientX-(grabRect.left+grabRect.width/2),
      grabOffsetY:e.clientY-(grabRect.top+grabRect.height/2),
      centerX:grabRect.left+grabRect.width/2,
      centerY:grabRect.top+grabRect.height/2
    };
    token.setPointerCapture?.(e.pointerId);
    token.classList.add('dragging');
  };

  token.onpointermove=e=>{
    if(!active)return;
    e.preventDefault();
    const desiredX=e.clientX-start.grabOffsetX,desiredY=e.clientY-start.grabOffsetY;
    token.style.transform='translate('+(start.baseX+desiredX-start.centerX)+'px,'+(start.baseY+desiredY-start.centerY)+'px) scale(1.04)';
    checkContact();
  };

  token.onpointerup=e=>{
    trace('UP');
    if(!active)return;
    const moved=start?Math.hypot((e?.clientX??start.x)-start.x,(e?.clientY??start.y)-start.y):0;
    const tap=!!onPlay&&moved<8;
    active=false;
    token.classList.remove('dragging');

    const release=touchingAnswer();
    clearContact();

    if(tap){
      onPlay(e);
      resetToken();
      return;
    }

    if(release.best&&release.ratio>=DROP_RATIO){
      const result=choose(release.best);
      if(result===false)return;
    }
    resetToken();
  };

  token.onpointercancel=()=>{
    if(!active)return;
    active=false;
    token.classList.remove('dragging');
    clearContact();
    resetToken();
  };

  return{choose,destroy(){resize.disconnect();comp?.destroy?.();token?.getAnimations?.({subtree:true}).forEach(a=>a.cancel());}};
}
