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

// Keyboard input
const keyState = new Array(8).fill(false);

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

const PICO8_FPS = 30;
const FRAME_TIME = 1000 / PICO8_FPS;

let lastFrameTime = 0;
let accumulatedTime = 0;

let vm = null;
let luaCode = null;
let gfx = null;
let map = null;
let gff = null;

const rawCartCache = {};

let loadingCartridge = false;

async function loadCartridge(cartridgePath) {
	try {
		loadingCartridge = true;

		lastFrameTime = 0;
		accumulatedTime = 0;

		// Load cartridge data
		let cartridgeData;
		if (rawCartCache[cartridgePath]) {
			cartridgeData = rawCartCache[cartridgePath];
		} else {
			cartridgeData = await extractP8Bytes(cartridgePath);
			rawCartCache[cartridgePath] = cartridgeData;
		}

		luaCode = extractLua(cartridgeData);
		gfx = extractGFX(cartridgeData);
		map = extractMap(cartridgeData);
		gff = extractGFF(cartridgeData);

		// Reset key state
		keyState.fill(false);

		// Bind API resource to picoAPI
		picoAPI.bindAPIResources(ctx, keyState, { gfx, map, gff });

		// Init Lua VM and register PICO-8 functions
		vm = null;
		vm = new LuaVM();
		Object.entries(picoAPI).forEach(([name, fn]) => {
			if (typeof fn === "function" && name !== "bindAPIResources") {
				vm.addFunction(name, fn);
			}
		});

		// Transpile and execute Lua code
		const transpiledLua = transpileLua(luaCode);
		console.log(`Loaded cartridge: ${cartridgePath}`);
		console.log(transpiledLua);

		vm.executeCode(transpiledLua);
		vm.callFunction("_init");

		showNoCartridgeMessage(false);

		requestAnimationFrame(gameLoop);
	} catch (err) {
		if (err instanceof TypeError) {
			showShieldWarning();
		} else {
			alert("Failed to load cartridge: " + err.message);
		}
	} finally {
		loadingCartridge = false;
	}
}

function showShieldWarning() {
	alert(
		"The cartridge file loaded appears corrupted or incomplete.\n" +
			"This can be caused by browser privacy features such as Brave Shields blocking or modifying resources.\n" +
			"Try disabling Shields for this site or use a different browser/profile."
	);
}

function gameLoop(timestamp) {
	if (!vm) {
		showNoCartridgeMessage(true);
		return;
	}

	if (loadingCartridge) return;

	requestAnimationFrame(gameLoop);

	const deltaTime = timestamp - lastFrameTime;
	lastFrameTime = timestamp;
	accumulatedTime += deltaTime;

	while (accumulatedTime >= FRAME_TIME) {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		vm.callFunction("_update");
		vm.callFunction("_draw");

		accumulatedTime -= FRAME_TIME;
	}
}

// UI
const selectorPopup = document.getElementById("selector-popup");
const backdrop = document.getElementById("backdrop");
const openSelectorBtn = document.getElementById("open-selector");
const closeSelectorBtn = document.getElementById("close-selector");
const cartridges = document.querySelectorAll(".cartridge");
const noCartMessage = document.getElementById("no-cart-message");
const closeCorsBtn = document.getElementById("close-cors-warning");
const corsWarning = document.getElementById("cors-warning");

// Show cartridge selector popup
function openSelector() {
	selectorPopup.style.display = "block";
	backdrop.style.display = "block";
}

// Hide cartridge selector popup
function closeSelector() {
	selectorPopup.style.display = "none";
	backdrop.style.display = "none";
}

// Highlight selected cartridge
function highlightSelected(selectedImg) {
	cartridges.forEach((img) => img.classList.remove("selected"));
	if (selectedImg) selectedImg.classList.add("selected");
}

function showNoCartridgeMessage(show) {
	noCartMessage.style.display = show ? "block" : "none";
}

// Load cartridge and close popup
async function onCartridgeClick(e) {
	const img = e.currentTarget;

	highlightSelected(img);
	closeSelector();
	loadCartridge(img.src);
}

function closeCorsWarning() {
	corsWarning.style.display = "none";
}

// Event listeners
openSelectorBtn.addEventListener("click", openSelector);
closeSelectorBtn.addEventListener("click", closeSelector);
backdrop.addEventListener("click", closeSelector);
cartridges.forEach((img) => img.addEventListener("click", onCartridgeClick));
closeCorsBtn.addEventListener("click", closeCorsWarning);
