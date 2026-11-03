const KEY='nomi-audio-telemetry-v1',MAX=80;
export function logAudioTelemetry(event,detail={}){
 // Parent-authorized historical walkthrough does not record taps, progress
 // OR audio playback. This is presentation-only, not evidence or diagnostics.
 if(typeof document!=='undefined'&&document.querySelector(
   '#app[data-historical-replay="true"],#app[data-owner-mirror-view="true"]'))return;
 try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');a.push({at:Date.now(),event,...detail});localStorage.setItem(KEY,JSON.stringify(a.slice(-MAX)))}catch{}}
export function readAudioTelemetry(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
export function clearAudioTelemetry(){try{localStorage.removeItem(KEY)}catch{}}
