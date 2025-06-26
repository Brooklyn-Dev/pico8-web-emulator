import { extractLuaCode, extractP8Bytes } from "./cartridge";

async function start() {
	const bytes = await extractP8Bytes("/assets/celeste.p8.png");
	console.log(extractLuaCode(bytes));
}

start();
