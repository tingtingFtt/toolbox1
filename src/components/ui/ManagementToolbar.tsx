import React from 'react';
import { TagFilterDropdown } from './TagFilterDropdown';
import { GroupCategoryBar, CategoryFilterDropdown } from './GroupCategoryBar';
import { ViewModeDropdown, ViewMode } from './ViewModeDropdown';
import { CustomSelect } from './CustomSelect';
import { BaseButton } from './BaseButton';
import { BaseInput } from './BaseInput';
import { BaseCard } from './BaseCard';
import { ManagementToolbarFrame, ManagementSearch } from './ManagementChrome';
import { ArrowUpDown, Search, CheckSquare } from 'lucide-react';

interface ManagementToolbarProps {
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchPlaceholder?: string;

  // Category (Dropdown)
  hasCategoryFilter?: boolean;
  groups: string[];
  currentGroup: string;
  setCurrentGroup: (g: string) => void;
  allGroupName?: string;

  // Tag
  hasTagFilter?: boolean;
  builtInTags?: string[];
  customTags?: string[];
  selectedTags?: string[];
  setTagFilter?: (tags: string[]) => void;

  // Sort
  hasSort?: boolean;
  sortOrder?: string;
  setSortOrder?: (order: any) => void;
  sortOptions?: { value: string; label: string }[];

  // View Mode
  hasViewMode?: boolean;
  viewMode?: string;
  setViewMode?: (mode: any) => void;
  
  // Batch Mode
  hasBatchMode?: boolean;
  batchMode?: boolean;
  onToggleBatchMode?: () => void;
  batchButtonText?: string;
  batchActiveText?: string;

  // Block 4: GroupCategoryBar
  hasGroupCategoryBar?: boolean;
  getCount?: (group: string) => number;
  totalCount?: number;
  
  // Custom right-side content
  children?: React.ReactNode;
}

export const ManagementToolbar: React.FC<ManagementToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "搜索...",
  hasCategoryFilter = true,
  groups,
  currentGroup,
  setCurrentGroup,
  allGroupName = "全部分组",
  hasTagFilter = false,
  builtInTags = [],
  customTags = [],
  selectedTags = [],
  setTagFilter,
  hasSort = false,
  sortOrder,
  setSortOrder,
  sortOptions = [],
  hasViewMode = false,
  viewMode,
  setViewMode,
  hasBatchMode = false,
  batchMode = false,
  onToggleBatchMode,
  batchButtonText = '选择',
  batchActiveText = '退出选择',
  hasGroupCategoryBar = true,
  getCount,
  totalCount,
  children
}) => {
  const [showViewModeDropdown, setShowViewModeDropdown] = React.useState(false);

  return (
    <ManagementToolbarFrame>
      {/* Block 2: Search Bar */}
        <ManagementSearch
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-4 py-1.5 text-[10px] bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500"
        />
      
      {/* Block 3: Filters & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {hasCategoryFilter && (
          <CategoryFilterDropdown 
            groups={groups}
            currentGroup={currentGroup}
            onSelectGroup={setCurrentGroup}
            allGroupName={allGroupName}
          />
        )}
        
        {hasTagFilter && setTagFilter && (
          <TagFilterDropdown
            builtInTags={builtInTags}
            customTags={customTags}
            selectedTags={selectedTags}
            onChange={setTagFilter}
          />
        )}
        
        {hasSort && setSortOrder && sortOptions.length > 0 && (
          <CustomSelect
            value={sortOrder || ''}
            onChange={(val) => setSortOrder(val)}
            options={sortOptions}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            className="h-[30px] px-2.5 rounded-lg bg-transparent border-0 border-b border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] text-zinc-700 dark:text-zinc-300 hover:text-[var(--accent)] hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer active:bg-black/10 dark:active:bg-white/15"
          />
        )}

        {hasViewMode && setViewMode && (
          <ViewModeDropdown viewMode={(viewMode as ViewMode) || 'grid-3'} setViewMode={setViewMode} />
        )}

        {hasBatchMode && onToggleBatchMode && (
          <BaseButton
            type="button"
            size="sm"
            onClick={onToggleBatchMode}
            className={`flex items-center gap-1.5 h-[30px] min-h-[30px] max-h-[30px] py-0 px-2.5 text-[10px] font-medium rounded-lg transition-all duration-200 focus:outline-none flex-shrink-0 border-0 border-b active:bg-[var(--btn-primary-hover)] active:border-b-[var(--accent)] ${
              batchMode
                ? 'bg-[var(--btn-primary-hover)] border-b-2 border-b-[var(--accent)] text-[var(--accent)] shadow-xs font-bold'
                : 'bg-transparent border-b-zinc-200 dark:border-b-zinc-800 hover:border-b-[var(--line-focus)] hover:text-[var(--accent)] text-zinc-700 dark:text-zinc-300 hover:bg-[var(--btn-primary-bg)]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" /> 
            <span className="leading-none">{batchMode ? batchActiveText : batchButtonText}</span>
          </BaseButton>
        )}

        {children}
      </div>

      {/* Block 4: GroupCategoryBar */}
      {hasGroupCategoryBar && getCount && totalCount !== undefined && (
        <div className="group-category-container bg-[var(--group-card-bg,#E3CDAE)] border-none rounded-none p-2 w-full transition-colors shadow-none">
          <GroupCategoryBar 
            groups={groups}
            currentGroup={currentGroup}
            onSelectGroup={setCurrentGroup}
            getCount={getCount}
            totalCount={totalCount}
            allGroupName={allGroupName}
          />
        </div>
      )}
    </ManagementToolbarFrame>
  );
};

