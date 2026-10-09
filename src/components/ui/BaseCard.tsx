import React from 'react';
import { cn } from '../../utils/cn';

export interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  designId?: string;
  nested?: boolean; // 是否是嵌套在内部的小卡片
}

export const BaseCard = React.forwardRef<HTMLDivElement, BaseCardProps>(
  ({ className, designId, nested = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-design-id={designId}
        data-nested={nested ? "true" : undefined}
        className={cn(
          "text-[var(--text,#18181b)] transition-all duration-200",
          nested 
            ? "sub-block-card p-3 sm:p-4 bg-[var(--card-solid-bg,#EADAC7)] border-none rounded-none shadow-none" 
            : "p-4 sm:p-5 sm:p-6 bg-[var(--bg-paper,#ffffff)] dark:bg-[var(--bg-paper,#18181b)] border border-[var(--line,#e4e4e7)] shadow-sm rounded-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BaseCard.displayName = "BaseCard";
