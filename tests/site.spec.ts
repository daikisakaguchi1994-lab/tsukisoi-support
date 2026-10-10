import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { NAV_ITEMS, SITE, isTelConfigured } from '../src/config';

// お知らせ・読み物の記事は src/content/news/*.md から自動で拾う
const ARTICLES = readdirSync('src/content/news')
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/news/${f.replace(/\.md$/, '')}`);
const PAGES = ['/', '/service', '/contact', '/thanks', '/news', '/about', '/links', ...ARTICLES];

// 公開前の方針: 公開判断が出るまで全ページ noindex
for (const path of PAGES) {
  test(`keeps noindex before launch: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page).toHaveTitle(/つきそいサポート/);
  });
}

// 未設定のプレースホルダーや、参考サイト・旧ブランド固有の情報を画面に出さない
// 比較は大文字小文字を区別しない
const FORBIDDEN_TEXT = [
  '{{', 'ウェルネス', 'Travel buddy', 'travelbuddy', 'kamiina', 'カミーナ', '075-600-0325',
  'トラベルバディ', '京都観光モラル', '文化時報', 'FULL YELL', 'トラベルヘルパー', '000-0000-0000',
];
for (const path of PAGES) {
  test(`shows no placeholder or borrowed identity: ${path}`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator('body').innerText();
    for (const word of FORBIDDEN_TEXT) expect(text.toLowerCase(), word).not.toContain(word.toLowerCase());
  });
}

test('every navigation item leads to an existing page or section', async ({ page, request }) => {
  for (const item of NAV_ITEMS) {
    const [pathname, hash] = item.href.split('#');
    const res = await request.get(pathname || '/');
    expect(res.status(), item.href).toBeLessThan(400);
    if (hash) {
      await page.goto(item.href);
      await expect(page.locator(`#${hash}`), item.href).toHaveCount(1);
    }
  }
});

// 許可・登録が未確認の間は、取得済みと読める表記や、通常の提供メニューとしての表示をしない
const LICENSE_CLAIMS = ['取得済み', '許可済み', '許可を取得', '登録済み', '登録を取得', '認可'];
for (const path of PAGES) {
  test(`makes no license claims: ${path}`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator('body').innerText();
    for (const word of LICENSE_CLAIMS) expect(text, word).not.toContain(word);
  });
}

// 実績・利用者の声があるように読める表現は、事実を確認するまで書かない（仮原稿を含む）
const TRACK_RECORD_CLAIMS = ['よくいただ', '多数', 'お客様の声', 'ご好評', '多くの方', '実績があ', '累計'];
for (const path of PAGES) {
  test(`makes no track-record claims: ${path}`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator('body').innerText();
    for (const word of TRACK_RECORD_CLAIMS) expect(text, word).not.toContain(word);
  });
}

// 狭い画面でボタンの文字が1文字だけ次の行に孤立しない（1行に収まる）
test('article back button stays on one line at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(ARTICLES[0]);
  const box = await page.getByRole('link', { name: '一覧に戻る' }).boundingBox();
  expect(box!.height).toBeLessThan(70);
});

// 未確定の電話番号に発信できる導線を出さない（確定したら自動で表示される）
for (const path of PAGES) {
  test(`has no dialable link while the phone number is unset: ${path}`, async ({ page }) => {
    test.skip(isTelConfigured(SITE.TEL), 'phone number is configured');
    await page.goto(path);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('body')).toContainText('電話相談は準備中');
  });
}

test('mobile menu opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('#menu-toggle');
  const menu = page.locator('#mobile-menu');
  await expect(menu).toBeHidden();
  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'メニューを閉じる' })).toBeVisible();
  await toggle.click();
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'メニューを開く' })).toBeVisible();
});

test('mobile menu resets its name after choosing a link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#menu-toggle').click();
  await page.locator('#mobile-menu a[href="/service"]').click();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'メニューを開く' })).toHaveAttribute('aria-expanded', 'false');
});

// 動きを減らす設定では、Scroll の点滅を止める（設定なしのときは動く）
test('scroll cue stops pulsing under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const cue = page.locator('a[aria-label="下へスクロール"] span');
  expect(await cue.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
test('scroll cue pulses when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const cue = page.locator('a[aria-label="下へスクロール"] span');
  expect(await cue.evaluate((el) => getComputedStyle(el).animationName)).toBe('pulse');
});

for (const width of [1440, 390, 320]) {
  for (const path of ['/', '/service', '/contact', '/news', '/about', '/links', ARTICLES[0]]) {
    test(`no horizontal overflow at ${width}px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

// 公開できる料金は、許可・登録が不要な付き添いの基本料金だけ
test('service page lists only the base price', async ({ page }) => {
  await page.goto('/service');
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(page.locator('table')).toContainText('3,300円〜');
});

// 福祉タクシー・旅行の手配は、確認が済むまで料金も「提供中」の表現も出さず、準備中と明記する
test('service page marks taxi and travel arrangement as preparing, without prices', async ({ page }) => {
  await page.goto('/service');
  const upcoming = page.getByTestId('upcoming-menu');
  await expect(upcoming).toContainText('福祉タクシー');
  await expect(upcoming).toContainText('旅行の手配');
  await expect(upcoming.getByText('準備中', { exact: true })).toHaveCount(2);
  const text = await page.locator('main').innerText();
  for (const price of ['49,500', '33,000', '3,550', '1,770', 'オプション']) expect(text, price).not.toContain(price);
});

// お知らせ・読み物（参考サイトの構成に合わせた一覧・記事ページ）
test('news list shows every article, newest first', async ({ page }) => {
  await page.goto('/news');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('お知らせ・読み物');
  await expect(page.getByRole('navigation', { name: 'パンくずリスト' })).toBeVisible();
  const items = page.locator('main ul > li a[href^="/news/"]');
  await expect(items).toHaveCount(ARTICLES.length);
  const dates = await page.locator('main ul > li time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime') ?? ''));
  expect(dates).toEqual([...dates].sort().reverse());
});

for (const path of ARTICLES) {
  test(`article page has breadcrumb, date and a way back: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'パンくずリスト' })).toContainText('お知らせ・読み物');
    await expect(page.locator('article header time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole('link', { name: '一覧に戻る' })).toHaveAttribute('href', '/news');
  });
}

// 未確定の情報は「準備中」にする（人名・資格・経歴・団体を仮の値で埋めない）
test('about and links show preparing notices while details are unset', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('私たちについて');
  await expect(page.locator('main')).toContainText('お名前は準備中です');
  await expect(page.locator('main').getByText('準備中です', { exact: true })).toHaveCount(2);
  await page.goto('/links');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('関連リンク');
  await expect(page.locator('main a[target="_blank"]')).toHaveCount(0);
  await expect(page.locator('main').getByText('準備中です', { exact: true })).toHaveCount(2);
});
