import {luni} from './luni-art.mjs';
import {attachNomiRoaming} from './nomi-roaming.mjs';
import {speakInstruction} from './instruction-audio.mjs';
import {isLearnerAudioActive} from './learner-audio.mjs';

export const HEBREW_PRAISES=Object.freeze([
  'מְצֻיָּן!',
  'כָּל הַכָּבוֹד!',
  'יוֹפִי!',
  'מְעוּלֶה!',
  'מַמָּשׁ טוֹב!'
]);
export function nextHebrewPraise(previous='',random=Math.random){
  const pool=HEBREW_PRAISES.filter(x=>x!==previous);
  return pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(.999999,random()))*pool.length))]||HEBREW_PRAISES[0];
}

// Routine replies stay with the shared character and never replace the task.
export function showLuniReply(host,text){
  let anchor=host.querySelector('.luni-companion');
  if(!anchor){const slot=document.createElement('div');slot.className='luni-reply-companion';host.append(slot);anchor=mountLuniCompanion(slot,{state:'cheering'}).element}
  anchor.querySelector('.luni-mascot')?.setAttribute('data-state','cheering');
  host.querySelectorAll('.luni-reply').forEach(x=>x.remove());
  const reply=document.createElement('span');reply.className='luni-reply';reply.setAttribute('role','status');reply.textContent=text;
  host.classList.add('luni-reply-host');host.append(reply);
  const bounds=host.getBoundingClientRect(),nomi=anchor.getBoundingClientRect(),bubble=reply.getBoundingClientRect();
  reply.style.left=Math.max(0,Math.min(bounds.width-bubble.width,nomi.left-bounds.left+(nomi.width-bubble.width)/2))+'px';
  reply.style.top=Math.max(0,nomi.top-bounds.top-bubble.height-6)+'px';
  return reply;
}
export function showLuniPraise(host,{previous='',random=Math.random,win=globalThis.window}={}){
  const phrase=nextHebrewPraise(previous,random),reply=showLuniReply(host,phrase);
  // Praise is lower priority than the target stimulus. Device TTS is only a
  // degraded fallback when WebKit exposes an actual Hebrew voice; otherwise
  // the compact visual acknowledgment remains intentionally silent.
  const speech=win&&!isLearnerAudioActive()?speakInstruction(phrase,{language:'he',win,requireVoice:true,isActive:()=>reply.isConnected}):null;
  return {phrase,reply,speech,destroy(){speech?.stop?.();reply.remove();host.querySelector('.luni-reply-companion')?.remove();host.classList.remove('luni-reply-host')}};
}
export function showLuniAcknowledgment(host,text='מַמְשִׁיכִים ✦'){
  const reply=showLuniReply(host,text);
  return {phrase:text,reply,speech:null,destroy(){reply.remove();host.querySelector('.luni-reply-companion')?.remove();host.classList.remove('luni-reply-host')}};
}

export const LUNI_HOME_MOTIONS=Object.freeze(['wave','hop','nod','wiggle','glow']);
export function createLuniMotionCycle(random=Math.random){
  let bag=[],last='';
  return()=>{
    if(!bag.length){
      bag=[...LUNI_HOME_MOTIONS];
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,random()))*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
      if(bag[0]===last)[bag[0],bag[1]]=[bag[1],bag[0]];
    }
    last=bag.shift();return last;
  };
}
export function bindLuniPlayfulness(root,{auto=false,random=Math.random}={}){
  const timers=new Set(),doc=root?.ownerDocument||globalThis.document,view=doc?.defaultView||globalThis.window;
  let disposed=false;
  const reduced=()=>view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  const allowed=mascot=>!disposed&&mascot.isConnected&&doc?.visibilityState!=='hidden'&&!reduced();
  const later=(fn,ms)=>{const id=globalThis.setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
  const clear=()=>{for(const timer of timers)globalThis.clearTimeout(timer);timers.clear()};
  const mascots=[...(root?.querySelectorAll?.('.luni-mascot')||[])];
  const listeners=[],autoLoops=[];
  for(const mascot of mascots){
    const nextMotion=createLuniMotionCycle(random);
    const play=()=>{
      if(!allowed(mascot)){mascot.dataset.motionAcknowledged='true';return false}
      const motion=nextMotion();mascot.dataset.motion=motion;
      later(()=>{if(mascot.isConnected&&mascot.dataset.motion===motion)delete mascot.dataset.motion},950);return true;
    };
    const click=e=>{e?.preventDefault?.();play()};mascot.addEventListener?.('click',click);listeners.push([mascot,click]);
    if(auto){
      const loop=()=>{if(disposed||!mascot.isConnected)return;if(play())later(loop,4200+Math.floor(random()*3200))};
      autoLoops.push([mascot,loop]);
      if(allowed(mascot))later(loop,2600+Math.floor(random()*2200));
    }
  }
  const visibility=()=>{clear();if(auto&&doc?.visibilityState!=='hidden'&&!reduced())for(const [mascot,loop] of autoLoops)if(mascot.isConnected)later(loop,2600+Math.floor(random()*2200))};
  doc?.addEventListener?.('visibilitychange',visibility);
  let observer=null;
  const handle={destroy(){if(disposed)return;disposed=true;clear();observer?.disconnect();doc?.removeEventListener?.('visibilitychange',visibility);for(const [mascot,click] of listeners){mascot.removeEventListener?.('click',click);delete mascot.dataset.motion}}};
  if(globalThis.MutationObserver&&root){observer=new globalThis.MutationObserver(()=>{if(mascots.every(mascot=>!mascot.isConnected))handle.destroy()});observer.observe(root,{childList:true,subtree:true})}
  return handle;
}

export function mountLuniCompanion(host,{state='watching',size='small',label='Луни рядом',roaming=false,strictAvoidance=true,calm=true,hardAvoidance=false}={}){
  const wrap=document.createElement('div');
  wrap.className='luni-companion luni-companion-'+size;
  wrap.innerHTML=luni(state);
  const m=wrap.querySelector('.luni-mascot');
  m.setAttribute('aria-label',label);m.tabIndex=-1;m.disabled=true;
  host.append(wrap);
  const roam=roaming?attachNomiRoaming(host,wrap,{strictAvoidance,calm,hardAvoidance,label}):null;
  return{
    element:wrap,mascot:m,
    setState(next){m.dataset.state=next},
    getState(){return m.dataset.state},
    destroy(){roam?.destroy?.();wrap.getAnimations?.({subtree:true}).forEach(a=>a.cancel());wrap.remove()}
  };
}
export function companionStateForMechanic(kind){
  if(kind?.startsWith('audio'))return 'listening';
  if(kind?.includes('build')||kind==='order'||kind==='constructor')return 'building';
  if(kind==='free'||kind==='handwriting')return 'thinking';
  if(kind==='memory'||kind==='bubble-match')return 'watching';
  return 'watching';
}
