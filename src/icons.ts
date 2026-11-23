import checkboxNeutral from "../icons/checkbox-neutral.svg";
import checkboxPositive from "../icons/checkbox-positive.svg";
import checkboxNegative from "../icons/checkbox-negative.svg";
import heartNeutral from "../icons/heart-neutral.svg";
import heartPositive from "../icons/heart-positive.svg";
import heartNegative from "../icons/heart-negative.svg";
import numbersNeutral from "../icons/numbers-neutral.svg";
import numbersPositive from "../icons/numbers-positive.svg";
import numbersNegative from "../icons/numbers-negative.svg";

import type { TernaryPreset, TernaryValue } from "./ternary-input";

/** Raw SVG source for every built-in preset/state combination. */
export const BUILTIN_ICON_SOURCES: Readonly<
    Record<TernaryPreset, Readonly<Record<TernaryValue, string>>>
> = {
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
