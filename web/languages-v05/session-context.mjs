const VERSION='languages-session-context-v1';
const PEOPLE=new Set(['ilia','anya','dasha']);
const MODES=new Set(['learner','qa','parent']);

export function validateLanguagesSessionContext(value){
  if(!value||value.version!==VERSION||!PEOPLE.has(value.personId)||!MODES.has(value.mode)||
    !Array.isArray(value.capabilities)||!Array.isArray(value.allowedSubjectScopes)||
    !Array.isArray(value.allowedAppScopes)||!Array.isArray(value.allowedCourseScopes)||
    typeof value.authorizationRevision!=='string'||typeof value.sessionId!=='string'||typeof value.sessionToken!=='string')throw Error('Invalid Languages session context');
  if(value.mode==='learner'&&(!value.capabilities.includes('learner:write')||!value.allowedSubjectScopes.includes(value.personId)))throw Error('Invalid learner capability');
  if(value.mode==='qa'&&value.capabilities.some(x=>x.startsWith('learner:')))throw Error('QA cannot carry learner capability');
  return Object.freeze(JSON.parse(JSON.stringify(value)));
}

export function languagesSessionContext(){
  return validateLanguagesSessionContext(globalThis.__LANGUAGES_SESSION_CONTEXT__);
}

export function optionalLanguagesSessionContext(){
  return globalThis.__LANGUAGES_SESSION_CONTEXT__?languagesSessionContext():null;
}

export function requireLanguagesCapability(capability,mode){
  const context=languagesSessionContext();
  if(!context.capabilities.includes(capability)||(mode&&context.mode!==mode))throw Error('Languages capability denied');
  return context;
}

/** Same educational QA rights for both parents. No learner or publish capability. */
export function isFamilyContentQaContext(value=globalThis.__LANGUAGES_SESSION_CONTEXT__){
 return !!value&&['ilia','anya'].includes(value.personId)&&
  value.mode==='qa'&&Array.isArray(value.capabilities)&&
  value.capabilities.includes('qa:render')&&
  !value.capabilities.some(x=>x.startsWith('learner:'));
}
