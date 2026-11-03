import {generatedSentenceA,SENTENCE_TEMPLATES,SENTENCE_TEMPLATE_SOURCE_SHA} from './sentence-a-templates.mjs';
// Owner-approved A-only content; B/C/D remain private parent drafts.
import {hebrewWordKnowledge} from './hebrew-known-word-policy.mjs';
import {compositionObservation} from './composition-evidence.mjs';
import {SOURCE37_SENTENCE_A,SOURCE37_SENTENCE_VERSION} from './source37-sentence-data.mjs';
export const SENTENCE_SOURCE_SHA='0aa8576d650a87469cb33cde291cdde62833d77036205464c17d3af7555dfdef';
const RELEASE={"version":"known-sentence-a-20261025-v1","tier":"A","ownerApprovedAt":"2026-10-25","approval":"Explicit owner approval of current preview and instruction to integrate tier A","sentences":[{"id":"s01","words":["אַבָּא","קוֹרֵא","סֵפֶר"],"russian":"Папа читает книгу","wordRefs":[{"target":"אבא","contentSha256":"9a6735686aa4c500333f9e3d1a4c5055496ae6b0520775c61735bcedef76dd3f"},{"target":"קורא","contentSha256":"0c3bd37fa3fa823de137d77e2fc33090f32379fd956f8f13f9169fb2ede85a48"},{"target":"ספר","contentSha256":"92e089cfa4b36da28a78ea753dea86c2ed51cf67252c29d770830d417a35e73c"}]},{"id":"s02","words":["אִמָּא","קוֹרֵאת","סֵפֶר"],"russian":"Мама читает книгу","wordRefs":[{"target":"אמא","contentSha256":"2a1679e8388cb137380ffa01073260a1edd727b5d9a04d31921b4dc3c01cee07"},{"target":"קוראת","contentSha256":"fb09ad3a4f59568b5e94226572812d45bd96294d800c14def54c34687e28ecd9"},{"target":"ספר","contentSha256":"92e089cfa4b36da28a78ea753dea86c2ed51cf67252c29d770830d417a35e73c"}]},{"id":"s03","words":["יֶלֶד","קוֹרֵא","סֵפֶר"],"russian":"Мальчик читает книгу","wordRefs":[{"target":"ילד","contentSha256":"b57d2bca2ac1e7d02c25d36e722d7f1cfa6ac1157010bf7914ecc088eee759a9"},{"target":"קורא","contentSha256":"0c3bd37fa3fa823de137d77e2fc33090f32379fd956f8f13f9169fb2ede85a48"},{"target":"ספר","contentSha256":"92e089cfa4b36da28a78ea753dea86c2ed51cf67252c29d770830d417a35e73c"}]},{"id":"s04","words":["יַלְדָּה","קוֹרֵאת","סֵפֶר"],"russian":"Девочка читает книгу","wordRefs":[{"target":"ילדה","contentSha256":"24ecc529588fbf7b052b89122ec9ba3324faf3ed46230b661788f5617c6917aa"},{"target":"קוראת","contentSha256":"fb09ad3a4f59568b5e94226572812d45bd96294d800c14def54c34687e28ecd9"},{"target":"ספר","contentSha256":"92e089cfa4b36da28a78ea753dea86c2ed51cf67252c29d770830d417a35e73c"}]},{"id":"s05","words":["אִמָּא","שׁוֹתָה","מַיִם"],"russian":"Мама пьёт воду","wordRefs":[{"target":"אמא","contentSha256":"2a1679e8388cb137380ffa01073260a1edd727b5d9a04d31921b4dc3c01cee07"},{"target":"שותה","contentSha256":"58c89ebb19bcfc06cb1ea5f7c83d25d13f4cc11d7650431afe13780eb0a60556"},{"target":"מים","contentSha256":"8690d5515c932da2d29c8c18c167dabb40739dd20b63d27d3378bad6a54d17c6"}]},{"id":"s06","words":["חָתוּל","שׁוֹתֶה","מַיִם"],"russian":"Кот пьёт воду","wordRefs":[{"target":"חתול","contentSha256":"ba155e6a8eae6071fdfc5a7ee9620454635edc20de6d542e26e685ce873d0d10"},{"target":"שותה","contentSha256":"58c89ebb19bcfc06cb1ea5f7c83d25d13f4cc11d7650431afe13780eb0a60556"},{"target":"מים","contentSha256":"8690d5515c932da2d29c8c18c167dabb40739dd20b63d27d3378bad6a54d17c6"}]},{"id":"s07","words":["כֶּלֶב","שׁוֹתֶה","מַיִם"],"russian":"Собака пьёт воду","wordRefs":[{"target":"כלב","contentSha256":"6c9bc6293d80d142ccbaf8dc6a6d0a9fb560b86b1421784e55d4ff296e479029"},{"target":"שותה","contentSha256":"58c89ebb19bcfc06cb1ea5f7c83d25d13f4cc11d7650431afe13780eb0a60556"},{"target":"מים","contentSha256":"8690d5515c932da2d29c8c18c167dabb40739dd20b63d27d3378bad6a54d17c6"}]}]};
export const SENTENCE_VERSION=RELEASE.version;
export const SENTENCE_A=Object.freeze(RELEASE.sentences.map(s=>Object.freeze(s)));
export const SENTENCE_POOL=Object.freeze([...SENTENCE_A,...generatedSentenceA(SENTENCE_A),...SOURCE37_SENTENCE_A]);
export const SENTENCE_VERSIONS=Object.freeze([SENTENCE_VERSION,SENTENCE_TEMPLATES.version,SOURCE37_SENTENCE_VERSION]);
const release=s=>({version:s.version||SENTENCE_VERSION,sourceSha256:s.sourceSha256||SENTENCE_SOURCE_SHA});
export const SENTENCE_SESSION_MAX=2;
const day=86400000;
const recorded=e=>e?.completed===true&&SENTENCE_VERSIONS.includes(e.detail?.sentenceVersion)&&typeof e.correct==='boolean';
export function sentenceAdmitted(task,words){
 const s=SENTENCE_POOL.find(s=>s.id===task?.sentenceTask?.sentenceId);
 return !!s&&s.wordRefs.every(ref=>words.some(w=>w.target===ref.target&&w.contentSha256===ref.contentSha256));
}
export function isScheduledSentenceTask(task){
 return !!task&&task.mechanic==='constructor'&&task.mode==='sentence'&&
  SENTENCE_POOL.some(s=>s.id===task.sentenceTask?.sentenceId&&release(s).version===task.sentenceTask.version&&release(s).sourceSha256===task.sentenceTask.sourceSha256)&&
  SENTENCE_POOL.some(s=>s.id===task.sentenceTask.sentenceId)&&
  Array.isArray(task.targets)&&task.targets.length===0&&Array.isArray(task.choices)&&task.choices.length===0&&!task.contentAccess;
}
export function sentenceAnswer(task,answerTokens,{helpUsed=false}={}){
 if(!isScheduledSentenceTask(task))throw Error('Unreleased sentence');
 const s=SENTENCE_POOL.find(s=>s.id===task.sentenceTask.sentenceId);
 if(!Array.isArray(answerTokens)||answerTokens.length!==s.words.length||
  [...answerTokens].sort().join('|')!==[...s.words].sort().join('|'))throw Error('Sentence tokens outside released bank');
 const o=compositionObservation({expected:s.words,answerTokens,helpUsed});
 const {correct,assisted,...detail}=o;
 return {correct,assisted,detail:{...detail,sentenceVersion:release(s).version,sentenceId:s.id,
  sentenceContentSha256:release(s).sourceSha256,countsAsWordMastery:false}};
}
export function sentenceDueAt(history){
 let due=0,interval=7;
 for(const e of [...history].sort((a,b)=>a.at-b.at)){
  if(e.correct!==true||e.assisted===true){due=e.at+day;interval=7}
  else if(e.at>=due){due=e.at+interval*day;interval=Math.min(30,interval===7?14:30)}
 }
 return due;
}
export function chooseHebrewSentenceTask(plan,words,events,{now=Date.now()}={}){
 if(!plan?.sessionId||plan.status!=='active'||!Number.isFinite(plan.runtime?.elapsedMs)||
  plan.runtime.elapsedMs<240000||plan.runtime.elapsedMs>=600000)return null;
 const current=events.filter(e=>e.sessionId===plan.sessionId&&e.completed===true);
 const done=current.filter(recorded);
 if(done.length>=SENTENCE_SESSION_MAX)return null;
 const lastContext=current.findLastIndex(e=>recorded(e)||e.detail?.mode==='reading-comprehension');
 if(current.slice(lastContext+1).filter(e=>!e.detail?.wordForm&&e.mechanic!=='intro'&&typeof e.correct==='boolean'&&e.targets?.length===1).length<4)return null;
 const lastSentence=events.filter(e=>recorded(e)&&e.at<=now).sort((a,b)=>a.at-b.at).at(-1);
 const lastTemplate=SENTENCE_POOL.find(s=>s.id===lastSentence?.detail?.sentenceId);
 const action=s=>s?.wordRefs?.[1]?.target==='שותה'?'drink':'read';
 const sameAction=s=>lastTemplate&&action(s)===action(lastTemplate)?1:0;
 const sameActor=s=>lastTemplate&&s.wordRefs[0].target===lastTemplate.wordRefs[0].target?1:0;
 const candidates=SENTENCE_POOL.filter(s=>s.wordRefs.every(ref=>{
  const w=words.find(w=>w.target===ref.target&&w.contentSha256===ref.contentSha256);
  return !!w&&hebrewWordKnowledge(w,events,now).learned;
 })).map(s=>({s,history:events.filter(e=>recorded(e)&&e.detail.sentenceId===s.id)}))
 .filter(x=>!done.some(e=>e.detail.sentenceId===x.s.id)&&sentenceDueAt(x.history)<=now)
 .sort((a,b)=>a.history.length-b.history.length||sameAction(a.s)-sameAction(b.s)||sameActor(a.s)-sameActor(b.s)||sentenceDueAt(a.history)-sentenceDueAt(b.history)||SENTENCE_POOL.indexOf(a.s)-SENTENCE_POOL.indexOf(b.s));
 if(!candidates.length)return null;
 return {id:'daily-he:'+plan.sessionId+':'+plan.sequence,mechanic:'constructor',mode:'sentence',
  targets:[],choices:[],countsAsEvidence:false,sentenceTask:{...release(candidates[0].s),sentenceId:candidates[0].s.id}};
}
