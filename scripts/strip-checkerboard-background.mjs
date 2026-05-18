#!/usr/bin/env node
import { deflateSync, inflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DEFAULT_OPTIONS = {
  minLight: 145,
  saturationTolerance: 34,
  overwrite: false,
  dryRun: false,
};

function usage() {
  return `Remove fake checkerboard backgrounds from PNGs.

Usage:
  pnpm assets:strip-checkerboard -- --input production-assets/raw/icons --output production-assets/edited/icons
  pnpm assets:strip-checkerboard -- --input input.png --output output.png

Options:
  --input, -i <path>       PNG file or directory to process.
  --output, -o <path>      Output PNG file or directory.
  --overwrite              Allow replacing existing output files.
  --dry-run                Report work without writing files.
  --min-light <0-255>      Minimum brightness treated as checkerboard. Default: 145.
  --saturation <0-255>     Max RGB spread treated as gray/white. Default: 34.
  --self-test              Run an internal PNG/alpha regression test.

Notes:
  - Only the checkerboard-like pixels connected to image edges are removed.
  - Keep raw generations in production-assets/raw and write cleaned files to production-assets/edited or final.
`;
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };
  let input;
  let output;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        return { help: true, options };
      case '--self-test':
        return { selfTest: true, options };
      case '--input':
      case '-i':
        input = argv[++index];
        break;
      case '--output':
      case '-o':
        output = argv[++index];
        break;
      case '--overwrite':
        options.overwrite = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--min-light':
        options.minLight = parseByteOption(arg, argv[++index]);
        break;
      case '--saturation':
        options.saturationTolerance = parseByteOption(arg, argv[++index]);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}\n\n${usage()}`);
    }
  }

  if (!input || !output) {
    throw new Error(`Missing --input or --output.\n\n${usage()}`);
  }

  return { input, output, options };
}

function parseByteOption(name, value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
    throw new Error(`${name} must be an integer from 0 to 255.`);
  }

  return parsed;
}

function readPng(fileBuffer) {
  if (!fileBuffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Input is not a PNG file.');
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < fileBuffer.length) {
    const length = fileBuffer.readUInt32BE(offset);
    offset += 4;

    const type = fileBuffer.toString('ascii', offset, offset + 4);
    offset += 4;

    const data = fileBuffer.subarray(offset, offset + length);
    offset += length;
    offset += 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format. Expected 8-bit RGB/RGBA, got bitDepth=${bitDepth}, colorType=${colorType}.`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const rgba = new Uint8Array(width * height * 4);
  let rawOffset = 0;
  let rgbaOffset = 0;
  let previous = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[rawOffset];
    rawOffset += 1;

    const encoded = inflated.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;

    const current = unfilterScanline(filter, encoded, previous, bytesPerPixel);

    for (let x = 0; x < width; x += 1) {
      const sourceOffset = x * bytesPerPixel;
      rgba[rgbaOffset++] = current[sourceOffset];
      rgba[rgbaOffset++] = current[sourceOffset + 1];
      rgba[rgbaOffset++] = current[sourceOffset + 2];
      rgba[rgbaOffset++] = colorType === 6 ? current[sourceOffset + 3] : 255;
    }

    previous = current;
  }

  return { width, height, data: rgba };
}

function unfilterScanline(filter, encoded, previous, bytesPerPixel) {
  const current = new Uint8Array(encoded.length);

  for (let index = 0; index < encoded.length; index += 1) {
    const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;

    switch (filter) {
      case 0:
        current[index] = encoded[index];
        break;
      case 1:
        current[index] = (encoded[index] + left) & 0xff;
        break;
      case 2:
        current[index] = (encoded[index] + up) & 0xff;
        break;
      case 3:
        current[index] = (encoded[index] + Math.floor((left + up) / 2)) & 0xff;
        break;
      case 4:
        current[index] = (encoded[index] + paethPredictor(left, up, upLeft)) & 0xff;
        break;
      default:
        throw new Error(`Unsupported PNG filter: ${filter}`);
    }
  }

  return current;
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function encodePng(image) {
  const { width, height, data } = image;
  const raw = Buffer.alloc(height * (1 + width * 4));
  let rawOffset = 0;
  let rgbaOffset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[rawOffset++] = 0;

    for (let x = 0; x < width; x += 1) {
      raw[rawOffset++] = data[rgbaOffset++];
      raw[rawOffset++] = data[rgbaOffset++];
      raw[rawOffset++] = data[rgbaOffset++];
      raw[rawOffset++] = data[rgbaOffset++];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function stripCheckerboardBackground(image, options = DEFAULT_OPTIONS) {
  const candidate = new Uint8Array(image.width * image.height);
  const background = new Uint8Array(image.width * image.height);
  const queue = [];

  for (let index = 0; index < candidate.length; index += 1) {
    const offset = index * 4;
    candidate[index] = isCheckerboardCandidate(
      image.data[offset],
      image.data[offset + 1],
      image.data[offset + 2],
      image.data[offset + 3],
      options,
    )
      ? 1
      : 0;
  }

  for (let x = 0; x < image.width; x += 1) {
    enqueueIfCandidate(x, 0, image, candidate, background, queue);
    enqueueIfCandidate(x, image.height - 1, image, candidate, background, queue);
  }

  for (let y = 1; y < image.height - 1; y += 1) {
    enqueueIfCandidate(0, y, image, candidate, background, queue);
    enqueueIfCandidate(image.width - 1, y, image, candidate, background, queue);
  }

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const index = queue[queueIndex];
    const x = index % image.width;
    const y = Math.floor(index / image.width);

    enqueueIfCandidate(x - 1, y, image, candidate, background, queue);
    enqueueIfCandidate(x + 1, y, image, candidate, background, queue);
    enqueueIfCandidate(x, y - 1, image, candidate, background, queue);
    enqueueIfCandidate(x, y + 1, image, candidate, background, queue);
  }

  const output = new Uint8Array(image.data);
  let transparentPixels = 0;

  for (let index = 0; index < background.length; index += 1) {
    if (background[index] !== 1) {
      continue;
    }

    output[index * 4 + 3] = 0;
    transparentPixels += 1;
  }

  return {
    image: { width: image.width, height: image.height, data: output },
    transparentPixels,
  };
}

function isCheckerboardCandidate(red, green, blue, alpha, options) {
  if (alpha === 0) {
    return false;
  }

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max >= options.minLight && max - min <= options.saturationTolerance;
}

function enqueueIfCandidate(x, y, image, candidate, background, queue) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }

  const index = y * image.width + x;

  if (candidate[index] !== 1 || background[index] === 1) {
    return;
  }

  background[index] = 1;
  queue.push(index);
}

function processFile(inputPath, outputPath, options) {
  const source = readPng(readFileSync(inputPath));
  const result = stripCheckerboardBackground(source, options);

  if (!options.dryRun) {
    if (existsSync(outputPath) && !options.overwrite) {
      throw new Error(`Output already exists: ${outputPath}. Use --overwrite to replace it.`);
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, encodePng(result.image));
  }

  return {
    inputPath,
    outputPath,
    transparentPixels: result.transparentPixels,
    totalPixels: source.width * source.height,
  };
}

function collectPngFiles(directory) {
  const results = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      results.push(...collectPngFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      results.push(fullPath);
    }
  }

  return results;
}

function processInput(input, output, options) {
  const inputStats = statSync(input);
  const outputTasks = [];

  if (inputStats.isDirectory()) {
    for (const filePath of collectPngFiles(input)) {
      outputTasks.push({
        inputPath: filePath,
        outputPath: path.join(output, path.relative(input, filePath)),
      });
    }
  } else {
    outputTasks.push({ inputPath: input, outputPath: output });
  }

  if (outputTasks.length === 0) {
    throw new Error(`No PNG files found in ${input}.`);
  }

  return outputTasks.map((task) => processFile(task.inputPath, task.outputPath, options));
}

function runSelfTest() {
  const image = makeSyntheticCheckerboardImage();
  const encoded = encodePng(image);
  const decoded = readPng(encoded);
  const result = stripCheckerboardBackground(decoded, DEFAULT_OPTIONS).image;

  assertAlpha(result, 0, 0, 0, 'edge checkerboard pixel should become transparent');
  assertAlpha(result, 4, 4, 0, 'opposite edge checkerboard pixel should become transparent');
  assertAlpha(result, 1, 1, 255, 'green icon body should stay opaque');
  assertAlpha(result, 2, 2, 255, 'white icon highlight enclosed by icon should stay opaque');

  console.log('Self-test passed: fake checkerboard background removed while enclosed icon highlight stayed opaque.');
}

function makeSyntheticCheckerboardImage() {
  const width = 5;
  const height = 5;
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = (x + y) % 2 === 0 ? 238 : 188;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = 24;
      data[offset + 1] = 210;
      data[offset + 2] = 140;
      data[offset + 3] = 255;
    }
  }

  const highlightOffset = (2 * width + 2) * 4;
  data[highlightOffset] = 245;
  data[highlightOffset + 1] = 245;
  data[highlightOffset + 2] = 245;
  data[highlightOffset + 3] = 255;

  return { width, height, data };
}

function assertAlpha(image, x, y, expected, message) {
  const alpha = image.data[(y * image.width + x) * 4 + 3];

  if (alpha !== expected) {
    throw new Error(`${message}. Expected alpha=${expected}, got alpha=${alpha}.`);
  }
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    console.log(usage());
    return;
  }

  if (parsed.selfTest) {
    runSelfTest();
    return;
  }

  const results = processInput(parsed.input, parsed.output, parsed.options);

  for (const result of results) {
    const relativeInput = path.relative(process.cwd(), result.inputPath);
    const relativeOutput = path.relative(process.cwd(), result.outputPath);
    console.log(
      `${relativeInput} -> ${relativeOutput}: ${result.transparentPixels}/${result.totalPixels} pixels transparent`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

