import React, { useState } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { X, History, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';
const showToast = (msg: string) => alert(msg); // fallback

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  itemType: 'card' | 'worldbook' | 'regex' | 'script' | 'theme' | 'preset';
  onRestoreVersion?: (item: any, itemType: string, versionToRestore: any) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  item,
  itemType,
  onRestoreVersion
}) => {
  if (!isOpen || !item) return null;

  const versions = item.versions || [];
  const currentVerNum = versions.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent modal-backdrop animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-[var(--line,#e6e3dd)] dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>历史版本记录</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                共 {versions.length + 1} 个版本
              </span>
            </h2>
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-5 h-5" /></span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl space-y-3">
            <div className="flex flex-col gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  当前生效版本 (最新)
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pl-1">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                  {item.fileName || item.name}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                  最近更新: {new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-xs bg-white dark:bg-zinc-900 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name || '未命名'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 px-1">
              历史归档版本时间线
            </div>
            
            {versions.length === 0 ? (
              <div className="text-center p-8 text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                暂无历史版本记录
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((ver: any, index: number) => (
                  <div key={ver.versionId || index} className="p-4 rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                          {ver.versionLabel || `V${ver.versionNumber || (versions.length - index)}`}
                        </span>
                        <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                          {ver.changeSummary || '初始导入版本'}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-0.5">
                        {new Date(ver.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
