import { InputHTMLAttributes, forwardRef } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, className = "", ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
      <span className="font-medium text-surface-400">{label}</span>
      <input
        ref={ref}
        id={id}
        className={`focus-ring rounded-lg border border-surface-700 bg-surface-900 px-3.5 py-2.5 text-foreground placeholder:text-surface-500 ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-negative">{error}</span> : null}
    </label>
  );
});
