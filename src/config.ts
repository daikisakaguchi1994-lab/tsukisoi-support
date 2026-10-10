// Placeholder values are written as {{VAR}}. Use `grep -r "{{"` to find what is still unset.

export const SITE = {
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
} as const;

export const isConfigured = (value: string): boolean => Boolean(value) && !value.startsWith('{{');

// 仮番号（000-0000-0000 のような 0 だけの並び）や未設定は「未確定」とみなす。発信リンクは確定後だけ出す
export const isTelConfigured = (value: string): boolean =>
  isConfigured(value) && /[1-9]/.test(value.replace(/\D/g, ''));

// ヘッダー/フッター共通のナビゲーション
export const NAV_ITEMS = [
  { label: 'ホーム', en: 'Home', href: '/' },
  { label: 'サービス', en: 'Service', href: '/service' },
  { label: 'お知らせ', en: 'News', href: '/news' },
  { label: '私たちについて', en: 'About', href: '/about' },
  { label: '関連リンク', en: 'Links', href: '/links' },
  { label: 'お問合せ', en: 'Contact', href: '/contact' },
] as const;
