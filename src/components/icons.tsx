import type { SvgIconProps } from "@mui/material/SvgIcon";

/** Shared size for Material icons in toolbars / lists. */
export const iconSize = 16;
export const iconSizeSm = 14;
export const iconSizeLg = 18;

export function iconProps(size: number = iconSize): Pick<SvgIconProps, "sx"> {
  return { sx: { fontSize: size } };
}
