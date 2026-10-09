import React from 'react';
import { cn } from '../../utils/cn';

export interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  designId?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
}

export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ className, designId, variant = 'secondary', size = 'md', children, ...props }, ref) => {
    const variantClasses = {
      primary: "btn-primary-cta base-button-primary bg-[var(--btn-primary-bg,var(--accent,#D97706))] text-white hover:bg-[var(--btn-primary-hover,var(--accent-hover,#B45309))] shadow-xs border-transparent",
      secondary: "btn-secondary-action base-button-secondary bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-transparent",
      ghost: "btn-secondary-action base-button-ghost bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent",
      danger: "btn-danger-action base-button-danger bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border-transparent",
      outline: "btn-secondary-action base-button-outline bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    };
    
    const sizes = {
      xs: "!px-1.5 !py-0.5 !text-[10px] !h-[24px] !min-h-[24px] leading-tight",
      sm: "px-2.5 py-1 text-xs min-h-0",
      md: "px-4 py-2 text-sm min-h-[36px]",
      lg: "px-6 py-3 text-base min-h-[44px] w-full sm:w-auto", // 移动端 44px 触控标准
      icon: "p-1.5 md:p-2 min-h-[32px] min-w-[32px]"
    };

    return (
      <button
        ref={ref}
        data-design-id={designId}
        data-variant={variant}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-medium transition-colors cursor-pointer rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

BaseButton.displayName = "BaseButton";
