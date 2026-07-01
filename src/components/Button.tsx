import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-full px-6 py-3 text-lg font-semibold shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
