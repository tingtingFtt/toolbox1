import React, { useState } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { X, Copy, Download, Code2, FileText, Check } from 'lucide-react';

interface FullscreenDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    title: string;
    content: string;
    type?: 'text' | 'json';
  } | null;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FullscreenDataModal: React.FC<FullscreenDataModalProps> = ({
  isOpen,
  onClose,
  data,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(data.content);
      setCopied(true);
      showToast?.('已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast?.('复制失败，请手动选择复制', 'error');
    }
  };

  const handleDownload = () => {
    try {
      const isJson = data.type === 'json' || data.content.trim().startsWith('{') || data.content.trim().startsWith('[');
      const ext = isJson ? 'json' : 'txt';
      const safeTitle = (data.title || 'export').replace(/[/\\?%*:|"<>]/g, '_');
      const blob = new Blob([data.content], { type: isJson ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast?.(`已下载 ${safeTitle}.${ext}`, 'success');
    } catch {
      showToast?.('下载文件失败', 'error');
    }
  };

  const displayContent = data.content.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  const lineCount = displayContent.split('\n').length;
  const charCount = displayContent.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div
        className="modal-panel modal-card fullscreen-data-modal-panel relative z-10 w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              {data.type === 'json' ? <Code2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                {data.title || '原始代码 / 数据查看器'}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                <span className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                  {data.type?.toUpperCase() || 'CODE/RAW'}
                </span>
                <span>{lineCount.toLocaleString()} 行</span>
                <span>·</span>
                <span>{charCount.toLocaleString()} 字符</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <BaseButton
              type="button"
              onClick={handleCopy}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
              title="复制全部内容"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? '已复制' : '复制全部'}</span>
            </BaseButton>
            <BaseButton
              type="button"
              onClick={handleDownload}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
              title="下载到本地"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导出文件</span>
            </BaseButton>
            <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
          </div>
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 bg-zinc-50 dark:bg-[#121214] font-mono !text-[13px] leading-relaxed select-text custom-gradient-bg">
          <pre className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-all">
            <code>{displayContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

