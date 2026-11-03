import {activeWordLoopOwner} from './word-loop-store.mjs';
import {optionalLanguagesSessionContext} from './session-context.mjs';
const LOCAL_KEY='nomi-alpha20-history-v1:dasha';
const DEVICE_KEY='personal-hub:device-id:v1';
const APP_ID='languages-v05';
const COURSE_ID='he-alpha20';
const SCHEMA=1;

const resolveStorage=s=>s===undefined?globalThis.localStorage:s;
const resolveFetch=f=>f===undefined?globalThis.fetch.bind(globalThis):f;

export function alpha20DeviceId(storage){
  storage=resolveStorage(storage);
  if(!storage)throw Error('Storage unavailable');
  let id;
  try{id=storage.getItem(DEVICE_KEY)}catch(error){throw Error('Storage unavailable',{cause:error})}
  if(!id){id=globalThis.crypto?.randomUUID?.()||('device-'+Date.now());storage.setItem(DEVICE_KEY,id)}
  return id;
}

export function validateAlpha20State(state){
  if(!state||state.schema!==SCHEMA||state.courseId!==COURSE_ID||!Array.isArray(state.events)||state.events.length>10000)throw Error('Invalid Alpha-20 history');
  const ids=new Set();
  for(const e of state.events){
    if(!e||typeof e.eventId!=='string'||typeof e.attemptId!=='string'||typeof e.sessionId!=='string'||typeof e.deviceId!=='string'||typeof e.taskId!=='string'||typeof e.at!=='number'||e.countsAsEvidence!==false)throw Error('Invalid Alpha-20 event');
    if(ids.has(e.eventId))throw Error('Duplicate Alpha-20 event');ids.add(e.eventId);
  }
  if(state.dailyLesson!==undefined)validateDailyLesson(state.dailyLesson);
  return state;
}
export function validateDailyLesson(p){
  if(!p||p.version!==1||typeof p.changeId!=='string'||!Array.isArray(p.parents)||p.parents.length>256||
    !Number.isSafeInteger(p.revision)||p.revision<1||typeof p.sessionId!=='string'||
    !['active','complete'].includes(p.status)||!Array.isArray(p.plan)||!Array.isArray(p.introIds)||
    !p.runtime||!Number.isFinite(p.runtime.elapsedMs)||p.runtime.elapsedMs<0||p.runtime.elapsedMs>600000||
    !Array.isArray(p.runtime.pauses)||!['between','task','feedback','card','complete'].includes(p.runtime.phase))
    throw Error('Invalid Hebrew lesson checkpoint');
  return p;
}
export function mergeDailyLesson(a,b){
  if(!a)return b;if(!b)return a;
  validateDailyLesson(a);validateDailyLesson(b);
  if(a.changeId===b.changeId){if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Conflicting Hebrew checkpoint');return a}
  if(a.parents.includes(b.changeId)&&a.revision>b.revision)return a;
  if(b.parents.includes(a.changeId)&&b.revision>a.revision)return b;
  throw Error('Hebrew lesson changed on another device; reload required');
}
const empty=()=>({schema:SCHEMA,courseId:COURSE_ID,events:[]});
const remoteState=(x,owner)=>{
  if(!x||!Number.isInteger(x.revision)||x.revision<0||x.user_id&&x.user_id!==owner)throw Error('Invalid Alpha-20 sync snapshot');
  if(x.state!==null&&(!x.state||typeof x.state!=='object'||Array.isArray(x.state)))throw Error('Invalid Alpha-20 sync envelope');
  return x.state&&Object.hasOwn(x.state,'alpha20')?validateAlpha20State(x.state.alpha20):empty();
};
function mergeStates(a,b){
  validateAlpha20State(a);validateAlpha20State(b);
  const map=new Map();
  for(const e of [...a.events,...b.events]){
    const prior=map.get(e.eventId);
    if(prior&&JSON.stringify(prior)!==JSON.stringify(e))throw Error('Conflicting Alpha-20 event');
    map.set(e.eventId,e);
  }
  const dailyLesson=mergeDailyLesson(a.dailyLesson,b.dailyLesson);
  return {schema:SCHEMA,courseId:COURSE_ID,events:[...map.values()].sort((x,y)=>x.at-y.at||x.eventId.localeCompare(y.eventId)),...(dailyLesson?{dailyLesson}:{})};
}
export function alpha20Progress(state,course){
  validateAlpha20State(state);
  const completed=new Set(state.events.filter(e=>e.completed===true).map(e=>e.taskId));
  const blocks=course.blocks.map(block=>{
    const complete=block.tasks.filter(t=>completed.has(t.id)).length;
    return {id:block.id,total:block.tasks.length,complete,done:complete===block.tasks.length};
  });
  return {completedTaskIds:completed,blocks,courseDone:blocks.every(x=>x.done)};
}

// Mobile Safari can need more than 2 seconds after a tab has been asleep;
 // a slow download is not evidence that the learner's history is missing.
export function isStaleLanguagesSession(error){
 return /(?:Invalid|Expired) Languages session/.test(String(error?.message||error||''));
}
export function alpha20SyncIssue(error){
 if(isStaleLanguagesSession(error))return 'session-expired';
 const detail=String(error?.message||error||'');
 if(/another device|checkpoint|Conflicting Hebrew checkpoint|conflict/i.test(detail))return 'concurrent-checkpoint';
 if(/too large|request size|quota|capacity/i.test(detail))return 'capacity';
 if(/timeout|failed to fetch|network|offline|sync pull failed/i.test(detail))return 'network';
 return 'sync-error';
}
export function openAlpha20Store({storage,fetcher,syncTimeoutMs=7000}={}){
  storage=resolveStorage(storage);fetcher=resolveFetch(fetcher);
  const context=optionalLanguagesSessionContext(),owner=activeWordLoopOwner(storage),key=owner==='dasha'?LOCAL_KEY:`nomi-alpha20-history-v1:${owner}`;
  let stateKind='unknown',baseline=null,revision=0;
  let syncQueue=Promise.resolve();
  const ackKey=key+':server-ack-v1',recoveryKey=key+':checkpoint-recovery-v1';
  const ack=()=>{try{return JSON.parse(storage.getItem(ackKey)||'null')}catch{return null}};
  const remember=accepted=>storage.setItem(ackKey,JSON.stringify({
    changeId:accepted.dailyLesson?.changeId||null,revision,at:Date.now()}));
  const mergeForSync=(local,remote)=>{
    try{return mergeStates(local,remote)}catch(error){
      if(!/Hebrew.*(?:checkpoint|another device)/i.test(error.message))throw error;
      const a=local.dailyLesson,b=remote.dailyLesson,confirmed=ack();
      if(!a||!b)throw error;
      const serverEvents=new Map(remote.events.map(e=>[e.eventId,e]));
      const allRecorded=local.events.every(e=>serverEvents.has(e.eventId)&&
        JSON.stringify(e)===JSON.stringify(serverEvents.get(e.eventId)));
      // Explicit owner restart after a technical failure supersedes an
      // unsent clock-only branch. Every local answer must already be on server.
      const workflowRestart=owner==='ilia'&&b.reason==='owner-requested-review-workflow'&&
        b.runtime.elapsedMs>=600000;
      if(allRecorded&&a.sessionId===b.sessionId&&b.status==='complete'&&
          (workflowRestart||b.reason==='owner-requested-restart-after-layout-failure'&&
           b.ownerRestart?.requestedInChat===true)){
        storage.setItem(recoveryKey,JSON.stringify({version:1,at:Date.now(),
          reason:workflowRestart?'owner-workflow-restart':'owner-requested-restart',dailyLesson:a}));
        return mergeStates({...local,dailyLesson:undefined},remote);
      }
      // Confirmed checkpoints can predate the bounded parent window.
      // Pre-upgrade storage is adopted only if EVERY answer is on the server.
      if(confirmed?.changeId===b.changeId&&a.revision>b.revision&&
          remote.events.every(e=>local.events.some(x=>x.eventId===e.eventId&&JSON.stringify(x)===JSON.stringify(e)))){
        const continued={...local,dailyLesson:{...a,parents:[...a.parents.filter(id=>id!==b.changeId),b.changeId].slice(-256)}};
        return mergeStates(continued,remote);
      }
      const clean=confirmed?.changeId===a.changeId;
      const legacy=!confirmed&&b.revision>a.revision&&allRecorded;
      if(!allRecorded||!clean&&!legacy)throw error;
      storage.setItem(recoveryKey,JSON.stringify({
        version:1,at:Date.now(),reason:legacy?'legacy-confirmed-answers':'stale-confirmed-checkpoint',
        dailyLesson:a}));
      return mergeStates({...local,dailyLesson:undefined},remote);
    }
  };
  const requestJson=async(url,options={})=>{
    const controller=new globalThis.AbortController();let timer;
    try{return await Promise.race([
      (async()=>{const r=await fetcher(url,{...options,signal:controller.signal});const payload=await r.json();return {ok:r.ok,status:r.status,json:async()=>payload}})(),
      new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Alpha-20 sync timeout'))},syncTimeoutMs)})
    ])}finally{clearTimeout(timer)}
  };
  const read=()=>{
    if(!storage){stateKind='unavailable';throw Error('Storage unavailable')}
    let raw;try{raw=storage.getItem(key)}catch(error){stateKind='unavailable';throw Error('Storage unavailable',{cause:error})}
    if(raw===null){stateKind='empty';baseline=null;return empty()}
    try{const state=validateAlpha20State(JSON.parse(raw));stateKind='valid';baseline=raw;return state}catch(error){stateKind='corrupt';throw Error('Alpha-20 history corrupt',{cause:error})}
  };
  const write=state=>{
    validateAlpha20State(state);
    if(!storage||stateKind==='unavailable')throw Error('Storage unavailable');
    if(stateKind==='unknown')throw Error('Alpha-20 history must be loaded before save');
    if(stateKind==='corrupt')throw Error('Alpha-20 history corrupt; recovery required');
    let current;try{current=storage.getItem(key)}catch(error){stateKind='unavailable';throw Error('Storage unavailable',{cause:error})}
    if(current!==baseline)throw Error('Alpha-20 history changed; reload required');
    const prior=baseline===null?empty():JSON.parse(baseline);
    const nextIds=new Set(state.events.map(e=>e.eventId));
    if(prior.events.some(e=>!nextIds.has(e.eventId)))throw Error('Alpha-20 history replacement rejected');
    const raw=JSON.stringify(state);storage.setItem(key,raw);baseline=raw;stateKind='valid';return state;
  };
  const root=()=>location.pathname.split('/languages-v05/')[0].replace(/^\/+|\/+$/g,'');
  const syncUrl=()=>{
    // Unified Hub renews 48h learner bearer under its 30-day HttpOnly cookie.
    // Never freeze an expired token inside a long-running Nomi store.
    const fresh=context?optionalLanguagesSessionContext():null;
    if(context&&(!fresh||fresh.personId!==context.personId||
       fresh.mode!==context.mode||!fresh.capabilities.includes('learner:sync')))
      throw Error('Languages identity changed; stop and reopen your profile');
    return fresh?'/'+root()+'/languages-v05/api/session/'+encodeURIComponent(fresh.sessionToken)+'/sync/'+APP_ID:
      '/'+root()+'/api/sync/'+owner+'/'+APP_ID;
  };
  const pull=async local=>{
    const r=await requestJson(syncUrl(),{cache:'no-store'});
    const x=await r.json();
    if(!r.ok)throw Error(x?.error?('Alpha-20 GET HTTP '+r.status+': '+String(x.error).slice(0,160)):'Alpha-20 sync pull failed HTTP '+r.status);
    revision=x.revision||0;
    const remote=remoteState(x,owner);
    return {merged:mergeForSync(local,remote),remote,remoteEnvelope:x.state||{}};
  };
  const push=async(local,envelope={})=>{
    const body={...envelope,alpha20:local};
    const request=()=>requestJson(syncUrl(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:alpha20DeviceId(storage),base_revision:revision,state:body})});
    let r=await request(),x=await r.json();
    if(r.status===409){
      revision=x.revision||0;
      const remote=remoteState(x,owner);
      const merged=mergeForSync(local,remote);
      const retryBody={...(x.state||{}),alpha20:merged};
      r=await requestJson(syncUrl(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:alpha20DeviceId(storage),base_revision:revision,state:retryBody})});
      x=await r.json();
      if(!r.ok)throw Error(x.error||'Alpha-20 sync conflict');
      revision=x.revision||revision;remember(merged);return merged;
    }
    if(!r.ok)throw Error(x.error||'Alpha-20 sync push failed');
    revision=x.revision||revision;remember(local);return local;
  };
  const appendLocal=event=>{
    const current=read();
    const next=mergeStates(current,{schema:SCHEMA,courseId:COURSE_ID,events:[structuredClone(event)]});
    write(next);
    return {state:next,synced:false,review:owner==='test-owner'};
  };
  const saveLesson=(lesson,event=null)=>{
    const current=read(),prior=current.dailyLesson;
    // Optimistic same-device CAS: a stale renderer must never replace a newer
    // clock/answer. Events and their next phase commit in one local write.
    if((lesson.changeId||null)!==(prior?.changeId||null))throw Error('Hebrew lesson changed; reload required');
    const next=event?mergeStates(current,{schema:SCHEMA,courseId:COURSE_ID,events:[structuredClone(event)]}):current;
    next.dailyLesson={...structuredClone(lesson),version:1,
      changeId:globalThis.crypto.randomUUID(),revision:(prior?.revision||0)+1,
      parents:prior?[...prior.parents,prior.changeId].slice(-256):[]};
    validateDailyLesson(next.dailyLesson);write(next);
    return {state:next,synced:false};
  };
  const sync=()=>{
    const run=async()=>{
      let local=read();
      if(owner==='test-owner')return {state:local,synced:false,review:true};
      try{
        const {merged,remote,remoteEnvelope}=await pull(local);
        if(JSON.stringify(merged)!==JSON.stringify(local))local=write(merged);
        // A read of an already-synced learner must not write the entire
        // family envelope back. Such unnecessary POSTs caused avoidable CAS
        // conflicts with concurrent Hebrew/English sessions.
        const pushed=JSON.stringify(merged)===JSON.stringify(remote)
          ?merged:await push(merged,remoteEnvelope);
        remember(pushed);
        const latest=read();
        const combined=mergeForSync(latest,pushed);
        if(JSON.stringify(combined)!==JSON.stringify(latest))write(combined);
        const synced=JSON.stringify(combined)===JSON.stringify(pushed);
        return {state:combined,synced,...(synced?{}:{pending:true})};
      }catch(error){
        // A newer local answer may legitimately arrive while an older sync is in
        // flight. Never roll it back or turn that transport race into a replay.
        let current=local;
        try{current=read()}catch{}
        return {state:current,synced:false,error};
      }
    };
    syncQueue=syncQueue.then(run,run);
    return syncQueue;
  };
  return Object.freeze({
    owner,key,
    get state(){return stateKind},
    load:read,
    async hydrate(){
      let local=read();
      if(owner==='test-owner')return {state:local,synced:false,review:true};
      try{
        const {merged,remote,remoteEnvelope}=await pull(local);
        if(JSON.stringify(merged)!==JSON.stringify(local))local=write(merged);
        const pushed=JSON.stringify(merged)===JSON.stringify(remote)
          ?merged:await push(merged,remoteEnvelope);
        remember(pushed);
        const latest=read(),combined=mergeForSync(latest,pushed);
        if(JSON.stringify(combined)!==JSON.stringify(latest))local=write(combined);
        else local=latest;
        const synced=JSON.stringify(combined)===JSON.stringify(pushed);
        return {state:local,synced,...(synced?{}:{pending:true})};
      }catch(error){return {state:local,synced:false,error}}
    },
    async append(event){
      appendLocal(event);
      return sync();
    },
    appendLocal,
    saveLesson,
    sync,
    clear(){if(!storage)throw Error('Storage unavailable');storage.removeItem(key);storage.removeItem(ackKey);baseline=null;stateKind='empty';},
  });
}
export const ALPHA20_STORE_KEY=LOCAL_KEY;

