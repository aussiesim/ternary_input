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
    setChecked: (value: TernaryValue, options?: {
        emit?: boolean;
    }) => void;
    reset: () => void;
    destroy: () => void;
}
/**
 * Enhance an existing, document-attached HTMLButtonElement as a three-state
 * input. Native author-owned labels keep working through the browser's own
 * label association; no label rendering or click forwarding is added.
 */
export declare function setupTernary(button: HTMLButtonElement, options?: TernaryOptions): TernaryInstance;
