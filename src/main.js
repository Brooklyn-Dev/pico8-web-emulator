import { extractLuaCode, extractP8Bytes } from "./cartridge";
import { LuaVM } from "./luaVM";

async function start() {
	// const bytes = await extractP8Bytes("/assets/celeste.p8.png");
	// console.log(extractLuaCode(bytes));

	const vm = new LuaVM();

	vm.executeCode(`
		print("Lua VM started")
		num = 42
		function greet(name)
			return "Hello, " .. name
		end
	`);

	console.log("num:", vm.getGlobal("num")); // 42

	vm.setGlobal("num", 99);
	console.log("updated num:", vm.getGlobal("num")); // 99

	console.log("greet('Bob'):", vm.callFunction("greet", "Bob")); // "Hello, Bob"
}

start();
