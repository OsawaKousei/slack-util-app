import esbuild from "esbuild";
import { GasPlugin } from "esbuild-gas-plugin";
import dotenv from "dotenv";

dotenv.config();

esbuild
  .build({
    entryPoints: ["./src/main.ts"],
    bundle: true,
    minify: true,
    outfile: "./dist/main.js",
    plugins: [GasPlugin],
    define: {
      "process.env.SLACK_BOT_TOKEN": JSON.stringify(
        process.env.SLACK_BOT_TOKEN
      ),
      "process.env.SLACK_SIGNING_SECRET": JSON.stringify(
        process.env.SLACK_SIGNING_SECRET
      ),
      "process.env.LOG_SPREADSHEET_ID": JSON.stringify(
        process.env.LOG_SPREADSHEET_ID
      ),
    },
    sourcemap: "inline",
    target: ["es2020"],
  })
  .catch((error) => {
    console.log("ビルドに失敗しました");
    console.error(error);
    process.exit(1);
  });
