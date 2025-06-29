export default async function extractPico8Bytes(url) {
	const imageInfo = await loadPico8PNG(url);

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

async function loadPico8PNG(url) {
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
