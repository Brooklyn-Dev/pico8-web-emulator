import { lua } from "fengari-web";

let ctxRef = null;

let keyStateRef = null;

let gfxData = null;
let mapData = null;
let gffData = null;

export function bindAPIResources(ctx, keyState, { gfx, map, gff } = {}) {
	ctxRef = ctx;

	keyStateRef = keyState;

	gfxData = gfx;
	mapData = map;
	gffData = gff;
}

const PALETTE = [
	"#000000",
	"#1D2B53",
	"#7E2553",
	"#008751",
	"#AB5236",
	"#5F574F",
	"#C2C3C7",
	"#FFF1E8",
	"#FF004D",
	"#FFA300",
	"#FFEC27",
	"#00E436",
	"#29ADFF",
	"#83769C",
	"#FF77A8",
	"#FFCCAA",
];

// Graphics
let cameraX = 0;
let cameraY = 0;

export function camera(L) {
	if (!ctxRef) return 0;

	const prevX = cameraX;
	const prevY = cameraY;

	const x = lua.lua_isnoneornil(L, 1) ? 0 : lua.lua_tonumber(L, 1) || 0;
	const y = lua.lua_isnoneornil(L, 2) ? 0 : lua.lua_tonumber(L, 2) || 0;

	cameraX = Math.floor(x); // PICO-8 camera coordinates are integers
	cameraY = Math.floor(y);

	// Apply camera offset to context transform
	ctxRef.setTransform(1, 0, 0, 1, -cameraX, -cameraY);

	// Return previous camera offset as tuple
	lua.lua_pushnumber(L, prevX);
	lua.lua_pushnumber(L, prevY);
	return 2;
}

export function cls(L) {
	if (!ctxRef) return 0;

	const col = lua.lua_isnoneornil(L, 1) ? 0 : lua.lua_tonumber(L, 1) || 0;

	ctxRef.setTransform(1, 0, 0, 1, 0, 0); // reset camera transform
	ctxRef.fillStyle = PALETTE[Math.floor(col) % 16] || "#000";
	ctxRef.fillRect(0, 0, 128, 128);

	return 0;
}

export function pset(L) {
	if (!ctxRef) return 0;

	const x = lua.lua_tonumber(L, 1) || 0;
	const y = lua.lua_tonumber(L, 2) || 0;
	const c = lua.lua_tonumber(L, 3) || 0;

	ctxRef.fillStyle = PALETTE[Math.floor(c) % 16];
	ctxRef.fillRect(Math.floor(x), Math.floor(y), 1, 1);
	return 0;
}

export function spr(L) {
	if (!ctxRef || !gfxData) return 0;

	const n = Math.floor(lua.lua_tonumber(L, 1) || 0);
	const x = Math.floor(lua.lua_tonumber(L, 2) || 0);
	const y = Math.floor(lua.lua_tonumber(L, 3) || 0);
	const w = lua.lua_isnoneornil(L, 4) ? 1 : Math.floor(lua.lua_tonumber(L, 4) || 1);
	const h = lua.lua_isnoneornil(L, 5) ? 1 : Math.floor(lua.lua_tonumber(L, 5) || 1);
	const flip_x = lua.lua_isnoneornil(L, 6) ? false : lua.lua_toboolean(L, 6);
	const flip_y = lua.lua_isnoneornil(L, 7) ? false : lua.lua_toboolean(L, 7);

	const sx = ((n % 16) * 8) | 0;
	const sy = (Math.floor(n / 16) * 8) | 0;

	const sw = (w * 8) | 0;
	const sh = (h * 8) | 0;

	ctxRef.save();

	ctxRef.translate(x + (flip_x ? sw : 0), y + (flip_y ? sh : 0));
	ctxRef.scale(flip_x ? -1 : 1, flip_y ? -1 : 1);

	ctxRef.drawImage(gfxData, sx, sy, sw, sh, 0, 0, sw, sh);

	ctxRef.restore();

	return 0;
}

// Input
export function btn(L) {
	const i = Math.floor(lua.lua_tonumber(L, 1)) || 0;
	const isPressed = !!keyStateRef?.[i];
	lua.lua_pushboolean(L, isPressed);
	return 1;
}

// Sound
export function sfx(L) {
	const n = lua.lua_tonumber(L, 1) || 0;
	const channel = lua.lua_isnoneornil(L, 2) ? -1 : lua.lua_tonumber(L, 2) || 0;
	const offset = lua.lua_isnoneornil(L, 3) ? 0 : lua.lua_tonumber(L, 3) || 0;
	console.log("sfx:", n, "channel:", channel, "offset:", offset);
	return 0;
}

// Map
export function map(L) {
	if (!ctxRef) return 0;

	const cel_x = lua.lua_tonumber(L, 1) || 0;
	const cel_y = lua.lua_tonumber(L, 2) || 0;
	const sx = lua.lua_isnoneornil(L, 3) ? 0 : lua.lua_tonumber(L, 3);
	const sy = lua.lua_isnoneornil(L, 4) ? 0 : lua.lua_tonumber(L, 4);
	const cel_w = lua.lua_tonumber(L, 5) || 128;
	const cel_h = lua.lua_tonumber(L, 6) || 32;
	const layer = lua.lua_isnoneornil(L, 7) ? 0 : lua.lua_tonumber(L, 7) || 0;

	for (let y = 0; y < cel_h; y++) {
		for (let x = 0; x < cel_w; x++) {
			const tile = mget_internal(cel_x + x, cel_y + y);
			if (tile < 0 || tile >= 127) continue;

			if (layer === 0 || (gffData[tile] || 0) & layer) {
				// Push the spr function and arguments
				lua.lua_getglobal(L, "spr"); // Function on top
				lua.lua_pushnumber(L, tile);
				lua.lua_pushnumber(L, sx + x * 8);
				lua.lua_pushnumber(L, sy + y * 8);

				// Call spr(tile, x, y)
				lua.lua_call(L, 3, 0);
			}
		}
	}

	return 0;
}

function mget_internal(x, y) {
	if (x < 0 || x >= 128 || y < 0 || y >= 128) {
		return 0;
	}

	const index = y * 128 + x;

	return mapData[index] ?? 0;
}

export function mget(L) {
	const x = Math.floor(lua.lua_tonumber(L, 1) || 0);
	const y = Math.floor(lua.lua_tonumber(L, 2) || 0);
	const result = mget_internal(x, y);
	lua.lua_pushnumber(L, result);
	return 1;
}

export function mset(L) {
	const x = Math.floor(lua.lua_tonumber(L, 1) || 0);
	const y = Math.floor(lua.lua_tonumber(L, 2) || 0);
	const v = Math.floor(lua.lua_tonumber(L, 3) || 0);

	if (x < 0 || x >= 128 || y < 0 || y >= 128) {
		return 0;
	}

	const index = y * 128 + x;

	if (y < 64) {
		mapData[index] = v;
	}
}

// Math
export function cos(L) {
	const x = lua.lua_tonumber(L, 1) || 0;
	const result = Math.cos(x * 2 * Math.PI);
	lua.lua_pushnumber(L, result);
	return 1;
}

export function flr(L) {
	const x = lua.lua_tonumber(L, 1) || 0;
	const result = Math.floor(x);
	lua.lua_pushnumber(L, result);
	return 1;
}

export function sqrt(L) {
	const x = lua.lua_tonumber(L, 1) || 0;
	const result = Math.sqrt(x);
	lua.lua_pushnumber(L, result);
	return 1;
}

// Time
let startTime = performance.now();

export function time(L) {
	const currentTime = (performance.now() - startTime) / 1000;
	lua.lua_pushnumber(L, currentTime);
	return 1;
}

export const t = time;
