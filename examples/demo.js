import { setupTernary } from "../dist/ternary-input.esm.js";

const $ = (id) => document.getElementById(id);

const attachOutput = (instance, output) => {
    if (!output) return;
    const render = () => { output.value = `checked: ${instance.checked}`; };
    instance.button.addEventListener("change", render);
    render();
};

// Built-in presets.
attachOutput(setupTernary($("preset-checkbox")), document.querySelector('output[for="preset-checkbox"]'));
attachOutput(setupTernary($("preset-heart"), { preset: "heart" }), document.querySelector('output[for="preset-heart"]'));
attachOutput(setupTernary($("preset-numbers"), { preset: "numbers" }), document.querySelector('output[for="preset-numbers"]'));

// Author-owned labeling variants.
setupTernary($("wrapped"), { preset: "heart" });
setupTernary($("inline-text"), { preset: "numbers" });
setupTernary($("aria-only"), { preset: "heart" });

// Custom state names and a nondefault cycle.
setupTernary($("vote"), {
    states: {
        "-1": { label: "Against" },
        "0": { label: "Undecided" },
        "1": { label: "In favour" }
    },
    cycle: [0, -1, 1]
});

// Custom recolorable SVGs (black/white -> palette, purple accent preserved,
// gradient stops and authored opacity survive validation).
setupTernary($("custom-svg"), {
    preset: "numbers",
    states: {
        "-1": { label: "Low", icon: { src: "./icons/negative.svg", recolor: true } },
        "0": { label: "Mid", icon: { src: "./icons/neutral.svg", recolor: true } },
        "1": { label: "High", icon: { src: "./icons/positive.svg", recolor: true } }
    }
});

// Unchanged image URLs: served as ordinary <img>, no recoloring.
setupTernary($("custom-img"), {
    preset: "checkbox",
    states: {
        "0": { label: "Empty", icon: "./icons/neutral.svg" },
        "1": { label: "Sunny", icon: "./icons/positive.svg" },
        "-1": { label: "Droplet", icon: "./icons/negative.svg" }
    }
});

// Shared literal colors only.
setupTernary($("color-shared"), {
    preset: "numbers",
    fg_color: "#0044bb",
    bg_color: "#ffffff"
});

// Shared + independent state foreground overrides (neutral blue/white,
// positive green/white, negative red/white).
setupTernary($("color-mixed"), {
    preset: "numbers",
    fg_color: "#0044bb",
    bg_color: "#ffffff",
    positive_fg_color: "#00aa22",
    negative_fg_color: "#dd2222"
});

// var()-backed options follow the page theme automatically.
setupTernary($("color-vars"), {
    preset: "heart",
    fg_color: "var(--theme-icon-fg)",
    bg_color: "var(--theme-icon-bg)",
    positive_fg_color: "var(--theme-positive)",
    negative_fg_color: "var(--theme-negative)"
});

// Forms.
setupTernary($("form-named"), { checked: 1 });
setupTernary($("form-unnamed"));
setupTernary($("form-fieldset"));
setupTernary($("form-disabled"));
setupTernary($("form-external"));

const showFormData = (form, out) => {
    const data = new FormData(form);
    out.value = [...data.entries()].map(([k, v]) => `${k}=${v}`).join(", ") || "(empty)";
};
$("inspect").addEventListener("click", () => showFormData($("demo-form"), $("formdata-out")));
$("inspect-external").addEventListener("click", () => showFormData($("external-form"), $("external-out")));

// Programmatic control.
const api = setupTernary($("api-demo"), { preset: "numbers" });
api.button.addEventListener("change", (e) => {
    $("api-out").value = `change: ${e.detail.previousChecked} -> ${e.detail.checked} (${e.detail.source})`;
});
$("api-silent").addEventListener("click", () => { api.checked = 1; });
$("api-emit").addEventListener("click", () => api.setChecked(-1, { emit: true }));
$("api-disable").addEventListener("click", () => { api.disabled = !api.disabled; });

// Classic global build initialized once, on its own button.
if (window.TernaryInput) {
    window.TernaryInput.setupTernary($("classic"), { preset: "checkbox" });
}

// Theme switch: updates CSS variables only; no refresh calls.
$("theme-toggle").addEventListener("click", () => {
    document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
});
