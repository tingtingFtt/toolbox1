import React, { useState, useMemo, useRef } from 'react';
import { BaseCard } from '../ui/BaseCard';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { Search, Plus, Trash2, Upload, FileText, FileJson, X, Plus as PlusIcon, Settings } from 'lucide-react';
import { UnifiedModal } from '../ui/UnifiedModal';
import { AppData, UserPersonaEntry } from '../../types';
import { formatBytes } from '../../utils';
import { sessionStore } from '../../utils/sessionStore';


const PersonaEditorModal = ({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: (persona: any) => void, initialData?: any }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [personality, setPersonality] = useState('');
  const [experience, setExperience] = useState('');
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setGender(initialData.gender || '');
        setPersonality(initialData.personality || '');
        setExperience(initialData.experience || '');
        setCustomFields(initialData.customFields || []);
      } else {
        setName('');
        setGender('');
        setPersonality('');
        setExperience('');
        setCustomFields([]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      gender,
      personality,
      experience,
      customFields
    });
    setName('');
    setGender('');
    setPersonality('');
    setExperience('');
    setCustomFields([]);
    onClose();
  };

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={initialData ? "编辑用户人设" : "新建用户人设"} >
      <div className="space-y-4 p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">姓名</label>
          <BaseInput value={name} onChange={(e: any) => setName(e.target.value)} placeholder="输入姓名..." className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">性别</label>
          <BaseInput value={gender} onChange={(e: any) => setGender(e.target.value)} placeholder="输入性别..." className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">性格</label>
          <BaseInput value={personality} onChange={(e: any) => setPersonality(e.target.value)} placeholder="输入性格特点..." className="w-full" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">经历</label>
          <textarea 
            value={experience} 
            onChange={(e: any) => setExperience(e.target.value)} 
            placeholder="输入个人经历..." 
            className="w-full min-h-[80px] p-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">自定义属性 (词条)</label>
            <button 
              type="button" 
              onClick={() => setCustomFields([...customFields, {key: '', value: ''}])}
              className="text-[10px] flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
            >
              <PlusIcon className="w-3 h-3" /> 添加词条
            </button>
          </div>
          {customFields.map((field, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <BaseInput 
                value={field.key} 
                onChange={(e: any) => {
                  const newFields = [...customFields];
                  newFields[idx].key = e.target.value;
                  setCustomFields(newFields);
                }} 
                placeholder="属性名 (如: 职业)" 
                className="w-1/3" 
              />
              <BaseInput 
                value={field.value} 
                onChange={(e: any) => {
                  const newFields = [...customFields];
                  newFields[idx].value = e.target.value;
                  setCustomFields(newFields);
                }} 
                placeholder="属性值" 
                className="flex-1" 
              />
              <span role="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
        <BaseButton variant="secondary" onClick={onClose}>取消</BaseButton>
        <BaseButton variant="primary" onClick={handleSave} disabled={!name.trim()}>保存</BaseButton>
      </div>
    </UnifiedModal>
  );
};

export const UserPersonasSection = ({ appData, updateAppData, showToast }: any) => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStore.userPersonas.searchQuery);

  React.useEffect(() => {
    sessionStore.userPersonas.searchQuery = searchQuery;
  }, [searchQuery]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const personas = appData.userPersonas || [];
  
  const filteredPersonas = useMemo(() => {
    return personas.filter((p: UserPersonaEntry) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [personas, searchQuery]);


  const handleSavePersona = (data: any) => {
    const personaJson = JSON.stringify(data, null, 2);
    
    if (editingPersona) {
      updateAppData((prev: AppData) => ({
        ...prev,
        userPersonas: (prev.userPersonas || []).map(p => {
          if (p.id === editingPersona.id) {
            return {
              ...p,
              name: data.name,
              size: new Blob([personaJson]).size,
              content: personaJson,
              customFields: data.customFields,
              updatedAt: Date.now()
            };
          }
          return p;
        })
      }));
      showToast('成功更新人设', 'success');
    } else {
      const newEntry: UserPersonaEntry = {
        id: 'up_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        name: data.name,
        category: '默认',
        tags: [],
        size: new Blob([personaJson]).size,
        format: 'json',
        content: personaJson,
        customFields: data.customFields,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      updateAppData((prev: AppData) => ({
        ...prev,
        userPersonas: [newEntry, ...(prev.userPersonas || [])]
      }));
      showToast('成功创建新的人设', 'success');
    }
    setShowCreateModal(false);
    setEditingPersona(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const format = file.name.split('.').pop()?.toLowerCase() || 'txt';
      
      if (format === 'json' || format === 'txt') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file); // For docx or others
      }

      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const newEntry: UserPersonaEntry = {
          id: 'up_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          name: file.name,
          category: '默认',
          tags: [],
          size: file.size,
          format,
          content: (format === 'json' || format === 'txt') ? content : undefined,
          fileData: (format !== 'json' && format !== 'txt') ? content : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        updateAppData((prev: AppData) => ({
          ...prev,
          userPersonas: [newEntry, ...(prev.userPersonas || [])]
        }));
        showToast(`成功导入人设: ${file.name}`, 'success');
      };
    });
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该人设吗？')) {
      updateAppData((prev: AppData) => ({
        ...prev,
        userPersonas: (prev.userPersonas || []).filter(p => p.id !== id)
      }));
      showToast('已删除', 'info');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <input type="file" ref={fileInputRef} multiple accept=".txt,.json,.docx" onChange={handleFileUpload} className="hidden" />
      
                  <div data-design-id="user-personas-header-banner" className="sub-interface-banner py-1 sm:py-1.5 px-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[var(--line,rgba(140,47,45,0.18))]">
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="header-icon-box w-7 h-7 sm:w-7 sm:h-7 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text,#3E3A39)] leading-tight">用户人设</h2>
              <span className="header-tag text-[9px] px-1.5 py-0.5 border border-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-medium leading-none">
                格式: .json / .txt / .docx
              </span>
            </div>
            <p className="text-[10px] text-[var(--dim,#7C6865)] mt-0.5 leading-tight -ml-[5px] sm:ml-0">
              管理您的自定义用户人设与设定文档
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
          <button onClick={() => setShowCreateModal(true)} className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b-2 border-b-[var(--accent,#8C2F2D)] bg-[var(--btn-primary-bg,rgba(140,47,45,0.1))] text-[var(--accent,#8C2F2D)] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--btn-primary-hover)] active:scale-95 whitespace-nowrap">
            <Plus className="w-3 h-3" />
            <span>新建人设</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="h-5.5 px-2 text-[10px] rounded-none border-0 border-b border-b-[var(--line-focus,rgba(96,126,149,0.5))] bg-transparent text-[var(--text,#3E3A39)] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 whitespace-nowrap">
            <Upload className="w-3 h-3" />
            <span>导入文件</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2" />
          <BaseInput type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索人设..." className="w-full pl-9 h-[34px] rounded-lg" />
        </div>
      </div>

      {filteredPersonas.length === 0 ? (
        <div className="sub-block-card text-center py-16 bg-[var(--card-solid-bg,#EADAC7)] border-none rounded-none space-y-4">
          <div className="w-12 h-12 mx-auto rounded-none bg-[var(--btn-primary-bg)] border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text)]">暂无人设文档</p>
            <p className="text-xs text-[var(--dim)]">点击上方按钮新建或导入人设文档</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredPersonas.map((p: UserPersonaEntry) => (
            <div key={p.id} className="sub-block-card p-3 bg-[var(--card-solid-bg,#EADAC7)] border-none rounded-none flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 flex-shrink-0">
                  {p.format === 'json' ? <FileJson className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{p.name}</h3>
                  <p className="text-[10px] text-zinc-500">{formatBytes(p.size)} • {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {p.format === 'json' && p.content && (
                  <button 
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(p.content as string);
                        setEditingPersona({ ...parsed, id: p.id });
                        setShowCreateModal(true);
                      } catch (e) {
                        showToast('无法解析该人设数据', 'error');
                      }
                    }} 
                    className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                    title="编辑"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => handleDelete(p.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg" title="删除">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PersonaEditorModal 
        isOpen={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false);
          setEditingPersona(null);
        }} 
        onSave={handleSavePersona}
        initialData={editingPersona}
      />
    </div>
  );
};



