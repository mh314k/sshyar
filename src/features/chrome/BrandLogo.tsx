interface Props {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 28, className = "" }: Props) {
  return (
    <img
      src="/app-icon.svg"
      alt=""
      className={`brand-logo ${className}`.trim()}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
