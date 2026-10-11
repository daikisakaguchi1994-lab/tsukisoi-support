// Placeholder values are written as {{VAR}}. Use `grep -r "{{"` to find what is still unset.
import { SAMPLE_VALUES, isSamplePreview } from './config.sample';

const BASE = {
  // 公開判断が出るまで false。false の間は全ページ noindex, nofollow
  PUBLISHED: false,
  COMPANY_NAME: 'つきそいサポート',
  SERVICE_NAME: 'つきそいサポート',
  TAGLINE: 'いつでも、そばに。',
  TEL: '000-0000-0000', // ダミー番号、公開前に差し替え
  TEL_HOURS: '', // 受付時間（未定のため空）
  LINE_URL: '{{LINE_URL}}',
  INSTAGRAM_URL: '{{INSTAGRAM_URL}}',
  EMAIL: '{{EMAIL}}',
  ADDRESS: '{{ADDRESS}}',
};

type Site = { [K in keyof typeof BASE]: (typeof BASE)[K] extends boolean ? boolean : string };

export const isConfigured = (value: string): boolean => Boolean(value) && !value.startsWith('{{');

// サンプル表示（完成イメージ確認用）。PUBLIC_SAMPLE_PREVIEW=1 かつプレビューと明示されたときだけ有効（既定は拒否。config.sample.ts）
const env = (import.meta as { env?: Record<string, string | undefined> }).env;
const readEnv = (key: string): string | undefined =>
  env?.[key] ?? (typeof process !== 'undefined' ? process.env[key] : undefined);
export const SAMPLE_PREVIEW = isSamplePreview(readEnv('PUBLIC_SAMPLE_PREVIEW'), readEnv('VERCEL_ENV'), readEnv('PUBLIC_DEPLOY_TARGET'));

// 仮番号（000-0000-0000 のような 0 だけの並び）や未設定は「未確定」とみなす。発信リンクは確定後だけ出す
// サンプルの番号も「確定」ではない（発信リンクを出さない）
export const isTelConfigured = (value: string): boolean =>
  isConfigured(value) && value !== SAMPLE_VALUES.TEL && /[1-9]/.test(value.replace(/\D/g, ''));

// サンプル表示中の仮番号。文字としては見せるが、リンクにはしない
export const isTelSample = (value: string): boolean => SAMPLE_PREVIEW && value === SAMPLE_VALUES.TEL;

// 未確定の値だけをサンプルで補う。確定済みの値と PUBLISHED は上書きしない
const withSamples = (base: Site): Site => {
  const out: Site = { ...base };
  for (const key of Object.keys(SAMPLE_VALUES) as (keyof typeof SAMPLE_VALUES)[]) {
    const unset = key === 'TEL' ? !isTelConfigured(base.TEL) : !isConfigured(base[key]);
    if (unset) out[key] = SAMPLE_VALUES[key];
  }
  return out;
};

export const SITE: Site = SAMPLE_PREVIEW ? withSamples(BASE) : BASE;

// 相談フォームの受付を始めてよいか。送信キー（PUBLIC_FORM_KEY）があるだけでは開けない。
// 利用者が受付開始を決めたときだけ PUBLIC_FORM_OPEN=1 を足す（実送信の確認は Preview で両方を設定して行う）
export const isFormOpen = (key: string | undefined, openFlag: string | undefined): boolean => Boolean(key) && openFlag === '1';

// ヘッダー/フッター共通のナビゲーション
export const NAV_ITEMS = [
  { label: 'ホーム', en: 'Home', href: '/' },
  { label: 'サービス・料金', en: 'Service', href: '/service' },
  { label: 'お知らせ', en: 'News', href: '/news' },
  { label: '私たちについて', en: 'About', href: '/about' },
  { label: '関連リンク', en: 'Related Links', href: '/links' },
  { label: '相談フォーム', en: 'Contact form', href: '/contact' },
] as const;
