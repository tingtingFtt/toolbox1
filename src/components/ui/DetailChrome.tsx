import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ActionButton } from './ActionButton';

// Shared with the ST character card detail: two header rows and one scrolling tab row.
export const detailPanelClass = 'file-detail-modal modal-panel modal-card relative z-10 w-full h-full bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] flex flex-col overflow-hidden transition-none rounded-none border-0 shadow-2xl';
export const detailFooterClass = 'detail-footer px-3 sm:px-4 py-1.5 border-t border-[var(--line,rgba(96,126,149,0.2))] flex flex-wrap items-center justify-between gap-2 flex-shrink-0 bg-[var(--modal-bar-bg,#DFE5EA)] dark:bg-[var(--modal-bar-bg,#172029)] transition-colors';
export const detailIconButtonClass = 'p-1 text-[var(--dim,#647382)] hover:text-[var(--text-serif,#1A232D)] transition-colors cursor-pointer flex items-center justify-center shrink-0';

interface HeaderProps {
  designPrefix: string;
  title: string;
  titleId?: string;
  version?: React.ReactNode;
  badge?: React.ReactNode;
  tags: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
}

export function DetailHeader({ designPrefix, title, titleId, version, badge, tags, actions, onClose }: HeaderProps) {
  return (
    <div data-design-id={`${designPrefix}-header`} className="detail-header px-3 sm:px-4 py-1 border-0 flex flex-col gap-0 flex-shrink-0 bg-[var(--modal-bar-bg,#DFE5EA)] dark:bg-[var(--modal-bar-bg,#172029)] transition-colors">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 id={titleId} title={title} className="detail-header-title !text-[18px] font-bold text-[var(--text-serif,#1A232D)] flex items-center gap-1.5 leading-tight min-w-0">
            <span className="truncate min-w-0">{title}</span>
            {version && <span className="detail-version-badge px-1.5 py-0 text-[9px] font-bold rounded-none bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--line-focus,rgba(96,126,149,0.4))] whitespace-nowrap shrink-0">{version}</span>}
            {badge && <span title={typeof badge === 'string' ? badge : undefined} className="detail-source-badge px-1.5 py-0 text-[9px] font-bold rounded-none bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--dim,#647382)] border border-[var(--line-soft,rgba(96,126,149,0.2))] whitespace-nowrap shrink-0 max-w-24 truncate">{badge}</span>}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {actions}
          <ActionButton action="close" context="icon" onClick={onClose} title="关闭 (Esc)" aria-label="关闭详情">
            <X className="w-4 h-4" />
          </ActionButton>
        </div>
      </div>
      <div className="detail-header-tags flex items-center justify-between gap-2 min-w-0 text-[10px] text-[var(--dim,#647382)]">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none py-0">{tags}</div>
      </div>
    </div>
  );
}

export interface DetailTab<T extends string> { id: T; name: React.ReactNode }
interface TabsProps<T extends string> {
  designPrefix: string;
  label: string;
  tabs: DetailTab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  actions?: React.ReactNode;
}

type RegionProps = React.HTMLAttributes<HTMLDivElement>;
export const DetailPanel = React.forwardRef<HTMLDivElement, RegionProps>(function DetailPanel({ className, ...props }, ref) {
  return <div {...props} ref={ref} className={cn(detailPanelClass, className)} />;
});
export function DetailBody({ className, ...props }: RegionProps) {
  return <div {...props} className={cn('file-detail-body flex-1 min-h-0 min-w-0 overflow-y-auto p-4', className)} />;
}
export function DetailFooter({ className, ...props }: RegionProps) {
  return <footer {...props} className={cn(detailFooterClass, className)} />;
}

export function DetailTabBar({ children, actions, designPrefix, label }: { children: React.ReactNode; actions?: React.ReactNode; designPrefix?: string; label: string }) {
  return <div data-design-id={designPrefix ? `${designPrefix}-tabbar` : undefined} className="detail-tabs tab-nav-bar flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.2))] px-3 sm:px-4 flex-shrink-0 gap-2 overflow-hidden bg-[var(--detail-tabbar-gradient,linear-gradient(90deg,#DCE4EA_0%,#EAE2D7_50%,#DCE4EA_100%))] transition-colors">
    <div role="tablist" aria-label={label} className="detail-tabs-scroll flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none">{children}</div>
    {actions && <div className="detail-tab-actions shrink-0 flex items-center gap-1">{actions}</div>}
  </div>;
}

export function DetailTabButton({ active, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean; 'data-design-id'?: string }) {
  return <button {...props} type="button" role="tab" aria-selected={active} aria-current={active ? 'page' : undefined}
    className={cn('detail-tab !py-0 h-[28px] px-2 sm:px-3 !text-[12px] !leading-none flex items-center justify-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer', active ? 'text-[var(--accent,#2563eb)] bg-[var(--btn-primary-bg,#eff6ff)]' : 'border-b-transparent text-[var(--dim,#647382)] hover:text-[var(--accent,#2563eb)] hover:bg-[var(--btn-primary-bg,#f4f4f5)]', className)} />;
}

export function DetailTabs<T extends string>({ designPrefix, label, tabs, activeTab, onChange, actions }: TabsProps<T>) {
  return (
    <DetailTabBar designPrefix={designPrefix} label={label} actions={actions}>
        {tabs.map(tab => (
          <DetailTabButton key={tab.id} data-design-id={`${designPrefix}-tab-${tab.id}`} active={activeTab === tab.id} onClick={() => onChange(tab.id)}>
            {tab.name}
          </DetailTabButton>
        ))}
    </DetailTabBar>
  );
}
