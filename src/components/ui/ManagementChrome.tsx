import React from 'react';
import { cn } from '../../utils/cn';
import { Search } from 'lucide-react';
import { BaseInput } from './BaseInput';

interface ManagementHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: React.ReactNode;
  title: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ManagementHeader({ icon, title, badge, description, actions, className, ...props }: ManagementHeaderProps) {
  return <div {...props} className={cn('sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]', className)}>
    <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
      <div className="header-icon-box w-7 h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">{title}</h2>
          {badge && <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">{badge}</span>}
        </div>
        {description && <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">{actions}</div>}
  </div>;
}

type RegionProps = React.HTMLAttributes<HTMLDivElement>;
export const ManagementToolbarFrame = React.forwardRef<HTMLDivElement, RegionProps>(function ManagementToolbarFrame({ className, ...props }, ref) {
  return <div {...props} ref={ref} className={cn('management-toolbar space-y-2.5 mb-6 w-full min-w-0', className)} />;
});
export const ManagementGrid = React.forwardRef<HTMLDivElement, RegionProps>(function ManagementGrid({ className, ...props }, ref) {
  return <div {...props} ref={ref} className={cn('resource-card-grid grid gap-4', className)} />;
});
export function ManagementBatchBar({ className, ...props }: RegionProps) {
  return <div {...props} className={cn('batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]', className)} />;
}

export function ManagementBatchOverlay({ className, ...props }: RegionProps) {
  return <div {...props} className={cn('fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto', className)} />;
}

export const ManagementSearch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { designId?: string }>(function ManagementSearch({ className, 'aria-label': label, placeholder, ...props }, ref) {
  return <div className="relative w-full">
    <Search aria-hidden="true" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
    <BaseInput {...props} ref={ref} placeholder={placeholder} aria-label={label ?? placeholder ?? '搜索资源'} className={cn('w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500', className)} />
  </div>;
});
