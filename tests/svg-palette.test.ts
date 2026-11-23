import { describe, it, expect, beforeEach } from "vitest";
import {
    SVG_NS,
    SVG_SOURCE_LIMITS,
    SvgPaletteError,
    instantiatePreparedSvg,
    normalizeOpaqueColor,
    parseSourceColors,
    prepareSvgSource
} from "../src/svg-palette";
import { setupTernary } from "../src/ternary-input";
import { vi } from "vitest";

const doc = document;

const base = (inner: string, attrs = ""): string =>
    `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24" ${attrs}>${inner}</svg>`;

const prepare = (source: string) => prepareSvgSource(source, doc);

describe("normalizeOpaqueColor", () => {
    it("normalizes hex, rgb(), and black/white keywords", () => {
        expect(normalizeOpaqueColor("#000")).toBe("#000000");
        expect(normalizeOpaqueColor("#FFF")).toBe("#ffffff");
        expect(normalizeOpaqueColor("rgb(255, 0, 0)")).toBe("#ff0000");
        expect(normalizeOpaqueColor("rgb(0 0 0)")).toBe("#000000");
        expect(normalizeOpaqueColor("black")).toBe("#000000");
        expect(normalizeOpaqueColor("WHITE")).toBe("#ffffff");
        expect(normalizeOpaqueColor("rgba(0,0,0,0.5)")).toBeNull();
        expect(normalizeOpaqueColor("red")).toBeNull();
        expect(normalizeOpaqueColor("#12")).toBeNull();
    });
});

describe("parseSourceColors", () => {
    it("defaults to black/white and validates distinct opaque colors", () => {
        expect(parseSourceColors()).toEqual({
            foreground: "#000000",
            background: "#ffffff"
        });
        expect(parseSourceColors({ foreground: "#112233" }))
            .toEqual({ foreground: "#112233", background: "#ffffff" });
        expect(() =>
            parseSourceColors({ foreground: "red" })
        ).toThrow(SvgPaletteError);
        expect(() =>
            parseSourceColors({ foreground: "#000", background: "#000000" })
        ).toThrow(/distinct/);
        expect(() =>
            parseSourceColors({ foreground: "rgba(0,0,0,0.5)" })
        ).toThrow();
    });
});

describe("prepareSvgSource acceptance", () => {
    it("rebuilds allowed elements and substitutes palette paints", () => {
        const source = base(
            `<rect width="24" height="24" fill="#ffffff"/>` +
            `<path d="M1 1h4v4H1z" fill="#000"/>` +
            `<circle cx="12" cy="12" r="4" fill="#8a4fd0"/>` +
            `<path d="M2 2h2v2H2z" style="fill: #000; stroke: #ffffff; opacity: 0.5"/>`
        );
        const { template } = prepare(source);
        const rect = template.querySelector("rect")!;
        expect(rect.getAttribute("fill")).toBe("var(--ternary-resolved-bg)");
        const black = template.querySelector("path")!;
        expect(black.getAttribute("fill")).toBe("var(--ternary-resolved-fg)");
        const accent = template.querySelector("circle")!;
        expect(accent.getAttribute("fill")).toBe("#8a4fd0");
        const styled = template.querySelectorAll("path")[1]!;
        expect(styled.getAttribute("style")).toContain("var(--ternary-resolved-fg)");
        expect(styled.getAttribute("style")).toContain("var(--ternary-resolved-bg)");
        expect(styled.getAttribute("style")).toContain("opacity: 0.5");
    });

    it("preserves authored opacity and non-palette colors", () => {
        const { template } = prepare(base(
            `<rect x="0" y="0" width="4" height="4" fill="#000000" fill-opacity="0.4" opacity="0.8"/>`
        ));
        const rect = template.querySelector("rect")!;
        expect(rect.getAttribute("fill")).toBe("var(--ternary-resolved-fg)");
        expect(rect.getAttribute("fill-opacity")).toBe("0.4");
        expect(rect.getAttribute("opacity")).toBe("0.8");
    });

    it("maps custom sourceColors and leaves text intact", () => {
        const source = base(
            `<rect width="24" height="24" fill="rgb(17, 34, 51)"/>` +
            `<text x="2" y="12" fill="#000000">Hi</text>`,
            ``
        );
        const { template } = prepareSvgSource(source, doc, {
            foreground: "#000000",
            background: "#112233"
        });
        expect(template.querySelector("rect")!.getAttribute("fill"))
            .toBe("var(--ternary-resolved-bg)");
        expect(template.querySelector("text")!.textContent).toBe("Hi");
        expect(template.querySelector("text")!.getAttribute("fill"))
            .toBe("var(--ternary-resolved-fg)");
    });

    it("supports gradients, clip paths, masks, and use", () => {
        const source = base(
            `<defs>` +
            `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
            `<stop offset="0" stop-color="#000"/>` +
            `<stop offset="1" stop-color="#123456"/>` +
            `</linearGradient>` +
            `<clipPath id="c"><rect width="8" height="8"/></clipPath>` +
            `<path id="shape" d="M0 0h4v4H0z"/>` +
            `</defs>` +
            `<rect width="24" height="24" fill="url(#g)" clip-path="url(#c)"/>` +
            `<use href="#shape" x="10" y="10"/>`
        );
        const { template, ids } = prepare(source);
        expect(ids.sort()).toEqual(["c", "g", "shape"]);
        expect(template.querySelector("stop")!.getAttribute("stop-color"))
            .toBe("var(--ternary-resolved-fg)");
        expect(template.querySelectorAll("stop")[1]!.getAttribute("stop-color"))
            .toBe("#123456");
    });

    it("namespaces ids and rewrites references per mount", () => {
        const prepared = prepare(base(
            `<defs>` +
            `<linearGradient id="grad"><stop offset="0" stop-color="#000"/></linearGradient>` +
            `<path id="shape" d="M0 0h2v2H0z"/>` +
            `</defs>` +
            `<rect width="4" height="4" fill="url(#grad)"/>` +
            `<use href="#shape" x="0"/>`
        ));
        const a = instantiatePreparedSvg(prepared, doc);
        const b = instantiatePreparedSvg(prepared, doc);
        const idsA = [...a.querySelectorAll("[id]")].map((e) => e.id);
        const idsB = [...b.querySelectorAll("[id]")].map((e) => e.id);
        expect(idsA.length).toBeGreaterThan(0);
        expect(idsA.every((id) => !idsB.includes(id))).toBe(true);
        const useHref = a.querySelector("use")!.getAttribute("href")!;
        expect(useHref.startsWith("#")).toBe(true);
        expect(a.querySelector(useHref)).not.toBeNull();
        expect(a.getAttribute("aria-hidden")).toBe("true");
        expect(a.getAttribute("focusable")).toBe("false");
    });
});

describe("implicit default fill", () => {
    it("maps fill-less shapes to the foreground placeholder via the root", () => {
        const { template } = prepare(base(`<path d="M0 0h4v4H0z"/>`));
        expect(template.getAttribute("fill")).toBe("var(--ternary-resolved-fg)");
        expect(template.querySelector("path")!.hasAttribute("fill")).toBe(false);
    });

    it("keeps the implicit default literal when the source foreground is not black", () => {
        const { template } = prepareSvgSource(
            base(`<path d="M0 0h4v4H0z"/>`),
            doc,
            { foreground: "#ff0000", background: "#ffffff" }
        );
        expect(template.getAttribute("fill")).toBe("#000000");
    });

    it("leaves an explicit root fill attribute alone", () => {
        const { template } = prepare(base(
            `<path d="M0 0h4v4H0z"/>`,
            `fill="#fff"`
        ));
        expect(template.getAttribute("fill")).toBe("var(--ternary-resolved-bg)");
    });

    it("respects a root style fill declaration", () => {
        const { template } = prepare(base(
            `<path d="M0 0h4v4H0z"/>`,
            `style="fill: #00f"`
        ));
        expect(template.hasAttribute("fill")).toBe(false);
        expect(template.getAttribute("style")).toBe("fill: #00f");
    });

    it("lets fill-less children inherit a mapped ancestor fill", () => {
        const { template } = prepare(base(
            `<g fill="#ffffff"><path d="M0 0h4v4H0z"/></g>`
        ));
        const g = template.querySelector("g")!;
        expect(g.getAttribute("fill")).toBe("var(--ternary-resolved-bg)");
        // Root still carries the default so other subtrees inherit foreground.
        expect(template.getAttribute("fill")).toBe("var(--ternary-resolved-fg)");
    });

    it("does not disturb an authored fill=\"none\"", () => {
        const { template } = prepare(base(
            `<path d="M0 0h4v4H0z" fill="none"/>`
        ));
        expect(template.querySelector("path")!.getAttribute("fill")).toBe("none");
        expect(template.getAttribute("fill")).toBe("var(--ternary-resolved-fg)");
    });
});

describe("prepareSvgSource rejection", () => {
    const rejects = (name: string, source: string, pattern = ""): void => {
        it(`rejects ${name}`, () => {
            expect(() => prepare(source)).toThrow(pattern || SvgPaletteError);
        });
    };

    rejects("script elements", base(`<script>alert(1)</script>`), "script");
    rejects("foreignObject", base(`<foreignObject><div/></foreignObject>`));
    rejects("image elements", base(`<image href="x.png"/>`));
    rejects("style elements", base(`<style>.x{fill:red}</style>`));
    rejects("animation", base(`<rect><animate attributeName="x"/></rect>`));
    rejects("event attributes", base(`<rect width="4" height="4" onload="x()"/>`));
    rejects("unknown elements", base(`<blink/>`));
    rejects("foreign namespaces",
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:h="http://www.w3.org/1999/xhtml"><h:div/></svg>`);
    rejects("DOCTYPE", `<!DOCTYPE svg><svg xmlns="${SVG_NS}"/>`);
    rejects("malformed XML", `<svg xmlns="${SVG_NS}"><rect></svg>`);
    rejects("non-SVG root", `<html xmlns="http://www.w3.org/1999/xhtml"/>`);
    rejects("event style values",
        base(`<rect width="4" height="4" style="fill: url(javascript:x)"/>`));
    rejects("var() in paints",
        base(`<rect width="4" height="4" fill="var(--evil)"/>`));
    rejects("external url refs",
        base(`<rect width="4" height="4" fill="url(http://x/y#z)"/>`));
    rejects("external hrefs",
        base(`<use href="https://evil.example/x.svg#a"/>`));
    rejects("missing ref targets", base(`<use href="#nope"/>`), "missing");
    rejects("duplicate ids",
        base(`<rect id="a" width="2" height="2"/><rect id="a" width="2" height="2"/>`));
    rejects("custom properties",
        base(`<rect width="4" height="4" style="--x: red"/>`));
    rejects("!important",
        base(`<rect width="4" height="4" style="fill: red !important"/>`));
    rejects("unknown style props",
        base(`<rect width="4" height="4" style="position: fixed"/>`));
    rejects("css url injection",
        base(`<rect width="4" height="4" clip-path="url(#a) ; x:y"/>`));
    rejects("use cycles",
        base(`<use id="u1" href="#u2"/><use id="u2" href="#u1"/>`));
    rejects("oversized sources",
        base(`<!-- ${"x".repeat(SVG_SOURCE_LIMITS.maxSourceBytes)} -->`));
    rejects("excessive elements",
        base(`<g>${"<rect width='1' height='1'/>".repeat(2100)}</g>`));
    rejects("excessive depth",
        base(`${"<g>".repeat(40)}<rect width="1" height="1"/>${"</g>".repeat(40)}`));
    rejects("dangerous attributes",
        base(`<rect width="4" height="4" tabindex="0"/>`));
    rejects("xml:base",
        base(`<rect width="4" height="4" xml:base="http://evil"/>`));
});

describe("use expansion budget", () => {
    it("accepts modest use trees and rejects runaway expansion", () => {
        const okInner =
            `<defs><g id="cell"><rect width="1" height="1"/><rect x="1" width="1" height="1"/></g></defs>` +
            `<use href="#cell"/><use href="#cell"/>`;
        expect(() => prepare(base(okInner))).not.toThrow();

        // Nested use chains: each level triples ~60 elements, blowing past
        // the 4096 expanded-node budget.
        let inner = `<defs><g id="l0">${"<rect width='1' height='1'/>".repeat(60)}</g>`;
        for (let i = 1; i <= 4; i++) {
            inner += `<g id="l${i}"><use href="#l${i - 1}"/><use href="#l${i - 1}"/><use href="#l${i - 1}"/></g>`;
        }
        inner += `</defs><use href="#l4"/>`;
        expect(() => prepare(base(inner))).toThrow(SvgPaletteError);
    });
});

describe("instance custom icon loading", () => {
    const labelled = (): HTMLButtonElement => {
        const button = document.createElement("button");
        button.setAttribute("aria-label", "f");
        document.body.appendChild(button);
        return button;
    };

    beforeEach(() => {
        document.body.innerHTML = "";
        vi.unstubAllGlobals();
    });

    const svgResponse = (source: string) =>
        new Response(source, {
            status: 200,
            headers: { "content-type": "image/svg+xml" }
        });

    it("fetches, validates, and mounts recolorable SVGs once per url", async () => {
        const fetchMock = vi.fn(async () =>
            svgResponse(base(`<rect width="24" height="24" fill="#000"/>`)));
        vi.stubGlobal("fetch", fetchMock);
        const button = labelled();
        const instance = setupTernary(button, {
            states: {
                "1": { icon: { src: "https://icons.example/a.svg", recolor: true } }
            }
        });
        instance.setChecked(1);
        await vi.waitFor(() => {
            const svg = button.querySelector("svg.ternary-input__svg");
            expect(svg?.querySelector("rect")?.getAttribute("fill"))
                .toBe("var(--ternary-resolved-fg)");
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        instance.setChecked(0);
        instance.setChecked(1);
        await vi.waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    it("falls back to the builtin and emits iconerror once per attempt", async () => {
        const fetchMock = vi.fn(async () =>
            svgResponse(base(`<script>bad()</script>`)));
        vi.stubGlobal("fetch", fetchMock);
        const button = labelled();
        const errors: string[] = [];
        setupTernary(button, {
            states: {
                "1": { icon: { src: "https://icons.example/bad.svg", recolor: true } }
            },
            onIconError: (e) => errors.push(e.detail.src)
        });
        button.click();
        await vi.waitFor(() => expect(errors.length).toBe(1));
        const rect = button.querySelector("svg.ternary-input__svg rect");
        expect(rect).not.toBeNull(); // builtin fallback stayed mounted
    });

    it("rejects non-http(s) recolor sources without fetching", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const button = labelled();
        const errors: Error[] = [];
        setupTernary(button, {
            states: {
                "1": { icon: { src: "data:image/svg+xml,<svg/>", recolor: true } }
            },
            onIconError: (e) => errors.push(e.detail.error)
        });
        button.click();
        await vi.waitFor(() => expect(errors.length).toBe(1));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ignores stale loads after state changes and destroy", async () => {
        let resolveFetch: (r: Response) => void = () => {};
        vi.stubGlobal("fetch", vi.fn(
            () => new Promise<Response>((res) => { resolveFetch = res; })
        ));
        const button = labelled();
        const instance = setupTernary(button, {
            states: {
                "1": { icon: { src: "https://icons.example/slow.svg", recolor: true } }
            }
        });
        instance.setChecked(1);
        instance.setChecked(-1); // newer state wins
        resolveFetch(svgResponse(base(`<rect width="9" height="9" fill="#000"/>`)));
        await new Promise((r) => setTimeout(r, 0));
        const svg = button.querySelector("svg.ternary-input__svg");
        expect(svg?.querySelector("rect")?.getAttribute("width")).not.toBe("9");
        instance.setChecked(1);
        instance.destroy();
        resolveFetch(svgResponse(base(`<rect width="9" height="9"/>`)));
        await new Promise((r) => setTimeout(r, 0));
        expect(button.querySelector(".ternary-input__icon")).toBeNull();
    });
});

describe("local reference graph", () => {
    it("rejects missing paint references in attributes", () => {
        expect(() => prepare(base(
            `<rect width="4" height="4" fill="url(#missing)"/>`
        ))).toThrow(/missing/);
        expect(() => prepare(base(
            `<rect width="4" height="4" stroke="url(#missing)"/>`
        ))).toThrow(/missing/);
        expect(() => prepare(base(
            `<linearGradient id="g"><stop offset="0" stop-color="url(#missing)"/></linearGradient>` +
            `<rect width="4" height="4" fill="url(#g)"/>`
        ))).toThrow(/missing/);
    });

    it("rejects missing references inside inline styles", () => {
        expect(() => prepare(base(
            `<rect width="4" height="4" style="fill: url(#missing)"/>`
        ))).toThrow(/missing/);
        expect(() => prepare(base(
            `<rect width="4" height="4" style="clip-path: url(#missing)"/>`
        ))).toThrow(/missing/);
    });

    it("rejects a group that references itself through a child use", () => {
        expect(() => prepare(base(
            `<g id="self"><rect width="2" height="2"/><use href="#self"/></g>`
        ))).toThrow(/[Cc]ircular/);
    });

    it("rejects anonymous participants in reference cycles", () => {
        expect(() => prepare(base(
            `<mask id="m"><rect width="4" height="4" clip-path="url(#c)"/></mask>` +
            `<clipPath id="c"><rect width="4" height="4" mask="url(#m)"/></clipPath>` +
            `<rect width="4" height="4" mask="url(#m)"/>`
        ))).toThrow(/[Cc]ircular/);
    });

    it("rejects gradient href cycles", () => {
        expect(() => prepare(base(
            `<defs>` +
            `<linearGradient id="a" href="#b"><stop offset="0" stop-color="#000"/></linearGradient>` +
            `<linearGradient id="b" href="#a"><stop offset="1" stop-color="#fff"/></linearGradient>` +
            `</defs>` +
            `<rect width="4" height="4" fill="url(#a)"/>`
        ))).toThrow(/[Cc]ircular/);
    });

    it("accepts noncyclic sibling gradients", () => {
        const { template } = prepare(base(
            `<defs>` +
            `<linearGradient id="base"><stop offset="0" stop-color="#000"/></linearGradient>` +
            `<linearGradient id="x" href="#base"><stop offset="1" stop-color="#fff"/></linearGradient>` +
            `<linearGradient id="y" href="#base"><stop offset="1" stop-color="#123456"/></linearGradient>` +
            `</defs>` +
            `<rect width="4" height="4" fill="url(#x)"/>` +
            `<rect width="4" height="4" fill="url(#y)"/>`
        ));
        expect(template.querySelectorAll("linearGradient").length).toBe(3);
    });

    it("rejects use chains one past the nesting limit and accepts at limit", () => {
        const LIMIT = SVG_SOURCE_LIMITS.maxUseNesting;
        const chain = (links: number): string => {
            let inner = `<defs><rect id="r0" width="1" height="1"/>`;
            for (let i = 1; i <= links; i++) {
                inner += `<g id="r${i}"><use href="#r${i - 1}"/></g>`;
            }
            inner += `</defs><use href="#r${links}"/>`;
            return inner;
        };
        expect(() => prepare(base(chain(LIMIT - 1)))).not.toThrow();
        expect(() => prepare(base(chain(LIMIT)))).toThrow(SvgPaletteError);
    });

    it("rejects exponential use DAGs within a small source quickly", () => {
        // Each group doubles the previous: 2^12 leaves far past 4096 while
        // the source itself stays tiny.
        let inner = `<defs><g id="d0"><rect width="1" height="1"/><rect width="1" height="1" x="1"/></g>`;
        for (let i = 1; i <= 12; i++) {
            inner += `<g id="d${i}"><use href="#d${i - 1}"/><use href="#d${i - 1}"/></g>`;
        }
        inner += `</defs><use href="#d12"/>`;
        const start = Date.now();
        expect(() => prepare(base(inner))).toThrow(SvgPaletteError);
        expect(Date.now() - start).toBeLessThan(2000);
    });

    it("enforces the expanded-node boundary while the source stays small", () => {
        const LIMIT = SVG_SOURCE_LIMITS.maxExpandedNodes;
        void LIMIT;
        // Source element cap (2048) is below the expanded cap (4096), so use
        // expansion is what crosses the line: two uses of a 1000-rect group
        // expand to ~3007 nodes (accepted), two uses of a 2042-rect group
        // expand to ~6133 (rejected) while the source stays under 2048.
        const ok = `<defs><g id="many">${`<rect width="1" height="1"/>`.repeat(
            1000
        )}</g></defs><use href="#many"/><use href="#many"/>`;
        expect(() => prepare(base(ok))).not.toThrow();
        const big = `<defs><g id="many">${`<rect width="1" height="1"/>`.repeat(
            2042
        )}</g></defs><use href="#many"/><use href="#many"/>`;
        expect(() => prepare(base(big))).toThrow(SvgPaletteError);
    });
});

describe("style parsing engine layer", () => {
    it("rejects declarations malformed at the lexical layer", () => {
        expect(() => prepare(base(
            `<rect width="4" height="4" style="fill"/>`
        ))).toThrow();
        expect(() => prepare(base(
            `<rect width="4" height="4" style="fill: ;"/>`
        ))).toThrow();
        expect(() => prepare(base(
            `<rect width="4" height="4" style="fill: red; bogus"/>`
        ))).toThrow();
    });

    it("rebuilds allowed declarations without copying cssText", () => {
        const { template } = prepare(base(
            `<rect width="4" height="4" style="fill: #000; opacity: 0.25; stroke-width: 2"/>`
        ));
        const style = template.querySelector("rect")!.getAttribute("style")!;
        expect(style).toContain("var(--ternary-resolved-fg)");
        expect(style).toContain("opacity: 0.25");
        expect(style).toContain("stroke-width: 2");
    });

    const engineCanJudge = (name: string, good: string): boolean => {
        const supports = document.defaultView?.CSS?.supports?.bind(
            document.defaultView.CSS);
        if (supports) return supports(name, good);
        const probe = document.createElement("div");
        probe.style.setProperty(name, good);
        const ok = probe.style.getPropertyValue(name).trim() !== "";
        probe.style.removeProperty(name);
        return ok;
    };

    it("rejects a single malformed opacity declaration via the engine", () => {
        // "1.2.3" passes the lexical numeric shape but is not a valid number.
        if (!engineCanJudge("opacity", "1")) {
            return; // engine cannot evaluate opacity: lexical layer stands
        }
        expect(() => prepare(base(
            `<rect width="4" height="4" style="opacity: 1.2.3"/>`
        ))).toThrow(SvgPaletteError);
    });

    it("rejects a mixed valid + engine-invalid declaration list", () => {
        if (!engineCanJudge("opacity", "1")) {
            return;
        }
        expect(() => prepare(base(
            `<rect width="4" height="4" style="fill: #000; opacity: 1.2.3"/>`
        ))).toThrow(SvgPaletteError);
    });

    it("rejects an engine-invalid paint value when the engine can judge it", () => {
        // Alphabetic words pass the lexical named-color bucket; only the CSS
        // engine can tell "gibberish" is not a color. Engines unable to
        // evaluate fill (older jsdom) cannot judge and the lexical layer
        // remains the only line of defense.
        if (!engineCanJudge("fill", "red")) {
            return;
        }
        expect(() => prepare(base(
            `<rect width="4" height="4" style="fill: gibberish"/>`
        ))).toThrow(SvgPaletteError);
    });
});
