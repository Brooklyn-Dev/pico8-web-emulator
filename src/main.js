import { extractLua, extractP8Bytes } from "./cartridge";
import LuaVM from "./luaVM";
import transpileLua from "./transpileLua.js";
import * as picoAPI from "./pico8api.js";

const canvas = document.createElement("canvas");
canvas.width = 128;
canvas.height = 128;

const container = document.querySelector(".game-container");
container.appendChild(canvas);

const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const cartridge = await extractP8Bytes("/assets/waves.p8.png");
const lua = extractLua(cartridge);

picoAPI.bindAPIResources(ctx);

const vm = new LuaVM();

// Register PICO-8 functions
Object.entries(picoAPI).forEach(([name, fn]) => {
	if (typeof fn === "function" && name !== "bindAPIResources") {
		vm.addFunction(name, fn);
	}
});

const transpiledLua = transpileLua(lua);
vm.executeCode(transpiledLua);

function gameLoop() {
	ctx.clearRect(0, 0, 128, 128);
	vm.callFunction("_draw");

	requestAnimationFrame(gameLoop);
}

gameLoop();
