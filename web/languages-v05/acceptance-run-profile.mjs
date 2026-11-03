// Read the SAME per-mechanic knobs as the QA gallery. Never overwrite its settings.
export function readLessonProfile(id,storage=globalThis.localStorage){
  const read=key=>{try{const value=JSON.parse(storage?.getItem(key)||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}};
  const type=read('nomi:mechanic-type:'+id),size=read('nomi:mechanic-size:'+id);
  const number=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)?Math.max(lo,Math.min(hi,x)):100;
  return {id,prompt:number(type.prompt,70,1000),answer:number(type.answer,70,1000),center:number(size.center,70,1000),bubble:number(size.bubble,50,300)};
}
export function applyLessonProfile(host,id){
  const profile=readLessonProfile(id);
  for(const key of ['prompt','answer','center'])host.style.setProperty('--mechanic-'+key+'-scale',String(profile[key]/100));
  host.style.setProperty('--bubble-size',(118*profile.bubble/100)+'px');
  host.dataset.qaProfile=id;host.dataset.qaSizes=JSON.stringify(profile);
  return profile;
}
