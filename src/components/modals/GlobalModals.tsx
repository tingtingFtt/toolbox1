// @ts-nocheck
import { DetailTabBar, DetailTabButton, DetailPanel, DetailHeader, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ActionButton } from '../ui/ActionButton';

import React from 'react';
import { NewGroupModal, BottomSheetModal, UnifiedModal, DeleteConfirmationModal, ChoiceModal, ConfirmModal } from "../ui/UnifiedModal";
import { BigDataExportModal } from '../ui/BigDataExportModal';
import { GachaModal } from '../ui/GachaModal';
import { DuplicateConfirmModal } from './DuplicateConfirmModal';
import { FullscreenDataModal } from '../ui/FullscreenDataModal';
import { BatchImportProgressModal } from './BatchImportProgressModal';
import { StagingVaultModal } from './StagingVaultModal';
import { BatchMoveModal } from './BatchMoveModal';
import { NormalCardDetailModal } from './NormalCardDetailModal';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { TagEditor } from '../ui/TagEditor';
import { ThemeDrawer } from '../ui/ThemeDrawer';
import { CustomSelect } from '../ui/CustomSelect';
import { CheckSquare, Square, X, Folder, AlertTriangle, FileText, Smartphone, Code2, Cpu, Trash2, Upload, Search, Copy, ImageIcon, Maximize2, Palette, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AppData, BatchImportProgressState } from '../../types';
import { getCardAlternateGreetings } from '../../utils';
import { abortActiveImport } from '../../utils/importCancellation';

export interface GlobalModalsProps {
  appData?: any;
  batchImportProgress?: any;
  batchTargetGroup?: any;
  batchTargetThemeGroup?: any;
  bigDataExportInitialScope?: any;
  buildGroupTagProps?: any;
  codeSearchQuery?: any;
  currentPage?: any;
  deleteCardsWithGroup?: any;
  deleteThemesWithGroup?: any;
  displayDetailCard?: any;
  duplicateModalState?: any;
  editingNormalCard?: any;
  editingPhoneLink?: any;
  editingTheme?: any;
  flatTheme?: any;
  fullscreenData?: any;
  gachaCard?: any;
  handleAddPhoneLink?: any;
  handleApplyStagingVaultDecisions?: any;
  handleBatchMoveCards?: any;
  handleBatchMoveThemes?: any;
  handleClearAllStagingVault?: any;
  handleConfirmDeleteGroup?: any;
  handleConfirmDeleteThemeGroup?: any;
  handleDeleteSinglePhoneLink?: any;
  handleDeleteSingleTheme?: any;
  handleOpenStagingVault?: any;
  handleRenameGroup?: any;
  handleRenameThemeGroup?: any;
  handleSaveEditedPhoneLink?: any;
  handleSaveEditedTheme?: any;
  isBigDataExportModalOpen?: any;
  isGachaModalOpen?: any;
  managingGroup?: any;
  managingThemeGroup?: any;
  newAltGreetingInputText?: any;
  phoneForm?: any;
  renameGroupInput?: any;
  renameThemeGroupInput?: any;
  selectedCardIds?: any;
  selectedThemeIds?: any;
  setApiCategoryFilter?: any;
  setBatchImportProgress?: any;
  setBatchTargetGroup?: any;
  setBatchTargetThemeGroup?: any;
  setBeautificationCategoryFilter?: any;
  setCodeSearchQuery?: any;
  setCurrentGroup?: any;
  setCurrentPage?: any;
  setDeleteCardsWithGroup?: any;
  setDeleteThemesWithGroup?: any;
  setDetailCardId?: any;
  setDuplicateModalState?: any;
  setEditingNormalCard?: any;
  setEditingPhoneLink?: any;
  setEditingTheme?: any;
  setExtraStoryCategoryFilter?: any;
  setFlatTheme?: any;
  setFontCategoryFilter?: any;
  setFullscreenData?: any;
  setIsBigDataExportModalOpen?: any;
  setIsGachaModalOpen?: any;
  setIsThemeCodeExpanded?: any;
  setManagingGroup?: any;
  setManagingThemeGroup?: any;
  setNewAltGreetingInputText?: any;
  setNormalCardCategoryFilter?: any;
  setPhoneForm?: any;
  setPresetCategoryFilter?: any;
  setRenameGroupInput?: any;
  setRenameThemeGroupInput?: any;
  setSettingsInitialTab?: any;
  setShowAddAltGreetingModal?: any;
  setShowAddPhoneModal?: any;
  setShowBatchMoveModal?: any;
  setShowNewApiGroupModal?: any;
  setShowNewBeautificationGroupModal?: any;
  setShowNewExtraStoryGroupModal?: any;
  setShowNewFontGroupModal?: any;
  setShowNewGroupModal?: any;
  setShowNewNormalCardGroupModal?: any;
  setShowNewPresetGroupModal?: any;
  setShowNewStickerGroupModal?: any;
  setShowNewThemeGroupModal?: any;
  setShowNewWorldBookGroupModal?: any;
  setShowStagingVaultModal?: any;
  setShowThemeBatchMoveModal?: any;
  setShowThemeMenu?: any;
  setStickerCategoryFilter?: any;
  setTheme?: any;
  setThemeCategoryFilter?: any;
  setThemeDetailTab?: any;
  setUiStyle?: any;
  setWorldBookCategoryFilter?: any;
  showAddAltGreetingModal?: any;
  showAddPhoneModal?: any;
  showBatchMoveModal?: any;
  showNewApiGroupModal?: any;
  showNewBeautificationGroupModal?: any;
  showNewExtraStoryGroupModal?: any;
  showNewFontGroupModal?: any;
  showNewGroupModal?: any;
  showNewNormalCardGroupModal?: any;
  showNewPresetGroupModal?: any;
  showNewStickerGroupModal?: any;
  showNewThemeGroupModal?: any;
  showNewWorldBookGroupModal?: any;
  showStagingVaultModal?: any;
  showThemeBatchMoveModal?: any;
  showThemeMenu?: any;
  showToast?: any;
  theme?: any;
  themeCoverInputRef?: any;
  themeDetailTab?: any;
  uiStyle?: any;
  updateAppData?: any;
}
export const GlobalModals = (props: GlobalModalsProps) => {
  const {
    appData,
    batchImportProgress,
    batchTargetGroup,
    batchTargetThemeGroup,
    bigDataExportInitialScope,
    buildGroupTagProps,
    codeSearchQuery,
    currentPage,
    deleteCardsWithGroup,
    deleteThemesWithGroup,
    displayDetailCard,
    duplicateModalState,
    editingNormalCard,
    editingPhoneLink,
    editingTheme,
    flatTheme,
    fullscreenData,
    gachaCard,
    handleAddPhoneLink,
    handleApplyStagingVaultDecisions,
    handleBatchMoveCards,
    handleBatchMoveThemes,
    handleClearAllStagingVault,
    handleConfirmDeleteGroup,
    handleConfirmDeleteThemeGroup,
    handleDeleteSinglePhoneLink,
    handleDeleteSingleTheme,
    handleOpenStagingVault,
    handleRenameGroup,
    handleRenameThemeGroup,
    handleSaveEditedPhoneLink,
    handleSaveEditedTheme,
    isBigDataExportModalOpen,
    isGachaModalOpen,
    managingGroup,
    managingThemeGroup,
    newAltGreetingInputText,
    phoneForm,
    renameGroupInput,
    renameThemeGroupInput,
    selectedCardIds,
    selectedThemeIds,
    setApiCategoryFilter,
    setBatchImportProgress,
    setBatchTargetGroup,
    setBatchTargetThemeGroup,
    setBeautificationCategoryFilter,
    setCodeSearchQuery,
    setCurrentGroup,
    setCurrentPage,
    setDeleteCardsWithGroup,
    setDeleteThemesWithGroup,
    setDetailCardId,
    setDuplicateModalState,
    setEditingNormalCard,
    setEditingPhoneLink,
    setEditingTheme,
    setExtraStoryCategoryFilter,
    setFlatTheme,
    setFontCategoryFilter,
    setFullscreenData,
    setIsBigDataExportModalOpen,
    setIsGachaModalOpen,
    setIsThemeCodeExpanded,
    setManagingGroup,
    setManagingThemeGroup,
    setNewAltGreetingInputText,
    setNormalCardCategoryFilter,
    setPhoneForm,
    setPresetCategoryFilter,
    setRenameGroupInput,
    setRenameThemeGroupInput,
    setSettingsInitialTab,
    setShowAddAltGreetingModal,
    setShowAddPhoneModal,
    setShowBatchMoveModal,
    setShowNewApiGroupModal,
    setShowNewBeautificationGroupModal,
    setShowNewExtraStoryGroupModal,
    setShowNewFontGroupModal,
    setShowNewGroupModal,
    setShowNewNormalCardGroupModal,
    setShowNewPresetGroupModal,
    setShowNewStickerGroupModal,
    setShowNewThemeGroupModal,
    setShowNewWorldBookGroupModal,
    setShowStagingVaultModal,
    setShowThemeBatchMoveModal,
    setShowThemeMenu,
    setStickerCategoryFilter,
    setTheme,
    setThemeCategoryFilter,
    setThemeDetailTab,
    setUiStyle,
    setWorldBookCategoryFilter,
    showAddAltGreetingModal,
    showAddPhoneModal,
    showBatchMoveModal,
    showNewApiGroupModal,
    showNewBeautificationGroupModal,
    showNewExtraStoryGroupModal,
    showNewFontGroupModal,
    showNewGroupModal,
    showNewNormalCardGroupModal,
    showNewPresetGroupModal,
    showNewStickerGroupModal,
    showNewThemeGroupModal,
    showNewWorldBookGroupModal,
    showStagingVaultModal,
    showThemeBatchMoveModal,
    showThemeMenu,
    showToast,
    theme,
    themeCoverInputRef,
    themeDetailTab,
    uiStyle,
    updateAppData,
  } = props;


  return (
    <>
            {/* ==================== NEW GROUP MODAL (Unified) ==================== */}
      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部' || name === '默认') {
            showToast('该名称为系统保留名称', 'error');
            return;
          }
          const groupProps = buildGroupTagProps();
          if (!groupProps) return;
          if (groupProps.groups.includes(name)) {
            showToast('该分组已存在', 'error');
            return;
          }
          groupProps.onAddGroup(name);
          setShowNewGroupModal(false);
          setCurrentGroup(name);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== MANAGE / DELETE GROUP MODAL (Requirement 4) ==================== */}
      {managingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
            onClick={() => setManagingGroup(null)}
            aria-label="关闭遮罩"
          />
          <div className="modal-panel modal-card relative z-10 max-h-[90vh] overflow-y-auto bg-[var(--bg-paper,#faf7f2)] dark:bg-[#1a1a1c] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                管理分组: {managingGroup}
              </h3>
              <span role="button" onClick={() => setManagingGroup(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            </div>

            {/* Rename Group Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-500 block">重命名分组</label>
              <div className="flex gap-2">
                <BaseInput
                  type="text"
                  value={renameGroupInput}
                  onChange={(e) => setRenameGroupInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
                <BaseButton
                  onClick={handleRenameGroup}
                  className="px-3 py-1.5 text-[10px] font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
                >
                  保存名字
                </BaseButton>
              </div>
            </div>

            {/* Delete Group Confirmation Dialog with Requirement 4 Circular Toggle */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">删除分组</div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                是否要删除分组“{managingGroup}”？删除前请选择是否一并清理组内角色卡。
              </p>

              {/* Circular Selection Toggle (Requirement 4: "搞成那种圆圈，别人点击圆圈 圆圈内部变黑就是会一起删掉，如果没选就不删") */}
              <div
                onClick={() => setDeleteCardsWithGroup((prev) => !prev)}
                className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {/* Circular Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    deleteCardsWithGroup
                      ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900'
                      : 'border-zinc-400 dark:border-zinc-600 bg-transparent'
                  }`}
                >
                  {deleteCardsWithGroup && (
                    /* Circle center turns dark/black when selected */
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  )}
                </div>

                <div className="text-[10px] font-medium text-zinc-800 dark:text-zinc-200">
                  是否要一并把分组里的角色卡给删掉？
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <BaseButton
                  onClick={() => setManagingGroup(null)}
                  className="px-3 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  取消
                </BaseButton>
                <BaseButton
                  onClick={handleConfirmDeleteGroup}
                  className="px-4 py-1.5 text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg"
                >
                  确认删除分组
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BATCH MOVE MODAL ==================== */}
      <BatchMoveModal
        isOpen={showBatchMoveModal}
        onClose={() => setShowBatchMoveModal(false)}
        selectedCardIds={selectedCardIds || []}
        appData={appData}
        updateAppData={updateAppData}
        showToast={showToast}
        onSuccess={() => {
          if (setSelectedCardIds) setSelectedCardIds([]);
        }}
      />

      {/* ==================== NEW THEME GROUP MODAL (Unified) ==================== */}
      <NewGroupModal
        isOpen={showNewThemeGroupModal}
        onClose={() => setShowNewThemeGroupModal(false)}
        onConfirm={(name) => {
          const currentCats = appData.themeCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组已存在', 'info');
            setThemeCategoryFilter(name);
            setShowNewThemeGroupModal(false);
            return;
          }
          const updatedCats = [...currentCats, name];
          updateAppData({ ...appData, themeCategories: updatedCats });
          setThemeCategoryFilter(name);
          setShowNewThemeGroupModal(false);
          showToast(`已新建分组「${name}」`, 'success');
        }}
        title="新建主题分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW BEAUTIFICATION GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewBeautificationGroupModal}
        onClose={() => setShowNewBeautificationGroupModal(false)}
        onConfirm={(name) => {
          const currentCats = appData.beautificationCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组已存在', 'info');
            setBeautificationCategoryFilter(name);
            setShowNewBeautificationGroupModal(false);
            return;
          }
          const updatedCats = [...currentCats, name];
          updateAppData({ ...appData, beautificationCategories: updatedCats });
          setBeautificationCategoryFilter(name);
          setShowNewBeautificationGroupModal(false);
          showToast(`已新建美化分组「${name}」`, 'success');
        }}
        title="新建美化分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW PRESET GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewPresetGroupModal}
        onClose={() => setShowNewPresetGroupModal(false)}
        onConfirm={(name) => {
          const currentCats = appData.presetCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组已存在', 'info');
            setPresetCategoryFilter(name);
            setShowNewPresetGroupModal(false);
            return;
          }
          const updatedCats = [...currentCats, name];
          updateAppData({ ...appData, presetCategories: updatedCats });
          setPresetCategoryFilter(name);
          setShowNewPresetGroupModal(false);
          showToast(`已新建预设分组「${name}」`, 'success');
        }}
        title="新建预设分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW NORMAL CARD GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewNormalCardGroupModal}
        onClose={() => setShowNewNormalCardGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部分组') {
            showToast('"全部分组"为系统保留名称', 'error');
            return;
          }
          const currentCats = appData.normalCardCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组名称已存在', 'error');
            return;
          }
          updateAppData({
            ...appData,
            normalCardCategories: [...currentCats, name],
          });
          setNormalCardCategoryFilter(name);
          setShowNewNormalCardGroupModal(false);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建普通卡分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW API GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewApiGroupModal}
        onClose={() => setShowNewApiGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部分组') {
            showToast('"全部分组"为系统保留名称', 'error');
            return;
          }
          const currentCats = appData.apiCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组名称已存在', 'error');
            return;
          }
          updateAppData({
            ...appData,
            apiCategories: [...currentCats, name],
          });
          setApiCategoryFilter(name);
          setShowNewApiGroupModal(false);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建 API 分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW FONT GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewFontGroupModal}
        onClose={() => setShowNewFontGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部分组') {
            showToast('"全部分组"为系统保留名称', 'error');
            return;
          }
          const currentCats = appData.fontCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组名称已存在', 'error');
            return;
          }
          updateAppData({
            ...appData,
            fontCategories: [...currentCats, name],
          });
          setFontCategoryFilter(name);
          setShowNewFontGroupModal(false);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建字体分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW EXTRA STORY GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewExtraStoryGroupModal}
        onClose={() => setShowNewExtraStoryGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部分组') {
            showToast('"全部分组"为系统保留名称', 'error');
            return;
          }
          const currentCats = appData.extraStoryCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组名称已存在', 'error');
            return;
          }
          updateAppData({
            ...appData,
            extraStoryCategories: [...currentCats, name],
          });
          setExtraStoryCategoryFilter(name);
          setShowNewExtraStoryGroupModal(false);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建故事分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW STICKER GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewStickerGroupModal}
        onClose={() => setShowNewStickerGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部分组') {
            showToast('"全部分组"为系统保留名称', 'error');
            return;
          }
          const currentCats = appData.stickerCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组名称已存在', 'error');
            return;
          }
          updateAppData({
            ...appData,
            stickerCategories: [...currentCats, name],
          });
          setStickerCategoryFilter(name);
          setShowNewStickerGroupModal(false);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建表情包分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== NEW WORLD BOOK GROUP MODAL ==================== */}
      <NewGroupModal
        isOpen={showNewWorldBookGroupModal}
        onClose={() => setShowNewWorldBookGroupModal(false)}
        onConfirm={(name) => {
          if (name === '全部分组') {
            showToast('"全部分组"为系统保留名称', 'error');
            return;
          }
          const currentCats = appData.worldBookCategories || ['默认'];
          if (currentCats.includes(name)) {
            showToast('该分组名称已存在', 'error');
            return;
          }
          updateAppData({
            ...appData,
            worldBookCategories: [...currentCats, name],
          });
          setWorldBookCategoryFilter(name);
          setShowNewWorldBookGroupModal(false);
          showToast(`成功新建分组: ${name}`, 'success');
        }}
        title="新建世界书分组"
        label="分组名字"
        placeholder="请输入分组名称..."
      />

      {/* ==================== MANAGE / DELETE THEME GROUP MODAL ==================== */}
      {managingThemeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
            onClick={() => setManagingThemeGroup(null)}
            aria-label="关闭遮罩"
          />
          <div className="modal-panel modal-card relative z-10 max-h-[90vh] overflow-y-auto bg-[var(--bg-paper,#faf7f2)] dark:bg-[#1a1a1c] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                管理主题分组: {managingThemeGroup}
              </h3>
              <span role="button" onClick={() => setManagingThemeGroup(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            </div>

            {/* Rename Group Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-500 block">重命名分组</label>
              <div className="flex gap-2">
                <BaseInput
                  type="text"
                  value={renameThemeGroupInput}
                  onChange={(e) => setRenameThemeGroupInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <BaseButton
                  onClick={handleRenameThemeGroup}
                  className="px-3 py-1.5 text-[10px] font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg whitespace-nowrap"
                >
                  保存名字
                </BaseButton>
              </div>
            </div>

            {/* Delete Group Confirmation Dialog with Circular Toggle */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">删除分组</div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                是否要删除分组“{managingThemeGroup}”？删除前请选择是否一并清理组内主题美化。
              </p>

              {/* Circular Selection Toggle */}
              <div
                onClick={() => setDeleteThemesWithGroup((prev) => !prev)}
                className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {/* Circular Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    deleteThemesWithGroup
                      ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900'
                      : 'border-zinc-400 dark:border-zinc-600 bg-transparent'
                  }`}
                >
                  {deleteThemesWithGroup && (
                    /* Circle center turns dark/black when selected */
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  )}
                </div>

                <div className="text-[10px] font-medium text-zinc-800 dark:text-zinc-200">
                  是否要一并把分组里的主题美化给删掉？
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <BaseButton
                  onClick={() => setManagingThemeGroup(null)}
                  className="px-3 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  取消
                </BaseButton>
                <BaseButton
                  onClick={handleConfirmDeleteThemeGroup}
                  className="px-4 py-1.5 text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg"
                >
                  确认删除分组
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BATCH MOVE THEME MODAL ==================== */}
      {showThemeBatchMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
            onClick={() => {
              setShowThemeBatchMoveModal(false);
              setBatchTargetThemeGroup('');
            }}
            aria-label="关闭遮罩"
          />
          <div className="modal-panel modal-card relative z-10 max-h-[90vh] overflow-y-auto bg-[var(--bg-paper,#faf7f2)] dark:bg-[#1a1a1c] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              批量移动主题美化 ({selectedThemeIds.length} 个)
            </h3>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-zinc-500 mb-1 block">选择或输入目标分组</label>
              <CustomSelect
                value={batchTargetThemeGroup}
                onChange={(val) => setBatchTargetThemeGroup(val)}
                placeholder="-- 请选择现有分组 --"
                options={[
                  { value: '', label: '-- 请选择现有分组 --' },
                  ...Array.from(new Set(['默认', '整体美化包', '自定义 CSS 特效', '气泡样式', '全屏背景壁纸', ...(appData.themeCategories || [])])).map((cat) => ({
                    value: cat,
                    label: cat,
                  })),
                ]}
                className="w-full px-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none flex items-center justify-between"
              />
              <BaseInput
                type="text"
                value={batchTargetThemeGroup}
                onChange={(e) => setBatchTargetThemeGroup(e.target.value)}
                placeholder="或直接输入新的分组名称..."
                className="w-full px-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <BaseButton
                onClick={() => {
                  setShowThemeBatchMoveModal(false);
                  setBatchTargetThemeGroup('');
                }}
                className="px-3 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                取消
              </BaseButton>
              <BaseButton
                disabled={!batchTargetThemeGroup.trim()}
                onClick={handleBatchMoveThemes}
                className="px-4 py-1.5 text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-40"
              >
                确认移动
              </BaseButton>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD PHONE LINK MODAL ==================== */}
      {/* Add Phone Link Modal (Bottom Sheet with solid background) */}
      <BottomSheetModal
        isOpen={showAddPhoneModal}
        onClose={() => setShowAddPhoneModal(false)}
        title="添加小手机链接"
        subtitle="添加外部小手机或网页直达链接"
        maxWidth="md"
        footer={
          <>
            <BaseButton
              type="button"
              onClick={() => setShowAddPhoneModal(false)}
              className="px-4 py-2 text-[10px] font-medium rounded border border-zinc-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
            >
              取消
            </BaseButton>
            <BaseButton
              type="button"
              onClick={handleAddPhoneLink}
              className="px-4 py-2 text-[10px] font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              确定保存
            </BaseButton>
          </>
        }
      >
        <div className="space-y-4 text-[10px]">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              小手机名称 <span className="text-rose-500">*</span>
            </label>
            <BaseInput
              type="text"
              value={phoneForm.name}
              onChange={(e) => setPhoneForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="请输入小手机名称..."
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              填写链接 <span className="text-rose-500">*</span>
            </label>
            <BaseInput
              type="text"
              value={phoneForm.url}
              onChange={(e) => setPhoneForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="请输入链接地址 (如 https://...)..."
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              联系方式（小红书，QQ群等等）
            </label>
            <BaseInput
              type="text"
              value={phoneForm.contact}
              onChange={(e) => setPhoneForm((p) => ({ ...p, contact: e.target.value }))}
              placeholder="选填，例如: 小红书: xxx, QQ群: 123456"
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              描述
            </label>
            <textarea
              rows={3}
              value={phoneForm.description}
              onChange={(e) => setPhoneForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="选填，请输入备注或描述信息..."
              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
            />
          </div>
        </div>
      </BottomSheetModal>

      {/* ==================== EDIT PHONE LINK MODAL ==================== */}
      {editingPhoneLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
            onClick={() => setEditingPhoneLink(null)}
            aria-label="关闭遮罩"
          />
          <div className="modal-panel modal-card relative z-10 max-h-[90vh] overflow-y-auto w-full max-w-lg bg-[var(--bg-paper,#faf7f2)] dark:bg-[#1a1a1c] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">查看 / 编辑小手机链接</h3>
              <span role="button" onClick={() => setEditingPhoneLink(null)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-5 h-5" /></span>
            </div>

            <div className="space-y-3.5">
              {/* 小手机名称 */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  小手机名称 <span className="text-rose-500">*</span>
                </label>
                <BaseInput
                  type="text"
                  value={editingPhoneLink.name}
                  onChange={(e) => setEditingPhoneLink((p) => p ? { ...p, name: e.target.value } : null)}
                  placeholder="请输入小手机名称..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* 链接 (带有复制键) */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  链接 <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <BaseInput
                    type="text"
                    value={editingPhoneLink.url}
                    onChange={(e) => setEditingPhoneLink((p) => p ? { ...p, url: e.target.value } : null)}
                    placeholder="请输入链接地址..."
                    className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 text-zinc-900 dark:text-zinc-100"
                  />
                  <BaseButton
                    onClick={() => {
                      if (editingPhoneLink.url) {
                        navigator.clipboard.writeText(editingPhoneLink.url);
                        showToast('链接已复制到剪贴板！', 'success');
                      }
                    }}
                    className="p-2 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 flex-shrink-0"
                    title="复制完整链接"
                  >
                    <Copy className="w-4 h-4" />
                    <span>复制</span>
                  </BaseButton>
                </div>
              </div>

              {/* 联系方式 */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  联系方式（小红书，qq群等等）
                </label>
                <BaseInput
                  type="text"
                  value={editingPhoneLink.contact || ''}
                  onChange={(e) => setEditingPhoneLink((p) => p ? { ...p, contact: e.target.value } : null)}
                  placeholder="选填，例如: 小红书: xxx, QQ群: 123456"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  描述
                </label>
                <textarea
                  rows={3}
                  value={editingPhoneLink.description || ''}
                  onChange={(e) => setEditingPhoneLink((p) => p ? { ...p, description: e.target.value } : null)}
                  placeholder="选填，请输入备注或描述信息..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 text-zinc-900 dark:text-zinc-100 resize-none"
                />
              </div>
            </div>

            {/* Bottom Action Buttons: 删除, 取消, 确定 */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <BaseButton
                onClick={() => handleDeleteSinglePhoneLink(editingPhoneLink.id)}
                className="px-3.5 py-2 text-[10px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> 删除
              </BaseButton>

              <div className="flex items-center gap-2.5">
                <BaseButton
                  onClick={() => setEditingPhoneLink(null)}
                  className="px-4 py-2 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  取消
                </BaseButton>
                <BaseButton
                  onClick={handleSaveEditedPhoneLink}
                  className="px-4 py-2 text-[10px] font-bold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  确定
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT THEME DETAIL MODAL (美化弹窗) ==================== */}
      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingTheme(null)} role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-transparent transition-opacity"
            aria-label="关闭遮罩"
          />
          <DetailPanel onClick={(e) => e.stopPropagation()}>
            {/* Hidden Input for Cover Image */}
            <input
              type="file"
              ref={themeCoverInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (reader.result) {
                      setEditingTheme((p) => p ? { ...p, coverImage: reader.result as string } : null);
                    }
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
            />

            {/* Modal Top Bar (Clean 2-Row Compact Layout, No Overlap) */}
            <DetailHeader designPrefix="globalmodals-detail" title={editingTheme.name || 'ST主题详情'} version={<>
                    {editingTheme.fileType?.toUpperCase() || 'ST主题'}
                  </>} badge={<>
                    {editingTheme.category || '默认'}
                  </>}
              tags={<><div className="flex items-center justify-between gap-2 min-w-0 text-[10px] text-zinc-500">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden py-0.5">
                  {editingTheme.author && (
                    <span className="whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400">
                      作者: {editingTheme.author}
                    </span>
                  )}
                  <TagEditor
                    customTags={editingTheme.customTags || []}
                    availableTags={appData.themeTags || []}
                    maxDisplay={2}
                    onChange={(newTags) => {
                      const updated = { ...editingTheme, customTags: newTags };
                      setEditingTheme(updated);
                      updateAppData((prev) => {
                        const newGlobalTags = Array.from(new Set([...(prev.themeTags || []), ...newTags]));
                        return {
                          ...prev,
                          themeTags: newGlobalTags,
                          themes: (prev.themes || []).map(c => c.id === updated.id ? updated : c)
                        };
                      });
                    }}
                  />
                </div>
              </div></>} actions={<>
                  <ActionButton onClick={() => {
                       const dataStr = JSON.stringify(editingTheme.jsonData || editingTheme, null, 2);
                       const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
                       const downloadAnchorNode = document.createElement('a');
                       downloadAnchorNode.setAttribute("href", URL.createObjectURL(blob));
                       downloadAnchorNode.setAttribute("download", `${editingTheme.name || 'theme'}.json`);
                       document.body.appendChild(downloadAnchorNode);
                       downloadAnchorNode.click();
                       downloadAnchorNode.remove();
                       showToast('已导出 JSON', 'success');
                    }} aria-label="导出 JSON" action="export" context="icon">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">导出 JSON</span>
                  </ActionButton>

                </>} onClose={() => setEditingTheme(null)} />

            {/* Modal Navigation Tabs */}
            <DetailTabBar label="详情导航">
                <DetailTabButton onClick={() => setThemeDetailTab('info')} active={themeDetailTab === 'info'}>
                  基本属性
                </DetailTabButton>
                <DetailTabButton onClick={() => setThemeDetailTab('code')} active={themeDetailTab === 'code'}>
                  文档内容
                </DetailTabButton>
              </DetailTabBar>

            {/* Modal Body */}
            <DetailBody className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: 美化预览(封面图) 与 基础属性 */}
              {themeDetailTab === 'info' && (
                <div className="bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                  <h3 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-zinc-500" /> 美化预览与基本信息
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Column: Cover Image Preview & Upload */}
                    <div className="md:col-span-4 space-y-3">
                      <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 relative flex items-center justify-center p-2">
                        {editingTheme.coverImage ? (
                          <img src={editingTheme.coverImage} alt="Theme Cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-4 space-y-2">
                            <ImageIcon className="w-10 h-10 text-zinc-400 mx-auto" />
                            <p className="text-[10px] text-zinc-400">暂无封面图片</p>
                          </div>
                        )}
                      </div>

                      <BaseButton
                        type="button"
                        onClick={() => themeCoverInputRef.current?.click()}
                        className="w-full py-2 text-[10px] font-medium rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" /> 上传图片 (当封面图)
                      </BaseButton>
                    </div>

                    {/* Right Column: Fields (名称, 作者, 类型, 来源, 分组, 创建时间单占一行) */}
                    <div className="md:col-span-8 space-y-3">
                      {/* 创建时间 (Requirement 10: 单独占一行) */}
                      <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                        创建时间：{editingTheme.createdAt ? new Date(editingTheme.createdAt).toLocaleString('zh-CN') : '未知时间'}
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          主题名称 <span className="text-rose-500">*</span>
                        </label>
                        <BaseInput
                          type="text"
                          value={editingTheme.name}
                          onChange={(e) => setEditingTheme((p) => p ? { ...p, name: e.target.value } : null)}
                          placeholder="请输入主题名称..."
                          className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            作者
                          </label>
                          <BaseInput
                            type="text"
                            value={editingTheme.author || ''}
                            onChange={(e) => setEditingTheme((p) => p ? { ...p, author: e.target.value } : null)}
                            placeholder="作者名字 (默认)..."
                            className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            来源
                          </label>
                          <BaseInput
                            type="text"
                            value={editingTheme.source || ''}
                            onChange={(e) => setEditingTheme((p) => p ? { ...p, source: e.target.value } : null)}
                            placeholder="DC链接 / Q群 / 论坛等..."
                            className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          所属分组
                        </label>
                        <CustomSelect
                          value={editingTheme.category || '默认'}
                          onChange={(val) => setEditingTheme((p) => p ? { ...p, category: val } : null)}
                          options={Array.from(new Set(['默认', ...(appData.themeCategories || [])])).map((cat) => ({
                            value: cat,
                            label: cat,
                          }))}
                          className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100 flex items-center justify-between"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          描述 / 备注
                        </label>
                        <textarea
                          rows={3}
                          value={editingTheme.description || ''}
                          onChange={(e) => setEditingTheme((p) => p ? { ...p, description: e.target.value } : null)}
                          placeholder="请输入美化描述或说明..."
                          className="w-full px-3 py-2 text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100 resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 文档内容 */}
              {themeDetailTab === 'code' && (
                <div className="bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap">
                      <FileText className="w-4 h-4 text-zinc-500" /> 文档内容
                    </h3>
                    <BaseButton
                      type="button"
                      onClick={() => setIsThemeCodeExpanded(true)}
                      className="px-3 py-1.5 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> 放大代码
                    </BaseButton>
                  </div>

                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <BaseInput
                      type="text"
                      value={codeSearchQuery}
                      onChange={(e) => setCodeSearchQuery(e.target.value)}
                      placeholder="搜索/定位文档内容..."
                      className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <textarea
                      rows={10}
                      value={editingTheme.content || editingTheme.rawJsonString || ''}
                      onChange={(e) => setEditingTheme((p) => (p ? { ...p, content: e.target.value } : null))}
                      placeholder="ST主题/样式文档内容..."
                      className="w-full p-3 font-mono text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-900 dark:text-zinc-100 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </DetailBody>

            <DetailFooter >
              <ActionButton type="button" onClick={() => handleDeleteSingleTheme(editingTheme.id)} action="delete" context="detail">
                <Trash2 className="w-3.5 h-3.5" /> 删除主题
              </ActionButton>

              <div className="flex items-center gap-3">
                <ActionButton type="button" onClick={() => setEditingTheme(null)} action="cancel" context="detail">
                  取消
                </ActionButton>
                <ActionButton type="button" onClick={handleSaveEditedTheme} action="save" context="detail">
                  保存修改
                </ActionButton>
              </div>
            </DetailFooter>
          </DetailPanel>
        </div>
      )}

      <ThemeDrawer
        isOpen={showThemeMenu}
        onClose={() => setShowThemeMenu(false)}
        theme={theme}
        setTheme={setTheme}
        uiStyle={uiStyle}
        setUiStyle={setUiStyle}
        flatTheme={flatTheme}
        setFlatTheme={setFlatTheme}
        showToast={showToast}
        onOpenSettingsTheme={() => {
          if (setSettingsInitialTab) setSettingsInitialTab('theme');
          if (setCurrentPage) setCurrentPage('settings');
        }}
      />

      <BigDataExportModal
        isOpen={isBigDataExportModalOpen}
        onClose={() => setIsBigDataExportModalOpen(false)}
        appData={appData}
        updateAppData={updateAppData}
        currentSectionId={currentPage === 'home' ? undefined : currentPage}
        showToast={showToast}
        initialScope={bigDataExportInitialScope}
      />

      <GachaModal
        isOpen={isGachaModalOpen}
        onClose={() => setIsGachaModalOpen(false)}
        appData={appData}
        initialCard={gachaCard}
        onOpenCardDetail={(cardId) => {
          setIsGachaModalOpen(false);
          setDetailCardId(cardId);
          setCurrentPage('st-cards');
        }}
        showToast={showToast}
      />

      {/* Fullscreen Raw Code / Data Viewer Modal */}
      <FullscreenDataModal
        isOpen={!!fullscreenData}
        onClose={() => setFullscreenData(null)}
        data={fullscreenData}
        showToast={showToast}
      />

      {/* Batch Import Progress Modal & Floating Ball */}
      {batchImportProgress && (
        <BatchImportProgressModal
          state={batchImportProgress}
          onMinimize={() => setBatchImportProgress((p: BatchImportProgressState | null) => p ? { ...p, isMinimized: true } : null)}
          onMaximize={() => setBatchImportProgress((p: BatchImportProgressState | null) => p ? { ...p, isMinimized: false } : null)}
          onCancel={() => {
            try {
              batchImportProgress?.onCancelImport?.();
            } catch {}
            abortActiveImport();
            setBatchImportProgress(null);
          }}
          onClose={() => setBatchImportProgress(null)}
          onOpenStagingVault={handleOpenStagingVault}
        />
      )}

      {/* Alternate Greeting BottomSheetModal */}
      <BottomSheetModal
        isOpen={showAddAltGreetingModal}
        onClose={() => setShowAddAltGreetingModal(false)}
        title="添加备用开场白"
      >
        <div className="space-y-4">
          <textarea
            rows={6}
            value={newAltGreetingInputText}
            onChange={(e) => setNewAltGreetingInputText(e.target.value)}
            placeholder="输入备用开场白内容..."
            className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
          />
          <div className="flex justify-end gap-2">
            <BaseButton
              onClick={() => setShowAddAltGreetingModal(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              取消
            </BaseButton>
            <BaseButton
              onClick={() => {
                if (!newAltGreetingInputText.trim()) return;
                const currentAlts = getCardAlternateGreetings(displayDetailCard!);
                const updatedCards = appData.cards.map((c: any) =>
                  c.id === displayDetailCard!.id
                    ? { ...c, editHistory: { ...c.editHistory, alternate_greetings: [...currentAlts, newAltGreetingInputText] }, edited: true }
                    : c
                );
                updateAppData({ ...appData, cards: updatedCards });
                setShowAddAltGreetingModal(false);
                setNewAltGreetingInputText('');
                showToast('已添加备用开场白', 'success');
              }}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              保存
            </BaseButton>
          </div>
        </div>
      </BottomSheetModal>

      <StagingVaultModal
        isOpen={showStagingVaultModal}
        stagedCards={appData.stagedDuplicateCards || []}
        onClose={() => setShowStagingVaultModal(false)}
        onApplyDecisions={handleApplyStagingVaultDecisions}
        onClearAll={handleClearAllStagingVault}
      />

      {/* Duplicate Card Confirmation Modal during import */}
      {duplicateModalState?.isOpen && (
        <DuplicateConfirmModal
          isOpen={duplicateModalState.isOpen}
          incomingCard={duplicateModalState.incomingCard}
          matchDetail={duplicateModalState.matchDetail}
          remainingCount={duplicateModalState.remainingCount}
          onConfirm={(action, applyToAll) => {
            if (duplicateModalState.resolve) {
              duplicateModalState.resolve({ action, applyToAll });
            }
            setDuplicateModalState(null);
          }}
          onCancel={() => {
            if (duplicateModalState.resolve) {
              duplicateModalState.resolve({ action: 'skip', applyToAll: false });
            }
            setDuplicateModalState(null);
          }}
        />
      )}

      {/* ==================== EDIT NORMAL CHARACTER CARD MODAL ==================== */}
      <NormalCardDetailModal
        editingNormalCard={editingNormalCard}
        setEditingNormalCard={setEditingNormalCard}
        appData={appData}
        updateAppData={updateAppData}
        showToast={showToast}
      />
    </>
  );
};

