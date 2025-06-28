import { lua } from "fengari-web";

let ctxRef = null;

export function bindAPIResources(ctx) {
	ctxRef = ctx;
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
export function cls(L) {
	if (!ctxRef) return 0;

	const col = lua.lua_isnoneornil(L, 1) ? 0 : lua.lua_tonumber(L, 1) || 0;
	ctxRef.fillStyle = PALETTE[Math.floor(col) % 16];
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

// Math
export function cos(L) {
	const x = lua.lua_tonumber(L, 1) || 0;
	const result = Math.cos(x * 2 * Math.PI);
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
let startTime = Date.now();

export function time(L) {
	const currentTime = (Date.now() - startTime) / 1000;
	lua.lua_pushnumber(L, currentTime);
	return 1;
}

export const t = time;
