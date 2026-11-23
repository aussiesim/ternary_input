import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { readFileSync } from "node:fs";

// Reads imported .svg files as plain text, compacts insignificant inter-tag
// whitespace, and exports the escaped source string. Keeps the authored icons
// as build inputs so they are bundled into every output.
const svgRawPlugin = {
    name: "svg-raw",
    transform(_code, id) {
        const path = id.split("?")[0];
        if (!path.endsWith(".svg")) return null;
        const compact = readFileSync(path, "utf8").replace(/>\s+</g, "><").trim();
        return { code: `export default ${JSON.stringify(compact)};`, map: { mappings: "" } };
    }
};

const tsPlugin = () =>
    typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: {
            declaration: false,
            declarationMap: false,
            outDir: "dist"
        }
    });

export default [
    {
        input: "src/ternary-input.ts",
        plugins: [svgRawPlugin, tsPlugin()],
        output: {
            file: "dist/ternary-input.js",
            format: "iife",
            name: "TernaryInput",
            sourcemap: false
        }
    },
    {
        input: "src/ternary-input.ts",
        plugins: [svgRawPlugin, tsPlugin()],
        output: {
            file: "dist/ternary-input.min.js",
            format: "iife",
            name: "TernaryInput",
            sourcemap: true,
            plugins: [terser()]
        }
    },
    {
        input: "src/ternary-input.ts",
        plugins: [svgRawPlugin, tsPlugin()],
        output: {
            file: "dist/ternary-input.esm.js",
            format: "es",
            sourcemap: false
        }
    },
    {
        input: "src/ternary-input.ts",
        plugins: [svgRawPlugin, tsPlugin()],
        output: {
            file: "dist/ternary-input.esm.min.js",
            format: "es",
            sourcemap: true,
            plugins: [terser()]
        }
    }
];
