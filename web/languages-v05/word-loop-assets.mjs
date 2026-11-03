import {releasedAsset} from './asset-release-manifest.mjs';
// Semantic anchors are explicit curriculum assets, not inferred from emoji at runtime.
export const HEBREW_LESSON1_TARGETS=Object.freeze(['אתרוג','הדס','ערבה','סכה','לולב','סכך','פטיש','מסמר']);
export const WORD_LOOP_ASSETS=Object.freeze({he:Object.freeze({
 'אתרוג':{display:'אֶתְרוֹג',image:'🍋',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'אֶתְרוֹג',distractorLetters:['מ','ש']},
 'הדס':{display:'הֲדַס',image:'🌿',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'הֲדַס',distractorLetters:['ר','ב']},
 'ערבה':{display:'עֲרָבָה',image:'🌱',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'עֲרָבָה',distractorLetters:['ש','ד']},
 'סכה':{display:'סֻכָּה',acceptedAnswers:['סוכה'],image:'🏕️',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'סֻכָּה',distractorLetters:['ר','ב']},
 'לולב':{display:'לוּלָב',image:'🌿',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'לוּלָב',distractorLetters:['מ','ת']},
 'סכך':{display:'סְכָךְ',image:'🌾',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'סְכָךְ',distractorLetters:['ל','ת']},
 'פטיש':{display:'פַּטִּישׁ',image:'🔨',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'פַּטִּישׁ',distractorLetters:['כ','ר']},
 'מסמר':{display:'מַסְמֵר',image:'📌',imageKind:'emoji-fallback',audioKind:'released-or-tts',meaning:'מַסְמֵר',distractorLetters:['ב','ט']}
})});
export function wordLoopAsset(language,target){const key=String(target).normalize('NFD').replace(/[\u0591-\u05c7]/g,'');const x=WORD_LOOP_ASSETS[language]?.[key];if(!x)throw Error('Missing reviewed word-loop asset');return {...x,target:key,language}}

// Shared media resolution for the live lesson and read-only mechanism previews.
// Release/QA metadata is carried through unchanged, never promoted by a preview.
export function resolvedWordLoopAsset(language,target){
 const base=wordLoopAsset(language,target),media=releasedAsset(language,base.target)||{};
 return {...base,image:media.image||base.image,audioSrc:media.audio||null,
  audioSha256:media.audioSha256||null,audioHumanQa:media.audioHumanQa||null};
}
