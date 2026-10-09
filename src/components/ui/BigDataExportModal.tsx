import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import {
  X,
  Download,
  Upload,
  HardDrive,
  Layers,
  FileCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  FileText,
  Sliders,
  ChevronRight,
  Info,
  Check,
  Square,
} from 'lucide-react';
import { AppData } from '../../types';
import {
  ALL_SECTIONS_CONFIG,
  getAppDataBreakdown,
  formatBytes,
  generateBatchedExport,
  downloadAllBatchPartsSequentially,
  triggerFileDownload,
  mergeImportFiles,
  GeneratedBatchPart,
  BatchPartitionOptions,
  ImportMergeReport,
} from '../../utils';
import { generateFullDataZipArchive } from '../../utils/zipArchiveExporter';

interface BigDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  updateAppData: (newAppData: AppData | ((prev: AppData) => AppData)) => void;
  currentSectionId?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialScope?: 'all' | 'custom';
}

export const BigDataExportModal: React.FC<BigDataExportModalProps> = ({
  isOpen,
  onClose,
  appData,
  updateAppData,
  currentSectionId = 'st-cards',
  showToast,
  initialScope = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // 导出参数配置
  const [exportFormat, setExportFormat] = useState<'zip' | 'json'>('zip');
  const [scope, setScope] = useState<'all' | 'custom'>(initialScope === 'custom' ? 'custom' : 'all');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([currentSectionId]);
  const [batchMode, setBatchMode] = useState<'by-count' | 'by-size' | 'single'>('by-count');
  const [itemsPerBatch, setItemsPerBatch] = useState<number>(50);
  const [maxSizePerBatchMB, setMaxSizePerBatchMB] = useState<number>(30);
  const [excludeFonts, setExcludeFonts] = useState<boolean>(true);
  const [autoDownloadAll, setAutoDownloadAll] = useState<boolean>(true);

  // 导出执行状态
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{
    stage: string;
    partIndex: number;
    totalParts: number;
    percent: number;
    details: string;
  }>({
    stage: 'idle',
    partIndex: 0,
    totalParts: 0,
    percent: 0,
    details: '',
  });
  const [generatedParts, setGeneratedParts] = useState<GeneratedBatchPart[]>([]);

  // 导入状态
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState('');
  const [importReport, setImportReport] = useState<ImportMergeReport | null>(null);
  const batchImportInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 计算数据概览
  const breakdown = useMemo(() => getAppDataBreakdown(appData), [appData]);

  // 当初始范围改变时同步
  useEffect(() => {
    if (isOpen) {
      setScope(initialScope === 'custom' ? 'custom' : 'all');
      // 如果数据整体较大(>30MB 或 角色卡 > 50)，默认推荐分批模式
      if (breakdown.totalEstimatedBytes > 30 * 1024 * 1024 || (appData.cards && appData.cards.length > 50)) {
        setBatchMode('by-count');
      }
    }
  }, [isOpen, initialScope, currentSectionId, breakdown.totalEstimatedBytes]);

  if (!isOpen) return null;

  const currentSectionLabel = ALL_SECTIONS_CONFIG[currentSectionId]?.label || '当前板块';

  // 预估当前选定范围的导出分卷数
  const estimatedPartsCount = () => {
    if (batchMode === 'single') return 1;
    let targetItemsCount = 0;
    let targetBytes = 0;

    if (scope === 'custom') {
      for (const id of selectedSectionIds) {
        const sec = breakdown.sections.find((s) => s.id === id);
        if (sec) {
          targetItemsCount += sec.count;
          targetBytes += sec.estimatedBytes;
        }
      }
    } else {
      targetItemsCount = breakdown.totalItems;
      targetBytes = breakdown.totalEstimatedBytes;
    }

    if (targetItemsCount === 0) return 1;
    if (batchMode === 'by-count') {
      return Math.max(1, Math.ceil(targetItemsCount / itemsPerBatch));
    } else {
      const mb = targetBytes / (1024 * 1024);
      return Math.max(1, Math.ceil(mb / maxSizePerBatchMB));
    }
  };


  const handleInterruptExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      showToast('正在中断导出...', 'info');
    }
  };

  const handleStartExport = async () => {
    setIsExporting(true);
    setGeneratedParts([]);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setExportProgress({
      stage: 'starting',
      partIndex: 0,
      totalParts: 1,
      percent: 0,
      details: '正在准备数据导出引擎...',
    });

    try {
      if (exportFormat === 'zip') {
        // ZIP 压缩包全量归档（包含所有图片与多版本分类）
        setExportProgress({
          stage: 'starting',
          partIndex: 1,
          totalParts: 1,
          percent: 5,
          details: '正在准备全量结构化归档压缩包...',
        });

        const zipResult = await generateFullDataZipArchive(
          appData,
          (p) => setExportProgress({
            stage: p.stage,
            partIndex: 1,
            totalParts: 1,
            percent: p.percent,
            details: `[${p.currentSection}] ${p.details}`,
          }),
          controller.signal
        );

        const zipPart: GeneratedBatchPart = {
          fileName: zipResult.fileName,
          blob: zipResult.blob,
          sizeBytes: zipResult.sizeBytes,
          partIndex: 1,
          totalParts: 1,
          itemCount: zipResult.stats.totalItems,
          summary: `全量板块 (${zipResult.stats.totalSections} 个目录，${zipResult.stats.totalImages} 张图片，${zipResult.stats.totalVersions} 个历史版本)`,
        };

        setGeneratedParts([zipPart]);
        showToast(`全量 ZIP 归档包导出成功 (${(zipResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB)！`, 'success');

        if (autoDownloadAll) {
          triggerFileDownload(zipResult.blob, zipResult.fileName);
        }
        return;
      }

      const options: BatchPartitionOptions = {
        scope,
        currentSectionId,
        selectedSectionIds,
        batchMode,
        itemsPerBatch,
        maxSizePerBatchMB,
        excludeFonts,
      };

      let parts: GeneratedBatchPart[] = [];

      if (batchMode === 'single') {
        // 全部一次性导出（单文件）
        try {
          parts = await generateBatchedExport(
            appData,
            options,
            (p: any) => setExportProgress(p),
            controller.signal
          );
        } catch (singleErr: any) {
          if (singleErr?.name === 'AbortError' || controller.signal.aborted) {
            throw singleErr;
          }
          // 全部一次性导出中断/遇到异常，自动采用【流式导出】模式
          console.warn('Single full export interrupted/failed, switching to streaming export mode...', singleErr);
          showToast('一次性导出遇到限制或中断，已自动切换为【流式防崩溃导出】...', 'info');

          setExportProgress({
            stage: 'streaming',
            partIndex: 1,
            totalParts: 1,
            percent: 15,
            details: '一次性导出遇到限制，已自动升级为流式 JSON 序列化导出...',
          });

          // 强制以流式 single 模式重试
          parts = await generateBatchedExport(
            appData,
            { ...options, batchMode: 'single' },
            (p: any) => setExportProgress({ ...p, details: `[流式导出] ${p.details}` }),
            controller.signal
          );
        }
      } else {
        // 分批分卷导出
        parts = await generateBatchedExport(
          appData,
          options,
          (p: any) => setExportProgress(p),
          controller.signal
        );
      }

      setGeneratedParts(parts);
      showToast(`导出成功！共生成 ${parts.length} 个备份文件`, 'success');

      if (autoDownloadAll && parts.length > 0) {
        setExportProgress((prev) => ({
          ...prev,
          details: '正在触发浏览器自动连续下载...',
        }));
        await downloadAllBatchPartsSequentially(parts, 500);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        showToast('已成功中断数据导出', 'info');
        setExportProgress({
          stage: 'cancelled',
          partIndex: 0,
          totalParts: 0,
          percent: 0,
          details: '导出已被用户手动中断',
        });
      } else {
        console.error('Data export failed', err);
        showToast(`导出失败：${err?.message || String(err)}`, 'error');
        setExportProgress((prev) => ({
          ...prev,
          stage: 'error',
          details: `导出遇到异常：${err?.message || String(err)}`,
        }));
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const handleBatchImportFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setImportReport(null);
    setImportProgressText('正在读取并合并分卷数据...');

    try {
      const fileArray = Array.from(files);
      const { nextAppData, report } = await mergeImportFiles(
        fileArray,
        appData,
        (currentFile, index, total) => {
          setImportProgressText(`正在解析并合并 (${index}/${total}): ${currentFile}`);
        }
      );

      updateAppData(nextAppData);
      setImportReport(report);
      showToast(`成功导入 ${fileArray.length} 个文件！已智能合并数据`, 'success');
    } catch (err: any) {
      console.error('Batch import failed', err);
      showToast(`分批导入失败：${err?.message || String(err)}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-transparent modal-backdrop animate-in fade-in duration-200">
      <div 
        className="fixed inset-0 bg-transparent modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="关闭遮罩"
      />
      <div className="modal-panel modal-card relative z-10 bg-[var(--bg-paper,#fafafa)] dark:bg-[#18181b] border border-[var(--line,#e6e3dd)] dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 flex-shrink-0 bg-black/5 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3 w-full sm:w-auto">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    数据导出与分批中心
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                    大数据高容错 / 分卷导出
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  支持大数据流式序列化、防内存溢出崩溃、智能分卷导出与多文件合并恢复
                </p>
              </div>
            </div>
            
            {/* Mobile close button (shown only on small screens) */}
            <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-5 h-5" /></span>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {/* Tabs */}
            <div className="flex w-full sm:w-auto bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-medium">
              <BaseButton
                type="button"
                onClick={() => setActiveTab('export')}
                className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-center rounded-md transition-colors ${
                  activeTab === 'export'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                导出数据
              </BaseButton>
              <BaseButton
                type="button"
                onClick={() => setActiveTab('import')}
                className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 text-center rounded-md transition-colors ${
                  activeTab === 'import'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                分卷合并导入
              </BaseButton>
            </div>
            
            {/* Desktop close button (hidden on small screens) */}
            <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-5 h-5" /></span>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'export' ? (
            <>
              {/* Data Diagnostics Banner */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                    当前数据体量概况
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px]">
                    <span className="text-zinc-500">总计条目:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {breakdown.totalItems} 条
                    </span>
                    <span className="hidden sm:inline text-zinc-400">|</span>
                    <span className="text-zinc-500">预估内存体积:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatBytes(breakdown.totalEstimatedBytes)}
                    </span>
                  </div>
                </div>

                {/* Section tags */}
                <div className="flex flex-wrap gap-1.5">
                  {breakdown.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className={`px-2 py-1 rounded-md text-[10px] flex items-center gap-1.5 border transition-all ${
                        sec.count > 0
                          ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                          : 'bg-zinc-100/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/50 text-zinc-400 opacity-60'
                      }`}
                    >
                      <span className="font-medium">{sec.name}:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{sec.count}</span>
                      {sec.estimatedBytes > 1024 * 1024 && (
                        <span className="text-[10px] text-amber-500 font-medium">
                          ({formatBytes(sec.estimatedBytes)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Big Data Tip */}
                {breakdown.totalEstimatedBytes > 25 * 1024 * 1024 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">检测到数据包含大量角色卡封面或高容量记录</p>
                      <p className="opacity-90 text-[10px] mt-0.5">
                        若单次导出体积过大，部分移动端或浏览器可能因内存配额限制而中断下载。建议使用下方
                        <span className="font-bold underline ml-1 mr-1">「分批分卷导出」</span>
                        模式，系统将自动将数据切分为独立可恢复的 Part 分卷文件。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1: Export Format */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                  1. 选择导出格式
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <BaseButton
                    type="button"
                    onClick={() => setExportFormat('zip')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      exportFormat === 'zip'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-[10px] flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <FolderArchive className="w-3.5 h-3.5 text-emerald-500" />
                        全量 ZIP 归档包 (含图片/分目录/版本标注)
                      </span>
                      {exportFormat === 'zip' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      解压提取所有立绘照片、按分界面名称分类建档、多版本详细标号
                    </p>
                  </BaseButton>

                  <BaseButton
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      exportFormat === 'json'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-[10px] flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        结构化 JSON 备份 (纯文本/支持分卷切分)
                      </span>
                      {exportFormat === 'json' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      体积轻便，支持按条数/体积拆分成 Part 1, Part 2 分卷导出
                    </p>
                  </BaseButton>
                </div>
              </div>

              {/* Step 2: Export Scope */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                  2. 选择导出范围
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <BaseButton
                    type="button"
                    onClick={() => setScope('all')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      scope === 'all'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-[10px]">全部板块数据</span>
                      {scope === 'all' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      包含全站所有角色卡、世界书、插件、预设、聊天记录等
                    </p>
                  </BaseButton>

                  <BaseButton
                    type="button"
                    onClick={() => setScope('custom')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      scope === 'custom'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-[10px]">自选板块组合</span>
                      {scope === 'custom' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      手动勾选需要导出的板块（如只导角色卡与世界书）
                    </p>
                  </BaseButton>
                </div>

                {/* Custom Section Checkboxes */}
                {scope === 'custom' && (
                  <div className="mt-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
                    <div className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                      勾选要包含的板块：
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(ALL_SECTIONS_CONFIG).map(([id, cfg]) => {
                        const isChecked = selectedSectionIds.includes(id);
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-2 text-[10px] text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e: any) => {
                                if (e.target.checked) {
                                  setSelectedSectionIds((prev) => [...prev, id]);
                                } else {
                                  setSelectedSectionIds((prev) => prev.filter((x) => x !== id));
                                }
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{cfg.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Export Mode (only for JSON) */}
              {exportFormat === 'json' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    3. 选择 JSON 分批与分卷策略
                  </label>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    预估将生成:{' '}
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">
                      {estimatedPartsCount()} 个文件
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1: Batch by Count */}
                  <div
                    onClick={() => setBatchMode('by-count')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      batchMode === 'by-count'
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-500" />
                        按条数分批分卷 (推荐)
                      </span>
                      {batchMode === 'by-count' && <Check className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2.5">
                      将角色卡或记录每隔固定数量切为一卷，安全稳定，适合批量备份。
                    </p>

                    {batchMode === 'by-count' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/60">
                        <span className="text-[10px] text-zinc-600 dark:text-zinc-400">每卷数量:</span>
                        {[20, 50, 100].map((num) => (
                          <BaseButton
                            key={num}
                            type="button"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              setItemsPerBatch(num);
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                              itemsPerBatch === num
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {num} 条/卷
                          </BaseButton>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mode 2: Single Full File */}
                  <div
                    onClick={() => setBatchMode('single')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      batchMode === 'single'
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-amber-500" />
                        单文件完整导出 (流式防卡死)
                      </span>
                      {batchMode === 'single' && <Check className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-2.5">
                      将所选范围全部汇总写入单个 .json 备份文件。采用微任务分块写入防崩溃。
                    </p>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Info className="w-3 h-3" /> 若单文件过大导致下载失败，系统会自动提示分卷。
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Step 4: Options */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 flex flex-wrap items-center justify-between gap-3 text-[10px]">
                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={autoDownloadAll}
                    onChange={(e: any) => setAutoDownloadAll(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>生成后自动触发文件下载</span>
                </label>

                {exportFormat === 'json' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={excludeFonts}
                      onChange={(e: any) => setExcludeFonts(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>排除字体文件（字体体积庞大，单独备份更轻便）</span>
                  </label>
                )}
              </div>

              {/* Progress Bar & Stage Info */}
              {isExporting && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 space-y-2 ">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-2 truncate pr-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                      {exportProgress.details || '正在生成备份...'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span>{exportProgress.percent}%</span>
                      <BaseButton
                        type="button"
                        onClick={handleInterruptExport}
                        className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        title="中断当前导出过程"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>中断导出</span>
                      </BaseButton>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-blue-200 dark:bg-blue-900/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${exportProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300">
                    正在执行流式数据序列化，若需停止可点击【中断导出】。
                  </p>
                </div>
              )}

              {/* Generated Parts Download Center */}
              {generatedParts.length > 0 && !isExporting && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3 ">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      已成功生成 {generatedParts.length} 个分卷备份文件
                    </div>
                    <BaseButton
                      type="button"
                      onClick={() => downloadAllBatchPartsSequentially(generatedParts, 400)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      重新连续下载全部
                    </BaseButton>
                  </div>

                  {/* Part list */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {generatedParts.map((part) => (
                      <div
                        key={part.partIndex}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-200/60 dark:border-zinc-700 text-[10px]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {part.fileName}
                            </span>
                            <span className="ml-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                              ({formatBytes(part.sizeBytes)} · {part.itemCount} 条数据)
                            </span>
                            <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                              {part.summary}
                            </span>
                          </div>
                        </div>

                        <BaseButton
                          type="button"
                          onClick={() => triggerFileDownload(part.blob, part.fileName)}
                          className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-medium flex items-center gap-1 flex-shrink-0 transition-colors ml-2"
                        >
                          <Download className="w-3 h-3" />
                          单独下载
                        </BaseButton>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    💡 提示：若浏览器阻止了多文件自动弹出下载，可点击上方「单独下载」逐个保存到本地。
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Import Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 space-y-2">
                <h4 className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-blue-500" />
                  智能分卷与多文件合并导入
                </h4>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  支持同时选择或拖拽多个备份文件（例如{' '}
                  <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[10px]">
                    part1.json
                  </code>
                  、
                  <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[10px]">
                    part2.json
                  </code>
                  ，或多个板块导出的 JSON 文件）。系统将自动识别各分卷，执行去重与增量合并，无缝恢复全部数据。
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => batchImportInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer bg-zinc-50 dark:bg-zinc-800 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all text-center"
              >
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                    点击或多选拖入分卷 / 备份 JSON 文件
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    支持一次性选择所有 Part 分卷文件，自动合并
                  </div>
                </div>
                <input
                  type="file"
                  ref={batchImportInputRef}
                  multiple
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e: any) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleBatchImportFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Importing Loading */}
              {isImporting && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 flex items-center gap-3 text-[10px] text-blue-900 dark:text-blue-200">
                  <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>{importProgressText}</span>
                </div>
              )}

              {/* Import Report */}
              {importReport && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-3 ">
                  <div className="flex items-center gap-2 font-bold text-[10px] text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    导入合并完成！成功读取 {importReport.fileCount} 个文件
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    {importReport.addedCards > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">新增角色卡:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.addedCards}
                        </strong>
                      </div>
                    )}
                    {importReport.updatedCards > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">更新角色卡:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.updatedCards}
                        </strong>
                      </div>
                    )}
                    {importReport.addedWorldBooks > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">ST世界书:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.addedWorldBooks}
                        </strong>
                      </div>
                    )}
                    {importReport.addedRegex > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">ST正则:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.addedRegex}
                        </strong>
                      </div>
                    )}
                    {importReport.addedChatLogs > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">聊天记录:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.addedChatLogs}
                        </strong>
                      </div>
                    )}
                    {importReport.addedPlugins > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">ST插件:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.addedPlugins}
                        </strong>
                      </div>
                    )}
                    {importReport.addedScripts > 0 && (
                      <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-emerald-200/50 dark:border-zinc-700">
                        <span className="text-zinc-500">ST脚本:</span>{' '}
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {importReport.addedScripts}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* File Notes */}
                  <div className="space-y-1 text-[10px] text-zinc-500 dark:text-zinc-400 max-h-32 overflow-y-auto">
                    {importReport.notes.map((note, idx) => (
                      <div key={idx}>{note}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-zinc-50 dark:bg-zinc-800">
          <BaseButton
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors order-2 sm:order-1 text-center"
          >
            关闭
          </BaseButton>

          {activeTab === 'export' && (
            <div className="flex items-center w-full sm:w-auto order-1 sm:order-2">
              {isExporting ? (
                <BaseButton
                  type="button"
                  onClick={handleInterruptExport}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>中断导出</span>
                </BaseButton>
              ) : (
                <BaseButton
                  type="button"
                  onClick={handleStartExport}
                  className={`w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl ${
                    exportFormat === 'zip'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white text-[10px] font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {exportFormat === 'zip'
                      ? '立即生成并下载全量 ZIP 归档包'
                      : `立即开始导出 (${batchMode === 'single' ? '单文件 JSON' : `分 ${estimatedPartsCount()} 卷 JSON`})`}
                  </span>
                </BaseButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
