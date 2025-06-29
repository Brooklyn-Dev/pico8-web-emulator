import { arrayEquals } from "./../utils";

const encoder = new TextEncoder();

export default function extractLua(byteArray) {
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
