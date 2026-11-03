import {expect, type Locator, type Page} from '@playwright/test';
import {LessonPage} from './LessonPage.js';

export type DemoProfile = 'demo-a' | 'demo-b';

export class NomiHomePage {
  readonly startButton: Locator;
  readonly progress: Locator;
  readonly words: Locator;

  constructor(readonly page: Page, readonly origin: string) {
    this.startButton = page.getByRole('button', {name: 'Start or continue lesson'});
    this.progress = page.locator('#progress-summary');
    this.words = page.locator('#word-list article');
  }

  async open(profile: DemoProfile = 'demo-a') {
    await this.page.goto(`${this.origin}/${profile}/languages-v05/`);
    await expect(this.startButton).toBeVisible();
  }

  async startLesson() {
    await this.startButton.click();
    const lesson = new LessonPage(this.page);
    await lesson.expectIntroduction('בַּיִת');
    return lesson;
  }

  async expectIntroduced(count: number) {
    await expect(this.progress).toContainText(`${count} of 8 words introduced`);
  }
}
