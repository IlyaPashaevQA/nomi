import { key, REDUCER_VERSION } from './domain.mjs';
import { replayEvents } from './events.mjs';

export function evidenceStrength(observation) {
  if (observation.validity !== 'valid' || !['correct', 'partial', 'incorrect'].includes(observation.outcome)) return 0;
  const a = observation.assistance;
  if (a.modelShown || a.transcriptShown) return 0;
  return (observation.rater.kind === 'self' ? 0.25 : 1) / (1 + a.hints + a.replays + Number(a.teacherHelp));
}
export function supportBand(p) {
  const a = p.assistance;
  return a.modelShown ? 'model' : a.transcriptShown ? 'transcript' : a.hints || a.replays || a.teacherHelp ? 'assisted' : 'unassisted';
}
export function independent(p) {
  return evidenceStrength(p) === 1 && p.fresh && p.rater.kind !== 'self';
}
export const skillKey = p => key(p.task.skillRef, p.task.channelId, p.task.conditionBand, supportBand(p), p.task.demand, p.task.band, p.task.rubricRef, p.rater.kind, p.rater.version);
export const itemKey = p => key(p.task.itemRef, skillKey(p));

// A retry cannot recover independence by dropping its hint flag or changing its channel.
// Original events remain untouched; only the derived view becomes conservative.
export function observationsForEvidence(log) {
  const groups = new Set(), families = new Set();
  return log.filter(e => e.type === 'observation_recorded' && e.payload.dataClass==='live' && e.payload.task?.qa==='reviewed').map(event => {
    const adjudication = log.find(e => e.type === 'observation_adjudicated' && e.payload.originalEventId === event.eventId);
    const p = adjudication ? { ...event.payload, validity: 'valid', score: adjudication.payload.score,
      outcome: adjudication.payload.outcome, rater: adjudication.payload.rater } : event.payload;
    const group = key(p.task.skillRef, p.independenceGroup);
    const family = key(event.sessionId, p.task.skillRef, p.task.familyId);
    const fresh = p.fresh && !groups.has(group) && !families.has(family);
    groups.add(group); families.add(family);
    return { ...event, adjudicationEventId: adjudication?.eventId ?? null, payload: { ...p, fresh } };
  });
}

function summarize(events) {
  const first = events[0].payload, seen = new Set();
  const samples = events.filter(e => {
    const group = e.payload.independenceGroup;
    if (seen.has(group)) return false;
    seen.add(group); return true;
  });
  const direct = samples.filter(e => independent(e.payload));
  const families = [...new Set(direct.map(e => e.payload.task.familyId))];
  const days = [...new Set(direct.filter(e => e.clockQuality === 'reliable').map(e => Math.floor(e.occurredAtUtc / 86400000)))];
  const contexts = [...new Set(direct.map(e => e.payload.task.contextId))];
  const successes = direct.filter(e => e.payload.score === 1).length;
  const delayedTrials = direct.filter(e => e.payload.delayed).length;
  const novelTrials = direct.filter(e => e.payload.novelContext).length;
  const weight = samples.reduce((n, e) => n + evidenceStrength(e.payload), 0);
  const developing = direct.length >= 3 && days.length >= 2 && families.length >= 2;
  const confidence = !direct.length ? 'unknown' : developing && direct.length >= 6 && days.length >= 3 && delayedTrials && novelTrials ? 'corroborated' : developing ? 'developing' : 'low';
  const mixed = samples.some(e => e.payload.score === 1) && samples.some(e => e.payload.score < 1);
  const supported = supportBand(first) !== 'unassisted';
  return {
    skillRef: first.task.skillRef, channelId: first.task.channelId, conditionBand: first.task.conditionBand,
    supportBand: supportBand(first), rubricRef: first.task.rubricRef, raterKind: first.rater.kind, raterVersion: first.rater.version,
    estimate: { observedBand: first.task.band, demand: first.task.demand,
      criterionRate: weight ? samples.reduce((n, e) => n + e.payload.score * evidenceStrength(e.payload), 0) / weight : null },
    status: mixed ? 'mixed' : supported && samples.some(e => e.payload.score === 1) ? 'supported' : developing && successes === direct.length ? 'independent' : 'emerging',
    confidence, probability: null, weightedEvidence: weight, opportunities: samples.length,
    independentTrials: direct.length, successes, itemFamilies: families, contexts, days, delayedTrials, freshTrials: direct.length,
    evidenceRefs: samples.flatMap(e => [e.eventId, ...(e.adjudicationEventId ? [e.adjudicationEventId] : [])]), lastObservedAt: Math.max(...samples.map(e => e.occurredAtUtc)), estimatorVersion: REDUCER_VERSION,
  };
}

export function projectEvidence(events, owner) {
  const log = replayEvents(events, owner), skills = new Map(), items = new Map();
  for (const event of observationsForEvidence(log)) {
    if (!evidenceStrength(event.payload)) continue;
    for (const [groups, k] of [[skills, skillKey(event.payload)], [items, itemKey(event.payload)]]) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(event);
    }
  }
  return { ...owner, schemaVersion: 2, reducerVersion: REDUCER_VERSION, watermark: log.length,
    skills: Object.fromEntries([...skills].map(([k, values]) => [k, summarize(values)])),
    items: Object.fromEntries([...items].map(([k, values]) => [k, { itemRef: values[0].payload.task.itemRef, ...summarize(values) }])),
  };
}

// A vector of comparable strata, never an averaged CEFR/literacy level.
export function skillProfile(projection, skillRefs, at, staleAfterMs = 28 * 86400000) {
  return skillRefs.map(skillRef => {
    const strata = Object.values(projection.skills).filter(s => key(s.skillRef) === key(skillRef))
      .map(s => ({ ...s, stale: at - s.lastObservedAt > staleAfterMs }));
    return { skillRef, status: strata.length ? 'observed' : 'not_observed',
      estimate: strata.length ? strata.map(s => s.estimate) : null,
      confidence: strata.length ? strata.map(s => s.confidence) : 'unknown',
      coverage: { validOpportunities: strata.reduce((n, s) => n + s.opportunities, 0), strata: strata.length }, strata };
  });
}
