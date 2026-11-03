import {logAudioTelemetry} from './audio-telemetry.mjs';
import {speakInstruction} from './instruction-audio.mjs';import {releasedAsset} from './asset-release-manifest.mjs';
let sharedAudio=null,activeLearnerStop=null;
function mediaElement(){if(!sharedAudio){sharedAudio=new Audio();sharedAudio.preload='auto';sharedAudio.setAttribute('playsinline','');}return sharedAudio}
export function learnerAudioSource(language,target){const r=releasedAsset(language,target);return r&&r.audio?{src:r.audio,kind:'released-audio'}:{src:null,kind:'tts-fallback'}}
export function isLearnerAudioActive(){return activeLearnerStop!==null}
export function playLearnerAudio({src=null,text,language,onStart,onEnd,onError,isActive=()=>true}={}){
 activeLearnerStop?.();
 let stopped=false,fallback=null,fallbackStarted=false,started=false,ended=false,failed=false,stop=()=>{};
 const active=()=>!stopped&&isActive();
 const state={get started(){return started},get ended(){return ended},get failed(){return failed},get completed(){return started&&ended&&!failed}};
 const release=()=>{if(activeLearnerStop===stop)activeLearnerStop=null};
 const speech=()=>{if(!active()||fallbackStarted)return;fallbackStarted=true;failed=true;onError?.('fallback');logAudioTelemetry('fallback',{language,text});fallback=speakInstruction(text,{language,onStart,onEnd:()=>{release();onEnd?.()},isActive:active});return fallback};
 const released=src?{src}:learnerAudioSource(language,text);
 if(released.src&&active()){
  try{
   const a=mediaElement();a.pause();logAudioTelemetry('request',{language,text,src:released.src});a.onplay=null;a.onended=null;a.onerror=null;if(a.src!==new URL(released.src,location.href).href||a.error)a.src=released.src;a.currentTime=0;
   stop=()=>{stopped=true;a.onplay=null;a.onended=null;a.onerror=null;a.pause();fallback?.stop?.();release()};activeLearnerStop=stop;
   a.onplay=()=>{started=true;logAudioTelemetry('playing',{language,text});if(active())onStart?.();else stop()};a.onended=()=>{ended=true;logAudioTelemetry('ended',{language,text});release();if(active())onEnd?.()};a.onerror=()=>{failed=true;logAudioTelemetry('error',{language,text,code:a.error?.code||null});speech()};
   const p=a.play();p?.catch?.(e=>{logAudioTelemetry('rejected',{language,text,name:e?.name||'',message:e?.message||''});speech()});
   return {status:'media-requested',kind:'audio-asset',audio:a,state,stop};
  }catch{}
 }
 stop=()=>{stopped=true;fallback?.stop?.();release()};activeLearnerStop=stop;
 const result=speech()||{status:'unavailable'};if(result.status==='unavailable')release();
 return {...result,kind:'tts-fallback',state,stop};
}

export function hasReleasedLearnerAudio(language,target){return !!learnerAudioSource(language,target).src}
