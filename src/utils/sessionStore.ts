/**
 * Session State Store (In-Memory / Lifetime of current session)
 * 
 * 作用：在用户于应用各功能模块（设置中心、角色卡、对话记录、世界书、正则等）之间来回切换时，
 * 保持用户离开前的子界面（如设置中心的第几个Tab）、各卡片折叠展开状态、筛选/搜索条件及滑块参数。
 * 
 * 生命周期限制：
 * - 纯内存对象，只要不刷新页面或关闭程序，状态在单次运行会话中完全保持；
 * - 一旦用户按 F5 刷新页面或重启程序，内存自动重置为系统出厂初始默认值。
 */

export interface SessionNavigationState {
  settings: {
    activeTab: 'scan' | 'theme' | 'api' | 'storage' | 'cloud_sync' | 'about';
    isHistoryExpanded: boolean;
    showDetailsDropdown: boolean;
  };
  themeCustomizer: {
    isWorkbenchOpen: boolean;
    isSavedPalettesOpen: boolean;
    isInspirationsOpen: boolean;
    isCategoryBoardOpen: boolean;
    activeTab: 'bg' | 'buttons' | 'header' | 'cards' | 'core' | 'inspect';
    colorDraft: any | null;
  };
  chatLogs: {
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
    activeLogId: string | null;
    readerTab: 'info' | 'viewer' | 'json';
  };
  stWorldBooks: {
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
    activeBookId: string | null;
  };
  stRegex: {
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
    activeRegexId: string | null;
  };
  stScripts: {
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
    activeScriptId: string | null;
  };
  stPlugins: {
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
  };
  mobilePresets: {
    activeMode: 'online' | 'offline';
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
  };
  mobileHtml: {
    categoryFilter: string;
    tagFilter: string[];
    searchQuery: string;
    sortOrder: 'default' | 'az' | 'za' | 'newest' | 'oldest';
  };
  userPersonas: {
    searchQuery: string;
  };
  cardCovers: {
    searchQuery: string;
  };
  backgroundImages: {
    searchQuery: string;
  };
}

export const sessionStore: SessionNavigationState = {
  settings: {
    activeTab: 'scan',
    isHistoryExpanded: false,
    showDetailsDropdown: false,
  },
  themeCustomizer: {
    isWorkbenchOpen: false,
    isSavedPalettesOpen: false,
    isInspirationsOpen: false,
    isCategoryBoardOpen: false,
    activeTab: 'bg',
    colorDraft: null,
  },
  chatLogs: {
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
    activeLogId: null,
    readerTab: 'info',
  },
  stWorldBooks: {
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
    activeBookId: null,
  },
  stRegex: {
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
    activeRegexId: null,
  },
  stScripts: {
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
    activeScriptId: null,
  },
  stPlugins: {
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
  },
  mobilePresets: {
    activeMode: 'online',
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
  },
  mobileHtml: {
    categoryFilter: '全部分组',
    tagFilter: [],
    searchQuery: '',
    sortOrder: 'default',
  },
  userPersonas: {
    searchQuery: '',
  },
  cardCovers: {
    searchQuery: '',
  },
  backgroundImages: {
    searchQuery: '',
  },
};
