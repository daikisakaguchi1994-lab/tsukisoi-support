import QRCode from 'qrcode';

export async function generateLineQrSvg(url: string): Promise<string> {
  if (!url || url.startsWith('{{')) {
    // Return a placeholder SVG when the URL is not yet configured
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <rect width="200" height="200" fill="#f0f0f0" rx="8"/>
      <text x="100" y="100" text-anchor="middle" fill="#999" font-size="14">QR Code</text>
      <text x="100" y="120" text-anchor="middle" fill="#999" font-size="10">LINE URL未設定</text>
    </svg>`;
  }
  return await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: 200,
    color: { dark: '#06C755', light: '#FFFFFF' },
  });
}
