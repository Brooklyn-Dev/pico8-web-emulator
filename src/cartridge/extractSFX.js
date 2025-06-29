export default function extractSFX(byteArray) {
	const sfxData = byteArray.subarray(0x3200, 0x4300);
	const sfxArray = [];

	// 64 SFX slots, each 68 bytes
	for (let sfxIndex = 0; sfxIndex < 64; sfxIndex++) {
		const offset = sfxIndex * 68;
		const sfxBytes = sfxData.subarray(offset, offset + 68);
		const sfx = parseSFX(sfxBytes, index);
		sfxArray.push(sfx);
	}

	return sfxArray;
}

function parseSFX(sfxBytes, index) {
	const sfx = {
		index,
		notes: [],
		mode: sfxBytes[64],
		speed: sfxBytes[65],
		loopStart: sfxBytes[66],
		loopEnd: sfxBytes[67],
	};

	for (let noteIndex = 0; noteIndex < 31; noteIndex++) {
		const noteOffset = noteIndex * 2;
		const lowByte = sfxBytes[noteOffset];
		const highByte = sfxBytes[noteOffset + 1];
		const note = decodeNote(lowByte, highByte);
		sfx.notes.push(note);
	}

	return sfx;
}

function decodeNote(lowByte, highByte) {
	const word = (highByte << 8) | lowByte;

	return {
		c: (word >> 15) & 0b1,
		effect: (word >> 12) & 0b111,
		volume: (word >> 9) & 0b111,
		waveform: (word >> 6) & 0b111,
		pitch: word & 0b111111,
	};
}
