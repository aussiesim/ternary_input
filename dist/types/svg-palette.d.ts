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
export declare const SVG_NS = "http://www.w3.org/2000/svg";
export declare const SVG_SOURCE_LIMITS: {
    readonly maxSourceBytes: number;
    readonly maxElements: 2048;
    readonly maxDepth: 32;
    readonly maxUseNesting: 8;
    readonly maxExpandedNodes: 4096;
};
export interface SvgSourcePalette {
    /** Normalized "#rrggbb" source paint treated as the icon foreground. */
    foreground: string;
    /** Normalized "#rrggbb" source paint treated as the icon background. */
    background: string;
}
export declare const DEFAULT_SOURCE_PALETTE: SvgSourcePalette;
export interface PreparedSvg {
    /** Detached template; clone per mount via instantiatePreparedSvg. */
    template: SVGSVGElement;
    /** Authored ids needing per-mount namespacing. */
    ids: readonly string[];
}
export declare class SvgPaletteError extends Error {
    constructor(message: string);
}
/** Normalize an opaque sRGB color to "#rrggbb", or return null. */
export declare function normalizeOpaqueColor(value: string): string | null;
/** Parse and validate the public sourceColors option. */
export declare function parseSourceColors(input?: {
    foreground?: string;
    background?: string;
}): SvgSourcePalette;
/**
 * Parse, validate, and rebuild an SVG source string into a detached template
 * element. Returns ids so each mounted clone can namespace them. Throws
 * SvgPaletteError on any unsupported or unsafe content.
 */
export declare function prepareSvgSource(source: string, doc: Document, palette?: SvgSourcePalette): PreparedSvg;
/**
 * Allocate an id/prefix that is provably unused in the ownerDocument, looping
 * past collisions so simultaneous copies of this module (e.g. an IIFE build
 * and an ESM build on one page) can never mint the same identifiers.
 */
export declare function allocUniqueToken(doc: Document, stem: string, extraIds?: readonly string[]): string;
/**
 * Clone a prepared template for mounting, rewriting every authored id and
 * local reference into a fresh per-mount namespace so cloned icons can never
 * collide with each other or the host document.
 */
export declare function instantiatePreparedSvg(prepared: PreparedSvg, doc: Document): SVGSVGElement;
