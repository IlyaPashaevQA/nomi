const TEXT_BUBBLE_SELECTOR=[
  '.orbit-answer:not(.orbit-image)',
  '.orbit-stimulus-word',
  '.bubble-word',
  '.focus-option',
  '.luni-option:not(.luni-option-image)',
  '.constructor-token',
  '.constructor-answer-bubble',
  '.build-bubble',
  '.answer-bubble',
  '.luni-token'
].join(',');

export function classifyLearningBubbleText(text,{force=null}={}){
  if(force==='atom'||force==='phrase')return force;
  const clean=String(text??'').trim().replace(/\s+/g,' ');
  if(!clean)return null;
  return clean.split(' ').length===1?'atom':'phrase';
}

export function markLearningBubble(el,{force=null}={}){
  if(!el||el.querySelector?.('img'))return el;
  const kind=classifyLearningBubbleText(el.textContent,{force});
  if(!kind)return el;
  el.dataset.learningBubbleText=kind;
  el.classList.toggle('learning-bubble-atom',kind==='atom');
  el.classList.toggle('learning-bubble-phrase',kind==='phrase');
  return el;
}

export function applyLearningBubbleContract(root=document){
  for(const el of root.querySelectorAll(TEXT_BUBBLE_SELECTOR))markLearningBubble(el);
  return root;
}
