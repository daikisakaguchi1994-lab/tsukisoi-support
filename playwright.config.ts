import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const fallbackChromium = ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find((p) => existsSync(p));

export default defineConfig({
  testDir: './tests',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4331',
    contextOptions: { reducedMotion: 'reduce' },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || fallbackChromium,
    },
  },
  webServer: [
    {
      // 本番と同じビルド結果をテストする（Astro 7 の dev は二重起動を拒否するため使わない）
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4331',
      timeout: 180_000,
      url: 'http://127.0.0.1:4331',
      reuseExistingServer: !process.env.CI,
      // 送信キーはあるが受付開始（PUBLIC_FORM_OPEN）は無い状態でテストする。キーだけでは受付中に見せない
      env: { ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_FORM_KEY: 'test-key-not-real' },
    },
    {
      // サンプル表示（PUBLIC_SAMPLE_PREVIEW=1）は別の出力先・別ポートで確認する。本番ビルドと混ぜない
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4332',
      timeout: 180_000,
      url: 'http://127.0.0.1:4332',
      reuseExistingServer: !process.env.CI,
      env: { ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_SAMPLE_PREVIEW: '1', ASTRO_OUT_DIR: 'dist-sample', PUBLIC_FORM_KEY: 'test-key-not-real', PUBLIC_FORM_OPEN: '1' },
    },
  ],
});
