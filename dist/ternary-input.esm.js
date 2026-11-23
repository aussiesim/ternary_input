var checkboxNeutral = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\"/></svg>";

var checkboxPositive = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\"/><path d=\"M7.5 12.4l3 3 6-6.9\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";

var checkboxNegative = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\"/><path d=\"M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2.2\" stroke-linecap=\"round\"/></svg>";

var heartNeutral = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><path d=\"M12 20.4C7.2 16.9 3.5 13.6 3.5 9.7 3.5 6.9 5.7 4.6 8.4 4.6c1.6 0 3 .8 3.6 2 .6-1.2 2-2 3.6-2 2.7 0 4.9 2.3 4.9 5.1 0 3.9-3.7 7.2-8.5 10.7z\" fill=\"none\" stroke=\"#000000\" stroke-width=\"2\" stroke-linejoin=\"round\"/></svg>";

var heartPositive = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><path d=\"M12 20.4C7.2 16.9 3.5 13.6 3.5 9.7 3.5 6.9 5.7 4.6 8.4 4.6c1.6 0 3 .8 3.6 2 .6-1.2 2-2 3.6-2 2.7 0 4.9 2.3 4.9 5.1 0 3.9-3.7 7.2-8.5 10.7z\" fill=\"#000000\"/></svg>";

var heartNegative = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><path d=\"M 12.465718,6.4447607 C 11.765718,5.2447607 10,4.6 8.4,4.6 5.7,4.6 3.5,6.9 3.5,9.7 c 0,3.9 3.9725744,6.634282 8.572574,10.134282 -0.475685,-1.575162 -1.014391,-3.128245 -1.593531,-4.667788 l 3.379819,-3.141526 -2.984208,-2.8804587 z\" fill=\"#000000\" transform=\"translate(-0.9)\"/><path d=\"m 12,6.6 c 0.7,-1.2 2,-2 3.6,-2 2.7,0 4.9,2.3 4.9,5.1 0,3.9 -3.6,7.1 -8.2,10.6 L 9.9754204,15.558473 14.172962,12.123803 11.072574,9.0443726 Z\" fill=\"#000000\" transform=\"translate(0.9)\"/></svg>";

var numbersNeutral = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><path d=\"M12 4.5c-2.9 0-4.7 2.3-4.7 5.6v3.8c0 3.3 1.8 5.6 4.7 5.6s4.7-2.3 4.7-5.6v-3.8c0-3.3-1.8-5.6-4.7-5.6zm0 2c1.5 0 2.5 1.4 2.5 3.6v3.8c0 2.2-1 3.6-2.5 3.6s-2.5-1.4-2.5-3.6v-3.8c0-2.2 1-3.6 2.5-3.6z\" fill=\"#000000\"/></svg>";

var numbersPositive = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><path d=\"m 4.2556286,12.066892 h 2.7 V 9.3668858 h 2 v 2.7000062 h 2.7000034 v 2.000004 H 8.9556286 v 2.7 h -2 v -2.7 h -2.7 z\" fill=\"#000000\"/><path d=\"M13.2 19v-1.9h1.8V9.3l-1.8 1V8.1l2.9-1.9h2v10.9h1.9V19z\" fill=\"#000000\"/></svg>";

var numbersNegative = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect width=\"24\" height=\"24\" fill=\"#ffffff\"/><path d=\"m 4.2245807,12.017728 h 7.4000033 v 2.2 H 4.2245807 Z\" fill=\"#000000\"/><path d=\"M13.2 19v-1.9h1.8V9.3l-1.8 1V8.1l2.9-1.9h2v10.9h1.9V19z\" fill=\"#000000\"/></svg>";

/** Raw SVG source for every built-in preset/state combination. */
const BUILTIN_ICON_SOURCES = {
    checkbox: {
        [-1]: checkboxNegative,
        [0]: checkboxNeutral,
        [1]: checkboxPositive
    },
    heart: {
        [-1]: heartNegative,
        [0]: heartNeutral,
        [1]: heartPositive
    },
    numbers: {
        [-1]: numbersNegative,
        [0]: numbersNeutral,
        [1]: numbersPositive
    }
};

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
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";
const SVG_SOURCE_LIMITS = {
    maxSourceBytes: 256 * 1024,
    maxElements: 2048,
    maxDepth: 32,
    maxUseNesting: 8,
    maxExpandedNodes: 4096
};
const DEFAULT_SOURCE_PALETTE = {
    foreground: "#000000",
    background: "#ffffff"
};
class SvgPaletteError extends Error {
    constructor(message) {
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
const ELEMENT_ATTRIBUTES = {
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
function normalizeOpaqueColor(value) {
    const v = value.trim().toLowerCase();
    const hexShort = /^#([0-9a-f]{3})$/.exec(v);
    if (hexShort) {
        const h = hexShort[1];
        return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    const hexLong = /^#([0-9a-f]{6})$/.exec(v);
    if (hexLong)
        return `#${hexLong[1]}`;
    const rgb = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/
        .exec(v);
    if (rgb) {
        const parts = [rgb[1], rgb[2], rgb[3]].map(Number);
        if (parts.every((n) => n >= 0 && n <= 255)) {
            return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        }
        return null;
    }
    if (v === "black")
        return "#000000";
    if (v === "white")
        return "#ffffff";
    return null;
}
/** Parse and validate the public sourceColors option. */
function parseSourceColors(input) {
    const foreground = input?.foreground === undefined
        ? DEFAULT_SOURCE_PALETTE.foreground
        : normalizeOpaqueColor(input.foreground);
    const background = input?.background === undefined
        ? DEFAULT_SOURCE_PALETTE.background
        : normalizeOpaqueColor(input.background);
    if (foreground === null) {
        throw new SvgPaletteError("sourceColors.foreground must be an opaque #RGB or #RRGGBB color.");
    }
    if (background === null) {
        throw new SvgPaletteError("sourceColors.background must be an opaque #RGB or #RRGGBB color.");
    }
    if (foreground === background) {
        throw new SvgPaletteError("sourceColors foreground and background must be distinct colors.");
    }
    return { foreground, background };
}
function fail$1(message) {
    throw new SvgPaletteError(message);
}
function isPaintValueAllowed(raw) {
    const v = raw.trim();
    if (v === "")
        return false;
    const lower = v.toLowerCase();
    if (lower === "none" || lower === "currentcolor" || lower === "transparent") {
        return true;
    }
    if (URL_REF_PATTERN.test(v))
        return true;
    if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{4}$/.test(v) ||
        /^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{8}$/.test(v)) {
        return true;
    }
    const fn = /^([a-zA-Z]+)\(([^()]*)\)$/.exec(v);
    if (fn) {
        const name = fn[1].toLowerCase();
        const args = fn[2];
        if ((name === "rgb" || name === "rgba" || name === "hsl" ||
            name === "hsla") && /^[-+0-9.,%/\s]+$/.test(args)) {
            return true;
        }
        return false;
    }
    // Named colors and system color keywords: alphabetic words only.
    if (/^[a-zA-Z]+$/.test(v))
        return true;
    return false;
}
function validateAttributeValue(name, value, elementName) {
    if (value.length > 4096)
        fail$1(`Attribute ${name} is too long.`);
    if (PAINT_ATTRIBUTES.has(name)) {
        if (!isPaintValueAllowed(value)) {
            fail$1(`Unsupported paint value "${value}" on ${name}.`);
        }
        return;
    }
    if (OPACITY_ATTRIBUTES.has(name)) {
        if (!/^[-+0-9.]+%?$/.test(value.trim())) {
            fail$1(`Invalid opacity value "${value}" on ${name}.`);
        }
        return;
    }
    if (LOCAL_REF_ATTRIBUTES.has(name)) {
        if (!URL_REF_PATTERN.test(value.trim()) && value.trim() !== "none") {
            fail$1(`Only local url(#id) references are allowed on ${name}.`);
        }
        return;
    }
    if (CLIP_RULE_ATTRIBUTES.has(name)) {
        if (!RULE_PATTERN.test(value.trim())) {
            fail$1(`Invalid rule value "${value}" on ${name}.`);
        }
        return;
    }
    if (name === "stroke-linecap") {
        if (!LINECAP_PATTERN.test(value.trim()))
            fail$1(`Invalid stroke-linecap.`);
        return;
    }
    if (name === "stroke-linejoin") {
        if (!LINEJOIN_PATTERN.test(value.trim()))
            fail$1(`Invalid stroke-linejoin.`);
        return;
    }
    if (name === "id") {
        if (!ID_PATTERN.test(value.trim()))
            fail$1(`Invalid id "${value}".`);
        return;
    }
    if (name === "class") {
        if (!CLASS_PATTERN.test(value))
            fail$1(`Invalid class value.`);
        return;
    }
    if (name === "transform" || name === "gradientTransform") {
        const v = value.trim();
        if (!TRANSFORM_PATTERN.test(v))
            fail$1(`Invalid transform "${v}".`);
        for (const fn of v.matchAll(/([a-zA-Z]+)\s*\(/g)) {
            if (!TRANSFORM_FUNCTIONS.has(fn[1])) {
                fail$1(`Unsupported transform function "${fn[1]}".`);
            }
        }
        return;
    }
    if (name === "href") {
        if (!HREF_PATTERN.test(value.trim())) {
            fail$1(`Only local "#id" hrefs are allowed.`);
        }
        return;
    }
    if (name === "d") {
        if (!PATH_DATA_PATTERN.test(value))
            fail$1(`Invalid path data.`);
        return;
    }
    if (name === "points") {
        if (!POINTS_PATTERN.test(value))
            fail$1(`Invalid points value.`);
        return;
    }
    if (name === "viewBox") {
        if (!VIEWBOX_PATTERN.test(value.trim()))
            fail$1(`Invalid viewBox.`);
        return;
    }
    if (name === "preserveAspectRatio") {
        if (!ASPECT_PATTERN.test(value.trim())) {
            fail$1(`Invalid preserveAspectRatio.`);
        }
        return;
    }
    if (name === "gradientUnits" || name === "clipPathUnits" ||
        name === "maskUnits" || name === "maskContentUnits") {
        if (!UNITS_PATTERN.test(value.trim()))
            fail$1(`Invalid units value.`);
        return;
    }
    if (name === "spreadMethod") {
        if (!SPREAD_PATTERN.test(value.trim()))
            fail$1(`Invalid spreadMethod.`);
        return;
    }
    if (name === "text-anchor") {
        if (!ANCHOR_PATTERN.test(value.trim()))
            fail$1(`Invalid text-anchor.`);
        return;
    }
    if (name === "display") {
        if (!DISPLAY_PATTERN.test(value.trim()))
            fail$1(`Invalid display value.`);
        return;
    }
    // Remaining geometry/size/offset attributes: lengths, numbers, lists.
    if (!NUMBER_PATTERN.test(value) || /[();'{}<>&"\\:]/.test(value)) {
        fail$1(`Invalid value "${value}" on ${name} of <${elementName}>.`);
    }
}
/**
 * Tokenize and validate an inline style declaration block. Unknown
 * declarations, custom properties, !important, comments, and unsafe values
 * reject the whole document. Returns normalized declarations to rebuild.
 */
function parseStyleDeclarations(text, doc) {
    if (text.length > 8192)
        fail$1("Style declaration block is too long.");
    if (/[<>@{}\\]/.test(text))
        fail$1("Unsafe characters in style attribute.");
    const decls = [];
    for (const chunk of text.split(";")) {
        const trimmed = chunk.trim();
        if (trimmed === "")
            continue;
        const match = /^([a-zA-Z-]+)\s*:\s*(.+)$/s.exec(trimmed);
        if (!match)
            fail$1(`Malformed style declaration "${trimmed}".`);
        const name = match[1].toLowerCase();
        const value = match[2].trim();
        if (name.startsWith("--"))
            fail$1("Custom properties are not allowed.");
        if (!STYLE_PROPERTIES.has(name)) {
            fail$1(`Unsupported style property "${name}".`);
        }
        if (/!important/i.test(value))
            fail$1("!important is not allowed.");
        if (/var\(|env\(|attr\(|expression\(/i.test(value)) {
            fail$1(`Unsafe expression in "${name}".`);
        }
        validateStyleValue(name, value);
        decls.push({ name, value });
    }
    // Second layer: ask the engine to validate each declaration for its own
    // property. CSS.supports is authoritative where present; otherwise a
    // style probe first proves the property is supported at all (known-good
    // value), then rejects when the engine drops the actual value.
    const supports = doc.defaultView?.CSS?.supports?.bind(doc.defaultView.CSS);
    for (const decl of decls) {
        if (supports) {
            if (!supports(decl.name, decl.value)) {
                fail$1(`Engine rejected style declaration ` +
                    `"${decl.name}: ${decl.value}".`);
            }
            continue;
        }
        const probe = doc.createElement("div");
        const good = KNOWN_GOOD_STYLE_VALUES[decl.name];
        if (good === undefined)
            continue;
        probe.style.setProperty(decl.name, "");
        probe.style.setProperty(decl.name, good);
        const supported = probe.style.getPropertyValue(decl.name).trim() !== "";
        probe.style.setProperty(decl.name, "");
        if (!supported)
            continue; // engine cannot judge this property
        probe.style.setProperty(decl.name, decl.value);
        const kept = probe.style.getPropertyValue(decl.name).trim();
        probe.style.removeProperty(decl.name);
        if (kept === "") {
            fail$1(`Engine rejected style declaration ` +
                `"${decl.name}: ${decl.value}".`);
        }
    }
    return decls;
}
/** Known-good values used to prove an engine supports a style property. */
const KNOWN_GOOD_STYLE_VALUES = {
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
function validateStyleValue(name, value) {
    if (PAINT_ATTRIBUTES.has(name)) {
        if (!isPaintValueAllowed(value)) {
            fail$1(`Unsupported paint declaration "${name}: ${value}".`);
        }
        return;
    }
    if (OPACITY_ATTRIBUTES.has(name)) {
        if (!/^[-+0-9.]+%?$/.test(value)) {
            fail$1(`Invalid opacity declaration "${name}: ${value}".`);
        }
        return;
    }
    if (LOCAL_REF_ATTRIBUTES.has(name)) {
        if (!URL_REF_PATTERN.test(value) && value !== "none") {
            fail$1(`Only local url(#id) allowed in "${name}".`);
        }
        return;
    }
    if (CLIP_RULE_ATTRIBUTES.has(name)) {
        if (!RULE_PATTERN.test(value))
            fail$1(`Invalid "${name}: ${value}".`);
        return;
    }
    if (name === "stroke-linecap") {
        if (!LINECAP_PATTERN.test(value))
            fail$1(`Invalid "${name}: ${value}".`);
        return;
    }
    if (name === "stroke-linejoin") {
        if (!LINEJOIN_PATTERN.test(value))
            fail$1(`Invalid "${name}: ${value}".`);
        return;
    }
    // stroke-width, miterlimit, dasharray, dashoffset: numeric lists.
    if (!/^[-+0-9.,%a-zA-Z \t]+$/.test(value) || /[();'{}<>&"\\:]/.test(value)) {
        fail$1(`Invalid declaration "${name}: ${value}".`);
    }
}
function mapPaintValue(raw, palette) {
    const normalized = normalizeOpaqueColor(raw);
    if (normalized === palette.foreground) {
        return "var(--ternary-resolved-fg)";
    }
    if (normalized === palette.background) {
        return "var(--ternary-resolved-bg)";
    }
    return raw;
}
function registerId(ctx, id, element) {
    if (ctx.ids.has(id))
        fail$1(`Duplicate id "${id}".`);
    ctx.ids.set(id, element);
}
function addRef(ctx, el, id) {
    let set = ctx.refs.get(el);
    if (!set) {
        set = new Set();
        ctx.refs.set(el, set);
    }
    set.add(id);
}
/** Collect local url(#id) references from any attribute/decl value. */
function collectAttrReference(ctx, el, value) {
    for (const m of value.matchAll(URL_REF_GLOBAL)) {
        addRef(ctx, el, m[1]);
    }
}
function rebuildElement(ctx, source, depth) {
    if (depth > SVG_SOURCE_LIMITS.maxDepth) {
        fail$1(`SVG tree exceeds depth limit ${SVG_SOURCE_LIMITS.maxDepth}.`);
    }
    ctx.elementCount.value += 1;
    if (ctx.elementCount.value > SVG_SOURCE_LIMITS.maxElements) {
        fail$1(`SVG exceeds element limit ${SVG_SOURCE_LIMITS.maxElements}.`);
    }
    const name = source.localName;
    if (source.namespaceURI !== SVG_NS || !ALLOWED_ELEMENTS.has(name)) {
        fail$1(`Unsupported element <${name}>.`);
    }
    const target = ctx.doc.createElementNS(SVG_NS, name);
    const allowed = ELEMENT_ATTRIBUTES[name] ?? new Set();
    let rootHasFill = false;
    for (const attr of Array.from(source.attributes)) {
        const attrNs = attr.namespaceURI;
        let attrName = attr.name;
        if (attrNs === XMLNS_NS || attrName === "xmlns") {
            const nsValue = attr.value.trim();
            if (nsValue !== SVG_NS && nsValue !== XLINK_NS) {
                fail$1(`Unrecognized namespace declaration "${nsValue}".`);
            }
            continue;
        }
        if (attrNs === XLINK_NS && attr.localName === "href") {
            attrName = "href";
        }
        else if (attrNs !== null && attrNs !== "") {
            fail$1(`Foreign-namespace attribute "${attr.name}".`);
        }
        if (!GLOBAL_ATTRIBUTES.has(attrName) && !allowed.has(attrName)) {
            fail$1(`Unsupported attribute "${attrName}" on <${name}>.`);
        }
        const value = attr.value;
        if (attrName === "style") {
            const decls = parseStyleDeclarations(value, ctx.doc);
            for (const decl of decls) {
                collectAttrReference(ctx, target, decl.value);
            }
            if (decls.some((d) => d.name === "fill"))
                rootHasFill = true;
            const rebuilt = decls
                .map((d) => PAINT_ATTRIBUTES.has(d.name)
                ? `${d.name}: ${mapPaintValue(d.value, ctx.palette)}`
                : `${d.name}: ${d.value}`)
                .join("; ");
            if (rebuilt !== "")
                target.setAttribute("style", rebuilt);
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
        }
        else {
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
        }
        else if (child.nodeType === 1 /* ELEMENT_NODE */) {
            target.appendChild(rebuildElement(ctx, child, depth + 1));
        }
        else if (child.nodeType === 8 /* COMMENT_NODE */ ||
            child.nodeType === 7 /* PROCESSING_INSTRUCTION_NODE */) {
            fail$1("Comments and processing instructions are not allowed.");
        }
    }
    return target;
}
function validateReferences(ctx, root) {
    // Missing targets reject before any graph work.
    for (const refs of ctx.refs.values()) {
        for (const id of refs) {
            if (!ctx.ids.has(id)) {
                fail$1(`Reference to missing local id "${id}".`);
            }
        }
    }
    // Cycle detection over an Element graph containing both containment
    // edges (element -> child) and reference edges (element -> referenced
    // element). Anonymous elements participate too: a <g id="self"> with a
    // descendant <use href="#self"> cycles g -> use -> g even though the use
    // itself carries no id.
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    const visit = (el) => {
        color.set(el, GRAY);
        for (const id of ctx.refs.get(el) ?? []) {
            const target = ctx.ids.get(id);
            const state = color.get(target) ?? WHITE;
            if (state === GRAY)
                fail$1(`Circular local reference "${id}".`);
            if (state === WHITE)
                visit(target);
        }
        for (const child of Array.from(el.children)) {
            const state = color.get(child) ?? WHITE;
            if (state === GRAY) {
                fail$1("Circular containment (impossible tree).");
            }
            if (state === WHITE)
                visit(child);
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
function prepareSvgSource(source, doc, palette = DEFAULT_SOURCE_PALETTE) {
    if (new TextEncoder().encode(source).length > SVG_SOURCE_LIMITS.maxSourceBytes) {
        fail$1(`SVG source exceeds ${SVG_SOURCE_LIMITS.maxSourceBytes} bytes.`);
    }
    if (/<!doctype/i.test(source))
        fail$1("DOCTYPE declarations are not allowed.");
    const parser = new DOMParser();
    const parsed = parser.parseFromString(source, "image/svg+xml");
    if (parsed.getElementsByTagName("parsererror").length > 0) {
        fail$1("SVG source is not well-formed XML.");
    }
    const root = parsed.documentElement;
    if (!root || root.localName !== "svg" || root.namespaceURI !== SVG_NS) {
        fail$1("Source document is not an SVG.");
    }
    if (parsed.doctype)
        fail$1("DOCTYPE declarations are not allowed.");
    const ctx = {
        doc,
        palette,
        ids: new Map(),
        refs: new Map(),
        elementCount: { value: 0 }
    };
    const template = rebuildElement(ctx, root, 1);
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
function enforceUseBudget(ctx, template) {
    const LIMIT = SVG_SOURCE_LIMITS.maxExpandedNodes;
    const DEPTH = SVG_SOURCE_LIMITS.maxUseNesting;
    const memo = new Map();
    const expandedSize = (el, depth) => {
        const byDepth = memo.get(el);
        const hit = byDepth?.get(depth);
        if (hit !== undefined)
            return hit;
        let size = 1;
        if (el.localName === "use") {
            if (depth + 1 > DEPTH) {
                fail$1(`<use> nesting exceeds ${DEPTH}.`);
            }
            const href = el.getAttribute("href");
            if (href && href.startsWith("#")) {
                const target = ctx.ids.get(href.slice(1));
                if (target) {
                    size += Math.min(expandedSize(target, depth + 1), Math.max(0, LIMIT + 1 - size));
                }
            }
        }
        for (const child of Array.from(el.children)) {
            size += Math.min(expandedSize(child, depth), Math.max(0, LIMIT + 1 - size));
            if (size > LIMIT)
                break;
        }
        if (!byDepth)
            memo.set(el, new Map());
        memo.get(el).set(depth, size);
        return size;
    };
    const total = expandedSize(template, 0);
    if (total > LIMIT) {
        fail$1(`Expanded <use> budget ${LIMIT} exceeded.`);
    }
}
let idCounter = 0;
/**
 * Allocate an id/prefix that is provably unused in the ownerDocument, looping
 * past collisions so simultaneous copies of this module (e.g. an IIFE build
 * and an ESM build on one page) can never mint the same identifiers.
 */
function allocUniqueToken(doc, stem, extraIds = []) {
    for (;;) {
        idCounter += 1;
        const candidate = `${stem}${idCounter.toString(36)}`;
        const collision = doc.getElementById(candidate) !== null ||
            extraIds.some((id) => doc.getElementById(`${candidate}-${id}`) !== null);
        if (!collision)
            return candidate;
    }
}
/**
 * Clone a prepared template for mounting, rewriting every authored id and
 * local reference into a fresh per-mount namespace so cloned icons can never
 * collide with each other or the host document.
 */
function instantiatePreparedSvg(prepared, doc) {
    const prefix = `${allocUniqueToken(doc, "ti", prepared.ids)}-`;
    const clone = prepared.template.cloneNode(true);
    const idSet = new Set(prepared.ids);
    const renameRefs = (value) => value.replace(URL_REF_GLOBAL, (_m, id) => idSet.has(id) ? `url(#${prefix}${id})` : _m);
    const walk = (el) => {
        const id = el.getAttribute("id");
        if (id && idSet.has(id))
            el.setAttribute("id", `${prefix}${id}`);
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name;
            if (name === "id")
                continue;
            if (name === "href" || name === "xlink:href") {
                const m = HREF_PATTERN.exec(attr.value.trim());
                if (m && idSet.has(m[1])) {
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
        for (const child of Array.from(el.children))
            walk(child);
    };
    walk(clone);
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("focusable", "false");
    return clone;
}

const VALUES = [-1, 0, 1];
const DEFAULT_CYCLE = [0, 1, -1];
const DEFAULT_LABELS = {
    [-1]: "Negative",
    [0]: "Neutral",
    [1]: "Positive"
};
const PRESETS = ["checkbox", "heart", "numbers"];
const COLOR_OPTIONS = [
    ["fg_color", "--ternary-fg"],
    ["bg_color", "--ternary-bg"],
    ["neutral_fg_color", "--ternary-neutral-fg"],
    ["neutral_bg_color", "--ternary-neutral-bg"],
    ["positive_fg_color", "--ternary-positive-fg"],
    ["positive_bg_color", "--ternary-positive-bg"],
    ["negative_fg_color", "--ternary-negative-fg"],
    ["negative_bg_color", "--ternary-negative-bg"]
];
const instances = new WeakMap();
function isTernaryValue(value) {
    return value === -1 || value === 0 || value === 1;
}
function fail(message) {
    throw new TypeError(`setupTernary: ${message}`);
}
function balancedParens(v) {
    let depth = 0;
    for (const ch of v) {
        if (ch === "(")
            depth++;
        else if (ch === ")") {
            depth--;
            if (depth < 0)
                return false;
        }
    }
    return depth === 0;
}
/**
 * Validate a CSS color option value using the document's own CSS engine
 * (CSS.supports when available, else a style probe), with a structural
 * fallback for var()/env() expressions in engines that cannot evaluate them.
 */
function validateCssColorOption(doc, name, value) {
    if (typeof value !== "string") {
        fail(`${name} must be a string.`);
    }
    const v = value.trim();
    if (v === "")
        fail(`${name} must not be empty.`);
    if (/[;{}<>]/.test(v) || v.includes("\\")) {
        fail(`${name} contains unsafe characters.`);
    }
    if (!balancedParens(v))
        fail(`${name} has unbalanced parentheses.`);
    const supports = doc.defaultView?.CSS?.supports?.bind(doc.defaultView.CSS);
    if (supports) {
        if (!supports("color", v)) {
            fail(`${name} is not a valid CSS color: "${v}".`);
        }
        return v;
    }
    const probe = doc.createElement("span");
    probe.style.color = "";
    probe.style.color = v;
    if (probe.style.color !== "")
        return v;
    // Engines unable to store var()/env() values: accept well-formed custom
    // property references of a safe shape.
    if (/^(var|env)\(/.test(v) &&
        /^[-_a-zA-Z0-9(),.%+\s#*/]+$/.test(v) &&
        v.indexOf("--") >= 0) {
        return v;
    }
    fail(`${name} is not a valid CSS color: "${v}".`);
}
function hasAccessibleName(button) {
    const doc = button.ownerDocument;
    if ((button.textContent ?? "").trim() !== "")
        return true;
    if ((button.getAttribute("aria-label") ?? "").trim() !== "")
        return true;
    const labelledby = (button.getAttribute("aria-labelledby") ?? "").trim();
    if (labelledby !== "") {
        const resolved = labelledby
            .split(/\s+/)
            .some((id) => (doc.getElementById(id)?.textContent ?? "").trim() !== "");
        if (resolved)
            return true;
    }
    const labels = button.labels;
    if (labels && labels.length > 0)
        return true;
    // Fallback for environments without HTMLButtonElement.labels: a wrapping
    // label or an explicit label[for=id] association.
    if (button.closest("label"))
        return true;
    const id = button.id;
    if (id !== "" &&
        doc.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`)) {
        return true;
    }
    return false;
}
const IMG_SCHEMES = new Set(["http:", "https:", "data:", "blob:"]);
const SVG_SCHEMES = new Set(["http:", "https:"]);
function normalizeIconSpec(doc, value, icon) {
    const raw = typeof icon === "string" ? icon : icon.src;
    let url;
    try {
        url = new URL(raw, doc.baseURI);
    }
    catch {
        fail(`states[${value}].icon is not a valid URL: "${raw}".`);
    }
    if (typeof icon === "string") {
        if (!IMG_SCHEMES.has(url.protocol)) {
            return {
                kind: "invalid",
                url: url.href,
                error: new Error(`Image icons require http(s)/data/blob URLs, got ` +
                    `"${url.protocol}".`)
            };
        }
        return { kind: "img", url: url.href };
    }
    if (!SVG_SCHEMES.has(url.protocol)) {
        return {
            kind: "invalid",
            url: url.href,
            error: new Error(`Recolorable SVG icons require http(s) URLs, got ` +
                `"${url.protocol}".`)
        };
    }
    return { kind: "svg", url: url.href };
}
function validateOptions(doc, options) {
    if (options === null || typeof options !== "object") {
        fail("options must be an object.");
    }
    const checked = options.checked === undefined ? 0 : options.checked;
    if (!isTernaryValue(checked)) {
        fail("checked must be the number -1, 0, or 1.");
    }
    const preset = options.preset === undefined ? "checkbox" : options.preset;
    if (!PRESETS.includes(preset)) {
        fail(`preset must be one of ${PRESETS.join(", ")}.`);
    }
    const cycle = options.cycle === undefined
        ? [...DEFAULT_CYCLE]
        : [...options.cycle];
    if (!Array.isArray(cycle) || cycle.length !== 3 ||
        !VALUES.every((v) => cycle.filter((c) => c === v).length === 1)) {
        fail("cycle must contain each of -1, 0, and 1 exactly once.");
    }
    const states = {};
    for (const value of VALUES) {
        const stateOptions = options.states?.[value];
        if (stateOptions === undefined) {
            states[value] = { label: DEFAULT_LABELS[value], icon: undefined };
            continue;
        }
        if (typeof stateOptions !== "object" || stateOptions === null) {
            fail(`states[${value}] must be an object.`);
        }
        const label = stateOptions.label === undefined
            ? DEFAULT_LABELS[value]
            : stateOptions.label;
        if (typeof label !== "string") {
            fail(`states[${value}].label must be a string.`);
        }
        const icon = stateOptions.icon;
        if (icon !== undefined) {
            const isString = typeof icon === "string";
            const isSvgIcon = typeof icon === "object" && icon !== null &&
                typeof icon.src === "string" && icon.recolor === true;
            if (!isString && !isSvgIcon) {
                fail(`states[${value}].icon must be a URL string or ` +
                    `{ src, recolor: true }.`);
            }
            if (isString && icon.trim() === "") {
                fail(`states[${value}].icon URL must not be empty.`);
            }
        }
        states[value] = {
            label,
            icon: icon === undefined
                ? undefined
                : normalizeIconSpec(doc, value, typeof icon === "string" ? icon : { src: icon.src, recolor: true })
        };
    }
    const colors = [];
    for (const [key, cssVar] of COLOR_OPTIONS) {
        const raw = options[key];
        if (raw === undefined)
            continue;
        colors.push([cssVar, validateCssColorOption(doc, key, raw)]);
    }
    const sourcePalette = parseSourceColors(options.sourceColors);
    let name;
    if (options.name !== undefined) {
        if (typeof options.name !== "string") {
            fail("name must be a string.");
        }
        name = options.name;
    }
    if (options.disabled !== undefined && typeof options.disabled !== "boolean") {
        fail("disabled must be a boolean.");
    }
    if (options.onChange !== undefined && typeof options.onChange !== "function") {
        fail("onChange must be a function.");
    }
    if (options.onIconError !== undefined &&
        typeof options.onIconError !== "function") {
        fail("onIconError must be a function.");
    }
    return {
        checked,
        preset,
        cycle,
        states,
        colors,
        sourcePalette,
        name,
        disabled: options.disabled,
        onChange: options.onChange,
        onIconError: options.onIconError
    };
}
/**
 * Enhance an existing, document-attached HTMLButtonElement as a three-state
 * input. Native author-owned labels keep working through the browser's own
 * label association; no label rendering or click forwarding is added.
 */
function setupTernary(button, options = {}) {
    const existing = instances.get(button);
    if (existing)
        return existing;
    const view = button?.ownerDocument?.defaultView;
    if (!button || !view || !(button instanceof view.HTMLButtonElement)) {
        fail("button must be a real HTMLButtonElement.");
    }
    if (!button.isConnected) {
        fail("button must be attached to a document.");
    }
    if (!hasAccessibleName(button)) {
        fail("button needs an accessible name: an associated label, inline " +
            "text, aria-label, or resolvable aria-labelledby.");
    }
    // Validate everything before mutating author-owned DOM.
    const doc = button.ownerDocument;
    // Validate everything before mutating author-owned DOM: options, icon
    // URLs, and explicit form ownership must all settle up front so a bad
    // configuration can never leave a half-enhanced button behind.
    const config = validateOptions(doc, options);
    const formAttr = button.getAttribute("form");
    let formOwner;
    if (formAttr !== null && formAttr.trim() !== "") {
        const candidate = doc.getElementById(formAttr.trim());
        if (!(candidate instanceof view.HTMLFormElement)) {
            throw new TypeError(`setupTernary: form attribute references missing form ` +
                `"${formAttr}".`);
        }
        formOwner = candidate;
    }
    else {
        formOwner = button.form;
    }
    const effectiveName = config.name !== undefined
        ? config.name
        : (button.getAttribute("name") ?? undefined);
    // Snapshot only what enhancement touches, so destroy can restore exactly.
    const snapshot = {
        type: button.getAttribute("type"),
        ariaDescribedby: button.getAttribute("aria-describedby"),
        classHadTernary: button.classList.contains("ternary-input"),
        dataValue: button.getAttribute("data-ternary-value"),
        disabled: button.disabled
    };
    // Last values this instance wrote; destroy restores only when the current
    // value still equals what the library wrote.
    let wroteDataValue = null;
    let wroteDisabled = null;
    const colorSnapshots = [];
    const appliedColors = new Map();
    let destroyed = false;
    let current = config.checked;
    const initialChecked = config.checked;
    let disabledState = button.disabled;
    let iconGeneration = 0;
    const iconControllers = new Set();
    const pendingImages = new Set();
    const preparedCache = new Map();
    const preparedFailed = new Set();
    const imageCache = new Map();
    const imageReady = new Map();
    const imageFailed = new Set();
    const builtinTemplates = new Map();
    const iconErrorNotified = new Set();
    const ownedNodes = [];
    // --- Generated DOM -----------------------------------------------------
    const uid = allocUniqueToken(doc, "ternary", ["description", "status"]);
    const iconWrap = doc.createElement("span");
    iconWrap.className = "ternary-input__icon";
    iconWrap.setAttribute("aria-hidden", "true");
    const stateText = doc.createElement("span");
    stateText.className = "ternary-input__state-text";
    iconWrap.appendChild(stateText);
    button.insertBefore(iconWrap, button.firstChild);
    const description = doc.createElement("span");
    description.id = `${uid}-description`;
    description.className = "ternary-input__sr-only";
    doc.body.appendChild(description);
    ownedNodes.push(description);
    const status = doc.createElement("div");
    status.id = `${uid}-status`;
    status.className = "ternary-input__sr-only";
    status.setAttribute("aria-live", "polite");
    status.setAttribute("role", "status");
    doc.body.appendChild(status);
    ownedNodes.push(status);
    const describedbyTokens = new Set((snapshot.ariaDescribedby ?? "").split(/\s+/).filter((t) => t !== ""));
    describedbyTokens.add(description.id);
    button.setAttribute("aria-describedby", [...describedbyTokens].join(" "));
    button.classList.add("ternary-input");
    button.setAttribute("type", "button");
    // --- Optional form participation ---------------------------------------
    let hiddenInput = null;
    if (effectiveName !== undefined && effectiveName !== "") {
        hiddenInput = doc.createElement("input");
        hiddenInput.type = "hidden";
        hiddenInput.name = effectiveName;
        if (formAttr !== null && formAttr.trim() !== "") {
            hiddenInput.setAttribute("form", formAttr.trim());
        }
        hiddenInput.disabled = disabledState;
        hiddenInput.value = String(current);
        button.insertAdjacentElement("afterend", hiddenInput);
        ownedNodes.push(hiddenInput);
    }
    const onFormReset = (event) => {
        // Later listeners may still cancel; restore on the next microtask
        // only if the reset actually went through.
        queueMicrotask(() => {
            if (!destroyed && !event.defaultPrevented) {
                applyValue(initialChecked);
            }
        });
    };
    formOwner?.addEventListener("reset", onFormReset);
    // --- Icon preparation ---------------------------------------------------
    const builtinTemplate = (value) => {
        let prepared = builtinTemplates.get(value);
        if (!prepared) {
            prepared = prepareSvgSource(BUILTIN_ICON_SOURCES[config.preset][value], doc, DEFAULT_SOURCE_PALETTE);
            builtinTemplates.set(value, prepared);
        }
        return prepared;
    };
    const mountBuiltin = (value) => {
        const svg = instantiatePreparedSvg(builtinTemplate(value), doc);
        svg.classList.add("ternary-input__svg");
        iconWrap.replaceChildren(svg, stateText);
    };
    const clearMountedIcon = () => {
        iconWrap.querySelectorAll(".ternary-input__svg, img")
            .forEach((n) => n.remove());
    };
    const notifyIconError = (value, src, error) => {
        // Once per failed source, not once per render.
        if (iconErrorNotified.has(src) || destroyed)
            return;
        iconErrorNotified.add(src);
        const detail = { checked: value, src, error };
        const event = new view.CustomEvent("iconerror", { detail, bubbles: true });
        button.dispatchEvent(event);
        if (!destroyed)
            config.onIconError?.(event);
    };
    const fetchWithLimit = async (url, controller) => {
        const response = await fetch(url, {
            signal: controller.signal,
            credentials: "same-origin"
        });
        if (!response.ok) {
            throw new Error(`Icon fetch failed with status ${response.status}.`);
        }
        const limit = SVG_SOURCE_LIMITS.maxSourceBytes;
        if (!response.body) {
            const text = await response.text();
            if (new TextEncoder().encode(text).length > limit) {
                throw new Error("Icon SVG exceeds the 256 KiB source limit.");
            }
            return text;
        }
        const reader = response.body.getReader();
        const chunks = [];
        let total = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            total += value.byteLength;
            if (total > limit) {
                await reader.cancel();
                throw new Error("Icon SVG exceeds the 256 KiB source limit.");
            }
            chunks.push(value);
        }
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return new TextDecoder().decode(merged);
    };
    const preparedForUrl = (url) => {
        let cached = preparedCache.get(url);
        if (!cached) {
            const controller = new AbortController();
            iconControllers.add(controller);
            cached = fetchWithLimit(url, controller)
                .then((source) => prepareSvgSource(source, doc, config.sourcePalette))
                .finally(() => {
                iconControllers.delete(controller);
            });
            preparedCache.set(url, cached);
            // Retain the settled outcome; a rejected source stays rejected for
            // this instance instead of re-fetching on every visit.
            cached.catch(() => {
                preparedFailed.add(url);
            });
        }
        return cached;
    };
    const requestImage = (url) => {
        let cached = imageCache.get(url);
        if (!cached) {
            cached = new Promise((resolve, reject) => {
                const img = doc.createElement("img");
                img.className = "ternary-input__svg";
                img.alt = "";
                pendingImages.add(img);
                const settle = () => {
                    img.onload = null;
                    img.onerror = null;
                    pendingImages.delete(img);
                };
                img.onload = () => {
                    settle();
                    imageReady.set(url, img);
                    resolve(img);
                };
                img.onerror = () => {
                    settle();
                    reject(new Error(`Image failed to load: ${url}`));
                };
                img.src = url;
            });
            imageCache.set(url, cached);
            cached.catch(() => {
                imageFailed.add(url);
            });
        }
        return cached;
    };
    const renderIcon = (value) => {
        const generation = ++iconGeneration;
        const spec = config.states[value].icon;
        clearMountedIcon();
        if (spec === undefined) {
            mountBuiltin(value);
            return;
        }
        mountBuiltin(value); // preset fallback while loading / on failure
        if (spec.kind === "invalid") {
            notifyIconError(value, spec.url, spec.error);
            return;
        }
        if (spec.kind === "img") {
            const ready = imageReady.get(spec.url);
            if (ready) {
                clearMountedIcon();
                iconWrap.replaceChildren(ready, stateText);
                return;
            }
            if (imageFailed.has(spec.url))
                return;
            requestImage(spec.url)
                .then((img) => {
                if (destroyed || generation !== iconGeneration)
                    return;
                clearMountedIcon();
                iconWrap.replaceChildren(img, stateText);
            })
                .catch((error) => {
                if (destroyed)
                    return;
                notifyIconError(value, spec.url, error instanceof Error
                    ? error
                    : new Error(String(error)));
            });
            return;
        }
        // { src, recolor: true }: validated inline SVG with palette mapping.
        if (preparedFailed.has(spec.url))
            return;
        preparedForUrl(spec.url)
            .then((prepared) => {
            if (destroyed || generation !== iconGeneration)
                return;
            const svg = instantiatePreparedSvg(prepared, doc);
            svg.classList.add("ternary-input__svg");
            clearMountedIcon();
            iconWrap.replaceChildren(svg, stateText);
        })
            .catch((error) => {
            if (destroyed)
                return;
            notifyIconError(value, spec.url, error instanceof Error ? error : new Error(String(error)));
        });
    };
    // --- State application --------------------------------------------------
    const updateDescription = () => {
        const label = config.states[current].label;
        const cycleNames = config.cycle
            .map((v) => config.states[v].label)
            .join(", ");
        description.textContent =
            `Current state: ${label}. Activate to cycle: ${cycleNames}.`;
        stateText.textContent = label;
    };
    function applyValue(value) {
        current = value;
        wroteDataValue = String(value);
        button.setAttribute("data-ternary-value", wroteDataValue);
        if (hiddenInput)
            hiddenInput.value = wroteDataValue;
        updateDescription();
        renderIcon(value);
    }
    const emitChange = (previous, next, source) => {
        // Freeze the transition detail before external listeners can mutate
        // the instance again. Bail out entirely if the instance is already
        // gone (e.g. an iconerror listener destroyed it mid-transition).
        if (destroyed)
            return;
        const detail = {
            checked: next,
            previousChecked: previous,
            source
        };
        button.dispatchEvent(new view.Event("input", { bubbles: true }));
        if (destroyed)
            return;
        const change = new view.CustomEvent("change", {
            detail,
            bubbles: true
        });
        button.dispatchEvent(change);
        if (destroyed)
            return;
        config.onChange?.(change);
    };
    const onClick = () => {
        if (button.matches(":disabled"))
            return;
        const index = config.cycle.indexOf(current);
        const next = config.cycle[(index + 1) % config.cycle.length];
        if (next === current)
            return;
        const previous = current;
        applyValue(next);
        status.textContent = config.states[next].label;
        emitChange(previous, next, "user");
    };
    button.addEventListener("click", onClick);
    // --- Initial application -------------------------------------------------
    for (const [cssVar, colorValue] of config.colors) {
        colorSnapshots.push([
            cssVar,
            button.style.getPropertyValue(cssVar),
            button.style.getPropertyPriority(cssVar)
        ]);
        button.style.setProperty(cssVar, colorValue);
        appliedColors.set(cssVar, colorValue);
    }
    if (config.disabled !== undefined) {
        disabledState = config.disabled;
        wroteDisabled = config.disabled;
        button.disabled = config.disabled;
        if (hiddenInput)
            hiddenInput.disabled = config.disabled;
    }
    applyValue(current);
    const assertAlive = () => {
        if (destroyed) {
            throw new Error("Ternary instance has been destroyed.");
        }
    };
    const instance = {
        button,
        get checked() {
            return current;
        },
        set checked(value) {
            assertAlive();
            if (!isTernaryValue(value)) {
                throw new TypeError("checked must be the number -1, 0, or 1.");
            }
            if (value === current)
                return;
            applyValue(value);
        },
        get disabled() {
            return disabledState;
        },
        set disabled(value) {
            assertAlive();
            const next = Boolean(value);
            disabledState = next;
            wroteDisabled = next;
            button.disabled = next;
            if (hiddenInput)
                hiddenInput.disabled = next;
        },
        setChecked(value, setOptions) {
            assertAlive();
            if (!isTernaryValue(value)) {
                throw new TypeError("checked must be the number -1, 0, or 1.");
            }
            if (value === current)
                return;
            const previous = current;
            applyValue(value);
            if (setOptions?.emit)
                emitChange(previous, value, "api");
        },
        reset() {
            assertAlive();
            if (current === initialChecked)
                return;
            applyValue(initialChecked);
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            iconGeneration += 1;
            for (const controller of iconControllers)
                controller.abort();
            iconControllers.clear();
            for (const img of pendingImages) {
                img.onload = null;
                img.onerror = null;
            }
            pendingImages.clear();
            for (const img of imageReady.values()) {
                img.onload = null;
                img.onerror = null;
            }
            imageReady.clear();
            imageFailed.clear();
            preparedFailed.clear();
            builtinTemplates.clear();
            iconErrorNotified.clear();
            preparedCache.clear();
            imageCache.clear();
            button.removeEventListener("click", onClick);
            formOwner?.removeEventListener("reset", onFormReset);
            for (const node of ownedNodes)
                node.parentNode?.removeChild(node);
            iconWrap.remove();
            // Restore only enhancement-owned changes that authors have not
            // since modified.
            if (button.getAttribute("type") === "button") {
                if (snapshot.type === null)
                    button.removeAttribute("type");
                else
                    button.setAttribute("type", snapshot.type);
            }
            // Remove only the generated description token from the CURRENT
            // token list; original and later author tokens are preserved and
            // deduplicated, author removals are not resurrected.
            const remainingDescribedby = [...new Set((button.getAttribute("aria-describedby") ?? "")
                    .split(/\s+/)
                    .filter((t) => t !== "" && t !== description.id))];
            if (remainingDescribedby.length === 0) {
                button.removeAttribute("aria-describedby");
            }
            else {
                button.setAttribute("aria-describedby", remainingDescribedby.join(" "));
            }
            if (wroteDisabled !== null && button.disabled === wroteDisabled) {
                button.disabled = snapshot.disabled;
            }
            for (const [cssVar, prior, priority] of colorSnapshots) {
                if (button.style.getPropertyValue(cssVar) ===
                    appliedColors.get(cssVar) &&
                    button.style.getPropertyPriority(cssVar) === "") {
                    if (prior === "") {
                        button.style.removeProperty(cssVar);
                    }
                    else {
                        button.style.setProperty(cssVar, prior, priority === "" ? undefined : priority);
                    }
                }
            }
            if (!snapshot.classHadTernary) {
                button.classList.remove("ternary-input");
            }
            if (wroteDataValue !== null &&
                button.getAttribute("data-ternary-value") === wroteDataValue) {
                if (snapshot.dataValue === null) {
                    button.removeAttribute("data-ternary-value");
                }
                else {
                    button.setAttribute("data-ternary-value", snapshot.dataValue);
                }
            }
            instances.delete(button);
        }
    };
    instances.set(button, instance);
    return instance;
}

export { setupTernary };
