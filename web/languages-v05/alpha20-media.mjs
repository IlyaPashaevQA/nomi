import {isAudioTextOnlyCard} from './russian-meaning-choice.mjs';
import {ALPHA20_COURSE} from './alpha20-course.mjs';
import {releasedAsset} from './asset-release-manifest.mjs';
import {ALPHA20_RUNTIME_IMAGES} from './alpha20-runtime-images.mjs';
import {CANDIDATE_ROWS} from './candidate-pilots.mjs?v=20261003-gtts1';

const vocabulary=new Map(ALPHA20_COURSE.vocabulary.map(row=>[row.target,row]));
const candidates=new Map(CANDIDATE_ROWS.map(row=>[row.target,row]));

export function alpha20Vocabulary(target){
  const row=vocabulary.get(String(target));
  if(!row)throw Error('Unknown Alpha-20 target');
  return row;
}

export function alpha20ReleasedAsset(target){
  const word=alpha20Vocabulary(target),media=releasedAsset('he',word.target);
  if(!media?.image||!media?.audio)throw Error('Alpha-20 released media unavailable for '+word.target);
  const runtime=ALPHA20_RUNTIME_IMAGES[word.target];
  if(runtime?.version!==1||runtime.source!==media.image||runtime.sourceSha256!==media.imageSha256)
    throw Error('Alpha-20 runtime image provenance mismatch for '+word.target);
  return {
    language:'he',target:word.target,display:word.display,meaning:word.meaning,
    image:runtime.src,imageKind:'released',imageSha256:runtime.sha256,imageSourceSha256:runtime.sourceSha256,
    audioSrc:media.audio,audioKind:'released',
    audioSha256:media.audioSha256||null,audioHumanQa:media.audioHumanQa||null,
  };
}

const warmedImages=new Map();
export function warmAlpha20Block(block,{mediaResolver=alpha20ReleasedAsset,ImageClass=globalThis.Image}={}){
  if(!block||!ImageClass)return Promise.resolve();
  const targets=new Set([...block.words,...block.tasks.flatMap(t=>[...t.targets,...(t.choices||[])])]);
  return Promise.all([...targets].map(target=>{
    const media=mediaResolver(target),src=media.image;
    if(!src&&isAudioTextOnlyCard(media))return Promise.resolve();
    if(!src&&media.semanticAnchor?.highlight&&media.semanticAnchor.text?.includes(media.semanticAnchor.highlight))return Promise.resolve();
    if(!src)return Promise.reject(Error('Word has no image or reviewed semantic context'));
    if(!warmedImages.has(src)){
      const image=new ImageClass();image.decoding='async';image.src=src;
      const promise=image.decode().catch(error=>{warmedImages.delete(src);throw error});
      warmedImages.set(src,promise);
    }
    return warmedImages.get(src);
  }));
}

export function alpha20CandidateAsset(target){
  const word=alpha20Vocabulary(target),row=candidates.get(word.target);
  if(!row?.image?.src||!row?.audio?.src)throw Error('Alpha-20 candidate media unavailable for '+word.target);
  return {
    language:'he',target:word.target,display:word.display,meaning:word.meaning,
    image:row.image.src,imageKind:'pilot-candidate',
    audioSrc:row.audio.src,audioKind:'pilot-candidate',
    imageSha256:row.image.sha256,audioSha256:row.audio.sha256,
  };
}

export function alpha20ReleasedCoverage(){
  const missing=[];
  for(const row of ALPHA20_COURSE.vocabulary){
    try{alpha20ReleasedAsset(row.target)}catch{missing.push(row.target)}
  }
  return {total:ALPHA20_COURSE.vocabulary.length,ready:ALPHA20_COURSE.vocabulary.length-missing.length,missing};
}
