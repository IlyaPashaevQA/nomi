# QA coverage and reviewer walkthrough

## Product under test

Nomi is a personal Hebrew-learning product. This edition extracts a real lesson core into a runnable local demo with eight words and two synthetic learner profiles. The UI, HTTP adapter, SQLite persistence and automated tests are included.

This portfolio was prepared with AI coding assistants. The maintainer defines requirements, investigates product behavior and reviews test evidence. It is personal project work.

## A two-minute code review

1. Open [lesson.spec.ts](../tests/e2e/lesson.spec.ts) for readable scenarios.
2. Follow [NomiHomePage](../tests/e2e/pages/NomiHomePage.ts) and [LessonPage](../tests/e2e/pages/LessonPage.ts) for locators and UI actions.
3. Inspect [fixtures.ts](../tests/e2e/fixtures.ts): each test launches an actual HTTP server and its own temporary SQLite database.
4. Inspect [HTTP tests](../tests/python/test_http.py) and [persistence tests](../tests/python/test_store.py).
5. Open the [passing hosted run](https://github.com/IlyaPashaevQA/nomi/actions/runs/41619278698).

## Requirements and coverage

Each scenario runs at desktop and phone-sized viewports: **7 distinct scenarios, 14 executions**.

| ID | Requirement / risk | Actions and expected result |
| --- | --- | --- |
| QA-01 | Available vocabulary and narrow layouts | Open a fresh profile. Eight cards exist, progress is zero and the page has no horizontal overflow. |
| QA-02 | Introduction before practice | Start a fresh lesson. House is introduced first; Next becomes available after the introduction. |
| QA-03 | Reload must preserve accepted progress | Introduce the first word, reload at the second word, and leave. The second word resumes and one introduced word remains recorded. |
| QA-04 | Repeated activation must not duplicate progress | Trigger two immediate activations of the same rendered Next control. The second word is shown and only one introduction is recorded. This targets duplicate DOM events, not physical touchscreen timing. |
| QA-05 | Separate learner progress | Introduce a word in A, visit B, return to A. B stays at zero and A retains its progress. |
| QA-06 | Profile access isolation | Request B's journal with A's token: 403. A's own endpoint remains accessible. Demo capabilities are not production authentication. |
| QA-07 | Persist practice responses | Complete eight introductions and answer a practice choice. A successful actual HTTP response contains event nine; the UI reports nine saved actions. The answer may be correct or incorrect: this verifies persistence, not answer scoring. |

The suite uses Playwright retrying assertions and real HTTP responses. Page Objects centralize locators and reusable UI actions; expectations remain explicit.

## API and database checks

Python tests exercise the actual handler and SQLite store: cross-profile and cross-origin denial; malformed body rejection; route/path protection; stale-revision conflicts without retained locks; immutable, unique events; profile isolation; persistence after reopening.

JavaScript unit tests cover the ten-new-word ceiling, review with zero new-word allowance and preservation of a small valid lesson.

## Evidence and limits

The linked hosted run passed 14 browser executions, 12 Python tests, 3 JavaScript unit tests and TypeScript checking.

A fresh anonymous public clone was installed and exercised on 3 November 2026: lesson start, actual audio gating, reload continuation and profile isolation passed, without page-level JavaScript errors. The README screenshots come from that run.

The public suite does not cover a complete ten-minute lesson, every mechanic, physical iPhone/Safari, or every private synchronization-recovery branch. The [case study](synchronization-case-study.md) distinguishes historical evidence from the public reproducer.

This demonstrates AI-assisted automation around a real product. It does not establish commercial QA tenure or healthcare-domain experience.
