import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {hebrewDailyStart, hebrewDailyWords} from '../../web/languages-v05/hebrew-pack-catalog.mjs';
import {shouldRollHebrewDailyPlan} from '../../web/languages-v05/hebrew-daily-priority.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const catalogue = JSON.parse(readFileSync(new URL('../../demo-catalog.json', import.meta.url)));
const words = hebrewDailyWords(catalogue.catalog);

test('the production planner introduces at most ten new words per session', () => {
  const larger = Array.from({length:16}, (_,i) => ({...words[i%8], id:`demo-extra-${i}`, target:`word-${i}`, contentSha256:String(i).padStart(64,'0')}));
  const plan = hebrewDailyStart(larger, {remainingNew:10});
  assert.equal(plan.introIds.length,10);
});

test('zero allowance still permits review of introduced vocabulary', () => {
  const plan = hebrewDailyStart(words, {remainingNew:0, introduced:new Set(words.map(w=>w.target))});
  assert.equal(plan.introIds.length,0);
  assert.equal(plan.plan.length,8);
});

test('a deliberately small valid lesson is not discarded as corrupted', () => {
  const plan = hebrewDailyStart(words.slice(0,4), {remainingNew:4});
  assert.equal(shouldRollHebrewDailyPlan(plan,words),false);
});
