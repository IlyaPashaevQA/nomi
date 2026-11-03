# Nomi Hebrew Practice

[![Nomi QA](https://github.com/IlyaPashaevQA/nomi/actions/workflows/qa.yml/badge.svg)](https://github.com/IlyaPashaevQA/nomi/actions/workflows/qa.yml)

A portable edition of the Hebrew learning core from Nomi 0.5, a personal language-learning product built and iterated by Ilia Pashaev with AI coding assistants.

The application introduces vocabulary before practice, saves lesson checkpoints and supports continuing after a reload. This repository pairs the actual shared lesson runtime with a small local server, synthetic learner profiles and a focused QA portfolio.

## Start here

- [Playwright tests in TypeScript](tests/e2e/lesson.spec.ts)
- [Home page object](tests/e2e/pages/NomiHomePage.ts)
- [Lesson page object](tests/e2e/pages/LessonPage.ts)
- [Isolated server fixture](tests/e2e/fixtures.ts)
- [Python persistence tests](tests/python/test_store.py)
- [Production planner tests](tests/unit/planner.test.mjs)
- [Synchronization case study](docs/synchronization-case-study.md)
- [Architecture and scope](docs/architecture.md)

## Run locally

Requirements: Python 3.11+ and Node.js 22+. The application server uses only Python's standard library. No API keys, cloud services or production data are needed.

```bash
python3 demo_server.py
```

Open **http://127.0.0.1:4173** and select Demo Learner A or B. Eight everyday words are included. Each profile has separate progress in a local SQLite database under `.demo-data/` and profile-specific browser storage. This directory is ignored by Git.

The server binds only to localhost. Its two demonstration capabilities are an exercise in profile isolation, not a production sign-in system. Do not expose this adapter to the internet as a real learner service.

## Run the tests

```bash
npm ci
npx playwright install --with-deps chromium
npm test
```

Individual checks:

```bash
npm run test:unit
npm run test:api
npm run typecheck
npm run test:e2e
npx playwright show-report
```

On Windows, `py demo_server.py` can replace `python3 demo_server.py`. For browser tests, set the `PYTHON` environment variable to your Python executable if it is not named `python3`.

The TypeScript suite uses Page Objects to centralize UI operations. Every test starts a real local HTTP server on an automatically assigned port with its own temporary SQLite database. Browser contexts are isolated by Playwright. The suite covers desktop and phone-sized Chromium locally and the installed Google Chrome on GitHub Actions (Ubuntu 24.04). The browser sandbox stays enabled. A phone viewport is not a physical iPhone or Safari test.

## What is tested

| Layer | Behaviors |
| --- | --- |
| Browser | Vocabulary home, lesson start, reload continuation, double tap deduplication, profile switching, cross-profile denial, introduction-to-practice persistence |
| Python | Stale-revision conflict without a retained lock, append-only events, duplicate IDs, separate profiles, persistence after reopening |
| JavaScript | Ten-word session introduction ceiling, review with zero new-word allowance, preservation of a deliberately small valid lesson |

Tests assert user-visible behavior and accepted server history. They do not replace the browser's audio implementation, pre-fill real learner histories or bypass answer controls.

## Origin and boundaries

The planner, lesson renderer, client checkpoint handling and shared mechanics were exported from Nomi 0.5 on 3 November 2026. [The source manifest](docs/source-manifest.json) records original and exported file hashes and identifies transformations. The standalone home, local Python adapter and TypeScript suite were added for this portable edition. They are not presented as historical production code.

This is a bounded extraction of the Hebrew lesson core, **not the entire deployed Personal Hub or every Nomi feature**. It omits family accounts, real progress, parent editorial tools, schoolbook reading passages, external content delivery and Nomi 0.6 work. The local adapter does not implement the production trusted-learning ledger or the full production admission system. Demo events explicitly do not claim trusted assessment evidence.

## My role and AI assistance

I define the learning requirements and expected behavior, exercise the product, report and investigate problems, and guide iterations with AI coding assistants. AI tools help implement code, write tests and investigate failures. I review behavior and test evidence as part of this workflow. This project demonstrates AI-assisted product and QA work; it does not claim that every line was manually authored without assistance.

## Known limitations

- The eight-word sample demonstrates the learning core, not the full private curriculum.
- Automated browser checks do not prove teaching effectiveness, human pronunciation quality or physical-device compatibility.
- The local SQLite adapter deliberately has a smaller scope than the deployed backend.
- The eight synthetic pronunciation clips have separate provenance and licensing notes in ASSETS.md; these MP3 files are excluded from the MIT code license.

See [privacy and media notes](docs/export-review.md) and [asset provenance](ASSETS.md).

## License

Source code, tests and documentation are licensed under the [MIT License](LICENSE), copyright 2026 Ilia Pashaev. Audio and other media are excluded unless explicitly licensed in [ASSETS.md](ASSETS.md). Dependencies retain their respective upstream licenses.
