# ternary-input

[![CI](https://github.com/aussiesim/ternary_input/actions/workflows/ci.yml/badge.svg)](https://github.com/aussiesim/ternary_input/actions/workflows/ci.yml)

A dependency-free browser library that enhances an existing
`<button>` into a three-state input with numeric values `-1`, `0`, and `1`.
Native, author-owned HTML labels provide naming and click forwarding; built-in
inline-SVG presets follow page CSS variables; optional ordinary form
submission, reset, and disabled behavior are included.

No runtime dependencies, no backend, no framework.

## Install and build

```sh
npm install
npm run build
```

This produces the self-contained distributions under `dist/`:

| File | Purpose |
| --- | --- |
| `dist/ternary-input.js` / `.min.js` | Classic script, `window.TernaryInput` global |
| `dist/ternary-input.esm.js` / `.esm.min.js` | ES module with named `setupTernary` export |
| `dist/ternary-input.css` / `.min.css` | Scoped component styles |
| `dist/types/ternary-input.d.ts` | TypeScript declarations |
| `*.map` | Source maps for the minified builds |

Other scripts: `npm run typecheck`, `npm test` (Vitest/jsdom),
`npm run test:browser` (Puppeteer, fully request-intercepted).

Development requires Node `^20.19.0`, `^22.13.0`, or `>=24.0.0` (the floor
comes from the dev tooling, primarily jsdom). The built library itself has
no runtime dependencies or Node requirement.

To preview the demo locally after building, any static file server works,
for example:

```sh
python -m http.server 8765 --bind 127.0.0.1
# then open http://127.0.0.1:8765/examples/
```

## Quick start

Classic script:

```html
<link rel="stylesheet" href="./dist/ternary-input.min.css">
<button type="button" id="preference" name="preference"></button>
<label for="preference">My preference</label>
<script src="./dist/ternary-input.min.js"></script>
<script>
const preference = TernaryInput.setupTernary(
    document.getElementById("preference"),
    { preset: "heart" }
);
</script>
```

ES module:

```js
import { setupTernary } from "./dist/ternary-input.esm.min.js";

const preference = setupTernary(document.getElementById("preference"), {
    preset: "numbers",
    states: {
        "-1": { label: "Dislike" },
        "0": { label: "No preference" },
        "1": { label: "Like" }
    }
});
preference.checked = 1;
```

Call `setupTernary` only after the button and its labels exist. Without
initialization an empty button is not a working form field - there is no
no-JS fallback beyond the markup you provide.

## Labeling (author-owned, native)

The library never renders labels and never adds label click handlers.
Any native naming pattern works:

- **Explicit**: `<label for="btn-id">` - the `for` must target the button's
  own unique `id`, not the hidden input or a wrapper.
- **Wrapping**: `<label><button ...></button> Text</label>` - the label must
  not contain another labelable control or unrelated interactive content.
- **Inline text**: content inside the button is preserved untouched.
- **`aria-label` / `aria-labelledby`** for icon-only buttons.

`type="button"` is forced while enhanced so activation never submits. A
sensible content-sized label style such as `label { display: inline-block; }`
(or `inline-flex` / `justify-self: start` in grid) keeps label hit areas
bounded - the library deliberately does not style `label` elements globally.

Current state and cycling instructions are exposed through generated
`aria-describedby` description nodes placed outside any wrapping label (so
they never pollute its accessible name), plus a visually hidden polite live
region that announces user-driven changes only. Icons are decorative
(`aria-hidden`, no focus).

## API

```ts
export type TernaryValue = -1 | 0 | 1;
export type TernaryPreset = "checkbox" | "heart" | "numbers";

interface TernaryOptions {
    checked?: TernaryValue;             // default 0
    preset?: TernaryPreset;             // default "checkbox"
    cycle?: readonly TernaryValue[];    // default [0, 1, -1]
    states?: Partial<Record<TernaryValue, {
        label?: string;
        icon?: string | { src: string; recolor: true };
    }>>;
    fg_color?: string;  bg_color?: string;
    neutral_fg_color?: string;  neutral_bg_color?: string;
    positive_fg_color?: string; positive_bg_color?: string;
    negative_fg_color?: string; negative_bg_color?: string;
    sourceColors?: { foreground?: string; background?: string };
    name?: string;
    disabled?: boolean;
    onChange?: (e: CustomEvent<TernaryChangeDetail>) => void;
    onIconError?: (e: CustomEvent<TernaryIconErrorDetail>) => void;
}

interface TernaryInstance {
    readonly button: HTMLButtonElement;
    checked: TernaryValue;
    disabled: boolean;
    setChecked(value, options?: { emit?: boolean }): void;
    reset(): void;
    destroy(): void;
}
```

- `checked` is always the **number** `-1`, `0`, or `1` - strings, booleans,
  `NaN`, and fractions are rejected, never coerced.
- `cycle` must contain each value exactly once; defaults `0 -> 1 -> -1 -> 0`.
- User activation synchronously updates state, visuals, descriptions, and the
  hidden field, then emits one bubbling `input` event and one bubbling
  `change` `CustomEvent` (`detail: { checked, previousChecked, source }`),
  followed by `onChange`. Property assignment and `setChecked(v)` are silent;
  `setChecked(v, { emit: true })` emits with `source: "api"`. Unchanged
  assignments emit nothing.
- `reset()` silently restores the setup-time `checked` value, even while
  disabled.
- `disabled` mirrors `button.disabled` and the hidden input; inherited
  fieldset disabling stays native (including the first-`legend` exception).
  Programmatic `checked` changes are allowed while disabled.
- `destroy()` is idempotent: removes owned DOM/listeners, restores only the
  attributes it changed (author edits made after setup are preserved),
  keeps original children and labels, and permits re-initialization.
  Mutators throw after destroy; getters still return the last state.
- Calling `setupTernary` twice on the same button returns the existing
  instance; later options are ignored.

### Forms

If `options.name` (or the button's existing `name`) is nonblank, one hidden
`input[type=hidden]` is inserted as a sibling and synchronized with
`String(checked)` - including `"0"` - so named fields submit every state.
An existing `form` attribute is copied to the hidden input (the referenced
form must exist); otherwise the native nearest form applies. The form owner
is stable for the instance's lifetime - destroy and re-initialize to change
name or form. A `reset` listener restores the initial value on the next
microtask, only when the reset was not canceled by later listeners.

### Events

| Event | Type | When |
| --- | --- | --- |
| `input` | `Event`, bubbles | after every user or emitted API change |
| `change` | `CustomEvent<TernaryChangeDetail>`, bubbles | same transitions; `source` is `"user"` or `"api"` |
| `iconerror` | `CustomEvent<TernaryIconErrorDetail>`, bubbles | once per failed custom SVG source attempt |

## Colors

Foreground and background resolve **independently** per state:

1. State override (`positive_fg_color` / `--ternary-positive-fg`)
2. Shared override (`fg_color` / `--ternary-fg`)
3. Preset default (neutral inherits foreground, positive green, negative red)

Public variables: `--ternary-fg`, `--ternary-bg`,
`--ternary-{neutral,positive,negative}-{fg,bg}`. Inline SVG paints consume the
private `--ternary-resolved-fg` / `--ternary-resolved-bg` variables only.

```js
setupTernary(button, {
    fg_color: "#0044bb",
    bg_color: "#ffffff",
    positive_fg_color: "#00aa22",
    negative_fg_color: "#dd2222"
});
// neutral blue/white, positive green/white, negative red/white
```

JS options write inline custom-property declarations (only the variables you
supply - defaults are never emitted, so they cannot mask shared overrides).
Literal values stay literal; `var()` expressions such as
`fg_color: "var(--my-theme-fg)"` re-resolve automatically when the theme
changes. CSS themes may also set the variables on the button or any ancestor.
There is no refresh API and no theme observer.

Layout variables: `--ternary-size`, `--ternary-gap`,
`--ternary-target-size` (>=24px default, larger on coarse pointers),
`--ternary-focus-color`, `--ternary-radius`. Documented dark-theme override
example:

```css
:root[data-theme="dark"] button.ternary-input {
    --ternary-positive-fg: #4ade80;
    --ternary-negative-fg: #f87171;
}
```

Under `forced-colors: active`, system colors are used and a text state-name
fallback appears inside the icon wrapper so state never depends on color.

## Icons

Built-in presets (`checkbox`, `heart`, `numbers`) ship nine authored SVGs
bundled into the JavaScript - they make **no runtime requests**.

Per-state `icon` overrides accept two shapes:

- **String URL** (`icon: "./pic.png"`): rendered as an ordinary `<img>`  - 
  unchanged, isolated, and not recolored. Relative URLs resolve against the
  document base. Any loadable image URL (including `data:`/`blob:`) works.
- **`{ src, recolor: true }`**: fetched over http(s) with same-origin
  credentials (cross-origin servers must send CORS headers), strictly
  validated, then mounted as inline SVG that inherits the palette variables
  - including inside gradients - so it follows themes automatically.

### Recolorable SVG contract

The static subset is an explicit export contract, not general SVG/CSS:

- Self-contained static SVG only: `svg, g, defs, path, rect, circle, ellipse,
  line, polyline, polygon, linearGradient, radialGradient, stop, clipPath,
  mask, use, text, tspan, title, desc`.
- Presentation attributes and inline `style` declarations only - no
  stylesheets, scripts, `foreignObject`, images, links, animation, events,
  foreign namespaces, DOCTYPE, processing instructions, or unknown
  attributes. `var()`/`env()`/`attr()`/`url(non-local)` and `!important`
  inside source documents are rejected; only the library inserts palette
  variables after validation.
- The reserved source paints - opaque `#000000` foreground and `#ffffff`
  background by default, configurable via `sourceColors` (custom icons only;
  built-ins always use black/white) - become
  `var(--ternary-resolved-fg/bg)`. All other colors and every authored
  opacity survive untouched. Express transparency with the opacity
  properties, not alpha-encoded placeholder colors.
- Shapes without an explicit `fill` attribute or `fill` style use the SVG
  default (black), which is routed through the foreground placeholder the
  same way - so optimized exports that drop redundant `fill="#000"` still
  theme correctly. `fill="none"` and explicit/inherited fills are
  untouched.
- Local `url(#id)` references and `href="#id"` are rewritten into a unique
  per-mount namespace; duplicates, missing targets, external references,
  and reference cycles reject the document.
- Limits: 256 KiB source (enforced while streaming the fetch), 2,048
  elements, depth 32, `<use>` nesting 8, 4,096 expanded nodes.
- On any rejection or fetch failure the matching built-in preset icon is
  shown instead - never a partial mount - and `iconerror`/`onIconError`
  fires once per source attempt.

### CSP / CORS notes

- `connect-src`: the origins you fetch recolorable SVGs from.
- `img-src`: origins of unchanged image icons plus `data:`/`blob:` if used.
- `style-src`: the library applies inline custom properties on the button
  and rebuilds inline `style` declarations inside validated SVGs, so an
  inline-style policy compatible with your site applies; no new `blob:`
  permission is needed for recolored SVG. The library never weakens host
  policies.

## Presets and defaults

- **checkbox**: empty square / ticked / crossed.
- **heart**: outline / full / broken (a genuinely different shape).
- **numbers**: neutral `0`, green `+1`, red `-1` by default.

## Browser support & limitations

Current evergreen Chrome, Edge, Firefox, and Safari on baseline web APIs.
No SSR or obsolete-browser support is claimed. The cycling button is compact
but less discoverable than three explicit radio choices - always give each
control a meaningful field name and state labels, and prefer radios when
discoverability matters more than space. The library submits `-1`/`0`/`1`
strings; servers must validate them like any client input.

## Maintenance and releases

CI runs type checking, a build, and unit tests on pushes and pull requests. Run the browser checks locally before a release.

1. Update the version with `npm version patch --no-git-tag-version` (or `minor` / `major` as appropriate); this updates both package files without tagging.
2. Run `npm ci`, `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:browser`.
3. Review source and generated `dist/` changes together, then commit them with the version update. Keep `node_modules/` and `tests/.artifacts/` out of Git.
4. After review, push the commit, verify CI passes, then create and push the matching `vX.Y.Z` tag and write GitHub release notes. These are deliberate manual steps, not automatic deployment.

The package remains `private: true` to prevent accidental npm publication. Consumers can use the committed `dist/` files; a GitHub tag or release does not publish to npm.

## License

[MIT No Attribution (MIT-0)](LICENSE). Commercial use, modification, and redistribution are permitted without an attribution requirement. The software is provided without warranty.
