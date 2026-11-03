// Canonical Nomi lesson frame. Both Hebrew Alpha20 and English Colours mount
// the same header, progress rail and bounded stage; task content is pluggable.
// This module never reads or writes a learner event or starts a timer.
const boundedPositive=(value,fallback)=>Number.isInteger(value)&&value>0?value:fallback;

export function createNomiLessonShell(host,{
 language='he',sectionTitle='',sectionIndex=1,sectionTotal=1,
 taskIndex=1,taskTotal=1,mechanic='',onExit=()=>{},
}={}){
 if(!host||typeof host.replaceChildren!=='function')throw Error('Nomi lesson host required');
 const lang=language==='en'?'en':'he',total=boundedPositive(taskTotal,1);
 const index=Math.min(total,boundedPositive(taskIndex,1));
 const sectionCount=boundedPositive(sectionTotal,1);
 const section=Math.min(sectionCount,boundedPositive(sectionIndex,1));

 host.replaceChildren();
 host.className='alpha20-lesson-host nomi-v2 nomi-v2-autumn';
 host.lang=lang;
 host.dir=lang==='he'?'rtl':'ltr';

 const root=document.createElement('div');
 root.className='task-shell narrow alpha20-shell';
 root.dir=host.dir;
 root.dataset.language=lang;
 root.dataset.mechanic=String(mechanic);
 root.innerHTML='<div class="task-top"><button type="button" class="quiet" id="alpha20-exit">×</button>'+
   '<strong data-lesson-section></strong>'+
   '<div class="alpha20-task-count" dir="ltr"></div></div>'+
   '<div class="alpha20-progress"><i></i></div>'+
   '<div id="alpha20-stage"></div>';
 const label=root.querySelector('[data-lesson-section]');
 label.textContent=String(sectionTitle)+' · '+section+'/'+sectionCount;
 const count=root.querySelector('.alpha20-task-count');
 count.textContent=index+' / '+total;
 const progress=root.querySelector('.alpha20-progress');
 progress.setAttribute('role','progressbar');
 progress.setAttribute('aria-label',lang==='en'?'Lesson progress':'התקדמות בשיעור');
 progress.setAttribute('aria-valuemin','0');
 progress.setAttribute('aria-valuemax',String(total));
 progress.setAttribute('aria-valuenow',String(index-1));
 root.querySelector('.alpha20-progress i').style.setProperty('--p',
   Math.round((index-1)/total*100)+'%');
 const exit=root.querySelector('#alpha20-exit');
 exit.setAttribute('aria-label',lang==='en'?'Leave lesson':'לצאת מהשיעור');
 exit.onclick=onExit;
 const stage=root.querySelector('#alpha20-stage');
 stage.dataset.mechanicViewport='true';
 stage.dataset.layoutPolicy='responsive';
 host.append(root);
 return {root,stage,progress,exit,taskIndex:index,taskTotal:total};
}
