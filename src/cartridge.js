import { arrayEquals } from "./utils";

const PALETTE = [
	[0, 0, 0, 255],
	[29, 43, 83, 255],
	[126, 37, 83, 255],
	[0, 135, 81, 255],
	[171, 82, 54, 255],
	[95, 87, 79, 255],
	[194, 195, 199, 255],
	[255, 241, 232, 255],
	[255, 0, 77, 255],
	[255, 163, 0, 255],
	[255, 236, 39, 255],
	[0, 228, 54, 255],
	[41, 173, 255, 255],
	[131, 118, 156, 255],
	[255, 119, 168, 255],
	[255, 204, 170, 255],
];

const encoder = new TextEncoder();

async function loadP8PNG(url) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			// Create canvas
			const canvas = document.createElement("canvas");
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext("2d");

			// Draw image to canvas
			ctx.drawImage(img, 0, 0);

			// Extract pixel data
			const imageData = ctx.getImageData(0, 0, img.width, img.height);

			resolve({ width: canvas.width, height: canvas.height, data: imageData.data });
		};

		img.onerror = reject;
		img.src = url;
	});
}

export async function extractP8Bytes(url) {
	const imageInfo = await loadP8PNG(url);

	if (imageInfo.width !== 160 || imageInfo.height !== 205) {
		throw new Error(`Invalid PICO-8 PNG dimensions: ${imageInfo.width}x${imageInfo.height}, expected 160x205`);
	}

	const pixels = imageInfo.data;

	// Extract bytes using steganography
	const byteArray = [];

	for (let i = 0; i < pixels.length; i += 4) {
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const a = pixels[i + 3];

		// Extract 2 LSBs from each channel, ordered ARGB
		const byte = ((a & 0b11) << 6) | ((r & 0b11) << 4) | ((g & 0b11) << 2) | (b & 0b11);
		byteArray.push(byte);
	}

	return new Uint8Array(byteArray);
}

function unpackGfxToRGBA(gfx, width = 128, height = 128) {
	const pixelsCount = width * height;
	const rgba = new Uint8ClampedArray(pixelsCount * 4);

	for (let i = 0; i < pixelsCount; i++) {
		// Each byte encodes 2 pixels:
		// even pixel: low nibble; odd pixel: high nibble
		const byteIndex = Math.floor(i / 2);
		const byte = gfx[byteIndex];
		// low nibble = left pixel, high nibble = right pixel
		const paletteIndex = i % 2 === 0 ? byte & 0x0f : byte >> 4;

		const baseIndex = i * 4;
		const colour = PALETTE[paletteIndex];

		rgba[baseIndex] = colour[0];
		rgba[baseIndex + 1] = colour[1];
		rgba[baseIndex + 2] = colour[2];
		rgba[baseIndex + 3] = paletteIndex === 0 ? 0 : colour[3]; // alpha = 0 if transparent
	}

	return rgba;
}

function createGfxCanvas(gfx) {
	const width = 128;
	const height = 128;

	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;

	const ctx = offscreen.getContext("2d");

	const rgba = unpackGfxToRGBA(gfx, width, height);

	const imageData = new ImageData(rgba, width, height);
	ctx.putImageData(imageData, 0, 0);

	return offscreen;
}

export function extractGFX(byteArray) {
	const gfx = byteArray.subarray(0x0000, 0x2000);
	return createGfxCanvas(gfx);
}

export function extractMap(byteArray) {
	const lowerMap = byteArray.subarray(0x1000, 0x2000); // Lower 32 rows
	const upperMap = byteArray.subarray(0x2000, 0x3000); // Upper 32 rows

	const mapData = new Uint8Array(128 * 64); // 8192 bytes

	mapData.set(upperMap, 0);
	mapData.set(lowerMap, 128 * 32);

	return mapData;
}

export function extractGFF(byteArray) {
	return byteArray.subarray(0x3000, 0x3100);
}

export function extractLua(byteArray) {
	// Bytes 0x4300-0x7fff are the Lua code
	const luaSection = byteArray.slice(0x4300);

	// First 4 bytes of Lua code determine compression format
	const header = byteArray.slice(0x4300, 0x4304);

	// New compressed format
	if (arrayEquals(header, encoder.encode(`\x00pxa`))) {
		return decompressNewFormat(luaSection);
	}

	// Old compressed format
	if (arrayEquals(header, encoder.encode(`:c:\x00`))) {
		throw new Error("Cartridges using the old (pre-v0.2.0) compressed format are not supported.");
	}

	// No compression (plaintext ASCII)
	const nullIndex = luaSection.indexOf(0x00);
	const endIndex = nullIndex === -1 ? luaSection.length : nullIndex;
	return new TextDecoder("ascii").decode(luaSection.slice(0, endIndex));
}

function decompressNewFormat(luaSection) {
	// Skip 4 header bytes (0x4300-0x4303)
	let offset = 4;

	// Next 2 bytes (0x4304-0x4305) store length of decompressed code (MSB first)
	const decompressedLength = (luaSection[offset] << 8) | luaSection[offset + 1];
	offset += 2;

	// Next 2 bytes (0x4306-0x4307) store length of the compressed data + 8 (MSB first)
	const compressedLength = ((luaSection[offset] << 8) | luaSection[offset + 1]) - 8;
	offset += 2;

	// Decompression algorithm maintains a "move-to-front" mapping of the 256 possible bytes
	// Initially, each of the 256 possible bytes maps to itself
	const moveToFront = Array.from({ length: 256 }, (_, i) => i);

	// The decompression algorithm processes the compressed data bit by bit
	// going from LSB to MSB of each byte
	// until the expected length of decompressed characters has been emitted
	let streamStr = "";
	for (let i = offset; i < luaSection.length && i < offset + compressedLength; i++) {
		const byte = luaSection[i];
		const binaryStr = byte.toString(2).padStart(8, "0");
		streamStr += binaryStr.split("").reverse().join(""); // Reverse as LSB first
	}

	let streamPos = 0;
	const result = [];

	// Read a single bit
	function readBit() {
		if (streamPos >= streamStr.length) return "0";
		const bit = streamStr[streamPos];
		streamPos++;
		return bit;
	}

	// Read multiple bits (LSB first) and convert to integer
	function readBits(count) {
		if (streamPos + count > streamStr.length) return 0;
		const bits = streamStr.slice(streamPos, streamPos + count);
		streamPos += count;
		return parseInt(bits.split("").reverse().join(""), 2);
	}

	// Decompression loop
	while (result.length < decompressedLength && streamPos < streamStr.length) {
		// Each group of bits starts with a single header bit, specifying the group's type
		const headerBit = readBit();

		if (headerBit === "1") {
			// Decode single character

			// Read unary (count number of 1s before the first 0)
			let unary = 0;
			while (readBit() === "1") {
				unary++;
			}

			// Use unary to determine how many extra bits to read
			const unaryMask = (1 << unary) - 1;
			const index = readBits(4 + unary) + (unaryMask << 4);

			if (index < moveToFront.length) {
				const byte = moveToFront[index];
				result.push(String.fromCharCode(byte));

				// Move byte to the front
				moveToFront.splice(index, 1);
				moveToFront.unshift(byte);
			}
		} else {
			// Copy/Paste a segment (back-reference)

			// Determine how far back to copy
			let offsetBits;
			if (readBit() === "1") {
				offsetBits = readBit() === "1" ? 5 : 10;
			} else {
				offsetBits = 15;
			}

			const offsetBackwards = readBits(offsetBits) + 1;

			// SPECIAL CASE: uncompressed block
			if (offsetBits === 10 && offsetBackwards === 1) {
				while (streamPos < streamStr.length) {
					const byte = readBits(8);
					if (byte === 0x00) {
						break; // null byte
					}

					result.push(String.fromCharCode(byte));
				}
				continue;
			}

			// Read length of data to copy (in 3-bt chunks)
			let length = 3;
			while (true) {
				const part = readBits(3);
				length += part;
				if (part != 7) {
					break; // Stop if didn't hit max (7)
				}
			}

			// Stop if back-reference goes too far
			if (offsetBackwards > result.length) {
				break;
			}

			// Copy characters from previous output
			const startPos = result.length - offsetBackwards;
			let chunk = result.slice(startPos, startPos + length).join("");

			// Repeat chunk if it too short
			while (chunk.length < length) {
				chunk += chunk;
			}
			chunk = chunk.slice(0, length);

			// Add copied chunk to output
			for (let i = 0; i < chunk.length; i++) {
				result.push(chunk[i]);
			}
		}
	}

	return result.slice(0, decompressedLength).join("");
}
