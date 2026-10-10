import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { NAV_ITEMS, SITE, SAMPLE_PREVIEW, isFormOpen, isTelConfigured } from '../src/config';
import { SAMPLE_VALUES } from '../src/config.sample';

// お知らせ・読み物の記事は src/content/news/*.md から自動で拾う
const ARTICLES = readdirSync('src/content/news')
  .filter((f) => f.endsWith('.md'))
  .map((f) => `/news/${f.replace(/\.md$/, '')}`);
const PAGES = ['/', '/service', '/contact', '/thanks', '/news', '/about', '/links', '/privacy', ...ARTICLES];

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

// 参考サイトの本文と照合して見つかった言い回し（2026-10-10 照合）。自前の文章に書き換えたので再発させない
// 照合は scripts/compare-reference.py で行う
const BORROWED_PHRASES = [
  'お支払いのご案内', '後日払いをご希望', 'ご希望の場所・内容', '対面でのお打ち合わせは有料', 'ご希望の日時とサポート内容',
  'Please feel free to contact us', '詳しいサービスについて', '旅行の各種手配', '1時間あたりのご利用料金', 'あわせてご確認ください', '半日・1日ご利用の場合は割引',
];
for (const path of PAGES) {
  test(`does not reuse reference-site wording: ${path}`, async ({ page }) => {
    await page.goto(path);
    const text = await page.locator('body').innerText();
    for (const phrase of BORROWED_PHRASES) expect(text, phrase).not.toContain(phrase);
  });
}

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

// 動きを減らす設定では、Scroll の矢印の動きを止める（設定なしのときは動く）。文字は点滅させない（濃さが変わるとコントラストが落ちる）
test('scroll cue stops moving under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const chevron = page.locator('[data-scroll-chevron]');
  expect(await chevron.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
test('scroll cue moves when motion is allowed, but its text never blinks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  expect(await page.locator('[data-scroll-chevron]').evaluate((el) => getComputedStyle(el).animationName)).toBe('bounce');
  const text = await page.locator('[data-scroll-cue] span').evaluate((el) => {
    const names: string[] = [];
    for (let n: Element | null = el; n && n.id !== 'hero'; n = n.parentElement) names.push(getComputedStyle(n).animationName);
    return names;
  });
  expect(text.every((n) => n === 'none'), text.join(',')).toBe(true);
});

// 濃い背景のコントロールは、キーボードで移動したときの枠が白で、3px 以上ある（非文字 3:1 以上）
test('hero controls show a white focus ring', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const sel of ['[data-dot="4"]', '#hero-toggle', '[data-scroll-cue]']) {
    const target = page.locator(sel);
    await page.keyboard.press('Tab');
    for (let i = 0; i < 30 && !(await target.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab');
    const ring = await target.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle };
    });
    expect(ring, sel).toEqual({ color: 'rgb(255, 255, 255)', width: 3, style: 'solid' });
  }
});

// 320px でも、サブコピーの最後の行が「を —」のように孤立しない（最終行が文字の幅の 4 倍以上ある）
test('hero sub copy has no orphaned last line at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  for (let i = 0; i < 5; i++) {
    await page.locator(`[data-dot="${i}"]`).click();
    const sub = page.locator('[data-slide][aria-hidden="false"] [data-copy-sub]');
    if ((await sub.count()) === 0) continue;
    const m = await sub.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 1);
      const tops = [...new Set(rects.map((r) => Math.round(r.top)))].sort((x, y) => x - y);
      const last = rects.filter((r) => Math.round(r.top) === tops[tops.length - 1]);
      const width = Math.max(...last.map((r) => r.right)) - Math.min(...last.map((r) => r.left));
      return { lines: tops.length, lastWidth: width, font: parseFloat(getComputedStyle(el).fontSize) };
    });
    if (m.lines > 1) expect(m.lastWidth, `slide ${i + 1}: ${JSON.stringify(m)}`).toBeGreaterThanOrEqual(m.font * 4);
  }
});

for (const width of [1440, 390, 320]) {
  for (const path of ['/', '/service', '/contact', '/news', '/about', '/links', '/privacy', ARTICLES[0]]) {
    test(`no horizontal overflow at ${width}px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

// 公開できる料金は、許可・登録が不要な「付き添い」の基本料金だけ（参考サイトの料金表と同じ作り: 濃い見出し帯 + 本文）
test('service page lists the accompaniment prices as header bars', async ({ page }) => {
  await page.goto('/service');
  const list = page.getByTestId('price-list');
  const heads = list.locator('.price-head');
  await expect(heads).toHaveText([
    '▼ 1時間のご利用料金',
    '▼ 国内・宿泊旅行の付き添い　基本料金',
    '▼ 海外旅行の付き添い　基本料金',
    '▼ 福祉タクシー（利用条件あり）',
    '▼ 旅行の手配について',
  ]);
  for (const price of ['3,300円（税込）〜', '49,500円（税込）〜', '33,000円（税込）〜']) await expect(list).toContainText(price);
  // 付き添いの料金に、交通・宿泊の手配は含まない旨を明記
  await expect(list).toContainText('交通・宿泊の手配は含みません');
});

// 福祉タクシー・旅行の手配は、確認が済むまで料金も「提供中」の表現も出さず、準備中と明記する
test('service page marks taxi and travel arrangement as preparing, without prices', async ({ page }) => {
  await page.goto('/service');
  const upcoming = page.getByTestId('upcoming-menu');
  await expect(upcoming).toContainText('福祉タクシー');
  await expect(upcoming).toContainText('旅行の手配');
  await expect(upcoming.getByText('準備中', { exact: true })).toHaveCount(2);
  await expect(upcoming).not.toContainText('円');
  const text = await page.locator('main').innerText();
  for (const price of ['3,550', '1,770', 'オプション']) expect(text, price).not.toContain(price);
});

// 参考サイトに合わせた作り: ご利用の流れは3つの STEP、ご利用例はチップ（各詳細へのリンク）
test('service page follows the reference layout: 3 steps, price blocks, usage chips', async ({ page }) => {
  await page.goto('/service');
  await expect(page.getByRole('heading', { level: 2, name: 'ご利用の流れ' })).toBeVisible();
  await expect(page.locator('.step')).toHaveCount(3);
  await expect(page.locator('.step-badge').first()).toContainText('STEP');
  await expect(page.getByRole('heading', { level: 2, name: '基本料金' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'ご利用例' })).toBeVisible();
  await expect(page.locator('.chip')).toHaveCount(11); // ご利用例11件（src/content/cases）
  await expect(page.locator('.chip').first()).toHaveAttribute('href', /^\/cases\//);
  await expect(page.getByRole('navigation', { name: 'パンくずリスト' })).toContainText('サービス');
});

// トップは参考サイトと同じ順番: 全面スライド → 導入 → お知らせ → 6つの特徴 → 旅行の手配 → 電話
test('home page has a full-screen slideshow hero followed by the reference section order', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const hero = page.locator('#hero');
  const box = (await hero.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(560);
  expect(box.width).toBeGreaterThanOrEqual(1400);
  await expect(page.locator('[data-slide]')).toHaveCount(5);
  await expect(page.locator('[data-dot]')).toHaveCount(5);
  await expect(page.locator('[data-slide] img')).toHaveCount(5); // public/images/hero/hero-1〜5.jpg
  const headings = await page.locator('main h2').allInnerTexts();
  expect(headings.map((h) => h.trim())).toEqual(['最新のお知らせ', 'つきそいサポートの6つの特徴', '旅行の手配について']);
  await expect(page.locator('#features li')).toHaveCount(6);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

// スライドはドットで手動切り替えできる（動きを減らす設定でも）
test('hero slides can be switched with the dots', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-dot="2"]').click();
  await expect(page.locator('[data-slide]').nth(2)).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('[data-slide]').nth(0)).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-dot="2"]')).toHaveAttribute('aria-current', 'true');
});

// 切り替えても、読み上げの見出し（h1）が消えない（Codex 指摘）
test('the h1 stays available while slides change', async ({ page }) => {
  await page.goto('/');
  for (const i of [1, 2, 3, 4, 0]) {
    await page.locator(`[data-dot="${i}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});

// ドットの操作領域は 24px 以上（WCAG 2.5.8）
test('slide dots have a tap target of at least 24px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const boxes = await page.locator('[data-dot]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(5);
  for (const b of boxes) {
    expect(b.width).toBeGreaterThanOrEqual(24);
    expect(b.height).toBeGreaterThanOrEqual(24);
  }
});

// 自動切り替えは止められる（WCAG 2.2.2）。止めている間は切り替わらず、再開すると切り替わる
test('auto-advance can be paused and resumed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/');
  const toggle = page.locator('#hero-toggle');
  const active = () => page.locator('[data-slide][aria-hidden="false"]').evaluateAll((els) => els.map((e) => [...e.parentElement!.children].indexOf(e)));
  const firstIndex = (await active())[0];
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await page.clock.fastForward(7000);
  expect((await active())[0]).not.toBe(firstIndex);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAccessibleName('スライドの自動切り替えを再開する');
  const stopped = (await active())[0];
  await page.clock.fastForward(30000);
  expect((await active())[0]).toBe(stopped);

  await toggle.click();
  await expect(toggle).toHaveAccessibleName('スライドの自動切り替えを止める');
  await page.clock.fastForward(7000);
  expect((await active())[0]).not.toBe(stopped);
});

// 動きを減らす設定では、最初から止まっていて、再開ボタンで動かせる
test('auto-advance starts paused under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('#hero-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.fastForward(30000);
  await expect(page.locator('[data-slide]').first()).toHaveAttribute('aria-hidden', 'false');
});

// 各スライドの小さい白文字は、写真の上でも 4.5:1 以上（大きい見出しは 3:1 以上）。画面に出た画素で実測する（Codex 指摘）
for (const [width, height] of [[1440, 900], [390, 844]] as const) {
  test(`hero text keeps its contrast on every slide at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    for (let i = 0; i < 5; i++) {
      await page.locator(`[data-dot="${i}"]`).click();
      await page.waitForTimeout(1600); // 切り替えの 1.4 秒を待つ
      const targets = await page.evaluate(() => {
        const rectOf = (el: Element) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          return r.getBoundingClientRect().toJSON();
        };
        const active = document.querySelector('[data-slide][aria-hidden="false"]')!;
        const out: { name: string; rect: DOMRect; min: number }[] = [];
        const add = (name: string, el: Element | null, min: number) => el && out.push({ name, rect: rectOf(el) as DOMRect, min });
        add('en', active.querySelector('[data-copy-en]'), 4.5);
        add('title', active.querySelector('[data-copy-title]'), 3);
        add('sub', active.querySelector('[data-copy-sub]'), 4.5);
        add('scroll', document.querySelector('[data-scroll-cue] span'), 4.5);
        // 文字・ボタンを隠して、背景だけを撮る
        for (const el of document.querySelectorAll('[data-copy], [data-scroll-cue], #hero-toggle, [data-dot]')) (el as HTMLElement).style.visibility = 'hidden';
        return out;
      });
      const png = (await page.screenshot()).toString('base64');
      const results = await page.evaluate(
        async ({ png, targets }) => {
          const blob = await (await fetch(`data:image/png;base64,${png}`)).blob();
          const bmp = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(bmp, 0, 0);
          const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
          return targets.map((t) => {
            const x = Math.max(0, Math.floor(t.rect.x)), y = Math.max(0, Math.floor(t.rect.y));
            const w = Math.max(1, Math.min(bmp.width - x, Math.ceil(t.rect.width))), h = Math.max(1, Math.min(bmp.height - y, Math.ceil(t.rect.height)));
            const data = ctx.getImageData(x, y, w, h).data;
            const ls: number[] = [];
            for (let k = 0; k < data.length; k += 4) ls.push(0.2126 * lin(data[k]) + 0.7152 * lin(data[k + 1]) + 0.0722 * lin(data[k + 2]));
            ls.sort((a, b) => a - b);
            const bright = ls[Math.floor(ls.length * 0.95)]; // 明るい側 5% でも足りること
            return { name: t.name, min: t.min, ratio: 1.05 / (bright + 0.05) };
          });
        },
        { png, targets },
      );
      for (const r of results) expect(r.ratio, `slide ${i + 1} ${r.name} @${width}px`).toBeGreaterThanOrEqual(r.min);
      await page.reload();
    }
  });
}

// ヘッダーは参考サイトと同じ: ロゴを中央に、ナビをその下に中央寄せ。現在のページに下線
test('header centers the logo and nav, and marks the current page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/service');
  const logo = (await page.locator('#site-header a[aria-label$="トップページ"]').boundingBox())!;
  expect(Math.abs(logo.x + logo.width / 2 - 720)).toBeLessThan(8);
  const nav = page.getByRole('navigation', { name: 'メインナビゲーション' });
  const navBox = (await nav.boundingBox())!;
  expect(navBox.y).toBeGreaterThan(logo.y + logo.height - 4);
  await expect(nav.locator('a[aria-current="page"]')).toHaveText(/サービス/);
});

// 参考サイトの装飾に近づけた部品（濃い見出し帯・左に線が付く下線見出し）がページ内で使われている
test('pages use the heading bar and underlined titles', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('h1.heading-bar')).toHaveText('私たちについて');
  await expect(page.locator('.title-line').first()).toBeVisible();
  await page.goto('/');
  await expect(page.locator('h2.heading-bar')).toHaveCount(2);
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

// サンプル表示は、環境変数がない通常のビルドには一切出ない（本番に偽の連絡先を出さない）
test('normal build never contains sample contact values', async () => {
  expect(SAMPLE_PREVIEW).toBe(false);
});
for (const path of PAGES) {
  test(`shows no sample values or banner in the normal build: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByTestId('sample-banner')).toHaveCount(0);
    const html = await page.content();
    for (const value of [SAMPLE_VALUES.TEL, SAMPLE_VALUES.LINE_URL, SAMPLE_VALUES.INSTAGRAM_URL, SAMPLE_VALUES.EMAIL, SAMPLE_VALUES.ADDRESS, 'サンプル表示中']) {
      expect(html, value).not.toContain(value);
    }
    await expect(page.locator('body')).not.toHaveAttribute('data-sample-preview', /.*/);
  });
}

// 個人情報の取り扱いページは雛形。「雛形・要確認」と「公開前の確認が必要」を必ず明記し、フォームからリンクする
test('privacy page is marked as a draft and the contact form links to it', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('個人情報の取り扱い');
  const notice = page.getByTestId('privacy-draft-notice');
  await expect(notice).toContainText('雛形・要確認');
  await expect(notice).toContainText('正式な文面は公開前に確認が必要です');
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: '個人情報の取り扱い' }).first()).toHaveAttribute('href', '/privacy');
  await expect(page.locator('a[href="#"]')).toHaveCount(0);
});

// バッチ A: 相談フォームと準備中の表示
test('contact form has no furigana field and the privacy page does not mention it', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('#furigana, [name="furigana"]')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('ふりがな');
  await page.goto('/privacy');
  await expect(page.locator('main')).not.toContainText('ふりがな');
});

// LINE は、識別子の受け取り方・返信手順が決まるまで返信方法に出さない（LINE_URL が確定しても出さない）
test('contact form does not offer LINE as a reply method', async ({ page }) => {
  await page.goto('/contact');
  const methods = page.locator('input[name="contact_method"]');
  await expect(methods).toHaveCount(2);
  await expect(page.locator('input[name="contact_method"][value="LINE"]')).toHaveCount(0);
});

// 送信キーがない間は受付前。押せるボタンに見せず、キーを HTML に出さない
// このテストのビルドは送信キーあり・PUBLIC_FORM_OPEN なし（playwright.config.ts）。キーだけでは受付中に見せない
test('contact form stays pending and disabled when the key is set but the open flag is not', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByTestId('form-pending')).toContainText('相談フォームは公開準備中です');
  await expect(page.getByRole('button', { name: '相談内容を送信する' })).toBeDisabled();
  await expect(page.locator('#name')).toBeDisabled();
  await expect(page.locator('input[name="access_key"]')).toHaveCount(0);
  await expect(page.locator('#contact-form')).not.toContainText('{{');
});

test('phone and LINE pending states are plain text, not button-like', async ({ page }) => {
  test.skip(isTelConfigured(SITE.TEL), 'phone number is configured');
  await page.goto('/contact');
  await expect(page.locator('.is-muted')).toHaveCount(0);
  await expect(page.locator('.btn-phone')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('電話相談は準備中です');
});

// 送信キーがあるだけでは受付を開かない。PUBLIC_FORM_OPEN=1 のときだけ開く（受付開始は利用者の判断）
test('form opens only with both the key and the explicit open flag', () => {
  expect(isFormOpen(undefined, '1')).toBe(false);
  expect(isFormOpen('', '1')).toBe(false);
  expect(isFormOpen('key', undefined)).toBe(false);
  expect(isFormOpen('key', '')).toBe(false);
  expect(isFormOpen('key', 'true')).toBe(false);
  expect(isFormOpen('key', '1')).toBe(true);
});

test('pending contact page does not invite to send, and the disabled button looks disabled', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('a[href="#contact-form"]')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('お送りください');
  const bg = await page.getByRole('button', { name: '相談内容を送信する' }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgb(74, 112, 66)');
});

test('privacy page lists every collected form item', async ({ page }) => {
  await page.goto('/privacy');
  for (const item of ['お名前', 'お電話番号', 'メールアドレス', 'ご希望の連絡方法', 'お問い合わせの種類', 'ご相談内容']) {
    await expect(page.locator('main')).toContainText(item);
  }
});

test('contact page uses a clear submit label', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('button', { name: '相談内容を送信する' })).toBeVisible();
});

// 返信方法に応じて連絡先を必須にし、エラーは該当欄の近くに出して入力は消さない
// （フォームの項目は fieldset の disabled を外して検証する。受付前の見た目は別のテストで固定）
test('reply method decides which contact field is required, errors appear next to the field', async ({ page }) => {
  await page.goto('/contact');
  await page.evaluate(() => document.querySelectorAll('fieldset[disabled]').forEach((f) => f.removeAttribute('disabled')));
  await page.fill('#name', '山田 太郎');
  await page.fill('#message', 'テスト');
  await page.check('[name="privacy"]');
  await page.check('input[name="contact_method"][value="電話"]');
  await page.getByRole('button', { name: '相談内容を送信する' }).click();
  await expect(page.locator('#err-phone')).toBeVisible();
  await expect(page.locator('#err-email')).toBeHidden();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator('#name')).toHaveValue('山田 太郎');
  await page.check('input[name="contact_method"][value="メール"]');
  await page.getByRole('button', { name: '相談内容を送信する' }).click();
  await expect(page.locator('#err-email')).toBeVisible();
  await expect(page.locator('#err-phone')).toBeHidden();
  await expect(page.locator('#message')).toHaveValue('テスト');
});

test('form fields are at least 16px and carry autocomplete', async ({ page }) => {
  await page.goto('/contact');
  for (const [id, ac] of [['name', 'name'], ['tel', 'tel'], ['email', 'email']] as const) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('autocomplete', ac);
    const size = await page.locator(`#${id}`).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  }
});

// text-base は白の色トークンと衝突する（文字が白く消える）。フォームの文字が背景と同化していないこと
test('contact form text is not white on white', async ({ page }) => {
  await page.goto('/contact');
  for (const sel of ['label[for="name"]', '#hint-contact', 'main p.leading-loose']) {
    const color = await page.locator(sel).first().evaluate((el) => getComputedStyle(el).color);
    expect(color, sel).not.toBe('rgb(255, 255, 255)');
  }
});

// 存在しない URL は 404 で、404 ページも noindex。wrangler.jsonc が 404 ページを返す設定であること（Cloudflare では未設定だと空のページになる）
test('unknown URL returns 404 with a noindex page', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('wrangler.jsonc serves the 404 page for unknown URLs', () => {
  const text = readFileSync('wrangler.jsonc', 'utf8');
  expect(text).toMatch(/"not_found_handling"\s*:\s*"404-page"/);
  expect(text).toMatch(/"directory"\s*:\s*"\.\/dist"/);
});

// スマホ（縦長）では写真の左右が大きく切り取られる。人物が写る位置に寄せ、文字は上寄せにして人物と重ねない
test('hero keeps the people in frame on phones: image is shifted to the subject and copy sits high', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const pos = await page.locator('#hero [data-slide] img').evaluateAll((imgs) => imgs.map((i) => getComputedStyle(i).objectPosition));
  expect(pos[0]).not.toBe('50% 50%'); // 1枚目（人物2人）は中央のままだと人物が切れる
  expect(parseFloat(pos[0])).toBeLessThan(30);
  const copy = (await page.locator('#hero [data-slide] [data-copy]').first().boundingBox())!;
  expect(copy.y + copy.height).toBeLessThan(844 * 0.4); // 人物の頭（高さの約4割）より上に収める
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  const desktop = await page.locator('#hero [data-slide] img').first().evaluate((i) => getComputedStyle(i).objectPosition);
  expect(desktop).toBe('50% 50%');
});

// トップの写真は生成AIの画像。実在の利用者・スタッフの写真に見えないよう、写真の直下に「画像はイメージです」を出す（14px 以上）
test('hero says the images are illustrative, right below the photo', async ({ page }) => {
  for (const [w, h] of [[1440, 900], [390, 844], [320, 640]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    const hero = (await page.locator('#hero').boundingBox())!;
    const note = page.getByTestId('hero-image-note');
    await expect(note).toHaveText('画像はイメージです');
    const box = (await note.boundingBox())!;
    expect(Math.abs(box.y - (hero.y + hero.height))).toBeLessThanOrEqual(2);
    expect(parseFloat(await note.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  }
});
