// 一覧・記事で共通の日付表記（2026.10.10）。入力は UTC 0 時の Date（日付だけの frontmatter）
export const formatDate = (date: Date): string =>
  `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;

export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
