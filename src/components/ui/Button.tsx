import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "soft" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "soft",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? "btn--full" : "",
    isLoading ? "btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button {...rest} className={classes} disabled={disabled ?? isLoading} type={rest.type ?? "button"}>
      {isLoading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
