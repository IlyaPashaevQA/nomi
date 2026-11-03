import {activeWordLoopOwner} from './word-loop-store.mjs';
import {optionalLanguagesSessionContext} from './session-context.mjs';

const APP_ID='languages-v05';
const COURSE_ID='he-school-autumn-1';
const SCHEMA=1;
const DEVICE_KEY='personal-hub:device-id:v1';
const LOCAL_PREFIX='nomi-autumn1-history-v3:';
const resolveStorage=s=>s===undefined?globalThis.localStorage:s;
const resolveFetch=f=>f===undefined?globalThis.fetch.bind(globalThis):f;
const empty=()=>({schema:SCHEMA,courseId:COURSE_ID,events:[]});

export function autumn1DeviceId(storage){
 storage=resolveStorage(storage);if(!storage)throw Error('Storage unavailable');
 let id=storage.getItem(DEVICE_KEY);if(!id){id=globalThis.crypto?.randomUUID?.()||('device-'+Date.now());storage.setItem(DEVICE_KEY,id)}return id;
}
export function validateAutumn1State(state){
 if(!state||state.schema!==SCHEMA||state.courseId!==COURSE_ID||!Array.isArray(state.events)||state.events.length>10000)throw Error('Invalid Autumn history');
 const ids=new Set();
 for(const e of state.events){
  if(!e||typeof e.eventId!=='string'||typeof e.attemptId!=='string'||typeof e.sessionId!=='string'||typeof e.deviceId!=='string'||typeof e.taskId!=='string'||typeof e.at!=='number'||e.countsAsEvidence!==false)throw Error('Invalid Autumn event');
  if(!e.targetId||typeof e.stage!=='string')throw Error('Autumn event needs target/stage');
  if(ids.has(e.eventId))throw Error('Duplicate Autumn event');ids.add(e.eventId);
 }
 return state;
}
export function mergeAutumn1States(a,b){
 validateAutumn1State(a);validateAutumn1State(b);const map=new Map();
 for(const e of [...a.events,...b.events]){const p=map.get(e.eventId);if(p&&JSON.stringify(p)!==JSON.stringify(e))throw Error('Conflicting Autumn event');map.set(e.eventId,e)}
 return {schema:SCHEMA,courseId:COURSE_ID,events:[...map.values()].sort((x,y)=>x.at-y.at||x.eventId.localeCompare(y.eventId))};
}
export function autumn1TargetHistory(state,targetId){validateAutumn1State(state);return state.events.filter(e=>e.targetId===targetId).map(e=>({stage:e.stage,correct:e.correct,usedHint:!!e.usedHint,buildLevel:e.buildLevel||null,at:e.at,assisted:!!e.assisted}));}

export function openAutumn1Store({storage,fetcher,syncTimeoutMs=2000,isolated=false,ownerOverride=null}={}){
 storage=resolveStorage(storage);fetcher=resolveFetch(fetcher);
 const context=optionalLanguagesSessionContext(),owner=ownerOverride||activeWordLoopOwner(storage),key=LOCAL_PREFIX+owner;
 let stateKind='unknown',baseline=null,revision=0,syncQueue=Promise.resolve();
 const requestJson=async(url,options={})=>{const controller=new AbortController();let timer;try{return await Promise.race([(async()=>{const r=await fetcher(url,{...options,signal:controller.signal});const payload=await r.json();return {ok:r.ok,status:r.status,payload}})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Autumn sync timeout'))},syncTimeoutMs)})])}finally{clearTimeout(timer)}};
 const read=()=>{
  if(isolated)return openAutumn1Store._isolated?.[owner]||empty();
  if(!storage){stateKind='unavailable';throw Error('Storage unavailable')}const raw=storage.getItem(key);
  if(raw===null){stateKind='empty';baseline=null;return empty()}
  try{const state=validateAutumn1State(JSON.parse(raw));stateKind='valid';baseline=raw;return state}catch(error){stateKind='corrupt';throw Error('Autumn history corrupt',{cause:error})}
 };
 const write=state=>{
  validateAutumn1State(state);
  if(isolated){openAutumn1Store._isolated=openAutumn1Store._isolated||{};openAutumn1Store._isolated[owner]=structuredClone(state);return state}
  if(!storage||stateKind==='unavailable')throw Error('Storage unavailable');if(stateKind==='unknown')read();if(stateKind==='corrupt')throw Error('Autumn history corrupt');
  const current=storage.getItem(key);if(current!==baseline)throw Error('Autumn history changed; reload required');
  const prior=baseline===null?empty():JSON.parse(baseline),nextIds=new Set(state.events.map(e=>e.eventId));
  if(prior.events.some(e=>!nextIds.has(e.eventId)))throw Error('Autumn history replacement rejected');
  const raw=JSON.stringify(state);storage.setItem(key,raw);baseline=raw;stateKind='valid';return state;
 };
 const root=()=>location.pathname.split('/languages-v05/')[0].replace(/^\/+|\/+$/g,'');
 const syncUrl=()=>{
  const fresh=context?optionalLanguagesSessionContext():null;
  if(context&&(!fresh||fresh.personId!==context.personId||
    fresh.mode!==context.mode||!fresh.capabilities.includes('learner:sync')))
    throw Error('Languages identity changed; reopen your profile');
  return fresh?'/'+root()+'/languages-v05/api/session/'+encodeURIComponent(fresh.sessionToken)+'/sync/'+APP_ID:
    '/'+root()+'/api/sync/'+owner+'/'+APP_ID;
 };
 const remote=x=>{if(!x||!Number.isInteger(x.revision)||x.revision<0||x.user_id&&x.user_id!==owner)throw Error('Invalid Autumn sync snapshot');const envelope=x.state||{};return envelope.autumn1?validateAutumn1State(envelope.autumn1):empty()};
 const pull=async local=>{const r=await requestJson(syncUrl(),{cache:'no-store'});if(!r.ok)throw Error('Autumn sync pull failed');revision=r.payload.revision||0;return {merged:mergeAutumn1States(local,remote(r.payload)),envelope:r.payload.state||{}}};
 const push=async(local,envelope={})=>{
  const send=(base,state)=>requestJson(syncUrl(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:autumn1DeviceId(storage),base_revision:base,state})});
  let body={...envelope,autumn1:local},r=await send(revision,body);
  if(r.status===409){revision=r.payload.revision||0;const merged=mergeAutumn1States(local,remote(r.payload));body={...(r.payload.state||{}),autumn1:merged};r=await send(revision,body);if(!r.ok)throw Error(r.payload.error||'Autumn sync conflict');revision=r.payload.revision||revision;return merged}
  if(!r.ok)throw Error(r.payload.error||'Autumn sync push failed');revision=r.payload.revision||revision;return local;
 };
 const appendLocal=event=>{const current=read(),next=mergeAutumn1States(current,{schema:SCHEMA,courseId:COURSE_ID,events:[structuredClone(event)]});write(next);return {state:next,synced:false}};
 const sync=()=>{if(isolated)return Promise.resolve({state:read(),synced:false,review:true});const run=async()=>{let local=read();try{const {merged,envelope}=await pull(local);if(JSON.stringify(merged)!==JSON.stringify(local))local=write(merged);let pushed=await push(local,envelope);const current=read();if(JSON.stringify(pushed)!==JSON.stringify(current))pushed=write(mergeAutumn1States(current,pushed));return {state:pushed,synced:true}}catch(error){let current=local;try{current=read()}catch{}return {state:current,synced:false,error}}};syncQueue=syncQueue.then(run,run);return syncQueue};
 return Object.freeze({owner,key,load:read,async hydrate(){let local=read();if(isolated)return {state:local,synced:false,review:true};try{const {merged,envelope}=await pull(local);if(JSON.stringify(merged)!==JSON.stringify(local))local=write(merged);const pushed=await push(local,envelope);if(JSON.stringify(pushed)!==JSON.stringify(local))local=write(mergeAutumn1States(read(),pushed));return {state:local,synced:true}}catch(error){return {state:local,synced:false,error}}},async append(event){appendLocal(event);return sync()},appendLocal,sync});
}
export const AUTUMN1_STORE_PREFIX=LOCAL_PREFIX;
