// Reuse the ONE two-answer selection UI across school page practice
// and scheduled Karmel reading. This is a control, never a course engine.
export function mountTwoChoice(host,{options,onSubmit}={}){
 if(!host||!Array.isArray(options)||options.length<3||typeof onSubmit!=='function')
  throw Error('Two-choice requires reviewed options and submit callback');
 let destroyed=false,submitted=false;
 const selected=new Set(),choices=document.createElement('div');
 choices.className='karmel-page15-two';
 const submit=document.createElement('button');submit.className='karmel-page15-submit';
 submit.type='button';submit.textContent='בְּדִיקָה';submit.disabled=true;
 options.forEach((text,i)=>{
  const b=document.createElement('button');b.type='button';b.className='karmel-page15-choice';
  b.textContent=text;b.setAttribute('aria-pressed','false');
  b.onclick=()=>{
   if(destroyed||submitted)return;
   if(selected.has(i))selected.delete(i);
   else if(selected.size<2)selected.add(i);
   b.setAttribute('aria-pressed',String(selected.has(i)));
   submit.disabled=selected.size!==2;
  };
  choices.append(b);
 });
 submit.onclick=()=>{
  if(destroyed||submitted||selected.size!==2)return;
  submitted=true;submit.disabled=true;onSubmit([...selected].sort((a,b)=>a-b));
 };
 host.append(choices,submit);
 return {destroy(){destroyed=true;submit.onclick=null;choices.replaceChildren()},
  get selection(){return [...selected].sort((a,b)=>a-b)}};
}
