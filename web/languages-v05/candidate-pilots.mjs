import {ALPHA10_PILOT} from './asset-pilot-alpha10-manifest.mjs?v=20261003-1535';
import {ALPHA20_BATCH2_PILOT} from './asset-pilot-alpha20-batch2-manifest.mjs?v=20261003-audiofix1';
import {AUTUMN1_PILOT} from './asset-pilot-autumn1-manifest.mjs?v=20261007-hila1';
import {candidateReview} from './candidate-review.mjs?v=20261003-audiofix1';
import {applyAlpha20CandidateOverride} from './alpha20-candidate-overrides.mjs?v=20261003-gtts1';
export {candidateDecision, verifyCandidateBytes} from './candidate-review.mjs?v=20261003-audiofix1';

const effectivePilot = pilot => Object.freeze({...pilot, rows:Object.freeze(pilot.rows.map(applyAlpha20CandidateOverride))});
export const CANDIDATE_PILOTS = Object.freeze([AUTUMN1_PILOT, effectivePilot(ALPHA10_PILOT), effectivePilot(ALPHA20_BATCH2_PILOT)]);
export const CANDIDATE_ROWS = Object.freeze(CANDIDATE_PILOTS.flatMap(pilot => pilot.rows));
// Keep the established Batch 1 key and record shape verbatim; no migration writes.
const reviews = CANDIDATE_PILOTS.map(pilot => ({pilot, review: candidateReview(pilot, `nomi-asset-pilot-${pilot.batchId}-v1`)}));
export function loadCandidateQa(storage = globalThis.localStorage) {
  return Object.assign({}, ...reviews.map(({review}) => review.load(storage)));
}
export function saveCandidateDecision(id, field, value, storage = globalThis.localStorage) {
  const entry = reviews.find(({pilot}) => pilot.rows.some(row => row.id === id));
  if (!entry) throw Error('Unknown candidate');
  // Check every batch before a write, preserving corrupt bytes rather than replacing them.
  loadCandidateQa(storage);
  entry.review.save(id, field, value, storage);
  return loadCandidateQa(storage);
}
export function storeCandidateQa(snapshot, storage = globalThis.localStorage) {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== 'object') throw Error('Invalid candidate QA snapshot');
  if (!storage) throw Error('Pilot review storage unavailable');
  // Fail closed: never overwrite corrupt local QA bytes during server hydration.
  loadCandidateQa(storage);
  for (const {pilot, review} of reviews) {
    const ids = new Set(pilot.rows.map(row => row.id));
    const batch = Object.fromEntries(Object.entries(snapshot).filter(([id]) => ids.has(id)));
    storage.setItem(review.key, JSON.stringify(batch));
  }
  return loadCandidateQa(storage);
}
