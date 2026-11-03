// Learning-object scheduler primitives. No mastery claims; assistance is explicit.
const strip=s=>String(s).normalize('NFD').replace(/[\u0591-\u05c7]/g,'').toLowerCase();
export const BUILD_LEVELS=Object.freeze(['guided','shuffled','distractors','blind-length']);
export function learningObjectId(language,target){if(!['he','ru','en'].includes(language)||!target)throw Error('Invalid learning object');return 'lexeme:'+language+':'+strip(target)}
export function wordBuildPlan({language,target,level='guided',distractors=[]}){if(!BUILD_LEVELS.includes(level))throw Error('Unknown build level');const letters=[...strip(target).replace(/\s/g,'')];if(!letters.length)throw Error('Empty target');const bank=[...letters,...(['distractors','blind-length'].includes(level)?distractors:[])];return {family:'word-build',learningObjectId:learningObjectId(language,target),language,target,level,visibleLength:false,slots:null,bank,assistance:{modelShown:false,hints:0,letterBank:true,lengthShown:false},demand:['distractors','blind-length'].includes(level)?'selective-recall':'supported-recall'}}
export function nextBuildLevel(history=[]){if(!history.length)return 'guided';const last=history.at(-1);const i=BUILD_LEVELS.indexOf(last.level);if(i<0)throw Error('Unknown history level');if(last.correct&&!last.usedHint)return BUILD_LEVELS[Math.min(BUILD_LEVELS.length-1,i+1)];if(!last.correct)return BUILD_LEVELS[Math.max(0,i-1)];return last.level}
export function wordLearningStages(){return ['introduce','meaning-picture','audio-picture','picture-word','audio-word','word-build']}
// Historical teaching history is append-only. Retired interaction families stay
// readable even after they are removed from the active route/catalog.
export function wordLearningRecordStages(){return [...wordLearningStages(),'free-recall']}
export function nextWordInteraction(objectHistory=[]){if(!objectHistory.length)return 'introduce';const stages=wordLearningStages(),seen=new Set(objectHistory.map(x=>x.stage));for(const s of stages.slice(1))if(!seen.has(s))return s;const weak=[...objectHistory].reverse().find(x=>x.correct===false&&!objectHistory.slice(objectHistory.indexOf(x)+1).some(y=>y.stage===x.stage&&y.correct===true));return weak?.stage||'word-build'}

export function introductionNeeded(language,target,events=[]){const id=learningObjectId(language,target);return !events.some(e=>e?.payload?.learningObjectId===id&&e?.payload?.learningStage==='introduce')}
export function teachingInteraction({language,target,stage,correct=null,buildLevel=null,usedHint=false}){if(!wordLearningStages().includes(stage))throw Error('Unknown learning stage');return {learningObjectId:learningObjectId(language,target),learningStage:stage,correct,buildLevel,usedHint,teachingOnly:true}}
export function chooseWordBuild(language,target,history=[],distractors=[]){const own=history.filter(x=>x.learningObjectId===learningObjectId(language,target)&&x.stage==='word-build'&&x.buildLevel);const level=nextBuildLevel(own.map(x=>({level:x.buildLevel,correct:x.correct,usedHint:x.usedHint})));return wordBuildPlan({language,target,level,distractors})}

export function wordNeedsReview(history=[]){const by=new Map;for(const x of history)if(x.correct!==null)by.set(x.stage,x.correct);return [...by.entries()].filter(([,ok])=>ok===false).map(([stage])=>stage)}

export function availableWordLearningStages({hasAudio=false}={}){return wordLearningStages().filter(x=>hasAudio||!['audio-picture','audio-word'].includes(x))}
