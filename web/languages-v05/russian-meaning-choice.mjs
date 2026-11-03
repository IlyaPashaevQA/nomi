const SHA256=/^[a-f0-9]{64}$/;

function validAudio(sourceAudio){
  return !!sourceAudio&&typeof sourceAudio.src==='string'&&sourceAudio.src.length>0&&
    SHA256.test(sourceAudio.sha256||'')&&typeof sourceAudio.version==='string'&&sourceAudio.version.length>0;
}

export function buildRussianMeaningChoiceTask({id,target,meaningRu,sourceAudio,choices}){
  if(typeof id!=='string'||!id||typeof target!=='string'||!target)throw new Error('Russian meaning task needs id and target');
  if(typeof meaningRu!=='string'||!meaningRu.trim())throw new Error('Russian meaning task needs meaningRu');
  if(!Array.isArray(choices)||choices.length!==4||new Set(choices).size!==4||!choices.includes(target)){
    throw new Error('Russian meaning task needs exactly four distinct choices including target');
  }
  if(sourceAudio!==null&&!validAudio(sourceAudio))throw new Error('Russian meaning audio needs src, sha256 and version');
  return Object.freeze({
    id,target,meaningRu,mechanic:'ru-meaning-word',choices:Object.freeze([...choices]),
    prompt:Object.freeze({language:'ru',text:'',audio:sourceAudio?Object.freeze({...sourceAudio}):null}),
  });
}

export function evaluateRussianMeaningChoice(task,{selected,audioCompleted}){
  if(!task?.prompt?.audio||audioCompleted!==true){
    return {status:'technical-unavailable',reason:'ru-audio-unavailable',recordLearnerResult:false};
  }
  return {status:'answered',correct:selected===task.target,recordLearnerResult:true};
}

export function meaningDirectionEvidence({target,correct,audio}){
  if(!validAudio(audio))throw new Error('Meaning-direction evidence requires bound Russian audio');
  return {
    channel:'spoken-ru-meaning-to-written-he',target,correct:correct===true,
    source:{src:audio.src,sha256:audio.sha256,version:audio.version},priorStatus:'unknown',
  };
}

export function pictureChoiceAllowed(source,override){
  if(!override||override.imageChoiceSafe!==false)return true;
  const exact=source?.target===override.target&&source?.sourceId===override.sourceId&&
    source?.sourceSha256===override.sourceSha256;
  return !exact;
}

export function isAudioTextOnlyCard(w){
 return w?.mediaPolicy==='audio-text-only-v1'&&w.teachingMode==='audio-first-text-choice'&&w.imageChoiceSafe===false&&w.requiredTranslationAudio===true&&
  typeof w.meaningRu==='string'&&!!w.meaningRu.trim()&&!!w.audioSrc&&!!w.translation?.audioSrc&&
  w.russianMeaningAudio?.status==='ready'&&!!w.russianMeaningAudio.src&&/^[a-f0-9]{64}$/.test(w.russianMeaningAudio.sha256||'')&&!!w.russianMeaningAudio.version;
}
