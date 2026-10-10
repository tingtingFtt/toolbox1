import { useTavernImport } from '../../hooks/TavernImportContext';
import React from 'react';
import { BaseButton } from '../ui/BaseButton';
import { Menu, Save, FolderPlus, Download, Check, Upload, QrCode, Settings, Palette, Home, Dices } from 'lucide-react';


export const PAGE_NAMES: Record<string, string> = {
  'home': '主页',
  'st-cards': 'ST 角色卡',
  'st-themes': 'ST 主题',
  'st-presets': 'ST 预设',
  'st-plugins': 'ST 插件',
  'st-scripts': 'ST 脚本',
  'st-qr': 'ST QR 快捷回复',
  'st-worldbooks': 'ST 世界书',
  'st-regex': 'ST 正则',
  'chat-logs': '聊天记录存储',
  'st-extras': '番外小剧场',
  'st-mobile': '小手机链接',
  'normal-cards': '普通角色卡',
  'worldbook': '小手机世界书',
  'themes': '小手机美化',
  'mobile-presets': '破限/预设',
  'mobile-html': 'HTML 管理',
  'chat-memes': '聊天梗',
  'stickers': '表情包',
  'extras-app': '番外小剧场',
  'user-personas': '用户人设',
  'background-images': '聊天背景图',
  'card-covers': '角色卡面素材',
  'fonts': '字体',
  'api-storage': 'API 存储',
  'settings': '设置中心',
};
export function Header({
  appDataHydrated,
  appDataDirtyRef,
  handleExportFullBackup,
  uploadFileInputRef,
  qrFileInputRef,
  setSidebarOpen,
  currentPage,
  setCurrentPage,
  currentGroup,
  importBackupInputRef,
  isImportingBackup,
  setBigDataExportInitialScope,
  setIsBigDataExportModalOpen,
  handleDrawRandomCard,
  showThemeMenu,
  setShowThemeMenu,
  isInspectMode = false,
  setIsInspectMode = () => {}
}: any) {
  const tavernImport = useTavernImport();
  return (
    <>
        {/* Header Bar */}
          <header data-design-id="app-header" className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-2.5 sm:px-4 flex items-center justify-between flex-shrink-0 z-30 gap-1 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink overflow-hidden">
              <BaseButton
                designId="header-menu-btn"
                onClick={() => setSidebarOpen((prev: boolean) => !prev)}
                className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-300 hover:text-[var(--accent,#486175)] transition-colors flex-shrink-0 cursor-pointer bg-transparent border-none"
                title="打开侧边栏"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 transition-colors" />
              </BaseButton>

              <span data-design-id="header-page-title" className="header-page-title font-extrabold text-[16px] sm:text-[17px] tracking-tight text-zinc-900 dark:text-zinc-100 cursor-pointer whitespace-nowrap flex-shrink-0 select-none hover:text-[var(--accent,#486175)] transition-colors" onClick={() => setSidebarOpen((p: boolean) => !p)}>
                {PAGE_NAMES[currentPage] || 'ST 角色卡'}
              </span>

              {currentPage === 'home' && (
                <div className="flex items-center gap-0.5 sm:gap-1 ml-1 flex-shrink-0">
                  {/* 导入全部备份数据 */}
                  <BaseButton
                    designId="header-import-all-btn"
                    type="button"
                    onClick={() => importBackupInputRef.current?.click()}
                    disabled={isImportingBackup}
                    className="p-1 sm:p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent,#486175)] transition-colors flex-shrink-0 cursor-pointer bg-transparent border-none disabled:opacity-50"
                    title="导入全部备份数据"
                  >
                    <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors" />
                  </BaseButton>

                  {/* 数据导出中心 */}
                  <BaseButton
                    designId="header-export-all-btn"
                    type="button"
                    onClick={() => {
                      setBigDataExportInitialScope('all');
                      setIsBigDataExportModalOpen(true);
                    }}
                    className="p-1 sm:p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent,#486175)] transition-colors flex-shrink-0 cursor-pointer bg-transparent border-none"
                    title="数据导出中心（支持全部与分批导出）"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors" />
                  </BaseButton>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {tavernImport && <button aria-label="导入中心" title="导入中心：类型识别、单文件重试与删除" onClick={tavernImport.openCenter} className="p-1.5 sm:p-2 flex items-center gap-1 text-xs shrink-0"><Upload className="w-4 h-4" /><span className="hidden md:inline">导入中心</span></button>}
              {/* 命运抽卡按钮 (仅展示图标) */}
              <button
                data-design-id="header-gacha-btn"
                type="button"
                onClick={handleDrawRandomCard}
                className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent,#486175)] transition-colors duration-150 flex-shrink-0 cursor-pointer bg-transparent border-none outline-none group"
                title="命运抽卡：随机抽取并查看角色卡"
              >
                <Dices className="w-4 h-4 flex-shrink-0 transition-colors group-hover:scale-110" />
              </button>

              <BaseButton
                designId="header-home-btn"
                onClick={() => {
                  setCurrentPage('home');
                  setSidebarOpen(false);
                }}
                data-active={currentPage === 'home' ? "true" : undefined}
                className={`p-1.5 sm:p-2 transition-colors duration-150 flex-shrink-0 cursor-pointer bg-transparent border-none ${
                  currentPage === 'home'
                    ? 'active is-selected text-[var(--accent,#486175)] font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent,#486175)]'
                }`}
                title="返回主页"
              >
                <Home className="w-4 h-4 transition-colors" />
              </BaseButton>
              
              <BaseButton
                designId="header-theme-btn"
                onClick={() => setShowThemeMenu(true)}
                data-active={showThemeMenu ? "true" : undefined}
                className={`p-1.5 sm:p-2 transition-colors duration-150 flex-shrink-0 flex items-center gap-1 cursor-pointer bg-transparent border-none ${
                  showThemeMenu
                    ? 'active is-selected text-[var(--accent,#486175)] font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent,#486175)]'
                }`}
                title="选择灵感色调与色彩模式"
              >
                <Palette className="w-4 h-4 transition-colors" />
              </BaseButton>
              <BaseButton
                designId="header-settings-btn"
                onClick={() => setCurrentPage("settings")}
                data-active={currentPage === 'settings' ? "true" : undefined}
                className={`p-1.5 sm:p-2 transition-colors duration-150 flex-shrink-0 cursor-pointer bg-transparent border-none ${
                  currentPage === "settings"
                    ? "active is-selected text-[var(--accent,#486175)] font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-[var(--accent,#486175)]"
                }`}
                title="设置"
              >
                <Settings className="w-4 h-4 transition-colors" />
              </BaseButton>
            </div>
          </header>
    </>
  );
}

