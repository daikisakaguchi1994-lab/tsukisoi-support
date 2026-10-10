import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

// ご利用例（想定のシーン）。実際のお客様の事例・実績に見える書き方をしない。許認可が要る手配・福祉タクシーには触れない
const SLUGS = readdirSync('src/content/cases').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

test('there are 11 use cases in 4 genres, each with a detail page', async ({ page }) => {
  expect(SLUGS.length).toBe(11);
  await page.goto('/cases');
  await expect(page.locator('[data-case-card]')).toHaveCount(11);
  await expect(page.locator('[data-genre-section]')).toHaveCount(4);
  await expect(page.locator('[data-genre-link]')).toHaveCount(4);
  await expect(page.getByTestId('case-disclaimer')).toContainText('実際のお客様の事例ではありません');
});

test('genre navigation jumps to its section', async ({ page }) => {
  await page.goto('/cases');
  await page.locator('[data-genre-link]').nth(2).click();
  await expect(page).toHaveURL(/#genre-3$/);
});

for (const slug of SLUGS) {
  test(`case page ${slug}: heading, disclaimer, help list, price, two consult buttons`, async ({ page }) => {
    await page.goto(`/cases/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('figcaption')).toContainText('実際のお客様の事例ではありません');
    expect(await page.getByTestId('case-help').locator('li').count()).toBeGreaterThanOrEqual(3);
    await expect(page.locator('.price-body')).toContainText('円（税込）〜');
    for (const id of ['case-cta', 'case-cta-bottom']) {
      await expect(page.getByTestId(id).getByRole('link', { name: 'この内容で相談する' })).toHaveAttribute('href', `/contact?case=${slug}#contact-form`);
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const text = await page.locator('main').innerText();
    // 事例・実績・体験談に見える言い方、手配・福祉タクシー・身体介助・医療行為の約束をしない
    for (const word of ['お客様の声', '実績', '満足度', '福祉タクシー', 'お手配します', '手配いたします', '介護', '入浴', '医療行為']) {
      expect(text, word).not.toContain(word);
    }
  });
}

test('trip cases say that transport and lodging arrangements are not included', async ({ page }) => {
  for (const slug of ['ryokou-kokunai', 'ryokou-kaigai']) {
    await page.goto(`/cases/${slug}`);
    await expect(page.locator('main')).toContainText('手配は含まれません');
  }
});

test('case page without a photo shows the genre colour fallback and says the photo is being prepared', async ({ page }) => {
  await page.goto('/cases/tsuin');
  const media = page.locator('[data-case-media]');
  await expect(media).toBeVisible();
  if ((await media.locator('img').count()) === 0) await expect(page.locator('figcaption')).toContainText('写真は準備中です');
  else await expect(page.locator('figcaption')).toContainText('画像はイメージです');
});

test('consult button carries the case into the form: kind is selected and the first line is filled', async ({ page }) => {
  await page.goto('/cases/ryokou-kokunai');
  await page.getByTestId('case-cta').getByRole('link', { name: 'この内容で相談する' }).click();
  await expect(page).toHaveURL(/\/contact\?case=ryokou-kokunai#contact-form$/);
  await expect(page.getByTestId('case-from')).toContainText('国内旅行への付き添い');
  await expect(page.locator('input[name="inquiry_kind"][value="旅行の付き添い"]')).toBeChecked();
  await expect(page.locator('#message')).toHaveValue(/【ご利用例「国内旅行への付き添い（1泊2日〜）」について】/);
});

test('an unknown case slug is ignored by the contact form', async ({ page }) => {
  await page.goto('/contact?case=does-not-exist');
  await expect(page.getByTestId('case-from')).toBeHidden();
  await expect(page.locator('#message')).toHaveValue('');
});

test('cases are linked from the service page', async ({ page }) => {
  await page.goto('/service');
  await expect(page.getByTestId('case-groups').locator('a')).toHaveCount(11);
  await page.getByRole('link', { name: 'ご利用例をすべて見る' }).click();
  await expect(page).toHaveURL(/\/cases\/?$/);
  expect(readFileSync('src/pages/service.astro', 'utf8')).toContain('id="prices"');
});

// ボタンの動き: 色の変化は 180ms、押した瞬間は 70ms。触れても動かない（押したときだけ沈む）。
// テスト全体は動きを減らす設定で動かしているので、この検証だけ通常の設定にする（減らす設定では transition が止まることも別に確認）
test.describe("button motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test("is calm: colour 180ms, press 70ms, no movement on hover", async ({ page }) => {
    await page.goto("/cases/tsuin");
    const btn = page.getByTestId("case-cta").getByRole("link", { name: "この内容で相談する" });
    const t = await btn.evaluate((el) => { const c = getComputedStyle(el); return { prop: c.transitionProperty, dur: c.transitionDuration }; });
    expect(t.prop).toContain("background-color");
    expect(t.dur).toContain("0.18s");
    expect(t.dur).toContain("0.07s");
    await btn.hover();
    await page.waitForTimeout(300);
    expect(await btn.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  });
});

test("reduced motion turns button transitions off", async ({ page }) => {
  await page.goto("/cases/tsuin");
  const prop = await page.getByTestId("case-cta").getByRole("link", { name: "この内容で相談する" }).evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(prop).toBe("none");
});

test('cards, chips and buttons meet the 44px touch size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cases');
  for (const sel of ['[data-genre-link]', '.btn-solid']) {
    const box = (await page.locator(sel).first().boundingBox())!;
    expect(box.height, sel).toBeGreaterThanOrEqual(44);
  }
  await page.goto('/service');
  const chip = (await page.locator('.chip').first().boundingBox())!;
  expect(chip.height).toBeGreaterThanOrEqual(44);
});

test('no horizontal scroll on case pages at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ['/cases', '/cases/tsuin', '/cases/ryokou-kokunai', '/service']) {
    await page.goto(path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, path).toBeLessThanOrEqual(0);
  }
});
