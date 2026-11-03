// One coordinate system for the full exercise card. No CSS travel animations.
const nomiRoamInstances = new Set();
const nomiRoamBySurface = new WeakMap();
const NOMI_BLOCKERS = 'button,input,select,textarea,canvas,[contenteditable="true"],.orbit-choice-prompt,.orbit-stimulus,.orbit-stimulus-word,.luni-prompt,.focus-stimulus,.focus-question-stimulus,.handwriting-cue,.letter-reference-card';
const nomiClamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

export function disposeNomiRoaming(root) {
  for (const instance of [...nomiRoamInstances]) {
    if (!root || root.contains(instance.anchor) || root.contains(instance.surface)) instance.destroy();
  }
}

export function attachNomiRoaming(anchor, wrap, options={}) {
  let pending = 0, controller = null, destroyed = false;
  const init = () => {
    pending = 0;
    if (destroyed || !anchor.isConnected) return;
    // Resolve AFTER mounting. Prefer the mechanic's own interactive field when
    // it has one; fall back to the full stage card for Orbit-style mechanics.
    // This keeps Bubble Match/Constructor roaming inside their real field
    // instead of treating the surrounding QA/app shell as flyable space.
    const surface = anchor.closest('.orbit-choice-stage,.bubble-field,.bubble-constructor,.luni-exercise,.focus-choice,.bubble-build,.handwriting-exercise,.v2-preview,.luni-word-build') ||
      anchor.closest('.mechanic-stage-card') || anchor.parentElement;
    if (!surface) return;
    const existing = nomiRoamBySurface.get(surface);
    if (existing) { wrap.remove(); return; }
    controller = createNomiRoamingController(anchor,wrap,surface,options);
  };
  pending = requestAnimationFrame(init);
  return { destroy() { destroyed=true; cancelAnimationFrame(pending); controller?.destroy(); } };
}

function createNomiRoamingController(anchor,wrap,surface,{calm=false,strictAvoidance=false,hardAvoidance=false,label=null}={}) {
  if (getComputedStyle(surface).position==='static') surface.style.position='relative';
  const layer=document.createElement('div');
  layer.className='nomi-roam-layer';
  layer.dataset.nomiLayer='full-field-v2';
  wrap.classList.add('luni-roaming-companion','nomi-free-flight');
  wrap.dataset.nomiRole='companion';
  const mascot=wrap.querySelector('.luni-mascot');
  mascot.disabled=false;
  mascot.tabIndex=0;
  mascot.setAttribute('aria-label',label||'Номи — можно перетащить');
  // The old .orbit-side-nomi remains only a lifecycle anchor, never an offset parent.
  layer.append(wrap);surface.append(layer);
  let alive=true,raf=0,last=0,lastMeasure=0,obstacles=[],inkObstacles=[],signature='',path=[],routeCount=0;
  let width=0,height=0,size=82,boxW=82,boxH=82,radius=68,x=0,y=0,angle=0,speed=0,targetSpeed=100;
  let initialized=false,held=null,pauseUntil=0,spin=0,spinUntil=0;
  const bounds=()=>({
    left:Math.max(radius,boxW/2),top:Math.max(radius,boxH/2),
    right:Math.max(Math.max(radius,boxW/2),width-Math.max(radius,boxW/2)),
    bottom:Math.max(Math.max(radius,boxH/2),height-Math.max(radius,boxH/2))
  });
  const inBounds=p=>{const b=bounds();return p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;};
  const free=p=>inBounds(p)&&!obstacles.some(r=>p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom);
  const segmentClear=(a,b)=>{
    if(!free(a)||!free(b))return false;
    const distance=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(distance/12));
    for(let i=1;i<n;i++)if(!free({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;
    return true;
  };
  const clampPosition=()=>{const b=bounds();x=nomiClamp(x,b.left,b.right);y=nomiClamp(y,b.top,b.bottom);};
  function measure() {
    const rect=layer.getBoundingClientRect();width=layer.clientWidth;height=layer.clientHeight;
    const fallback=Math.min(innerWidth<500?(strictAvoidance?60:70):82,Math.max(24,width-24),Math.max(24,height-24));
    // Mechanics Studio may publish a non-square Nomi box. Inline !important
    // geometry is the promoted presentation contract and must outrank the
    // roaming controller's default size.
    const explicitW=wrap.style.getPropertyPriority('width')==='important';
    const explicitH=wrap.style.getPropertyPriority('height')==='important';
    if(!explicitW)wrap.style.width=fallback+'px';
    if(!explicitH)wrap.style.height=fallback+'px';
    if(hardAvoidance)wrap.style.setProperty('translate','0 0','important');
    const wr=wrap.getBoundingClientRect();
    boxW=Math.max(24,wr.width||fallback);boxH=Math.max(24,wr.height||fallback);
    size=Math.max(boxW,boxH);
    // Strict routing uses a small semantic core; decorative ears/padding may
    // pass behind controls, but meaningful content remains protected.
    radius=strictAvoidance?Math.max(16,Math.min(boxW,boxH)*.34):Math.hypot(boxW,boxH)/2+10;
    const sx=width/(rect.width||width||1),sy=height/(rect.height||height||1);inkObstacles=[];
    // In strict lesson routing, decorative answer/question shells are soft geometry:
    // Nomi may let ears/outer artwork brush a circle border, but the meaningful
    // picture or word remains a hard obstacle. This keeps narrow phone corridors usable.
    const semanticRect=el=>{
      let r=el.getBoundingClientRect();
      const semanticShell=strictAvoidance&&!hardAvoidance&&el.matches('.orbit-answer,.orbit-stimulus,.orbit-stimulus-word,.bubble,.focus-option,.luni-option,.learning-bubble-atom,.learning-bubble-phrase,.learning-token-bubble,.learning-answer-bubble,.constructor-answer-zone');
      if(semanticShell){
        const content=el.querySelector('img,.orbit-answer-image,.orbit-token-image,[data-mechanic-layout-text]');
        if(content){const cr=content.getBoundingClientRect();if(cr.width&&cr.height)return cr;}
        const range=document.createRange();range.selectNodeContents(el);const ink=range.getBoundingClientRect();
        if(ink.width&&ink.height)return ink;
      }else if(!el.matches('button,input,select,textarea,canvas,[contenteditable]')){
        const range=document.createRange();range.selectNodeContents(el);const ink=range.getBoundingClientRect();
        if(ink.width&&ink.height)r=ink;
      }
      return r;
    };
    const clearance=hardAvoidance?Math.hypot(boxW,boxH)/2+8:strictAvoidance?Math.max(5,size*.10):radius+4;
    wrap.dataset.nomiClearance=clearance.toFixed(1);
    wrap.dataset.nomiAvoidance=strictAvoidance?'semantic-core-v2':'control-bounds-v1';
    obstacles=[...surface.querySelectorAll(NOMI_BLOCKERS)].filter(el=>!layer.contains(el)).flatMap(el=>{
      const r=semanticRect(el),c=getComputedStyle(el);
      if(!r.width||!r.height||c.visibility==='hidden'||c.display==='none')return [];
      inkObstacles.push({left:(r.left-rect.left)*sx,right:(r.right-rect.left)*sx,top:(r.top-rect.top)*sy,bottom:(r.bottom-rect.top)*sy});
      return [{left:(r.left-rect.left)*sx-clearance,right:(r.right-rect.left)*sx+clearance,top:(r.top-rect.top)*sy-clearance,bottom:(r.bottom-rect.top)*sy+clearance}];
    });
    const next=[width,height,...obstacles.flatMap(r=>[r.left,r.top,r.right,r.bottom].map(Math.round))].join(',');
    if(signature!==next){signature=next;path=[];}
    if(initialized)clampPosition();
  }
  function route() {
    const b=bounds(),gridStep=strictAvoidance?14:30,cols=Math.max(2,Math.ceil((b.right-b.left)/gridStep)+1),rows=Math.max(2,Math.ceil((b.bottom-b.top)/gridStep)+1);
    const nodes=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const p={x:b.left+(b.right-b.left)*i/(cols-1),y:b.top+(b.bottom-b.top)*j/(rows-1)};
      nodes.push(free(p)?p:null);
    }
    let available=nodes.map((p,i)=>p?i:-1).filter(i=>i>=0);
    const span=axis=>available.length?Math.max(...available.map(i=>nodes[i][axis]))-Math.min(...available.map(i=>nodes[i][axis])):0;
    // Dense phone letter banks can leave only a thin free strip. Allow travel between
    // actual controls, yielding input priority wherever the full sprite overlaps one.
    if(!strictAvoidance&&(span('x')<width*.3||span('y')<height*.3)){
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const p={x:b.left+(b.right-b.left)*i/(cols-1),y:b.top+(b.bottom-b.top)*j/(rows-1)};
        if(!inkObstacles.some(r=>p.x>r.left-3&&p.x<r.right+3&&p.y>r.top-3&&p.y<r.bottom+3))nodes[j*cols+i]=p;
      }
      available=nodes.map((p,i)=>p?i:-1).filter(i=>i>=0);
    }
    if(strictAvoidance)wrap.dataset.nomiSafeCells=String(available.length);
    if(!available.length){path=[];return;}
    if(!initialized){
      const safeStart=available.filter(i=>free(nodes[i]));
      const starts=safeStart.length?safeStart:available;
      const initial=starts.reduce((a,i)=>Math.hypot(nodes[i].x-width*.2,nodes[i].y-height*.48)<Math.hypot(nodes[a].x-width*.2,nodes[a].y-height*.48)?i:a,starts[0]);
      x=nodes[initial].x;y=nodes[initial].y;initialized=true;pauseUntil=performance.now()+800;
    }
    const startPoint={x,y};
    const nearest=available.slice().sort((a,b)=>Math.hypot(nodes[a].x-x,nodes[a].y-y)-Math.hypot(nodes[b].x-x,nodes[b].y-y));
    let start=nearest.find(i=>segmentClear(startPoint,nodes[i]));
    // After the child drops Nomi on a control, walk out from that position, never teleport.
    if(start===undefined)start=nearest[0];
    const parents=new Int32Array(nodes.length).fill(-2),queue=[start];parents[start]=-1;
    for(let head=0;head<queue.length;head++){
      const k=queue[head],ci=k%cols,cj=Math.floor(k/cols);
      for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const i=ci+di,j=cj+dj;if(i<0||j<0||i>=cols||j>=rows)continue;
        const n=j*cols+i;if(parents[n]!==-2||!nodes[n]||!segmentClear(nodes[k],nodes[n]))continue;
        parents[n]=k;queue.push(n);
      }
    }
    // Prefer destinations across the entire card. When large answers split free space,
    // cross the separating area without intercepting answer controls.
    const safeGoals=available.filter(i=>free(nodes[i]));
    const destinations=strictAvoidance?queue.filter(i=>free(nodes[i])):(routeCount%2===1&&safeGoals.length?safeGoals:available);
    if(!destinations.length){path=[];pauseUntil=performance.now()+2000;return;}
    const ranked=destinations.map(i=>({i,score:Math.hypot((nodes[i].x-x)/(width||1),(nodes[i].y-y)/(height||1))})).sort((a,b)=>b.score-a.score);
    const longFlight=!calm||routeCount%5===4;
    const local=ranked.filter(r=>{const d=Math.hypot(nodes[r.i].x-x,nodes[r.i].y-y);return d>=45&&d<=150;});
    const candidates=longFlight?ranked:local.length?local:ranked.slice(-Math.min(10,ranked.length));
    const pool=candidates.slice(0,Math.max(1,Math.min(10,Math.ceil(candidates.length*.25))));
    const goal=pool[Math.floor(Math.random()*pool.length)].i;
    const raw=[];
    if(parents[goal]===-2)raw.push(nodes[goal]);
    else {for(let k=goal;k>=0;k=parents[k])raw.push(nodes[k]);raw.reverse();}
    const reduced=[];let cursor={x,y},at=0;
    while(at<raw.length){let end=at;for(let j=at+1;j<raw.length&&segmentClear(cursor,raw[j]);j++)end=j;reduced.push(raw[end]);cursor=raw[end];at=end+1;}
    path=reduced;routeCount++;
    targetSpeed=(calm?(longFlight?64:32+Math.random()*14):[72,135,96,160][routeCount%4]*(.9+Math.random()*.2));
    wrap.dataset.nomiRoute=String(routeCount);
  }
  function paint() {
    wrap.style.transform=`translate3d(${(x-boxW/2).toFixed(2)}px,${(y-boxH/2).toFixed(2)}px,0) rotate(${angle.toFixed(2)}deg)`;
    wrap.dataset.nomiX=x.toFixed(2);wrap.dataset.nomiY=y.toFixed(2);
    const yielding=!held&&inkObstacles.some(r=>x+boxW*.48>r.left&&x-boxW*.48<r.right&&y+boxH*.48>r.top&&y-boxH*.48<r.bottom);
    wrap.classList.toggle('nomi-yielding',yielding);
    wrap.dataset.nomiMode=held?'held':performance.now()<pauseUntil?'rest':'flying';
  }
  function tick(now) {
    raf=0;if(!alive)return;
    if(!anchor.isConnected||!surface.isConnected||!layer.isConnected){destroy();return;}
    const dt=last?Math.min(.04,(now-last)/1000):0;last=now;
    if(now-lastMeasure>300||!initialized){measure();lastMeasure=now;}
    if(!initialized){route();if(!initialized){x=width/2;y=height/2;clampPosition();initialized=true;}}
    if(!held&&now>=pauseUntil){
      if(!path.length)route();
      let goal=path[0];
      if(goal){
        const dx=goal.x-x,dy=goal.y-y,d=Math.hypot(dx,dy);
        speed+=(targetSpeed-speed)*Math.min(1,dt*3.5);
        const step=Math.min(d,speed*dt);
        if(d>0){x+=dx/d*step;y+=dy/d*step;}
        const lean=nomiClamp(dx/(d||1)*12,-12,12);
        angle+=(lean-angle)*Math.min(1,dt*4);
        if(d<Math.max(2,step+.1)){path.shift();if(!path.length&&free({x,y})){pauseUntil=now+(strictAvoidance?(700+Math.random()*800):(calm?3500+Math.random()*3500:700));speed=0;}}
        if(routeCount%5===0&&d>170&&now>spinUntil+9000){spin=now;spinUntil=now+1200;}
        if(now<spinUntil){const t=(now-spin)/1200;angle=360*(t*t*(3-2*t));}
      }
    }
    clampPosition();paint();
    if(!document.hidden)raf=requestAnimationFrame(tick);
  }
  function point(e){const r=layer.getBoundingClientRect();return{x:(e.clientX-r.left)*width/(r.width||1),y:(e.clientY-r.top)*height/(r.height||1)};}
  const down=e=>{
    if(held||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();e.stopPropagation();measure();
    const p=point(e);held={id:e.pointerId,dx:p.x-x,dy:p.y-y};
    wrap.setPointerCapture(e.pointerId);wrap.classList.add('dragging');speed=0;if(!calm)angle=0;paint();
  };
  const move=e=>{
    if(!held||held.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
    const p=point(e);x=p.x-held.dx;y=p.y-held.dy;clampPosition();paint();
  };
  const up=e=>{
    if(!held||held.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();
    const id=held.id;held=null;wrap.classList.remove('dragging');
    if(wrap.hasPointerCapture(id))wrap.releasePointerCapture(id);
    path=[];speed=0;pauseUntil=performance.now()+(calm?1800:650);paint();
  };
  const click=e=>{e.preventDefault();e.stopPropagation();};
  const keyboard=e=>{
    const directions={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};
    if(!directions[e.key])return;e.preventDefault();
    x+=directions[e.key][0];y+=directions[e.key][1];clampPosition();path=[];pauseUntil=performance.now()+(calm?1800:650);paint();
  };
  for(const [event,handler] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['click',click],['keydown',keyboard]])wrap.addEventListener(event,handler);
  const visibility=()=>{cancelAnimationFrame(raf);raf=0;last=0;if(!document.hidden&&alive)raf=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',visibility);
  const resize=new ResizeObserver(()=>{lastMeasure=0;path=[];});resize.observe(surface);
  const instance={anchor,surface,destroy};
  function destroy(){
    if(!alive)return;alive=false;cancelAnimationFrame(raf);resize.disconnect();
    document.removeEventListener('visibilitychange',visibility);
    wrap.getAnimations({subtree:true}).forEach(a=>a.cancel());layer.remove();
    nomiRoamInstances.delete(instance);if(nomiRoamBySurface.get(surface)===instance)nomiRoamBySurface.delete(surface);
  }
  nomiRoamInstances.add(instance);nomiRoamBySurface.set(surface,instance);
  measure();route();paint();raf=requestAnimationFrame(tick);return instance;
}
