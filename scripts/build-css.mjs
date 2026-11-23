import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src", "css", "ternary-input.css");
const distDir = path.join(root, "dist");

await mkdir(distDir, { recursive: true });

const source = await readFile(sourcePath, "utf8");
await writeFile(path.join(distDir, "ternary-input.css"), source, "utf8");

const result = new CleanCSS({ level: 2 }).minify(source);
if (result.errors.length > 0) {
    for (const error of result.errors) console.error(error);
    process.exitCode = 1;
} else {
    for (const warning of result.warnings) console.warn(warning);
    await writeFile(path.join(distDir, "ternary-input.min.css"), result.styles, "utf8");
}
