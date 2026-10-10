import React from 'react';
import { BaseButton } from '../ui/BaseButton';
import { Home, Search, Upload, Download, Sparkles, BookOpen, Layers, Settings, FileCode, Sliders, Dices, HardDrive, Square, Tag, ChevronDown, Check, X, Palette, ImageIcon, Book, ShieldAlert } from 'lucide-react';

export function Sidebar({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, importBackupInputRef, isImportingBackup, setBigDataExportInitialScope, setIsBigDataExportModalOpen }: any) {
  return (
    <>
        {/* Sidebar Navigation */}
        <aside
          data-design-id="app-sidebar"
          style={{ fontFamily: 'var(--font-sidebar)' }}
          className={`fixed top-0 bottom-0 left-0 z-[1001] w-64 bg-[var(--bg-paper,#f3eee8)] border-r border-[var(--line,#e2d0bc)] text-[var(--text-serif,#1a232d)] flex flex-col transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div data-design-id="sidebar-header" className="p-4 border-b border-[var(--line,#e2d0bc)] flex items-center justify-between flex-shrink-0">
            <h2 data-design-id="sidebar-toolbox-title" className="sidebar-toolbox-title font-bold uppercase tracking-widest text-[var(--dim,#647382)]">工具箱导航</h2>
            <span role="button" onClick={() => setSidebarOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
          </div>

          <nav
            data-design-id="sidebar-nav-list"
            className="flex-1 overflow-y-auto py-3 px-2 space-y-5"
          >
            {/* Home Navigation Item */}
            <div>
              <BaseButton
                key="home"
                designId="sidebar-nav-home"
                onClick={() => {
                  setCurrentPage('home');
                  setSidebarOpen(false);
                }}
                className={`nav-item flex items-center justify-between gap-2 ${currentPage === 'home' ? 'active font-bold' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <Square className={`w-3.5 h-3.5 fill-current ${currentPage === 'home' ? 'text-[var(--accent,#607e95)]' : 'text-[var(--dim,#647382)]'}`} />
                  <span>主页</span>
                </div>
                {currentPage === 'home' && (
                  <span className="w-1.5 h-1.5 rounded-none bg-[var(--accent,#607e95)] flex-shrink-0" />
                )}
              </BaseButton>
            </div>

            {/* SillyTavern Section */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-[var(--dim,#647382)] uppercase tracking-wider">
                SillyTavern
              </div>
              <div className="space-y-1">
                {[
                  { id: 'st-cards', name: 'ST 角色卡' },
                  { id: 'st-themes', name: 'ST 主题' },
                  { id: 'st-presets', name: 'ST 预设' },
                  { id: 'st-plugins', name: 'ST 插件' },
                  { id: 'st-scripts', name: 'ST 脚本' },
                  { id: 'st-qr', name: 'ST QR 快捷回复' },
                  { id: 'st-worldbooks', name: 'ST 世界书' },
                  { id: 'st-regex', name: 'ST 正则' },
                  { id: 'chat-logs', name: '聊天记录存储' },
                  { id: 'st-extras', name: '番外小剧场' },
                ].map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <BaseButton
                      key={item.id}
                      designId={`sidebar-nav-${item.id}`}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`nav-item flex items-center justify-between gap-2 ${isActive ? 'active font-bold' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Square className={`w-2.5 h-2.5 fill-current ${isActive ? 'text-[var(--accent,#607e95)]' : 'text-[var(--dim,#647382)] opacity-40'}`} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-none bg-[var(--accent,#607e95)] flex-shrink-0" />
                      )}
                    </BaseButton>
                  );
                })}
              </div>
            </div>

            {/* 小手机版本 Section */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-[var(--dim,#647382)] uppercase tracking-wider">
                小手机版本
              </div>
              <div className="space-y-1">
                {[
                  { id: 'st-mobile', name: '小手机链接' },
                  { id: 'normal-cards', name: '普通角色卡' },
                  { id: 'worldbook', name: '小手机世界书' },
                  { id: 'mobile-presets', name: '破限/预设' },
                  { id: 'mobile-html', name: 'HTML 管理' },
                  { id: 'themes', name: '小手机美化' },
                  { id: 'chat-memes', name: '聊天梗' },
                  { id: 'stickers', name: '表情包' },
                  { id: 'extras-app', name: '番外小剧场' },
                ].map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <BaseButton
                      key={item.id}
                      designId={`sidebar-nav-${item.id}`}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`nav-item flex items-center justify-between gap-2 ${isActive ? 'active font-bold' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Square className={`w-2.5 h-2.5 fill-current ${isActive ? 'text-[var(--accent,#607e95)]' : 'text-[var(--dim,#647382)] opacity-40'}`} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-none bg-[var(--accent,#607e95)] flex-shrink-0" />
                      )}
                    </BaseButton>
                  );
                })}
              </div>
            </div>

            {/* 通用工具 Section */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-semibold text-[var(--dim,#647382)] uppercase tracking-wider">
                通用工具
              </div>
              <div className="space-y-1">
                {[
                  { id: 'user-personas', name: '用户人设' },
                  { id: 'background-images', name: '聊天背景图' },
                  { id: 'card-covers', name: '角色卡面素材' },
                  { id: 'fonts', name: '字体' },
                  { id: 'api-storage', name: 'API 存储' },
                ].map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <BaseButton
                      key={item.id}
                      designId={`sidebar-nav-${item.id}`}
                      onClick={() => {
                        setCurrentPage(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`nav-item flex items-center justify-between gap-2 ${isActive ? 'active font-bold' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Square className={`w-2.5 h-2.5 fill-current ${isActive ? 'text-[var(--accent,#607e95)]' : 'text-[var(--dim,#647382)] opacity-40'}`} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-none bg-[var(--accent,#607e95)] flex-shrink-0" />
                      )}
                    </BaseButton>
                  );
                })}
              </div>
            </div>


          </nav>

          <div
            data-design-id="sidebar-footer"
            className="p-2 border-t border-[var(--line,#e2d0bc)] grid grid-cols-2 gap-1.5 flex-shrink-0"
          >
            <BaseButton
              designId="sidebar-settings-btn"
              onClick={() => {
                setCurrentPage('settings');
                setSidebarOpen(false);
              }}
              className={`col-span-2 w-full flex items-center justify-center gap-2 px-2.5 py-1 min-h-[28px] sidebar-footer-btn rounded-lg border transition-colors cursor-pointer ${currentPage === 'settings' ? 'border-[var(--accent,#607e95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.18))] text-[var(--accent,#607e95)] font-bold' : 'border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] text-[var(--text-serif,#1a232d)]'}`}
            >
              <Sliders className="w-3.5 h-3.5 flex-shrink-0" /> <span>设置中心</span>
            </BaseButton>
            <BaseButton
              designId="sidebar-import-backup-btn"
              onClick={() => importBackupInputRef.current?.click()}
              disabled={isImportingBackup}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 min-h-[28px] sidebar-footer-btn rounded-lg border border-[var(--line,#e2d0bc)] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.08))] text-[var(--text-serif,#1a232d)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{isImportingBackup ? '正在导入...' : '导入备份数据'}</span>
            </BaseButton>

            <BaseButton
              designId="sidebar-export-center-btn"
              onClick={() => {
                setBigDataExportInitialScope('all');
                setIsBigDataExportModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 min-h-[28px] sidebar-footer-btn rounded-lg border border-[var(--accent,#607e95)] bg-[var(--btn-primary-bg,rgba(96,126,149,0.12))] hover:bg-[var(--btn-primary-bg,rgba(96,126,149,0.2))] text-[var(--accent,#607e95)] transition-colors shadow-sm cursor-pointer font-bold whitespace-nowrap"
              title="数据导出中心：支持单文件导出与分批分卷导出，防卡死流式处理"
            >
              <Download className="w-3.5 h-3.5 flex-shrink-0 text-[var(--accent,#607e95)]" />
              <span className="truncate">数据导出中心</span>
            </BaseButton>
          </div>
        </aside>
    </>
  );
}

