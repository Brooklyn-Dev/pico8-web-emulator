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

	const lines = luaCode.split("\n");
	const processedLines = lines.map((line) => {
		const trimmed = line.trim();

		// Handle single-line if-statements like "if(cond) a=b c=d"
		const match = trimmed.match(/^if\s*\((.*?)\)\s+(.+)$/);
		if (match && !trimmed.includes("then")) {
			const [_, condition, body] = match;
			const statements = body.split(/\s+(?=[a-zA-Z_][\w]*\s*=)/).map((s) => s.trim());
			const indented = statements.map((s) => `  ${s}`).join("\n");
			return `if ${condition} then\n${indented}\nend`;
		}

		return line;
	});
	luaCode = processedLines.join("\n");

	// Replace "if(cond) return" with "if cond then return end"
	luaCode = luaCode.replace(/if\s*\(([^)]+)\)\s*return/g, "if $1 then return end");

	// Replace editor button glyphs
	luaCode = luaCode
		.replace(new RegExp(String.fromCharCode(139), "g"), "0") // left
		.replace(new RegExp(String.fromCharCode(145), "g"), "1") // right
		.replace(new RegExp(String.fromCharCode(148), "g"), "2") // up
		.replace(new RegExp(String.fromCharCode(131), "g"), "3"); // down

	return luaCode;
}
