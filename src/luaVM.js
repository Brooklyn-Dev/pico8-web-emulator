import { lua, lauxlib, lualib, to_luastring, to_jsstring } from "fengari-web";

export class LuaVM {
	constructor() {
		// Lua state
		this.L = lauxlib.luaL_newstate();

		// Load standard libraries
		lualib.luaL_openlibs(this.L);

		this.isReady = true;
	}

	executeCode(code) {
		if (!this.isReady) return this.#notReady();

		try {
			const luaCode = to_luastring(code);

			// Load code into Lua state (compilation only)
			const loadResult = lauxlib.luaL_loadbuffer(this.L, luaCode, luaCode.length, to_luastring("chunk"));
			if (loadResult !== lua.LUA_OK) return this.#logLuaError("Lua load error");

			// Execute the loaded code
			const callResult = lua.lua_pcall(this.L, 0, 0, 0);
			if (callResult !== lua.LUA_OK) return this.#logLuaError("Lua execution error");

			return true;
		} catch (err) {
			console.error("VM execution error:", err);
			return false;
		}
	}

	callFunction(functionName, ...args) {
		if (!this.isReady) return this.#notReady();

		try {
			lua.lua_getglobal(this.L, to_luastring(functionName));

			// Check if function exists
			if (!lua.lua_isfunction(this.L, -1)) {
				lua.lua_pop(this.L, 1);
				console.warn(`Function '${functionName}' not found`);
				return null;
			}

			// Push arguments onto stack
			args.forEach((arg) => this.#pushValue(arg));

			// Call function
			const result = lua.lua_pcall(this.L, args.length, 1, 0);
			if (result !== lua.LUA_OK) return this.#logLuaError(`Error calling '${functionName}'`);

			// Get return value
			let returnValue = this.#readValue(-1);

			lua.lua_pop(this.L, 1);
			return returnValue;
		} catch (err) {
			console.error(`Error calling function '${functionName}':`, err);
			return null;
		}
	}

	getGlobal(varName) {
		if (!this.isReady) return this.#notReady();

		lua.lua_getglobal(this.L, to_luastring(varName));
		const value = this.#readValue(-1);
		lua.lua_pop(this.L, 1);
		return value;
	}

	setGlobal(varName, value) {
		if (!this.isReady) return this.#notReady();

		this.#pushValue(value);
		lua.lua_setglobal(this.L, to_luastring(varName));
	}

	destroy() {
		if (this.L) {
			lua.lua_close(this.L);
		}
		this.L = null;
		this.isReady = false;
	}

	#pushValue(value) {
		switch (typeof value) {
			case "number":
				lua.lua_pushnumber(this.L, value);
				break;
			case "string":
				lua.lua_pushstring(this.L, to_luastring(value));
				break;
			case "boolean":
				lua.lua_pushboolean(this.L, value);
				break;
			default:
				lua.lua_pushnil(this.L);
		}
	}

	#readValue(index) {
		if (lua.lua_isnumber(this.L, index)) {
			return lua.lua_tonumber(this.L, index);
		}
		if (lua.lua_isstring(this.L, index)) {
			return to_jsstring(lua.lua_tostring(this.L, index));
		}
		if (lua.lua_isboolean(this.L, index)) {
			return lua.lua_toboolean(this.L, index);
		}
		return null;
	}

	#logLuaError(prefix = "Lua error") {
		const msg = to_jsstring(lua.lua_tostring(this.L, -1));
		console.error(`${prefix}:`, msg);
		lua.lua_pop(this.L, 1);
		return false;
	}

	#notReady() {
		console.error("VM not ready");
		return null;
	}
}
