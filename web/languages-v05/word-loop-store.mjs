import {validateTeachingRecords} from './word-learning-events.mjs';
import {optionalLanguagesSessionContext} from './session-context.mjs';
const TEST_KEY='nomi-word-loop-v4:test-owner';
const DASHA_KEY='nomi-word-loop-v4:dasha';
const START_KEY='nomi-learning-start-v1:dasha';
const resolveStorage=s=>s===undefined?globalThis.localStorage:s;
export function dashaLearningStart(storage){storage=resolveStorage(storage);if(!storage)return null;try{const x=JSON.parse(storage.getItem(START_KEY)||'null');return x?.version==='dasha-learning-start-v1'&&Number.isFinite(x.startedAt)?x:null}catch{return null}}
export function activeWordLoopOwner(storage){const context=optionalLanguagesSessionContext();if(context){if(context.mode!=='learner'||!context.capabilities.includes('learner:write'))throw Error('Learner writer unavailable');return context.personId}return dashaLearningStart(storage)?'dasha':'test-owner'}
export function wordLoopStoreKey(storage){const owner=activeWordLoopOwner(storage);return owner==='test-owner'?TEST_KEY:`nomi-word-loop-v4:${owner}`}
export function startDashaLearning({deviceId='unknown',at=Date.now(),storage}={}){storage=resolveStorage(storage);if(!storage)throw Error('Storage unavailable');const existing=dashaLearningStart(storage);if(existing)return existing;const marker={version:'dasha-learning-start-v1',learnerId:'dasha',startedAt:at,deviceId};storage.setItem(START_KEY,JSON.stringify(marker));return marker}
// Bind the namespace once per lesson. A marker in another tab must not
// move an already-open test session (or its clear action) into Dasha's store.
export function openWordLoopStore(storage){
 storage=resolveStorage(storage);
 const owner=activeWordLoopOwner(storage),key=owner==='test-owner'?TEST_KEY:`nomi-word-loop-v4:${owner}`;
 let state='unknown',baseline=null;
 return Object.freeze({
  owner,key,get state(){return state},
  load(){
   if(!storage){state='unavailable';throw Error('Storage unavailable')}
   let raw;try{raw=storage.getItem(key)}catch(error){state='unavailable';throw Error('Storage unavailable',{cause:error})}
   if(raw===null){state='empty';baseline=null;return []}
   try{const records=JSON.parse(raw);validateTeachingRecords(records);state='valid';baseline=raw;return records}catch(error){state='corrupt';throw Error('Teaching history corrupt',{cause:error})}
  },
  save(records){
   validateTeachingRecords(records);
   if(!storage||state==='unavailable')throw Error('Storage unavailable');
   if(state==='unknown')throw Error('Teaching history must be loaded before save');
   if(state==='corrupt')throw Error('Teaching history corrupt; recovery required');
   let current;try{current=storage.getItem(key)}catch(error){state='unavailable';throw Error('Storage unavailable',{cause:error})}
   if(current!==baseline)throw Error('Teaching history changed; reload required');
   const previous=baseline===null?[]:JSON.parse(baseline);
   if(records.length<previous.length||previous.some((r,i)=>JSON.stringify(r)!==JSON.stringify(records[i])))throw Error('Teaching history replacement rejected; append only');
   try{const raw=JSON.stringify(records);storage.setItem(key,raw);baseline=raw;state='valid';return records.length}catch(error){throw Error('Storage write failed',{cause:error})}
  },
  clear(){if(!storage)throw Error('Storage unavailable');storage.removeItem(key);baseline=null;state='empty'}
 });
}
// One-shot compatibility helpers. Stateful lesson runners use a bound store.
export function loadWordLoopRecords(storage){return openWordLoopStore(storage).load()}
export function saveWordLoopRecords(records,storage){const store=openWordLoopStore(storage);store.load();return store.save(records)}
export function clearWordLoopRecords(storage){openWordLoopStore(storage).clear()}
export const WORD_LOOP_STORE_KEY=TEST_KEY;
export const DASHA_LEARNING_START_KEY=START_KEY;
