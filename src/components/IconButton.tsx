import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "soft" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: Variant;
  label?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon, variant = "ghost", label, className = "", children, title, ...rest },
  ref,
) {
  const tip = title ?? label;
  return (
    <button
      ref={ref}
      type="button"
      className={`ui-btn ui-btn-${variant} ${icon && !children && !label ? "ui-btn-icon-only" : ""} ${className}`}
      title={tip}
      aria-label={tip}
      {...rest}
    >
      {icon ? <span className="ui-btn-icon">{icon}</span> : null}
      {label ? <span className="ui-btn-label">{label}</span> : null}
      {children}
    </button>
  );
});

export const iconSize = 15;
export const iconStroke = 1.75;
