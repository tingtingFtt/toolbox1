import React from 'react';
import { ExternalLink, Lock } from 'lucide-react';
import { resourceSource } from '../../utils/presetResources';

export type ResourceSourceFilter = 'all' | 'standalone' | 'card' | 'preset';
const labels = { all: '全部来源', standalone: '独立资源', card: '角色卡内嵌', preset: '预设内嵌' };
type Resource = {
  sourcePresetId?: string;
  sourceCardId?: string;
  sourcePresetName?: string;
  sourceCardName?: string;
  sourceFolder?: string;
};

export function ResourceSourceControls({
  items,
  value,
  onChange,
}: {
  items: Resource[];
  value: ResourceSourceFilter;
  onChange: (value: ResourceSourceFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px]" aria-label="固定资源来源">
      <span className="inline-flex items-center gap-1 mr-1 text-[var(--dim)]">
        <Lock className="w-3 h-3" />
        固定来源
      </span>
      {(Object.keys(labels) as ResourceSourceFilter[]).map((scope) => (
        <button
          key={scope}
          type="button"
          aria-pressed={value === scope}
          onClick={() => onChange(scope)}
          className={`px-2 py-1 border-b transition-colors cursor-pointer ${value === scope ? 'border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)]' : 'border-transparent text-[var(--dim)] hover:text-[var(--text)]'}`}
        >
          {labels[scope]} (
          {scope === 'all'
            ? items.length
            : items.filter((item) => resourceSource(item) === scope).length}
          )
        </button>
      ))}
    </div>
  );
}

export function ResourceSourceBadge({
  item,
  onOpenPreset,
  onOpenCard,
}: {
  item: Resource;
  onOpenPreset?: (id: string) => void;
  onOpenCard?: (id: string) => void;
}) {
  const scope = resourceSource(item);
  const name = scope === 'preset' ? item.sourcePresetName : item.sourceCardName;
  const open =
    scope === 'preset' && onOpenPreset
      ? () => onOpenPreset(item.sourcePresetId!)
      : scope === 'card' && onOpenCard
        ? () => onOpenCard(item.sourceCardId!)
        : null;
  const content = (
    <>
      <Lock className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">
        {labels[scope]}
        {name ? ` · ${name}` : ''}
        {item.sourceFolder ? ` · ${item.sourceFolder}` : ''}
      </span>
      {open && <ExternalLink className="w-3 h-3 shrink-0" />}
    </>
  );
  const className =
    'inline-flex items-center gap-1 max-w-full text-[10px] text-[var(--accent)] bg-[var(--btn-primary-bg)] border border-[var(--line)] px-1.5 py-1';
  return open ? (
    <button
      type="button"
      title={scope === 'preset' ? '打开所属预设' : '打开所属角色卡'}
      className={`${className} cursor-pointer`}
      onClick={(event) => {
        event.stopPropagation();
        open();
      }}
    >
      {content}
    </button>
  ) : (
    <span className={className}>{content}</span>
  );
}
