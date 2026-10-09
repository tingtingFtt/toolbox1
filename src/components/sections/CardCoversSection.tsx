import React, { useState, useMemo, useRef } from 'react';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { Search, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { AppData, CardCoverEntry } from '../../types';
import { formatBytes } from '../../utils';
import { sessionStore } from '../../utils/sessionStore';

export const CardCoversSection = ({ appData, updateAppData, showToast }: any) => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.cardCovers.searchQuery);

  React.useEffect(() => {
    sessionStore.cardCovers.searchQuery = searchQuery;
  }, [searchQuery]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = appData.cardCovers || [];
  
  const filteredImages = useMemo(() => {
    return images.filter((p: CardCoverEntry) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [images, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const format = file.name.split('.').pop()?.toLowerCase() || 'png';
      
      reader.readAsDataURL(file);

      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const newEntry: CardCoverEntry = {
          id: 'cc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: file.name,
          category: '默认',
          tags: [],
          size: file.size,
          format,
          fileData: content,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        updateAppData((prev: AppData) => ({
          ...prev,
          cardCovers: [newEntry, ...(prev.cardCovers || [])]
        }));
        showToast(`成功导入卡面素材: ${file.name}`, 'success');
      };
    });
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该卡面素材吗？')) {
      updateAppData((prev: AppData) => ({
        ...prev,
        cardCovers: (prev.cardCovers || []).filter(p => p.id !== id)
      }));
      showToast('已删除', 'info');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
      
      <div data-design-id="card-covers-header-banner" className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight sub-interface-title">角色卡面素材</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式: 图片
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight">管理角色卡面的相关图片素材</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap"
            title="导入卡面"
          >
            <Upload className="w-3 h-3" />
            <span>导入卡面</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <BaseInput type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索图片..." className="w-full pl-9 h-[34px] rounded-lg" />
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">暂无卡面素材</p>
            <p className="text-xs text-zinc-400">点击上方导入按钮添加图片</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map((p: CardCoverEntry) => (
            <div key={p.id} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[2/3] w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative">
                <img src={p.fileData} alt={p.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate" title={p.name}>{p.name}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">{formatBytes(p.size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
