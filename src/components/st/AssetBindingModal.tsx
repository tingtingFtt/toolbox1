import React, { useState, useMemo } from 'react';
import { AppData, CardEntry, STWorldBookEntry, STRegexEntry, ScriptEntry } from '../../types';
import { CustomSelect } from '../ui/CustomSelect';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { X, Search, BookOpen, Cpu, Code2, Check, ArrowRight, Layers, Clock, AlertCircle } from 'lucide-react';

interface AssetBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CardEntry;
  appData: AppData;
  initialType?: 'worldbook' | 'regex' | 'script';
  replacesAssetId?: string;
  onConfirmBind: (
    type: 'worldbook' | 'regex' | 'script',
    assetId: string,
    versionId: string,
    assetName: string,
    versionLabel: string,
    replacesAssetId?: string
  ) => void;
}

export const AssetBindingModal: React.FC<AssetBindingModalProps> = ({
  isOpen,
  onClose,
  card,
  appData,
  initialType = 'worldbook',
  replacesAssetId,
  onConfirmBind,
}) => {
  const [activeType, setActiveType] = useState<'worldbook' | 'regex' | 'script'>(initialType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('latest');

  // Reset or initialize state when opening
  React.useEffect(() => {
    if (isOpen) {
      setActiveType(initialType);
      setSearchQuery('');
      setSelectedAssetId('');
      setSelectedVersionId('latest');
    }
  }, [isOpen, initialType, replacesAssetId]);

  const currentlyBoundIds = useMemo(() => {
    if (activeType === 'worldbook') return card.boundWorldBooks || [];
    if (activeType === 'regex') return card.boundRegexes || [];
    if (activeType === 'script') return card.boundScripts || [];
    return [];
  }, [card, activeType]);

  const replacesAssetInfo = useMemo(() => {
    if (!replacesAssetId) return null;
    if (activeType === 'worldbook') {
      const wb = (appData.stWorldBooks || []).find(w => w.id === replacesAssetId);
      return wb ? { name: wb.name, label: '世界书' } : null;
    }
    if (activeType === 'regex') {
      const rx = (appData.stRegexScripts || []).find(r => r.id === replacesAssetId);
      return rx ? { name: rx.scriptName, label: '正则' } : null;
    }
    if (activeType === 'script') {
      const sc = (appData.scripts || []).find(s => s.id === replacesAssetId);
      return sc ? { name: sc.name, label: '脚本' } : null;
    }
    return null;
  }, [replacesAssetId, activeType, appData]);

  // Filtered items
  const items = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (activeType === 'worldbook') {
      return (appData.stWorldBooks || []).filter(item => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.author && item.author.toLowerCase().includes(q))
        );
      });
    }
    if (activeType === 'regex') {
      return (appData.stRegexScripts || []).filter(item => {
        if (!q) return true;
        return (
          item.scriptName.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.author && item.author.toLowerCase().includes(q))
        );
      });
    }
    if (activeType === 'script') {
      return (appData.scripts || []).filter(item => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.author && item.author.toLowerCase().includes(q))
        );
      });
    }
    return [];
  }, [activeType, searchQuery, appData]);

  const selectedItem = useMemo(() => {
    if (!selectedAssetId) return null;
    return items.find((i: any) => i.id === selectedAssetId);
  }, [selectedAssetId, items]);

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setSelectedVersionId('latest');
  };

  const handleSubmit = () => {
    if (!selectedItem) return;
    const itemName = (selectedItem as any).name || (selectedItem as any).scriptName || '未命名资产';
    let verLabel = (selectedItem as any).activeVersionLabel || 'v1';
    if (selectedVersionId !== 'latest' && selectedItem.versions) {
      const matchVer = selectedItem.versions.find((v: any) => v.versionId === selectedVersionId);
      if (matchVer) {
        verLabel = matchVer.versionLabel || `v${matchVer.versionNumber}`;
      }
    }

    onConfirmBind(
      activeType,
      selectedAssetId,
      selectedVersionId,
      itemName,
      verLabel,
      replacesAssetId
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div data-design-id="asset-binding-modal-root" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs modal-backdrop animate-in fade-in" role="dialog" aria-modal="true">
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        data-design-id="asset-binding-modal-panel"
        className="modal-panel modal-card relative z-10 bg-[var(--bg-paper,#ffffff)] dark:bg-[#18181b] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div data-design-id="asset-binding-header" className="px-6 py-4 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              {replacesAssetId ? `换绑资产 (${replacesAssetInfo?.label || '系统资产'})` : '绑定系统资产至角色卡'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              目标角色卡：<span className="font-semibold text-zinc-800 dark:text-zinc-200">{card.name}</span> ({card.activeVersionLabel || '当前版本'})
              {replacesAssetInfo && (
                <span className="text-amber-600 dark:text-amber-400 ml-2 font-medium">
                  [将替换原绑定的: {replacesAssetInfo.name}]
                </span>
              )}
            </p>
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* Category Tabs & Search Bar */}
        <div data-design-id="asset-binding-tabs" className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 space-y-3">
          <div className="flex items-center gap-2">
            <BaseButton
              designId="asset-binding-tab-worldbook"
              type="button"
              onClick={() => {
                setActiveType('worldbook');
                setSelectedAssetId('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeType === 'worldbook'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> ST 世界书 ({(appData.stWorldBooks || []).length})
            </BaseButton>
            <BaseButton
              designId="asset-binding-tab-regex"
              type="button"
              onClick={() => {
                setActiveType('regex');
                setSelectedAssetId('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeType === 'regex'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" /> ST 正则脚本 ({(appData.stRegexScripts || []).length})
            </BaseButton>
            <BaseButton
              designId="asset-binding-tab-script"
              type="button"
              onClick={() => {
                setActiveType('script');
                setSelectedAssetId('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeType === 'script'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" /> 扩展脚本 ({(appData.scripts || []).length})
            </BaseButton>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <BaseInput
              designId="asset-binding-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`在库中搜索 ${activeType === 'worldbook' ? '世界书名称/描述/条目' : activeType === 'regex' ? '正则脚本名/规则' : '扩展脚本名/内容'}…`}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Asset List */}
        <div data-design-id="asset-binding-list" className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[260px] max-h-[380px]">
          {items.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">
              暂无可绑定的{activeType === 'worldbook' ? '世界书' : activeType === 'regex' ? '正则脚本' : '扩展脚本'}。
            </div>
          ) : (
            items.map((item: any) => {
              const itemId = item.id;
              const itemName = item.name || item.scriptName || '未命名资产';
              const isCurrentlyBound = currentlyBoundIds.includes(itemId);
              const isSelected = selectedAssetId === itemId;
              const hasVersions = item.versions && item.versions.length > 0;
              const totalVersions = (item.versions?.length || 0) + 1;

              return (
                <BaseCard
                  key={itemId}
                  designId="asset-binding-item-card"
                  nested
                  onClick={() => handleSelectAsset(itemId)}
                  className={`p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-500/50'
                      : isCurrentlyBound
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          activeType === 'worldbook'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'
                            : activeType === 'regex'
                            ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                      >
                        {activeType === 'worldbook' ? (
                          <BookOpen className="w-3.5 h-3.5" />
                        ) : activeType === 'regex' ? (
                          <Cpu className="w-3.5 h-3.5" />
                        ) : (
                          <Code2 className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {itemName}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {item.activeVersionLabel || 'v1'}
                          </span>
                          {totalVersions > 1 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-medium rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              共 {totalVersions} 个版本
                            </span>
                          )}
                          {isCurrentlyBound && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                              当前已绑定
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                          {activeType === 'worldbook'
                            ? `${item.entries?.length || 0} 条目 · ${item.description || '无描述'}`
                            : activeType === 'regex'
                            ? `${item.rules?.length || 1} 规则 · ${item.description || '正则脚本'}`
                            : `${item.type || 'script'} · ${item.description || '扩展脚本'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* If selected and has versions, show version picker */}
                  {isSelected && hasVersions && (
                    <div
                      className="mt-3 pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 flex-shrink-0">
                        绑定具体版本：
                      </span>
                      <CustomSelect
                        value={selectedVersionId}
                        onChange={(val) => setSelectedVersionId(val)}
                        options={[
                          {
                            value: 'latest',
                            label: `最新版 (${item.activeVersionLabel || 'v1'}) - 跟随资产自动同步`,
                          },
                          ...item.versions.map((ver: any) => ({
                            value: ver.versionId,
                            label: `锁定快照 ${ver.versionLabel || `v${ver.versionNumber}`} (${ver.changeSummary || new Date(ver.updatedAt).toLocaleDateString()})`,
                          })),
                        ]}
                        className="flex-1 px-2 py-1 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none flex items-center justify-between"
                      />
                    </div>
                  )}
                </BaseCard>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div data-design-id="asset-binding-footer" className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            {selectedItem ? (
              <span>
                已选择：<strong className="text-zinc-900 dark:text-zinc-100">{(selectedItem as any).name || (selectedItem as any).scriptName}</strong>
                {selectedVersionId === 'latest' ? ' (跟随最新版)' : ' (锁定指定版本快照)'}
              </span>
            ) : (
              <span>请点击选择上方的一项资产</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <BaseButton
              designId="asset-binding-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              取消
            </BaseButton>
            <BaseButton
              designId="asset-binding-submit-btn"
              type="button"
              disabled={!selectedItem}
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {replacesAssetId ? '确认换绑' : '确认绑定'}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
};
