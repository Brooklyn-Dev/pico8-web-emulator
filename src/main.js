import { extractPico8Bytes, extractGFX, extractMap, extractGFF, extractLua } from "./cartridge";
import LuaVM from "./luaVM";
import transpileLua from "./transpileLua.js";
import * as picoAPI from "./pico8api.js";

// --- CONSTANTS ---

const PICO8_FPS = 30;
const FRAME_TIME = 1000 / PICO8_FPS;

// PICO-8 key mappings
const keyMap = {
	ArrowLeft: 0,
	ArrowRight: 1,
	ArrowUp: 2,
	ArrowDown: 3,
};

// --- GLOBAL STATE ---

// Game loop and cartridge state
let animationFrameId = null;
let currentCartVersion = 0;
let loadingCartridge = false;
let paused = false;

// Timing variables for frame-rate limiting
let lastFrameTime = 0;
let accumulatedTime = 0;

// PICO-8 cartridge data
let vm = null;
let luaCode = null;
let gfx = null;
let map = null;
let gff = null;

// Input state (8 buttons max)
const keyState = new Array(8).fill(false);

// Cartridge caching to avoid re-loading
const rawCartCache = {};

// --- CANVAS SETUP ---

// Create and config main game canvs
const canvas = document.createElement("canvas");
canvas.width = 128;
canvas.height = 128;
canvas.tabIndex = 0; // Focusable

const container = document.querySelector(".game-container");
container.appendChild(canvas);
canvas.focus();

const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering

// --- INPUT HANDLING ---

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

// --- PAUSE/RESUME ---

function pauseCartridge() {
	paused = true;
	console.log("Paused");
}

function resumeCartridge() {
	if (!paused) return;

	paused = false;
	lastFrameTime = performance.now();
	gameLoop(lastFrameTime);
	console.log("Resumed");
}

// --- CARTRIDGE LOADING ---

async function loadCartridge(cartridgePath) {
	try {
		loadingCartridge = true;

		// Reset timing variables
		lastFrameTime = 0;
		accumulatedTime = 0;

		// Load cartridge data (with caching)
		let cartridgeData;
		if (rawCartCache[cartridgePath]) {
			cartridgeData = rawCartCache[cartridgePath];
		} else {
			cartridgeData = await extractPico8Bytes(cartridgePath);
			rawCartCache[cartridgePath] = cartridgeData;
		}

		// Extract cartridge sections
		luaCode = extractLua(cartridgeData);
		gfx = extractGFX(cartridgeData);
		map = extractMap(cartridgeData);
		gff = extractGFF(cartridgeData);

		// Reset key state
		keyState.fill(false);

		// Init PICO-8 API and bind cartridge resources
		picoAPI.bindAPIResources(ctx, keyState, { gfx, map, gff });

		// Init Lua VM and register PICO-8 API functions
		vm = null;
		vm = new LuaVM();
		Object.entries(picoAPI).forEach(([name, fn]) => {
			if (typeof fn === "function" && name !== "bindAPIResources") {
				vm.addFunction(name, fn);
			}
		});

		// Transpile and execute cartridge Lua code
		const transpiledLua = transpileLua(luaCode);
		console.log(`Loaded cartridge: ${cartridgePath}`);

		vm.executeCode(transpiledLua);
		vm.callFunction("_init"); // Call cartridge init function

		// Update UI state
		showNoCartridgeMessage(false);

		loadingCartridge = false; // Finished loading

		// Stop existing game loop
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		// Start new game loop with fresh version
		currentCartVersion++;
		gameLoop(performance.now());

		// Focus canvas (resume)
		canvas.focus();
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

/// --- GAME LOOP ---

function gameLoop(timestamp) {
	if (!vm) {
		showNoCartridgeMessage(true);
		return;
	}

	if (loadingCartridge || paused) return;

	// Init timing varables
	lastFrameTime = timestamp;
	accumulatedTime = 0;

	// Detect cartridge changes
	const myCartVersion = currentCartVersion;
	const loop = (time) => {
		if (myCartVersion !== currentCartVersion || paused || !vm) return;

		// Calculate frame timing
		const deltaTime = time - lastFrameTime;
		lastFrameTime = time;
		accumulatedTime += deltaTime;

		// Process frames at fixed rate (30FPS)
		while (accumulatedTime >= FRAME_TIME) {
			// Reset canvas
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Call PICO-8 lifecycle functions
			vm.callFunction("_update");
			vm.callFunction("_draw");

			accumulatedTime -= FRAME_TIME;
		}

		// Schedule next frame
		animationFrameId = requestAnimationFrame(loop);
	};

	// Start the loop
	animationFrameId = requestAnimationFrame(loop);
}

// --- UI MANAGEMENT ---

// UI Elements
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

// Show/hide no cartridge message
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

// Closes the CORS warning
function closeCorsWarning() {
	corsWarning.style.display = "none";
}

// --- EVENT LISTENERS ---

// UI events listeners
openSelectorBtn.addEventListener("click", openSelector);
closeSelectorBtn.addEventListener("click", closeSelector);
backdrop.addEventListener("click", closeSelector);
cartridges.forEach((img) => img.addEventListener("click", onCartridgeClick));
closeCorsBtn.addEventListener("click", closeCorsWarning);

// Pause/resume when tab becomes inactive/active
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		pauseCartridge();
	} else {
		resumeCartridge();
	}
});

// Pause/resume when canvas loses/gains focus
canvas.addEventListener("blur", pauseCartridge);
canvas.addEventListener("focus", resumeCartridge);
