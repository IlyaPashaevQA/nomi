// Ten-minute learner-session-only cache for already authorized images.
// The HTTP endpoint remains private/no-store to preserve revocation. A blob
// lives only in this tab's current lesson, not in disk cache or a new backend.
export function createLessonImageCache({fetcher=globalThis.fetch.bind(globalThis),urlApi=globalThis.URL,
  maxEntries=40,maxBytes=48*1024*1024}={}){
 if(typeof fetcher!=='function'||!urlApi?.createObjectURL||!urlApi?.revokeObjectURL)
  throw Error('Learner image cache unavailable');
 const entries=new Map(),pending=new Map();
 let bytes=0,destroyed=false;
 const revoke=(src,row)=>{entries.delete(src);bytes-=row.size;urlApi.revokeObjectURL(row.url)};
 const trim=()=>{
  while((entries.size>maxEntries||bytes>maxBytes)&&entries.size>1){
   const [src,row]=entries.entries().next().value;revoke(src,row);
  }
 };
 function get(src){return entries.get(src)?.url||src}
 function retain(allowed){
  const allow=new Set(allowed);
  for(const [src,row] of entries)if(!allow.has(src))revoke(src,row);
 }
 async function prime(src){
  if(destroyed)throw Error('Lesson ended');
  if(!/^\.\//.test(src))return src; // only approved relative source paths
  if(entries.has(src)){const row=entries.get(src);entries.delete(src);entries.set(src,row);return row.url}
  if(pending.has(src))return pending.get(src);
  const job=(async()=>{
   const r=await fetcher(src,{cache:'no-store',credentials:'same-origin'});
   if(!r.ok)throw Error('Approved image fetch failed: '+r.status);
   const blob=await r.blob();
   if(!blob?.type?.startsWith('image/')||blob.size<16||blob.size>5*1024*1024)
    throw Error('Approved image response invalid');
   if(destroyed)throw Error('Lesson ended');
   const url=urlApi.createObjectURL(blob);
   entries.set(src,{url,size:blob.size});bytes+=blob.size;trim();
   return url;
  })();
  pending.set(src,job);
  try{return await job}finally{if(pending.get(src)===job)pending.delete(src)}
 }
 async function primeMany(sources){
  const unique=[...new Set((sources||[]).filter(src=>typeof src==='string'&&src.startsWith('./')))];
  return Promise.allSettled(unique.map(prime));
 }
 function destroy(){destroyed=true;for(const [src,row] of entries)revoke(src,row);pending.clear()}
 return Object.freeze({get,prime,primeMany,retain,destroy,
  get size(){return entries.size},get bytes(){return bytes},get closed(){return destroyed}});
}
