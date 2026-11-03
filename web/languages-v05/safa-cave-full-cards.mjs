// Standalone card candidates for every source form. No learner admission.
const freezeDeep=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value)}return value};
export const SAFA_FULL_CARD_CATALOG=Object.freeze({schema:'nomi-safa-full-cards-v1',version:'unavailable',cards:[]});
export const SAFA_FULL_CARDS=SAFA_FULL_CARD_CATALOG.cards;
export function safaFullCard(id){return SAFA_FULL_CARDS.find(c=>c.id===id)||null}
