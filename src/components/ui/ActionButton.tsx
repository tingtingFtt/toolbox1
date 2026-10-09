import React from 'react';
import { cn } from '../../utils/cn';

export type ActionKind = 'create' | 'import' | 'export' | 'save' | 'delete' | 'close' | 'cancel' | 'select' | 'invert' | 'move' | 'tag' | 'custom';
export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action?: ActionKind;
  context?: 'toolbar' | 'batch' | 'detail' | 'icon';
  tone?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  designId?: string;
  'data-design-id'?: string;
}

const compact = 'h-5.5 px-2 text-[10px] rounded-none border-0 flex items-center justify-center gap-1 whitespace-nowrap';
const tones = {
  primary: 'border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold hover:bg-[var(--btn-primary-hover)]',
  secondary: 'border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium hover:bg-black/5 dark:hover:bg-white/5',
  danger: 'border-b border-b-rose-500 text-rose-600 dark:text-rose-400 bg-transparent hover:bg-rose-500/10',
};

/** Shared action styling; callers own the label, icon, confirmation and business handler. */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { action = 'custom', context = 'toolbar', tone, loading = false, disabled, className, children, designId, type = 'button', ...props }, ref,
) {
  const resolvedTone = tone ?? (action === 'delete' ? 'danger' : action === 'save' || action === 'import' ? 'primary' : 'secondary');
  return <button {...props} ref={ref} type={type} data-design-id={designId ?? props['data-design-id']} data-action={action}
    disabled={disabled || loading} aria-busy={loading || undefined}
    className={cn('action-button transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed',
      context === 'batch' ? `batch-btn ${resolvedTone === 'primary' ? 'batch-btn-primary' : resolvedTone === 'danger' ? 'batch-btn-danger' : ''}`
        : context === 'icon' ? 'p-1 text-[var(--dim,#647382)] hover:text-[var(--text-serif,#1A232D)] flex items-center justify-center'
        : `${compact} ${tones[resolvedTone]}`, className)}>
    {children}
  </button>;
});
