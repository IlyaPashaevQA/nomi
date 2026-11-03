import {mountLuniCompanion} from './luni-companion.mjs';
import {markLearningBubble} from './learning-bubble-contract.mjs';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function renderBubbleContent(button,value){
  if(value&&typeof value==='object'&&value.kind==='image'&&value.src){
    const img=document.createElement('img');
    img.className='bubble-match-image';img.src=value.src;img.alt='';img.draggable=false;
    button.replaceChildren(img);button.setAttribute('aria-label',value.label||'תמונה');
    return;
  }
  button.textContent=String(value??'');
  markLearningBubble(button);
}

// Bubble anchors are centres.
export function bubbleBounds(width,height,w,h,centered=true,padding=18){
  const axis=(size,item)=>{
    const offset=centered?item/2:0,min=offset+padding,max=size-item+offset-padding,middle=(size-item)/2+offset;
    return min<=max?[min,max]:[middle,middle];
  };
  const [minX,maxX]=axis(width,w),[minY,maxY]=axis(height,h);
  return {minX,maxX,minY,maxY};
}
export function boundBubblePoint(p,bounds){
  return{x:Math.max(bounds.minX,Math.min(bounds.maxX,p.x)),y:Math.max(bounds.minY,Math.min(bounds.maxY,p.y))};
}

// The original pair index is semantic identity; only its rendered row changes.
export function bubblePairOrder(count,seed){
  let h=2166136261;
  for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
  const random=()=>{h=(h+0x6D2B79F5)>>>0;let x=h;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296};
  const shuffle=()=>{const a=Array.from({length:count},(_,i)=>i);for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const visual=shuffle();let word=shuffle();
  if(count>=3){
    // Rejection sampling retains independent permutations, without correct-row cues.
    for(let tries=0;word.some((id,i)=>id===visual[i]);tries++){
      word=tries<100?shuffle():visual.map((_,i)=>visual[(i+1)%count]);
    }
  }
  return {visual,word};
}
export function mountBubbleMatch(host,{pairs,seed=globalThis.crypto?.randomUUID?.()||String(Math.random()),onComplete=()=>{},onMatch=()=>{}}={}){
  if(!host||!Array.isArray(pairs)||pairs.length<2)throw Error('Bubble match needs pairs');
  host._bubbleMatchCleanup?.();host.replaceChildren();
  const field=document.createElement('div');field.className='bubble-field';host.append(field);
  const bubbles=[],swims=new WeakMap(),motions=new WeakMap(),timers=new Set();
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let left=pairs.length,destroyed=false;

  const items=[];
  const order=bubblePairOrder(pairs.length,seed);
  for(let row=0;row<pairs.length;row++)for(const kind of ['visual','word']){const pi=order[kind][row];items.push({id:pi+'-'+kind,pair:pi,kind,label:pairs[pi][kind]})}
  const spots=positions(items.length);
  items.forEach((item,i)=>{
    const b=document.createElement('button');b.type='button';b.className='bubble bubble-'+item.kind;
    renderBubbleContent(b,item.label);b.dataset.id=item.id;b.dataset.pair=item.pair;b.dataset.swim=String(i);
    field.append(b);bubbles.push(b);
    place(b,{x:field.clientWidth*spots[i].x/100,y:field.clientHeight*spots[i].y/100});
    startSwim(b,i);bind(b);
  });

  // Bubble Match now uses the same full-field Nomi controller as the rest of
  // the Learning Engine. Bubbles remain independent moving obstacles.
  const nomiAnchor=document.createElement('div');nomiAnchor.className='bubble-nomi-anchor luni-companion-slot';
  field.append(nomiAnchor);
  const companion=mountLuniCompanion(nomiAnchor,{state:'watching',roaming:true,strictAvoidance:true,calm:true,label:'נוֹמִי'});

  function bounds(el){return bubbleBounds(field.clientWidth,field.clientHeight,el.offsetWidth,el.offsetHeight,true)}
  function position(el){const s=getComputedStyle(el);return{x:parseFloat(s.left)||0,y:parseFloat(s.top)||0}}
  function place(el,p){const next=boundBubblePoint(p,bounds(el));el.style.left=next.x+'px';el.style.top=next.y+'px';return next}
  function startSwim(el,i){
    const swim=el.animate([
      {transform:'translate(-7px,4px) rotate(-2deg)'},
      {transform:'translate(8px,-8px) rotate(2deg)'},
      {transform:'translate(3px,7px) rotate(-1deg)'}
    ],{duration:5200+(i%3)*350,iterations:Infinity,direction:'alternate',easing:'ease-in-out',delay:-(i%4)*700});
    if(reduced){swim.pause();swim.currentTime=0}swims.set(el,swim);
  }
  function resumeSwim(el){
    if(!reduced&&!destroyed&&!el.dataset.dragging&&!el.classList.contains('matched')&&!el.classList.contains('dragging')&&!motions.has(el))swims.get(el)?.play();
  }
  function center(el){const r=el.getBoundingClientRect(),f=field.getBoundingClientRect();return{x:r.left+r.width/2-f.left,y:r.top+r.height/2-f.top}}
  function mate(el){return bubbles.find(x=>x!==el&&x.dataset.pair===el.dataset.pair)}
  function nearest(el){
    const a=center(el);
    return bubbles.filter(x=>x!==el&&!x.dataset.dragging&&!x.classList.contains('matched')&&!x.classList.contains('bubble-wrong'))
      .map(x=>({el:x,d:dist(a,center(x))})).sort((x,y)=>x.d-y.d)[0];
  }
  function cancelMotion(el){
    const motion=motions.get(el);if(!motion)return;
    const current=position(el);motions.delete(el);place(el,current);motion.cancel();
  }
  function moveTo(el,target,{duration=280,resume=true}={}){
    cancelMotion(el);swims.get(el)?.pause();
    const from=position(el),to=boundBubblePoint(target,bounds(el));
    const animation=el.animate([{left:from.x+'px',top:from.y+'px'},{left:to.x+'px',top:to.y+'px'}],
      {duration:reduced?70:duration,easing:'cubic-bezier(.12,.65,.25,1)',fill:'forwards'});
    motions.set(el,animation);
    return animation.finished.then(()=>{
      if(destroyed||!field.isConnected||motions.get(el)!==animation)return false;
      place(el,to);motions.delete(el);animation.cancel();if(resume)resumeSwim(el);return true;
    }).catch(()=>false);
  }
  const clearMagnets=()=>bubbles.forEach(x=>x.classList.remove('magnet'));
  function bind(el){
    let pointer=null,start=null,origin=null;
    el.onpointerdown=e=>{
      if(pointer!==null||el.classList.contains('matched'))return;
      cancelMotion(el);el.classList.remove('bubble-wrong');swims.get(el)?.pause();
      pointer=e.pointerId;el.dataset.dragging='1';start={x:e.clientX,y:e.clientY};origin=position(el);
      el.setPointerCapture?.(e.pointerId);el.classList.add('dragging');
    };
    el.onpointermove=e=>{
      if(e.pointerId!==pointer)return;e.preventDefault();
      place(el,{x:origin.x+e.clientX-start.x,y:origin.y+e.clientY-start.y});
      const n=nearest(el);bubbles.forEach(x=>x.classList.toggle('magnet',!!(n&&x===n.el&&n.el===mate(el)&&n.d<105)));
    };
    el.onpointerup=e=>{
      if(e.pointerId!==pointer)return;pointer=null;delete el.dataset.dragging;el.classList.remove('dragging');clearMagnets();
      const n=nearest(el);if(n&&n.d<115&&n.el===mate(el))snap(el,n.el);else if(n&&n.d<115)rejectPair(el,n.el);else resumeSwim(el);
    };
    el.onpointercancel=el.onlostpointercapture=e=>{
      if(e.pointerId!==pointer)return;pointer=null;delete el.dataset.dragging;el.classList.remove('dragging');clearMagnets();resumeSwim(el);
    };
  }
  function rejectPair(a,b){
    cancelMotion(a);cancelMotion(b);swims.get(a)?.pause();swims.get(b)?.pause();
    const ca=center(a),cb=center(b),pa=position(a),pb=position(b),d=dist(ca,cb);
    const ra=Math.max(a.offsetWidth,a.offsetHeight)/2,rb=Math.max(b.offsetWidth,b.offsetHeight)/2;
    const travel=Math.min(82,Math.max(46,Math.max(0,ra+rb-d)/2+38));
    let ux=d>1?(ca.x-cb.x)/d:1,uy=d>1?(ca.y-cb.y)/d:0;
    const target=(el,p,x,y,amount)=>boundBubblePoint({x:p.x+x*amount,y:p.y+y*amount},bounds(el));
    if(d<=1){
      let best=-1;
      for(const [x,y] of [[1,0],[0,1],[-1,0],[0,-1]]){
        const score=dist(target(a,pa,x,y,travel),target(b,pb,-x,-y,travel));
        if(score>best){best=score;ux=x;uy=y}
      }
    }
    let ta=target(a,pa,ux,uy,travel),tb=target(b,pb,-ux,-uy,travel);
    for(let i=0;i<3;i++){const missing=ra+rb+14-dist(ta,tb);if(missing<=0)break;ta=target(a,ta,ux,uy,missing);tb=target(b,tb,-ux,-uy,missing)}
    a.classList.add('bubble-wrong');b.classList.add('bubble-wrong');
    companion.setState('oops');
    Promise.all([moveTo(a,ta,{resume:false}),moveTo(b,tb,{resume:false})]).then(done=>{
      for(const el of [a,b])if(!motions.has(el)){el.classList.remove('bubble-wrong');resumeSwim(el)}
      if(!destroyed&&done.every(Boolean)){pinballImpulse(a,ux,uy,24);pinballImpulse(b,-ux,-uy,24)}
    });
  }
  function pinballImpulse(source,ux,uy,force){
    const sc=center(source);
    for(const x of bubbles){
      if(x===source||x.dataset.dragging||motions.has(x)||x.classList.contains('matched'))continue;
      const xc=center(x),dx=xc.x-sc.x,dy=xc.y-sc.y,d=Math.hypot(dx,dy),min=(source.offsetWidth+x.offsetWidth)*.56;
      if(d<min){const p=position(x),k=(min-d)/min*force+12;moveTo(x,{x:p.x+(d?dx/d:ux)*k+ux*4,y:p.y+(d?dy/d:uy)*k+uy*4},{duration:200})}
    }
  }
  function later(callback,delay){const id=setTimeout(()=>{timers.delete(id);if(!destroyed&&field.isConnected)callback()},delay);timers.add(id)}
  function snap(a,b){
    cancelMotion(a);cancelMotion(b);swims.get(a)?.pause();swims.get(b)?.pause();
    const ca=center(a),cb=center(b),pa=position(a),pb=position(b),dx=cb.x-ca.x,dy=cb.y-ca.y;
    a.classList.add('matched');b.classList.add('matched');
    companion.setState('cheering');
    moveTo(a,{x:pa.x+dx*.45,y:pa.y+dy*.45},{duration:320,resume:false});
    moveTo(b,{x:pb.x-dx*.45,y:pb.y-dy*.45},{duration:320,resume:false});
    later(()=>{a.classList.add('vanish');b.classList.add('vanish');onMatch({pair:Number(a.dataset.pair)});left--;if(left===0)later(onComplete,260)},360);
  }

  // Anchor only after the actual field has layout metrics. Before Safari's
  // first painted frame, clientHeight may be 0, which previously clamped all
  // bubbles into invalid negative positions and clipped the bottom row.
  const usableSize=()=>{
   const width=field.clientWidth,height=field.clientHeight;
   if(width<48||height<48)return null;
   const rows=Math.ceil(bubbles.length/2);
   const byWidth=(width-48)/2.18,byHeight=(height-40)/(rows+.2);
   // Prefer legible large circles, but never position beyond the field.
   const bubbleSize=Math.max(40,Math.min(148,byWidth,byHeight));
   field.style.setProperty('--bubble-size',Math.round(bubbleSize)+'px','important');
   return {width,height};
  };
  let previous={width:field.clientWidth,height:field.clientHeight};
  let initialLayoutDone=false,initialLayoutFrames=0;
  const settleInitial=()=>{
   if(destroyed||!field.isConnected)return;
   const size=usableSize();
   if(!size){
    // A hidden parent QA tab can have zero size indefinitely. Stop spinning
    // after a brief paint window; ResizeObserver will initialize on reveal.
    field.dataset.bubbleGeometry='waiting-visible-size';
    if(initialLayoutFrames++<24)globalThis.requestAnimationFrame?.(settleInitial);
    return;
   }
   bubbles.forEach((el,i)=>place(el,{
    x:size.width*spots[i].x/100,y:size.height*spots[i].y/100,
   }));
   previous=size;initialLayoutDone=true;
   field.dataset.bubbleGeometry='bounded';
  };
  const resizeObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{
    if(destroyed)return;if(!field.isConnected){destroy();return}
    const size=usableSize();if(!size)return;
    if(!initialLayoutDone){settleInitial();return}
    if(size.width===previous.width&&size.height===previous.height)return;
    for(const el of bubbles){
      cancelMotion(el);const p=position(el);
      place(el,{x:p.x*size.width/(previous.width||size.width),
       y:p.y*size.height/(previous.height||size.height)});resumeSwim(el);
    }
    previous=size;
  });
  resizeObserver?.observe(field);
  globalThis.requestAnimationFrame?.(settleInitial);

  function destroy(){
    if(destroyed)return;destroyed=true;resizeObserver?.disconnect();companion.destroy?.();
    timers.forEach(clearTimeout);timers.clear();
    for(const el of bubbles){
      cancelMotion(el);swims.get(el)?.cancel();
      el.onpointerdown=el.onpointermove=el.onpointerup=el.onpointercancel=el.onlostpointercapture=null;
    }
    if(host._bubbleMatchCleanup===destroy)delete host._bubbleMatchCleanup;
  }
  host._bubbleMatchCleanup=destroy;return{remaining:()=>left,destroy};
}

function positions(n){
  const presets={4:[{x:20,y:28},{x:68,y:22},{x:28,y:68},{x:72,y:67}],
    6:[{x:16,y:22},{x:61,y:16},{x:28,y:47},{x:70,y:48},{x:16,y:75},{x:61,y:76}]};
  return presets[n]||Array.from({length:n},(_,i)=>({x:15+(i%2)*52,y:15+Math.floor(i/2)*28}));
}
