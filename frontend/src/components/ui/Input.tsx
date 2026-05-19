import { InputHTMLAttributes, forwardRef } from "react";
import { classNames } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, className, id, ...rest }, ref) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} className={classNames("field-input", className)} {...rest} />
    </div>
  );
});
