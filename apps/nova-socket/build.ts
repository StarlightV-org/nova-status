import Bun from "bun";

await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./out",
	target: "bun",
	format: "esm",
	minify: true,
	env: "disable",
	external: ["postgres", "pg", "pg-native", "mysql2", "mongodb", "ioredis"],
	// sourcemap: "inline",
});
