import { type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md active:bg-primary-800",
  secondary:
    "bg-accent-500 text-white shadow-sm hover:bg-accent-600 hover:shadow-md active:bg-accent-700",
  outline:
    "border-2 border-primary-600 text-primary-700 hover:bg-primary-50 active:bg-primary-100",
  ghost: "text-stone-700 hover:bg-stone-100 active:bg-stone-200",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}
