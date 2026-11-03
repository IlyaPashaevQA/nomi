// Effective Alpha-20 candidate corrections. Historical pilot manifests stay immutable/auditable.
const overrides = {
  "he:ילדה": {
    "audio": {
      "src": "./audio/candidates/alpha20-retry-20261003-hila/girl.mp3",
      "sha256": "8138714c65293e8f9b0bc540130f314e990f641128ed0e35eb3655e4f14f878d",
      "bytes": 11232,
      "durationSeconds": 1.687,
      "durationSource": "Edge WebVTT final timestamp",
      "synthesisInput": "ילדה",
      "generationMethod": "edge-tts 7.2.8 / he-IL-HilaNeural; unpointed retry after human rejection"
    }
  },
  "he:כיתה": {
    "audio": {
      "src": "./audio/candidates/alpha20-retry-20261003-hila/classroom.mp3",
      "sha256": "ef09fe86fd9a986230c06e960f3d1cd2928281ec69a47369a4001722a0765096",
      "bytes": 11232,
      "durationSeconds": 1.65,
      "durationSource": "Edge WebVTT final timestamp",
      "synthesisInput": "כיתה",
      "generationMethod": "edge-tts 7.2.8 / he-IL-HilaNeural; unpointed retry after human rejection"
    }
  },
  "he:כדור": {
    "audio": {
      "src": "./audio/candidates/alpha20-retry-20261003-hila/ball.mp3",
      "sha256": "465ce36645d4b5cd76dcf489dafb665464fc7c370ed70c3a891b1365a456fc9e",
      "bytes": 11232,
      "durationSeconds": 1.687,
      "durationSource": "Edge WebVTT final timestamp",
      "synthesisInput": "כדור",
      "generationMethod": "edge-tts 7.2.8 / he-IL-HilaNeural; unpointed retry after human rejection"
    }
  },
  "he:פרח": {
    "audio": {
      "src": "./audio/candidates/gtts-hebrew-pronunciation-20261003/flower.mp3",
      "sha256": "02cf70d45f52c176fcf6a89de790e5c5a942e026a15224e27f81ea4cd6cd1d7c",
      "bytes": 8256,
      "durationSeconds": 1.032,
      "durationSource": "MPEG frame scan",
      "synthesisInput": "פֶּרַח",
      "generationMethod": "gTTS 2.5.4 / Hebrew (iw); pointed input after repeated Hila mispronunciation"
    }
  },
  "he:לחם": {
    "audio": {
      "src": "./audio/candidates/gtts-hebrew-pronunciation-20261003/bread.mp3",
      "sha256": "acdc03c2c388e390f4fa73153cbd08cd3aed70a89c22fa7ba1409619a6d1c397",
      "bytes": 7680,
      "durationSeconds": 0.96,
      "durationSource": "MPEG frame scan",
      "synthesisInput": "לֶחֶם",
      "generationMethod": "gTTS 2.5.4 / Hebrew (iw); pointed input after repeated Hila ambiguity with לכם"
    }
  },
  "he:תיק": {
    "id": "he:ילקוט",
    "target": "ילקוט",
    "display": "יַלְקוּט",
    "meaning": "schoolbag",
    "replacesId": "he:תיק",
    "audio": {
      "src": "./audio/candidates/alpha20-retry-20261003-hila/schoolbag.mp3",
      "sha256": "f61a9642c013cb36af85bb5a080dfacafa6a0a106e06f2102c79524ad4abdc56",
      "bytes": 11232,
      "durationSeconds": 1.872,
      "durationSource": "MPEG-2 Layer III frame duration",
      "synthesisInput": "ילקוט",
      "generationMethod": "edge-tts 7.2.8 / he-IL-HilaNeural; new lexical target selected by owner"
    }
  }
};
function deepFreeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === "object") deepFreeze(child);
  return Object.freeze(value);
}
export const ALPHA20_CANDIDATE_OVERRIDES = deepFreeze(overrides);
export function applyAlpha20CandidateOverride(row) {
  const patch = ALPHA20_CANDIDATE_OVERRIDES[row.id];
  if (!patch) return row;
  return {
    ...row,
    ...patch,
    image: row.image,
    audio: {...row.audio, ...(patch.audio || {})},
  };
}
