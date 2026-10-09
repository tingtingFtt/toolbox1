import React, { useState, useEffect } from 'react';
import { Folder, Plus, Tag as TagIcon, X, Check, Search } from 'lucide-react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { AppData } from '../../types';
import { isFixedSystemTag } from '../../utils/tagUtils';

interface BatchMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCardIds: string[];
  appData: AppData;
  updateAppData: (data: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSuccess?: () => void;
}

export const BatchMoveModal: React.FC<BatchMoveModalProps> = ({
  isOpen,
  onClose,
  selectedCardIds,
  appData,
  updateAppData,
  showToast,
  onSuccess
}) => {
  const [targetGroup, setTargetGroup] = useState('');
  const [newGroupInput, setNewGroupInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Sub-modal states for "更多" popups (固定高度，上下滑动)
  const [showMoreGroupsModal, setShowMoreGroupsModal] = useState(false);
  const [showMoreTagsModal, setShowMoreTagsModal] = useState(false);
  const [groupFilterQuery, setGroupFilterQuery] = useState('');
  const [tagFilterQuery, setTagFilterQuery] = useState('');

  // Initialize target group when modal opens
  useEffect(() => {
    if (isOpen) {
      const groups = appData.groups || [];
      setTargetGroup(groups[0] || '默认');
      setNewGroupInput('');
      setSelectedTags([]);
      setNewTagInput('');
      setShowMoreGroupsModal(false);
      setShowMoreTagsModal(false);
      setGroupFilterQuery('');
      setTagFilterQuery('');
    }
  }, [isOpen, appData.groups]);

  if (!isOpen) return null;

  const allGroups = appData.groups || ['默认'];
  const allCustomTags = (appData.cardTags || []).filter(t => !isFixedSystemTag(t));

  // Top 3 items displayed directly in main modal
  const displayedGroups = allGroups.slice(0, 3);
  const displayedTags = allCustomTags.slice(0, 3);

  // Filtered lists for the "更多" sub-modals
  const filteredMoreGroups = allGroups.filter(g =>
    g.toLowerCase().includes(groupFilterQuery.toLowerCase().trim())
  );
  const filteredMoreTags = allCustomTags.filter(t =>
    t.toLowerCase().includes(tagFilterQuery.toLowerCase().trim())
  );

  // Handle creating new group
  const handleCreateGroup = () => {
    const trimmed = newGroupInput.trim();
    if (!trimmed) {
      showToast('请输入分组名称', 'info');
      return;
    }
    if (trimmed === '全部' || trimmed === '全部分组') {
      showToast('不能使用系统保留字作为分组名称', 'error');
      return;
    }
    if (allGroups.includes(trimmed)) {
      setTargetGroup(trimmed);
      setNewGroupInput('');
      showToast(`已选择已有分组 "${trimmed}"`, 'info');
      return;
    }

    const updatedGroups = [...allGroups, trimmed];
    updateAppData({
      ...appData,
      groups: updatedGroups
    });
    setTargetGroup(trimmed);
    setNewGroupInput('');
    showToast(`成功创建并选择新分组 "${trimmed}"`, 'success');
  };

  // Handle creating new tag
  const handleCreateTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (isFixedSystemTag(trimmed)) {
      showToast('「本地」与「酒馆」为系统固定来源身份标签，不可手动添加', 'error');
      setNewTagInput('');
      return;
    }
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    if (!allCustomTags.includes(trimmed)) {
      updateAppData({
        ...appData,
        cardTags: [...allCustomTags, trimmed]
      });
    }
    setNewTagInput('');
  };

  // Toggle tag selection
  const handleToggleTag = (tag: string) => {
    if (isFixedSystemTag(tag)) {
      showToast('「本地」与「酒馆」为系统固定来源身份标签，不可手动添加', 'error');
      return;
    }
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Confirm batch move
  const handleConfirmMove = () => {
    if (!targetGroup) {
      showToast('请选择目标分组', 'info');
      return;
    }

    const count = selectedCardIds.length;
    if (count === 0) return;

    const validSelectedTags = selectedTags.filter(t => !isFixedSystemTag(t));

    const updatedCards = appData.cards.map((card) => {
      if (!selectedCardIds.includes(card.id)) return card;

      const existingCustomTags = Array.isArray(card.customTags) ? card.customTags : [];
      const mergedTags = validSelectedTags.length > 0 
        ? Array.from(new Set([...existingCustomTags, ...validSelectedTags]))
        : existingCustomTags;

      return {
        ...card,
        group: targetGroup,
        customTags: mergedTags
      };
    });

    updateAppData({
      ...appData,
      cards: updatedCards
    });

    const tagMsg = validSelectedTags.length > 0 ? ` 并附加了 ${validSelectedTags.length} 个标签` : '';
    showToast(`已将 ${count} 张角色卡移动至分组 "${targetGroup}"${tagMsg}`, 'success');

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-backdrop p-3 animate-in fade-in" role="dialog" aria-modal="true">
      <div 
        className="fixed inset-0 bg-transparent cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 max-h-[90vh] overflow-y-auto bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] border border-[var(--line-focus,rgba(96,126,149,0.3))] rounded-none w-full max-w-md p-4 sm:p-5 space-y-3.5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--modal-solid-bg, #E8EAEB)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.18))] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none border border-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] flex items-center justify-center flex-shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-serif,#1A232D)] flex items-center gap-2">
                批量移动分组
                <span className="text-[9px] px-1.5 py-0.5 rounded-none border border-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] font-semibold">
                  已选 {selectedCardIds.length} 张
                </span>
              </h3>
              <p className="text-[10px] text-[var(--dim,#647382)] mt-0.5">
                选择现有分组或创建新分组，支持同时设定与新建标签
              </p>
            </div>
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* Section 1: Target Group Selection & Creation */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-[var(--text-serif,#1A232D)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />
              <span>目标分组</span>
            </span>
            {targetGroup && (
              <span className="text-[10px] text-[var(--accent,#607E95)] font-medium">
                当前选择: <span className="font-bold">{targetGroup === '默认' ? '未分组' : targetGroup}</span>
              </span>
            )}
          </div>

          {/* Groups Pills: 展示三个分组，其余按下更多按键进入小弹窗 */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] rounded-none border border-[var(--line-soft,rgba(96,126,149,0.1))]">
            {displayedGroups.map((group) => {
              const isSelected = targetGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setTargetGroup(group)}
                  title={group === '默认' ? '默认分组 (未分组)' : group}
                  className={`px-2.5 py-1 text-[11px] rounded-none transition-all cursor-pointer flex items-center gap-1 border-0 ${
                    isSelected
                      ? 'border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.22))] text-[var(--accent,#607E95)] font-bold'
                      : 'border-b border-b-[var(--line-focus,#9B8778)] bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--text,#2B3540)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  <span>{group === '默认' ? '未分组' : group}</span>
                </button>
              );
            })}

            {/* If currently selected targetGroup is not among the first 3, also display it */}
            {targetGroup && !displayedGroups.includes(targetGroup) && (
              <button
                type="button"
                onClick={() => setTargetGroup(targetGroup)}
                title={targetGroup === '默认' ? '默认分组 (未分组)' : targetGroup}
                className="px-2.5 py-1 text-[11px] font-bold rounded-none transition-all cursor-pointer flex items-center gap-1 border-0 border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.22))] text-[var(--accent,#607E95)]"
              >
                <Check className="w-3 h-3" />
                <span>{targetGroup === '默认' ? '未分组' : targetGroup}</span>
              </button>
            )}

            {/* 更多分组按键 */}
            {allGroups.length > 3 && (
              <button
                type="button"
                onClick={() => setShowMoreGroupsModal(true)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-none transition-all cursor-pointer flex items-center gap-1 border-0 border-b border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.22))]"
              >
                <span>更多分组 ({allGroups.length - 3})...</span>
              </button>
            )}
          </div>

          {/* Create New Group Input */}
          <div className="flex gap-1.5 pt-0.5">
            <BaseInput
              type="text"
              value={newGroupInput}
              onChange={(e) => setNewGroupInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateGroup();
                }
              }}
              placeholder="输入新分组名称..."
              className="flex-1 px-2.5 py-1 text-[11px] bg-[var(--input-bg,rgba(255,255,255,0.6))] border border-[var(--line-focus,#9B8778)] rounded-none text-[var(--text,#2B3540)] focus:outline-none focus:border-[var(--accent,#607E95)]"
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={!newGroupInput.trim()}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-none flex items-center gap-1 transition-all cursor-pointer border-0 border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.16))] text-[var(--accent,#607E95)] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.25))] disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
              <span>新建分组</span>
            </button>
          </div>
        </div>

        {/* Section 2: Tags Selection & Creation */}
        <div className="space-y-2 pt-2 border-t border-[var(--line,rgba(96,126,149,0.18))]">
          <div>
            <div className="text-[11px] font-bold text-[var(--text-serif,#1A232D)] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />
                <span>同步附加标签 (可选)</span>
              </span>
              {selectedTags.length > 0 && (
                <span className="text-[10px] text-[var(--accent,#607E95)] font-semibold">
                  已选 {selectedTags.length} 个
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--dim,#647382)] mt-0.5">
              支持批量附加自定义标签；系统固定身份标签（「本地」与「酒馆」）由系统维护，不可手动添加
            </p>
          </div>

          {/* Selected Tags list */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 p-2 bg-[var(--btn-primary-bg,rgba(96,126,149,0.1))] border border-[var(--line-soft,rgba(96,126,149,0.15))] rounded-none">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-[var(--card-solid-bg,#E8EAEB)] text-[var(--text-serif,#1A232D)] border border-[var(--line-focus,#9B8778)] rounded-none"
                >
                  <span>{tag}</span>
                  <span role="button" onClick={() => handleToggleTag(tag)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-2.5 h-2.5" /></span>
                </span>
              ))}
            </div>
          )}

          {/* Available Tags: 展示三个标签，其余按下更多按键进入小弹窗 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {displayedTags.map((tag) => {
              const isChecked = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-2 py-0.5 text-[10px] rounded-none transition-all cursor-pointer border-0 ${
                    isChecked
                      ? 'border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.22))] text-[var(--accent,#607E95)] font-bold'
                      : 'border-b border-b-[var(--line-focus,#9B8778)] bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--text,#2B3540)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))]'
                  }`}
                >
                  {isChecked ? `✓ ${tag}` : `+ ${tag}`}
                </button>
              );
            })}

            {/* 更多标签按键 */}
            {allCustomTags.length > 3 && (
              <button
                type="button"
                onClick={() => setShowMoreTagsModal(true)}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-none transition-all cursor-pointer border-0 border-b border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))] text-[var(--accent,#607E95)] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.22))]"
              >
                <span>更多标签 ({allCustomTags.length - 3})...</span>
              </button>
            )}
          </div>

          {/* Create New Tag Input */}
          <div className="flex gap-1.5 pt-0.5">
            <BaseInput
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              placeholder="输入新标签名称并回车..."
              className="flex-1 px-2.5 py-1 text-[11px] bg-[var(--input-bg,rgba(255,255,255,0.6))] border border-[var(--line-focus,#9B8778)] rounded-none text-[var(--text,#2B3540)] focus:outline-none focus:border-[var(--accent,#607E95)]"
            />
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={!newTagInput.trim()}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-none flex items-center gap-1 transition-all cursor-pointer border-0 border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.16))] text-[var(--accent,#607E95)] hover:bg-[var(--btn-primary-hover,rgba(96,126,149,0.25))] disabled:opacity-40"
            >
              <Plus className="w-3 h-3" />
              <span>新建标签</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2.5 border-t border-[var(--line,rgba(96,126,149,0.18))]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-[11px] font-medium text-[var(--dim,#647382)] hover:text-[var(--text,#2B3540)] hover:bg-black/5 dark:hover:bg-white/5 rounded-none transition-colors cursor-pointer border-0 bg-transparent"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={!targetGroup}
            className="px-4 py-1 text-[11px] font-bold bg-[var(--accent,#607E95)] text-white hover:opacity-90 rounded-none transition-all shadow-xs disabled:opacity-40 cursor-pointer border-0"
          >
            确认移动
          </button>
        </div>
      </div>

      {/* 嵌套小弹窗 1：更多分组选择 (固定高度，上下滑动，跟随主题) */}
      {showMoreGroupsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div 
            className="fixed inset-0 bg-transparent cursor-pointer"
            onClick={() => setShowMoreGroupsModal(false)}
            aria-label="关闭更多分组"
          />
          <div 
            className="relative z-10 w-full max-w-sm h-72 flex flex-col bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] border-2 border-[var(--line-focus,#9B8778)] rounded-none shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--modal-solid-bg, #E8EAEB)' }}
          >
            {/* Sub-modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.18))] pb-2">
              <div className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />
                <span className="text-xs font-bold text-[var(--text-serif,#1A232D)]">选择分组 (共 {allGroups.length} 个)</span>
              </div>
              <span role="button" onClick={() => setShowMoreGroupsModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
            </div>

            {/* Filter search */}
            <div className="relative my-2">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--dim,#647382)]" />
              <input
                type="text"
                value={groupFilterQuery}
                onChange={(e) => setGroupFilterQuery(e.target.value)}
                placeholder="搜索分组名称..."
                className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-[var(--input-bg,rgba(255,255,255,0.6))] border border-[var(--line-focus,#9B8778)] rounded-none text-[var(--text,#2B3540)] focus:outline-none focus:border-[var(--accent,#607E95)]"
              />
            </div>

            {/* Scrollable Groups List (固定高度，上下滑动) */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 border border-[var(--line-soft,rgba(96,126,149,0.1))] p-1.5 bg-[var(--btn-primary-bg,rgba(96,126,149,0.05))]">
              {filteredMoreGroups.length === 0 ? (
                <div className="text-[11px] text-center text-[var(--dim,#647382)] py-4">
                  未找到匹配分组
                </div>
              ) : (
                filteredMoreGroups.map((group) => {
                  const isSelected = targetGroup === group;
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => {
                        setTargetGroup(group);
                        setShowMoreGroupsModal(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-none flex items-center justify-between transition-all cursor-pointer border-0 ${
                        isSelected
                          ? 'border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.22))] text-[var(--accent,#607E95)] font-bold'
                          : 'border-b border-b-[var(--line-focus,#9B8778)] bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--text,#2B3540)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))]'
                      }`}
                    >
                      <span className="truncate" title={group === '默认' ? '默认分组 (未分组)' : group}>
                        {group === '默认' ? '未分组' : group}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent,#607E95)]" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Sub-modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMoreGroupsModal(false)}
                className="px-3 py-1 text-[11px] font-bold bg-[var(--accent,#607E95)] text-white rounded-none border-0 cursor-pointer hover:opacity-90"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 嵌套小弹窗 2：更多标签选择 (固定高度，上下滑动，跟随主题) */}
      {showMoreTagsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div 
            className="fixed inset-0 bg-transparent cursor-pointer"
            onClick={() => setShowMoreTagsModal(false)}
            aria-label="关闭更多标签"
          />
          <div 
            className="relative z-10 w-full max-w-sm h-72 flex flex-col bg-[var(--modal-solid-bg,#E8EAEB)] text-[var(--text,#2B3540)] border-2 border-[var(--line-focus,#9B8778)] rounded-none shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--modal-solid-bg, #E8EAEB)' }}
          >
            {/* Sub-modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--line,rgba(96,126,149,0.18))] pb-2">
              <div className="flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-[var(--accent,#607E95)]" />
                <span className="text-xs font-bold text-[var(--text-serif,#1A232D)]">选择标签 (已选 {selectedTags.length} 个)</span>
              </div>
              <span role="button" onClick={() => setShowMoreTagsModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-3.5 h-3.5" /></span>
            </div>

            {/* Filter search */}
            <div className="relative my-2">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--dim,#647382)]" />
              <input
                type="text"
                value={tagFilterQuery}
                onChange={(e) => setTagFilterQuery(e.target.value)}
                placeholder="搜索标签名称..."
                className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-[var(--input-bg,rgba(255,255,255,0.6))] border border-[var(--line-focus,#9B8778)] rounded-none text-[var(--text,#2B3540)] focus:outline-none focus:border-[var(--accent,#607E95)]"
              />
            </div>

            {/* Scrollable Tags List (固定高度，上下滑动) */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 border border-[var(--line-soft,rgba(96,126,149,0.1))] p-1.5 bg-[var(--btn-primary-bg,rgba(96,126,149,0.05))]">
              {filteredMoreTags.length === 0 ? (
                <div className="text-[11px] text-center text-[var(--dim,#647382)] py-4">
                  未找到匹配标签
                </div>
              ) : (
                filteredMoreTags.map((tag) => {
                  const isChecked = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-none flex items-center justify-between transition-all cursor-pointer border-0 ${
                        isChecked
                          ? 'border-b-2 border-b-[var(--accent,#607E95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.22))] text-[var(--accent,#607E95)] font-bold'
                          : 'border-b border-b-[var(--line-focus,#9B8778)] bg-[var(--btn-bg,rgba(226,208,188,0.45))] text-[var(--text,#2B3540)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.14))]'
                      }`}
                    >
                      <span className="truncate">{tag}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent,#607E95)]" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Sub-modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMoreTagsModal(false)}
                className="px-3 py-1 text-[11px] font-bold bg-[var(--accent,#607E95)] text-white rounded-none border-0 cursor-pointer hover:opacity-90"
              >
                完成选择
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
