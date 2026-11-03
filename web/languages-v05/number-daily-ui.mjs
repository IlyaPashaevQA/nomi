import {mountSchoolWrittenInput} from './school-written-input.mjs';
import {numberFormAnswer} from './hebrew-number-forms.mjs';
const el=(tag,text)=>{const x=document.createElement(tag);if(text)x.textContent=text;return x};
export function mountNumberDailyTask(host,{task,onAnswer=()=>{},onChange=()=>{},initialValue='',helpUsed=false,correction=false}={}){
 const form=task?.wordForm;if(!form)throw Error('Missing checked number form');
 // Validate the exact authored form before rendering any target.
 numberFormAnswer(task,form.to,{helpUsed});
 if(!document.getElementById('nomi-number-daily-css')){
  const css=el('style');css.id='nomi-number-daily-css';
  css.textContent='#alpha20-stage.nomi-number-daily{display:block!important;overflow-y:auto!important;overscroll-behavior:contain;padding:12px!important;height:100%;min-height:0;color:#fff7fc}.nomi-number-daily section{display:grid;place-items:center;gap:10px;width:min(100%,570px);margin:0 auto;padding-bottom:24px;box-sizing:border-box}.nomi-number-daily h2{font:700 clamp(20px,3vw,29px)/1.4 system-ui;text-align:center;margin:4px}.nomi-number-stimulus{font:700 clamp(36px,6vw,58px)/1.5 system-ui;margin:0}.nomi-number-model{font:700 clamp(24px,4vw,34px)/1.6 system-ui;text-align:center;border:2px solid #d8c0ef;border-radius:16px;padding:8px 16px;margin:0}.nomi-number-daily form{display:grid;gap:8px;width:100%}.nomi-number-daily label{text-align:center;font-size:20px}.nomi-number-daily .school-input{width:100%;box-sizing:border-box;font-size:30px;min-height:54px;text-align:center}.nomi-number-daily button{min-height:48px;font-size:22px}.nomi-number-daily [role=status]{text-align:center}';
  document.head.append(css);
 }
 let disposed=false,submitted=false,control=null;
 host.className='nomi-number-daily';host.dir='rtl';host.lang='he';
 host.dataset.numberStage=correction?'correction':task.numberSupport?.stage||'check';
 const section=el('section');host.replaceChildren(section);
 section.append(el('h2',correction?'נִלְמַד אֶת הַצוּרוֹת':form.direction==='to-plural'?'כִּתְבִי אֶת צוּרַת הָרַבִּים.':'כִּתְבִי אֶת צוּרַת הַיָּחִיד.'));
 const source=el('p',form.fromPointed);source.className='nomi-number-stimulus';section.append(source);
 if(correction||task.numberSupport?.stage==='guided'){
  const model=el('p',form.fromPointed+' ← '+form.toPointed);model.className='nomi-number-model';
  section.append(model);
  const typed=el('p','כָּךְ כּוֹתְבִים בַּמִּקְלֶדֶת: '+form.to);
  typed.className='nomi-number-input-model';typed.style.cssText='font-size:24px;text-align:center;margin:0';
  section.append(typed);
  if(!correction)section.append(el('p','הֵעָזְרִי בַּדֻּגְמָה וְכִתְבִי אֶת הַתְּשׁוּבָה.'));
 }
 const status=el('p');status.setAttribute('role','status');
 if(!correction){
  control=mountSchoolWrittenInput(section,{initialValue,onChange,onSubmit:async value=>{
   if(disposed||submitted)return;submitted=true;
   try{status.textContent='שׁוֹמְרִים…';await onAnswer(numberFormAnswer(task,value,{helpUsed}))}
   catch{if(!disposed){submitted=false;status.textContent='הַשְּׁמִירָה לֹא הוּשְׁלְמָה. נַסּוּ שׁוּב.'}}
  }});
  if(!section.querySelector('input')||!section.querySelector('button'))throw Error('Incomplete number task');
 }
 section.append(status);
 return {destroy(){disposed=true;control?.destroy?.()}};
}
