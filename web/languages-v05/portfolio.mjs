import {mountAlpha20Lesson} from './alpha20-lesson-ui.mjs';
import {openAlpha20Store} from './alpha20-store.mjs';
import {loadLearnerContentAccess} from './content-access-client.mjs';

const context = globalThis.__LANGUAGES_SESSION_CONTEXT__;
const app = document.querySelector('#app');
document.querySelector('#profile-name').textContent = context.displayName;
const store = openAlpha20Store();
let lesson = null;
let routeVersion = 0;

async function home(version) {
  const [hydrated, access] = await Promise.all([store.hydrate(), loadLearnerContentAccess()]);
  if (version !== routeVersion) return;
  if (!hydrated.synced) throw new Error('Could not load saved progress. Please retry.');
  const events = hydrated.state.events;
  const introduced = new Set(events.filter(e => e.mechanic === 'intro' && e.completed).flatMap(e => e.targets));
  app.className = 'portfolio-home';
  app.lang = 'en'; app.dir = 'ltr';
  app.innerHTML = '<section class="portfolio-card"><p class="eyebrow">YOUR HEBREW PRACTICE</p><h1>Ready for a few new words?</h1><p>Learn, practise and return whenever you are ready.</p><button type="button" id="start-lesson" class="primary">Start or continue lesson</button><p id="progress-summary" role="status"></p></section><section class="portfolio-words"><h2>Everyday words</h2><div id="word-list"></div></section>';
  document.querySelector('#progress-summary').textContent = `${introduced.size} of 8 words introduced · ${events.length} saved learning actions`;
  for (const word of access.catalog.flatMap(pack => pack.words)) {
    const card = document.createElement('article');
    const image = document.createElement('img'); image.src = word.image; image.alt = word.meaning;
    const he = document.createElement('strong'); he.lang = 'he'; he.dir = 'rtl'; he.textContent = word.displayTarget;
    const meaning = document.createElement('span'); meaning.textContent = word.meaning;
    card.append(image, he, meaning); document.querySelector('#word-list').append(card);
  }
  document.querySelector('#start-lesson').onclick = () => { location.hash = 'lesson'; };
}

async function render() {
  const version = ++routeVersion;
  lesson?.destroy(); lesson = null;
  app.replaceChildren();
  try {
    if (location.hash === '#lesson') {
      lesson = mountAlpha20Lesson(app, {store, daily: true, initialBlock: 0,
        course: {id: 'he-alpha20', revision: 'he-daily-v1', direction: 'rtl', blocks: [], vocabulary: []},
        coverage: () => ({ready: 0, total: 0}), onExit: () => { location.hash = 'home'; }});
    } else await home(version);
  } catch (error) {
    if (version !== routeVersion) return;
    app.textContent = String(error.message);
    app.setAttribute('role', 'alert');
  }
}
window.addEventListener('hashchange', render);
void render();
