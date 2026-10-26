/**
 * ISO/IEC 18004 Standard QR Code Generator — Error Correction Level H (30% recovery)
 * Zero-dependency implementation supporting Byte mode across Versions 1–12.
 */

export interface QrMatrixLevelH {
  version: number;
  size: number;
  errorCorrectionLevel: "H";
  modules: boolean[][];
}

interface LevelHBlockSpec {
  version: number;
  ecCodewordsPerBlock: number;
  group1Blocks: number;
  group1DataCodewords: number;
  group2Blocks: number;
  group2DataCodewords: number;
  alignmentCenters: number[];
}

const LEVEL_H_SPECS: LevelHBlockSpec[] = [
  { version: 1, ecCodewordsPerBlock: 17, group1Blocks: 1, group1DataCodewords: 9, group2Blocks: 0, group2DataCodewords: 0, alignmentCenters: [] },
  { version: 2, ecCodewordsPerBlock: 28, group1Blocks: 1, group1DataCodewords: 16, group2Blocks: 0, group2DataCodewords: 0, alignmentCenters: [6, 18] },
  { version: 3, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCodewords: 13, group2Blocks: 0, group2DataCodewords: 0, alignmentCenters: [6, 22] },
  { version: 4, ecCodewordsPerBlock: 16, group1Blocks: 4, group1DataCodewords: 9, group2Blocks: 0, group2DataCodewords: 0, alignmentCenters: [6, 26] },
  { version: 5, ecCodewordsPerBlock: 22, group1Blocks: 2, group1DataCodewords: 11, group2Blocks: 2, group2DataCodewords: 12, alignmentCenters: [6, 30] },
  { version: 6, ecCodewordsPerBlock: 28, group1Blocks: 4, group1DataCodewords: 15, group2Blocks: 0, group2DataCodewords: 0, alignmentCenters: [6, 34] },
  { version: 7, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 13, group2Blocks: 1, group2DataCodewords: 14, alignmentCenters: [6, 22, 38] },
  { version: 8, ecCodewordsPerBlock: 26, group1Blocks: 4, group1DataCodewords: 14, group2Blocks: 2, group2DataCodewords: 15, alignmentCenters: [6, 24, 42] },
  { version: 9, ecCodewordsPerBlock: 24, group1Blocks: 4, group1DataCodewords: 12, group2Blocks: 4, group2DataCodewords: 13, alignmentCenters: [6, 26, 46] },
  { version: 10, ecCodewordsPerBlock: 28, group1Blocks: 6, group1DataCodewords: 15, group2Blocks: 2, group2DataCodewords: 16, alignmentCenters: [6, 28, 50] },
  { version: 11, ecCodewordsPerBlock: 24, group1Blocks: 3, group1DataCodewords: 12, group2Blocks: 8, group2DataCodewords: 13, alignmentCenters: [6, 30, 54] },
  { version: 12, ecCodewordsPerBlock: 28, group1Blocks: 7, group1DataCodewords: 14, group2Blocks: 4, group2DataCodewords: 15, alignmentCenters: [6, 32, 58] },
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildReedSolomonDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) {
        result[j] ^= result[j + 1];
      }
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function computeReedSolomonRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < divisor.length; j++) {
        result[j] ^= gfMul(divisor[j], factor);
      }
    }
  }
  return result;
}

function appendBits(val: number, len: number, bitBuffer: number[]): void {
  for (let i = len - 1; i >= 0; i--) {
    bitBuffer.push((val >>> i) & 1);
  }
}

function selectSpecForPayload(byteLength: number): LevelHBlockSpec {
  for (const spec of LEVEL_H_SPECS) {
    const totalDataCodewords =
      spec.group1Blocks * spec.group1DataCodewords +
      spec.group2Blocks * spec.group2DataCodewords;
    const lengthFieldBits = spec.version <= 9 ? 8 : 16;
    const maxBytes = Math.floor((totalDataCodewords * 8 - 4 - lengthFieldBits) / 8);
    if (byteLength <= maxBytes) {
      return spec;
    }
  }
  return LEVEL_H_SPECS[LEVEL_H_SPECS.length - 1];
}

function encodeLevelHCodewords(bytes: Uint8Array, spec: LevelHBlockSpec): Uint8Array {
  const totalDataCodewords =
    spec.group1Blocks * spec.group1DataCodewords +
    spec.group2Blocks * spec.group2DataCodewords;
  const lengthBits = spec.version <= 9 ? 8 : 16;
  const maxBytes = Math.floor((totalDataCodewords * 8 - 4 - lengthBits) / 8);
  const clipped = bytes.length > maxBytes ? bytes.slice(0, maxBytes) : bytes;

  const bits: number[] = [];
  // Byte mode indicator (0100)
  appendBits(0b0100, 4, bits);
  appendBits(clipped.length, lengthBits, bits);
  for (let i = 0; i < clipped.length; i++) {
    appendBits(clipped[i], 8, bits);
  }

  // Terminator up to 4 zero bits
  const capacityBits = totalDataCodewords * 8;
  appendBits(0, Math.min(4, capacityBits - bits.length), bits);
  // Pad to byte boundary
  appendBits(0, (8 - (bits.length % 8)) % 8, bits);

  // Pad bytes 0xEC, 0x11
  let padToggle = 0;
  while (bits.length < capacityBits) {
    appendBits(padToggle % 2 === 0 ? 0xec : 0x11, 8, bits);
    padToggle++;
  }

  const dataCodewords = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bits.length; i++) {
    dataCodewords[i >>> 3] |= bits[i] << (7 - (i & 7));
  }

  // Split into blocks and compute Reed-Solomon EC codewords
  const divisor = buildReedSolomonDivisor(spec.ecCodewordsPerBlock);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.group1Blocks; i++) {
    const block = dataCodewords.slice(offset, offset + spec.group1DataCodewords);
    offset += spec.group1DataCodewords;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, divisor));
  }
  for (let i = 0; i < spec.group2Blocks; i++) {
    const block = dataCodewords.slice(offset, offset + spec.group2DataCodewords);
    offset += spec.group2DataCodewords;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, divisor));
  }

  // Interleave data codewords, then EC codewords
  const totalBlocks = spec.group1Blocks + spec.group2Blocks;
  const totalCodewords = totalDataCodewords + totalBlocks * spec.ecCodewordsPerBlock;
  const interleaved = new Uint8Array(totalCodewords);
  let outIdx = 0;
  const maxDataBlockLen = Math.max(spec.group1DataCodewords, spec.group2DataCodewords);

  for (let col = 0; col < maxDataBlockLen; col++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (col < dataBlocks[b].length) {
        interleaved[outIdx++] = dataBlocks[b][col];
      }
    }
  }
  for (let col = 0; col < spec.ecCodewordsPerBlock; col++) {
    for (let b = 0; b < totalBlocks; b++) {
      interleaved[outIdx++] = ecBlocks[b][col];
    }
  }

  return interleaved;
}

function drawFunctionPatterns(
  size: number,
  spec: LevelHBlockSpec,
  modules: boolean[][],
  isFunction: boolean[][]
): void {
  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // 3 Finder patterns + separators
  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (onRing || inCore));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  const centers = spec.alignmentCenters;
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = centers[i];
      const cc = centers[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunctionModule(cr + dr, cc + dc, dist !== 1);
        }
      }
    }
  }

  // Reserve Format Info areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunctionModule(8, i, false);
      setFunctionModule(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFunctionModule(8, size - 1 - i, false);
    setFunctionModule(size - 1 - i, 8, false);
  }
  // Always-dark module
  setFunctionModule(size - 8, 8, true);

  // Version Info for v >= 7
  if (spec.version >= 7) {
    let rem = spec.version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const versionBits = (spec.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((versionBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }
}

function drawFormatBitsLevelH(size: number, mask: number, modules: boolean[][]): void {
  // Error Correction Level H format bits = 0b10
  const data = (0b10 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  // Top-left format bits
  for (let i = 0; i <= 5; i++) modules[8][i] = ((bits >>> i) & 1) !== 0;
  modules[8][7] = ((bits >>> 6) & 1) !== 0;
  modules[8][8] = ((bits >>> 7) & 1) !== 0;
  modules[7][8] = ((bits >>> 8) & 1) !== 0;
  for (let i = 9; i < 15; i++) modules[14 - i][8] = ((bits >>> i) & 1) !== 0;

  // Bottom-left and top-right format bits
  for (let i = 0; i < 8; i++) modules[size - 1 - i][8] = ((bits >>> i) & 1) !== 0;
  for (let i = 8; i < 15; i++) modules[8][size - 15 + i] = ((bits >>> i) & 1) !== 0;
  modules[size - 8][8] = true;
}

export function generateQrMatrixLevelH(payload: string): QrMatrixLevelH {
  const bytes = new TextEncoder().encode(payload || " ");
  const spec = selectSpecForPayload(bytes.length);
  const size = spec.version * 4 + 17;

  const modules: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  drawFunctionPatterns(size, spec, modules, isFunction);
  const codewords = encodeLevelHCodewords(bytes, spec);

  // Place codeword bits in upward/downward 2-column zig-zag
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (!isFunction[row][col] && bitIdx < totalBits) {
          const bit = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
          modules[row][col] = bit;
          bitIdx++;
        }
      }
    }
  }

  // Apply mask 0 ((row + col) % 2 === 0) and write Level-H format bits
  const mask = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }
  drawFormatBitsLevelH(size, mask, modules);

  return {
    version: spec.version,
    size,
    errorCorrectionLevel: "H",
    modules,
  };
}
