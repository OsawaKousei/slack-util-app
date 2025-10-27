import esbuild from "esbuild";
import { GasPlugin } from "esbuild-gas-plugin";

esbuild
  .build({
    entryPoints: ["./src/main.ts"],
    bundle: true,
    minify: true,
    outfile: "./dist/main.js",
    plugins: [GasPlugin],
    sourcemap: "inline",
    target: ["es2020"],
  })
  .catch((error) => {
    console.log("ビルドに失敗しました");
    console.error(error);
    process.exit(1);
  });
