/**
 * Strict static-SVG palette processing.
 *
 * Accepts a self-contained, static SVG document and rebuilds it from fresh
 * createElementNS nodes using positive allowlists for elements, attributes,
 * style declarations, paint values, and local references. Authored paints that
 * match the configured source palette are replaced with the library's private
 * resolved CSS variables. Parsing is never sanitization: anything outside the
 * supported subset rejects the whole document and nothing is mounted.
 */

export const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

export const SVG_SOURCE_LIMITS = {
    maxSourceBytes: 256 * 1024,
    maxElements: 2048,
    maxDepth: 32,
    maxUseNesting: 8,
    maxExpandedNodes: 4096
} as const;

export interface SvgSourcePalette {
    /** Normalized "#rrggbb" source paint treated as the icon foreground. */
    foreground: string;
    /** Normalized "#rrggbb" source paint treated as the icon background. */
    background: string;
}

export const DEFAULT_SOURCE_PALETTE: SvgSourcePalette = {
    foreground: "#000000",
    background: "#ffffff"
};

export interface PreparedSvg {
    /** Detached template; clone per mount via instantiatePreparedSvg. */
    template: SVGSVGElement;
    /** Authored ids needing per-mount namespacing. */
    ids: readonly string[];
}

export class SvgPaletteError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SvgPaletteError";
    }
}

const ALLOWED_ELEMENTS = new Set([
    "svg", "g", "defs", "path", "rect", "circle", "ellipse", "line",
    "polyline", "polygon", "linearGradient", "radialGradient", "stop",
    "clipPath", "mask", "use", "text", "tspan", "title", "desc"
]);

/** Attributes allowed on every allowed element. */
const GLOBAL_ATTRIBUTES = new Set([
    "id", "class", "transform", "style",
    "fill", "fill-opacity", "fill-rule",
    "stroke", "stroke-opacity", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
    "stroke-dashoffset",
    "color", "opacity", "display",
    "clip-path", "clip-rule", "mask"
]);

const PAINT_ATTRIBUTES = new Set(["fill", "stroke", "color", "stop-color"]);
const OPACITY_ATTRIBUTES = new Set([
    "fill-opacity", "stroke-opacity", "stop-opacity", "opacity"
]);
const LOCAL_REF_ATTRIBUTES = new Set(["clip-path", "mask"]);
const CLIP_RULE_ATTRIBUTES = new Set(["fill-rule", "clip-rule"]);

const ELEMENT_ATTRIBUTES: Record<string, ReadonlySet<string>> = {
    svg: new Set(["viewBox", "width", "height", "preserveAspectRatio", "version"]),
    rect: new Set(["x", "y", "width", "height", "rx", "ry"]),
    circle: new Set(["cx", "cy", "r"]),
    ellipse: new Set(["cx", "cy", "rx", "ry"]),
    line: new Set(["x1", "y1", "x2", "y2"]),
    polyline: new Set(["points"]),
    polygon: new Set(["points"]),
    path: new Set(["d"]),
    linearGradient: new Set([
        "x1", "y1", "x2", "y2", "gradientUnits", "gradientTransform",
        "spreadMethod", "href"
    ]),
    radialGradient: new Set([
        "cx", "cy", "r", "fx", "fy", "fr", "gradientUnits",
        "gradientTransform", "spreadMethod", "href"
    ]),
    stop: new Set(["offset", "stop-color", "stop-opacity"]),
    clipPath: new Set(["clipPathUnits"]),
    mask: new Set(["x", "y", "width", "height", "maskUnits", "maskContentUnits"]),
    use: new Set(["x", "y", "width", "height", "href"]),
    text: new Set(["x", "y", "dx", "dy", "rotate", "text-anchor"]),
    tspan: new Set(["x", "y", "dx", "dy", "rotate", "text-anchor"])
};

/** Style properties allowed inside inline style declarations. */
const STYLE_PROPERTIES = new Set([
    "fill", "fill-opacity", "fill-rule",
    "stroke", "stroke-opacity", "stroke-width", "stroke-linecap",
    "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray",
    "stroke-dashoffset",
    "color", "opacity", "stop-color", "stop-opacity",
    "clip-path", "clip-rule", "mask"
]);

const ID_PATTERN = /^[A-Za-z_][-A-Za-z0-9._]*$/;
const CLASS_PATTERN = /^[-_a-zA-Z0-9 ]+$/;
const NUMBER_PATTERN = /^[-+0-9.,%a-zA-Z \t]+$/;
const PATH_DATA_PATTERN = /^[-+0-9MmLlHhVvCcSsQqTtAaZz,.\s]+$/;
const POINTS_PATTERN = /^[-+0-9., \t]+$/;
const HREF_PATTERN = /^#([A-Za-z_][-A-Za-z0-9._]*)$/;
const URL_REF_PATTERN = /^url\(\s*['"]?#([A-Za-z_][-A-Za-z0-9._]*)['"]?\s*\)$/;
const URL_REF_GLOBAL = /url\(\s*['"]?#([A-Za-z_][-A-Za-z0-9._]*)['"]?\s*\)/g;
const TRANSFORM_PATTERN = /^[a-zA-Z]+\s*\([^()]*\)(\s+[a-zA-Z]+\s*\([^()]*\))*$/;
const TRANSFORM_FUNCTIONS = new Set([
    "matrix", "translate", "scale", "rotate", "skewX", "skewY"
]);
const UNITS_PATTERN = /^(userSpaceOnUse|objectBoundingBox)$/;
const SPREAD_PATTERN = /^(pad|reflect|repeat)$/;
const RULE_PATTERN = /^(nonzero|evenodd)$/;
const LINECAP_PATTERN = /^(butt|round|square)$/;
const LINEJOIN_PATTERN = /^(miter|miter-clip|round|bevel)$/;
const ANCHOR_PATTERN = /^(start|middle|end)$/;
const VIEWBOX_PATTERN = /^[-+0-9.,eE \t]+$/;
const ASPECT_PATTERN = /^(none|x(Min|Mid|Max)Y(Min|Mid|Max))(\s+(meet|slice))?$/;
const DISPLAY_PATTERN = /^(inline|block|none)$/;

/** Normalize an opaque sRGB color to "#rrggbb", or return null. */
export function normalizeOpaqueColor(value: string): string | null {
    const v = value.trim().toLowerCase();
    const hexShort = /^#([0-9a-f]{3})$/.exec(v);
    if (hexShort) {
        const h = hexShort[1]!;
        return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    const hexLong = /^#([0-9a-f]{6})$/.exec(v);
    if (hexLong) return `#${hexLong[1]}`;
    const rgb = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/
        .exec(v);
    if (rgb) {
        const parts = [rgb[1]!, rgb[2]!, rgb[3]!].map(Number);
        if (parts.every((n) => n >= 0 && n <= 255)) {
            return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        }
        return null;
    }
    if (v === "black") return "#000000";
    if (v === "white") return "#ffffff";
    return null;
}

/** Parse and validate the public sourceColors option. */
export function parseSourceColors(input?: {
    foreground?: string;
    background?: string;
}): SvgSourcePalette {
    const foreground = input?.foreground === undefined
        ? DEFAULT_SOURCE_PALETTE.foreground
        : normalizeOpaqueColor(input.foreground);
    const background = input?.background === undefined
        ? DEFAULT_SOURCE_PALETTE.background
        : normalizeOpaqueColor(input.background);
    if (foreground === null) {
        throw new SvgPaletteError(
            "sourceColors.foreground must be an opaque #RGB or #RRGGBB color."
        );
    }
    if (background === null) {
        throw new SvgPaletteError(
            "sourceColors.background must be an opaque #RGB or #RRGGBB color."
        );
    }
    if (foreground === background) {
        throw new SvgPaletteError(
            "sourceColors foreground and background must be distinct colors."
        );
    }
    return { foreground, background };
}

function fail(message: string): never {
    throw new SvgPaletteError(message);
}

function isPaintValueAllowed(raw: string): boolean {
    const v = raw.trim();
    if (v === "") return false;
    const lower = v.toLowerCase();
    if (lower === "none" || lower === "currentcolor" || lower === "transparent") {
        return true;
    }
    if (URL_REF_PATTERN.test(v)) return true;
    if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{4}$/.test(v) ||
        /^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{8}$/.test(v)) {
        return true;
    }
    const fn = /^([a-zA-Z]+)\(([^()]*)\)$/.exec(v);
    if (fn) {
        const name = fn[1]!.toLowerCase();
        const args = fn[2]!;
        if ((name === "rgb" || name === "rgba" || name === "hsl" ||
            name === "hsla") && /^[-+0-9.,%/\s]+$/.test(args)) {
            return true;
        }
        return false;
    }
    // Named colors and system color keywords: alphabetic words only.
    if (/^[a-zA-Z]+$/.test(v)) return true;
    return false;
}

function validateAttributeValue(
    name: string,
    value: string,
    elementName: string
): void {
    if (value.length > 4096) fail(`Attribute ${name} is too long.`);
    if (PAINT_ATTRIBUTES.has(name)) {
        if (!isPaintValueAllowed(value)) {
            fail(`Unsupported paint value "${value}" on ${name}.`);
        }
        return;
    }
    if (OPACITY_ATTRIBUTES.has(name)) {
        if (!/^[-+0-9.]+%?$/.test(value.trim())) {
            fail(`Invalid opacity value "${value}" on ${name}.`);
        }
        return;
    }
    if (LOCAL_REF_ATTRIBUTES.has(name)) {
        if (!URL_REF_PATTERN.test(value.trim()) && value.trim() !== "none") {
            fail(`Only local url(#id) references are allowed on ${name}.`);
        }
        return;
    }
    if (CLIP_RULE_ATTRIBUTES.has(name)) {
        if (!RULE_PATTERN.test(value.trim())) {
            fail(`Invalid rule value "${value}" on ${name}.`);
        }
        return;
    }
    if (name === "stroke-linecap") {
        if (!LINECAP_PATTERN.test(value.trim())) fail(`Invalid stroke-linecap.`);
        return;
    }
    if (name === "stroke-linejoin") {
        if (!LINEJOIN_PATTERN.test(value.trim())) fail(`Invalid stroke-linejoin.`);
        return;
    }
    if (name === "id") {
        if (!ID_PATTERN.test(value.trim())) fail(`Invalid id "${value}".`);
        return;
    }
    if (name === "class") {
        if (!CLASS_PATTERN.test(value)) fail(`Invalid class value.`);
        return;
    }
    if (name === "transform" || name === "gradientTransform") {
        const v = value.trim();
        if (!TRANSFORM_PATTERN.test(v)) fail(`Invalid transform "${v}".`);
        for (const fn of v.matchAll(/([a-zA-Z]+)\s*\(/g)) {
            if (!TRANSFORM_FUNCTIONS.has(fn[1]!)) {
                fail(`Unsupported transform function "${fn[1]}".`);
            }
        }
        return;
    }
    if (name === "href") {
        if (!HREF_PATTERN.test(value.trim())) {
            fail(`Only local "#id" hrefs are allowed.`);
        }
        return;
    }
    if (name === "d") {
        if (!PATH_DATA_PATTERN.test(value)) fail(`Invalid path data.`);
        return;
    }
    if (name === "points") {
        if (!POINTS_PATTERN.test(value)) fail(`Invalid points value.`);
        return;
    }
    if (name === "viewBox") {
        if (!VIEWBOX_PATTERN.test(value.trim())) fail(`Invalid viewBox.`);
        return;
    }
    if (name === "preserveAspectRatio") {
        if (!ASPECT_PATTERN.test(value.trim())) {
            fail(`Invalid preserveAspectRatio.`);
        }
        return;
    }
    if (name === "gradientUnits" || name === "clipPathUnits" ||
        name === "maskUnits" || name === "maskContentUnits") {
        if (!UNITS_PATTERN.test(value.trim())) fail(`Invalid units value.`);
        return;
    }
    if (name === "spreadMethod") {
        if (!SPREAD_PATTERN.test(value.trim())) fail(`Invalid spreadMethod.`);
        return;
    }
    if (name === "text-anchor") {
        if (!ANCHOR_PATTERN.test(value.trim())) fail(`Invalid text-anchor.`);
        return;
    }
    if (name === "display") {
        if (!DISPLAY_PATTERN.test(value.trim())) fail(`Invalid display value.`);
        return;
    }
    // Remaining geometry/size/offset attributes: lengths, numbers, lists.
    if (!NUMBER_PATTERN.test(value) || /[();'{}<>&"\\:]/.test(value)) {
        fail(`Invalid value "${value}" on ${name} of <${elementName}>.`);
    }
}

interface ParsedDecl {
    name: string;
    value: string;
}

/**
 * Tokenize and validate an inline style declaration block. Unknown
 * declarations, custom properties, !important, comments, and unsafe values
 * reject the whole document. Returns normalized declarations to rebuild.
 */
function parseStyleDeclarations(text: string, doc: Document): ParsedDecl[] {
    if (text.length > 8192) fail("Style declaration block is too long.");
    if (/[<>@{}\\]/.test(text)) fail("Unsafe characters in style attribute.");
    const decls: ParsedDecl[] = [];
    for (const chunk of text.split(";")) {
        const trimmed = chunk.trim();
        if (trimmed === "") continue;
        const match = /^([a-zA-Z-]+)\s*:\s*(.+)$/s.exec(trimmed);
        if (!match) fail(`Malformed style declaration "${trimmed}".`);
        const name = match[1]!.toLowerCase();
        const value = match[2]!.trim();
        if (name.startsWith("--")) fail("Custom properties are not allowed.");
        if (!STYLE_PROPERTIES.has(name)) {
            fail(`Unsupported style property "${name}".`);
        }
        if (/!important/i.test(value)) fail("!important is not allowed.");
        if (/var\(|env\(|attr\(|expression\(/i.test(value)) {
            fail(`Unsafe expression in "${name}".`);
        }
        validateStyleValue(name, value);
        decls.push({ name, value });
    }
    // Second layer: ask the engine to validate each declaration for its own
    // property. CSS.supports is authoritative where present; otherwise a
    // style probe first proves the property is supported at all (known-good
    // value), then rejects when the engine drops the actual value.
    const supports = doc.defaultView?.CSS?.supports?.bind(
        doc.defaultView.CSS);
    for (const decl of decls) {
        if (supports) {
            if (!supports(decl.name, decl.value)) {
                fail(
                    `Engine rejected style declaration ` +
                    `"${decl.name}: ${decl.value}".`
                );
            }
            continue;
        }
        const probe = doc.createElement("div");
        const good = KNOWN_GOOD_STYLE_VALUES[decl.name];
        if (good === undefined) continue;
        probe.style.setProperty(decl.name, "");
        probe.style.setProperty(decl.name, good);
        const supported = probe.style.getPropertyValue(decl.name).trim() !== "";
        probe.style.setProperty(decl.name, "");
        if (!supported) continue; // engine cannot judge this property
        probe.style.setProperty(decl.name, decl.value);
        const kept = probe.style.getPropertyValue(decl.name).trim();
        probe.style.removeProperty(decl.name);
        if (kept === "") {
            fail(
                `Engine rejected style declaration ` +
                `"${decl.name}: ${decl.value}".`
            );
        }
    }
    return decls;
}

/** Known-good values used to prove an engine supports a style property. */
const KNOWN_GOOD_STYLE_VALUES: Record<string, string> = {
    fill: "red",
    stroke: "red",
    color: "red",
    "stop-color": "red",
    "fill-opacity": "1",
    "stroke-opacity": "1",
    opacity: "1",
    "clip-path": "none",
    mask: "none",
    "fill-rule": "nonzero",
    "clip-rule": "nonzero",
    "stroke-linecap": "butt",
    "stroke-linejoin": "round",
    "stroke-width": "1",
    "stroke-miterlimit": "1",
    "stroke-dasharray": "1",
    "stroke-dashoffset": "1"
};

function validateStyleValue(name: string, value: string): void {
    if (PAINT_ATTRIBUTES.has(name)) {
        if (!isPaintValueAllowed(value)) {
            fail(`Unsupported paint declaration "${name}: ${value}".`);
        }
        return;
    }
    if (OPACITY_ATTRIBUTES.has(name)) {
        if (!/^[-+0-9.]+%?$/.test(value)) {
            fail(`Invalid opacity declaration "${name}: ${value}".`);
        }
        return;
    }
    if (LOCAL_REF_ATTRIBUTES.has(name)) {
        if (!URL_REF_PATTERN.test(value) && value !== "none") {
            fail(`Only local url(#id) allowed in "${name}".`);
        }
        return;
    }
    if (CLIP_RULE_ATTRIBUTES.has(name)) {
        if (!RULE_PATTERN.test(value)) fail(`Invalid "${name}: ${value}".`);
        return;
    }
    if (name === "stroke-linecap") {
        if (!LINECAP_PATTERN.test(value)) fail(`Invalid "${name}: ${value}".`);
        return;
    }
    if (name === "stroke-linejoin") {
        if (!LINEJOIN_PATTERN.test(value)) fail(`Invalid "${name}: ${value}".`);
        return;
    }
    // stroke-width, miterlimit, dasharray, dashoffset: numeric lists.
    if (!/^[-+0-9.,%a-zA-Z \t]+$/.test(value) || /[();'{}<>&"\\:]/.test(value)) {
        fail(`Invalid declaration "${name}: ${value}".`);
    }
}

function mapPaintValue(raw: string, palette: SvgSourcePalette): string {
    const normalized = normalizeOpaqueColor(raw);
    if (normalized === palette.foreground) {
        return "var(--ternary-resolved-fg)";
    }
    if (normalized === palette.background) {
        return "var(--ternary-resolved-bg)";
    }
    return raw;
}

interface BuildContext {
    doc: Document;
    palette: SvgSourcePalette;
    ids: Map<string, Element>;
    /** element -> local ids it references */
    refs: Map<Element, Set<string>>;
    elementCount: { value: number };
}

function registerId(ctx: BuildContext, id: string, element: Element): void {
    if (ctx.ids.has(id)) fail(`Duplicate id "${id}".`);
    ctx.ids.set(id, element);
}

function addRef(ctx: BuildContext, el: Element, id: string): void {
    let set = ctx.refs.get(el);
    if (!set) {
        set = new Set();
        ctx.refs.set(el, set);
    }
    set.add(id);
}

/** Collect local url(#id) references from any attribute/decl value. */
function collectAttrReference(ctx: BuildContext, el: Element, value: string): void {
    for (const m of value.matchAll(URL_REF_GLOBAL)) {
        addRef(ctx, el, m[1]!);
    }
}

function rebuildElement(
    ctx: BuildContext,
    source: Element,
    depth: number
): Element {
    if (depth > SVG_SOURCE_LIMITS.maxDepth) {
        fail(`SVG tree exceeds depth limit ${SVG_SOURCE_LIMITS.maxDepth}.`);
    }
    ctx.elementCount.value += 1;
    if (ctx.elementCount.value > SVG_SOURCE_LIMITS.maxElements) {
        fail(
            `SVG exceeds element limit ${SVG_SOURCE_LIMITS.maxElements}.`
        );
    }
    const name = source.localName;
    if (source.namespaceURI !== SVG_NS || !ALLOWED_ELEMENTS.has(name)) {
        fail(`Unsupported element <${name}>.`);
    }
    const target = ctx.doc.createElementNS(SVG_NS, name);
    const allowed = ELEMENT_ATTRIBUTES[name] ?? new Set<string>();
    let rootHasFill = false;

    for (const attr of Array.from(source.attributes)) {
        const attrNs = attr.namespaceURI;
        let attrName = attr.name;
        if (attrNs === XMLNS_NS || attrName === "xmlns") {
            const nsValue = attr.value.trim();
            if (nsValue !== SVG_NS && nsValue !== XLINK_NS) {
                fail(`Unrecognized namespace declaration "${nsValue}".`);
            }
            continue;
        }
        if (attrNs === XLINK_NS && attr.localName === "href") {
            attrName = "href";
        } else if (attrNs !== null && attrNs !== "") {
            fail(`Foreign-namespace attribute "${attr.name}".`);
        }
        if (!GLOBAL_ATTRIBUTES.has(attrName) && !allowed.has(attrName)) {
            fail(`Unsupported attribute "${attrName}" on <${name}>.`);
        }
        const value = attr.value;
        if (attrName === "style") {
            const decls = parseStyleDeclarations(value, ctx.doc);
            for (const decl of decls) {
                collectAttrReference(ctx, target, decl.value);
            }
            if (decls.some((d) => d.name === "fill")) rootHasFill = true;
            const rebuilt = decls
                .map((d) =>
                    PAINT_ATTRIBUTES.has(d.name)
                        ? `${d.name}: ${mapPaintValue(d.value, ctx.palette)}`
                        : `${d.name}: ${d.value}`
                )
                .join("; ");
            if (rebuilt !== "") target.setAttribute("style", rebuilt);
            continue;
        }
        validateAttributeValue(attrName, value, name);
        if (attrName === "id") {
            registerId(ctx, value.trim(), target);
        }
        // Register every local reference (href="#id" and url(#id) in paints,
        // clip-path, mask, etc.) before paint substitution so the reference
        // graph is complete regardless of which attribute carried it.
        if (attrName === "href") {
            addRef(ctx, target, value.trim().slice(1));
        } else {
            collectAttrReference(ctx, target, value);
        }
        const outValue = PAINT_ATTRIBUTES.has(attrName)
            ? mapPaintValue(value, ctx.palette)
            : value;
        target.setAttribute(attrName, outValue);
    }
    /* The SVG spec default fill is black. Sources that rely on it (e.g.
       optimized exports that drop redundant `fill="#000"`) are routed
       through the palette by writing the mapped default on the root. */
    if (depth === 1 && !rootHasFill && !target.hasAttribute("fill")) {
        target.setAttribute("fill", mapPaintValue("#000000", ctx.palette));
    }

    for (const child of Array.from(source.childNodes)) {
        if (child.nodeType === 3 /* TEXT_NODE */) {
            target.appendChild(ctx.doc.createTextNode(child.nodeValue ?? ""));
        } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
            target.appendChild(
                rebuildElement(ctx, child as Element, depth + 1)
            );
        } else if (
            child.nodeType === 8 /* COMMENT_NODE */ ||
            child.nodeType === 7 /* PROCESSING_INSTRUCTION_NODE */
        ) {
            fail("Comments and processing instructions are not allowed.");
        }
    }
    return target;
}

function validateReferences(ctx: BuildContext, root: Element): void {
    // Missing targets reject before any graph work.
    for (const refs of ctx.refs.values()) {
        for (const id of refs) {
            if (!ctx.ids.has(id)) {
                fail(`Reference to missing local id "${id}".`);
            }
        }
    }
    // Cycle detection over an Element graph containing both containment
    // edges (element -> child) and reference edges (element -> referenced
    // element). Anonymous elements participate too: a <g id="self"> with a
    // descendant <use href="#self"> cycles g -> use -> g even though the use
    // itself carries no id.
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<Element, number>();
    const visit = (el: Element): void => {
        color.set(el, GRAY);
        for (const id of ctx.refs.get(el) ?? []) {
            const target = ctx.ids.get(id)!;
            const state = color.get(target) ?? WHITE;
            if (state === GRAY) fail(`Circular local reference "${id}".`);
            if (state === WHITE) visit(target);
        }
        for (const child of Array.from(el.children)) {
            const state = color.get(child) ?? WHITE;
            if (state === GRAY) {
                fail("Circular containment (impossible tree).");
            }
            if (state === WHITE) visit(child);
        }
        color.set(el, BLACK);
    };
    visit(root);
}

/**
 * Parse, validate, and rebuild an SVG source string into a detached template
 * element. Returns ids so each mounted clone can namespace them. Throws
 * SvgPaletteError on any unsupported or unsafe content.
 */
export function prepareSvgSource(
    source: string,
    doc: Document,
    palette: SvgSourcePalette = DEFAULT_SOURCE_PALETTE
): PreparedSvg {
    if (new TextEncoder().encode(source).length > SVG_SOURCE_LIMITS.maxSourceBytes) {
        fail(`SVG source exceeds ${SVG_SOURCE_LIMITS.maxSourceBytes} bytes.`);
    }
    if (/<!doctype/i.test(source)) fail("DOCTYPE declarations are not allowed.");
    const parser = new DOMParser();
    const parsed = parser.parseFromString(source, "image/svg+xml");
    if (parsed.getElementsByTagName("parsererror").length > 0) {
        fail("SVG source is not well-formed XML.");
    }
    const root = parsed.documentElement;
    if (!root || root.localName !== "svg" || root.namespaceURI !== SVG_NS) {
        fail("Source document is not an SVG.");
    }
    if (parsed.doctype) fail("DOCTYPE declarations are not allowed.");

    const ctx: BuildContext = {
        doc,
        palette,
        ids: new Map(),
        refs: new Map(),
        elementCount: { value: 0 }
    };
    const template = rebuildElement(ctx, root, 1) as SVGSVGElement;
    validateReferences(ctx, template);
    enforceUseBudget(ctx, template);
    return { template, ids: [...ctx.ids.keys()] };
}

/**
 * Enforce use-nesting depth and expanded-node budgets against the validated
 * reference DAG. Counts saturate at the budget so exponential reference
 * patterns abort early instead of being fully expanded; results are memoized
 * per (element, use-depth) to keep traversal polynomial.
 */
function enforceUseBudget(ctx: BuildContext, template: SVGSVGElement): void {
    const LIMIT = SVG_SOURCE_LIMITS.maxExpandedNodes;
    const DEPTH = SVG_SOURCE_LIMITS.maxUseNesting;
    const memo = new Map<Element, Map<number, number>>();

    const expandedSize = (el: Element, depth: number): number => {
        const byDepth = memo.get(el);
        const hit = byDepth?.get(depth);
        if (hit !== undefined) return hit;

        let size = 1;
        if (el.localName === "use") {
            if (depth + 1 > DEPTH) {
                fail(`<use> nesting exceeds ${DEPTH}.`);
            }
            const href = el.getAttribute("href");
            if (href && href.startsWith("#")) {
                const target = ctx.ids.get(href.slice(1));
                if (target) {
                    size += Math.min(
                        expandedSize(target, depth + 1),
                        Math.max(0, LIMIT + 1 - size)
                    );
                }
            }
        }
        for (const child of Array.from(el.children)) {
            size += Math.min(
                expandedSize(child, depth),
                Math.max(0, LIMIT + 1 - size)
            );
            if (size > LIMIT) break;
        }
        if (!byDepth) memo.set(el, new Map());
        memo.get(el)!.set(depth, size);
        return size;
    };

    const total = expandedSize(template, 0);
    if (total > LIMIT) {
        fail(`Expanded <use> budget ${LIMIT} exceeded.`);
    }
}

let idCounter = 0;

/**
 * Allocate an id/prefix that is provably unused in the ownerDocument, looping
 * past collisions so simultaneous copies of this module (e.g. an IIFE build
 * and an ESM build on one page) can never mint the same identifiers.
 */
export function allocUniqueToken(
    doc: Document,
    stem: string,
    extraIds: readonly string[] = []
): string {
    for (;;) {
        idCounter += 1;
        const candidate = `${stem}${idCounter.toString(36)}`;
        const collision = doc.getElementById(candidate) !== null ||
            extraIds.some((id) => doc.getElementById(`${candidate}-${id}`) !== null);
        if (!collision) return candidate;
    }
}

/**
 * Clone a prepared template for mounting, rewriting every authored id and
 * local reference into a fresh per-mount namespace so cloned icons can never
 * collide with each other or the host document.
 */
export function instantiatePreparedSvg(
    prepared: PreparedSvg,
    doc: Document
): SVGSVGElement {
    const prefix = `${allocUniqueToken(doc, "ti", prepared.ids)}-`;
    const clone = prepared.template.cloneNode(true) as SVGSVGElement;
    const idSet = new Set(prepared.ids);
    const renameRefs = (value: string): string =>
        value.replace(URL_REF_GLOBAL, (_m, id: string) =>
            idSet.has(id) ? `url(#${prefix}${id})` : _m
        );
    const walk = (el: Element): void => {
        const id = el.getAttribute("id");
        if (id && idSet.has(id)) el.setAttribute("id", `${prefix}${id}`);
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name;
            if (name === "id") continue;
            if (name === "href" || name === "xlink:href") {
                const m = HREF_PATTERN.exec(attr.value.trim());
                if (m && idSet.has(m[1]!)) {
                    el.setAttribute("href", `#${prefix}${m[1]}`);
                    el.removeAttribute("xlink:href");
                }
                continue;
            }
            URL_REF_GLOBAL.lastIndex = 0;
            if (URL_REF_GLOBAL.test(attr.value)) {
                el.setAttribute(name, renameRefs(attr.value));
            }
        }
        for (const child of Array.from(el.children)) walk(child);
    };
    walk(clone);
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("focusable", "false");
    return clone;
}
