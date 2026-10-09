import React, { useEffect, useState } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

/* =========================================================================
   统一弹窗与底部抽屉管理规范 (Unified Modal & Bottom Sheet System)
   - 遮罩层：轻量半透明遮罩与柔和背景虚化，点击遮罩关闭
   - 弹窗面板：100% 实色宣纸/暗调背景 (var(--bg-paper))，绝无透字透底
   - 新建/编辑功能：统一底部滑出 (Bottom Sheet / 底部弹窗)，符合人体工学与移动端体验
   - 操作按键：底部固定取消与确定按键，排版规整
   ========================================================================= */

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 统一通用提示确认弹窗（用于导入重复卡确认、版本替换确认等）
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "提示确认",
  message,
  confirmText = "确定",
  cancelText = "取消"
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 w-full max-w-sm bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#18181b] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            {title}
          </h3>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>
        <div className="p-5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {message}
        </div>
        <div className="px-5 py-3 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-end gap-2 bg-black/5 dark:bg-white/5">
          <BaseButton
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--line,#e6e3dd)] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            {cancelText}
          </BaseButton>
          <BaseButton
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {confirmText}
          </BaseButton>
        </div>
      </div>
    </div>
  );
};

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemCount?: number;
}

export interface ChoiceModalOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}

export interface ChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  options: ChoiceModalOption[];
}

/**
 * 统一选择弹窗：两行放置，第一行是文字提示，第二行是按钮（按钮字体较小）
 */
export const ChoiceModal: React.FC<ChoiceModalProps> = ({
  isOpen,
  onClose,
  title,
  description = "请选择您要执行的操作方式：",
  options,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 w-full max-w-sm bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#18181b] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="px-5 py-3.5 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {title}
          </h3>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* 弹窗内容区：两行放置 */}
        <div className="p-5 space-y-3.5">
          {/* 第一行：文字提示 */}
          <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {description}
          </div>

          {/* 第二行：操作按钮，按钮字体较小 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {options.map((opt) => (
              <BaseButton
                key={opt.key}
                onClick={opt.onClick}
                className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                  opt.primary
                    ? 'border-transparent bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90'
                    : 'border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </BaseButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "确认删除",
  message = "此操作不可恢复，请确认是否删除该项目？",
  itemCount = 1
}) => {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onConfirm();
      onClose();
    }
  };

  const getButtonText = () => {
    if (step === 1) return `确认删除 (第 1 次确认)`;
    if (step === 2) return `再次确认 (第 2 次确认)`;
    return `最后确认，删除！(第 3 次确认)`;
  };

  const getButtonColor = () => {
    if (step === 1) return 'bg-rose-500 hover:bg-rose-600 text-white';
    if (step === 2) return 'bg-rose-600 hover:bg-rose-700 text-white';
    return 'bg-red-700 hover:bg-red-800 text-white animate-pulse';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent modal-backdrop p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card relative z-10 w-full max-w-sm bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#18181b] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800/60 flex items-center gap-3 bg-red-50/30 dark:bg-red-950/20">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
        </div>
        
        <div className="p-5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {message}
          {itemCount > 1 && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium border border-red-100 dark:border-red-900/50">
              提示：您正在批量删除 {itemCount} 个项目
            </div>
          )}
          
          <div className="mt-6 flex justify-center gap-1.5">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'w-8 bg-red-500 dark:bg-red-600' : 'w-4 bg-zinc-200 dark:bg-zinc-800'
                }`} 
              />
            ))}
          </div>
          <div className="text-center mt-2 text-xs font-medium text-red-500">
            {step === 1 && "需要 3 次确认以防误删"}
            {step === 2 && "请再确认一次，操作不可逆"}
            {step === 3 && "最后一次机会，点击将永久删除！"}
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800/60 bg-black/5 dark:bg-white/5 flex gap-3">
          <BaseButton
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            取消
          </BaseButton>
          <BaseButton
            onClick={handleConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${getButtonColor()}`}
          >
            {getButtonText()}
          </BaseButton>
        </div>
      </div>
    </div>
  );
};

export interface BottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  height?: string;
}

const maxWidthMap = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
};

/**
 * 统一从底部弹出的新建/编辑抽屉弹窗 (Bottom Sheet Modal)
 */
export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden bg-transparent modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      {/* 完全透明遮罩，点击关闭 */}
      <div
        className="fixed inset-0 bg-transparent modal-backdrop transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />

      {/* 底部滑出的实色宣纸面板 */}
      <div
        className={`modal-panel modal-card relative z-10 w-full ${maxWidthMap[maxWidth]} max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c] border-t sm:border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250`}
        onClick={(e: any) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-paper, #fbfaf8)',
        }}
      >
        {/* 顶部手机端拖拽小把手 */}
        <div className="w-full pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* 标题栏 */}
        <div className="px-5 py-3.5 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-between bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c]">
          <div className="flex-1 pr-3">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text,#2c2925)] dark:text-zinc-100 flex items-center gap-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-[var(--dim,#79746e)] dark:text-zinc-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* 中间表单滚动区域 */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c]">
          {children}
        </div>

        {/* 底部操作栏 */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-5xl',
};

export interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

/**
 * 统一弹窗外壳（居中/实色背景，大背景完全透明）
 */
export const UnifiedModal: React.FC<UnifiedModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnBackdrop = true,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-transparent modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-transparent modal-backdrop transition-opacity animate-in fade-in cursor-pointer"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        aria-label="关闭遮罩"
      />

      <div
        className={`modal-panel modal-card relative z-10 w-full ${sizeMap[size]} bg-[var(--bg-paper,#fbfaf8)] dark:bg-[#1a1a1c] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-xl p-5 shadow-2xl transition-all duration-150 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh] ${className}`}
        onClick={(e: any) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-paper, #fbfaf8)',
        }}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-xs sm:text-sm font-bold text-[var(--text,#2c2925)] dark:text-zinc-100">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-[10px] text-[var(--dim,#79746e)] dark:text-zinc-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            )}
          </div>
        )}

        <div className="overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="pt-3 mt-3 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupName: string) => void;
  title?: string;
  label?: string;
  placeholder?: string;
}

/**
 * 统一新建分组弹窗（紧凑浮层卡片，透明遮罩）
 */
export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '新建分组',
  label, // preserved for API compatibility but not used
  placeholder = '请输入分组名称...',
}) => {
  const [groupName, setGroupName] = React.useState('');
  const [pos, setPos] = React.useState<{ top: number, left: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      // Find active or clicked button or any visible btn-add-group
      const activeEl = document.activeElement as HTMLElement | null;
      let btn: HTMLElement | null = (activeEl && (activeEl.id === 'btn-add-group' || activeEl.closest('#btn-add-group') || activeEl.textContent?.includes('添加分组')))
        ? ((activeEl.id === 'btn-add-group' ? activeEl : activeEl.closest('#btn-add-group')) as HTMLElement) || activeEl
        : null;
      if (!btn) {
        const btns = Array.from(document.querySelectorAll('#btn-add-group')) as HTMLElement[];
        btn = btns.find(b => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) || null;
      }

      if (btn) {
        const rect = btn.getBoundingClientRect();
        // Determine if there's enough space below, else show above
        const spaceBelow = window.innerHeight - rect.bottom;
        const popoverHeight = 85;
        let top = rect.bottom + 6;
        if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
          top = rect.top - popoverHeight - 6;
        }
        // Center directly beneath the button's center
        let centerX = rect.left + rect.width / 2;
        // Keep within safe window bounds
        centerX = Math.max(140, Math.min(window.innerWidth - 140, centerX));
        setPos({ top, left: centerX });
      } else {
        setPos(null);
      }
    }
  }, [isOpen]);

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!groupName.trim()) return;
    onConfirm(groupName.trim());
    setGroupName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-transparent modal-backdrop animate-in fade-in">
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer" 
        onClick={onClose} 
        aria-label="关闭遮罩"
      />
      <div 
        className="modal-panel modal-card absolute z-10 bg-[var(--bg-paper,#ffffff)] dark:bg-[#18181b] border border-[var(--line,#e4e4e7)] dark:border-[#27272a] rounded-xl shadow-2xl p-3 animate-in zoom-in-95 -translate-x-1/2"
        style={pos ? { top: pos.top, left: pos.left } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <h3 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 mb-2 px-1">
          {title}
        </h3>
        <form onSubmit={handleConfirm} className="flex items-center gap-1.5">
          <BaseInput
            type="text"
            value={groupName}
            onChange={(e: any) => setGroupName(e.target.value)}
            placeholder={placeholder}
            className="w-[180px] px-2.5 py-1.5 text-[11px] bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
            autoFocus
          />
          <BaseButton
            type="button"
            onClick={handleConfirm}
            disabled={!groupName.trim()}
            className="px-3 py-1.5 text-[11px] font-bold bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-xs"
          >
            确定
          </BaseButton>
        </form>
      </div>
    </div>
  );
};
