// Task 2 only: no imports from, or writes to, the production v0.4 application.
export const SCHEMA_VERSION = 2;
export const IDB_VERSION = 1;
export const REDUCER_VERSION = 'evidence-rule-v2';
export const PROTOCOL_VERSION = 'assessment-rule-v1';
export const key = (...parts) => canonical(parts);
export function invariant(ok, message) { if (!ok) throw new Error(message); }
export function id(value) {
  invariant(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(value), 'Invalid ID');
  return value;
}
export function exact(object, fields) {
  invariant(object && Object.getPrototypeOf(object) === Object.prototype, 'Expected plain object');
  invariant(Object.keys(object).every(k => fields.includes(k)), 'Unsupported field');
}
export function oneOf(value, values) { invariant(values.includes(value), `Unsupported value: ${value}`); }
export function integer(n, min = 0) { invariant(Number.isSafeInteger(n) && n >= min, 'Invalid integer'); }
export function ref(value) { exact(value, ['id', 'version']); id(value.id); id(value.version); return value; }
export function scope(value) { id(value.learnerId); id(value.courseId); return value; }
export function sameScope(a, b) { return a.learnerId === b.learnerId && a.courseId === b.courseId; }
export function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  invariant(value !== undefined && (typeof value !== 'number' || Number.isFinite(value)), 'Non-JSON value');
  return JSON.stringify(value);
}

// Immutable version registry rejects accidental edits under an existing reference.
export function createRegistry(values = []) {
  const entries = new Map();
  function add(value) {
    ref(value.ref);
    const k = key(value.ref.id, value.ref.version), prior = entries.get(k);
    invariant(!prior || canonical(prior) === canonical(value), 'Immutable version conflict');
    entries.set(k, freeze(structuredClone(value)));
  }
  values.forEach(add);
  return { add, resolve: reference => {
    ref(reference);
    const value = entries.get(key(reference.id, reference.version));
    invariant(value, 'Unresolved version'); return value;
  } };
}

export function validateLearner(v) {
  exact(v, ['learnerId', 'displayName', 'mode', 'timezone', 'preferences', 'consentRevisions']);
  id(v.learnerId); oneOf(v.mode, ['child', 'adult']);
  invariant(typeof v.displayName === 'string' && v.displayName.length > 0 && typeof v.timezone === 'string', 'Invalid learner');
  invariant(Array.isArray(v.consentRevisions), 'Missing consent revisions');
  v.consentRevisions.forEach(ref); return v;
}
export function validateSource(v) {
  ref(v.ref); oneOf(v.type, ['officialStandard', 'diagnosticDerived', 'errorBank', 'curatedTrainer', 'textbook', 'parentMaterial']);
  for (const field of ['locator', 'language', 'rights', 'author', 'reviewer']) invariant(typeof v[field] === 'string', `Missing source ${field}`);
  oneOf(v.reviewStatus, ['draft', 'reviewed', 'fixture']);
  oneOf(v.mappingConfidence, ['unknown', 'assumed', 'reviewed']); return v;
}
export function validateCourse(v) {
  ref(v.ref); id(v.language); id(v.script); oneOf(v.direction, ['rtl', 'ltr']);
  id(v.curriculumVersion); id(v.policyVersion);
  invariant(Array.isArray(v.frameworkRefs) && Array.isArray(v.allowedModalities), 'Invalid course');
  v.frameworkRefs.forEach(ref); v.allowedModalities.forEach(id); return v;
}
export function validateConcept(v) {
  ref(v.ref); invariant(typeof v.sense === 'string' && Array.isArray(v.relatedConcepts), 'Invalid concept');
  v.relatedConcepts.forEach(ref); return v;
}
export function validateItem(v) {
  ref(v.ref); id(v.language); id(v.familyId);
  oneOf(v.kind, ['grapheme', 'wordSense', 'phrase', 'pattern', 'sentence', 'passage', 'communicativeTask']);
  oneOf(v.qa, ['draft', 'reviewed', 'fixture']);
  invariant(Array.isArray(v.sourceRefs) && Array.isArray(v.forms) && Array.isArray(v.targetFeatures), 'Invalid learning item');
  v.sourceRefs.forEach(ref); if (v.conceptRef) ref(v.conceptRef);
  for (const form of v.forms) { invariant(typeof form.text === 'string', 'Invalid form'); id(form.script); id(form.variant); }
  return v;
}
export function validateSkill(v) {
  ref(v.ref);
  for (const field of ['construct', 'family', 'language', 'script', 'responseModality']) id(v[field]);
  invariant(typeof v.criterion === 'string' && typeof v.memoryEligible === 'boolean' && Array.isArray(v.rubricRefs), 'Invalid skill');
  v.rubricRefs.forEach(ref); return v;
}
export function validateCourseItemSkill(v, course, item, skill) {
  scope(v); ref(v.itemRef); ref(v.skillRef); id(v.channelId);
  validateCourse(course); validateItem(item); validateSkill(skill);
  invariant(canonical(v.itemRef) === canonical(item.ref) && canonical(v.skillRef) === canonical(skill.ref), 'Item/skill reference mismatch');
  invariant(item.language === course.language && skill.language === course.language, 'Course language mismatch');
  return v;
}
export function validateEnrollment(v, course) {
  scope(v); ref(v.definitionRef); validateCourse(course);
  invariant(canonical(v.definitionRef) === canonical(course.ref), 'Course definition mismatch');
  invariant(Array.isArray(v.expectedKnowledge) && Array.isArray(v.schoolFrontier), 'Missing curriculum contracts');
  for (const expectation of v.expectedKnowledge) {
    id(expectation.objectiveId); ref(expectation.sourceRef);
    oneOf(expectation.applicability, ['confirmed', 'assumed', 'unknown']);
    id(expectation.setBy); integer(expectation.recordedAt);
  }
  for (const frontier of v.schoolFrontier) {
    invariant(sameScope(v, frontier), 'Frontier owner mismatch');
    oneOf(frontier.stage, ['upcoming', 'current', 'covered']);
    oneOf(frontier.reportedBy, ['parent', 'teacher', 'learner']);
    oneOf(frontier.confidence, ['reported', 'confirmed']); integer(frontier.reportedAt);
    for (const field of ['objectiveIds', 'unitIds', 'pageRefs']) invariant(Array.isArray(frontier[field]), 'Invalid frontier');
  }
  return v; // Expectations/frontier never enter the evidence reducer.
}

export function validateTask(task) {
  exact(task, ['ref', 'itemRef', 'skillRef', 'rubricRef', 'sourceRef', 'language', 'channelId', 'conditionBand', 'familyId', 'contextId', 'demand', 'band', 'cost', 'requires', 'heldOut', 'qa', 'memoryEligible']);
  for (const field of ['ref', 'itemRef', 'skillRef', 'rubricRef', 'sourceRef']) ref(task[field]);
  for (const field of ['language', 'channelId', 'conditionBand', 'familyId', 'contextId', 'band']) id(task[field]);
  integer(task.demand); integer(task.cost, 1);
  invariant(Array.isArray(task.requires) && task.requires.every(v => typeof v === 'string'), 'Invalid capabilities');
  invariant(typeof task.heldOut === 'boolean' && typeof task.memoryEligible === 'boolean', 'Invalid task flags');
  oneOf(task.qa, ['reviewed', 'fixture', 'draft']); return task;
}
