// QA/pre-release content scaffold, deliberately absent from the learner scheduler
// and canonical evidence task registry. READY describes renderer capability only.
import {CANDIDATE_PILOTS} from './candidate-pilots.mjs?v=20261003-gtts1';
const freeze = value => {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
};
const groups = [
  ['אמא', 'אבא', 'ילד', 'ילדה', 'בית'],
  ['ספר', 'כיתה', 'מורה', 'ילקוט', 'כדור'],
  ['כלב', 'חתול', 'דג', 'עץ', 'פרח'],
  ['מים', 'לחם', 'קורא', 'קוראת', 'שותה'],
];
// The shared candidate catalogue also contains other courses. This course owns
// its vocabulary through the declared blocks; unrelated pilots cannot expand
// its media requirements or replace a word's reviewed candidate identity.
const candidateRows = CANDIDATE_PILOTS.flatMap(p => p.rows);
const vocabulary = groups.flat().map(target => {
  const matches = candidateRows.filter(row => row.target === target);
  if (matches.length !== 1) throw Error('Alpha-20 vocabulary needs one candidate for ' + target);
  const r = matches[0];
  return {
    id: r.id, target: r.target, display: r.display, meaning: r.meaning,
    mediaRef: r.id, qa: 'needs-human-review',
  };
});
const retrieval = ['meaning-picture', 'audio-picture', 'picture-word', 'audio-word'];
const blocks = groups.map((words, index) => {
  const id = `alpha20-b${index + 1}`, tasks = [];
  const add = (suffix, mechanic, targets, detail = {}) => tasks.push({
    id: `${id}-${suffix}`, mechanic, targets, qa: 'pre-release', countsAsEvidence: false, ...detail,
  });
  // Introduce all five before any can appear as a retrieval target or distractor.
  words.forEach((word, i) => add(`intro-${i + 1}`, 'intro', [word], {support: 'image-audio-pointed-word', purpose: 'Establish meaning, sound and written form'}));
  words.forEach((word, i) => add(`retrieve-${i + 1}`, retrieval[(index + i) % retrieval.length], [word], {
    choices: words, purpose: 'Retrieve one familiar object through a rotated channel; no mastery inference',
  }));
  add('pairs', 'bubble-match', words.slice(0, 3), {
    pairs: words.slice(0, 3).map(target => ({imageRef: `he:${target}`, wordRef: `he:${target}`})),
    purpose: 'Pair familiar pictures and words by meaning',
  });
  const built = [words[0], words[3]];
  built.forEach((word, i) => add(`build-${i + 1}`, 'constructor', [word], {
    mode: index === 0 ? 'letters' : 'chunks',
    units: index === 0 ? [...word] : [word.slice(0, -1), word.slice(-1)],
    answer: word, purpose: 'Reconstruct an introduced written word',
  }));
  // One short handwriting task per block; tracing/copying is assisted practice.
  const written = ['ילד', 'ספר', 'דג', 'מים'][index];
  add('write', 'handwriting', [written], {mode: index < 2 ? 'trace' : 'copy', maxRepetitions: 1, purpose: 'Brief supported handwriting practice; no automatic accuracy inference'});
  if (index === 0) add('forms', 'match', ['ילד', 'ילדה'], {
    pairs: [['ילד', 'ילדה']], relation: 'masculine-feminine', purpose: 'Notice the related masculine and feminine forms',
  });
  if (index === 3) {
    add('forms', 'match', ['ילד', 'ילדה', 'קורא', 'קוראת'], {
      pairs: [['ילד', 'ילדה'], ['קורא', 'קוראת']], relation: 'masculine-feminine', purpose: 'Revisit noun forms and relate the two reading forms',
    });
    [['ילד', 'קורא', 'ספר'], ['ילדה', 'קוראת', 'ספר'], ['ילד', 'שותה', 'מים']].forEach((units, i) => {
      add(`phrase-${i + 1}`, 'constructor', units, {
        mode: 'sentence', units, answer: units.join(' '), support: 'model-first', phraseQa: 'needs-human-review',
        purpose: 'Model then assemble a short sentence from already introduced words',
      });
    });
  }
  return {id, words, tasks, suggestedSessions: ['introductions', 'retrieval-and-pairing', 'form-and-writing'],
    stopRule: 'Pause at task boundaries for fatigue; resume from teaching history'};
});
export const ALPHA20_COURSE = freeze({
  id: 'he-alpha20', revision: 'alpha20-scaffold-20261003-v2', language: 'he', direction: 'rtl',
  status: 'qa-pre-release', officialCurriculum: false, learnerEnabled: false, trustedEvidenceEnabled: false,
  completion: 'route-traversal', historyAuthority: 'teaching-history',
  requiredAttemptIdentity: ['attemptId', 'sessionId', 'deviceId'],
  releasePrerequisites: ['human-image-audio-nikud-meaning-review', 'explicit-media-release', 'reviewed-canonical-task-and-presentation-contracts', 'server-ledger-integration', 'physical-device-acceptance'],
  vocabulary, blocks,
});
export const ALPHA20_MECHANIC_MAP = freeze(Object.fromEntries(
  ['intro', ...retrieval, 'bubble-match', 'match', 'constructor', 'handwriting'].map(mechanic => [mechanic,
    blocks.flatMap(block => block.tasks.filter(task => task.mechanic === mechanic).map(task => task.id)),
  ]),
));
// No caller-supplied QA/eligible flag can turn this draft into a learner route.
export function alpha20LearnerRoute() {
  throw Error('Alpha 20 is pre-release; media and canonical task release integration required');
}
