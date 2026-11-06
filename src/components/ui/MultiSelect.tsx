import { useEffect, useRef, useState } from "react";
import { controlClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

interface MultiSelectProps {
    id?: string;
    options: string[];
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    disabled?: boolean;          // NEW
    className?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
}

const MultiSelect = ({
    id,
    options,
    value,
    onChange,
    placeholder = "Select",
    disabled = false,            // NEW
    className,
    ...aria
}: MultiSelectProps) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Bahar click karne par dropdown band
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const toggle = (item: string) =>
        onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                id={id}
                {...aria}
                onClick={() => setOpen((o) => !o)}
                disabled={disabled}
                className={cn(controlClass, "flex items-center justify-between text-left", className)}
            >
                <span className={cn("truncate", value.length === 0 && "text-fg-subtle")}>
                    {value.length ? value.join(", ") : placeholder}
                </span>
                <span className="ml-2 text-xs text-fg-subtle">▾</span>
            </button>

            {open && !disabled && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line-strong bg-surface py-1 shadow-lg">
                    {options.length === 0 && (
                        <li className="px-3.5 py-2 text-sm text-fg-subtle">No products</li>
                    )}
                    {options.map((item) => (
                        <li key={item}>
                            <label className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm text-fg hover:bg-surface-sunken">
                                <input
                                    type="checkbox"
                                    checked={value.includes(item)}
                                    onChange={() => toggle(item)}
                                    className="h-4 w-4 accent-brand"
                                />
                                {item}
                            </label>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default MultiSelect;