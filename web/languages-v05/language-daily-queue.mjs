// Shared read-only planner for future Hebrew/English personalized sessions.
// It consumes approved content plus *learner* evidence. It never fetches, writes,
// infers mastery, or imports QA / preview results into a learner's history.
export const DAILY_PLANNER_VERSION='language-session-queue-v5-ten-no-daily-cap';
const sortTargets=(a,b)=>b.priority-a.priority||
 a.nextAt-b.nextAt||a.language.localeCompare(b.language)||a.lexemeId.localeCompare(b.lexemeId);
const supportedStates=new Set(['unknown','recognize','known','pending']);
const supportedLanguages=new Set(['en','he']);

export function createLanguageDailyPlan({
 personId,now,candidates=[],maxTasks=12,maxNew=undefined,
 languageCaps=undefined,language=null,newWordsUsed=null,excludedWordIds=[],mode='learner',newWordOrder='fifo'
}={}){
 if(!['learner','qa'].includes(mode))throw Error('Invalid planner mode');
 if(!['fifo','priority-fifo'].includes(newWordOrder))throw Error('Invalid new-word order');
 if(!['ilia','anya','dasha'].includes(personId)||!Number.isFinite(now)||
   !Array.isArray(candidates)||!Number.isSafeInteger(maxTasks)||maxTasks<1||
   (maxNew!==undefined&&(!Number.isSafeInteger(maxNew)||maxNew<0)))
   throw Error('Invalid daily planner arguments');
 // Existing personal settings remain caller-owned. Dasha's ceiling belongs
 // to this ten-minute session; calendar-day history never reduces it.
 if(language!==null&&!supportedLanguages.has(language))throw Error('Invalid session language');
 newWordsUsed??={en:0,he:0}; // Deprecated telemetry only; never spends this session's allowance.
 if(!newWordsUsed||typeof newWordsUsed!=='object'||
    !['en','he'].every(k=>Number.isSafeInteger(newWordsUsed[k])&&newWordsUsed[k]>=0)||
    !Array.isArray(excludedWordIds)||excludedWordIds.some(x=>typeof x!=='string'))
   throw Error('Invalid daily usage or exclusions');
 const excluded=new Set(excludedWordIds);
 const requestedMaxNew=maxNew===undefined?(personId==='dasha'?10:6):maxNew;
 // Active routes supply their validated policy/budget; defaults preserve compatibility callers.
 languageCaps??=personId==='dasha'?{en:10,he:10}:{en:12,he:12};
 if(!languageCaps||typeof languageCaps!=='object')throw Error('Language caps missing');
 const allowed={};
 for(const lang of supportedLanguages){
  const cap=languageCaps[lang]??maxTasks;
  if(!Number.isSafeInteger(cap)||cap<0)throw Error('Invalid language cap');
  allowed[lang]=cap;
 }
 const source=new Map(),rejected={profile:0,unreleased:0,qa:0,invalid:0,conflicted:0,language:0,excluded:0};
 let sourceIndex=0;
 for(const item of candidates){
  const orderIndex=sourceIndex++;
  if(!item||typeof item!=='object'||typeof item.lexemeId!=='string'||
   typeof item.language!=='string'||!supportedLanguages.has(item.language)||
   !supportedStates.has(item.state)||typeof item.personId!=='string'||!Number.isFinite(item.priority??0)||
   !Number.isFinite(item.dueAt??0)){
    rejected.invalid++;continue;
  }
  if(item.personId!==personId){rejected.profile++;continue}
  if(language!==null&&item.language!==language){rejected.language++;continue}
  if(excluded.has(item.lexemeId)){rejected.excluded++;continue}
  // Rehearsal is explicit and remains labelled QA in the result. The default
  // learner path still rejects every candidate/QA record. This pure function
  // grants no access; its caller must enforce isolated owner capabilities.
  if(item.contentStatus!=='released'&&!(mode==='qa'&&item.contentStatus==='qa-only')){
   rejected.unreleased++;continue;
  }
  if(mode==='learner'&&(item.evidenceClass==='qa'||item.mode==='qa')||
     mode==='qa'&&(item.evidenceClass!=='qa'||item.mode!=='qa')){rejected.qa++;continue}
  if((item.introduced===true||['known','recognize'].includes(item.state))&&
      item.evidenceClass!==(mode==='qa'?'qa':'learner')){
   rejected.invalid++;continue;
  }
  if((item.packAddedAt!==undefined&&(!Number.isSafeInteger(item.packAddedAt)||item.packAddedAt<0))||
     (item.cardIndex!==undefined&&(!Number.isSafeInteger(item.cardIndex)||item.cardIndex<0))){
   rejected.invalid++;continue;
  }
  const normalized={packAddedAt:item.packAddedAt??0,cardIndex:item.cardIndex??orderIndex,orderIndex,
   lexemeId:item.lexemeId,language:item.language,personId,
   state:item.state,introduced:item.introduced===true,
   nextAt:item.dueAt??0,priority:item.priority??0,courseRefs:Array.isArray(item.courseRefs)?item.courseRefs.filter(x=>typeof x==='string'):[]};
  const previous=source.get(item.lexemeId);
  if(previous){
   if(previous.conflict)continue;
   // One word in multiple courses has one authoritative learner state.
   if(previous.language!==normalized.language||previous.state!==normalized.state||
      previous.introduced!==normalized.introduced||previous.nextAt!==normalized.nextAt){
     source.set(item.lexemeId,{conflict:true});rejected.conflicted++;continue;
   }
   previous.priority=Math.max(previous.priority,normalized.priority);
   if(normalized.packAddedAt<previous.packAddedAt||
      normalized.packAddedAt===previous.packAddedAt&&normalized.cardIndex<previous.cardIndex){
    previous.packAddedAt=normalized.packAddedAt;previous.cardIndex=normalized.cardIndex;
   }
   previous.courseRefs=[...new Set([...previous.courseRefs,...normalized.courseRefs])].sort();
  }else source.set(item.lexemeId,normalized);
 }
 const newLimit=personId==='dasha'?Math.min(requestedMaxNew,10):requestedMaxNew;
 const introduced=[],reviews=[];
 for(const word of source.values()){
  if(word.conflict)continue;
  if(!word.introduced){
   if(word.state==='known')continue; // inconsistent; do not teach or rewrite
   introduced.push({...word,kind:'introduce'});
  }else if(word.nextAt<=now){
   // A known word may return for spaced review; no mastery is granted here.
   if(word.state==='pending')continue;
   reviews.push({...word,kind:'review'});
  }
 }
 introduced.sort((a,b)=>(newWordOrder==='priority-fifo'?b.priority-a.priority:0)||a.packAddedAt-b.packAddedAt||a.cardIndex-b.cardIndex||a.orderIndex-b.orderIndex);
 reviews.sort(sortTargets);
 const selected=[],counts={en:0,he:0},newCounts={en:0,he:0},ids=new Set();
 let newCount=0;
 const admit=(word)=>{
  if(selected.length>=maxTasks||ids.has(word.lexemeId))return false;
  if(word.kind==='introduce'&&
     (newCount>=newLimit||newCounts[word.language]>=allowed[word.language]))
   return false;
  ids.add(word.lexemeId);selected.push(Object.freeze({...word,courseRefs:Object.freeze(word.courseRefs)}));
  counts[word.language]++;
  if(word.kind==='introduce'){newCount++;newCounts[word.language]++}
  return true;
 };
 // Divide the quota between upcoming introduction and overdue retrieval.
 // Never let one long unreviewed pack displace *all* overdue repetition.
 const targetNew=Math.min(newLimit,Math.max(0,maxTasks-(reviews.length?1:0)));
 for(const word of introduced){if(newCount>=targetNew)break;admit(word)}
 for(const word of reviews)admit(word);
 for(const word of introduced)admit(word);
 // No first introduction can appear after practice has already started.
 selected.sort((a,b)=>(a.kind==='introduce'?0:1)-(b.kind==='introduce'?0:1));
 return Object.freeze({
  mode,language,newWordsUsed:Object.freeze({...newWordsUsed}),
  sessionNewCount:newCount,remainingSessionNew:Math.max(0,newLimit-newCount),
  remainingNewByLanguage:Object.freeze({en:Math.max(0,allowed.en-newCounts.en),he:Math.max(0,allowed.he-newCounts.he)}),
  version:DAILY_PLANNER_VERSION,personId,generatedAt:now,source:mode==='qa'?'qa-content-and-isolated-history':'approved-content-and-learner-evidence',
  readOnly:true,selected:Object.freeze(selected),newCount,
  reviewCount:selected.length-newCount,languageCounts:Object.freeze(counts),
  languageNewCounts:Object.freeze(newCounts),
  rejected:Object.freeze(rejected),remainingCapacity:maxTasks-selected.length
 });
}

