// Version-bound content references only. Presentation and selection are shared.
const freezeDeep=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freezeDeep);Object.freeze(x)}return x};
export const SAFA_CONTEXT=Object.freeze({version:'portfolio-no-reading-v1',tasks:[],phrases:[],source:[],sentences:[],readyVersion:'unavailable',legacyVersion:'unavailable'});
export const SAFA_CONTEXT_REF='reading:safa-cave-v1';
export const safaContextTask=id=>SAFA_CONTEXT.tasks.find(q=>q.id===id)||null;
export const safaContextMechanic=q=>q.kind==='card'?'discussion':q.kind==='word'?q.stage:['phrase','letters','sentence','sequence','number'].includes(q.kind)?'constructor':'focus-choice';
export function gradeSafaContext(q,value){
 if(!q)throw Error('Unknown Safa task');
 if(q.kind==='card'){if(value!=='viewed')throw Error('Invalid card response');return null}
 if(['phrase','sentence','sequence'].includes(q.kind)){
  if(!Array.isArray(value)||value.length!==q.expected.length||value.some(x=>typeof x!=='string')||new Set(value).size!==value.length||value.some(x=>!q.expected.includes(x)))throw Error('Invalid ordered response');
  return value.every((x,i)=>x===q.expected[i]);
 }
 if(['letters','number'].includes(q.kind)){
  if(typeof value!=='string'||!value.trim()||value.length>200)throw Error('Invalid written response');
  const normalized=x=>q.kind==='number'?x.replace(/[־-]/g,' ').normalize('NFD').replace(/[\u0591-\u05c7]/g,'').trim():x.normalize('NFC');
  return normalized(value)===normalized(q.expected);
 }
 if(typeof value!=='string'||!q.choices.includes(value))throw Error('Invalid choice');return value===q.answer;
}
