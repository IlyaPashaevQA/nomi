// Storage-only human review. No learner session, history or evidence imports.
export const CANDIDATE_FIELDS = Object.freeze(['image', 'audio', 'nikud', 'meaning']);
const hashes = row => ({imageSha256: row.image.sha256, audioSha256: row.audio?.sha256 || null});
const imageMatches = (row, review) => !!row.image?.sha256 && review?.imageSha256 === row.image.sha256;
const audioMatches = (row, review) => !!row.audio?.sha256 && review?.audioSha256 === row.audio.sha256;
const fieldMatches = (row, field, review) => field === 'audio' ? audioMatches(row, review) : imageMatches(row, review);

export function candidateDecision(row, field, decisions) {
  if (!CANDIDATE_FIELDS.includes(field) || field === 'audio' && !row.audio?.sha256) return 'needs-human-review';
  const review = decisions[row.id];
  return fieldMatches(row, field, review) && ['approved', 'rejected'].includes(review?.[field]) ? review[field] : 'needs-human-review';
}

export function candidateReview(pilot, key) {
  const load = (storage = globalThis.localStorage) => {
    const raw = storage?.getItem(key);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') throw Error('Invalid pilot review storage');
    return data;
  };
  const save = (id, field, value, storage = globalThis.localStorage) => {
    const row = pilot.rows.find(item => item.id === id);
    if (!row || !CANDIDATE_FIELDS.includes(field) || !['approved', 'rejected'].includes(value)) throw Error('Invalid pilot decision');
    if (field === 'audio' && (!row.audio?.src || !row.audio?.sha256)) throw Error('Audio candidate unavailable');
    if (!storage) throw Error('Pilot review storage unavailable');
    const data = load(storage), prior = data[id] || {}, preserved = {};
    // Image/content review and audio review are byte-bound independently.
    // Adding/replacing audio must not erase a human image/nikud/meaning decision,
    // and replacing an image must not erase an unchanged audio decision.
    if (imageMatches(row, prior)) {
      for (const name of ['image', 'nikud', 'meaning']) if (['approved', 'rejected'].includes(prior[name])) preserved[name] = prior[name];
    }
    if (audioMatches(row, prior) && ['approved', 'rejected'].includes(prior.audio)) preserved.audio = prior.audio;
    data[id] = {...preserved, [field]: value, ...hashes(row), updatedAt: new Date().toISOString()};
    storage.setItem(key, JSON.stringify(data));
    return data;
  };
  return Object.freeze({key, load, save});
}

// Check fetched bytes immediately before a decision, never silently trust a stale URL.
// Missing audio permits image/content review, but never audio approval or readiness.
export async function verifyCandidateBytes(row, fetcher = globalThis.fetch, subtle = globalThis.crypto?.subtle) {
  if (!subtle) throw Error('SHA-256 verification unavailable');
  if (!row.image?.src || !row.image.sha256) throw Error('Image candidate unavailable');
  for (const media of [row.image, row.audio]) {
    if (!media?.src && !media?.sha256) continue;
    if (!media?.src || !media.sha256) throw Error('Incomplete candidate metadata');
    const response = await fetcher(media.src, {cache: 'no-store'});
    if (!response.ok) throw Error('Candidate unavailable: HTTP ' + response.status);
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== media.bytes || digest !== media.sha256) throw Error('Candidate bytes changed; review blocked');
  }
  return true;
}
