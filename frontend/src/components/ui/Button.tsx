import { ButtonHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "pill";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

const map: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  pill: "btn-pill",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", full, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={classNames(map[variant], full && "w-full", className)}
      {...rest}
    />
  );
});
