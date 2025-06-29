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

export default function extractGFX(byteArray) {
	const gfxData = byteArray.subarray(0x0000, 0x2000);
	return createGfxCanvas(gfxData);
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
