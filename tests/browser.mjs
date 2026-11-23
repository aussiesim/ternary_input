// Real-browser regression: runs the built minified IIFE global and ESM builds
// inside Chromium over strict request interception. Only the explicit
// allowlist below is served; every other same-origin request is a violation.
// No live server, no external requests.
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = path.join(root, "tests", ".artifacts");
await mkdir(artifacts, { recursive: true });

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".map": "application/json"
};

// Explicit allowlist: pathname -> file relative to project root.
const ROUTES = new Map(Object.entries({
    "/": "tests/fixture.html",
    "/tests/fixture.js": "tests/fixture.js",
    "/tests/bad.svg": "tests/bad.svg",
    "/tests/palette.svg": "tests/palette.svg",
    "/tests/slow.svg": "tests/slow.svg",
    "/dist/ternary-input.min.js": "dist/ternary-input.min.js",
    "/dist/ternary-input.min.js.map": "dist/ternary-input.min.js.map",
    "/dist/ternary-input.esm.min.js": "dist/ternary-input.esm.min.js",
    "/dist/ternary-input.esm.min.js.map": "dist/ternary-input.esm.min.js.map",
    "/dist/ternary-input.min.css": "dist/ternary-input.min.css",
    "/dist/ternary-input.css": "dist/ternary-input.css",
    "/dist/ternary-input.js": "dist/ternary-input.js",
    "/dist/ternary-input.js.map": "dist/ternary-input.js.map",
    "/dist/ternary-input.esm.js": "dist/ternary-input.esm.js",
    "/dist/ternary-input.esm.js.map": "dist/ternary-input.esm.js.map",
    "/examples/index.html": "examples/index.html",
    "/examples/demo.css": "examples/demo.css",
    "/examples/demo.js": "examples/demo.js",
    "/examples/icons/neutral.svg": "examples/icons/neutral.svg",
    "/examples/icons/positive.svg": "examples/icons/positive.svg",
    "/examples/icons/negative.svg": "examples/icons/negative.svg",
    "/demo/": "examples/index.html",
    "/demo/demo.css": "examples/demo.css",
    "/demo/demo.js": "examples/demo.js",
    "/demo/icons/neutral.svg": "examples/icons/neutral.svg",
    "/demo/icons/positive.svg": "examples/icons/positive.svg",
    "/demo/icons/negative.svg": "examples/icons/negative.svg"
}));

const requests = [];
const violations = [];
const failedRequests = [];
let pass = 0;
let failCount = 0;

const check = (name, condition, extra = "") => {
    if (condition) {
        pass++;
        console.log(`  PASS ${name}`);
    } else {
        failCount++;
        console.error(`  FAIL ${name} ${extra}`);
    }
};
const eq = (name, actual, expected) =>
    check(name, actual === expected,
        `(got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
const near = (name, rgb, expected, tol = 12) =>
    check(name,
        rgb.slice(0, 3).every((v, i) => Math.abs(v - expected[i]) <= tol),
        `(got rgb(${rgb.slice(0, 3).join(",")}), want ~rgb(${expected.join(",")}) a=${rgb[3]})`);

// Gate for the delayed stale-load response.
let releaseSlow = () => {};
const slowGate = new Promise((r) => { releaseSlow = r; });

const serve = async (request) => {
    const url = new URL(request.url());
    // Caller-supplied data/blob decodes (pixel-sampling canvases, image
    // fixtures) are explicitly allowed and never counted as violations.
    if (url.protocol === "data:" || url.protocol === "blob:") {
        await request.continue();
        return;
    }
    if (url.origin !== "http://ternary.local") {
        violations.push(`off-origin: ${request.url()}`);
        await request.abort();
        return;
    }
    requests.push(url.pathname);
    if (url.pathname === "/favicon.ico") {
        await request.respond({ status: 204, body: "" });
        return;
    }
    if (url.pathname === "/tests/slow.svg") {
        await slowGate;
    }
    const rel = ROUTES.get(url.pathname);
    if (rel === undefined) {
        violations.push(`unexpected request: ${url.pathname}`);
        await request.abort();
        return;
    }
    const file = path.join(root, rel);
    if (!file.startsWith(root)) {
        violations.push(`path escape: ${url.pathname}`);
        await request.abort();
        return;
    }
    try {
        const body = await readFile(file);
        await request.respond({
            status: 200,
            contentType: MIME[path.extname(file)] ?? "application/octet-stream",
            body
        });
    } catch {
        await request.respond({ status: 404, body: "not found" });
    }
};

const attachPageGuards = (page, errors) => {
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
    });
    page.on("requestfailed", (r) => {
        const u = new URL(r.url());
        if (!u.pathname.includes("favicon")) {
            failedRequests.push(`${u.pathname} ${r.failure()?.errorText}`);
        }
    });
};

const browser = await puppeteer.launch({ headless: true });

try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 800 });
    await page.setRequestInterception(true);
    const consoleErrors = [];
    page.on("request", serve);
    attachPageGuards(page, consoleErrors);

    await page.goto("http://ternary.local/", { waitUntil: "networkidle0" });
    try {
        await page.waitForFunction("window.__ready === true", { timeout: 15000 });
    } catch (e) {
        console.error("READY TIMEOUT");
        console.error("requests:", requests.join("\n"));
        console.error("violations:", violations.join("\n"));
        console.error("consoleErrors:", consoleErrors.join("\n"));
        throw e;
    }

    // --- Real accessible tree -------------------------------------------
    const cdp = await page.createCDPSession();
    const axName = async (selector) => {
        const { root: docRoot } = await cdp.send("DOM.getDocument", { depth: 1 });
        const { nodeId } = await cdp.send("DOM.querySelector",
            { nodeId: docRoot.nodeId, selector });
        const { nodes } = await cdp.send("Accessibility.getPartialAXTree",
            { nodeId, fetchRelatives: false });
        const node = nodes.find((n) => !n.ignored);
        return {
            name: node?.name?.value ?? "",
            description: node?.description?.value ?? "",
            role: node?.role?.value ?? ""
        };
    };
    const axB1 = await axName("#b1");
    eq("AX name (IIFE, explicit label)", axB1.name, "Explicit label");
    check("AX description carries state+cycle (IIFE)",
        /Current state: Neutral|Activate to cycle/.test(axB1.description),
        axB1.description);
    const axB2 = await axName("#b2");
    eq("AX name (ESM, wrapping label)", axB2.name, "Wrapped text");
    const axB3 = await axName("#b3");
    eq("AX name (inline text)", axB3.name, "Inline text");
    const axB4 = await axName("#b4");
    eq("AX name (aria-label)", axB4.name, "Aria only");
    check("AX role is button, not toggle", axB1.role === "button", axB1.role);

    // Cross-build ID uniqueness: every generated description/status/SVG id
    // must be unique and describedby must resolve to real descriptions.
    const idAudit = await page.evaluate(() => {
        const described = [];
        for (const b of document.querySelectorAll("button.ternary-input")) {
            for (const tok of (b.getAttribute("aria-describedby") ?? "")
                .split(/\s+/).filter(Boolean)) {
                described.push({ button: b.id, id: tok });
            }
        }
        const allIds = [...document.querySelectorAll("[id]")].map((e) => e.id);
        const dupes = allIds.filter((v, i) => allIds.indexOf(v) !== i);
        const missing = described.filter(
            (d) => document.getElementById(d.id) === null);
        const svgIds = [...document.querySelectorAll("svg [id]")].map((e) => e.id);
        const svgDupes = svgIds.filter((v, i) => svgIds.indexOf(v) !== i);
        return {
            dupes,
            missing,
            svgDupes,
            hostCollision: svgIds.some((id) =>
                !id.startsWith("ti") && described.some((d) => d.id === id))
        };
    });
    check("no duplicate DOM ids across IIFE+ESM copies", idAudit.dupes.length === 0,
        JSON.stringify(idAudit.dupes));
    check("every describedby token resolves", idAudit.missing.length === 0,
        JSON.stringify(idAudit.missing));
    check("no duplicate mounted SVG ids", idAudit.svgDupes.length === 0,
        JSON.stringify(idAudit.svgDupes));

    // --- Activation -------------------------------------------------------
    eq("global build exposed", await page.evaluate(() =>
        typeof window.TernaryInput?.setupTernary), "function");

    await page.click("#b1");
    eq("button click cycles to 1", await page.evaluate(() => window.__t.b1.checked), 1);
    await page.click("#l1");
    eq("explicit label click cycles natively",
        await page.evaluate(() => window.__t.b1.checked), -1);
    await page.click("#wraptext");
    eq("wrapping label text click cycles",
        await page.evaluate(() => window.__t.b2.checked), 1);

    // Keyboard: exactly one step per Space / Enter.
    await page.focus("#b3");
    await page.keyboard.press("Space");
    eq("Space cycles once", await page.evaluate(() => window.__t.b3.checked), 1);
    await page.keyboard.press("Enter");
    eq("Enter cycles once", await page.evaluate(() => window.__t.b3.checked), -1);
    eq("focus retained", await page.evaluate(() => document.activeElement.id), "b3");

    // Real Tab navigation lands on a ternary button with a visible outline.
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Tab");
    const focusInfo = await page.evaluate(() => {
        const el = document.activeElement;
        const cs = getComputedStyle(el);
        return {
            id: el.id,
            tag: el.tagName,
            ternary: el.classList.contains("ternary-input"),
            outlineWidth: cs.outlineWidth,
            outlineStyle: cs.outlineStyle
        };
    });
    check("Tab moves focus to a ternary button",
        focusInfo.tag === "BUTTON" && focusInfo.ternary, JSON.stringify(focusInfo));
    check("keyboard focus has a visible outline",
        focusInfo.outlineStyle !== "none" && parseFloat(focusInfo.outlineWidth) > 0,
        JSON.stringify(focusInfo));

    // Click on whitespace outside the content-sized label: state unchanged.
    const beforeWhite = await page.evaluate(() => window.__t.b2.checked);
    await page.evaluate(() => document.activeElement.blur());
    const wrapBox = await (await page.$("#wrap")).boundingBox();
    await page.mouse.click(
        wrapBox.x + wrapBox.width + 30, wrapBox.y + wrapBox.height / 2);
    eq("whitespace click does not toggle",
        await page.evaluate(() => window.__t.b2.checked), beforeWhite);

    await page.click("#b4 .ternary-input__icon");
    eq("icon click cycles once", await page.evaluate(() => window.__t.b4.checked), 1);

    // --- DOM accessibility structure --------------------------------------
    check("no checkbox semantics", await page.evaluate(() =>
        !document.getElementById("b1").hasAttribute("aria-checked") &&
        !document.getElementById("b1").hasAttribute("aria-pressed") &&
        !document.getElementById("b1").hasAttribute("role")));
    check("live region outside wrap label", await page.evaluate(() =>
        !document.getElementById("wrap").querySelector("[aria-live]") &&
        document.querySelector("[aria-live='polite']") !== null));

    // --- Forms --------------------------------------------------------------
    eq("FormData sees numeric state", await page.evaluate(() =>
        new FormData(document.getElementById("form1")).get("nf")), "1");
    eq("fieldset-disabled button guarded", await page.evaluate(() => {
        document.getElementById("b6").click();
        return window.__t.b6.checked;
    }), 0);
    check("fieldset-disabled input omitted", await page.evaluate(() =>
        new FormData(document.getElementById("form1")).get("fs") === null));
    check("first-legend button stays enabled", await page.evaluate(() => {
        const b = document.getElementById("b8");
        const before = window.__t.b8.checked;
        b.click();
        return window.__t.b8.checked !== before;
    }));
    eq("external form ownership", await page.evaluate(() =>
        new FormData(document.getElementById("extf")).get("e7")), "0");
    check("form reset restores initial on microtask", await page.evaluate(async () => {
        const b = document.getElementById("b5");
        b.click(); // 1 -> -1
        document.getElementById("form1").reset();
        await new Promise((r) => setTimeout(r, 0));
        return window.__t.b5.checked === 1 &&
            new FormData(document.getElementById("form1")).get("nf") === "1";
    }));
    check("canceled reset leaves state", await page.evaluate(async () => {
        const b = document.getElementById("b5");
        b.click(); // 1 -> -1
        const form = document.getElementById("form1");
        const cancel = (e) => e.preventDefault();
        form.addEventListener("reset", cancel);
        form.reset();
        await new Promise((r) => setTimeout(r, 0));
        form.removeEventListener("reset", cancel);
        const ok = window.__t.b5.checked === -1 &&
            new FormData(form).get("nf") === "-1";
        form.reset();
        await new Promise((r) => setTimeout(r, 0));
        return ok;
    }));
    check("no submit event and no navigation",
        await page.evaluate(() => window.__submits) === 0 &&
        page.url() === "http://ternary.local/");

    // --- Exact pixel assertions on the palette fixture ---------------------
    // Icon layout: TL = FG rect, TR = BG + purple accent, BR = fg->purple
    // gradient, BL = BG. Sample inside each region.
    const pixels = async (points) => {
        const el = await page.$("#pixelsvg svg.ternary-input__svg");
        const buf = await el.screenshot();
        return page.evaluate(async (b64, pts) => {
            const img = new Image();
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = "data:image/png;base64," + b64;
            });
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            return pts.map(([fx, fy]) => [
                ...ctx.getImageData(
                    Math.round(fx * (c.width - 1)),
                    Math.round(fy * (c.height - 1)), 1, 1).data
            ]);
        }, buf.toString("base64"), points);
    };
    // State 0: fg #0044bb, bg #ffffff. Custom icons mount asynchronously
    // (cached fetch + prepare), so always wait for the accent circle marker.
    const waitPixelIcon = (sel) =>
        page.waitForFunction(
            `document.querySelector("${sel} svg.ternary-input__svg circle") !== null`,
            { timeout: 5000 });
    await waitPixelIcon("#pixelsvg");
    let px = await pixels([[0.25, 0.25], [0.9, 0.1], [0.75, 0.75]]);
    near("neutral fg pixel", px[0], [0, 68, 187]);
    near("neutral bg pixel", px[1], [255, 255, 255]);
    check("neutral gradient pixel is blended",
        px[2][2] > 60 && px[2][2] < 200, JSON.stringify(px[2]));
    await page.evaluate(() => window.__t.pixelsvg.setChecked(1));
    await waitPixelIcon("#pixelsvg");
    px = await pixels([[0.25, 0.25], [0.9, 0.1]]);
    near("positive fg pixel", px[0], [0, 170, 34]);
    near("positive bg pixel stays shared", px[1], [255, 255, 255]);
    await page.evaluate(() => window.__t.pixelsvg.setChecked(-1));
    await waitPixelIcon("#pixelsvg");
    px = await pixels([[0.25, 0.25], [0.75, 0.25]]);
    near("negative fg pixel", px[0], [221, 34, 34]);
    // Accent: 50% purple (138,79,208) over white bg = ~(207,168,232).
    near("purple accent at 50% opacity", px[1], [207, 168, 232], 18);

    // Theme var change: pixels must follow with no API calls and no fetch.
    const fetchCountBefore = requests.filter((p) => p === "/tests/palette.svg").length;
    await page.evaluate(() => window.__t.pixelsvg.setChecked(0));
    await waitPixelIcon("#pixelsvg");
    const restored = (await pixels([[0.25, 0.25]]))[0];
    near("neutral fg pixel restored", restored, [0, 68, 187]);
    eq("no extra fetches after state changes",
        requests.filter((p) => p === "/tests/palette.svg").length, fetchCountBefore);

    // var-backed theme on #themed: change the page var only, pixels follow.
    // The themed instance uses the same palette fixture but var() colors.
    await page.evaluate(() => window.__t.themed.setChecked(1));
    await waitPixelIcon("#themed");
    const themedPixel = async () => {
        const el = await page.$("#themed svg.ternary-input__svg");
        const buf = await el.screenshot();
        return page.evaluate(async (b64) => {
            const img = new Image();
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = "data:image/png;base64," + b64;
            });
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const d = ctx.getImageData(
                Math.round(c.width * 0.25), Math.round(c.height * 0.25), 1, 1)
                .data;
            return [d[0], d[1], d[2], d[3]];
        }, buf.toString("base64"));
    };
    // Positive fg = var(--fixture-pos) (#0a7a28).
    near("var-backed positive fg initial", await themedPixel(), [10, 122, 40]);
    const themeFetches = requests.filter((p) => p === "/tests/palette.svg").length;
    await page.evaluate(() => {
        document.documentElement.style
            .setProperty("--fixture-pos", "#a00000");
    });
    near("var-backed positive fg follows theme", await themedPixel(),
        [160, 0, 0]);
    eq("theme update caused no new fetch",
        requests.filter((p) => p === "/tests/palette.svg").length, themeFetches);

    // State-only background fallback: only negative_bg overridden. Sample
    // the top-right corner, away from accent and gradient regions.
    const bgPixel = async () => {
        const el = await page.$("#bgonly svg.ternary-input__svg");
        const buf = await el.screenshot();
        return page.evaluate(async (b64) => {
            const img = new Image();
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = "data:image/png;base64," + b64;
            });
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const d = ctx.getImageData(
                Math.round(c.width * 0.95), Math.round(c.height * 0.05), 1, 1)
                .data;
            return [d[0], d[1], d[2], d[3]];
        }, buf.toString("base64"));
    };
    await waitPixelIcon("#bgonly");
    // state 0: bg falls back to preset default (transparent -> page white).
    near("neutral bg falls back when only negative_bg set", await bgPixel(),
        [255, 255, 255], 25);
    await page.evaluate(() => window.__t.bgonly.setChecked(-1));
    await waitPixelIcon("#bgonly");
    near("negative bg override pixel", await bgPixel(), [32, 32, 64]);

    // --- Custom recolorable SVG ---------------------------------------------
    await page.evaluate(() => {
        window.__t.customA.setChecked(1);
        window.__t.customB.setChecked(1);
    });
    await page.waitForFunction(() =>
        document.querySelectorAll("#customA svg.ternary-input__svg").length > 0 &&
        document.querySelectorAll("#customB svg.ternary-input__svg").length > 0);
    check("custom icon fetched once per instance",
        requests.filter((p) => p === "/examples/icons/positive.svg").length === 2,
        `requests: ${requests.filter((p) => p.includes("positive")).join()}`);
    const customIds = await page.evaluate(() => {
        const ids = (r) => [...r.querySelectorAll("[id]")].map((e) => e.id);
        return {
            a: ids(document.getElementById("customA")),
            b: ids(document.getElementById("customB"))
        };
    });
    check("per-mount id namespaces differ",
        customIds.a.length > 0 && customIds.a.every((id) => !customIds.b.includes(id)),
        JSON.stringify(customIds));
    eq("gradient stop mapped to palette var", await page.evaluate(() =>
        document.querySelector("#customA stop")?.getAttribute("stop-color")),
        "var(--ternary-resolved-fg)");
    eq("non-palette accent preserved", await page.evaluate(() => {
        const stops = document.querySelectorAll("#customA svg stop");
        return stops[1] ? getComputedStyle(stops[1]).stopColor : null;
    }), "rgb(138, 79, 208)");

    // --- Unchanged images -----------------------------------------------------
    await page.click("#plainimg");
    await page.waitForFunction(() =>
        document.querySelector("#plainimg img.ternary-input__svg") !== null);
    check("string icon renders as img after load", true);
    check("unchanged img kept its URL (no recolor rewrite)",
        await page.evaluate(() =>
            document.querySelector("#plainimg img.ternary-input__svg")
                .src.endsWith("/examples/icons/neutral.svg")));

    // --- Failure handling -----------------------------------------------------
    await page.click("#badicon");
    await page.waitForFunction(() => window.__iconerrors.length >= 1);
    check("bad svg falls back to builtin", await page.evaluate(() =>
        document.querySelector("#badicon svg.ternary-input__svg") !== null));
    await page.click("#activeicon");
    await new Promise((r) => setTimeout(r, 50));
    check("active scheme rejected without fetch",
        !requests.some((p) => p.includes("javascript")));
    check("iconerror fired for both failures", await page.evaluate(() =>
        window.__iconerrors.length >= 2));

    // --- Delayed stale load: gated response must not replace newer state -----
    await page.evaluate(() => {
        window.__t.slowicon.setChecked(1); // fetch for /tests/slow.svg is gated
        window.__t.slowicon.setChecked(-1); // newer builtin state wins
    });
    releaseSlow();
    await new Promise((r) => setTimeout(r, 150));
    check("released stale response did not replace newer icon",
        await page.evaluate(() =>
            window.__t.slowicon.checked === -1 &&
            document.querySelector("#slowicon svg.ternary-input__svg") !== null &&
            document.querySelector("#slowicon svg ellipse") === null));

    // --- Network discipline ----------------------------------------------------
    check("builtins make no icon requests",
        requests.filter((p) => p.startsWith("/icons/")).length === 0,
        JSON.stringify(requests));
    check("no unexpected requests", violations.length === 0, violations.join(","));
    check("no console/page errors", consoleErrors.length === 0,
        consoleErrors.join(" | "));

    // --- Layout ----------------------------------------------------------------
    const target = await page.evaluate(() => {
        const r = document.getElementById("b1").getBoundingClientRect();
        return { w: r.width, h: r.height };
    });
    check("target at least 24x24", target.w >= 24 && target.h >= 24,
        JSON.stringify(target));

    // Forced-colors emulation via raw CDP (may be unsupported on some builds).
    try {
        await cdp.send("Emulation.setEmulatedMedia", {
            features: [{ name: "forced-colors", value: "active" }]
        });
        const forced = await page.evaluate(() => {
            const t = document.querySelector("#b1 .ternary-input__state-text");
            const icon = document.querySelector("#b1 .ternary-input__icon");
            return t && getComputedStyle(t).display !== "none" &&
                getComputedStyle(icon).inlineSize !== "0px";
        });
        check("forced-colors state fallback visible and sized", forced === true);
        await cdp.send("Emulation.setEmulatedMedia", {
            features: [{ name: "forced-colors", value: "none" }]
        });
    } catch {
        console.log("  SKIP forced-colors emulation unsupported in this Chromium");
    }

    // --- Screenshots ------------------------------------------------------------
    const shot = (sel, name) =>
        page.$(sel).then((el) => el.screenshot({ path: path.join(artifacts, name) }));
    await shot("#b1", "numbers-negative.png");
    await page.evaluate(() => { document.getElementById("b1").click(); });
    await shot("#b1", "numbers-neutral.png");
    await page.evaluate(() => { document.getElementById("b1").click(); });
    await shot("#b1", "numbers-positive.png");
    await shot("#b2", "heart-positive.png");
    await shot("#customA", "custom-positive.png");
    await shot("#pixelsvg", "palette-fixture.png");
    await shot("#wrap", "wrapping-label.png");

    // --- Real demo page ----------------------------------------------------------
    const demo = await browser.newPage();
    await demo.setRequestInterception(true);
    demo.on("request", serve);
    const demoErrors = [];
    attachPageGuards(demo, demoErrors);
    await demo.setViewport({ width: 1100, height: 900 });
    await demo.goto("http://ternary.local/demo/", { waitUntil: "networkidle0" });
    check("demo initializes all presets", await demo.evaluate(() =>
        document.querySelectorAll("button.ternary-input").length >= 13));
    check("demo single-instance disabled", await demo.evaluate(() => {
        const b = document.getElementById("form-disabled");
        return b.disabled && b.classList.contains("ternary-input") &&
            new FormData(document.getElementById("demo-form"))
                .get("disabled_pref") === null;
    }));
    check("demo dark theme renders dark", await demo.evaluate(() => {
        document.getElementById("theme-toggle").click();
        const bg = getComputedStyle(document.body).backgroundColor;
        const m = bg.match(/\d+/g).map(Number);
        document.getElementById("theme-toggle").click();
        return m[0] + m[1] + m[2] < 200;
    }));
    await demo.screenshot({ path: path.join(artifacts, "demo.png"), fullPage: true });
    await demo.setViewport({ width: 380, height: 700 });
    await new Promise((r) => setTimeout(r, 100));
    check("demo no horizontal overflow at 380px", await demo.evaluate(() =>
        document.documentElement.scrollWidth <= 381));
    check("demo has no page errors", demoErrors.length === 0,
        demoErrors.join(" | "));
    check("demo made only allowlisted requests", violations.length === 0,
        violations.join(","));
    check("no failed requests across fixture and demo",
        failedRequests.length === 0, failedRequests.join(","));

    console.log(`screenshots saved to ${artifacts}`);
    console.log(`\n${pass} passed, ${failCount} failed`);
    if (failCount > 0) process.exitCode = 1;
} finally {
    await browser.close();
}
