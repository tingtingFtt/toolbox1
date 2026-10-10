import React from 'react';
import {
  Sparkles,
  Users,
  Book,
  BookOpen,
  Code2,
  Puzzle,
  MessageSquare,
  Smartphone,
  Palette,
  Sliders,
  Type,
  FileText,
  Smile,
  Key,
  ArrowRight,
  Download,
  Upload,
  Dices,
  Image as ImageIcon,
} from 'lucide-react';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { BaseBadge } from '../ui/BaseBadge';
import { ViewModeDropdown } from '../ui/ViewModeDropdown';
import { ManagementGrid } from '../ui/ManagementChrome';
import { managementViewClass } from '../ui/ManagementListItem';
import { AppData } from '../../types';
import { getCardDisplayName, getCardCreator, getCardDescription } from '../../utils';

interface HomeSectionProps {
  cardViewMode: "grid-3" | "grid-4" | "grid-5" | "list";
  setCardViewMode: (v: "grid-3" | "grid-4" | "grid-5" | "list") => void;
  appData: AppData;
  onNavigate: (pageId: string) => void;
  onOpenCardDetail: (cardId: string) => void;
  onDrawRandomCard: () => void;
  onDrawRandomNormalCard: () => void;
  recentNormalCards: any[];
  onOpenBigDataExport: () => void;
  onOpenImportCenter: () => void;
  onTriggerExport: () => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  appData,
  onNavigate,
  onOpenCardDetail,
  onDrawRandomCard,
  onDrawRandomNormalCard,
  recentNormalCards,
  onOpenBigDataExport,
  onOpenImportCenter,
  cardViewMode,
  setCardViewMode,
}) => {
  const cards = appData.cards || [];
  const worldBooks = appData.stWorldBooks || [];
  const regexScripts = appData.stRegexScripts || [];
  const chatLogs = appData.chatLogs || [];
  const plugins = appData.plugins || [];
  const scripts = appData.scripts || [];
  const presets = appData.presets || [];
  const themes = appData.themes || [];
  const phoneLinks = appData.phoneLinks || [];
  const normalCards = appData.normalCards || [];
  const stickers = appData.stickerPacks || [];
  const apis = appData.apis || [];
  const fonts = appData.fonts || [];
  const extraStories = appData.extraStories || [];
  const mobileWorldBooks = appData.worldBooks || [];
  const mobileThemes = appData.beautifications || [];
  const chatMemes = appData.chatMemes || [];
  const userPersonas = appData.userPersonas || [];
  const backgroundImages = appData.backgroundImages || [];
  const cardCovers = appData.cardCovers || [];
  const mobilePresets = appData.mobilePresets || [];
  const htmlStorages = appData.htmlStorages || [];

  // 获取最新导入的卡片（按导入/更新/创建时间倒序排；时间相同或未有时，按在数据数组后方位置优先，确保严格展示最新导入的 5 张卡片）
  const recentCards = React.useMemo(() => {
    if (!cards || cards.length === 0) return [];
    return [...cards]
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const timeA = (a.item as any)?.importedAt || (a.item as any)?.updatedAt || (a.item as any)?.createdAt || 0;
        const timeB = (b.item as any)?.importedAt || (b.item as any)?.updatedAt || (b.item as any)?.createdAt || 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return b.index - a.index;
      })
      .map((entry) => entry.item)
      .slice(0, 5);
  }, [cards]);

  const recentNormalCardsToDisplay = React.useMemo(() => {
    const list = (recentNormalCards && recentNormalCards.length > 0) ? recentNormalCards : normalCards;
    if (!list || list.length === 0) return [];
    return [...list]
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const timeA = (a.item as any)?.importedAt || (a.item as any)?.updatedAt || (a.item as any)?.createdAt || 0;
        const timeB = (b.item as any)?.importedAt || (b.item as any)?.updatedAt || (b.item as any)?.createdAt || 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return b.index - a.index;
      })
      .map((entry) => entry.item)
      .slice(0, 5);
  }, [recentNormalCards, normalCards]);

  // SillyTavern 酒馆模块配置
  
  const [activeTab, setActiveTab] = React.useState<'st' | 'mobile'>('st');
  const [moduleViewMode, setModuleViewMode] = React.useState<'grid' | 'list'>('list');

  const ST_MODULES = [
    {
      id: 'st-cards',
      title: 'ST 角色卡',
      desc: 'PNG/JSON 卡片导入、编辑、分组与命运抽卡',
      count: cards.length,
      unit: '张',
      icon: Users,
      tag: '核心',
    },
    {
      id: 'st-themes',
      title: 'ST 主题',
      desc: 'UI 配色、CSS 美化包与酒馆样式模板',
      count: themes.length,
      unit: '套',
      icon: Palette,
    },
    {
      id: 'st-presets',
      title: 'ST 预设',
      desc: 'AI 提示词、温度与生成参数设定预设',
      count: presets.length,
      unit: '套',
      icon: Sliders,
    },
    {
      id: 'st-plugins',
      title: 'ST 插件',
      desc: '酒馆插件分类存储、快速安装与参数配置',
      count: plugins.length,
      unit: '个',
      icon: Puzzle,
    },
    {
      id: 'st-scripts',
      title: 'ST 脚本',
      desc: 'JS/QuickJS 扩展脚本、代码高亮与导出',
      count: scripts.length,
      unit: '个',
      icon: Code2,
    },
    {
      id: 'st-worldbooks',
      title: 'ST 世界书',
      desc: '独立世界书设定集、条目词典与卡片双向同步',
      count: worldBooks.length,
      unit: '本',
      icon: BookOpen,
    },
    {
      id: 'st-regex',
      title: '正则脚本',
      desc: '文本清洗替换规则库、一键复制正则语句',
      count: regexScripts.length,
      unit: '条',
      icon: Code2,
    },
    {
      id: 'chat-logs',
      title: '聊天记录存储',
      desc: 'SillyTavern 历史对话导入、气泡阅读与分析',
      count: chatLogs.length,
      unit: '份',
      icon: MessageSquare,
    },
    {
      id: 'st-extras',
      title: '番外小剧场',
      desc: '角色背景小剧场、前传短篇、IF线小说与角色剧本',
      count: extraStories.length,
      unit: '篇',
      icon: Book,
    },
  ];

  // 小手机版本模块配置
  const MOBILE_MODULES = [
    {
      id: 'st-mobile',
      title: '小手机链接',
      desc: '在线工具、酒馆网页与快捷导航',
      count: phoneLinks.length,
      unit: '条',
      icon: Smartphone,
    },
    {
      id: 'normal-cards',
      title: '普通角色卡',
      desc: 'Docx/Txt/Zip 文档型角色设定与剧情大纲',
      count: normalCards.length,
      unit: '张',
      icon: FileText,
    },
    {
      id: 'worldbook',
      title: '小手机世界书',
      desc: '轻量文本设定集与设定词条资料库',
      count: mobileWorldBooks.length,
      unit: '本',
      icon: BookOpen,
    },
    {
      id: 'mobile-presets',
      title: '破限/预设',
      desc: '线上与线下破限词、越狱提示词与模型参数配置',
      count: mobilePresets.length,
      unit: '套',
      icon: Sliders,
    },
    {
      id: 'mobile-html',
      title: 'HTML 管理',
      desc: '交互式 HTML 视窗、状态栏小部件与气泡组件',
      count: htmlStorages.length,
      unit: '个',
      icon: Code2,
    },
    {
      id: 'themes',
      title: '小手机美化',
      desc: '小手机整体美化包、气泡特效与背景壁纸',
      count: mobileThemes.length,
      unit: '套',
      icon: Palette,
    },
    {
      id: 'chat-memes',
      title: '聊天梗',
      desc: '经典台词、对话梗与爆笑名场面摘录',
      count: chatMemes.length,
      unit: '条',
      icon: MessageSquare,
    },
    {
      id: 'stickers',
      title: '表情包',
      desc: '聊天表情图集与卡片专属表情包管理',
      count: stickers.length,
      unit: '套',
      icon: Smile,
    },
    {
      id: 'extras-app',
      title: '番外小剧场',
      desc: '小手机版本番外短篇、角色故事与短剧',
      count: extraStories.length,
      unit: '篇',
      icon: Book,
    },
  ];

  const GENERAL_MODULES = [
    {
      id: 'user-personas',
      title: '用户人设',
      desc: '自设档案、身份设定与设定文档',
      count: userPersonas.length,
      unit: '个',
      icon: Users,
    },
    {
      id: 'background-images',
      title: '聊天背景图',
      desc: '酒馆对话背景图与场景氛围图素材',
      count: backgroundImages.length,
      unit: '张',
      icon: ImageIcon,
    },
    {
      id: 'card-covers',
      title: '角色卡面素材',
      desc: '角色立绘、封面素材与卡面美化图库',
      count: cardCovers.length,
      unit: '张',
      icon: Sparkles,
    },
    {
      id: 'fonts',
      title: '字体管理',
      desc: 'TTF/OTF/WOFF 个性字体资源库',
      count: fonts.length,
      unit: '个',
      icon: Type,
    },
    {
      id: 'api-storage',
      title: 'API 存储',
      desc: '多渠道接口地址与密钥备份管理',
      count: apis.length,
      unit: '条',
      icon: Key,
    },
  ];

        return (
    <div data-design-id="home-section-container" className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* 选项卡导航 (酒馆 \ 小手机 切换按键) */}
      <div className="home-top-tabs-container">
        <button
          type="button"
          onClick={() => setActiveTab('st')}
          className={`home-top-tab-btn ${activeTab === 'st' ? 'active' : ''}`}
        >
          SillyTavern 酒馆
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('mobile')}
          className={`home-top-tab-btn ${activeTab === 'mobile' ? 'active' : ''}`}
        >
          小手机版本
        </button>
      </div>

      {activeTab === 'st' && (
        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-left-4 duration-300">
          {/* ST Hero Welcome Banner (无背景) */}
          <div
            data-design-id="home-st-hero-banner"
            className="home-hero-banner relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-2 max-w-xl">
                <BaseBadge designId="home-st-hero-badge" variant="default" size="sm" className="rounded-full px-2.5 py-1 text-[var(--accent)] border-[var(--line-focus)] bg-[var(--btn-primary-bg)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>个人数字资产管理工作台</span>
                </BaseBadge>
                <h1
                  data-design-id="home-st-hero-title"
                  className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white text-left hero-title"
                >
                  欢迎来到 酒馆工作台
                </h1>
                <p data-design-id="home-st-hero-desc" className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  一站式集中管理您的角色卡、世界书、插件、脚本、正则、预设与历史聊天记录。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-shrink-0">
                <button
                  data-design-id="home-st-hero-gacha-btn"
                  type="button"
                  onClick={onDrawRandomCard}
                  className="home-gacha-btn flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-none text-white text-[10px] font-bold active:scale-95 transition-all"
                >
                  <Dices className="w-4 h-4 flex-shrink-0 text-white" />
                  <span className="text-white">命运抽卡</span>
                </button>
                <BaseButton
                  designId="home-st-hero-cards-btn"
                  type="button"
                  variant="outline"
                  onClick={() => onNavigate('st-cards')}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 hover:border-[var(--line-focus)] hover:text-[var(--accent)] text-[10px] font-bold shadow-lg active:scale-95 border border-zinc-200 transition-colors"
                >
                  <Users className="w-4 h-4 flex-shrink-0 text-zinc-600" />
                  <span>进入角色卡库</span>
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                </BaseButton>
              </div>
            </div>
          </div>

          {/* ST Quick Stats Grid (4个展示框渐变背景) */}
          <div data-design-id="home-st-stats-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">ST 角色卡</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {cards.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">张</span>
              </div>
            </div>
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <BookOpen className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate">ST 世界书</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {worldBooks.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">本</span>
              </div>
            </div>
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <MessageSquare className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="truncate">聊天记录</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {chatLogs.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">份</span>
              </div>
            </div>
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <Code2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="truncate">脚本 & 正则</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {scripts.length + regexScripts.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">项</span>
              </div>
            </div>
          </div>

          {/* ST Modules Section (Now Index 1) */}
          <div data-design-id="home-st-modules-section" className="space-y-3">
            <div className="flex items-center justify-between gap-2 mb-1 w-full">
              <div className="flex flex-col gap-0.5 items-start text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 w-full justify-start pb-1">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] text-[12px] font-bold">1</div>
                  <h2 data-design-id="home-st-section-title" className="main-section-title">
                    SillyTavern 酒馆
                  </h2>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-7 text-left">
                  管理酒馆核心的扩展插件、微调脚本等所有依赖资源
                </p>
              </div>
              
            </div>

            {/* Module Layout */}
            <div className="grid gap-x-3 gap-y-0 grid-cols-1 md:grid-cols-2">
              {ST_MODULES.map((item: any) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="home-module-card"
                  >
                    {/* Dynamic Bottom Line */}
                    <div className="home-module-bottom-line" />
                    
                    {/* Row 1: Icon, Title, Tag, Count */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center min-w-0">
                        {/* Icon */}
                        <div className="home-module-icon-wrap">
                          <Icon className="home-module-icon" />
                        </div>
                        {/* Title */}
                        <h3 data-design-id="home-st-module-title" className="home-module-title ml-2 truncate">
                          {item.title}
                        </h3>
                      </div>
                      {/* Count */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Tag */}
                        {item.tag && (
                          <span className="home-module-tag">
                            {item.tag}
                          </span>
                        )}
                        <div className="home-module-stats">
                          <span className="home-module-count">{item.count}</span>
                          <span className="home-module-unit">{item.unit || '项'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Row 2: Description & Mobile Arrow */}
                    <div className="flex justify-between items-end pl-[14px] pr-1">
                      <p className="home-module-desc">
                        {item.desc}
                      </p>
                      {/* Mobile Arrow */}
                      <ArrowRight className="md:hidden home-module-mobile-arrow ml-2 flex-shrink-0" />
                    </div>

                    {/* Row 3: Desktop Separator + Enter Management */}
                    <div className="hidden md:block mt-3 pt-3 home-module-separator">
                      <div className="flex justify-between items-center pr-1">
                        <span className="home-module-manage pl-[4.5px]">
                          进入管理
                        </span>
                        <ArrowRight className="home-module-arrow flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ST 最近角色卡快捷预览 (Now Index 2) (Show up to 5) */}
          <div data-design-id="home-st-recent-cards-section" className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-1 w-full">
                <div className="flex flex-col gap-0.5 items-start text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 w-full justify-start pb-1">
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] text-[12px] font-bold">2</div>
                    <h2 data-design-id="home-st-recent-section-title" className="main-section-title truncate">
                      最近导入的卡片
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ViewModeDropdown viewMode={cardViewMode} setViewMode={setCardViewMode} />
                  <BaseButton
                    designId="home-st-view-all-cards-btn"
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigate('st-cards')}
                    className="h-[30px] min-h-[30px] max-h-[30px] py-0 px-2.5 rounded-lg border-0 hover:text-[var(--accent)] text-zinc-700 dark:text-zinc-300 hover:bg-[var(--btn-primary-bg)] font-semibold text-[11px] leading-none transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap group/all"
                  >
                    <span className="text-[11px] font-semibold leading-none">进入角色主界面</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover/all:text-[var(--accent)] transition-colors" />
                  </BaseButton>
                </div>
              </div>

              {recentCards.length === 0 ? (
                <div className="text-[10px] text-zinc-500 py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  暂无最近导入
                </div>
              ) : cardViewMode === 'list' ? (
                <div className="flex flex-col gap-2">
                  {recentCards.map((card) => {
                    const name = getCardDisplayName(card);
                    const creator = getCardCreator(card);
                    const desc = getCardDescription(card);
                    return (
                      <BaseCard
                        key={card.id}
                        onClick={() => onOpenCardDetail(card.id)}
                        className="p-3 flex items-center justify-between group hover:border-[var(--line-focus)] dark:hover:border-[var(--line-focus)] cursor-pointer"
                      >
                         <div className="flex items-center gap-3 min-w-0">
                           <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                             {card.coverImage ? (
                               <img src={card.coverImage} className="w-full h-full object-cover" />
                             ) : (
                               <ImageIcon className="w-5 h-5 m-2.5 text-zinc-400" />
                             )}
                           </div>
                           <div className="truncate">
                             <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[var(--accent)] dark:group-hover:text-[var(--accent)] transition-colors">{name}</h4>
                             <p className="text-[10px] text-zinc-500 truncate mt-0.5">{desc || (creator ? `by ${creator}` : '暂无简介')}</p>
                           </div>
                         </div>
                      </BaseCard>
                    )
                  })}
                </div>
              ) : (
                <ManagementGrid viewMode={cardViewMode} className={`${managementViewClass(cardViewMode)} gap-2 sm:gap-2.5 md:gap-3`}>
                  {recentCards.map((card) => {
                    const name = getCardDisplayName(card);
                    return (
                      <BaseCard
                        key={card.id}
                        designId={`home-st-recent-card-${card.id}`}
                        onClick={() => onOpenCardDetail(card.id)}
                        title={name}
                        className="p-0 rounded-none overflow-hidden hover:border-[var(--line-focus)] dark:hover:border-[var(--line-focus)] shadow-sm hover:shadow-md cursor-pointer group flex flex-col"
                      >
                        <div className="aspect-[4/5] w-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden flex items-center justify-center">
                          {card.coverImage ? (
                            <img
                              src={card.coverImage}
                              alt={name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-zinc-400" />
                          )}
                        </div>
                        {/* 仅在 3 列大图模式下展示信息，在 4 列或 5 列（图片较小）时不展示文字信息，突出纯粹卡面 */}
                        {cardViewMode === 'grid-3' && (
                          <div className="p-2 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1.5 w-full">
                                <h4 className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0 group-hover:text-[var(--accent)] dark:group-hover:text-[var(--accent)] transition-colors" title={name}>
                                  {name}
                                </h4>
                                <span 
                                  className="px-1.5 py-0.5 text-[9px] bg-black/6 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded-none flex-shrink-0 leading-none whitespace-nowrap font-medium"
                                  title={`分组: ${card.group || '默认'}`}
                                >
                                  {card.group || '默认'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </BaseCard>
                    );
                  })}
                </ManagementGrid>
              )}
            </div>
        </div>
      )}

      {activeTab === 'mobile' && (
        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right-4 duration-300">
          {/* Mobile Hero Welcome Banner (无背景) */}
          <div
            data-design-id="home-mobile-hero-banner"
            className="home-hero-banner relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-2 max-w-xl">
                <BaseBadge designId="home-mobile-hero-badge" variant="default" size="sm" className="rounded-full px-2.5 py-1 text-[var(--accent)] border-[var(--line-focus)] bg-[var(--btn-primary-bg)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>个人数字资产管理工作台</span>
                </BaseBadge>
                <h1
                  data-design-id="home-mobile-hero-title"
                  className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white text-left hero-title"
                >
                  欢迎来到 小手机工作台
                </h1>
                <p data-design-id="home-mobile-hero-desc" className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  一站式集中管理您的普通角色卡、番外小剧场、小手机专属世界书与链接。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-shrink-0">
                <button
                  data-design-id="home-mobile-hero-gacha-btn"
                  type="button"
                  onClick={onDrawRandomNormalCard}
                  className="home-gacha-btn flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-none text-white text-[10px] font-bold active:scale-95 transition-all"
                >
                  <Dices className="w-4 h-4 flex-shrink-0 text-white" />
                  <span className="text-white">命运抽卡</span>
                </button>
                <BaseButton
                  designId="home-mobile-hero-cards-btn"
                  type="button"
                  variant="outline"
                  onClick={() => onNavigate('normal-cards')}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 hover:border-[var(--line-focus)] hover:text-[var(--accent)] text-[10px] font-bold shadow-lg active:scale-95 border border-zinc-200 transition-colors"
                >
                  <Users className="w-4 h-4 flex-shrink-0 text-zinc-600" />
                  <span>进入普通卡库</span>
                  <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                </BaseButton>
              </div>
            </div>
          </div>

          {/* Mobile Quick Stats Grid (4个展示框渐变背景) */}
          <div data-design-id="home-mobile-stats-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <Smartphone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">小手机链接</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {phoneLinks.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">条</span>
              </div>
            </div>
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate">普通角色卡</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {normalCards.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">张</span>
              </div>
            </div>
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <BookOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="truncate">世界书</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {mobileWorldBooks.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">本</span>
              </div>
            </div>
            <div className="home-stat-card p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium mb-1">
                <Book className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="truncate">番外小剧场</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {extraStories.length}
                <span className="text-[10px] font-normal text-zinc-400 ml-1">篇</span>
              </div>
            </div>
          </div>

          {/* Mobile Modules Section (Index 1) */}
          <div data-design-id="home-mobile-modules-section" className="space-y-3">
            <div className="flex items-center justify-between gap-2 mb-1 w-full">
              <div className="flex flex-col gap-0.5 items-start text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 w-full justify-start pb-1">
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] text-[12px] font-bold">1</div>
                  <h2 data-design-id="home-mobile-section-title" className="main-section-title">
                    小手机版本其他模块
                  </h2>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-7 text-left">
                  小手机专属美化、聊天梗等辅助资源
                </p>
              </div>
              
            </div>
            
            {/* Module Layout */}
            <div className="grid gap-x-3 gap-y-0 grid-cols-1 md:grid-cols-2">
              {MOBILE_MODULES.map((item: any) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="home-module-card"
                  >
                    {/* Dynamic Bottom Line */}
                    <div className="home-module-bottom-line" />
                    
                    {/* Row 1: Icon, Title, Tag, Count */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center min-w-0">
                        {/* Icon */}
                        <div className="home-module-icon-wrap">
                          <Icon className="home-module-icon" />
                        </div>
                        {/* Title */}
                        <h3 data-design-id="home-mobile-module-title" className="home-module-title ml-2 truncate">
                          {item.title}
                        </h3>
                      </div>
                      {/* Count */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Tag */}
                        {item.tag && (
                          <span className="home-module-tag">
                            {item.tag}
                          </span>
                        )}
                        <div className="home-module-stats">
                          <span className="home-module-count">{item.count}</span>
                          <span className="home-module-unit">{item.unit || '项'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Row 2: Description & Mobile Arrow */}
                    <div className="flex justify-between items-end pl-[14px] pr-1">
                      <p className="home-module-desc">
                        {item.desc}
                      </p>
                      {/* Mobile Arrow */}
                      <ArrowRight className="md:hidden home-module-mobile-arrow ml-2 flex-shrink-0" />
                    </div>

                    {/* Row 3: Desktop Separator + Enter Management */}
                    <div className="hidden md:block mt-3 pt-3 home-module-separator">
                      <div className="flex justify-between items-center pr-1">
                        <span className="home-module-manage pl-[4.5px]">
                          进入管理
                        </span>
                        <ArrowRight className="home-module-arrow flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 最近导入普通角色卡快捷预览 (Index 2) (Show up to 5) */}
          <div data-design-id="home-mobile-recent-cards-section" className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-1 w-full">
                <div className="flex flex-col gap-0.5 items-start text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2 w-full justify-start pb-1">
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] text-[12px] font-bold">2</div>
                    <h2 data-design-id="home-mobile-recent-section-title" className="main-section-title truncate">
                      最近导入的普通卡片
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ViewModeDropdown viewMode={cardViewMode} setViewMode={setCardViewMode} />
                  <BaseButton
                    designId="home-mobile-view-all-cards-btn"
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigate('normal-cards')}
                    className="h-[30px] min-h-[30px] max-h-[30px] py-0 px-2.5 rounded-lg border-0 hover:text-[var(--accent)] text-zinc-700 dark:text-zinc-300 hover:bg-[var(--btn-primary-bg)] font-semibold text-[11px] leading-none transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap group/all"
                  >
                    <span className="text-[11px] font-semibold leading-none">进入角色主界面</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover/all:text-[var(--accent)] transition-colors" />
                  </BaseButton>
                </div>
              </div>

              {/* 展示最近卡片 */}
              {recentNormalCardsToDisplay.length === 0 ? (
                <div className="text-[10px] text-zinc-500 py-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  暂无最近导入
                </div>
              ) : cardViewMode === 'list' ? (
                <div className="flex flex-col gap-2">
                  {recentNormalCardsToDisplay.map((card: any) => {
                    const name = card.charName || card.name || card.fileName || '未命名卡片';
                    const desc = card.description || card.content || '';
                    return (
                      <BaseCard
                        key={card.id}
                        onClick={() => onNavigate('normal-cards')}
                        className="p-3 flex items-center justify-between group hover:border-[var(--line-focus)] dark:hover:border-[var(--line-focus)] cursor-pointer"
                      >
                         <div className="flex items-center gap-3 min-w-0">
                           <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                             {card.coverImage ? (
                               <img src={card.coverImage} className="w-full h-full object-cover" />
                             ) : (
                               <ImageIcon className="w-5 h-5 m-2.5 text-zinc-400" />
                             )}
                           </div>
                           <div className="truncate">
                             <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[var(--accent)] dark:group-hover:text-[var(--accent)] transition-colors">{name}</h4>
                             <p className="text-[10px] text-zinc-500 truncate mt-0.5">{desc || '暂无简介'}</p>
                           </div>
                         </div>
                      </BaseCard>
                    )
                  })}
                </div>
              ) : (
                <ManagementGrid viewMode={cardViewMode} className={`${managementViewClass(cardViewMode)} gap-2 sm:gap-2.5 md:gap-3`}>
                  {recentNormalCardsToDisplay.map((card: any) => {
                    const name = card.charName || card.name || card.fileName || '未命名卡片';
                    return (
                      <BaseCard
                        key={card.id}
                        designId={`home-mobile-recent-card-${card.id}`}
                        onClick={() => {
                          onNavigate('normal-cards');
                        }}
                        title={name}
                        className="p-0 rounded-none overflow-hidden hover:border-[var(--line-focus)] dark:hover:border-[var(--line-focus)] shadow-sm hover:shadow-md cursor-pointer group flex flex-col"
                      >
                        <div className="aspect-[4/5] w-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden flex items-center justify-center">
                          {card.coverImage ? (
                            <img
                              src={card.coverImage}
                              alt={name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-zinc-400" />
                          )}
                        </div>
                        {/* 仅在 3 列大图模式下展示信息，在 4 列或 5 列（图片较小）时不展示文字信息，突出纯粹卡面 */}
                        {cardViewMode === 'grid-3' && (
                          <div className="p-2 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1.5 w-full">
                                <h4 className="font-bold text-[10px] text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0 group-hover:text-[var(--accent)] dark:group-hover:text-[var(--accent)] transition-colors" title={name}>
                                  {name}
                                </h4>
                                <span 
                                  className="px-1.5 py-0.5 text-[9px] bg-black/6 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 rounded-none flex-shrink-0 leading-none whitespace-nowrap font-medium"
                                  title={`分组: ${card.category || (card as any).group || '默认'}`}
                                >
                                  {card.category || (card as any).group || '默认'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </BaseCard>
                    );
                  })}
                </ManagementGrid>
              )}
            </div>

        </div>
      )}

      {/* 通用工具与辅助存储 */}
      <div data-design-id="home-general-tools-section" className="space-y-3 mt-8">
        <div className="flex flex-col gap-0.5 items-start text-left mb-1">
          <div className="flex flex-wrap items-center gap-2 w-full justify-start pb-1">
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] text-[12px] font-bold">3</div>
            <h2 data-design-id="home-tools-section-title" className="main-section-title">
              通用辅助工具
            </h2>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-7 text-left">
            用户人设、背景图、卡面素材、字体与 API 等全局辅助数据
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {GENERAL_MODULES.map((item: any) => {
            const Icon = item.icon;
            return (
              <BaseCard
                key={item.id}
                designId={`home-general-tool-${item.id}`}
                onClick={() => onNavigate(item.id)}
                title={item.desc}
                className="home-general-tool-card sub-block-card p-3 sm:p-3.5 rounded-none border-none shadow-none cursor-pointer flex items-center justify-between group"
                style={{ backgroundColor: 'var(--jump-card-bg, #EADAC7)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-[var(--input-bg,rgba(0,0,0,0.05))] text-[var(--text,#3f3f46)] border border-[var(--line-soft,transparent)] group-hover:bg-[var(--btn-primary-bg)] group-hover:text-[var(--accent)] dark:group-hover:bg-[var(--btn-primary-bg)] dark:group-hover:text-[var(--accent)] transition-colors flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="font-bold text-[10px] sm:text-[11px] text-[var(--text,#18181b)] truncate group-hover:text-[var(--accent)] dark:group-hover:text-[var(--accent)] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[var(--faint,#71717a)] truncate mt-0.5">
                      {item.count} {item.unit || '项'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--faint,#a1a1aa)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)] transition-all flex-shrink-0 ml-1" />
              </BaseCard>
            );
          })}
        </div>
      </div>

      {/* 数据安全与备份中心横幅 */}
      <BaseCard
        designId="home-backup-center-banner"
        className="p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex flex-col gap-0.5 items-start text-left">
          <div className="flex flex-wrap items-center gap-2 w-full justify-start pb-1">
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--btn-primary-bg)] text-[var(--accent)] text-[12px] font-bold">4</div>
            <h2 data-design-id="home-backup-section-title" className="main-section-title">数据安全与多格式备份中心</h2>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-7 text-left">
            所有数据完全保存在当前浏览器本地（IndexedDB/LocalStorage）。支持单文件导出与超大数据分批分卷导出。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <BaseButton
            designId="home-backup-import-btn"
            type="button"
            variant="outline"
            onClick={onOpenImportCenter}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium hover:border-[var(--line-focus)] hover:text-[var(--accent)] transition-colors"
          >
            <Upload className="w-3.5 h-3.5 flex-shrink-0" />
            <span>导入文件 / 备份</span>
          </BaseButton>
          <BaseButton
            designId="home-backup-export-btn"
            type="button"
            variant="primary"
            onClick={onOpenBigDataExport}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[10px] font-bold shadow-sm border-none transition-colors"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0 text-white" />
            <span className="text-white">数据导出中心</span>
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  );
};

