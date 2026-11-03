import {test, expect} from './fixtures.js';
import {NomiHomePage} from './pages/NomiHomePage.js';

test('home shows the eight demo words without horizontal overflow', async ({page, demoURL}) => {
  const home = new NomiHomePage(page, demoURL);
  await home.open();
  await expect(home.words).toHaveCount(8);
  await home.expectIntroduced(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a new lesson starts with the first introduction', async ({page, demoURL}) => {
  const home = new NomiHomePage(page, demoURL);
  await home.open();
  const lesson = await home.startLesson();
  await lesson.expectIntroduction('בַּיִת');
});

test('reload continues from the saved word instead of restarting', async ({page, demoURL}) => {
  const home = new NomiHomePage(page, demoURL);
  await home.open();
  const lesson = await home.startLesson();
  await lesson.nextIntroduction('סֵפֶר');
  await lesson.reload();
  await lesson.expectIntroduction('סֵפֶר');
  await lesson.leave();
  await home.expectIntroduced(1);
});

test('fast double tap records one introduction and does not skip a word', async ({page, demoURL}) => {
  const home = new NomiHomePage(page, demoURL);
  await home.open();
  const lesson = await home.startLesson();
  await lesson.doublePressNext();
  await lesson.expectIntroduction('סֵפֶר');
  await lesson.leave();
  await home.expectIntroduced(1);
});

test('switching profiles preserves separate learning progress', async ({page, demoURL}) => {
  const home = new NomiHomePage(page, demoURL);
  await home.open('demo-a');
  const lesson = await home.startLesson();
  await lesson.nextIntroduction('סֵפֶר');
  await lesson.leave();
  await home.expectIntroduced(1);
  await home.open('demo-b');
  await home.expectIntroduced(0);
  await home.open('demo-a');
  await home.expectIntroduced(1);
});

test('a profile capability cannot read the other profile journal', async ({page, request, demoURL}) => {
  const home = new NomiHomePage(page, demoURL);
  await home.open('demo-a');
  const token = await page.evaluate(() => {
    const current = globalThis as typeof globalThis & {
      __LANGUAGES_SESSION_CONTEXT__: {sessionToken: string};
    };
    return current.__LANGUAGES_SESSION_CONTEXT__.sessionToken;
  });
  const wrongProfile = await request.get(`${demoURL}/demo-b/languages-v05/api/session/${token}/sync/languages-v05`);
  expect(wrongProfile.status()).toBe(403);
  const own = await request.get(`${demoURL}/demo-a/languages-v05/api/session/${token}/sync/languages-v05`);
  expect(own.status()).toBe(200);
  expect((await own.json()).state).toBeNull();
});

test('introductions lead to a real practice response saved by the server', async ({page, demoURL}) => {
  test.setTimeout(60_000);
  const home = new NomiHomePage(page, demoURL);
  await home.open();
  const lesson = await home.startLesson();
  await lesson.completeIntroductions();
  const saved = page.waitForResponse(response => {
    if (response.request().method() !== 'POST' || !response.url().endsWith('/sync/languages-v05')) return false;
    const payload = response.request().postDataJSON();
    return response.ok() && payload.state.alpha20.events.length === 9;
  });
  await lesson.answerFirstPracticeChoice();
  const accepted = await (await saved).json();
  expect(accepted.state.alpha20.events).toHaveLength(9);
  expect(typeof accepted.state.alpha20.events[8].correct).toBe('boolean');
  await lesson.leave();
  await home.expectIntroduced(8);
  await expect(home.progress).toContainText('9 saved learning actions');
});
