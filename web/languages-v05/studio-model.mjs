// Studio drafts are not lesson content, learner history, or published profiles.
export const STUDIO_VERSION=2;
export const STUDIO_KEY='learning-club-mechanics-studio-v2';
export const BUCKETS=['phone-compact','phone-regular','tablet-portrait','tablet-landscape'];
export const STAGES=Object.freeze({intro:'introduce','meaning-picture':'meaning-picture','audio-word':'audio-word','audio-picture':'audio-picture','picture-word':'picture-word',constructor:'word-build'});
export const FONTS=Object.freeze({inherit:'Как в приложении',system:'Системный',georgia:'Georgia',arial:'Arial',gveret:'Gveret Levin',playpen:'Playpen Hebrew',solitreo:'Solitreo'});
export const FONT_CSS=Object.freeze({system:'system-ui, -apple-system, sans-serif',georgia:'Georgia, serif',arial:'Arial, sans-serif',gveret:'"Gveret Levin", sans-serif',playpen:'"Playpen Hebrew", sans-serif',solitreo:'Solitreo, sans-serif'});
export const bucketFor=(w,h)=>w<=390?'phone-compact':w<700?'phone-regular':w>h?'tablet-landscape':'tablet-portrait';
export const scopeFor=(id,source,bucket)=>[id,source,bucket].join('|');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const key=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,49}$/.test(x);
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const ranges={x:[-2000,2000],y:[-2000,2000],width:[1,2400],height:[1,2400],fontSize:[8,360],lineHeight:[.7,3],radius:[0,999]};
function assert(value,msg){if(!value)throw Error(msg)}
export function validateDraft(d){
 assert(object(d)&&d.version===STUDIO_VERSION&&key(d.mechanic)&&BUCKETS.includes(d.bucket)&&['museum','lesson'].includes(d.source),'Неверный формат черновика');
 assert(['midnight','garden'].includes(d.theme),'Неизвестная тема');
 assert(object(d.knobs)&&['prompt','answer','center','bubble'].every(k=>finite(d.knobs[k],20,1000)),'Неверные настройки Музея');
 assert(object(d.styles)&&Object.keys(d.styles).length<=100&&object(d.copy)&&Object.keys(d.copy).length<=100,'Неверные элементы');
 for(const [id,row] of Object.entries(d.styles)){
  assert(key(id)&&object(row),'Неверный элемент');
  for(const [k,v] of Object.entries(row)){
   if(k in ranges)assert(finite(v,...ranges[k]),'Параметр вне диапазона: '+k);
   else if(k==='font')assert(Object.hasOwn(FONTS,v),'Неизвестный шрифт');
   else if(k==='align')assert(['start','center','end'].includes(v),'Неверное выравнивание');
   else if(k==='weight')assert([400,500,600,700,800,900].includes(v),'Неверная насыщенность');
   else throw Error('Неизвестный параметр: '+k);
  }
 }
 for(const [id,text] of Object.entries(d.copy))assert(key(id)&&typeof text==='string'&&text.length<=1000,'Неверный текст');
 return d;
}
export function readMuseumSettings(id,storage=globalThis.localStorage){
 const read=k=>{const raw=storage.getItem(k);if(raw===null)return null;let v;try{v=JSON.parse(raw)}catch{throw Error('Повреждены настройки Музея: '+id)}if(!object(v))throw Error('Повреждены настройки Музея: '+id);return v};
 if(!storage)throw Error('Хранилище недоступно');
 const type=read('nomi:mechanic-type:'+id),size=read('nomi:mechanic-size:'+id);
 const n=(x)=>x===undefined?100:finite(x,20,1000)?x:(()=>{throw Error('Неверный размер в Музее')})();
 return {knobs:{prompt:n(type?.prompt),answer:n(type?.answer),center:n(size?.center),bubble:n(size?.bubble)},found:type!==null||size!==null};
}
export function newDraft(id,source,bucket,museum={knobs:{prompt:100,answer:100,center:100,bubble:100}}){return validateDraft({version:STUDIO_VERSION,mechanic:id,source,bucket,theme:'midnight',knobs:{...museum.knobs},styles:{},copy:{}})}
export function openStudioStore(storage=globalThis.localStorage){
 let baseline,loaded=false,state='unknown';
 function load(){
  let raw;try{if(!storage)throw Error();raw=storage.getItem(STUDIO_KEY)}catch{state='unavailable';throw Error('Черновики недоступны. Сохранение отключено.')}
  let value;try{value=raw===null?{version:STUDIO_VERSION,drafts:{}}:JSON.parse(raw);assert(object(value)&&value.version===STUDIO_VERSION&&object(value.drafts),'Старый или повреждённый формат');
   assert(Object.keys(value.drafts).length<=200,'Слишком много черновиков');
   for(const [scope,d] of Object.entries(value.drafts)){validateDraft(d);assert(scope===scopeFor(d.mechanic,d.source,d.bucket),'Неверная область черновика')}
  }catch(e){state='corrupt';throw Error('Черновики повреждены; они сохранены без изменений. '+e.message)}
  baseline=raw;loaded=true;state=raw===null?'empty':'valid';return structuredClone(value);
 }
 function save(value){
  assert(loaded&&state!=='corrupt'&&state!=='unavailable','Сначала прочитайте существующие черновики');
  for(const [scope,d] of Object.entries(value.drafts)){validateDraft(d);assert(scope===scopeFor(d.mechanic,d.source,d.bucket),'Неверная область черновика')}
  let current;try{current=storage.getItem(STUDIO_KEY)}catch{state='unavailable';throw Error('Хранилище недоступно')}
  assert(current===baseline,'Черновики изменены в другой вкладке. Экспортируйте свои правки и обновите страницу.');
  const raw=JSON.stringify(value);try{storage.setItem(STUDIO_KEY,raw)}catch{throw Error('Не удалось сохранить. Экспортируйте свои правки.')}
  baseline=raw;state='valid';return value;
 }
 return {load,save,get state(){return state}};
}
export function exportPreset(d){validateDraft(d);return JSON.stringify({kind:'learning-club-studio-preset-v2',draft:d},null,2)}
export function importPreset(raw){assert(typeof raw==='string'&&raw.length<=100000,'Файл слишком велик');const x=JSON.parse(raw);assert(x.kind==='learning-club-studio-preset-v2','Это не файл настроек Studio');return structuredClone(validateDraft(x.draft))}
