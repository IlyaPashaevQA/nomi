// Versioned UI conditions, not a claim of mastery or production evidence.
export const WORD_CAPTURE_PRESENTATION_REVISION='word-stage-presentation-20261001-v1';
export const WORD_PRESENTATION_VERSION='lesson1-reading-recall-20261001-v1';
export const CORRECTED_WORD_STAGES=Object.freeze(['meaning-picture','free-recall']);

export function wordStagePresentation(stage,{nikudLevel='full-nikud',mediaReady=true}={}){
 if(!CORRECTED_WORD_STAGES.includes(stage))return null;
 return Object.freeze({version:WORD_PRESENTATION_VERSION,stage,nikudLevel,
  stimulusKind:stage==='meaning-picture'?'written-word':'image',
  responseKind:stage==='meaning-picture'?'image-choice':'typed',
  targetTextShown:stage==='meaning-picture',letterBankShown:false,
  promptAudioPlayed:false,mediaReady:mediaReady===true});
}

export function currentWordPresentation(stage,presentation){
 if(!presentation||presentation.version!==WORD_PRESENTATION_VERSION||presentation.stage!==stage)return false;
 const expected=wordStagePresentation(stage,{nikudLevel:presentation.nikudLevel});
 return !!expected&&['stimulusKind','responseKind','targetTextShown','letterBankShown','promptAudioPlayed','mediaReady'].every(k=>presentation[k]===expected[k]);
}

export function usableWordTeachingRecord(record){
 if(!CORRECTED_WORD_STAGES.includes(record.stage))return true;
 const condition=record.evidenceCondition;
 return currentWordPresentation(record.stage,condition?.presentation)&&condition.nikudLevel===condition.presentation.nikudLevel;
}

export function normalizeWordResponse(value,language='he'){
 if(typeof value!=='string')return '';
 const text=value.normalize('NFD').replace(/[\u0591-\u05c7]/g,'').normalize('NFC').trim();
 return language==='he'?text:text.toLowerCase();
}

export function gradeWordRecall(value,{target,language='he',acceptedAnswers=[]}){
 if(typeof value!=='string'||value.length>80)return {accepted:false,correct:null};
 const answer=normalizeWordResponse(value,language);
 if(!answer)return {accepted:false,correct:null};
 // Alternate spellings are explicit content, never fuzzy edit-distance matches.
 const correct=[target,...acceptedAnswers].some(x=>normalizeWordResponse(x,language)===answer);
 return {accepted:true,correct};
}

// Eight lesson targets do not require eight simultaneous answer targets.
// Keep the existing four-position orbit; order is repeatable on refresh.
export function wordChoiceCompatible(a,b){
 const cohort=a.choiceCohort||b.choiceCohort;
 return !cohort||a.choiceCohort===b.choiceCohort;
}

export function selectWordChoices(asset,choices,trialIndex=0){
 const identity=x=>x.choiceKey||normalizeWordResponse(x.target,asset.language);
 const unique=new Map(choices.filter(x=>wordChoiceCompatible(asset,x)).map(x=>[identity(x),x]));
 const key=identity(asset);unique.delete(key);
 let state=2166136261;
 for(const ch of key+':'+trialIndex)state=Math.imul(state^ch.charCodeAt(0),16777619)>>>0;
 const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out};
 const selected=shuffle([asset,...shuffle([...unique.values()]).slice(0,3)]);
 if(selected.length<2)throw Error('A word choice requires a target and a distractor');
 return selected;
}
