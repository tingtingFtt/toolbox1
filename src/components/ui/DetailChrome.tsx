import React from 'react';
import { X } from 'lucide-react';

// Shared with the ST character card detail: two header rows and one scrolling tab row.
export const detailPanelClass = 'file-detail-modal modal-panel modal-card relative z-10 w-full h-full bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] flex flex-col overflow-hidden transition-none rounded-none border-0 shadow-2xl';
export const detailFooterClass = 'detail-footer px-3 sm:px-4 py-1.5 border-t border-[var(--line,rgba(96,126,149,0.2))] flex flex-wrap items-center justify-between gap-2 flex-shrink-0 bg-[var(--modal-bar-bg,#DFE5EA)] dark:bg-[var(--modal-bar-bg,#172029)] transition-colors';
export const detailIconButtonClass = 'p-1 text-[var(--dim,#647382)] hover:text-[var(--text-serif,#1A232D)] transition-colors cursor-pointer flex items-center justify-center shrink-0';

interface HeaderProps {
  designPrefix: string;
  title: string;
  titleId?: string;
  version: string;
  badge: string;
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
            <span className="detail-version-badge px-1.5 py-0 text-[9px] font-bold rounded-none bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607E95)] border border-[var(--line-focus,rgba(96,126,149,0.4))] whitespace-nowrap shrink-0">{version}</span>
            <span title={badge} className="detail-source-badge px-1.5 py-0 text-[9px] font-bold rounded-none bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--dim,#647382)] border border-[var(--line-soft,rgba(96,126,149,0.2))] whitespace-nowrap shrink-0 max-w-24 truncate">{badge}</span>
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {actions}
          <button type="button" onClick={onClose} className={detailIconButtonClass} title="关闭 (Esc)" aria-label="关闭详情">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="detail-header-tags flex items-center justify-between gap-2 min-w-0 text-[10px] text-[var(--dim,#647382)]">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none py-0">{tags}</div>
      </div>
    </div>
  );
}

export interface DetailTab<T extends string> { id: T; name: string }
interface TabsProps<T extends string> {
  designPrefix: string;
  label: string;
  tabs: DetailTab<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  actions?: React.ReactNode;
}

export function DetailTabs<T extends string>({ designPrefix, label, tabs, activeTab, onChange, actions }: TabsProps<T>) {
  return (
    <div data-design-id={`${designPrefix}-tabbar`} className="detail-tabs tab-nav-bar flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.2))] px-3 sm:px-4 flex-shrink-0 gap-2 overflow-hidden bg-[var(--detail-tabbar-gradient,linear-gradient(90deg,#DCE4EA_0%,#EAE2D7_50%,#DCE4EA_100%))] transition-colors">
      <div role="tablist" aria-label={label} className="detail-tabs-scroll flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button type="button" key={tab.id} data-design-id={`${designPrefix}-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => onChange(tab.id)}
            className={`detail-tab !py-0 h-[28px] px-2 sm:px-3 !text-[12px] !leading-none flex items-center justify-center transition-colors whitespace-nowrap shrink-0 cursor-pointer ${activeTab === tab.id ? 'text-[var(--accent,#2563eb)] bg-[var(--btn-primary-bg,#eff6ff)]' : 'border-b-transparent text-[var(--dim,#647382)] hover:text-[var(--accent,#2563eb)] hover:bg-[var(--btn-primary-bg,#f4f4f5)]'}`}>
            {tab.name}
          </button>
        ))}
      </div>
      {actions && <div className="detail-tab-actions shrink-0 flex items-center gap-1">{actions}</div>}
    </div>
  );
}
