import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GroupCategoryBar, CategoryFilterDropdown } from '../ui/GroupCategoryBar';
import { BatchTagModal } from '../ui/BatchTagModal';
import { TagFilterDropdown } from '../ui/TagFilterDropdown';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { DeleteConfirmationModal } from '../ui/UnifiedModal';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Upload,
  Download,
  Code2,
  Eye,
  Smartphone,
  Tablet,
  Laptop,
  RotateCw,
  Maximize2,
  Minimize2,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  Sun,
  Moon,
  Info,
  SlidersHorizontal,
  FileText,
  CheckSquare,
  Square,
  X,
  Save,
  CheckCircle2,
  Circle,
  Play,
  Terminal,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { AppData, HtmlStorageEntry } from '../../types';
import { sessionStore } from '../../utils/sessionStore';

interface MobileHtmlSectionProps {
  appData: AppData;
  updateAppData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  sortItemList?: <T>(items: T[], sortOrder: any, getName: (item: T) => string, getCreatedAt?: (item: T) => number) => T[];
}

// 预置精选实用 HTML 模板 (首次加载或快捷初始化推荐)
// 小手机 HTML 管理不再内置固定模板，列表只展示用户新增或导入的内容。
const BUILTIN_HTML_TEMPLATES: Partial<HtmlStorageEntry>[] = []
  padding: 12px;
  background: #18181b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f4f4f5;
}
.phone-hud-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 13px;
  font-weight: 600;
}
.hud-capsule {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}
.hud-right {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.hud-battery {
  width: 22px;
  height: 11px;
  border: 1.5px solid #f4f4f5;
  border-radius: 3px;
  padding: 1px;
  position: relative;
}
.hud-battery::after {
  content: '';
  position: absolute;
  right: -3px;
  top: 2.5px;
  width: 2px;
  height: 5px;
  background: #f4f4f5;
  border-radius: 0 1px 1px 0;
}
.battery-level {
  width: 85%;
  height: 100%;
  background: #10b981;
  border-radius: 1px;
}`,
    jsContent: `function updateTime() {
  const d = new Date();
  const el = document.getElementById('current-time');
  if (el) {
    el.textContent = d.toTimeString().slice(0, 5);
  }
}
setInterval(updateTime, 1000);
updateTime();`,
  },
  {
    title: '角色动态好感度与心境看板',
    type: 'widget',
    author: '社区精选',
    category: '看板组件',
    customTags: ['好感度', '动态看板', '心境', '互动'],
    description: '具有平滑过渡动画的角色心境与好感度条，点击交互增加亲密度，支持状态颜色智能跟随。',
    htmlContent: `<div class="affinity-card">
  <div class="affinity-header">
    <div class="avatar-ring">💖</div>
    <div>
      <div class="char-name">当前互动角色</div>
      <div class="char-mood">心境：微风拂面，略带期待</div>
    </div>
  </div>
  <div class="progress-box">
    <div class="progress-labels">
      <span>好感度 Lv.4</span>
      <span id="affinity-num">78%</span>
    </div>
    <div class="bar-track">
      <div id="bar-fill" class="bar-fill"></div>
    </div>
  </div>
  <button id="tap-heart-btn" class="interact-btn">✨ 赠送心意小礼物</button>
</div>`,
    cssContent: `body {
  margin: 0;
  padding: 16px;
  background: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f8fafc;
}
.affinity-card {
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
}
.affinity-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.avatar-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f43f5e, #fb7185);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.char-name {
  font-weight: 700;
  font-size: 15px;
}
.char-mood {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.progress-box {
  margin-bottom: 14px;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
}
.bar-track {
  height: 8px;
  background: #334155;
  border-radius: 6px;
  overflow: hidden;
}
.bar-fill {
  width: 78%;
  height: 100%;
  background: linear-gradient(90deg, #ec4899, #f43f5e);
  border-radius: 6px;
  transition: width 0.4s ease;
}
.interact-btn {
  width: 100%;
  padding: 10px;
  background: #f43f5e;
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}
.interact-btn:active {
  transform: scale(0.97);
}`,
    jsContent: `let val = 78;
const btn = document.getElementById('tap-heart-btn');
const fill = document.getElementById('bar-fill');
const txt = document.getElementById('affinity-num');

if (btn && fill && txt) {
  btn.addEventListener('click', () => {
    val = Math.min(100, val + 2);
    fill.style.width = val + '%';
    txt.textContent = val + '%';
    btn.textContent = val >= 100 ? '💖 亲密度已达羁绊上限！' : '✨ 亲密度 +2 (已生效)';
  });
}`,
  },
  {
    title: '仿 iOS 玻璃拟态对话气泡',
    type: 'bubble',
    author: '官方设计',
    category: '聊天气泡',
    customTags: ['聊天气泡', '玻璃拟态', 'iOS', '小手机'],
    description: '精致毛玻璃半透明聊天气泡，适配暗黑/明亮双主题背景，自适应字号与圆角。',
    htmlContent: `<div class="chat-thread">
  <div class="bubble bubble-incoming">
    <div class="sender">神秘访客</div>
    <div class="msg-text">你收到这封信件的时候，我想钟楼的齿轮已经重新转动了吧？</div>
    <div class="time">14:28</div>
  </div>
  <div class="bubble bubble-outgoing">
    <div class="msg-text">一切如你所料。但时间所剩无几，我们该在老地方碰面了。</div>
    <div class="time">14:30 · 已读</div>
  </div>
</div>`,
    cssContent: `body {
  margin: 0;
  padding: 16px;
  background: #09090b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #fafafa;
}
.chat-thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px;
  backdrop-filter: blur(16px);
  position: relative;
  font-size: 13px;
  line-height: 1.45;
}
.bubble-incoming {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom-left-radius: 4px;
}
.bubble-outgoing {
  align-self: flex-end;
  background: linear-gradient(135deg, #0284c7, #2563eb);
  border-bottom-right-radius: 4px;
}
.sender {
  font-size: 11px;
  color: #38bdf8;
  font-weight: 700;
  margin-bottom: 3px;
}
.time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  margin-top: 4px;
}`,
    jsContent: ``,
  },
];

export const MobileHtmlSection: React.FC<MobileHtmlSectionProps> = ({
  appData,
  updateAppData,
  showToast,
  sortItemList,
}) => {
  // 筛选检索状态
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    return sessionStore.mobileHtml?.categoryFilter || '全部分组';
  });
  const [tagFilter, setTagFilter] = useState<string[]>(() => {
    return sessionStore.mobileHtml?.tagFilter || [];
  });
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    return sessionStore.mobileHtml?.searchQuery || '';
  });
  const [sortOrder, setSortOrder] = useState<'default' | 'az' | 'za' | 'newest' | 'oldest'>(() => {
    return sessionStore.mobileHtml?.sortOrder || 'default';
  });
  const [typeFilter, setTypeFilter] = useState<'all' | 'hud' | 'widget' | 'bubble' | 'page'>('all');

  // 同步 sessionStore
  useEffect(() => {
    if (!sessionStore.mobileHtml) {
      sessionStore.mobileHtml = {
        categoryFilter: '全部分组',
        tagFilter: [],
        searchQuery: '',
        sortOrder: 'default',
      };
    }
    sessionStore.mobileHtml.categoryFilter = categoryFilter;
    sessionStore.mobileHtml.tagFilter = tagFilter;
    sessionStore.mobileHtml.searchQuery = searchQuery;
    sessionStore.mobileHtml.sortOrder = sortOrder;
  }, [categoryFilter, tagFilter, searchQuery, sortOrder]);

  // 批量模式
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchTagModal, setShowBatchTagModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 详情弹窗状态 (点击卡片直接进入详情界面)
  const [activeHtml, setActiveHtml] = useState<HtmlStorageEntry | null>(null);
  const [detailTab, setDetailTab] = useState<'preview' | 'html' | 'css' | 'js' | 'info'>('preview');

  // 预览沙箱模式状态 (视口宽度控制与深浅色模式)
  const [viewportMode, setViewportMode] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [previewKey, setPreviewKey] = useState<number>(0);

  // 新增弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHtmlForm, setNewHtmlForm] = useState<Partial<HtmlStorageEntry>>({
    title: '',
    type: 'widget',
    category: '默认',
    author: '',
    description: '',
    htmlContent: '',
    cssContent: '',
    jsContent: '',
    customTags: [],
  });

  // 分组管理弹窗
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // 批量移动弹窗
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchMoveTarget, setBatchMoveTarget] = useState('默认');

  // 3-step 删除确认
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    itemCount: number;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    itemCount: 1,
    onConfirm: () => {},
  });

  const requestDelete = (message: string, itemCount: number, onConfirm: () => void) => {
    setDeleteConfirmConfig({
      isOpen: true,
      message,
      itemCount,
      onConfirm,
    });
  };

  // 文件导入 Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 数据列表：只展示用户新增或导入的 HTML 资源。
  const htmlList = useMemo(() => {
    return appData.htmlStorages || [];
  }, [appData.htmlStorages]);

  // 分组与标签
  const categories = useMemo(() => {
    const custom = appData.htmlStorageCategories || ['默认'];
    const fromItems = htmlList.map((h) => h.category || '默认');
    return Array.from(new Set(['默认', ...custom, ...fromItems]));
  }, [appData.htmlStorageCategories, htmlList]);

  const customTags = useMemo(() => {
    return Array.from(new Set([...(appData.htmlStorageTags || []), ...htmlList.flatMap((h) => h.customTags || [])]));
  }, [appData.htmlStorageTags, htmlList]);

  // 筛选与排序
  const filteredList = useMemo(() => {
    return htmlList.filter((item) => {
      // 1. 类型筛选
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      // 2. 分组筛选
      if (categoryFilter !== '全部分组' && (item.category || '默认') !== categoryFilter) return false;

      // 3. 标签筛选
      if (tagFilter.length > 0) {
        const itemTags = item.customTags || [];
        const hasAll = tagFilter.every((t) => itemTags.includes(t));
        if (!hasAll) return false;
      }

      // 4. 搜索检索
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inAuthor = (item.author || '').toLowerCase().includes(q);
        const inDesc = (item.description || '').toLowerCase().includes(q);
        const inHtml = (item.htmlContent || '').toLowerCase().includes(q);
        const inCss = (item.cssContent || '').toLowerCase().includes(q);
        const inCategory = (item.category || '').toLowerCase().includes(q);
        const inTags = (item.customTags || []).some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inAuthor && !inDesc && !inHtml && !inCss && !inCategory && !inTags) {
          return false;
        }
      }

      return true;
    });
  }, [htmlList, typeFilter, categoryFilter, tagFilter, searchQuery]);

  const sortedList = useMemo(() => {
    if (sortItemList) {
      return sortItemList(
        filteredList,
        sortOrder,
        (h) => h.title || '',
        (h) => h.updatedAt || h.createdAt || 0
      );
    }
    const list = [...filteredList];
    if (sortOrder === 'az') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortOrder === 'za') {
      list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (sortOrder === 'newest') {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }
    return list;
  }, [filteredList, sortOrder, sortItemList]);

  // 生成沙箱实时运行源码
  const generateSandboxedDoc = (entry: HtmlStorageEntry | null) => {
    if (!entry) return '';
    const { htmlContent = '', cssContent = '', jsContent = '' } = entry;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: ${previewTheme === 'dark' ? '#09090b' : '#ffffff'};
      color: ${previewTheme === 'dark' ? '#f4f4f5' : '#09090b'};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
  <script>
    try {
      ${jsContent}
    } catch(err) {
      console.warn("Script error in preview:", err);
    }
  <\/script>
</body>
</html>`;
  };

  // 单条导出 HTML 文件
  const handleExportSingleHtml = (item: HtmlStorageEntry) => {
    const fullHtml = generateSandboxedDoc(item);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title || '小手机组件'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`已导出「${item.title}」单文件`, 'success');
  };

  // 批量导出
  const handleBatchExport = () => {
    const targets = selectedIds.length > 0 ? htmlList.filter((h) => selectedIds.includes(h.id)) : filteredList;
    if (targets.length === 0) {
      showToast('没有可导出的 HTML 资源', 'info');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targets, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `小手机HTML资源集合_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`已批量导出 ${targets.length} 个 HTML 资源`, 'success');
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      showToast('请先选择要删除的 HTML 资源', 'info');
      return;
    }
    requestDelete(`确定要批量删除选中的 ${selectedIds.length} 个 HTML 资源吗？`, selectedIds.length, () => {
      updateAppData((prev) => ({
        ...prev,
        htmlStorages: (prev.htmlStorages || htmlList).filter((h) => !selectedIds.includes(h.id)),
      }));
      setSelectedIds([]);
      setBatchMode(false);
      showToast(`已批量删除 ${selectedIds.length} 个 HTML 资源`, 'info');
    });
  };

  // 批量移动分组
  const handleConfirmBatchMove = () => {
    if (selectedIds.length === 0 || !batchMoveTarget) return;
    updateAppData((prev) => ({
      ...prev,
      htmlStorages: (prev.htmlStorages || htmlList).map((h) =>
        selectedIds.includes(h.id) ? { ...h, category: batchMoveTarget } : h
      ),
    }));
    setShowBatchMoveModal(false);
    setSelectedIds([]);
    setBatchMode(false);
    showToast(`已将选中的 HTML 资源移动到分组「${batchMoveTarget}」`, 'success');
  };

  // 新建分组
  const handleCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      showToast('分组名称不能为空', 'error');
      return;
    }
    if (categories.includes(trimmed)) {
      showToast('该分组已存在', 'info');
      return;
    }
    updateAppData((prev) => ({
      ...prev,
      htmlStorageCategories: [...(prev.htmlStorageCategories || ['默认']), trimmed],
    }));
    setNewGroupName('');
    setShowNewGroupModal(false);
    setCategoryFilter(trimmed);
    showToast(`成功创建分组「${trimmed}」`, 'success');
  };

  // 专属文件导入处理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let addedList: HtmlStorageEntry[] = [];
    const promises: Promise<void>[] = [];

    Array.from(files).forEach((file) => {
      promises.push(
        file.text().then((text) => {
          try {
            if (file.name.endsWith('.json')) {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) {
                parsed.forEach((item, idx) => {
                  addedList.push({
                    id: `mob_html_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
                    title: item.title || item.name || `${file.name.replace(/\.[^/.]+$/, '')}_${idx + 1}`,
                    type: item.type || 'widget',
                    author: item.author || '导入文件',
                    category: item.category || (categoryFilter !== '全部分组' ? categoryFilter : '默认'),
                    customTags: item.customTags || item.tags || ['JSON导入'],
                    description: item.description || '',
                    htmlContent: item.htmlContent || '',
                    cssContent: item.cssContent || '',
                    jsContent: item.jsContent || '',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                });
                return;
              } else if (parsed && typeof parsed === 'object') {
                addedList.push({
                  id: `mob_html_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                  title: parsed.title || parsed.name || file.name.replace(/\.[^/.]+$/, ''),
                  type: parsed.type || 'widget',
                  author: parsed.author || '导入文件',
                  category: parsed.category || (categoryFilter !== '全部分组' ? categoryFilter : '默认'),
                  customTags: parsed.customTags || parsed.tags || ['JSON导入'],
                  description: parsed.description || '',
                  htmlContent: parsed.htmlContent || '',
                  cssContent: parsed.cssContent || '',
                  jsContent: parsed.jsContent || '',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
                return;
              }
            }

            // 直接识别 .html / .htm / .txt 文件
            addedList.push({
              id: `mob_html_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              title: file.name.replace(/\.[^/.]+$/, ''),
              type: 'page',
              author: '导入文件',
              category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
              customTags: ['HTML导入'],
              description: `从 ${file.name} 导入的 HTML 视窗资源 (${text.length} 字符)`,
              htmlContent: text,
              cssContent: '',
              jsContent: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } catch {
            addedList.push({
              id: `mob_html_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              title: file.name.replace(/\.[^/.]+$/, ''),
              type: 'widget',
              author: '导入',
              category: '默认',
              htmlContent: text,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        })
      );
    });

    Promise.all(promises).then(() => {
      if (addedList.length > 0) {
        updateAppData((prev) => ({
          ...prev,
          htmlStorages: [...addedList, ...(prev.htmlStorages || htmlList)],
        }));
        showToast(`成功导入 ${addedList.length} 个 HTML 资源`, 'success');
      } else {
        showToast('未能识别有效 HTML 文档', 'error');
      }
    });

    e.target.value = '';
  };

  // 保存新建 HTML 资源
  const handleSaveNewHtml = () => {
    if (!newHtmlForm.title?.trim()) {
      showToast('请输入 HTML 资源标题', 'error');
      return;
    }

    const newEntry: HtmlStorageEntry = {
      id: `mob_html_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newHtmlForm.title.trim(),
      type: newHtmlForm.type || 'widget',
      category: newHtmlForm.category || '默认',
      author: newHtmlForm.author || '',
      description: newHtmlForm.description || '',
      htmlContent: newHtmlForm.htmlContent || '<div class="custom-card">Hello World</div>',
      cssContent: newHtmlForm.cssContent || '.custom-card { padding: 16px; border-radius: 12px; }',
      jsContent: newHtmlForm.jsContent || '',
      customTags: newHtmlForm.customTags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    updateAppData((prev) => ({
      ...prev,
      htmlStorages: [newEntry, ...(prev.htmlStorages || htmlList)],
    }));

    setShowAddModal(false);
    showToast(`成功创建 HTML 资源「${newEntry.title}」`, 'success');

    // 自动打开该资源的详情界面
    setActiveHtml(newEntry);
    setDetailTab('preview');
  };

  // 保存详情编辑修改
  const handleSaveActiveHtml = (updated: HtmlStorageEntry) => {
    const toSave: HtmlStorageEntry = {
      ...updated,
      updatedAt: Date.now(),
    };
    updateAppData((prev) => ({
      ...prev,
      htmlStorages: (prev.htmlStorages || htmlList).map((h) => (h.id === toSave.id ? toSave : h)),
    }));
    setActiveHtml(toSave);
    setPreviewKey((k) => k + 1);
    showToast(`已保存「${toSave.title}」修改并刷新沙箱`, 'success');
  };

  // 删除单项 HTML
  const handleDeleteHtml = (item: HtmlStorageEntry) => {
    requestDelete(`确定要删除 HTML 资源「${item.title}」吗？`, 1, () => {
      updateAppData((prev) => ({
        ...prev,
        htmlStorages: (prev.htmlStorages || htmlList).filter((h) => h.id !== item.id),
      }));
      if (activeHtml?.id === item.id) {
        setActiveHtml(null);
      }
      showToast(`已删除 HTML「${item.title}」`, 'info');
    });
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-5">
      {/* 隐藏文件导入 input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".html,.htm,.txt,.json"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          1. 顶部 Header Banner (严格参照 ST 分界面规范)
         ══════════════════════════════════════════════════════════════════════ */}
      <div
        data-design-id="mobile-html-header-banner"
        className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]"
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">
                小手机 HTML 管理
              </h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式：.html / .htm / .json
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              管理小手机交互式 HTML 视窗、状态栏小部件、聊天气泡模板与动态互动微应用
            </p>
          </div>
        </div>

        {/* 右侧操作按钮：导入与新建 */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
            title="导入 HTML 文件 (.html, .htm, .json)"
          >
            <Upload className="w-3 h-3" />
            <span>导入 HTML 文件</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setNewHtmlForm({
                title: '',
                type: 'widget',
                category: categoryFilter !== '全部分组' ? categoryFilter : '默认',
                author: '',
                description: '',
                htmlContent: '<div class="custom-card">\n  <h3>Hello World</h3>\n  <p>小手机自定义微应用视窗</p>\n</div>',
                cssContent: '.custom-card {\n  padding: 16px;\n  border-radius: 16px;\n  background: rgba(255, 255, 255, 0.08);\n  border: 1px solid rgba(255, 255, 255, 0.15);\n}',
                jsContent: '',
                customTags: [],
              });
              setShowAddModal(true);
            }}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>新建 HTML</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. 搜索与控制工具栏 (参考 ST Plugins / Presets 标准规范)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2.5 mb-6">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索 HTML 标题、代码内容、作者、分类或标签…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 筛选与操作按键行 */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <CategoryFilterDropdown
            groups={categories}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            allGroupName="全部分组"
          />

          <TagFilterDropdown
            builtInTags={[]}
            customTags={customTags}
            selectedTags={tagFilter}
            onChange={setTagFilter}
          />

          {/* 组件类型快捷下拉 */}
          <CustomSelect
            value={typeFilter}
            onChange={(val: any) => setTypeFilter(val)}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'hud', label: '状态栏 HUD' },
              { value: 'widget', label: '挂件 Widget' },
              { value: 'bubble', label: '聊天气泡' },
              { value: 'page', label: '视窗页面' },
            ]}
            className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
          />

          {/* 排序下拉 */}
          <CustomSelect
            value={sortOrder}
            onChange={(val: any) => setSortOrder(val)}
            options={[
              { value: 'default', label: '默认排序' },
              { value: 'newest', label: '最新添加' },
              { value: 'oldest', label: '最早添加' },
              { value: 'az', label: '名称 A-Z' },
              { value: 'za', label: '名称 Z-A' },
            ]}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
          />

          {/* ST 标准选择按键 */}
          <button
            type="button"
            onClick={() => {
              setBatchMode((prev) => {
                if (prev) setSelectedIds([]);
                return !prev;
              });
            }}
            title={batchMode ? '退出批量选择' : '开启多选模式'}
            className={`relative flex items-center gap-1.5 rounded-lg px-2.5 h-[30px] transition-all duration-200 cursor-pointer flex-shrink-0 text-[10px] font-medium border-0 border-b active:bg-black/10 dark:active:bg-white/15 ${
              batchMode
                ? 'bg-amber-500 text-white border-b-amber-600 shadow-xs'
                : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-[var(--text-serif,#3f3f46)] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="leading-none">{batchMode ? '完成' : '选择'}</span>
          </button>
        </div>

        {/* 分组导航栏 (GroupCategoryBar) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 w-full">
          <GroupCategoryBar
            groups={categories}
            currentGroup={categoryFilter}
            onSelectGroup={setCategoryFilter}
            getCount={(g) =>
              htmlList.filter((h) => (g === '全部分组' || (h.category || '默认') === g)).length
            }
            totalCount={htmlList.length}
            allGroupName="全部分组"
            onAddGroup={() => setShowNewGroupModal(true)}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. 批量操作悬浮卡片 (ST 统一规范: batch-floating-card)
         ══════════════════════════════════════════════════════════════════════ */}
      {batchMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-4xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          <div className="batch-floating-card py-[5px] px-[8px] flex flex-col gap-[4px]">
            <div className="flex items-center justify-between w-full">
              <span className="text-[9px] font-medium text-zinc-700 dark:text-zinc-300 tracking-wide leading-none">
                已选 {selectedIds.length} 项
              </span>
              <span
                role="button"
                onClick={() => {
                  setBatchMode(false);
                  setSelectedIds([]);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[4px] w-full mt-1">
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length === sortedList.length && sortedList.length > 0) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(sortedList.map((p) => p.id));
                  }
                }}
                className="batch-btn"
              >
                {selectedIds.length === sortedList.length && sortedList.length > 0 ? '取消' : '全选'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const currentSet = new Set(selectedIds);
                  const inversed = sortedList.filter((p) => !currentSet.has(p.id)).map((p) => p.id);
                  setSelectedIds(inversed);
                }}
                className="batch-btn"
              >
                反选
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    showToast('请先选择要移动的 HTML 资源', 'info');
                    return;
                  }
                  setShowBatchMoveModal(true);
                }}
                className="batch-btn batch-btn-primary"
              >
                移动
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    showToast('请先选择要设置标签的 HTML 资源', 'info');
                    return;
                  }
                  setShowBatchTagModal(true);
                }}
                className="batch-btn batch-btn-primary"
              >
                标签
              </button>

              <button
                type="button"
                onClick={handleBatchExport}
                className="batch-btn batch-btn-primary"
              >
                导出
              </button>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="batch-btn batch-btn-danger"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          4. HTML 卡片列表 (点击卡片直接进入详情界面)
         ══════════════════════════════════════════════════════════════════════ */}
      {sortedList.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
          <div className="w-10 h-10 mx-auto rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
            <Code2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {searchQuery ? '未找到匹配的 HTML 资源' : '暂无 HTML 视窗资源'}
          </p>
          <p className="text-[10px] text-zinc-400">
            点击右上角「新建 HTML」或「导入 HTML 文件」开始收录组件
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedList.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const totalLines = (item.htmlContent || '').split('\n').length;
            const typeLabel =
              item.type === 'hud'
                ? '状态栏 HUD'
                : item.type === 'bubble'
                ? '聊天气泡'
                : item.type === 'page'
                ? '视窗页面'
                : '挂件 Widget';

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (batchMode) {
                    setSelectedIds((prev) =>
                      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                    );
                  } else {
                    // 点击卡片直接进入详情界面
                    setActiveHtml(item);
                    setDetailTab('preview');
                  }
                }}
                className={`bg-white dark:bg-zinc-900 border rounded-xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col h-full justify-between cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* 顶行：图标、标题、类型、分组、批选框 */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <Code2 className="w-4 h-4 text-violet-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={item.title}>
                        {item.title}
                      </h3>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[60px] flex-shrink-0">
                        {item.category || '默认'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-300/40">
                        {typeLabel}
                      </span>
                      <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                        {totalLines} 行代码
                      </span>
                      {item.author && (
                        <span className="text-[9px] text-zinc-400 truncate max-w-[90px]">
                          作者: {item.author}
                        </span>
                      )}
                    </div>
                  </div>

                  {batchMode && (
                    <div className="flex-shrink-0 ml-1">
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-500 fill-white dark:fill-zinc-900" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </div>
                  )}
                </div>

                {/* 描述说明 */}
                <div className="flex-1 mt-2.5 flex flex-col justify-center">
                  {item.description ? (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed bg-zinc-50/70 dark:bg-zinc-800/40 p-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 font-sans">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-400 italic">（暂无描述说明）</p>
                  )}
                </div>

                {/* 标签行 */}
                <div className="flex items-center gap-2 min-w-0 mt-2">
                  {item.customTags && item.customTags.length > 0 && (
                    <div className="flex-1 min-w-0">
                      <TagEditor
                        customTags={item.customTags || []}
                        onChange={(newTags) => {
                          const updated = { ...item, customTags: newTags };
                          updateAppData((prev) => ({
                            ...prev,
                            htmlStorages: (prev.htmlStorages || htmlList).map((h) =>
                              h.id === item.id ? updated : h
                            ),
                          }));
                        }}
                        availableTags={customTags}
                        maxDisplay={2}
                      />
                    </div>
                  )}
                </div>

                {/* 底部微操作栏 */}
                <div className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px]">
                  <span className="text-[9px] text-zinc-400">
                    {item.htmlContent?.length || 0} 字符
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.htmlContent || '');
                        setCopiedId(item.id);
                        showToast('已复制代码！', 'success');
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="px-2 py-0.5 text-[9px] rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="复制 HTML 源码"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === item.id ? '已复制' : '复制'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveHtml(item);
                        setDetailTab('preview');
                      }}
                      className="px-2 py-0.5 text-[9px] rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3 h-3 text-violet-500" />
                      <span>预览详情</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteHtml(item)}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded-md cursor-pointer transition-colors"
                      title="删除资源"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          5. 【核心要求】点击卡片后的全功能详情界面 (参考 ST 规范)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeHtml && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveHtml(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="file-detail-modal modal-panel modal-card relative z-10 w-full max-w-5xl h-[92vh] bg-[#fafafa] dark:bg-[#09090b] flex flex-col overflow-hidden rounded-2xl border border-[var(--line,#e6e3dd)] dark:border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--line,#e6e3dd)] dark:border-zinc-800 flex flex-col gap-1.5 flex-shrink-0 bg-black/5 dark:bg-white/5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Code2 className="w-4 h-4 text-violet-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeHtml.title}
                  </h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-300/40 whitespace-nowrap shrink-0">
                    {activeHtml.type === 'hud'
                      ? '状态栏 HUD'
                      : activeHtml.type === 'bubble'
                      ? '聊天气泡'
                      : activeHtml.type === 'page'
                      ? '视窗页面'
                      : '挂件 Widget'}
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0">
                    {activeHtml.category || '默认'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleExportSingleHtml(activeHtml)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">导出 HTML</span>
                  </button>
                  <span
                    role="button"
                    onClick={() => setActiveHtml(null)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Row 2: 元数据统计 + 实时标签编辑 */}
              <div className="flex items-center justify-between gap-2 min-w-0 text-[10px] text-zinc-500">
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden py-0.5">
                  <span className="whitespace-nowrap shrink-0 text-zinc-500 dark:text-zinc-400">
                    HTML {activeHtml.htmlContent?.length || 0} 字 · CSS {activeHtml.cssContent?.length || 0} 字 · JS {activeHtml.jsContent?.length || 0} 字
                  </span>
                  <TagEditor
                    customTags={activeHtml.customTags || []}
                    availableTags={customTags}
                    maxDisplay={3}
                    onChange={(newTags) => {
                      const updated = { ...activeHtml, customTags: newTags };
                      handleSaveActiveHtml(updated);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 详情标签栏 (Tabs Bar) */}
            <div className="tab-nav-bar flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 bg-white dark:bg-zinc-900 gap-1 overflow-x-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setDetailTab('preview')}
                className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  detailTab === 'preview'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>实时沙箱预览</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('html')}
                className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  detailTab === 'html'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                HTML 结构
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('css')}
                className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  detailTab === 'css'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                CSS 样式
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('js')}
                className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  detailTab === 'js'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                JS 脚本
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('info')}
                className={`py-2.5 px-3 text-[10px] font-semibold border-b transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  detailTab === 'info'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                属性与信息
              </button>
            </div>

            {/* 详情内容区 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Tab 1: 实时沙箱预览 */}
              {detailTab === 'preview' && (
                <div className="flex flex-col h-full space-y-3">
                  {/* 视口与预览控制条 */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-medium">视口尺寸:</span>
                      <button
                        type="button"
                        onClick={() => setViewportMode('mobile')}
                        className={`px-2 py-1 text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                          viewportMode === 'mobile'
                            ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 font-bold shadow-xs'
                            : 'text-zinc-500'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>手机 (375px)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewportMode('tablet')}
                        className={`px-2 py-1 text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                          viewportMode === 'tablet'
                            ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 font-bold shadow-xs'
                            : 'text-zinc-500'
                        }`}
                      >
                        <Tablet className="w-3 h-3" />
                        <span>平板 (640px)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewportMode('desktop')}
                        className={`px-2 py-1 text-[10px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors ${
                          viewportMode === 'desktop'
                            ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 font-bold shadow-xs'
                            : 'text-zinc-500'
                        }`}
                      >
                        <Laptop className="w-3 h-3" />
                        <span>自适应 (100%)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                        className="px-2 py-1 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                        title="切换明亮/深色底色"
                      >
                        {previewTheme === 'dark' ? <Moon className="w-3 h-3 text-amber-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
                        <span>{previewTheme === 'dark' ? '暗黑背景' : '明亮背景'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewKey((k) => k + 1)}
                        className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                        title="重新加载沙箱运行"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 视口展示框架 */}
                  <div className="flex-1 min-h-[380px] bg-zinc-200/50 dark:bg-zinc-950/60 rounded-xl p-3 flex items-center justify-center overflow-auto border border-zinc-200 dark:border-zinc-800">
                    <div
                      className={`h-full min-h-[360px] bg-white dark:bg-zinc-900 rounded-xl shadow-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 transition-all ${
                        viewportMode === 'mobile'
                          ? 'w-[375px]'
                          : viewportMode === 'tablet'
                          ? 'w-[640px]'
                          : 'w-full'
                      }`}
                    >
                      <iframe
                        key={previewKey}
                        title="Sandbox Preview"
                        srcDoc={generateSandboxedDoc(activeHtml)}
                        sandbox="allow-scripts allow-modals"
                        className="w-full h-full min-h-[360px] border-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: HTML 结构代码编辑 */}
              {detailTab === 'html' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4" />
                      <span>HTML 模板内容 (DOM 结构)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeHtml.htmlContent || '');
                        showToast('已复制 HTML 源码', 'success');
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制代码</span>
                    </button>
                  </div>
                  <textarea
                    rows={16}
                    value={activeHtml.htmlContent || ''}
                    onChange={(e) => setActiveHtml({ ...activeHtml, htmlContent: e.target.value })}
                    placeholder="在此编写 HTML 视窗结构代码..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 3: CSS 样式代码编辑 */}
              {detailTab === 'css' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>CSS 样式表 (Custom Styles)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeHtml.cssContent || '');
                        showToast('已复制 CSS 样式', 'success');
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制样式</span>
                    </button>
                  </div>
                  <textarea
                    rows={16}
                    value={activeHtml.cssContent || ''}
                    onChange={(e) => setActiveHtml({ ...activeHtml, cssContent: e.target.value })}
                    placeholder="在此编写组件专属 CSS 样式规则..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 4: JS 交互脚本编辑 */}
              {detailTab === 'js' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4" />
                      <span>JavaScript 交互脚本 (Vanilla JS)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeHtml.jsContent || '');
                        showToast('已复制 JS 脚本', 'success');
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制脚本</span>
                    </button>
                  </div>
                  <textarea
                    rows={16}
                    value={activeHtml.jsContent || ''}
                    onChange={(e) => setActiveHtml({ ...activeHtml, jsContent: e.target.value })}
                    placeholder="在此编写交互动作、时钟轮询、事件监听等 JavaScript 逻辑..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 5: 属性与信息 */}
              {detailTab === 'info' && (
                <div className="space-y-4 max-w-3xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        组件标题名称 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={activeHtml.title || ''}
                        onChange={(e) => setActiveHtml({ ...activeHtml, title: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        所属分组
                      </label>
                      <CustomSelect
                        value={activeHtml.category || '默认'}
                        onChange={(val: any) => setActiveHtml({ ...activeHtml, category: val })}
                        options={categories.map((c) => ({ value: c, label: c }))}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        组件类型
                      </label>
                      <CustomSelect
                        value={activeHtml.type || 'widget'}
                        onChange={(val: any) => setActiveHtml({ ...activeHtml, type: val })}
                        options={[
                          { value: 'hud', label: '状态栏 HUD' },
                          { value: 'widget', label: '挂件 Widget' },
                          { value: 'bubble', label: '聊天气泡' },
                          { value: 'page', label: '视窗页面' },
                        ]}
                        className="w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        作者 / 开发者
                      </label>
                      <input
                        type="text"
                        value={activeHtml.author || ''}
                        onChange={(e) => setActiveHtml({ ...activeHtml, author: e.target.value })}
                        placeholder="作者昵称"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      详细描述与使用说明
                    </label>
                    <textarea
                      rows={3}
                      value={activeHtml.description || ''}
                      onChange={(e) => setActiveHtml({ ...activeHtml, description: e.target.value })}
                      placeholder="介绍此 HTML 组件的功能、适用的小手机页面位置等..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 详情页底部操作栏 (Footer) */}
            <div className="p-4 border-t border-[var(--line,#e6e3dd)] dark:border-zinc-800 bg-black/5 dark:bg-white/5 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveHtml(null)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 cursor-pointer"
              >
                关闭
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteHtml(activeHtml)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                >
                  删除组件
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveActiveHtml(activeHtml)}
                  className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent,#8C2F2D)] hover:opacity-90 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存修改并更新</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          6. 新增 HTML 模态框 (showAddModal)
         ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-black/5 dark:bg-white/5">
              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--accent,#8C2F2D)]" />
                <span>新建小手机 HTML 资源</span>
              </h3>
              <span
                role="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </span>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  资源标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newHtmlForm.title || ''}
                  onChange={(e) => setNewHtmlForm({ ...newHtmlForm, title: e.target.value })}
                  placeholder="例如：小手机动态音乐播放小部件"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    组件类型
                  </label>
                  <CustomSelect
                    value={newHtmlForm.type || 'widget'}
                    onChange={(val: any) => setNewHtmlForm({ ...newHtmlForm, type: val })}
                    options={[
                      { value: 'hud', label: '状态栏 HUD' },
                      { value: 'widget', label: '挂件 Widget' },
                      { value: 'bubble', label: '聊天气泡' },
                      { value: 'page', label: '视窗页面' },
                    ]}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    所属分组
                  </label>
                  <CustomSelect
                    value={newHtmlForm.category || '默认'}
                    onChange={(val: any) => setNewHtmlForm({ ...newHtmlForm, category: val })}
                    options={categories.map((c) => ({ value: c, label: c }))}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  初始 HTML 结构
                </label>
                <textarea
                  rows={4}
                  value={newHtmlForm.htmlContent || ''}
                  onChange={(e) => setNewHtmlForm({ ...newHtmlForm, htmlContent: e.target.value })}
                  placeholder="<div>...</div>"
                  className="w-full p-2.5 font-mono text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  简要描述
                </label>
                <input
                  type="text"
                  value={newHtmlForm.description || ''}
                  onChange={(e) => setNewHtmlForm({ ...newHtmlForm, description: e.target.value })}
                  placeholder="简述组件用途"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-black/5 dark:bg-white/5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveNewHtml}
                className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent,#8C2F2D)] text-white shadow-xs"
              >
                创建并打开详情
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          7. 批量移动与分组模态框
         ══════════════════════════════════════════════════════════════════════ */}
      {showBatchMoveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowBatchMoveModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              批量移动 HTML 资源至分组
            </h3>
            <CustomSelect
              value={batchMoveTarget}
              onChange={(val) => setBatchMoveTarget(val)}
              options={categories.map((c) => ({ value: c, label: c }))}
              className="w-full text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchMoveModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchMove}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent,#8C2F2D)] text-white"
              >
                确认移动
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建分组弹窗 */}
      {showNewGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-zinc-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowNewGroupModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              新建 HTML 资源分组
            </h3>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="输入新分组名称"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--accent,#8C2F2D)] text-white"
              >
                创建分组
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量打标签 Modal */}
      <BatchTagModal
        isOpen={showBatchTagModal}
        onClose={() => setShowBatchTagModal(false)}
        selectedCount={selectedIds.length}
        availableTags={customTags}
        onApply={(tagsToAdd: string[]) => {
          updateAppData((prev) => ({
            ...prev,
            htmlStorages: (prev.htmlStorages || htmlList).map((h) => {
              if (selectedIds.includes(h.id)) {
                const existing = h.customTags || [];
                const merged = Array.from(new Set([...existing, ...tagsToAdd]));
                return { ...h, customTags: merged };
              }
              return h;
            }),
            htmlStorageTags: Array.from(new Set([...(prev.htmlStorageTags || []), ...tagsToAdd])),
          }));
          setShowBatchTagModal(false);
          showToast('已成功为选中的 HTML 资源附加标签', 'success');
        }}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmConfig.isOpen}
        onClose={() => setDeleteConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmConfig.onConfirm}
        message={deleteConfirmConfig.message}
        itemCount={deleteConfirmConfig.itemCount}
      />
    </div>
  );
};
