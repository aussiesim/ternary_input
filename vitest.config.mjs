import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";

const svgRawPlugin = {
    name: "svg-raw",
    enforce: "pre",
    transform(_code, id) {
        const path = id.split("?")[0];
        if (!path.endsWith(".svg")) return null;
        const compact = readFileSync(path, "utf8").replace(/>\s+</g, "><").trim();
        return { code: `export default ${JSON.stringify(compact)};`, map: { mappings: "" } };
    }
};

export default defineConfig({
    plugins: [svgRawPlugin],
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"]
    }
});
