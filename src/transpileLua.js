export default function transpileLua(luaCode) {
	// Replace != with ~=
	luaCode = luaCode.replace(/!=/g, "~=");

	// Replace shorthand operators like -=, += etc
	luaCode = luaCode.replace(
		/([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)\s*([-+*/%])=\s*([^\s;]+)/g,
		(match, varName, op, value) => {
			return `${varName} = ${varName} ${op} ${value}`;
		}
	);

	// Replace "if(cond) return" with "if cond then return end"
	luaCode = luaCode.replace(/if\s*\(([^)]+)\)\s*return/g, "if $1 then return end");

	return luaCode;
}
