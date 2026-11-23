import { BUILTIN_ICON_SOURCES } from "./icons";
import {
    DEFAULT_SOURCE_PALETTE,
    SVG_SOURCE_LIMITS,
    allocUniqueToken,
    instantiatePreparedSvg,
    parseSourceColors,
    prepareSvgSource,
    type PreparedSvg,
    type SvgSourcePalette
} from "./svg-palette";

export type TernaryValue = -1 | 0 | 1;
export type TernaryPreset = "checkbox" | "heart" | "numbers";

export interface TernarySvgIcon {
    src: string;
    recolor: true;
}

export interface TernaryStateOptions {
    label?: string;
    icon?: string | TernarySvgIcon;
}

export interface TernaryChangeDetail {
    checked: TernaryValue;
    previousChecked: TernaryValue;
    source: "user" | "api";
}

export interface TernaryIconErrorDetail {
    checked: TernaryValue;
    src: string;
    error: Error;
}

export interface TernaryOptions {
    checked?: TernaryValue;
    preset?: TernaryPreset;
    cycle?: readonly TernaryValue[];
    states?: Partial<Record<TernaryValue, TernaryStateOptions>>;
    fg_color?: string;
    bg_color?: string;
    neutral_fg_color?: string;
    neutral_bg_color?: string;
    positive_fg_color?: string;
    positive_bg_color?: string;
    negative_fg_color?: string;
    negative_bg_color?: string;
    sourceColors?: {
        foreground?: string;
        background?: string;
    };
    name?: string;
    disabled?: boolean;
    onChange?: (event: CustomEvent<TernaryChangeDetail>) => void;
    onIconError?: (event: CustomEvent<TernaryIconErrorDetail>) => void;
}

export interface TernaryInstance {
    readonly button: HTMLButtonElement;
    checked: TernaryValue;
    disabled: boolean;
    setChecked: (value: TernaryValue, options?: { emit?: boolean }) => void;
    reset: () => void;
    destroy: () => void;
}

const VALUES: readonly TernaryValue[] = [-1, 0, 1];
const DEFAULT_CYCLE: readonly TernaryValue[] = [0, 1, -1];
const DEFAULT_LABELS: Record<TernaryValue, string> = {
    [-1]: "Negative",
    [0]: "Neutral",
    [1]: "Positive"
};
const PRESETS: readonly TernaryPreset[] = ["checkbox", "heart", "numbers"];

const COLOR_OPTIONS: ReadonlyArray<readonly [keyof TernaryOptions, string]> = [
    ["fg_color", "--ternary-fg"],
    ["bg_color", "--ternary-bg"],
    ["neutral_fg_color", "--ternary-neutral-fg"],
    ["neutral_bg_color", "--ternary-neutral-bg"],
    ["positive_fg_color", "--ternary-positive-fg"],
    ["positive_bg_color", "--ternary-positive-bg"],
    ["negative_fg_color", "--ternary-negative-fg"],
    ["negative_bg_color", "--ternary-negative-bg"]
];

const instances = new WeakMap<HTMLButtonElement, TernaryInstance>();

function isTernaryValue(value: unknown): value is TernaryValue {
    return value === -1 || value === 0 || value === 1;
}

function fail(message: string): never {
    throw new TypeError(`setupTernary: ${message}`);
}

function balancedParens(v: string): boolean {
    let depth = 0;
    for (const ch of v) {
        if (ch === "(") depth++;
        else if (ch === ")") {
            depth--;
            if (depth < 0) return false;
        }
    }
    return depth === 0;
}

/**
 * Validate a CSS color option value using the document's own CSS engine
 * (CSS.supports when available, else a style probe), with a structural
 * fallback for var()/env() expressions in engines that cannot evaluate them.
 */
function validateCssColorOption(
    doc: Document,
    name: string,
    value: unknown
): string {
    if (typeof value !== "string") {
        fail(`${name} must be a string.`);
    }
    const v = (value as string).trim();
    if (v === "") fail(`${name} must not be empty.`);
    if (/[;{}<>]/.test(v) || v.includes("\\")) {
        fail(`${name} contains unsafe characters.`);
    }
    if (!balancedParens(v)) fail(`${name} has unbalanced parentheses.`);
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
    if (probe.style.color !== "") return v;
    // Engines unable to store var()/env() values: accept well-formed custom
    // property references of a safe shape.
    if (/^(var|env)\(/.test(v) &&
        /^[-_a-zA-Z0-9(),.%+\s#*/]+$/.test(v) &&
        v.indexOf("--") >= 0) {
        return v;
    }
    fail(`${name} is not a valid CSS color: "${v}".`);
}

function hasAccessibleName(button: HTMLButtonElement): boolean {
    const doc = button.ownerDocument;
    if ((button.textContent ?? "").trim() !== "") return true;
    if ((button.getAttribute("aria-label") ?? "").trim() !== "") return true;
    const labelledby = (button.getAttribute("aria-labelledby") ?? "").trim();
    if (labelledby !== "") {
        const resolved = labelledby
            .split(/\s+/)
            .some((id) => (doc.getElementById(id)?.textContent ?? "").trim() !== "");
        if (resolved) return true;
    }
    const labels = (button as HTMLButtonElement & { labels?: NodeList | null }).labels;
    if (labels && labels.length > 0) return true;
    // Fallback for environments without HTMLButtonElement.labels: a wrapping
    // label or an explicit label[for=id] association.
    if (button.closest("label")) return true;
    const id = button.id;
    if (id !== "" &&
        doc.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`)) {
        return true;
    }
    return false;
}

interface IconSpec {
    kind: "img" | "svg" | "invalid";
    /** Absolute URL resolved against ownerDocument.baseURI. */
    url: string;
    /** Rejection reason for kind "invalid". */
    error?: Error;
}

interface StateConfig {
    label: string;
    icon: IconSpec | undefined;
}

const IMG_SCHEMES = new Set(["http:", "https:", "data:", "blob:"]);
const SVG_SCHEMES = new Set(["http:", "https:"]);

function normalizeIconSpec(
    doc: Document,
    value: TernaryValue,
    icon: string | TernarySvgIcon
): IconSpec {
    const raw = typeof icon === "string" ? icon : icon.src;
    let url: URL;
    try {
        url = new URL(raw, doc.baseURI);
    } catch {
        fail(`states[${value}].icon is not a valid URL: "${raw}".`);
    }
    if (typeof icon === "string") {
        if (!IMG_SCHEMES.has(url!.protocol)) {
            return {
                kind: "invalid",
                url: url!.href,
                error: new Error(
                    `Image icons require http(s)/data/blob URLs, got ` +
                    `"${url!.protocol}".`
                )
            };
        }
        return { kind: "img", url: url!.href };
    }
    if (!SVG_SCHEMES.has(url!.protocol)) {
        return {
            kind: "invalid",
            url: url!.href,
            error: new Error(
                `Recolorable SVG icons require http(s) URLs, got ` +
                `"${url!.protocol}".`
            )
        };
    }
    return { kind: "svg", url: url!.href };
}

interface ValidatedOptions {
    checked: TernaryValue;
    preset: TernaryPreset;
    cycle: readonly TernaryValue[];
    states: Record<TernaryValue, StateConfig>;
    colors: ReadonlyArray<readonly [string, string]>;
    sourcePalette: SvgSourcePalette;
    name: string | undefined;
    disabled: boolean | undefined;
    onChange: TernaryOptions["onChange"];
    onIconError: TernaryOptions["onIconError"];
}

function validateOptions(doc: Document, options: TernaryOptions): ValidatedOptions {
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

    const states = {} as Record<TernaryValue, StateConfig>;
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
                fail(
                    `states[${value}].icon must be a URL string or ` +
                    `{ src, recolor: true }.`
                );
            }
            if (isString && icon.trim() === "") {
                fail(`states[${value}].icon URL must not be empty.`);
            }
        }
        states[value] = {
            label,
            icon: icon === undefined
                ? undefined
                : normalizeIconSpec(
                    doc,
                    value,
                    typeof icon === "string" ? icon : { src: icon!.src, recolor: true }
                )
        };
    }

    const colors: Array<readonly [string, string]> = [];
    for (const [key, cssVar] of COLOR_OPTIONS) {
        const raw = options[key];
        if (raw === undefined) continue;
        colors.push([cssVar, validateCssColorOption(doc, key, raw)]);
    }

    const sourcePalette = parseSourceColors(options.sourceColors);

    let name: string | undefined;
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
export function setupTernary(
    button: HTMLButtonElement,
    options: TernaryOptions = {}
): TernaryInstance {
    const existing = instances.get(button);
    if (existing) return existing;

    const view = button?.ownerDocument?.defaultView;
    if (!button || !view || !(button instanceof view.HTMLButtonElement)) {
        fail("button must be a real HTMLButtonElement.");
    }
    if (!button.isConnected) {
        fail("button must be attached to a document.");
    }
    if (!hasAccessibleName(button)) {
        fail(
            "button needs an accessible name: an associated label, inline " +
            "text, aria-label, or resolvable aria-labelledby."
        );
    }

    // Validate everything before mutating author-owned DOM.
    const doc = button.ownerDocument;

    // Validate everything before mutating author-owned DOM: options, icon
    // URLs, and explicit form ownership must all settle up front so a bad
    // configuration can never leave a half-enhanced button behind.
    const config = validateOptions(doc, options);

    const formAttr = button.getAttribute("form");
    let formOwner: HTMLFormElement | null;
    if (formAttr !== null && formAttr.trim() !== "") {
        const candidate = doc.getElementById(formAttr.trim());
        if (!(candidate instanceof view.HTMLFormElement)) {
            throw new TypeError(
                `setupTernary: form attribute references missing form ` +
                `"${formAttr}".`
            );
        }
        formOwner = candidate;
    } else {
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
    let wroteDataValue: string | null = null;
    let wroteDisabled: boolean | null = null;
    const colorSnapshots: Array<readonly [string, string, string]> = [];
    const appliedColors = new Map<string, string>();

    let destroyed = false;
    let current: TernaryValue = config.checked;
    const initialChecked = config.checked;
    let disabledState = button.disabled;
    let iconGeneration = 0;
    const iconControllers = new Set<AbortController>();
    const pendingImages = new Set<HTMLImageElement>();
    const preparedCache = new Map<string, Promise<PreparedSvg>>();
    const preparedFailed = new Set<string>();
    const imageCache = new Map<string, Promise<HTMLImageElement>>();
    const imageReady = new Map<string, HTMLImageElement>();
    const imageFailed = new Set<string>();
    const builtinTemplates = new Map<TernaryValue, PreparedSvg>();
    const iconErrorNotified = new Set<string>();
    const ownedNodes: Node[] = [];

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

    const describedbyTokens = new Set(
        (snapshot.ariaDescribedby ?? "").split(/\s+/).filter((t) => t !== "")
    );
    describedbyTokens.add(description.id);
    button.setAttribute("aria-describedby", [...describedbyTokens].join(" "));

    button.classList.add("ternary-input");
    button.setAttribute("type", "button");

    // --- Optional form participation ---------------------------------------

    let hiddenInput: HTMLInputElement | null = null;
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

    const onFormReset = (event: Event): void => {
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

    const builtinTemplate = (value: TernaryValue): PreparedSvg => {
        let prepared = builtinTemplates.get(value);
        if (!prepared) {
            prepared = prepareSvgSource(
                BUILTIN_ICON_SOURCES[config.preset][value],
                doc,
                DEFAULT_SOURCE_PALETTE
            );
            builtinTemplates.set(value, prepared);
        }
        return prepared;
    };

    const mountBuiltin = (value: TernaryValue): void => {
        const svg = instantiatePreparedSvg(builtinTemplate(value), doc);
        svg.classList.add("ternary-input__svg");
        iconWrap.replaceChildren(svg, stateText);
    };

    const clearMountedIcon = (): void => {
        iconWrap.querySelectorAll(".ternary-input__svg, img")
            .forEach((n) => n.remove());
    };

    const notifyIconError = (
        value: TernaryValue,
        src: string,
        error: Error
    ): void => {
        // Once per failed source, not once per render.
        if (iconErrorNotified.has(src) || destroyed) return;
        iconErrorNotified.add(src);
        const detail: TernaryIconErrorDetail = { checked: value, src, error };
        const event = new view.CustomEvent<TernaryIconErrorDetail>(
            "iconerror",
            { detail, bubbles: true }
        );
        button.dispatchEvent(event);
        if (!destroyed) config.onIconError?.(event);
    };

    const fetchWithLimit = async (
        url: string,
        controller: AbortController
    ): Promise<string> => {
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
        const chunks: Uint8Array[] = [];
        let total = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
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

    const preparedForUrl = (url: string): Promise<PreparedSvg> => {
        let cached = preparedCache.get(url);
        if (!cached) {
            const controller = new AbortController();
            iconControllers.add(controller);
            cached = fetchWithLimit(url, controller)
                .then((source) =>
                    prepareSvgSource(source, doc, config.sourcePalette))
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

    const requestImage = (url: string): Promise<HTMLImageElement> => {
        let cached = imageCache.get(url);
        if (!cached) {
            cached = new Promise<HTMLImageElement>((resolve, reject) => {
                const img = doc.createElement("img");
                img.className = "ternary-input__svg";
                img.alt = "";
                pendingImages.add(img);
                const settle = (): void => {
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

    const renderIcon = (value: TernaryValue): void => {
        const generation = ++iconGeneration;
        const spec = config.states[value].icon;
        clearMountedIcon();
        if (spec === undefined) {
            mountBuiltin(value);
            return;
        }
        mountBuiltin(value); // preset fallback while loading / on failure
        if (spec.kind === "invalid") {
            notifyIconError(value, spec.url, spec.error!);
            return;
        }
        if (spec.kind === "img") {
            const ready = imageReady.get(spec.url);
            if (ready) {
                clearMountedIcon();
                iconWrap.replaceChildren(ready, stateText);
                return;
            }
            if (imageFailed.has(spec.url)) return;
            requestImage(spec.url)
                .then((img) => {
                    if (destroyed || generation !== iconGeneration) return;
                    clearMountedIcon();
                    iconWrap.replaceChildren(img, stateText);
                })
                .catch((error: unknown) => {
                    if (destroyed) return;
                    notifyIconError(
                        value,
                        spec.url,
                        error instanceof Error
                            ? error
                            : new Error(String(error))
                    );
                });
            return;
        }
        // { src, recolor: true }: validated inline SVG with palette mapping.
        if (preparedFailed.has(spec.url)) return;
        preparedForUrl(spec.url)
            .then((prepared) => {
                if (destroyed || generation !== iconGeneration) return;
                const svg = instantiatePreparedSvg(prepared, doc);
                svg.classList.add("ternary-input__svg");
                clearMountedIcon();
                iconWrap.replaceChildren(svg, stateText);
            })
            .catch((error: unknown) => {
                if (destroyed) return;
                notifyIconError(
                    value,
                    spec.url,
                    error instanceof Error ? error : new Error(String(error))
                );
            });
    };

    // --- State application --------------------------------------------------

    const updateDescription = (): void => {
        const label = config.states[current].label;
        const cycleNames = config.cycle
            .map((v) => config.states[v].label)
            .join(", ");
        description.textContent =
            `Current state: ${label}. Activate to cycle: ${cycleNames}.`;
        stateText.textContent = label;
    };

    function applyValue(value: TernaryValue): void {
        current = value;
        wroteDataValue = String(value);
        button.setAttribute("data-ternary-value", wroteDataValue);
        if (hiddenInput) hiddenInput.value = wroteDataValue;
        updateDescription();
        renderIcon(value);
    }

    const emitChange = (
        previous: TernaryValue,
        next: TernaryValue,
        source: "user" | "api"
    ): void => {
        // Freeze the transition detail before external listeners can mutate
        // the instance again. Bail out entirely if the instance is already
        // gone (e.g. an iconerror listener destroyed it mid-transition).
        if (destroyed) return;
        const detail: TernaryChangeDetail = {
            checked: next,
            previousChecked: previous,
            source
        };
        button.dispatchEvent(new view.Event("input", { bubbles: true }));
        if (destroyed) return;
        const change = new view.CustomEvent<TernaryChangeDetail>("change", {
            detail,
            bubbles: true
        });
        button.dispatchEvent(change);
        if (destroyed) return;
        config.onChange?.(change);
    };

    const onClick = (): void => {
        if (button.matches(":disabled")) return;
        const index = config.cycle.indexOf(current);
        const next = config.cycle[(index + 1) % config.cycle.length]!;
        if (next === current) return;
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
        if (hiddenInput) hiddenInput.disabled = config.disabled;
    }
    applyValue(current);

    const assertAlive = (): void => {
        if (destroyed) {
            throw new Error("Ternary instance has been destroyed.");
        }
    };

    const instance: TernaryInstance = {
        button,
        get checked() {
            return current;
        },
        set checked(value: TernaryValue) {
            assertAlive();
            if (!isTernaryValue(value)) {
                throw new TypeError("checked must be the number -1, 0, or 1.");
            }
            if (value === current) return;
            applyValue(value);
        },
        get disabled() {
            return disabledState;
        },
        set disabled(value: boolean) {
            assertAlive();
            const next = Boolean(value);
            disabledState = next;
            wroteDisabled = next;
            button.disabled = next;
            if (hiddenInput) hiddenInput.disabled = next;
        },
        setChecked(value: TernaryValue, setOptions?: { emit?: boolean }) {
            assertAlive();
            if (!isTernaryValue(value)) {
                throw new TypeError("checked must be the number -1, 0, or 1.");
            }
            if (value === current) return;
            const previous = current;
            applyValue(value);
            if (setOptions?.emit) emitChange(previous, value, "api");
        },
        reset() {
            assertAlive();
            if (current === initialChecked) return;
            applyValue(initialChecked);
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            iconGeneration += 1;
            for (const controller of iconControllers) controller.abort();
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
            for (const node of ownedNodes) node.parentNode?.removeChild(node);
            iconWrap.remove();

            // Restore only enhancement-owned changes that authors have not
            // since modified.
            if (button.getAttribute("type") === "button") {
                if (snapshot.type === null) button.removeAttribute("type");
                else button.setAttribute("type", snapshot.type);
            }
            // Remove only the generated description token from the CURRENT
            // token list; original and later author tokens are preserved and
            // deduplicated, author removals are not resurrected.
            const remainingDescribedby = [...new Set(
                (button.getAttribute("aria-describedby") ?? "")
                    .split(/\s+/)
                    .filter((t) => t !== "" && t !== description.id)
            )];
            if (remainingDescribedby.length === 0) {
                button.removeAttribute("aria-describedby");
            } else {
                button.setAttribute(
                    "aria-describedby",
                    remainingDescribedby.join(" ")
                );
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
                    } else {
                        button.style.setProperty(
                            cssVar,
                            prior,
                            priority === "" ? undefined : priority
                        );
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
                } else {
                    button.setAttribute("data-ternary-value", snapshot.dataValue);
                }
            }
            instances.delete(button);
        }
    };

    instances.set(button, instance);
    return instance;
}
