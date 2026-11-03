import {enforceOrbitGeometry,resetOrbitGeometry} from './orbit-choice-ui.mjs';
import {bucketFor,FONT_CSS,validateDraft} from './studio-model.mjs';

const PROFILE_VERSION=1;
let cached=null,pending=null;
const applications=new WeakMap();
export const mechanicLayoutKey=(mechanic,bucket,theme)=>[mechanic,bucket,theme].join('|');
const apiUrl=suffix=>{
  try{return location.pathname.includes('/mechanics-studio/')?'../languages-v05/api/'+suffix:'./api/'+suffix}catch{return './api/'+suffix}
};

export async function fetchProductionMechanicLayouts(fetcher=globalThis.fetch,{fresh=false}={}){
  if(!fresh&&cached)return cached;
  if(pending)return pending;
  pending=(async()=>{try{
    const r=await fetcher(apiUrl('mechanic-layout-profile'),{cache:'no-store'});
    if(!r.ok)return{state:'unavailable',status:r.status};
    const x=await r.json();
    if(x.state==='valid'&&x.profile?.version===PROFILE_VERSION){cached=x;return x}
    if(x.state==='empty'){cached=x;return x}
    return{state:'corrupt'};
  }catch(error){return{state:'unavailable',error:String(error)}}})();
  try{return await pending}finally{pending=null}
}
export async function promoteMechanicLayout(draft,fetcher=globalThis.fetch,{approved=false}={}){
  validateDraft(draft);
  // Explicit owner Studio confirmation: never publish a museum/QA example.
  if(!approved||draft.source!=='lesson')
    throw Error('Publication requires an approved real lesson in the current Studio');
  const r=await fetcher(apiUrl('mechanic-layout-profile/promote'),{
    method:'POST',headers:{'Content-Type':'application/json',
      'X-Nomi-Studio-Approval':'reviewed-v1'},body:JSON.stringify({draft})
  });
  const x=await r.json().catch(()=>({error:'Invalid server response'}));
  if(!r.ok)throw Error(x.error||('HTTP '+r.status));
  cached={state:'valid',profile:x.profile};
  return x;
}
function dom(sel,host){return[...host.querySelectorAll(sel)]}
export function mechanicSemanticContentId(el,index=0){
  const owner=el?.closest?.('.orbit-answer[data-value],.bubble[data-id],.constructor-token[data-token-id],.constructor-answer-bubble[data-token-id]');
  const value=owner?.dataset?.value||owner?.dataset?.id||owner?.dataset?.tokenId;
  if(!value)return 'content-'+index;
  let h=2166136261;
  for(const ch of String(value))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
  return 'content-v-'+h.toString(36);
}
function add(map,id,els,{text=false,group=false,legacyId=null}={}){
  if(!Array.isArray(els))els=els?[els]:[];
  if(els.length)map.push({id,els,text,group,legacyId});
}
export function mechanicLayoutElements(host){
  const map=[];
  add(map,'prompt',host.querySelector('.orbit-choice-prompt,.luni-prompt,.focus-stimulus,.bubble-demo-head strong,.v2-preview h1,.handwriting-prompt'),{text:true});
  add(map,'instruction',host.querySelector('.bubble-demo-head small,.v2-preview .muted'),{text:true});
  add(map,'field',host.querySelector('.orbit-choice-stage,.bubble-field,.bubble-match-stage,.bubble-match,.bubble-build,.bubble-constructor,.luni-word-build,#v2-work,.handwriting-paper,.luni-stage'));
  add(map,'answer-zone',host.querySelector('.constructor-answer-zone'));
  add(map,'bank-top',host.querySelector('.constructor-bank-top'));
  add(map,'bank-bottom',host.querySelector('.constructor-bank-bottom'));
  const answers=dom('.orbit-answer,.focus-option,.luni-option,.bubble,.build-bubble,.answer-bubble,.constructor-token,.constructor-answer-bubble',host);
  add(map,'answers',answers,{group:true});
  const contents=[];
  answers.forEach((el,i)=>{
    add(map,'answer-'+i,el);
    let content=el.querySelector('img,[data-mechanic-layout-text]');
    if(!content&&!el.querySelector('svg')){
      content=document.createElement('span');content.dataset.mechanicLayoutText='1';
      while(el.firstChild)content.append(el.firstChild);el.append(content);
    }
    if(content)contents.push(content);
  });
  add(map,'answer-contents',contents,{group:true});
  contents.forEach((el,i)=>add(map,mechanicSemanticContentId(el,i),el,{legacyId:'content-'+i}));
  const center=host.querySelector('.nomi-free-flight,.orbit-token,.bubble-nomi,.luni-companion-slot,.luni-companion');
  add(map,'nomi',center);add(map,'center-content',center?.querySelector?.('img,span'));
  add(map,'picture',host.querySelector('.word-loop-recall-cue,.luni-intro-visual'));
  add(map,'meaning',host.querySelector('.luni-intro-meaning'),{text:true});
  add(map,'transcription',host.querySelector('.luni-intro-transcription'),{text:true});
  add(map,'input',host.querySelector('.luni-input'));
  const tokens=dom('.word-build-letter,.word-build-slot,.luni-token',host);
  add(map,'letters',tokens,{group:true});tokens.forEach((el,i)=>add(map,'letter-'+i,el));
  add(map,'handwriting-cue',host.querySelector('.handwriting-cue'));
  add(map,'handwriting-reference',host.querySelector('.handwriting-script-reference'),{text:true});
  add(map,'handwriting-paper',host.querySelector('.handwriting-paper'));
  add(map,'next',host.querySelector('.luni-next,.handwriting-actions [data-act="done"]'),{text:true});
  add(map,'feedback',host.querySelector('.demo-feedback,.focus-feedback,.luni-feedback,#v2-status,.word-build>.muted'),{text:true});
  return map;
}
const css={fontSize:'font-size',lineHeight:'line-height',width:'width',height:'height',radius:'border-radius',weight:'font-weight',align:'text-align'};
export function applyMechanicLayout(host,draft){
  validateDraft(draft);
  host.querySelectorAll('.orbit-choice').forEach(resetOrbitGeometry);
  const map=mechanicLayoutElements(host);
  for(const descriptor of map){
    const row={...(descriptor.legacyId?draft.styles[descriptor.legacyId]||{}:{}),...(draft.styles[descriptor.id]||{})};
    for(const el of descriptor.els){
      for(const [k,v] of Object.entries(row)){
        if(k in css){
          const unit=['fontSize','width','height','radius'].includes(k)?'px':'';
          const atomicText=el.matches?.('.learning-bubble-atom,.orbit-stimulus-word');
          if(atomicText&&k==='width'){
            el.style.setProperty('--learning-bubble-min-width',v+'px');
            el.style.setProperty('width','max-content','important');
            el.style.setProperty('min-width','var(--learning-bubble-min-width)','important');
            el.style.setProperty('max-width','calc(100% - 20px)','important');
            el.style.setProperty('white-space','nowrap','important');
            el.style.setProperty('overflow-wrap','normal','important');
            el.style.setProperty('word-break','keep-all','important');
          }else{
            el.style.setProperty(css[k],v+unit,'important');
            if(k==='width'){el.style.setProperty('min-width','0','important');el.style.setProperty('max-width','none','important')}
            if(k==='height'){el.style.setProperty('min-height','0','important');el.style.setProperty('max-height','none','important')}
          }
        }else if(k==='font'&&FONT_CSS[v]&&!el.matches('.handwriting-script-reference,.handwriting-script-guide'))el.style.setProperty('font-family',FONT_CSS[v],'important');
      }
      if('x'in row||'y'in row){
        if(!el.dataset.mechanicLayoutBaseTranslate){
          const t=getComputedStyle(el).translate;el.dataset.mechanicLayoutBaseTranslate=t&&t!=='none'?t:'0px 0px';
        }
        const parts=el.dataset.mechanicLayoutBaseTranslate.split(' ');
        el.style.setProperty('translate',`calc(${parts[0]||'0px'} + ${row.x||0}px) calc(${parts[1]||'0px'} + ${row.y||0}px)`,'important');
      }
      if(descriptor.id==='prompt'){
        el.style.setProperty('justify-self','center','important');
        el.style.setProperty('margin-inline','auto','important');
        el.style.setProperty('text-align','center','important');
        el.style.setProperty('max-width','100%','important');
        el.style.setProperty('box-sizing','border-box','important');
      }
      if(descriptor.id==='nomi'&&('width'in row||'height'in row))el.querySelectorAll('.luni-companion,.luni-mascot').forEach(c=>{
        c.style.setProperty('width','100%','important');c.style.setProperty('max-width','100%','important');c.style.setProperty('height','auto','important');
      });
      if(descriptor.text&&Object.hasOwn(draft.copy,descriptor.id)){el.textContent=draft.copy[descriptor.id];el.style.whiteSpace='pre-wrap'}
    }
  }
  for(const k of ['prompt','answer','center'])host.style.setProperty('--mechanic-'+k+'-scale',draft.knobs[k]/100);
  host.style.setProperty('--bubble-size',118*draft.knobs.bubble/100+'px');
  host.querySelectorAll('.orbit-choice').forEach(enforceOrbitGeometry);
  return map;
}
export function applyProductionMechanicLayout(host,{mechanic,source='lesson',theme=document.documentElement.dataset.theme||'midnight',fetcher=globalThis.fetch}={}){
  if(host.dataset.layoutPolicy==='responsive')return Promise.resolve({state:'responsive'});
  const root=host.firstElementChild,prior=applications.get(host);
  if(prior?.root===root&&prior.mechanic===mechanic)return prior.promise;
  // Hide synchronously, before the browser can paint default geometry. The host
  // still participates in layout, so Studio's shared profile can be measured.
  const entry={root,mechanic};applications.set(host,entry);
  host.style.visibility='hidden';host.inert=true;host.dataset.layoutPending='true';
  entry.promise=(async()=>{try{
  const state=await fetchProductionMechanicLayouts(fetcher);
  if(applications.get(host)!==entry||host.firstElementChild!==root)return{state:'superseded'};
  const view=host.ownerDocument?.defaultView||globalThis;
  const bucket=bucketFor(view.innerWidth||host.getBoundingClientRect().width,view.innerHeight||host.getBoundingClientRect().height);
  const key=mechanicLayoutKey(mechanic,bucket,theme);
  const draft=state.profile?.layouts?.[key];
  if(draft)applyMechanicLayout(host,draft);
  await Promise.all([host.ownerDocument.fonts?.ready,...[...host.querySelectorAll('img')].map(img=>img.decode?.().catch(()=>{}))]);
  if(applications.get(host)!==entry||host.firstElementChild!==root)return{state:'superseded'};
  host.querySelectorAll('.orbit-choice').forEach(enforceOrbitGeometry);
  return draft?{state:'valid',key,revision:state.profile.revision}:{state:state.state==='valid'?'missing':state.state,key};
  }finally{
    if(applications.get(host)===entry&&host.firstElementChild===root){
      host.style.removeProperty('visibility');host.inert=false;delete host.dataset.layoutPending;
    }
  }})();
  return entry.promise;
}
