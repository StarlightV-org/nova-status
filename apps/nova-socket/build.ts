import Bun from "bun";

await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./out",
	target: "bun",
	format: "esm",
	minify: true,
	env: "disable",
	// sourcemap: "inline",
});
