export default function extractMap(byteArray) {
	const lowerMap = byteArray.subarray(0x1000, 0x2000); // Lower 32 rows
	const upperMap = byteArray.subarray(0x2000, 0x3000); // Upper 32 rows

	const mapData = new Uint8Array(128 * 64); // 8192 bytes

	mapData.set(upperMap, 0);
	mapData.set(lowerMap, 128 * 32);

	return mapData;
}
