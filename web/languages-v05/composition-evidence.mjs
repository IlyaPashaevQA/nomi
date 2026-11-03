// Evidence adapter for the EXISTING bubble constructor, not a new mechanic.
// Word, phrase and sentence composition reuse mechanic='constructor' and
// declare the assessed skill through task metadata. No microphone required.
export const COMPOSITION_EVIDENCE_VERSION='composition-evidence-v1';
export const COMPOSITION_SKILL='written-word-order';
export function normalizedCompositionToken(value){
 return String(value??'').normalize('NFD').replace(/[\u0591-\u05c7]/g,'').replace(/\s+/g,' ').trim();
}
export function compositionGrade(expected,actual){
 if(!Array.isArray(expected)||!Array.isArray(actual)||!expected.length)throw Error('Composition requires ordered tokens');
 return expected.length===actual.length&&expected.every((token,i)=>normalizedCompositionToken(token)===normalizedCompositionToken(actual[i]));
}
export function compositionObservation({expected,answerTokens,helpUsed=false,corrected=false,shownModel=false}={}){
 if(typeof helpUsed!=='boolean'||typeof corrected!=='boolean'||typeof shownModel!=='boolean')throw Error('Invalid composition assistance');
 const correct=compositionGrade(expected,answerTokens);
 const assisted=helpUsed||corrected||shownModel;
 return {evidenceVersion:COMPOSITION_EVIDENCE_VERSION,mode:'sentence',skill:COMPOSITION_SKILL,
  correct,assisted,independentWrittenOrder:correct&&!assisted,
  helpUsed,corrected,shownModel,answerTokens:[...answerTokens]};
}
