export default function extractGFF(byteArray) {
	return byteArray.subarray(0x3000, 0x3100);
}
