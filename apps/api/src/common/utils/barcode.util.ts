/**
 * Code 128 Subtype B Barcode Generator (Pure TypeScript)
 * Generates lightweight, scalable SVG barcode vectors without any external libraries.
 */

const CODE128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213", // 0-9
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132", // 10-19
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211", // 20-29
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313", // 30-39
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331", // 40-49
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111", // 50-59
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214", // 60-69
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111", // 70-79
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141", // 80-89
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141", // 90-99
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112", // 100-106
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export function generateBarcodeSvg(
  data: string,
  options: { height?: number; barWidth?: number } = {},
): string {
  const height = options.height || 60;
  const barWidth = options.barWidth || 2;

  // Compute Code 128 values
  const codes: number[] = [START_CODE_B];
  let checkSum = START_CODE_B;

  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) - 32;
    if (charCode >= 0 && charCode <= 95) {
      codes.push(charCode);
      checkSum += charCode * (i + 1);
    }
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP_CODE);

  // Convert codes to bar pattern string
  let pattern = "";
  for (const c of codes) {
    if (CODE128_PATTERNS[c]) {
      pattern += CODE128_PATTERNS[c];
    }
  }

  // Generate SVG rects
  let currentX = 10;
  const rects: string[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (!char) continue;
    const width = parseInt(char, 10) * barWidth;
    const isBar = i % 2 === 0;
    if (isBar) {
      rects.push(
        `<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000000" />`,
      );
    }
    currentX += width;
  }

  const totalWidth = currentX + 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height + 20}" width="100%" height="${height + 20}">
    <rect width="${totalWidth}" height="${height + 20}" fill="#ffffff" />
    <g>${rects.join("")}</g>
    <text x="${totalWidth / 2}" y="${height + 14}" font-family="monospace, monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">${data}</text>
  </svg>`;
}
