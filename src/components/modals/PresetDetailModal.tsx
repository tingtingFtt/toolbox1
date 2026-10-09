import React, { useEffect, useState } from 'react';
import {
  Download,
  X,
  History,
  Eye,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { AppData, PresetEntry } from '../../types';
import {
  getPresetJson,
  getPresetResources,
  normalizePreset,
  presetResourceId,
} from '../../utils/presetResources';
import { triggerFileDownload } from '../../utils';
import { TagEditor } from '../ui/TagEditor';
import { CustomSelect } from '../ui/CustomSelect';
import { DetailHeader, DetailTabs, detailPanelClass, detailFooterClass, detailIconButtonClass } from '../ui/DetailChrome';

type Tab = 'details' | 'prompts' | 'regex' | 'scripts' | 'json' | 'versions';
interface Props {
  preset: PresetEntry;
  initialTab?: Tab;
  appData: AppData;
  onClose: () => void;
  onSave: (preset: PresetEntry) => void;
  onRestore: (version: any) => void;
  onOpenResource?: (kind: 'regex' | 'script', id: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const fieldClass =
  'w-full px-3 py-2 border border-[var(--line)] bg-[var(--input-bg)] text-[var(--text)] text-xs';
const buttonClass =
  'inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs border-b border-[var(--line-focus)] text-[var(--text)] hover:bg-[var(--btn-primary-bg)] cursor-pointer';
const parameters = [
  ['temperature', '温度'],
  ['top_p', 'Top P'],
  ['top_k', 'Top K'],
  ['top_a', 'Top A'],
  ['min_p', 'Min P'],
  ['frequency_penalty', '频率惩罚'],
  ['presence_penalty', '存在惩罚'],
  ['repetition_penalty', '重复惩罚'],
  ['openai_max_context', '上下文长度'],
  ['openai_max_tokens', '最大输出长度'],
];

export function PresetDetailModal({
  preset,
  initialTab = 'details',
  appData,
  onClose,
  onSave,
  onRestore,
  onOpenResource,
  showToast,
}: Props) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(preset)) as PresetEntry);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [preview, setPreview] = useState<any>(null);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(getPresetJson(preset), null, 2));
  const [jsonEdited, setJsonEdited] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(preset)));
    setJsonText(JSON.stringify(getPresetJson(preset), null, 2));
    setJsonEdited(false);
    setJsonError('');
    setPreview(null);
  }, [preset]);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);

  const shown = preview
    ? normalizePreset({
        ...draft,
        ...preview.data,
        jsonData: preview.data.jsonData || preview.data.settings || {},
      })
    : draft;
  const json = getPresetJson(shown);
  const prompts: any[] = json.prompts || [];
  const regexes = getPresetResources(json, 'regex');
  const scripts = getPresetResources(json, 'script');
  const categories = Array.from(
    new Set(['默认', ...(appData.presetCategories || []), shown.category || '默认']),
  );
  const setJson = (value: any) => {
    setDraft((current) => ({ ...current, jsonData: value }));
    setJsonText(JSON.stringify(value, null, 2));
    setJsonEdited(false);
    setJsonError('');
  };
  const parseJson = (): any | null => {
    if (!jsonEdited) return getPresetJson(draft);
    try {
      const parsed = JSON.parse(jsonText);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        (!Array.isArray(parsed.prompts) && !Array.isArray(parsed.prompt_order))
      )
        throw new Error('需要 prompts 或 prompt_order 数组');
      setJsonError('');
      return parsed;
    } catch (error: any) {
      setJsonError(error.message);
      return null;
    }
  };
  const changeTab = (next: Tab) => {
    if (!preview && jsonEdited) {
      const parsed = parseJson();
      if (!parsed) return;
      setJson(parsed);
    }
    setTab(next);
  };
  const save = () => {
    const parsed = parseJson();
    if (!parsed) {
      setTab('json');
      showToast('JSON 格式不正确，未保存', 'error');
      return;
    }
    if (!draft.name.trim()) {
      setTab('details');
      showToast('预设名称不能为空', 'error');
      return;
    }
    const value = { ...parsed };
    ['name', 'title', 'preset_name'].forEach((key) => {
      if (typeof value[key] === 'string') value[key] = draft.name.trim();
    });
    if (value.metadata?.name) value.metadata = { ...value.metadata, name: draft.name.trim() };
    ['author', 'creator'].forEach((key) => {
      if (typeof value[key] === 'string') value[key] = draft.author || '';
    });
    ['description', 'notes'].forEach((key) => {
      if (typeof value[key] === 'string') value[key] = draft.description || '';
    });
    onSave({ ...draft, name: draft.name.trim(), jsonData: value });
  };
  const openResource = (kind: 'regex' | 'script', key: string) => {
    const saved = appData.presets?.find((item) => item.id === draft.id);
    if (
      !saved ||
      jsonEdited ||
      JSON.stringify(getPresetJson(saved)) !== JSON.stringify(getPresetJson(draft)) ||
      saved.name !== draft.name ||
      saved.description !== draft.description
    ) {
      showToast('请先保存预设修改，再打开关联资源', 'info');
      return;
    }
    onOpenResource?.(kind, presetResourceId(draft.id, kind, key));
  };
  const updatePrompt = (index: number, patch: any) =>
    setJson({
      ...json,
      prompts: prompts.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  const addPrompt = () => {
    const identifier = `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setJson({
      ...json,
      prompts: [
        ...prompts,
        {
          identifier,
          name: '新提示词',
          role: 'system',
          content: '',
          enabled: true,
          injection_position: 0,
          injection_depth: 4,
          injection_order: 100,
          system_prompt: false,
          marker: false,
          forbid_overrides: false,
        },
      ],
      prompt_order: (json.prompt_order || [{ character_id: 100001, order: [] }]).map(
        (group: any) => ({
          ...group,
          order: [...(group.order || []), { identifier, enabled: true }],
        }),
      ),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-transparent modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preset-detail-title"
    >
      <div className={`${detailPanelClass} st-preset-detail`}>
        {preview && (
          <div className="px-4 py-2 text-xs bg-[var(--btn-primary-bg)] border-b border-[var(--line)] flex flex-wrap items-center gap-2">
            <Eye className="w-3.5 h-3.5" /> 正在预览 {preview.versionLabel}
            <button className={buttonClass} onClick={() => setPreview(null)}>
              退出预览
            </button>
          </div>
        )}
        <DetailHeader
          designPrefix="preset-detail" titleId="preset-detail-title" title={shown.name}
          version={preview?.versionLabel || draft.activeVersionLabel || 'v1'} badge={shown.category || '默认'}
          onClose={onClose}
          actions={<button type="button" title="导出预设 JSON" aria-label="导出预设 JSON" className={detailIconButtonClass} onClick={() => {
            const payload = preview ? json : parseJson();
            if (!payload) { setTab('json'); return; }
            triggerFileDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${shown.name}.json`);
          }}><Download className="w-4 h-4" /></button>}
          tags={!preview ? <TagEditor customTags={draft.customTags || []} availableTags={appData.presetTags || []} maxDisplay={3} onChange={(customTags) => setDraft({ ...draft, customTags })} /> : <TagEditor customTags={shown.customTags || []} availableTags={[]} maxDisplay={3} hideAddButton onChange={() => {}} />}
        />
        <DetailTabs<Tab>
          designPrefix="preset-detail" label="预设详情页签" activeTab={tab} onChange={changeTab}
          tabs={[
            { id: 'details', name: '基本属性' }, { id: 'prompts', name: `提示词 (${prompts.length})` },
            { id: 'regex', name: `内嵌正则 (${regexes.length})` }, { id: 'scripts', name: `内嵌脚本 (${scripts.length})` },
            { id: 'json', name: 'JSON 原始数据' }, { id: 'versions', name: `版本历史 (${(draft.versions?.length || 0) + 1})` },
          ]}
        />
        <div className="file-detail-body flex-1 min-h-0 overflow-y-auto p-3 sm:p-6">
          <p className="mb-3 text-[10px] text-[var(--dim)]">{prompts.length} 个提示词 · {regexes.length} 条正则 · {scripts.length} 个脚本 · {(draft.versions?.length || 0) + 1} 个版本</p>
          {tab === 'details' && (
            <fieldset disabled={!!preview} className="max-w-4xl space-y-4 min-w-0">
              <label className="block text-xs font-semibold">
                预设名称
                <input
                  className={`${fieldClass} mt-1`}
                  value={shown.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-xs font-semibold">
                  作者
                  <input
                    className={`${fieldClass} mt-1`}
                    value={shown.author || ''}
                    onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                  />
                </label>
                <div>
                  <label className="block text-xs font-semibold mb-1">所属分组</label>
                  {preview ? (
                    <div className={fieldClass}>{shown.category}</div>
                  ) : (
                    <CustomSelect
                      value={draft.category || '默认'}
                      onChange={(category) => setDraft({ ...draft, category })}
                      options={categories.map((value) => ({ value, label: value }))}
                      className={fieldClass}
                    />
                  )}
                </div>
              </div>
              <label className="block text-xs font-semibold">
                描述说明
                <textarea
                  className={`${fieldClass} mt-1`}
                  rows={4}
                  value={shown.description || ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <p className="text-xs text-[var(--dim)] break-all">
                来源文件：{shown.fileName || '新建预设'}
              </p>
              <div className="border-t border-[var(--line)] pt-4 space-y-3">
                <h3 className="text-xs font-bold">采样参数</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parameters.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 text-xs">
                      <span className="w-28 shrink-0">{label}</span>
                      <input
                        type="number"
                        step="any"
                        className={fieldClass}
                        value={json[key] ?? ''}
                        onChange={(e) =>
                          setJson({
                            ...json,
                            [key]: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!json.stream_openai}
                    onChange={(e) => setJson({ ...json, stream_openai: e.target.checked })}
                  />
                  流式输出
                </label>
              </div>
            </fieldset>
          )}
          {tab === 'prompts' && (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <input
                  className={fieldClass}
                  placeholder="搜索提示词"
                  value={promptSearch}
                  onChange={(e) => setPromptSearch(e.target.value)}
                />
                {!preview && (
                  <button className={`${buttonClass} shrink-0`} onClick={addPrompt}>
                    <Plus className="w-3 h-3" />
                    新增
                  </button>
                )}
              </div>
              {prompts.length === 0 && <p className="text-xs text-[var(--dim)]">暂无提示词</p>}
              {prompts.map((prompt, index) =>
                !`${prompt.name || ''} ${prompt.content || ''}`
                  .toLowerCase()
                  .includes(promptSearch.toLowerCase()) ? null : (
                  <fieldset
                    key={`${prompt.identifier}_${index}`}
                    disabled={!!preview}
                    className="border-b border-[var(--line)] pb-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label="提示词名称"
                        className={`${fieldClass} !w-auto flex-1 min-w-0`}
                        value={prompt.name || ''}
                        onChange={(e) => updatePrompt(index, { name: e.target.value })}
                      />
                      <select
                        aria-label="提示词角色"
                        className="border border-[var(--line)] p-1 text-xs"
                        value={prompt.role || 'system'}
                        onChange={(e) => updatePrompt(index, { role: e.target.value })}
                      >
                        {['system', 'user', 'assistant'].map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={prompt.enabled !== false}
                          onChange={(e) => updatePrompt(index, { enabled: e.target.checked })}
                        />
                        启用
                      </label>
                      <button
                        title="删除提示词"
                        aria-label="删除提示词"
                        className={buttonClass}
                        onClick={() =>
                          setJson({
                            ...json,
                            prompts: prompts.filter((_, i) => i !== index),
                            prompt_order: (json.prompt_order || []).map((group: any) => ({
                              ...group,
                              order: (group.order || []).filter(
                                (item: any) => item.identifier !== prompt.identifier,
                              ),
                            })),
                          })
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-[var(--dim)] break-all">
                      {prompt.identifier}
                    </div>
                    <textarea
                      aria-label="提示词内容"
                      rows={4}
                      className={`${fieldClass} font-mono`}
                      value={prompt.content || ''}
                      onChange={(e) => updatePrompt(index, { content: e.target.value })}
                    />
                  </fieldset>
                ),
              )}
              {(json.prompt_order || []).map((group: any, groupIndex: number) => (
                <div key={groupIndex} className="border-t border-[var(--line)] pt-3 space-y-2">
                  <h3 className="text-xs font-bold">提示词顺序 · {group.character_id}</h3>
                  {(group.order || []).map((item: any, index: number) => (
                    <div
                      key={`${item.identifier}_${index}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      <input
                        disabled={!!preview}
                        type="checkbox"
                        checked={item.enabled !== false}
                        aria-label="顺序条目启用"
                        onChange={(e) =>
                          setJson({
                            ...json,
                            prompt_order: json.prompt_order.map((g: any, gi: number) =>
                              gi === groupIndex
                                ? {
                                    ...g,
                                    order: g.order.map((o: any, oi: number) =>
                                      oi === index ? { ...o, enabled: e.target.checked } : o,
                                    ),
                                  }
                                : g,
                            ),
                          })
                        }
                      />
                      <span className="flex-1 min-w-0 truncate">
                        {prompts.find((prompt) => prompt.identifier === item.identifier)?.name ||
                          item.identifier}
                      </span>
                      {!preview &&
                        ([-1, 1] as const).map((direction) => (
                          <button
                            key={direction}
                            title={direction < 0 ? '上移' : '下移'}
                            aria-label={direction < 0 ? '上移' : '下移'}
                            className={buttonClass}
                            onClick={() => {
                              const target = index + direction;
                              if (target < 0 || target >= group.order.length) return;
                              const order = [...group.order];
                              [order[index], order[target]] = [order[target], order[index]];
                              setJson({
                                ...json,
                                prompt_order: json.prompt_order.map((g: any, gi: number) =>
                                  gi === groupIndex ? { ...g, order } : g,
                                ),
                              });
                            }}
                          >
                            {direction < 0 ? (
                              <ArrowUp className="w-3 h-3" />
                            ) : (
                              <ArrowDown className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {(tab === 'regex' || tab === 'scripts') && (
            <div className="space-y-2">
              {(tab === 'regex' ? regexes : scripts).length === 0 && (
                <p className="text-xs text-[var(--dim)]">
                  暂无内嵌{tab === 'regex' ? '正则' : '脚本'}
                </p>
              )}
              {(tab === 'regex' ? regexes : scripts).map((resource) => (
                <div key={resource.key} className="border-b border-[var(--line)] py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold break-words">{resource.name}</h3>
                      <p className="text-[10px] text-[var(--dim)]">
                        预设内嵌 ·{' '}
                        {tab === 'regex'
                          ? resource.value.disabled
                            ? '禁用'
                            : '启用'
                          : resource.value.enabled === false
                            ? '禁用'
                            : '启用'}
                        {resource.folder ? ` · ${resource.folder}` : ''}
                      </p>
                    </div>
                    {!preview && (
                      <button
                        className={`${buttonClass} shrink-0`}
                        onClick={() =>
                          openResource(tab === 'regex' ? 'regex' : 'script', resource.key)
                        }
                      >
                        <ExternalLink className="w-3 h-3" />在{tab === 'regex' ? 'ST 正则' : '脚本'}
                        管理中打开
                      </button>
                    )}
                  </div>
                  <pre className="font-mono text-xs whitespace-pre-wrap break-all max-h-48 overflow-auto">
                    {tab === 'regex'
                      ? `${resource.value.findRegex || ''}\n→ ${resource.value.replaceString || ''}`
                      : resource.value.content ||
                        resource.value.script ||
                        resource.value.code ||
                        ''}
                  </pre>
                </div>
              ))}
            </div>
          )}
          {tab === 'json' && (
            <div className="h-full min-h-80 flex flex-col gap-2">
              {jsonError && (
                <p role="alert" className="text-xs text-[var(--accent)]">
                  JSON 格式错误：{jsonError}
                </p>
              )}
              <textarea
                aria-label="预设 JSON 原始数据"
                readOnly={!!preview}
                spellCheck={false}
                className={`${fieldClass} font-mono flex-1 min-h-80`}
                value={preview ? JSON.stringify(json, null, 2) : jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonEdited(true);
                }}
              />
            </div>
          )}
          {tab === 'versions' && (
            <div className="space-y-5">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <History className="w-4 h-4" />
                预设版本记录与历史追溯
                <span className="text-[10px] text-[var(--dim)]">
                  共 {(draft.versions?.length || 0) + 1} 个版本
                </span>
              </h3>
              <div className="border border-[var(--line-focus)] p-4 space-y-2 bg-[var(--btn-primary-bg)]">
                <div className="text-xs font-bold">
                  当前生效版本 · {draft.activeVersionLabel || 'v1'}
                </div>
                <div className="text-xs break-words">{draft.name}</div>
                <div className="text-[10px] text-[var(--dim)]">
                  {draft.fileName} · {new Date(draft.updatedAt || draft.createdAt).toLocaleString()}
                </div>
                <div className="text-xs">{draft.currentVersionSummary || '初始导入版本'}</div>
              </div>
              <h4 className="text-xs font-bold">历史归档版本时间线</h4>
              {!draft.versions?.length && <p className="text-xs text-[var(--dim)]">暂无历史版本</p>}
              <div className="border-l border-[var(--line)] ml-2 pl-4 space-y-4">
                {(draft.versions || []).map((version) => (
                  <div
                    key={version.versionId}
                    className="border border-[var(--line)] p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold">
                        {version.versionLabel || `v${version.versionNumber}`}
                      </span>
                      <span className="text-[10px] text-[var(--dim)]">
                        {new Date(version.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs break-words">{version.fileName || version.data?.name}</p>
                    <p className="text-[10px] text-[var(--dim)]">
                      {version.changeSummary || '历史版本'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        onClick={() => {
                          setPreview(version);
                          setTab('details');
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        预览版本
                      </button>
                      <button className={buttonClass} onClick={() => onRestore(version)}>
                        <RefreshCw className="w-3 h-3" />
                        恢复此版本
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() =>
                          triggerFileDownload(
                            new Blob(
                              [
                                JSON.stringify(
                                  version.data?.jsonData || version.data?.settings || {},
                                  null,
                                  2,
                                ),
                              ],
                              { type: 'application/json' },
                            ),
                            `${version.data?.name || draft.name}-${version.versionLabel}.json`,
                          )
                        }
                      >
                        <Download className="w-3 h-3" />
                        导出
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <footer data-design-id="preset-detail-footer" className={`${detailFooterClass} justify-end`}>
          <button className={buttonClass} onClick={onClose}>
            关闭
          </button>
          {!preview && (
            <button
              className={`${buttonClass} bg-[var(--btn-primary-bg)] text-[var(--accent)] font-semibold`}
              onClick={save}
            >
              保存全部修改
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
