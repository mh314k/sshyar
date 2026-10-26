import type { SvgIconProps } from "@mui/material/SvgIcon";

/** Shared size for Material icons in toolbars / lists. */
export const iconSize = 18;
export const iconSizeSm = 15;
export const iconSizeLg = 20;

export function iconProps(size: number = iconSize): Pick<SvgIconProps, "sx"> {
  return { sx: { fontSize: size } };
}
