import { SCHEMA_VERSION, PROTOCOL_VERSION, canonical, exact, id, integer, invariant, oneOf, ref, sameScope, scope, validateTask } from './domain.mjs';
import { contentRegistry, PACKS } from './content.mjs';

export const EVENT_TYPES = ['session_started', 'task_selected', 'observation_recorded', 'session_ended', 'assistance_recorded', 'observation_adjudicated'];
export function validateAssistance(a) {
  exact(a, ['hints', 'modelShown', 'transcriptShown', 'replays', 'teacherHelp']);
  integer(a.hints); integer(a.replays);
  for (const field of ['modelShown', 'transcriptShown', 'teacherHelp']) invariant(typeof a[field] === 'boolean', 'Invalid assistance');
}
function validateRater(rater) {
  exact(rater, ['kind', 'id', 'version']); oneOf(rater.kind, ['deterministic', 'human', 'self']); id(rater.id); id(rater.version);
}
// Closed payloads: optional bounded local text/choice response, never audio bytes.
export function validateEvent(event) {
  exact(event, ['schemaVersion', 'eventId', 'idempotencyKey', 'learnerId', 'courseId', 'sessionId', 'deviceId', 'deviceSequence', 'occurredAtUtc', 'recordedAtUtc', 'clockQuality', 'type', 'payload', 'localSequence']);
  invariant(event.schemaVersion === SCHEMA_VERSION, 'Unsupported event schema');
  scope(event);
  for (const field of ['eventId', 'idempotencyKey', 'sessionId', 'deviceId']) id(event[field]);
  for (const field of ['deviceSequence', 'occurredAtUtc', 'recordedAtUtc']) integer(event[field]);
  if (event.localSequence !== undefined) integer(event.localSequence, 1);
  oneOf(event.clockQuality, ['reliable', 'uncertain']); oneOf(event.type, EVENT_TYPES);
  const p = event.payload;
  if (p?.task && (p.task.qa === 'reviewed' || ['ref', 'itemRef', 'skillRef', 'rubricRef', 'sourceRef'].some(field => p.task[field]?.version === 'slice-1'))) {
    invariant(p.task.qa === 'reviewed', 'Reviewed content cannot be relabelled as fixture/draft');
    invariant(canonical(contentRegistry.resolve(p.task.ref)) === canonical(p.task), 'Unsupported or changed reviewed task');
    invariant(PACKS.some(pack => (sameScope(pack.owner, event)||(event.learnerId==='test-owner'&&pack.owner.learnerId==='dasha'&&pack.owner.courseId===event.courseId)) && pack.definition.tasks.some(t => canonical(t) === canonical(p.task))), 'Reviewed task owner mismatch');
  }
  if (event.type === 'session_started') {
    if(p.mode==='practice'){const v2=p.protocolVersion==='practice-v2';exact(p,v2?['definitionRef','protocolVersion','mode','taskBudget','costBudget','curriculumVersion','taskIds','taskRefs']:['definitionRef','protocolVersion','mode','taskBudget','costBudget','curriculumVersion','taskIds']);ref(p.definitionRef);invariant(v2||p.protocolVersion==='practice-v1','Unsupported practice protocol');id(p.curriculumVersion);invariant(Array.isArray(p.taskIds)&&p.taskIds.length>0&&p.taskIds.length<=20,'Invalid practice plan');p.taskIds.forEach(id);if(v2){invariant(Array.isArray(p.taskRefs)&&p.taskRefs.length===p.taskIds.length,'Invalid frozen task refs');p.taskRefs.forEach(ref)}integer(p.taskBudget,1);integer(p.costBudget,1);} else { exact(p, ['definitionRef', 'protocolVersion', 'mode', 'taskBudget', 'costBudget']); ref(p.definitionRef); invariant(p.protocolVersion === PROTOCOL_VERSION, 'Unsupported assessment protocol'); oneOf(p.mode, ['baseline', 'calibration']); integer(p.taskBudget, 1); integer(p.costBudget, 1); }
  } else if (event.type === 'task_selected') {
    exact(p, ['taskInstanceId', 'task', 'reason']); id(p.taskInstanceId); validateTask(p.task);
    exact(p.reason, ['code', 'text', 'evidenceRefs', 'updates']); id(p.reason.code);
    invariant(typeof p.reason.text === 'string' && Array.isArray(p.reason.evidenceRefs) && Array.isArray(p.reason.updates), 'Invalid explanation');
    p.reason.evidenceRefs.forEach(id);
    for (const target of p.reason.updates) {
      exact(target, ['itemRef', 'skillRef', 'channelId', 'conditionBand']); ref(target.itemRef); ref(target.skillRef); id(target.channelId); id(target.conditionBand);
    }
  } else if (event.type === 'assistance_recorded') {
    exact(p, ['taskInstanceId', 'assistance', 'version']); id(p.taskInstanceId);
    invariant(p.version === 'assistance-v1', 'Unsupported assistance version'); validateAssistance(p.assistance);
  } else if (event.type === 'observation_adjudicated') {
    const scoped=p.actorId!==undefined;
    exact(p, ['originalEventId', 'originalAttemptId', 'taskInstanceId', 'rubricRef', 'reviewVersion', 'rater', 'ratings', 'outcome', 'score',...(scoped?['actorId','subjectId','authorizationRevision']:[])]);
    for (const field of ['originalEventId', 'originalAttemptId', 'taskInstanceId']) id(p[field]);
    ref(p.rubricRef); invariant(p.reviewVersion === 'review-v1', 'Unsupported review version');
    validateRater(p.rater); oneOf(p.rater.kind, ['human', 'self']);
    invariant(Array.isArray(p.ratings) && p.ratings.length > 0, 'Missing review ratings');
    for (const rating of p.ratings) { exact(rating, ['criterionId', 'score']); id(rating.criterionId); oneOf(rating.score, [0, 0.5, 1]); }
    invariant(new Set(p.ratings.map(r => r.criterionId)).size === p.ratings.length, 'Duplicate review criterion');
    oneOf(p.outcome, ['correct', 'partial', 'incorrect']);
    invariant(p.score === p.ratings.reduce((sum, r) => sum + r.score, 0) / p.ratings.length, 'Review score mismatch');
    invariant(p.outcome === (p.score === 1 ? 'correct' : p.score === 0 ? 'incorrect' : 'partial'), 'Review outcome mismatch');
    if(scoped){id(p.actorId);id(p.subjectId);id(p.authorizationRevision);invariant(p.subjectId===event.learnerId,'Adjudication subject mismatch');invariant(p.rater.kind==='human'&&p.rater.id===p.actorId,'Adjudication actor mismatch')}
  } else if (event.type === 'observation_recorded') {
    exact(p, ['attemptId', 'taskInstanceId', 'task', 'origin', 'dataClass', 'outcome', 'validity', 'score', 'assistance', 'rater', 'independenceGroup', 'fresh', 'delayed', 'novelContext', 'response', ...(p.origin==='practice'&&p.practiceTaskId!==undefined?['practiceTaskId']:[])]);
    if(p.practiceTaskId!==undefined) id(p.practiceTaskId);
    id(p.attemptId); id(p.taskInstanceId); id(p.independenceGroup); validateTask(p.task);
    oneOf(p.origin, ['assessment', 'practice']);
    // Legacy/test imports have no representation as live evidence.
    oneOf(p.dataClass, ['live','fixture']);
    if(event.learnerId==='test-owner')invariant(p.dataClass==='fixture','QA observations cannot be live');
    oneOf(p.outcome, ['correct', 'partial', 'incorrect', 'unknown', 'skip', 'technical_issue']);
    oneOf(p.validity, ['valid', 'invalid', 'needs_review']);
    const scored = ['correct', 'partial', 'incorrect'].includes(p.outcome) && p.validity === 'valid';
    invariant(scored ? Number.isFinite(p.score) && p.score >= 0 && p.score <= 1 : p.score === null, 'Invalid score');
    if (scored && p.outcome === 'correct') invariant(p.score === 1, 'Correct score must be 1');
    if (scored && p.outcome === 'incorrect') invariant(p.score === 0, 'Incorrect score must be 0');
    // Trusted scored observations must bind to canonical reviewed content. Practice-only fixtures may be retained only as unscored/invalid interaction records.
    validateAssistance(p.assistance); validateRater(p.rater);
    if (p.response !== undefined) {
      if (p.response.version === 'response-v1') {
        exact(p.response, ['version', 'kind', 'value']);
        oneOf(p.response.kind, ['choice', 'text', 'live-reading', 'none']);
        invariant(typeof p.response.value === 'string' && p.response.value.length <= 4000, 'Invalid response');
      } else if (p.response.version === 'response-v2') {
        exact(p.response, ['version', 'kind', 'value']); invariant(p.response.kind === 'handwriting', 'Unsupported response-v2 kind');
        const h=p.response.value; exact(h,['width','height','strokes']); integer(h.width,1); integer(h.height,1);
        invariant(h.width<=2048&&h.height<=2048&&Array.isArray(h.strokes)&&h.strokes.length>0&&h.strokes.length<=128,'Invalid handwriting canvas');
        let points=0; for(const stroke of h.strokes){ invariant(Array.isArray(stroke)&&stroke.length>0&&stroke.length<=512,'Invalid handwriting stroke'); points+=stroke.length; for(const point of stroke){ exact(point,['x','y','p','dt']); invariant(Number.isFinite(point.x)&&point.x>=0&&point.x<=1&&Number.isFinite(point.y)&&point.y>=0&&point.y<=1&&Number.isFinite(point.p)&&point.p>=0&&point.p<=1,'Invalid handwriting point'); integer(point.dt,0); invariant(point.dt<=60000,'Invalid handwriting timing'); } }
        invariant(points<=4096,'Handwriting response too large');
      } else if (p.response.version === 'response-v3') {
        exact(p.response,['version','kind','responseKind','responseRef','digest']); invariant(p.response.kind==='reference','Unsupported response-v3 kind'); oneOf(p.response.responseKind,['text','handwriting']); id(p.response.responseRef); invariant(typeof p.response.digest==='string'&&p.response.digest.length>=8,'Invalid response digest');
      } else invariant(false,'Unsupported response version');
    }
    if (p.task.qa === 'reviewed') {
      const rubric = contentRegistry.resolve(p.task.rubricRef);
      const presentation = PACKS.flatMap(pack => pack.presentations).find(x => canonical(x.taskRef) === canonical(p.task.ref));
      invariant(p.response, 'Reviewed response required');
      if (p.validity === 'needs_review') {
        invariant(rubric.mode === 'review' && ((p.response.version==='response-v3'&&p.response.responseKind===presentation.responseKind)||(p.response.kind === presentation.responseKind && (p.response.kind === 'handwriting' ? p.response.version === 'response-v2' : p.response.value.trim()))) && p.outcome === 'unknown', 'Invalid pending production');
        if (p.response.kind === 'live-reading') invariant(p.response.value === 'observed-live', 'Live reading stores only observation marker');
      } else if (scored) {
        invariant(rubric.mode === 'exact-choice' && p.response.kind === 'choice' && p.rater.kind === 'deterministic' && p.rater.version === 'submission-v1', 'Production requires adjudication');
        invariant(presentation.options.some(o => o.id === p.response.value), 'Unknown answer ID');
        invariant(p.score === (p.response.value === rubric.answerKey ? 1 : 0), 'Answer key mismatch');
      } else invariant(p.response.kind === 'none' && p.response.value === '', 'Invalid neutral response');
    }
    for (const field of ['fresh', 'delayed', 'novelContext']) invariant(typeof p[field] === 'boolean', 'Invalid observation flag');
  } else {
    exact(p, ['reason']); oneOf(p.reason, ['task_budget', 'cost_budget', 'sufficient', 'coverage_gap', 'user_stop', 'discomfort', 'inaccessible', 'awaiting_review']);
  }
  canonical(event); return event;
}

export function makeEvent(owner, type, payload, metadata) {
  exact(metadata, ['eventId', 'idempotencyKey', 'sessionId', 'deviceId', 'deviceSequence', 'occurredAtUtc', 'recordedAtUtc', 'clockQuality']);
  const event = { schemaVersion: SCHEMA_VERSION, ...owner, ...metadata, type, payload: structuredClone(payload) };
  if(owner.learnerId==='test-owner'&&type==='observation_recorded')event.payload.dataClass='fixture';
  validateEvent(event); return event;
}
const withoutSequence = event => { const copy = { ...event }; delete copy.localSequence; return copy; };

// Both adapters use this exact reducer. Scope is mandatory even for empty reads.
// Append is all-or-nothing; IDs and idempotency keys cannot be reused for different commands.
function appendEventsCore(existing, incoming, owner, expectedRevision, historical=false) {
  scope(owner); invariant(Array.isArray(incoming), 'Expected event batch');
  const result = structuredClone(existing), added = [];
  for (const candidate of incoming) {
    const event = structuredClone(validateEvent(candidate));
    invariant(sameScope(event, owner), 'Event owner/course mismatch');
    if(!historical&&event.type==='session_started'&&event.payload.mode==='practice')invariant(event.payload.protocolVersion==='practice-v2','New practice sessions require bound task refs');
    if(event.type==='observation_recorded'&&!historical){invariant(event.payload.dataClass===(owner.learnerId==='test-owner'?'fixture':'live'),'Fixture/test evidence cannot enter live repository');const scored=event.payload.validity==='valid'&&event.payload.score!==null;if(scored){invariant(event.payload.task.qa==='reviewed','Scored live evidence requires reviewed canonical content');invariant(canonical(contentRegistry.resolve(event.payload.task.ref))===canonical(event.payload.task),'Scored live evidence task is not canonical');}}
    const duplicate = result.find(e => e.eventId === event.eventId || e.idempotencyKey === event.idempotencyKey);
    if (duplicate) {
      invariant(canonical(withoutSequence(duplicate)) === canonical(withoutSequence(event)), 'Idempotency conflict');
      continue;
    }
    if (expectedRevision !== undefined) invariant(expectedRevision === existing.length, 'Stale course revision');
    const p = event.payload, session = result.filter(e => e.sessionId === event.sessionId);
    const started = session.find(e => e.type === 'session_started');
    const ended = session.some(e => e.type === 'session_ended');
    if (event.type === 'session_started') invariant(session.length === 0, 'Session already exists');
    if (event.type === 'task_selected') {
      invariant(started && !ended, 'Assessment session is not active');
      invariant(!session.some(e => e.type === 'task_selected' && !session.some(o => o.type === 'observation_recorded' && o.payload.taskInstanceId === e.payload.taskInstanceId)), 'Task already pending');
      invariant(!result.some(e => e.type === 'task_selected' && e.payload.taskInstanceId === p.taskInstanceId), 'Task instance reused');
    }
    if (event.type === 'observation_recorded') {
      if(!historical&&event.sessionId.startsWith('school-'))invariant(started&&!ended&&started.payload.mode==='practice','Missing active school session');
      invariant(!result.some(e => e.type === event.type && (e.payload.attemptId === p.attemptId || e.payload.taskInstanceId === p.taskInstanceId)), 'Attempt already recorded');
      if (p.origin === 'assessment') {
        const selection = session.find(e => e.type === 'task_selected' && e.payload.taskInstanceId === p.taskInstanceId);
        invariant(started && !ended && selection, 'Missing active assessment task');
        invariant(canonical(selection.payload.task) === canonical(p.task), 'Frozen task provenance mismatch');
      } else if(started){ invariant(!ended&&started.payload.mode==='practice','Practice session is not active'); const practiceId=p.practiceTaskId ?? p.task.ref.id.slice(5), answered=session.filter(e=>e.type==='observation_recorded'&&e.payload.origin==='practice').map(e=>e.payload.practiceTaskId ?? e.payload.task.ref.id.slice(5)), expected=started.payload.taskIds[answered.length]; invariant(expected!==undefined,'Practice plan already complete'); invariant(practiceId===expected,'Practice task out of order');if(started.payload.protocolVersion==='practice-v2'){const expectedRef=started.payload.taskRefs[answered.length];invariant(canonical(p.task.ref)===canonical(expectedRef),'Practice task identity mismatch')}invariant(!answered.includes(practiceId),'Practice task already answered'); } // legacy pre-lifecycle practice events remain readable
      const support = session.filter(e => e.type === 'assistance_recorded' && e.payload.taskInstanceId === p.taskInstanceId).at(-1);
      if (support) invariant(canonical(support.payload.assistance) === canonical(p.assistance), 'Assistance provenance mismatch');
    }
    if (event.type === 'assistance_recorded') {
      invariant(started && !ended && session.some(e => e.type === 'task_selected' && e.payload.taskInstanceId === p.taskInstanceId) &&
        !session.some(e => e.type === 'observation_recorded' && e.payload.taskInstanceId === p.taskInstanceId), 'Missing active assistance task');
      const previous = session.filter(e => e.type === event.type && e.payload.taskInstanceId === p.taskInstanceId).at(-1);
      if (previous) for (const field of Object.keys(p.assistance)) invariant(Number(p.assistance[field]) >= Number(previous.payload.assistance[field]), 'Assistance cannot decrease');
    }
    if (event.type === 'observation_adjudicated') {
      const original = session.find(e => e.type === 'observation_recorded' && e.eventId === p.originalEventId);
      invariant(original && original.payload.validity === 'needs_review', 'Missing pending review attempt');
      if(!historical)invariant(original.payload.dataClass==='live' && original.payload.task.qa==='reviewed','Only reviewed live evidence can be adjudicated');
      invariant(original.payload.attemptId === p.originalAttemptId && original.payload.taskInstanceId === p.taskInstanceId &&
        canonical(original.payload.task.rubricRef) === canonical(p.rubricRef), 'Adjudication provenance mismatch');
      invariant(!result.some(e => e.type === event.type && e.payload.originalEventId === p.originalEventId), 'Attempt already adjudicated');
      if (original.payload.task.qa === 'reviewed') {
        const rubric = contentRegistry.resolve(p.rubricRef);
        invariant(rubric.mode === 'review' && rubric.allowedRaters.includes(p.rater.kind) && p.rater.version === 'human-rubric-v1', 'Unsupported rubric rater/version');
        invariant(canonical(p.ratings.map(r => r.criterionId).sort()) === canonical(rubric.criteria.map(c => c.id).sort()), 'Review criterion mismatch');
      }
    }
    if (event.type === 'session_ended') invariant(started && !ended, 'Session is not active');
    event.localSequence = result.length + 1;
    result.push(event); added.push(event);
  }
  return { events: result, added, revision: result.length };
}

export function appendEvents(events,incoming,owner,expectedRevision=events.length){return appendEventsCore(events,incoming,owner,expectedRevision,false)}

export function replayEvents(events, owner) {
  scope(owner); const ordered = [...events].sort((a, b) => a.localSequence - b.localSequence);
  // Exact duplicates are safe in replay; gaps/corrupt order and collisions are not.
  const unique = new Map();
  for (const event of ordered) {
    validateEvent(event); invariant(sameScope(event, owner), 'Replay owner/course mismatch');
    const prior = unique.get(event.eventId);
    invariant(!prior || canonical(prior) === canonical(event), 'Replay ID conflict');
    unique.set(event.eventId, event);
  }
  const deduped = [...unique.values()];
  deduped.forEach((event, i) => invariant(event.localSequence === i + 1, 'Invalid local sequence'));
  return appendEventsCore([],deduped,owner,0,true).events;
}
