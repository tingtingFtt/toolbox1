import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Download,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  FileCode,
} from 'lucide-react';
import { CloudSyncLogEntry, syncLogger } from '../../utils/cloudSyncLogger';

interface SyncDiagnosticLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDiagnosticLogDrawer: React.FC<SyncDiagnosticLogDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<CloudSyncLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = syncLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'all' && log.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'all') {
        if (selectedLevel === 'error' && log.level !== 'error') return false;
        if (selectedLevel === 'warn' && log.level !== 'warn' && log.level !== 'error') return false;
        if (selectedLevel === 'success' && log.level !== 'success') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.title?.toLowerCase().includes(q);
        const matchUrl = log.url?.toLowerCase().includes(q);
        const matchDiagnosis = log.diagnosis?.toLowerCase().includes(q);
        const matchError = log.error?.toLowerCase().includes(q);
        const matchResponse = JSON.stringify(log.responseDetails || {}).toLowerCase().includes(q);
        return matchTitle || matchUrl || matchDiagnosis || matchError || matchResponse;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedLevel, searchQuery]);

  const handleCopyAll = () => {
    const formatted = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.category.toUpperCase()}] [${l.level.toUpperCase()}] ${l.title}\n` +
          (l.url ? `URL: ${l.url}\n` : '') +
          (l.method ? `Method: ${l.method} | Status: ${l.status || 'N/A'} | Latency: ${l.latencyMs || 0}ms\n` : '') +
          (l.error ? `Error: ${l.error}\n` : '') +
          (l.diagnosis ? `Diagnosis: ${l.diagnosis}\n` : '') +
          (l.responseDetails ? `Response: ${JSON.stringify(l.responseDetails, null, 2)}\n` : '') +
          '----------------------------------------'
      )
      .join('\n');

    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (log: CloudSyncLogEntry) => {
    const text = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TavernVault_CloudSync_Diagnostics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-4xl h-[92vh] sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/90 dark:bg-stone-900/90 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5 truncate">
                <span>实时诊断与通信日志</span>
                <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-normal shrink-0">
                  {logs.length} 条
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 truncate hidden sm:block">
                实时捕获百度网盘 OpenAPI、WebDAV、S3 通信报文、CORS 状态及 Errno 诊断
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition"
              title="复制全部诊断日志"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedAll ? '已复制' : '复制日志'}</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition"
              title="导出 JSON 日志文件"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导出</span>
            </button>
            <button
              onClick={() => syncLogger.clear()}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-rose-500/10 hover:text-rose-600 text-xs font-medium transition"
              title="清空日志"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            
            {/* 显式叉号 / 返回按钮 */}
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-200/80 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition border border-stone-300 dark:border-stone-700 active:scale-95 ml-1"
              title="返回 / 关闭 (ESC)"
              aria-label="关闭日志"
            >
              <X className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              <span className="text-xs">返回</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-2.5 sm:p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs shrink-0">
          <div className="relative w-full sm:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
            <input
              type="text"
              placeholder="搜索日志标题、URL、错误码或关键词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs focus:border-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto pb-0.5">
            {/* Category tabs */}
            <div className="flex bg-stone-200/70 dark:bg-stone-800 p-0.5 rounded-lg text-[10px] sm:text-[11px] font-medium shrink-0">
              {[
                { id: 'all', label: '全部' },
                { id: 'baidu', label: '百度网盘' },
                { id: 'webdav', label: 'WebDAV' },
                { id: 's3', label: 'S3' },
                { id: 'crypto', label: '加密引擎' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition whitespace-nowrap ${
                    selectedCategory === tab.id
                      ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 font-bold shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Level filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-[10px] sm:text-[11px] outline-none shrink-0"
            >
              <option value="all">所有级别</option>
              <option value="error">仅看错误</option>
              <option value="warn">警告+错误</option>
              <option value="success">仅看成功</option>
            </select>
          </div>
        </div>

        {/* Logs List Body */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-2 font-mono text-xs bg-stone-950 text-stone-200">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-stone-500 flex flex-col items-center gap-2">
              <Terminal className="w-8 h-8 opacity-40" />
              <span>暂无匹配的通信或诊断日志</span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isError = log.level === 'error';
              const isSuccess = log.level === 'success';
              const isWarn = log.level === 'warn';

              return (
                <div
                  key={log.id}
                  className={`rounded-lg border transition ${
                    isError
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : isSuccess
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : isWarn
                      ? 'border-amber-500/40 bg-amber-950/20'
                      : 'border-stone-800 bg-stone-900/60'
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-2.5 flex items-start justify-between gap-2.5 cursor-pointer hover:bg-white/5 select-none"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-stone-500 text-[11px] shrink-0 font-sans mt-0.5">
                        {log.timestamp}
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 font-sans ${
                          isError
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isSuccess
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-stone-700/50 text-stone-400'
                        }`}
                      >
                        {log.category}
                      </span>

                      {log.method && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold shrink-0">
                          {log.method}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold text-stone-100 truncate text-[11px] sm:text-xs">
                          {log.title}
                        </p>
                        {log.url && (
                          <p className="text-[10px] text-stone-400 truncate mt-0.5 font-mono">
                            {log.url}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-sans">
                      {log.latencyMs !== undefined && (
                        <span className="text-[10px] text-stone-400 bg-stone-800/80 px-1.5 py-0.5 rounded">
                          {log.latencyMs}ms
                        </span>
                      )}
                      {log.status !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            log.status >= 200 && log.status < 300
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          HTTP {log.status}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-500" />
                      )}
                    </div>
                  </div>

                  {/* Diagnosis highlight banner */}
                  {log.diagnosis && (
                    <div className="mx-2.5 mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-sans flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>诊断建议：</strong>
                        {log.diagnosis}
                      </div>
                    </div>
                  )}

                  {/* Expanded JSON Detail View */}
                  {isExpanded && (
                    <div className="p-3 border-t border-stone-800/80 bg-stone-900/90 space-y-2.5 text-[11px]">
                      <div className="flex items-center justify-between text-[11px] font-sans text-stone-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <FileCode className="w-3.5 h-3.5" />
                          报文与响应体详情 (Raw Payload)
                        </span>
                        <button
                          onClick={() => handleCopySingle(log)}
                          className="flex items-center gap-1 hover:text-amber-400 text-stone-400 transition"
                        >
                          {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === log.id ? '已复制 JSON' : '复制此条'}
                        </button>
                      </div>

                      {log.error && (
                        <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300">
                          <strong>异常堆栈 / 错误原因:</strong> {log.error}
                        </div>
                      )}

                      {log.requestDetails && (
                        <div>
                          <span className="text-stone-400 font-sans">请求上下文 (Request):</span>
                          <pre className="mt-1 p-2 rounded bg-black/50 border border-stone-800 overflow-x-auto text-emerald-300 text-[10px]">
                            {JSON.stringify(log.requestDetails, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.responseDetails && (
                        <div>
                          <span className="text-stone-400 font-sans">服务器响应体 (Response):</span>
                          <pre className="mt-1 p-2 rounded bg-black/50 border border-stone-800 overflow-x-auto text-amber-300 text-[10px]">
                            {JSON.stringify(log.responseDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile & Desktop Footer Bar with Return Button */}
        <div className="p-2.5 sm:p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
            {logs.length > 0 ? (
              <span>
                最近活动: <strong className="text-stone-700 dark:text-stone-300 font-mono">{logs[0].timestamp}</strong> · {logs[0].title}
              </span>
            ) : (
              <span>就绪：已建立自动捕获监控</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition active:scale-95 shadow-sm shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>返回设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
