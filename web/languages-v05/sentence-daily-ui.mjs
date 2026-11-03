import {mountBubbleConstructor} from './bubble-constructor-ui.mjs';
import {SENTENCE_POOL,isScheduledSentenceTask,sentenceAnswer} from './sentence-daily.mjs';
const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e};
export function mountSentenceDailyTask(host,{task,onAnswer=()=>{},onChange=()=>{},initialTokens=[],helpUsed=false,correction=false}={}){
 if(!isScheduledSentenceTask(task))throw Error('Unreleased sentence surface');
 const s=SENTENCE_POOL.find(s=>s.id===task.sentenceTask.sentenceId);
 if(!document.getElementById('nomi-daily-sentence-css')){
  const css=el('style');css.id='nomi-daily-sentence-css';
  css.textContent='#alpha20-stage.nomi-daily-sentence{display:flex!important;flex-direction:column;min-height:0;height:100%;max-height:100%;padding:8px!important;overflow:hidden}.nomi-daily-sentence h2{font:700 clamp(20px,3vw,30px)/1.45 system-ui;text-align:center;margin:4px;color:#fff7fc}.nomi-daily-sentence-work{flex:1;min-height:0;width:100%;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.nomi-daily-sentence .bubble-constructor{height:100%;min-height:280px}.nomi-daily-sentence .constructor-token{font-size:clamp(21px,3vw,32px);min-height:48px}.nomi-daily-sentence .constructor-nomi-anchor{display:none}.nomi-daily-sentence [role=status]{text-align:center;margin:4px;color:#fff7fc}.nomi-daily-sentence-model{font:700 clamp(26px,4vw,40px)/1.8 system-ui;text-align:center;color:#fff7fc;margin:auto}';
  document.head.append(css);
 }
 let disposed=false,submitted=false,builder=null;
 host.className='nomi-daily-sentence';host.dir='rtl';host.lang='he';host.dataset.sentenceId=s.id;
 const heading=el('h2',correction?'הַמִּשְׁפָּט הַנָּכוֹן':'סַדְּרִי אֶת הַמִּלִּים לְמִשְׁפָּט.');
 const work=el('div');work.className='nomi-daily-sentence-work';
 const status=el('p');status.setAttribute('role','status');
 host.replaceChildren(heading,work,status);
 if(correction){
  const model=el('p',s.words.join(' '));model.className='nomi-daily-sentence-model';work.append(model);
 }else{
  builder=mountBubbleConstructor(work,{mode:'sentence',expected:s.words,language:'he',
   presentation:'literal',distractors:[],initialTokens,onChange,
   onResult:async r=>{
    if(disposed||submitted)return;submitted=true;
    try{const answer=sentenceAnswer(task,r.tokens,{helpUsed});status.textContent='שׁוֹמְרִים…';await onAnswer(answer)}
    catch{if(!disposed){submitted=false;status.textContent='הַשְּׁמִירָה לֹא הוּשְׁלְמָה. נַסּוּ שׁוּב.'}}
   }});
  if(!work.querySelector('.bubble-constructor')||work.querySelectorAll('button').length<3)throw Error('Incomplete sentence surface');
 }
 return {destroy(){disposed=true;builder?.destroy?.()}};
}
