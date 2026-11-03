import {currentWordPresentation,CORRECTED_WORD_STAGES} from './word-loop-semantics.mjs';
import {pointedHebrew} from './hebrew-presentation.mjs';
const strip=s=>String(s).normalize('NFD').replace(/[\u0591-\u05c7]/g,'');
export const NIKUD_LEVELS=Object.freeze(['full-nikud','partial-nikud','no-nikud']);
export function nikudLevelFor(history=[]){
  const graded=history.filter(x=>x.correct!==null);
  if(!graded.length)return 'full-nikud';
  const last=graded.at(-1);
  if(last.correct===false){
    const i=NIKUD_LEVELS.indexOf(last.nikudLevel||'full-nikud');
    return NIKUD_LEVELS[Math.max(0,i-1)];
  }
  const clean=graded.filter(x=>x.correct===true&&!x.usedHint);
  if(clean.length>=4)return 'no-nikud';
  if(clean.length>=2)return 'partial-nikud';
  return 'full-nikud';
}
export function presentHebrew(target,level='full-nikud'){
  const source=String(target??'').normalize('NFC');
  const pointed=/[\u0591-\u05c7]/u.test(source)?source:pointedHebrew(strip(source));
  if(level==='no-nikud')return strip(pointed);
  if(level==='full-nikud')return pointed;
  // Partial support deliberately retains the first encountered nikud mark only.
  let kept=false;
  return [...pointed.normalize('NFD')].filter(ch=>{
    if(!/[\u0591-\u05c7]/.test(ch))return true;
    if(!kept){kept=true;return true}
    return false;
  }).join('').normalize('NFC');
}
export function readingEvidenceCondition({stage,nikudLevel,correct,usedHint=false,presentation=null}){
  const verified=currentWordPresentation(stage,presentation)&&presentation.nikudLevel===nikudLevel;
  const channel=CORRECTED_WORD_STAGES.includes(stage)&&!verified?'unverified':stage==='meaning-picture'?'written-word-to-meaning':stage==='picture-word'?'meaning-to-written-word':stage==='audio-picture'?'audio-to-meaning':stage==='audio-word'?'audio-to-written-word':stage==='free-recall'?'image-to-typed-word':'other';
  const independent=correct===true&&!usedHint&&nikudLevel==='no-nikud'&&channel==='written-word-to-meaning';
  return {nikudLevel,channel,independentReadingEvidence:independent,presentation:verified?{...presentation}:null};
}
