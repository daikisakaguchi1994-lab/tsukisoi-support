// All variables use {{VAR}} format placeholders.
// Replace values below when finalized. Use `grep -r "{{"` to find all occurrences.

export const SITE = {
  COMPANY_NAME: 'ウェルネスFUKUOKA',
  SERVICE_NAME: 'ウェルネスFUKUOKA',
  TEL: '090-1234-5678', // ダミー番号、本番公開前に差し替え
  TEL_HOURS: '9:00〜18:00',
  LINE_URL: '{{LINE_URL}}',
  EMAIL: 'wellness.fuk@gmail.com',
  ADDRESS: '{{ADDRESS}}',
  AREA: '福岡市全域・福岡都市圏（春日市・大野城市・太宰府市・筑紫野市・那珂川市・古賀市・糸島市・宗像市・福津市、糟屋郡〈宇美町・篠栗町・志免町・須恵町・新宮町・久山町・粕屋町〉）',
} as const;
