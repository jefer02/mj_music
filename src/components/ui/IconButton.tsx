import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isActive?: boolean;
  isDanger?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function IconButton({
  label,
  isActive = false,
  isDanger = false,
  size = "md",
  children,
  className = "",
  ...rest
}: IconButtonProps) {
  const classes = [
    "icon-btn",
    `icon-btn--${size}`,
    isActive ? "icon-btn--active" : "",
    isDanger ? "icon-btn--danger" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...rest}
      type={rest.type ?? "button"}
      className={classes}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
