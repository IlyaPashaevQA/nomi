import {expect, type Locator, type Page} from '@playwright/test';

export class LessonPage {
  readonly nextButton: Locator;
  readonly word: Locator;
  readonly exitButton: Locator;

  constructor(readonly page: Page) {
    this.nextButton = page.locator('#alpha20-stage .luni-next');
    this.word = page.locator('#alpha20-stage .luni-prompt');
    this.exitButton = page.getByRole('button', {name: 'לצאת מהשיעור'});
  }

  async expectIntroduction(word: string) {
    await expect(this.word).toHaveText(word);
    await expect(this.nextButton).toBeEnabled();
  }

  async nextIntroduction(nextWord: string) {
    await this.nextButton.click();
    await this.expectIntroduction(nextWord);
  }

  async doublePressNext() {
    // Two events on the same rendered control reproduce a fast double tap.
    await this.nextButton.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  }

  async reload() {
    await this.page.reload();
  }

  async completeIntroductions() {
    const words = ['בַּיִת', 'סֵפֶר', 'עֵץ', 'דָּג', 'פֶּרַח', 'מַיִם', 'כֶּלֶב', 'חָתוּל'];
    for (const word of words) {
      await this.expectIntroduction(word);
      await this.nextButton.click();
    }
  }

  async answerFirstPracticeChoice() {
    const answer = this.page.locator('#alpha20-stage .orbit-answer').first();
    await expect(answer).toBeEnabled({timeout: 12_000});
    await answer.click();
  }

  async leave() {
    await this.exitButton.click();
    await expect(this.page.getByRole('button', {name: 'Start or continue lesson'})).toBeVisible();
  }
}
