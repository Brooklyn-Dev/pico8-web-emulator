import { extractGFF, extractGFX, extractLua, extractMap, extractP8Bytes } from "./cartridge";
import LuaVM from "./luaVM";
import transpileLua from "./transpileLua.js";
import * as picoAPI from "./pico8api.js";

// Setup canvas
const canvas = document.createElement("canvas");
canvas.width = 128;
canvas.height = 128;

const container = document.querySelector(".game-container");
container.appendChild(canvas);

const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Load cartridge data
const cartridge = await extractP8Bytes("/assets/wander.p8.png");
const lua = extractLua(cartridge);
const gfx = extractGFX(cartridge);
const map = extractMap(cartridge);
const gff = extractGFF(cartridge);

// Keyboard input
const keyState = new Array(8).fill(false);
let prevKeyState = new Array(8).fill(false);

const keyMap = {
	ArrowLeft: 0,
	ArrowRight: 1,
	ArrowUp: 2,
	ArrowDown: 3,
};

document.addEventListener("keydown", (e) => {
	const btn = keyMap[e.key];
	if (btn !== undefined) {
		keyState[btn] = true;
		e.preventDefault();
	}
});

document.addEventListener("keyup", (e) => {
	const btn = keyMap[e.key];
	if (btn !== undefined) {
		keyState[btn] = false;
		e.preventDefault();
	}
});

function updateKeyStates() {
	prevKeyState = [...keyState];
}

// Bind API resource to picoAPI
picoAPI.bindAPIResources(ctx, keyState, { gfx, map, gff });

// Init Lua VM and register PICO-8 functions
const vm = new LuaVM();

Object.entries(picoAPI).forEach(([name, fn]) => {
	if (typeof fn === "function" && name !== "bindAPIResources") {
		vm.addFunction(name, fn);
	}
});

// Transpile and execute Lua code
const transpiledLua = transpileLua(lua);
console.log(transpiledLua);
vm.executeCode(transpiledLua);

const PICO8_FPS = 30;
const FRAME_TIME = 1000 / PICO8_FPS;

let lastFrameTime = 0;
let accumulatedTime = 0;

function gameLoop(timestamp) {
	requestAnimationFrame(gameLoop);

	const deltaTime = timestamp - lastFrameTime;
	lastFrameTime = timestamp;
	accumulatedTime += deltaTime;

	while (accumulatedTime >= FRAME_TIME) {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		vm.callFunction("_update");
		vm.callFunction("_draw");

		updateKeyStates();

		accumulatedTime -= FRAME_TIME;
	}
}

vm.callFunction("_init");
requestAnimationFrame(gameLoop);
