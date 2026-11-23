import { setupTernary } from "/dist/ternary-input.esm.min.js";

const $ = (id) => document.getElementById(id);
const t = {};
window.__t = t;
window.__iconerrors = [];
window.__changes = [];
window.__submits = 0;
for (const form of document.querySelectorAll("form")) {
    form.addEventListener("submit", () => { window.__submits++; });
}

const track = (instance) => {
    instance.button.addEventListener("change", (e) =>
        window.__changes.push({ id: instance.button.id, ...e.detail }));
    instance.button.addEventListener("iconerror", (e) =>
        window.__iconerrors.push({ id: instance.button.id, src: e.detail.src }));
    return instance;
};

// IIFE global path exercised on b1; ESM path on the rest.
t.b1 = track(window.TernaryInput.setupTernary($("b1"), { preset: "numbers" }));
t.b2 = track(setupTernary($("b2"), { preset: "heart" }));
t.b3 = track(setupTernary($("b3")));
t.b4 = track(setupTernary($("b4"), { preset: "heart" }));
t.b5 = track(setupTernary($("b5"), { checked: 1 }));
t.b6 = track(setupTernary($("b6")));
t.b7 = track(setupTernary($("b7")));
t.b8 = track(setupTernary($("b8")));

// var()-backed theme colors over the same deterministic palette fixture.
const pixelIcon = () => ({ src: "/tests/palette.svg", recolor: true });
t.themed = track(setupTernary($("themed"), {
    preset: "numbers",
    fg_color: "var(--fixture-fg)",
    positive_fg_color: "var(--fixture-pos)",
    states: {
        "-1": { icon: pixelIcon() },
        "0": { icon: pixelIcon() },
        "1": { icon: pixelIcon() }
    }
}));

// Two instances sharing the same custom gradient/clip/use SVG.
const customIcon = (v) => ({
    icon: { src: "/examples/icons/positive.svg", recolor: true }
});
t.customA = track(setupTernary($("customA"), {
    preset: "numbers",
    states: { "1": { label: "High", ...customIcon(1) } }
}));
t.customB = track(setupTernary($("customB"), {
    preset: "numbers",
    states: { "1": { label: "High", ...customIcon(1) } }
}));

// Deterministic palette fixture for exact pixel assertions.
t.pixelsvg = track(setupTernary($("pixelsvg"), {
    preset: "numbers",
    fg_color: "#0044bb",
    bg_color: "#ffffff",
    positive_fg_color: "#00aa22",
    negative_fg_color: "#dd2222",
    states: {
        "-1": { icon: pixelIcon() },
        "0": { icon: pixelIcon() },
        "1": { icon: pixelIcon() }
    }
}));

// Only a negative-state background override: other channels must fall back.
t.bgonly = track(setupTernary($("bgonly"), {
    preset: "numbers",
    negative_bg_color: "#202040",
    states: {
        "-1": { icon: pixelIcon() },
        "0": { icon: pixelIcon() }
    }
}));

// Plain image icon (no recoloring).
t.plainimg = track(setupTernary($("plainimg"), {
    states: { "1": { label: "Pic", icon: "/examples/icons/neutral.svg" } }
}));

// Invalid SVG -> builtin fallback + iconerror.
t.badicon = track(setupTernary($("badicon"), {
    states: { "1": { label: "Bad", icon: { src: "/tests/bad.svg", recolor: true } } }
}));

// Active/schemeful source -> rejected before fetch.
t.activeicon = track(setupTernary($("activeicon"), {
    states: { "1": { label: "Act", icon: { src: "javascript:alert(1)", recolor: true } } }
}));

// Slow-loading custom icon for stale-load checks (gated by the test server).
t.slowicon = track(setupTernary($("slowicon"), {
    states: { "1": { label: "Slow", icon: { src: "/tests/slow.svg", recolor: true } } }
}));

window.__ready = true;
