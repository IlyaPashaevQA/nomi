import {presentTransparentPacks} from './transparent-illustration-map.mjs';
import {englishGlossPacks} from './hebrew-english-glossary.mjs';

const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  }
  return value;
};

export async function contentSha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalize(value)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const packAccessId = (language, packId) => `pack:${language}:${packId}`;
export const wordAccessId = (language, wordId) => `word:${language}:${wordId}`;

function ownerEndpoint() {
  const path = globalThis.location?.pathname || '';
  const marker = '/languages-v05/';
  const at = path.indexOf(marker);
  if (at < 0) throw Error('LanguageLab owner route required');
  return path.slice(0, at) + marker + 'api/qa-review-snapshot';
}

export async function loadOwnerContentAccess() {
  const response = await globalThis.fetch(ownerEndpoint(), {cache: 'no-store'});
  if (!response.ok) throw Error('Не удалось загрузить допуски');
  const result = await response.json();
  if (result.state === 'empty') {const p=await loadLearnerContentAccess();return {__legacyReleased:p.legacyReleased||{},__controlsReady:p.controlsReady===true,__blockedWords:p.technicalBlocked||[],__excludedWords:p.excludedWords||[],__reviewIssues:p.reviewIssues||{}}}
  if (result.state !== 'valid' || result.snapshot?.schema !== 1) {
    throw Error('Серверный снимок проверки недоступен');
  }
  const projection=await loadLearnerContentAccess();
  return {...(result.snapshot.access||{}),__wordNotes:result.snapshot.wordNotes||{},__reviewBlocked:projection.reviewBlocked||[],__legacyReleased:projection.legacyReleased||{},__controlsReady:projection.controlsReady===true,__blockedWords:projection.technicalBlocked||[],__excludedWords:projection.excludedWords||[],__reviewIssues:projection.reviewIssues||{}};
}

async function saveRows(rows) {
  const response = await globalThis.fetch(ownerEndpoint(), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    cache: 'no-store',
    body: JSON.stringify({schema: 1, legacy: {}, candidate: {}, access: rows}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.snapshot?.schema !== 1) {
    throw Error(result.error || 'Не удалось сохранить допуск');
  }
  return result.snapshot.access || {};
}

export function currentDecision(access, id, contentSha256Value) {
  const row = access?.[id];
  if (!row || row.contentSha256 !== contentSha256Value || typeof row.enabled !== 'boolean') return null;
  return row.enabled;
}

export function wordAvailable({language, packId, packSha256, wordId, wordSha256}, access) {
  if(access?.__blockedWords?.includes(wordId)||access?.__excludedWords?.includes(wordId)||access?.__reviewBlocked?.includes(wordId))return false;
  const individual = access?.[wordAccessId(language, wordId)];
  const pack = access?.[packAccessId(language, packId)];
  // An explicit per-word denial is global and remains until an individual
  // approval. Bulk decisions must never write into this namespace.
  if (individual?.enabled === false || pack?.enabled === false) return false;
  const word = currentDecision(access, wordAccessId(language, wordId), wordSha256);
  if (word === true) return true;
  const legacy=access?.__legacyReleased?.[packId]?.[wordId]===wordSha256;
  if (pack?.enabled !== true) return legacy;
  if (pack.members) return pack.members[wordId] === wordSha256 || legacy;
  // Read compatibility only for old exact-pack snapshots.
  return currentDecision(access, packAccessId(language, packId), packSha256) === true;
}

export function packAvailability(pack, access) {
  if (!pack.words.length) return 'off';
  const states = pack.words.map(word => wordAvailable({
    language: pack.language,
    packId: pack.id,
    packSha256: pack.contentSha256,
    wordId: word.id,
    wordSha256: word.contentSha256,
  }, access));
  if (states.every(Boolean)) return 'on';
  if (states.some(Boolean)) return 'partial';
  return 'off';
}

export async function setWordAccess({language, id, contentSha256: hash}, enabled) {
  return saveRows({
    [wordAccessId(language, id)]: {enabled: !!enabled, contentSha256: hash, updatedAt: Date.now()},
  });
}

export async function setPackAccess(pack, enabled) {
  const updatedAt = Date.now();
  const rows = {
    [packAccessId(pack.language, pack.id)]: {
      enabled: !!enabled, contentSha256: pack.contentSha256, updatedAt,
      members: Object.fromEntries(pack.words.map(word => [word.id, word.contentSha256])),
    },
  };
  return saveRows(rows);
}


export async function loadLearnerContentAccess(){
 const ctx=globalThis.__LANGUAGES_SESSION_CONTEXT__;
 if(ctx?.mode!=='learner'||!ctx.capabilities?.includes('learner:read'))throw Error('Learner access context required');
 const base=ownerEndpoint().replace('/api/qa-review-snapshot','/api/session/'+encodeURIComponent(ctx.sessionToken)+'/content-access/v1');
 const response=await fetch(base,{cache:'no-store'});
 if(!response.ok)throw Error('Не удалось проверить доступ к словам');
 const result=await response.json();
 if(result.schema!=='languages-content-access-v1'||!Array.isArray(result.catalog))throw Error('Каталог допуска недоступен');
 // A display projection, never a new card version or new admission decision.
 return {...result,catalog:englishGlossPacks(presentTransparentPacks(result.catalog))};
}

export async function hebrewAccessLearningState(){
 const ctx=globalThis.__LANGUAGES_SESSION_CONTEXT__;
 const base=ownerEndpoint().replace('/api/qa-review-snapshot','/api/session/'+encodeURIComponent(ctx.sessionToken)+'/sync/languages-v05');
 const response=await fetch(base,{cache:'no-store'});
 if(!response.ok)throw Error('Учебная история недоступна');
 const value=await response.json();
 if(value.user_id!==ctx.personId||value.app_id!=='languages-v05')throw Error('Неверный профиль истории');
 const envelope=value.state||{},first=new Map(),parentFamiliar=new Set();
 const note=(target,at)=>{if(typeof target==='string'&&Number.isFinite(at)&&(!first.has(target)||at<first.get(target)))first.set(target,at)};
 for(const e of envelope.alpha20?.events||[])if(e.mechanic==='intro'&&e.completed)for(const t of e.targets||[])note(t,e.at);
 const {AUTUMN_TARGETS}=await import('./dasha-hebrew-autumn-course-v1.mjs');
 for(const e of envelope.autumn1?.events||[])if(e.stage==='introduce'&&e.completed){const t=AUTUMN_TARGETS.find(t=>t.id===e.targetId);if(t)note(t.word,e.at)}
 // Read the existing Sukkot journal; never copy or rewrite its records.
 try{for(const e of JSON.parse(localStorage.getItem('nomi-word-loop-v4:'+ctx.personId)||'[]'))if(e.stage==='introduce')note(e.target,e.at)}catch{throw Error('История знакомства требует проверки')}
 const introduced=new Set(first.keys());
 if(ctx.personId==='ilia'&&envelope.hebrewDeclaredKnowledge?.schema==='hebrew-declared-knowledge-v1'&&
    envelope.hebrewDeclaredKnowledge.subject==='ilia')
  for(const item of envelope.hebrewDeclaredKnowledge.entries||[])
   if(item.actor==='ilia'&&item.status==='learned')introduced.add(item.target);
 // Familiarity is durable history, while the ten-word allowance is owned by
 // the active ten-minute checkpoint and is never reconstructed by date.
 if(ctx.personId==='dasha'){
  const r=await fetch(base.replace('/sync/languages-v05','/two-hour/parent-familiarity'),{cache:'no-store'});
  if(!r.ok)throw Error('Parent familiarity unavailable');
  const p=await r.json();
  for(const item of p.familiar||[])if(item.language==='he'){
   introduced.add(item.target);parentFamiliar.add(item.target);
  }
 }
 return {introduced,parentFamiliar,remainingNew:10,sessionLimit:10,
  unlimitedIntroductionsPerDay:true,envelope};
}

/** A note is attached to the existing review snapshot and exact card version.
 * It neither approves a card nor records learning evidence. */
export function wordReviewNote(word, access) {
  const note=access?.__wordNotes?.[wordAccessId(word.language,word.id)];
  // An open owner issue survives replacement media until an explicit resolution.
  return note?.status==='open'||note?.contentSha256===word.contentSha256?note:null;
}
export const WORD_REVIEW_CATEGORIES=Object.freeze({audio:'Звук',image:'Картинка',text:'Текст и значение',other:'Другое'});
const reviewDefaults={audio:'Нужно проверить озвучку',image:'Нужно проверить картинку',text:'Нужно проверить текст или значение'};
export async function setWordReviewNote(word, text, status='open', category='other') {
  if(!Object.hasOwn(WORD_REVIEW_CATEGORIES,category))throw Error('Неизвестная причина замечания');
  const note={text:String(text).trim()||reviewDefaults[category]||'',category,status,contentSha256:word.contentSha256,updatedAt:Date.now()};
  if(!note.text||note.text.length>1000||!['open','resolved'].includes(status))throw Error('Напиши замечание — до 1000 символов');
  const key=wordAccessId(word.language,word.id);
  const response=await fetch(ownerEndpoint(),{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
    body:JSON.stringify({schema:1,legacy:{},candidate:{},access:{},wordNotes:{[key]:note}})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.snapshot?.wordNotes?.[key]?.contentSha256!==note.contentSha256||
    result.snapshot.wordNotes[key].text!==note.text||result.snapshot.wordNotes[key].status!==status||
     result.snapshot.wordNotes[key].category!==category)
    throw Error(result.error||'Сохранение замечания не подтверждено');
  return result.snapshot.wordNotes[key];
}

export function wordAvailableInCatalog(word,packs,access) {
  return packs.some(pack=>pack.words.some(item=>item.id===word.id&&item.contentSha256===word.contentSha256)&&
    wordAvailable({language:word.language,packId:pack.id,packSha256:pack.contentSha256,
      wordId:word.id,wordSha256:word.contentSha256},access));
}

