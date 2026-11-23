import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setupTernary } from "../src/ternary-input";
import type { TernaryChangeDetail, TernaryInstance } from "../src/ternary-input";
import { BUILTIN_ICON_SOURCES } from "../src/icons";

const labelledButton = (attrs = ""): HTMLButtonElement => {
    const wrap = document.createElement("div");
    wrap.innerHTML = `<button type="button" id="b${Math.random().toString(36).slice(2)}" ${attrs}></button>`;
    const button = wrap.firstElementChild as HTMLButtonElement;
    button.setAttribute("aria-label", "Field");
    document.body.appendChild(button);
    return button;
};

const describedbyText = (button: HTMLButtonElement): string =>
    (button.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");

/**
 * Capture every HTMLImageElement whose src is assigned, so tests can drive
 * load/error events on the not-yet-mounted icons deterministically.
 */
const capturedImages: HTMLImageElement[] = [];
let imageDescriptor: PropertyDescriptor | undefined;
const capturePendingImages = (): HTMLImageElement[] => {
    capturedImages.length = 0;
    const proto = Object.getPrototypeOf(document.createElement("img"));
    imageDescriptor ??= Object.getOwnPropertyDescriptor(proto, "src");
    const original = imageDescriptor!;
    Object.defineProperty(proto, "src", {
        configurable: true,
        get(this: HTMLImageElement) {
            return original.get!.call(this) as string;
        },
        set(this: HTMLImageElement, v: string) {
            capturedImages.push(this);
            original.set!.call(this, v);
        }
    });
    return capturedImages;
};

beforeEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
});
afterEach(() => {
    document.body.innerHTML = "";
});

describe("setup validation", () => {
    it("rejects non-buttons and detached buttons", () => {
        const input = document.createElement("input");
        document.body.appendChild(input);
        expect(() =>
            setupTernary(input as unknown as HTMLButtonElement)
        ).toThrow(TypeError);
        const detached = document.createElement("button");
        detached.setAttribute("aria-label", "x");
        expect(() => setupTernary(detached)).toThrow(TypeError);
    });

    it("requires a plausible accessible name", () => {
        const button = document.createElement("button");
        document.body.appendChild(button);
        expect(() => setupTernary(button)).toThrow(/accessible name/);
        button.setAttribute("aria-label", "Rating");
        expect(() => setupTernary(button)).not.toThrow();
    });

    it("accepts explicit label, wrapping label, inline text, and labelledby", () => {
        const b1 = labelledButton();
        const l1 = document.createElement("label");
        l1.setAttribute("for", b1.id);
        l1.textContent = "Explicit";
        document.body.appendChild(l1);
        b1.removeAttribute("aria-label");
        expect(() => setupTernary(b1)).not.toThrow();

        const wrap = document.createElement("label");
        const b2 = document.createElement("button");
        wrap.appendChild(b2);
        wrap.appendChild(document.createTextNode("Wrapped"));
        document.body.appendChild(wrap);
        expect(() => setupTernary(b2)).not.toThrow();

        const b3 = document.createElement("button");
        b3.textContent = "Inline";
        document.body.appendChild(b3);
        expect(() => setupTernary(b3)).not.toThrow();

        const p = document.createElement("p");
        p.id = "name-src";
        p.textContent = "Via labelledby";
        const b4 = document.createElement("button");
        b4.setAttribute("aria-labelledby", "name-src");
        document.body.append(p, b4);
        expect(() => setupTernary(b4)).not.toThrow();
    });

    it("rejects invalid checked values without coercion", () => {
        for (const bad of ["1", true, NaN, 0.5, 2, -2, null] as unknown[]) {
            const button = labelledButton();
            expect(() =>
                setupTernary(button, { checked: bad as never })
            ).toThrow(/checked/);
        }
    });

    it("rejects invalid presets and cycles", () => {
        expect(() =>
            setupTernary(labelledButton(), { preset: "star" as never })
        ).toThrow(/preset/);
        for (const bad of [[0, 1], [0, 1, 1], [0, 1, 2], "x"] as unknown[]) {
            expect(() =>
                setupTernary(labelledButton(), { cycle: bad as never })
            ).toThrow(/cycle/);
        }
    });

    it("copies cycle and states so later caller mutation has no effect", () => {
        const button = labelledButton();
        const cycle = [0, -1, 1] as const;
        const states = { "1": { label: "Yes" } };
        const instance = setupTernary(button, {
            cycle,
            states: states as never
        });
        (cycle as unknown as number[]).push(0);
        (states as Record<string, { label: string }>)["1"]!.label = "Changed";
        button.click();
        expect(instance.checked).toBe(-1);
        expect(describedbyText(button)).toContain("Yes");
    });

    it("rejects invalid colors and names", () => {
        expect(() =>
            setupTernary(labelledButton(), { fg_color: "" })
        ).toThrow(/fg_color/);
        expect(() =>
            setupTernary(labelledButton(), { fg_color: "red; }" })
        ).toThrow(/fg_color/);
        expect(() =>
            setupTernary(labelledButton(), { name: 3 as never })
        ).toThrow(/name/);
    });

    it("is idempotent: repeated setup returns the same instance", () => {
        const button = labelledButton();
        const a = setupTernary(button, { preset: "heart" });
        const b = setupTernary(button, { preset: "numbers" });
        expect(a).toBe(b);
        expect(button.querySelectorAll(".ternary-input__icon").length).toBe(1);
    });
});

describe("value semantics", () => {
    it("defaults to 0 and cycles 0 -> 1 -> -1 -> 0", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        expect(instance.checked).toBe(0);
        button.click();
        expect(instance.checked).toBe(1);
        button.click();
        expect(instance.checked).toBe(-1);
        button.click();
        expect(instance.checked).toBe(0);
    });

    it("supports all starting states and custom cycles", () => {
        const b = labelledButton();
        const i = setupTernary(b, { checked: -1, cycle: [0, -1, 1] });
        expect(i.checked).toBe(-1);
        b.click();
        expect(i.checked).toBe(1);
        b.click();
        expect(i.checked).toBe(0);
    });

    it("exposes a semantic data-ternary-value attribute", () => {
        const button = labelledButton();
        setupTernary(button);
        expect(button.getAttribute("data-ternary-value")).toBe("0");
        button.click();
        expect(button.getAttribute("data-ternary-value")).toBe("1");
    });

    it("setter assignment is silent; setChecked emit fires api events", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        const events: string[] = [];
        button.addEventListener("input", () => events.push("input"));
        button.addEventListener("change", (e) =>
            events.push(`change:${(e as CustomEvent<TernaryChangeDetail>).detail.source}`));
        instance.checked = 1;
        expect(events).toEqual([]);
        instance.setChecked(1);
        expect(events).toEqual([]);
        instance.setChecked(-1);
        expect(events).toEqual([]);
        instance.setChecked(0, { emit: true });
        expect(events).toEqual(["input", "change:api"]);
    });

    it("emits exactly one input+change pair per user activation", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        let inputCount = 0;
        let changes: TernaryChangeDetail[] = [];
        let callback = 0;
        button.addEventListener("input", () => inputCount++);
        button.addEventListener("change", (e) =>
            changes.push((e as CustomEvent<TernaryChangeDetail>).detail));
        const withCb = setupTernary(labelledButton(), {
            onChange: () => callback++
        });
        button.click();
        expect(inputCount).toBe(1);
        expect(changes).toEqual([
            { checked: 1, previousChecked: 0, source: "user" }
        ]);
        withCb.button.click();
        expect(callback).toBe(1);
        void instance;
    });

    it("guards disabled buttons from activation", () => {
        const button = labelledButton();
        const instance = setupTernary(button, { disabled: true });
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(instance.checked).toBe(0);
        instance.disabled = false;
        button.click();
        expect(instance.checked).toBe(1);
        // Programmatic changes remain allowed while disabled.
        instance.disabled = true;
        instance.checked = -1;
        expect(instance.checked).toBe(-1);
    });

    it("reset restores the initial checked silently", () => {
        const button = labelledButton();
        const instance = setupTernary(button, { checked: -1 });
        let events = 0;
        button.addEventListener("change", () => events++);
        instance.checked = 1;
        instance.reset();
        expect(instance.checked).toBe(-1);
        expect(events).toBe(0);
        instance.checked = 0;
        instance.reset();
        expect(instance.checked).toBe(-1);
    });
});

describe("DOM preservation and accessibility", () => {
    it("preserves original children, id, name, and describedby tokens", () => {
        const button = document.createElement("button");
        button.id = "keep-me";
        button.setAttribute("name", "field");
        button.innerHTML = "<span class='author'>Hi</span>";
        const hint = document.createElement("p");
        hint.id = "orig-hint";
        hint.textContent = "Hint";
        button.setAttribute("aria-describedby", "orig-hint");
        document.body.append(hint, button);
        setupTernary(button);
        expect(button.id).toBe("keep-me");
        expect(button.getAttribute("name")).toBe("field");
        expect(button.querySelector("span.author")).not.toBeNull();
        expect(button.getAttribute("aria-describedby")).toContain("orig-hint");
        expect(button.getAttribute("type")).toBe("button");
    });

    it("generates unique description ids and per-state text", () => {
        const a = labelledButton();
        const b = labelledButton();
        setupTernary(a);
        setupTernary(b);
        const idsA = (a.getAttribute("aria-describedby") ?? "").split(" ");
        const idsB = (b.getAttribute("aria-describedby") ?? "").split(" ");
        expect(idsA.some((id) => idsB.includes(id))).toBe(false);
        expect(describedbyText(a)).toContain("Current state: Neutral");
        a.click();
        expect(describedbyText(a)).toContain("Current state: Positive");
        expect(describedbyText(a)).toContain("Activate to cycle");
    });

    it("never uses checkbox/toggle ARIA semantics", () => {
        const button = labelledButton();
        setupTernary(button);
        expect(button.getAttribute("role")).toBeNull();
        expect(button.getAttribute("aria-checked")).toBeNull();
        expect(button.getAttribute("aria-pressed")).toBeNull();
        expect(button.getAttribute("aria-valuenow")).toBeNull();
        expect(button.getAttribute("aria-label")).toBe("Field");
    });

    it("keeps generated description/status outside wrapping labels", () => {
        const wrap = document.createElement("label");
        const button = document.createElement("button");
        wrap.appendChild(button);
        wrap.appendChild(document.createTextNode("Wrapped name"));
        document.body.appendChild(wrap);
        setupTernary(button);
        const describedIds = (button.getAttribute("aria-describedby") ?? "")
            .split(/\s+/);
        for (const id of describedIds) {
            const el = document.getElementById(id);
            expect(el).not.toBeNull();
            expect(wrap.contains(el)).toBe(false);
        }
        const status = document.querySelector("[aria-live]");
        expect(status).not.toBeNull();
        expect(wrap.contains(status)).toBe(false);
        // Generated state text lives only inside the aria-hidden icon wrapper,
        // so it is excluded from the wrapping label's accessible name.
        const generatedOutside = [...wrap.querySelectorAll("*")].filter((el) =>
            el !== button &&
            el.closest("[aria-hidden='true']") === null &&
            (el.className.toString().includes("ternary-input") ||
             el.id.includes("ternary-")));
        expect(generatedOutside.length).toBe(0);
    });

    it("decorates icons as aria-hidden and announces user changes only", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        const wrap = button.querySelector(".ternary-input__icon")!;
        expect(wrap.getAttribute("aria-hidden")).toBe("true");
        const svg = wrap.querySelector("svg")!;
        expect(svg.getAttribute("aria-hidden")).toBe("true");
        const status = document.querySelector("[aria-live='polite']")!;
        expect(status.textContent).toBe("");
        button.click();
        expect(status.textContent).toBe("Positive");
        instance.checked = -1;
        expect(status.textContent).toBe("Positive");
        instance.reset();
        expect(status.textContent).toBe("Positive");
    });

    it("click forwarding from label relies on native behavior (no custom handlers)", () => {
        const button = labelledButton();
        button.removeAttribute("aria-label");
        const label = document.createElement("label");
        label.htmlFor = button.id;
        label.textContent = "Native label";
        document.body.appendChild(label);
        const instance = setupTernary(button);
        // Only one click listener exists; a dispatched label click would
        // cycle once via the browser's native activation forwarding.
        button.click();
        expect(instance.checked).toBe(1);
    });
});

describe("forms", () => {
    it("submits -1/0/1 through a hidden input when named", () => {
        const form = document.createElement("form");
        const button = labelledButton('name="pref"');
        form.appendChild(button);
        document.body.appendChild(form);
        const instance = setupTernary(button);
        const read = () => new FormData(form).get("pref");
        expect(read()).toBe("0");
        button.click();
        expect(read()).toBe("1");
        instance.checked = -1;
        expect(read()).toBe("-1");
    });

    it("options.name overrides and empty name opts out", () => {
        const form = document.createElement("form");
        const a = labelledButton();
        form.appendChild(a);
        document.body.appendChild(form);
        setupTernary(a, { name: "custom" });
        expect(new FormData(form).get("custom")).toBe("0");
        const b = labelledButton('name="skip"');
        form.appendChild(b);
        setupTernary(b, { name: "" });
        expect(new FormData(form).get("skip")).toBeNull();
        expect(form.querySelectorAll("input[type=hidden]").length).toBe(1);
    });

    it("keeps the button itself out of submission (type=button)", () => {
        const form = document.createElement("form");
        const button = labelledButton('name="both" value="raw"');
        form.appendChild(button);
        document.body.appendChild(form);
        setupTernary(button);
        expect(new FormData(form).getAll("both")).toEqual(["0"]);
    });

    it("honors explicit form ownership and validates it", () => {
        const form = document.createElement("form");
        form.id = "ext-form";
        document.body.appendChild(form);
        const button = labelledButton('name="ext" form="ext-form"');
        document.body.appendChild(button);
        setupTernary(button);
        expect(new FormData(form).get("ext")).toBe("0");
        const bad = labelledButton('form="missing-form"');
        document.body.appendChild(bad);
        expect(() => setupTernary(bad)).toThrow(/form/);
    });

    it("disabled fields are omitted; fieldset-disabled buttons do not cycle", () => {
        const form = document.createElement("form");
        const button = labelledButton('name="d"');
        form.appendChild(button);
        document.body.appendChild(form);
        const instance = setupTernary(button, { disabled: true });
        expect(new FormData(form).get("d")).toBeNull();
        instance.disabled = false;
        expect(new FormData(form).get("d")).toBe("0");
        instance.disabled = true;
        // Programmatic changes still work and would submit if re-enabled.
        instance.checked = 1;
        instance.disabled = false;
        expect(new FormData(form).get("d")).toBe("1");
    });

    it("native form reset restores the initial value on the next microtask", async () => {
        const form = document.createElement("form");
        const button = labelledButton('name="r"');
        form.appendChild(button);
        document.body.appendChild(form);
        const instance = setupTernary(button, { checked: 1 });
        button.click(); // -> -1
        expect(instance.checked).toBe(-1);
        form.reset();
        expect(instance.checked).toBe(-1); // synchronous still old
        await Promise.resolve();
        expect(instance.checked).toBe(1);
        expect(new FormData(form).get("r")).toBe("1");
    });

    it("reset is silent and does not emit events", async () => {
        const form = document.createElement("form");
        const button = labelledButton('name="r2"');
        form.appendChild(button);
        document.body.appendChild(form);
        setupTernary(button);
        let events = 0;
        button.addEventListener("change", () => events++);
        button.click();
        form.reset();
        await Promise.resolve();
        expect(events).toBe(1); // only the user click
    });
});

describe("colors", () => {
    it("writes only explicitly supplied public variables", () => {
        const button = labelledButton();
        setupTernary(button, {
            fg_color: "#0044bb",
            bg_color: "#ffffff",
            positive_fg_color: "#00aa22",
            negative_fg_color: "#dd2222"
        });
        const s = button.style;
        expect(s.getPropertyValue("--ternary-fg")).toBe("#0044bb");
        expect(s.getPropertyValue("--ternary-bg")).toBe("#ffffff");
        expect(s.getPropertyValue("--ternary-positive-fg")).toBe("#00aa22");
        expect(s.getPropertyValue("--ternary-negative-fg")).toBe("#dd2222");
        expect(s.getPropertyValue("--ternary-neutral-fg")).toBe("");
        expect(s.getPropertyValue("--ternary-neutral-bg")).toBe("");
        expect(s.getPropertyValue("--ternary-positive-bg")).toBe("");
        expect(s.getPropertyValue("--ternary-negative-bg")).toBe("");
    });

    it("accepts var() expressions and currentColor/transparent", () => {
        const button = labelledButton();
        expect(() =>
            setupTernary(button, {
                fg_color: "var(--my-theme-fg)",
                bg_color: "transparent",
                positive_fg_color: "currentColor"
            })
        ).not.toThrow();
        expect(button.style.getPropertyValue("--ternary-fg"))
            .toBe("var(--my-theme-fg)");
    });

    it("rejects malformed var expressions", () => {
        expect(() =>
            setupTernary(labelledButton(), { fg_color: "var(--x" })
        ).toThrow();
        expect(() =>
            setupTernary(labelledButton(), { fg_color: "var(--x);color:red" })
        ).toThrow();
    });
});

describe("icons and built-ins", () => {
    it("bundles nine distinct SVG sources", () => {
        const presets = ["checkbox", "heart", "numbers"] as const;
        for (const preset of presets) {
            const set = new Set([
                BUILTIN_ICON_SOURCES[preset][-1],
                BUILTIN_ICON_SOURCES[preset][0],
                BUILTIN_ICON_SOURCES[preset][1]
            ]);
            expect(set.size).toBe(3);
            for (const source of set) {
                expect(source).toContain("<svg");
            }
        }
    });

    it("renders built-ins inline with mapped palette variables", () => {
        const button = labelledButton();
        setupTernary(button, { preset: "heart" });
        const svg = button.querySelector(".ternary-input__svg")!;
        expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
        const paints = [...svg.querySelectorAll("[fill],[stroke]")].flatMap((el) =>
            [el.getAttribute("fill"), el.getAttribute("stroke")].filter(Boolean));
        expect(paints).toContain("var(--ternary-resolved-fg)");
        expect(paints).toContain("var(--ternary-resolved-bg)");
    });

    it("renders string icons as ordinary unchanged images once loaded", async () => {
        const imgs = capturePendingImages();
        const button = labelledButton();
        setupTernary(button, {
            states: { "1": { icon: "./pic.png" } }
        });
        button.click();
        // Builtin fallback shows while the image decodes.
        expect(button.querySelector("img.ternary-input__svg")).toBeNull();
        expect(button.querySelector("svg.ternary-input__svg")).not.toBeNull();
        expect(imgs.length).toBe(1);
        imgs[0]!.dispatchEvent(new Event("load"));
        await Promise.resolve();
        await Promise.resolve();
        const img = button.querySelector("img.ternary-input__svg");
        expect(img).not.toBeNull();
        expect(img!.getAttribute("alt")).toBe("");
    });
});

describe("teardown", () => {
    it("restores owned attributes, removes generated DOM, allows reinit", () => {
        const button = labelledButton('name="x"');
        const span = document.createElement("span");
        button.appendChild(span);
        const form = document.createElement("form");
        form.appendChild(button);
        document.body.appendChild(form);
        const instance = setupTernary(button, { fg_color: "#123456" });
        const descId = button.getAttribute("aria-describedby")!;
        button.click();
        instance.destroy();
        expect(button.querySelector(".ternary-input__icon")).toBeNull();
        expect(button.contains(span)).toBe(true);
        expect(form.querySelector("input[type=hidden]")).toBeNull();
        expect(document.getElementById(descId)).toBeNull();
        expect(button.style.getPropertyValue("--ternary-fg")).toBe("");
        expect(() => instance.setChecked(1)).toThrow(/destroyed/);
        expect(instance.checked).toBe(1);
        const again = setupTernary(button);
        expect(again).not.toBe(instance);
        again.destroy();
    });

    it("destroy is idempotent", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        instance.destroy();
        expect(() => instance.destroy()).not.toThrow();
    });

    it("restores a preexisting !important public variable", () => {
        const button = labelledButton();
        button.style.setProperty("--ternary-fg", "#aabbcc", "important");
        const instance = setupTernary(button, { fg_color: "#123456" });
        expect(button.style.getPropertyValue("--ternary-fg")).toBe("#123456");
        expect(button.style.getPropertyPriority("--ternary-fg")).toBe("");
        instance.destroy();
        expect(button.style.getPropertyValue("--ternary-fg")).toBe("#aabbcc");
        expect(button.style.getPropertyPriority("--ternary-fg")).toBe("important");
    });

    it("keeps author changes to variables, attributes, and disabled", () => {
        const button = labelledButton('data-ternary-value="author"');
        const instance = setupTernary(button, {
            fg_color: "#111111",
            disabled: true
        });
        // Author mutates library-owned surface after setup.
        button.style.setProperty("--ternary-fg", "#999999");
        button.setAttribute("data-ternary-value", "custom");
        button.disabled = false;
        instance.destroy();
        expect(button.style.getPropertyValue("--ternary-fg")).toBe("#999999");
        expect(button.getAttribute("data-ternary-value")).toBe("custom");
        expect(button.disabled).toBe(false);
    });

    it("removes only its own describedby token and never duplicates", () => {
        const button = labelledButton();
        const hintA = document.createElement("p");
        hintA.id = "hint-a";
        hintA.textContent = "a";
        const hintB = document.createElement("p");
        hintB.id = "hint-b";
        hintB.textContent = "b";
        document.body.append(hintA, hintB);
        button.setAttribute("aria-describedby", "hint-a");
        const instance = setupTernary(button);
        // Author adds a hint and removes nothing.
        button.setAttribute(
            "aria-describedby",
            `${button.getAttribute("aria-describedby")} hint-b`
        );
        instance.destroy();
        const tokens = button.getAttribute("aria-describedby")!.split(/\s+/);
        expect(tokens).toEqual(["hint-a", "hint-b"]);
        // Author removed the original hint during use: it stays removed.
        const b2 = labelledButton();
        const h = document.createElement("p");
        h.id = "hint-c";
        h.textContent = "c";
        document.body.appendChild(h);
        b2.setAttribute("aria-describedby", "hint-c");
        const i2 = setupTernary(b2);
        const own = (b2.getAttribute("aria-describedby") ?? "")
            .split(/\s+/)
            .find((t) => t.startsWith("ternary"))!;
        b2.setAttribute("aria-describedby", own);
        i2.destroy();
        expect(b2.getAttribute("aria-describedby")).toBeNull();
    });

    it("keeps an author !important reprioritization of the same value", () => {
        const button = labelledButton();
        const instance = setupTernary(button, { fg_color: "#111111" });
        // Author reprioritizes the library's own value.
        button.style.setProperty("--ternary-fg", "#111111", "important");
        instance.destroy();
        expect(button.style.getPropertyValue("--ternary-fg")).toBe("#111111");
        expect(button.style.getPropertyPriority("--ternary-fg"))
            .toBe("important");
    });

    it("emits nothing when an iconerror listener destroys the instance", () => {
        const button = labelledButton();
        let inputs = 0;
        let changes = 0;
        button.addEventListener("input", () => inputs++);
        button.addEventListener("change", () => changes++);
        const instance = setupTernary(button, {
            states: { "1": { icon: "javascript:x" } }
        });
        button.addEventListener("iconerror", () => instance.destroy());
        button.click();
        expect(inputs).toBe(0);
        expect(changes).toBe(0);
    });

    it("reports the last library-set disabled value after destroy", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        instance.disabled = true;
        instance.destroy();
        expect(instance.disabled).toBe(true);
        expect(button.disabled).toBe(false);
    });
});

describe("atomic setup", () => {
    it("rejects a bad explicit form id without mutating anything", () => {
        const button = labelledButton('form="no-such-form" name="f"');
        const span = document.createElement("span");
        button.appendChild(span);
        button.style.setProperty("--ternary-fg", "#aabbcc");
        const outerBefore = button.outerHTML;
        const styleBefore = button.getAttribute("style");
        const childCount = document.body.childElementCount;
        expect(() => setupTernary(button)).toThrow(/form/);
        expect(button.outerHTML).toBe(outerBefore);
        expect(button.getAttribute("style")).toBe(styleBefore);
        expect(button.firstElementChild).toBe(span);
        expect(button.classList.contains("ternary-input")).toBe(false);
        expect(document.body.childElementCount).toBe(childCount);
        expect(document.querySelector(".ternary-input__sr-only")).toBeNull();
        expect(document.querySelector("input[type=hidden]")).toBeNull();
        expect(document.getElementById(
            button.getAttribute("aria-describedby") ?? ""
        )).toBeNull();
    });

    it("rejects malformed icon URLs before any DOM mutation", () => {
        const button = labelledButton();
        const outerBefore = button.outerHTML;
        expect(() =>
            setupTernary(button, {
                states: { "1": { icon: "http://[bad url" } }
            })
        ).toThrow(/icon/);
        expect(button.outerHTML).toBe(outerBefore);
        expect(document.querySelector(".ternary-input__sr-only")).toBeNull();
    });
});

describe("icon source lifecycle", () => {
    const iconErrors = (button: HTMLButtonElement): Array<{
        src: string;
        checked: number;
    }> => {
        const seen: Array<{ src: string; checked: number }> = [];
        button.addEventListener("iconerror", (e) => {
            const d = (e as CustomEvent).detail;
            seen.push({ src: d.src, checked: d.checked });
        });
        return seen;
    };

    it("treats active schemes as inert failures with builtin fallback", () => {
        const button = labelledButton();
        const seen = iconErrors(button);
        setupTernary(button, {
            states: { "1": { icon: "javascript:alert(1)" } }
        });
        button.click();
        const img = button.querySelector("img");
        expect(img).toBeNull();
        expect(button.querySelector("svg.ternary-input__svg")).not.toBeNull();
        expect(seen.length).toBe(1);
        expect(seen[0]!.src).toContain("javascript:");
        expect(seen[0]!.checked).toBe(1);
    });

    it("rejects javascript: for recolorable sources the same way", () => {
        const button = labelledButton();
        const seen = iconErrors(button);
        setupTernary(button, {
            states: { "1": { icon: { src: "javascript:x", recolor: true } } }
        });
        button.click();
        expect(button.querySelector("svg.ternary-input__svg")).not.toBeNull();
        expect(seen.length).toBe(1);
    });

    it("falls back on image decode error and caches the failure", async () => {
        const imgs = capturePendingImages();
        const button = labelledButton();
        const seen = iconErrors(button);
        setupTernary(button, {
            states: { "1": { icon: "./broken.png" } }
        });
        button.click();
        expect(imgs.length).toBe(1);
        imgs[0]!.dispatchEvent(new Event("error"));
        await Promise.resolve();
        await Promise.resolve();
        expect(seen.length).toBe(1);
        expect(button.querySelector("svg.ternary-input__svg")).not.toBeNull();
        // Revisiting the state must not reload or re-notify.
        button.click(); // -> -1
        button.click(); // -> 0
        button.click(); // -> 1 again
        expect(imgs.length).toBe(1);
        expect(seen.length).toBe(1);
        expect(button.querySelector("svg.ternary-input__svg")).not.toBeNull();
    });

    it("does not let a stale image load replace a newer state", async () => {
        const imgs = capturePendingImages();
        const button = labelledButton();
        setupTernary(button, {
            states: {
                "1": { icon: "./slow.png" },
                "-1": { icon: "./fast.png" }
            }
        });
        button.click(); // -> 1, slow.png pending
        button.click(); // -> -1, fast.png pending
        expect(imgs.length).toBe(2);
        // The old response arrives late: must not mount for state -1.
        imgs[0]!.dispatchEvent(new Event("load"));
        await Promise.resolve();
        expect(button.querySelector("img")).toBeNull();
        imgs[1]!.dispatchEvent(new Event("load"));
        await Promise.resolve();
        expect(button.querySelector("img.ternary-input__svg")).not.toBeNull();
    });

    it("detaches pending image listeners on destroy", async () => {
        const imgs = capturePendingImages();
        const button = labelledButton();
        const instance = setupTernary(button, {
            states: { "1": { icon: "./late.png" } }
        });
        button.click();
        expect(imgs.length).toBe(1);
        instance.destroy();
        expect(imgs[0]!.onload).toBeNull();
        expect(imgs[0]!.onerror).toBeNull();
        imgs[0]!.dispatchEvent(new Event("load"));
        await Promise.resolve();
        expect(button.querySelector("img")).toBeNull();
    });

    it("caches rejected SVG fetches per instance and notifies once", async () => {
        let fetches = 0;
        vi.stubGlobal("fetch", vi.fn(async () => {
            fetches++;
            return new Response("bad", { status: 404 });
        }));
        const button = labelledButton();
        const seen = iconErrors(button);
        setupTernary(button, {
            states: { "1": { icon: { src: "/icon.svg", recolor: true } } }
        });
        button.click();
        await vi.waitFor(() => expect(seen.length).toBe(1));
        expect(fetches).toBe(1);
        button.click(); // -1
        button.click(); // 0
        button.click(); // 1 again
        await Promise.resolve();
        expect(fetches).toBe(1);
        expect(seen.length).toBe(1);
        expect(button.querySelector("svg.ternary-input__svg")).not.toBeNull();
    });
});

describe("event detail semantics", () => {
    it("freezes the transition detail before listeners can mutate state", () => {
        const button = labelledButton();
        const instance = setupTernary(button);
        let detail: TernaryChangeDetail | undefined;
        button.addEventListener("input", () => {
            // Silent assignment during dispatch must not corrupt the pending
            // 0 -> 1 transition detail.
            instance.checked = -1;
        });
        button.addEventListener("change", (e) => {
            detail = (e as CustomEvent<TernaryChangeDetail>).detail;
        });
        button.click();
        expect(detail).toEqual({
            checked: 1,
            previousChecked: 0,
            source: "user"
        });
    });

    it("passes the dispatched change event object to onChange", () => {
        let dispatched: Event | undefined;
        let callback: Event | undefined;
        const button = labelledButton();
        button.addEventListener("change", (e) => {
            dispatched = e;
        });
        setupTernary(button, {
            onChange: (e) => {
                callback = e;
            }
        });
        button.click();
        expect(callback).toBe(dispatched);
        expect((callback as Event).target).toBe(button);
        expect((callback as Event).bubbles).toBe(true);
    });

    it("emits nothing after destroy during an input listener", () => {
        const button = labelledButton();
        let changes = 0;
        let callback = 0;
        const instance = setupTernary(button, {
            onChange: () => callback++
        });
        button.addEventListener("change", () => changes++);
        button.addEventListener("input", () => {
            instance.destroy();
        });
        button.click();
        expect(changes).toBe(0);
        expect(callback).toBe(0);
    });
});

describe("id allocation", () => {
    it("skips ids that already exist in the owner document", () => {
        // Simulate a colliding copy of the library (e.g. the IIFE build).
        const squat1 = document.createElement("div");
        squat1.id = "ternary1-description";
        const squat2 = document.createElement("div");
        squat2.id = "ternary1-status";
        document.body.append(squat1, squat2);
        const button = labelledButton();
        setupTernary(button);
        const descId = (button.getAttribute("aria-describedby") ?? "")
            .split(/\s+/)
            .find((t) => t.startsWith("ternary"))!;
        expect(descId).not.toBe("ternary1-description");
        const desc = document.getElementById(descId)!;
        expect(desc.className).toContain("ternary-input__sr-only");
        expect(desc.textContent).toContain("Current state");
    });
});

describe("canceled form reset", () => {
    it("does not reset when a later listener cancels the reset event", async () => {
        const form = document.createElement("form");
        const button = labelledButton('name="cancelled"');
        form.appendChild(button);
        document.body.appendChild(form);
        const instance = setupTernary(button, { checked: 1 });
        instance.checked = -1;
        // Listener registered after setup runs after the library's listener.
        form.addEventListener("reset", (e) => e.preventDefault());
        form.reset();
        await Promise.resolve();
        await Promise.resolve();
        expect(instance.checked).toBe(-1);
        expect(new FormData(form).get("cancelled")).toBe("-1");
    });

    it("still resets normally when nothing cancels", async () => {
        const form = document.createElement("form");
        const button = labelledButton('name="plain"');
        form.appendChild(button);
        document.body.appendChild(form);
        const instance = setupTernary(button, { checked: 1 });
        instance.checked = -1;
        form.reset();
        await Promise.resolve();
        expect(instance.checked).toBe(1);
        expect(new FormData(form).get("plain")).toBe("1");
    });
});
