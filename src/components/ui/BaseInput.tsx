import React from 'react';
import { cn } from '../../utils/cn';

export interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  designId?: string;
}

export const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, designId, ...props }, ref) => {
    return (
      <input
        ref={ref}
        data-design-id={designId}
        className={cn(
          "w-full px-3.5 py-2 text-sm font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl",
          "focus:outline-none focus:ring-2 focus:ring-[var(--line-focus,rgba(217,119,6,0.5))] focus:border-[var(--accent,#D97706)]",
          "text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400",
          "transition-all duration-200 min-h-[36px]",
          className
        )}
        {...props}
      />
    );
  }
);

BaseInput.displayName = "BaseInput";
