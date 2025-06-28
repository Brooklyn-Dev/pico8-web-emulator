declare module "fengari-web" {
	export * from "fengari";
	namespace lua {
		function lua_luapushjsfunction(L: any, func: (L: any) => number): void;
	}
}
