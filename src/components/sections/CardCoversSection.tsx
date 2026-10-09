import { ActionButton } from '../ui/ActionButton';
import { ManagementHeader } from '../ui/ManagementChrome';
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
      
      <ManagementHeader data-design-id="card-covers-header-banner"
        icon={<>
            <ImageIcon className="w-4 h-4" />
          </>}
        title={<>角色卡面素材</>}
        badge={<>
                格式: 图片
              </>}
        description={<>管理角色卡面的相关图片素材</>}
        actions={<>
          <ActionButton type="button" onClick={() => fileInputRef.current?.click()} title="导入卡面" action="import" context="toolbar" tone="primary">
            <Upload className="w-3 h-3" />
            <span>导入卡面</span>
          </ActionButton>
        </>}
      />

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

