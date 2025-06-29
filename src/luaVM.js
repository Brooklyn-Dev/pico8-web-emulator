import { lua, lauxlib, lualib, to_luastring, to_jsstring } from "fengari-web";

export default class LuaVM {
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
			if (loadResult !== lua.LUA_OK) {
				console.error("Lua load failed with code:", loadResult);
				return this.#logLuaError("Lua load error");
			}

			// Execute the loaded code
			const callResult = lua.lua_pcall(this.L, 0, 0, 0);
			if (callResult !== lua.LUA_OK) {
				console.error("Lua execution failed with code:", callResult);
				return this.#logLuaError("Lua execution error");
			}

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

			// Check if function exists and is actually a function
			if (lua.lua_isnil(this.L, -1)) {
				lua.lua_pop(this.L, 1);
				console.warn(`Function '${functionName}' is nil/undefined`);
				return null;
			}

			if (!lua.lua_isfunction(this.L, -1)) {
				console.warn(`'${functionName}' exists but is not a function, type:`, lua.lua_type(this.L, -1));
				lua.lua_pop(this.L, 1);
				return null;
			}

			// Push arguments onto stack
			args.forEach((arg) => this.#pushValue(arg));

			// Call function
			let numResults;
			if (functionName === "_draw" || functionName === "_update" || functionName === "_init") {
				numResults = 0;
			} else if (functionName === "camera") {
				numResults = 2;
			} else {
				numResults = 1; // Default
			}

			const result = lua.lua_pcall(this.L, args.length, numResults, 0);
			if (result !== lua.LUA_OK) {
				console.error(`Function '${functionName}' failed with error code:`, result);
				return this.#logLuaError(`Error calling '${functionName}'`);
			}

			// Get return value if expected
			let returnValue = null;
			if (numResults > 0) {
				returnValue = this.#readValue(-1);
				lua.lua_pop(this.L, 1);
			}

			return returnValue;
		} catch (err) {
			console.error(`Error calling function '${functionName}':`, err);
			return null;
		}
	}

	addFunction(name, fn) {
		if (!this.isReady) return this.#notReady();

		try {
			const L = this.L;

			lua.lua_pushjsfunction(L, fn);
			lua.lua_setglobal(L, to_luastring(name));

			// Verify the function was set
			lua.lua_getglobal(L, to_luastring(name));
			const isFunction = lua.lua_isfunction(L, -1);
			lua.lua_pop(L, 1);

			if (!isFunction) {
				console.error(`Failed to register function '${name}'`);
				return false;
			}

			return true;
		} catch (err) {
			console.error(`Error adding function '${name}':`, err);
			return false;
		}
	}

	getGlobal(varName) {
		if (!this.isReady) return this.#notReady();

		try {
			lua.lua_getglobal(this.L, to_luastring(varName));
			const value = this.#readValue(-1);
			lua.lua_pop(this.L, 1);
			return value;
		} catch (err) {
			console.error(`Error getting global '${varName}':`, err);
			return null;
		}
	}

	setGlobal(varName, value) {
		if (!this.isReady) return this.#notReady();

		try {
			this.#pushValue(value);
			lua.lua_setglobal(this.L, to_luastring(varName));
			return true;
		} catch (err) {
			console.error(`Error setting global '${varName}':`, err);
			return false;
		}
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
		if (lua.lua_isfunction(this.L, index)) {
			return "function";
		}
		if (lua.lua_isnil(this.L, index)) {
			return null;
		}
		return `unknown_type_${lua.lua_type(this.L, index)}`;
	}

	#logLuaError(prefix = "Lua error") {
		try {
			let msgPtr = lua.lua_tostring(this.L, -1);
			if (!msgPtr) {
				const type = lua.lua_type(this.L, -1);
				console.error(`${prefix}: non-string error, type =`, lua.lua_typename(this.L, type));
				lua.lua_pop(this.L, 1);
				return false;
			}

			let msg = to_jsstring(msgPtr);
			console.error(`${prefix}:`, msg);
			lua.lua_pop(this.L, 1);
			return false;
		} catch (err) {
			console.error("Error in error handler:", err);
			return false;
		}
	}

	#notReady() {
		console.error("VM not ready");
		return null;
	}
}
