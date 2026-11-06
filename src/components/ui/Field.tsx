import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

/** Shared look for text inputs, selects and textareas. */
export const controlClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-fg shadow-sm " +
  "placeholder:text-fg-subtle outline-none transition " +
  "hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/15 " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-subtle";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  /** Receives the generated id + aria props to spread on the control. */
  children: (control: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}

/** Label + control + error message, wired together for screen readers. */
export const Field = ({
  label,
  required,
  error,
  hint,
  className,
  children,
}: FieldProps) => {
  const id = useId();
  const messageId = `${id}-msg`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-fg">
        {label} {required && <span className="text-danger">*</span>}
      </label>

      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error || hint ? messageId : undefined,
      })}

      {error ? (
        <p id={messageId} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1 text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export const TextInput = ({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(controlClass, className)} {...rest} />
);

export const SelectInput = ({
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(controlClass, className)} {...rest} />
);

export const TextArea = ({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(controlClass, className)} {...rest} />
);
