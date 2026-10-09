import React from 'react';
import { cn } from '../../utils/cn';

export interface BaseBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  designId?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
}

export const BaseBadge = React.forwardRef<HTMLSpanElement, BaseBadgeProps>(
  ({ className, designId, variant = 'default', size = 'sm', children, ...props }, ref) => {
    const variants = {
      default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      primary: "bg-[var(--btn-primary-bg,rgba(96,126,149,0.15))] text-[var(--accent,#486175)] border-[var(--line-soft,rgba(96,126,149,0.2))]",
      success: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      warning: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      danger: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
      info: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
      outline: "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700",
      ghost: "bg-transparent text-zinc-500 dark:text-zinc-400 border-transparent",
    };

    const sizes = {
      xs: "px-1.5 py-0.5 text-[10px] leading-tight",
      sm: "px-2 py-0.5 text-xs leading-normal",
      md: "px-2.5 py-1 text-xs font-medium leading-normal",
    };

    return (
      <span
        ref={ref}
        data-design-id={designId}
        data-component="badge"
        className={cn(
          "badge-tag-text inline-flex items-center gap-1 rounded-md border font-medium transition-colors select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

BaseBadge.displayName = "BaseBadge";
