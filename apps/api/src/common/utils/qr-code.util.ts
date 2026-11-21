import QRCode from "qrcode";

/**
 * Generates an industrial-grade crisp vector QR code as an SVG string.
 * Used for 4x6 thermal shipping labels and mobile camera scanning.
 */
export async function generateQrCodeSvg(data: string, size = 100): Promise<string> {
  try {
    return await QRCode.toString(data, {
      type: "svg",
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch {
    // Fallback minimal SVG if QR generation fails
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#000000"/><text x="${size / 2}" y="${size / 2}" fill="#ffffff" font-size="10" text-anchor="middle">QR</text></svg>`;
  }
}
