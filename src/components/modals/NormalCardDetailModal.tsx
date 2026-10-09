import { DetailPanel, DetailHeader, DetailTabs, DetailBody, DetailFooter } from '../ui/DetailChrome';
import { ActionButton } from '../ui/ActionButton';
import React, { useRef, useState, useMemo } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { CustomSelect } from '../ui/CustomSelect';
import { TagEditor } from '../ui/TagEditor';
import { AppData, NormalCardEntry, ItemVersion } from '../../types';
import {
  X,
  User,
  Download,
  Upload,
  Trash2,
  FileText,
  Search,
  Maximize2,
  Minimize2,
  ImageIcon,
  Sparkles,
  Layers,
  Copy,
  Check,
  BookOpen,
  Edit3,
  Sliders,
  Plus,
  ArrowRightLeft,
  Settings,
  Code2,
  Type,
  FileCode,
  Tag,
  Users,
  MessageSquare,
  Compass,
  ScrollText,
  History,
  Link2,
  Globe,
  Film,
  Eye,
  CheckCircle2,
  RotateCcw,
  Clock,
  Sparkle,
  ChevronDown,
  ExternalLink,
  Wand2
} from 'lucide-react';
import { estimateTokens, fileToDataURL, generateCardPngBlob } from '../../utils';
import { NormalCardAIRefineModal } from './NormalCardAIRefineModal';
import { SearchableCardPicker } from '../ui/SearchableCardPicker';
import { GenerateNPCModal } from './GenerateNPCModal';

export interface NormalCardDetailModalProps {
  editingNormalCard: NormalCardEntry | null;
  setEditingNormalCard: any;
  appData: AppData;
  updateAppData: (updater: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type TavernCardTab = 
  | 'details'     // 1. 角色卡详情 (放置图片卡片属性)
  | 'document'    // 2. 文档全部内容 (原始数据)
  | 'attributes'  // 3. 角色属性 (性格，年龄，外貌等)
  | 'relations'   // 4. 家人 (人物关系)
  | 'dialogue'    // 5. 对话示例或者开场白
  | 'scenario'    // 6. 场景对应
  | 'system'      // 7. 系统提示词与附加指令
  | 'versions'    // 8. 历史版本
  | 'links';      // 9. 外部联动 (关联其他角色卡、世界书、番外小剧场)

export const NormalCardDetailModal: React.FC<NormalCardDetailModalProps> = ({
  editingNormalCard,
  setEditingNormalCard,
  appData,
  updateAppData,
  showToast,
}) => {
  if (!editingNormalCard) return null;

  const card = editingNormalCard;

  // Active Tab for the 9-part Tavern View
  const [tavernTab, setTavernTab] = useState<TavernCardTab>('details');
  
  // Document Search & View states
  const [docViewMode, setDocViewMode] = useState<'read' | 'edit'>('read');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showAIRefineModal, setShowAIRefineModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // New item inputs
  const [newAltGreeting, setNewAltGreeting] = useState('');
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyRelation, setNewFamilyRelation] = useState('');
  const [newFamilyNote, setNewFamilyNote] = useState('');

  // External link inputs
  const [selectedLinkCardId, setSelectedLinkCardId] = useState('');
  const [linkRelationType, setLinkRelationType] = useState('朋友');
  const [linkRelationNote, setLinkRelationNote] = useState('');
  const [selectedWorldBookName, setSelectedWorldBookName] = useState('');
  const [newExtraStoryTitle, setNewExtraStoryTitle] = useState('');

  // NPC association states for main character / NPC linking
  const [selectedNpcCardId, setSelectedNpcCardId] = useState('');
  const [npcRelationType, setNpcRelationType] = useState('专属AI');
  const [npcRelationNote, setNpcRelationNote] = useState('');
  const [isAddingNpc, setIsAddingNpc] = useState(false);
  const [showGenerateNpcModal, setShowGenerateNpcModal] = useState(false);

  // Existing creators list for quick datalist suggestions
  const existingCreators = useMemo(() => {
    const creators = new Set<string>();
    (appData.normalCards || []).forEach((c) => {
      if (c.creator?.trim()) creators.add(c.creator.trim());
      if (c.author?.trim()) creators.add(c.author.trim());
    });
    return Array.from(creators);
  }, [appData.normalCards]);

  // Linked NPC associations with resolved card data
  const linkedNpcAssocs = useMemo(() => {
    const assocs = card.associations || [];
    return assocs.map((assoc: any) => {
      const target = (appData.normalCards || []).find((c) => c.id === assoc.targetCardId);
      return {
        ...assoc,
        targetCard: target,
        isNpc: target ? (target.isNpc || target.cardRole === 'npc') : !!assoc.isNpc,
      };
    });
  }, [card.associations, appData.normalCards]);

  // Available cards for NPC linking (exclude self, already linked, and ONLY include NPC cards)
  const availableNpcCards = useMemo(() => {
    const existingIds = new Set((card.associations || []).map((a: any) => a.targetCardId));
    return (appData.normalCards || []).filter(
      (c) =>
        c.id !== card.id &&
        !existingIds.has(c.id) &&
        Boolean(c.isNpc || c.cardRole === 'npc')
    );
  }, [appData.normalCards, card.id, card.associations]);

  const coverInputRef = useRef<HTMLInputElement>(null);

  // Text content calculation (using rawContent if available, else content)
  const textContent = card.rawContent || card.content || '';
  const charCount = textContent.length;
  const wordCount = useMemo(() => {
    const trimmed = textContent.trim();
    if (!trimmed) return 0;
    const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (trimmed.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b\w+\b/g) || []).length;
    return chineseChars + englishWords;
  }, [textContent]);

  const lineCount = useMemo(() => {
    if (!textContent) return 0;
    return textContent.split('\n').length;
  }, [textContent]);

  // Search match count
  const searchMatchCount = useMemo(() => {
    if (!contentSearchQuery.trim() || !textContent) return 0;
    try {
      const q = contentSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(q, 'gi');
      const matches = textContent.match(reg);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [contentSearchQuery, textContent]);

  // Token estimate
  const estimatedTotalTokens = useMemo(() => {
    const combined = [
      card.description || '',
      card.personality || '',
      card.appearance || '',
      card.firstMes || '',
      card.scenario || '',
      card.mesExample || '',
      card.systemPrompt || '',
      card.postHistoryInstructions || '',
      (card.alternateGreetings || []).join('\n'),
    ].join('\n\n');
    return estimateTokens(combined);
  }, [card]);

  // Update card helper
  const updateCardState = (updater: (prev: NormalCardEntry) => NormalCardEntry) => {
    setEditingNormalCard((prev: NormalCardEntry | null) => {
      if (!prev) return null;
      return updater(prev);
    });
  };

  // Handle Cover Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const dataUrl = await fileToDataURL(file);
        updateCardState((prev) => ({ ...prev, coverImage: dataUrl }));
        showToast('已更新角色卡封面图片', 'success');
      } catch {
        showToast('上传图片失败', 'error');
      }
      e.target.value = '';
    }
  };

  // Handle Save
  const handleSave = () => {
    const title = (card.fileName || card.name || card.charName || '未命名角色卡').trim();
    const updatedCard: NormalCardEntry = {
      ...card,
      fileName: card.fileName?.trim() || title,
      name: card.name?.trim() || title,
      charName: card.charName?.trim() || title,
      realName: card.realName?.trim() || '',
      gender: card.gender?.trim() || '未知',
      creator: card.creator?.trim() || card.author?.trim() || 'User',
      author: card.author?.trim() || card.creator?.trim() || 'User',
      category: card.category?.trim() || '默认',
      source: card.source?.trim() || '',
      age: card.age?.trim() || '',
      appearance: card.appearance?.trim() || '',
      description: card.description?.trim() || '',
      firstMes: card.firstMes || '',
      alternateGreetings: card.alternateGreetings || [],
      scenario: card.scenario || '',
      personality: card.personality || '',
      mesExample: card.mesExample || '',
      systemPrompt: card.systemPrompt || '',
      postHistoryInstructions: card.postHistoryInstructions || '',
      creatorNotes: card.creatorNotes || '',
      characterVersion: card.characterVersion || '1.0',
      brief: card.brief?.trim() || '',
      relation: card.relation?.trim() || '',
      reverseRelation: card.reverseRelation?.trim() || '',
      familyRelations: card.familyRelations || [],
      associations: card.associations || [],
      boundWorldBooks: card.boundWorldBooks || [],
      extraStories: card.extraStories || [],
      content: card.content || textContent,
      rawContent: card.rawContent || textContent,
      cardType: 'tavern',
      updatedAt: Date.now(),
    };

    const existingList = appData.normalCards || [];
    const exists = existingList.some((c) => c.id === updatedCard.id);
    let newList: NormalCardEntry[];

    if (exists) {
      newList = existingList.map((c) => (c.id === updatedCard.id ? updatedCard : c));
    } else {
      newList = [updatedCard, ...existingList];
    }

    const cat = updatedCard.category || '默认';
    const existingCats = appData.normalCardCategories || ['默认'];
    const newCats = existingCats.includes(cat) ? existingCats : [...existingCats, cat];

    updateAppData((prev: any) => ({
      ...prev,
      normalCards: newList,
      normalCardCategories: newCats,
    }));

    setEditingNormalCard(null);
    showToast('角色卡已保存！', 'success');
  };

  const handleDelete = () => {
    if (!window.confirm(`确定要删除角色卡【${card.fileName || card.name || '未命名'}】吗？`)) return;
    const existingList = appData.normalCards || [];
    const newList = existingList.filter((c) => c.id !== card.id);
    updateAppData((prev: any) => ({
      ...prev,
      normalCards: newList,
    }));
    setEditingNormalCard(null);
    showToast('已删除角色卡', 'info');
  };

  const handleCopyFullText = () => {
    if (!textContent) {
      showToast('文档内容为空', 'info');
      return;
    }
    navigator.clipboard.writeText(textContent);
    setCopiedSuccess(true);
    showToast('已复制全文内容到剪贴板！', 'success');
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleAIRefineApply = (updatedCard: NormalCardEntry, targetMode: 'tavern' | 'document') => {
    setEditingNormalCard(updatedCard);
    setTavernTab('details');
    
    // Update in global appData list
    const existingList = appData.normalCards || [];
    const newList = existingList.map((c) => (c.id === updatedCard.id ? updatedCard : c));
    updateAppData((prev: any) => ({
      ...prev,
      normalCards: newList,
    }));
  };

  const handleExportTxt = () => {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${card.fileName || card.name || 'character_document'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setShowExportDropdown(false);
    showToast('已导出 .txt 文档', 'success');
  };

  const handleExportJson = () => {
    const exportObj = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: card.charName || card.name || card.fileName || '',
        description: card.description || '',
        personality: card.personality || '',
        scenario: card.scenario || '',
        first_mes: card.firstMes || '',
        mes_example: card.mesExample || '',
        creator_notes: card.creatorNotes || '',
        system_prompt: card.systemPrompt || '',
        post_history_instructions: card.postHistoryInstructions || '',
        alternate_greetings: card.alternateGreetings || [],
        tags: card.customTags || card.tags || [],
        creator: card.author || card.creator || 'User',
        character_version: card.characterVersion || '1.0',
        extensions: {
          age: card.age,
          appearance: card.appearance,
          brief: card.brief,
          relation: card.relation,
          reverseRelation: card.reverseRelation,
          familyRelations: card.familyRelations,
          associations: card.associations,
          boundWorldBooks: card.boundWorldBooks,
          extraStories: card.extraStories,
          isNpc: card.isNpc,
          cardRole: card.cardRole,
        },
      },
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${card.charName || card.name || 'character'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setShowExportDropdown(false);
    showToast('已导出酒馆 V2 JSON 文件', 'success');
  };

  const handleExportPng = async () => {
    try {
      const cardForPng: any = {
        id: card.id,
        name: card.charName || card.name || card.fileName || '',
        description: card.description || '',
        personality: card.personality || '',
        scenario: card.scenario || '',
        firstMes: card.firstMes || '',
        mesExample: card.mesExample || '',
        creatorNotes: card.creatorNotes || '',
        systemPrompt: card.systemPrompt || '',
        postHistoryInstructions: card.postHistoryInstructions || '',
        alternateGreetings: card.alternateGreetings || [],
        customTags: card.customTags || card.tags || [],
        author: card.author || card.creator || 'User',
        creator: card.author || card.creator || 'User',
        coverImage: card.coverImage,
        boundWorldBooks: card.boundWorldBooks || [],
        characterVersion: card.characterVersion || '1.0',
        activeVersionLabel: card.activeVersionLabel || 'V1',
        type: 'normal',
      };
      const blob = await generateCardPngBlob(cardForPng, appData);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${card.charName || card.name || 'character'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setShowExportDropdown(false);
      showToast('已导出 PNG 角色卡', 'success');
    } catch (err) {
      console.error('Failed to export PNG', err);
      showToast('导出 PNG 角色卡失败', 'error');
    }
  };

  const handleExportDoc = (type: 'doc' | 'docx' | 'txt' = 'doc') => {
    if (type === 'txt') {
      handleExportTxt();
      return;
    }

    const title = card.charName || card.name || card.fileName || '角色设定档案';
    const author = card.author || card.creator || '未知';
    const age = card.age || '未知';
    const role = (card.cardRole as any) === 'main' || (card.cardRole as any) === 'protagonist' ? '主角' : (card.cardRole as any) === 'supporting' ? '配角' : card.cardRole === 'npc' ? 'NPC' : '角色';
    const desc = card.description || '无';
    const personality = card.personality || '无';
    const scenario = card.scenario || '无';
    const appearance = card.appearance || '无';
    const relations = (card.familyRelations || []).map((r: any) => `${r.name || '未知'}: ${r.relationship || '未知'} - ${r.notes || ''}`).join('<br/>') || '无';

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: SimSun, 'Microsoft YaHei', Arial, sans-serif; line-height: 1.6; padding: 20px; color: #1e293b; }
          h1 { font-size: 20pt; color: #0f172a; text-align: center; margin-bottom: 8px; }
          .subtitle { text-align: center; color: #64748b; font-size: 11pt; margin-bottom: 24px; }
          h2 { font-size: 13pt; color: #1e3a8a; border-bottom: 1.5px solid #93c5fd; padding-bottom: 4px; margin-top: 20px; }
          .table-prop { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
          .table-prop td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 10.5pt; vertical-align: top; }
          .table-prop .label { background-color: #f1f5f9; font-weight: bold; width: 110px; color: #334155; }
          .content-block { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 10.5pt; line-height: 1.6; white-space: pre-wrap; font-family: SimSun, 'Microsoft YaHei', sans-serif; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">角色设定全量档案 · 作者: ${author}</div>

        <h2>基本属性</h2>
        <table class="table-prop">
          <tr><td class="label">姓名</td><td>${title}</td><td class="label">作者</td><td>${author}</td></tr>
          <tr><td class="label">角色定位</td><td>${role}</td><td class="label">年龄</td><td>${age}</td></tr>
          <tr><td class="label">一句话简述</td><td colspan="3">${card.brief || '无'}</td></tr>
          <tr><td class="label">外貌特征</td><td colspan="3">${appearance}</td></tr>
          <tr><td class="label">家庭/人物关系</td><td colspan="3">${relations}</td></tr>
        </table>

        <h2>性格与人设详细描述</h2>
        <div class="content-block">${personality}</div>

        <h2>背景设定与场景</h2>
        <div class="content-block">${scenario}</div>

        <h2>角色完整背景/文档正文</h2>
        <div class="content-block">${textContent || desc}</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.${type === 'docx' ? 'doc' : type}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setShowExportDropdown(false);
    showToast(`已导出 ${type.toUpperCase()} 角色档案`, 'success');
  };

  // Revert to history version
  const handleRevertVersion = (ver: ItemVersion<any>) => {
    if (!window.confirm(`确定要将角色卡回退至版本【${ver.versionLabel || 'v' + ver.versionNumber}】吗？`)) return;
    const verData = ver.data || {};
    updateCardState((prev) => ({
      ...prev,
      name: verData.name || prev.name,
      charName: verData.charName || prev.charName,
      content: verData.content || prev.content,
      rawContent: verData.rawContent || prev.rawContent,
      description: verData.description || prev.description,
      personality: verData.personality || prev.personality,
      age: verData.age || prev.age,
      appearance: verData.appearance || prev.appearance,
      scenario: verData.scenario || prev.scenario,
      firstMes: verData.firstMes || prev.firstMes,
      systemPrompt: verData.systemPrompt || prev.systemPrompt,
      tags: verData.tags || prev.tags,
      customTags: verData.customTags || prev.customTags,
      familyRelations: verData.familyRelations || prev.familyRelations,
      isNpc: verData.isNpc ?? prev.isNpc,
      cardRole: verData.cardRole ?? prev.cardRole,
      activeVersionNumber: ver.versionNumber,
      activeVersionLabel: ver.versionLabel,
      updatedAt: Date.now(),
    }));
    showToast(`已成功回退至版本 ${ver.versionLabel || 'v' + ver.versionNumber}`, 'success');
  };

  // Create manual snapshot
  const handleCreateManualVersion = () => {
    const currentVersions = card.versions || [];
    const newVerNum = currentVersions.length + 1;
    const newVerLabel = `v${newVerNum + 1}`;
    const newSnapshot: ItemVersion<any> = {
      versionId: `ver_${card.id}_${newVerNum}_${Date.now()}`,
      versionNumber: newVerNum,
      versionLabel: newVerLabel,
      updatedAt: Date.now(),
      importedAt: Date.now(),
      fileName: card.fileName || card.name,
      changeSummary: `手动保存快照 (${newVerLabel})`,
      data: {
        name: card.name,
        charName: card.charName,
        content: card.content,
        rawContent: card.rawContent || card.content,
        description: card.description,
        personality: card.personality,
        age: card.age,
        appearance: card.appearance,
        scenario: card.scenario,
        firstMes: card.firstMes,
        tags: card.tags,
        customTags: card.customTags,
        familyRelations: card.familyRelations,
        systemPrompt: card.systemPrompt,
        isNpc: card.isNpc,
        cardRole: card.cardRole,
      }
    };
    updateCardState((prev) => ({
      ...prev,
      activeVersionNumber: newVerNum + 1,
      activeVersionLabel: newVerLabel,
      versions: [...currentVersions, newSnapshot],
      updatedAt: Date.now(),
    }));
    showToast(`已创建新版本快照 ${newVerLabel}`, 'success');
  };

  // Add Family Relation
  const handleAddFamilyRelation = () => {
    if (!newFamilyName.trim() || !newFamilyRelation.trim()) {
      showToast('请输入关系人姓名与关系类型', 'error');
      return;
    }
    const newRel = {
      name: newFamilyName.trim(),
      relation: newFamilyRelation.trim(),
      note: newFamilyNote.trim() || undefined,
    };
    updateCardState((prev) => ({
      ...prev,
      familyRelations: [...(prev.familyRelations || []), newRel],
    }));
    setNewFamilyName('');
    setNewFamilyRelation('');
    setNewFamilyNote('');
    showToast(`已添加【${newRel.name}】的人物关系`, 'success');
  };

  const handleRemoveFamilyRelation = (index: number) => {
    updateCardState((prev) => ({
      ...prev,
      familyRelations: (prev.familyRelations || []).filter((_, i) => i !== index),
    }));
  };

  // Add External Associated Card
  const handleAddCardAssociation = () => {
    if (!selectedLinkCardId) {
      showToast('请选择要关联的角色卡', 'error');
      return;
    }
    const targetCard = (appData.normalCards || []).find((c) => c.id === selectedLinkCardId);
    if (!targetCard) return;

    const newAssoc = {
      targetCardId: targetCard.id,
      targetCardName: targetCard.name || targetCard.charName || targetCard.fileName || '未命名',
      relationType: linkRelationType,
      note: linkRelationNote.trim() || undefined,
    };

    updateCardState((prev) => {
      const existing = prev.associations || [];
      if (existing.some((a: any) => a.targetCardId === targetCard.id)) {
        return prev;
      }
      return {
        ...prev,
        associations: [...existing, newAssoc as any],
      };
    });

    setSelectedLinkCardId('');
    setLinkRelationNote('');
    showToast(`已关联角色卡【${targetCard.name || targetCard.charName}】`, 'success');
  };

  // Add NPC association specifically for Main Character (or reverse for NPC)
  const handleAddNpcAssociation = () => {
    if (!selectedNpcCardId) {
      showToast('请选择要关联的角色卡', 'error');
      return;
    }
    const target = (appData.normalCards || []).find((c) => c.id === selectedNpcCardId);
    if (!target) return;

    const relation = npcRelationType.trim() || (target.isNpc || target.cardRole === 'npc' ? 'NPC配角' : '关联角色');
    const newAssoc = {
      targetCardId: target.id,
      targetCardName: target.name || target.charName || target.fileName || '未命名',
      relationType: relation,
      note: npcRelationNote.trim() || undefined,
      isNpc: target.isNpc || target.cardRole === 'npc',
    };

    updateCardState((prev) => {
      const existing = prev.associations || [];
      if (existing.some((a: any) => a.targetCardId === target.id)) return prev;
      return {
        ...prev,
        associations: [...existing, newAssoc as any],
      };
    });

    // Bidirectional sync: link back to this main character on the target NPC card
    const currentCardName = card.name || card.charName || card.fileName || '未命名';
    updateAppData((prevAppData: any) => {
      const allCards = prevAppData.normalCards || [];
      const targetIdx = allCards.findIndex((c: any) => c.id === target.id);
      if (targetIdx === -1) return prevAppData;
      const targetCard = allCards[targetIdx];
      const targetAssocs = targetCard.associations || [];
      if (targetAssocs.some((a: any) => a.targetCardId === card.id)) return prevAppData;

      const reverseAssoc = {
        targetCardId: card.id,
        targetCardName: currentCardName,
        relationType: !card.isNpc && card.cardRole !== 'npc' ? `所属主人设 (${relation})` : `关联角色 (${relation})`,
        note: `与【${currentCardName}】互相关联`,
        isNpc: card.isNpc || card.cardRole === 'npc',
      };
      const updatedTargetCard = {
        ...targetCard,
        associations: [...targetAssocs, reverseAssoc],
      };
      const newCards = [...allCards];
      newCards[targetIdx] = updatedTargetCard;
      return {
        ...prevAppData,
        normalCards: newCards,
      };
    });

    setSelectedNpcCardId('');
    setNpcRelationNote('');
    setIsAddingNpc(false);
    showToast(`已成功关联【${target.name || target.charName}】`, 'success');
  };

  // Remove NPC association
  const handleRemoveNpcAssociation = (targetId: string) => {
    updateCardState((prev) => ({
      ...prev,
      associations: (prev.associations || []).filter((a: any) => a.targetCardId !== targetId),
    }));

    // Also remove reverse link from target card if present
    updateAppData((prevAppData: any) => {
      const allCards = prevAppData.normalCards || [];
      const targetIdx = allCards.findIndex((c: any) => c.id === targetId);
      if (targetIdx === -1) return prevAppData;
      const targetCard = allCards[targetIdx];
      const targetAssocs = (targetCard.associations || []).filter((a: any) => a.targetCardId !== card.id);
      const newCards = [...allCards];
      newCards[targetIdx] = { ...targetCard, associations: targetAssocs };
      return {
        ...prevAppData,
        normalCards: newCards,
      };
    });

    showToast('已解除角色关联', 'info');
  };

  // Switch to linked card in the modal
  const handleOpenLinkedCard = (targetCardId: string) => {
    const targetCard = (appData.normalCards || []).find((c) => c.id === targetCardId);
    if (targetCard) {
      setEditingNormalCard(targetCard);
      showToast(`已切换至角色卡【${targetCard.name || targetCard.charName}】`, 'info');
    }
  };

  // Bind World Book
  const handleAddWorldBook = () => {
    if (!selectedWorldBookName.trim()) return;
    updateCardState((prev) => {
      const existing = prev.boundWorldBooks || [];
      if (existing.includes(selectedWorldBookName.trim())) return prev;
      return { ...prev, boundWorldBooks: [...existing, selectedWorldBookName.trim()] };
    });
    setSelectedWorldBookName('');
    showToast('已绑定世界书', 'success');
  };

  // Add Extra Story
  const handleAddExtraStory = () => {
    if (!newExtraStoryTitle.trim()) return;
    updateCardState((prev) => {
      const existing = prev.extraStories || [];
      return { ...prev, extraStories: [...existing, newExtraStoryTitle.trim()] };
    });
    setNewExtraStoryTitle('');
    showToast('已添加番外小剧场联动', 'success');
  };

  // Tabs definition in the exact 9-step order requested by user:
  const TAB_ITEMS: { id: TavernCardTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: 'details', label: '角色卡详情', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'document', label: '文档全部内容', icon: <FileText className="w-3.5 h-3.5" />, badge: `${wordCount}字` },
    { id: 'attributes', label: '角色属性', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'relations', label: '家人 (人物关系)', icon: <Users className="w-3.5 h-3.5" />, badge: card.familyRelations?.length || 0 },
    { id: 'dialogue', label: '对话示例 / 开场白', icon: <MessageSquare className="w-3.5 h-3.5" />, badge: (card.alternateGreetings?.length || 0) + 1 },
    { id: 'scenario', label: '场景对应', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'system', label: '系统提示词与附加指令', icon: <ScrollText className="w-3.5 h-3.5" /> },
    { id: 'versions', label: '历史版本', icon: <History className="w-3.5 h-3.5" />, badge: (card.versions?.length || 0) + 1 },
    { id: 'links', label: '外部联动', icon: <Link2 className="w-3.5 h-3.5" />, badge: (card.associations?.length || 0) + (card.boundWorldBooks?.length || 0) },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
        <DetailPanel data-design-id="normal-card-detail-modal" className={isExpanded ? "max-w-7xl" : "max-w-5xl"}>
          {/* Header */}
          <DetailHeader designPrefix="normal-card-detail" title={card.charName || card.name || card.fileName || '角色卡详情'} version={card.activeVersionLabel} badge={card.isNpc || card.cardRole === 'npc' ? 'NPC 配角' : '主人设'} onClose={() => setEditingNormalCard(null)} actions={<><ActionButton designId="ai-refine-trigger-btn" type="button" onClick={() => setShowAIRefineModal(true)} title="使用 AI 提取人设属性、性格与人物关系并生成新版本" action="custom" context="toolbar">
                <Sparkles className="w-3 h-3 animate-pulse text-purple-200" />
                <span className="hidden sm:inline">AI 精修</span>
                <span className="sm:hidden">精修</span>
              </ActionButton></>} tags={<div className="flex items-center gap-2"><span className="truncate">文件: {card.fileName || '未命名'}</span><span className="shrink-0">约 {estimatedTotalTokens} Tokens</span></div>} />

          {/* 9-Tab Navigation Bar */}
          <DetailTabs designPrefix="normal-card-detail" label="角色卡详情导航" tabs={TAB_ITEMS.map(tab => ({id: tab.id, name: <>{tab.icon}<span>{tab.label}</span>{!!tab.badge && <span className="text-[9px]">({tab.badge})</span>}</>}))} activeTab={tavernTab} onChange={setTavernTab} />

          {/* Modal Main Body */}
          <DetailBody className="p-4 sm:p-6 space-y-6">
            
            {/* ══════ 1. 角色卡详情 (放置图片卡片属性) ══════ */}
            {tavernTab === 'details' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Left: Cover Image Box */}
                  <div className="flex flex-col items-center p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
                    <input
                      type="file"
                      ref={coverInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                    <div className="relative group w-36 h-48 sm:w-44 sm:h-56 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                      {card.coverImage ? (
                        <img
                          src={card.coverImage}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-4 text-center text-zinc-400">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                          <span className="text-xs">暂无封面图片</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-100 shadow-md"
                        >
                          更换封面
                        </button>
                        {card.coverImage && (
                          <button
                            type="button"
                            onClick={() => updateCardState((prev) => ({ ...prev, coverImage: null }))}
                            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] hover:bg-rose-700"
                          >
                            清除封面
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      支持 PNG、WebP、JPG 图片格式，可作为角色卡头像与卡片封面
                    </p>
                  </div>

                  {/* Right: Card Attributes */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Role Toggle Switch */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 block">角色定位与分类</span>
                        <span className="text-[10px] text-zinc-500">主角卡与 NPC 配角在列表中支持独立切换与管理</span>
                      </div>
                      <div className="flex items-center p-1 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => updateCardState((prev) => ({ ...prev, isNpc: false, cardRole: 'main' }))}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 !text-[13px] !leading-relaxed font-bold rounded-md transition-all whitespace-nowrap ${
                            !card.isNpc && card.cardRole !== 'npc'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                          }`}
                        >
                          主角色卡
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCardState((prev) => ({ ...prev, isNpc: true, cardRole: 'npc' }))}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 !text-[13px] !leading-relaxed font-bold rounded-md transition-all whitespace-nowrap ${
                            card.isNpc || card.cardRole === 'npc'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                          }`}
                        >
                          NPC 配角
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4.5">
                      <div className="space-y-1">
                        <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block">
                          角色卡名称 / 文件名
                        </label>
                        <BaseInput
                          designId="card-name-input"
                          value={card.name || card.fileName || ''}
                          onChange={(e: any) => updateCardState((prev) => ({ ...prev, name: e.target.value, fileName: e.target.value }))}
                          placeholder="例如: 白庭川"
                          className="w-full h-9 min-h-[36px] !text-[13px] !leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block">
                          角色本名 (Char Name)
                        </label>
                        <BaseInput
                          designId="char-name-input"
                          value={card.charName || card.name || ''}
                          onChange={(e: any) => updateCardState((prev) => ({ ...prev, charName: e.target.value }))}
                          placeholder="模型识别的角色名"
                          className="w-full h-9 min-h-[36px] !text-[13px] !leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block">
                          真名 / 曾用名 (Real Name)
                        </label>
                        <BaseInput
                          designId="real-name-input"
                          value={card.realName || ''}
                          onChange={(e: any) => updateCardState((prev) => ({ ...prev, realName: e.target.value }))}
                          placeholder="隐秘真名或代号"
                          className="w-full h-9 min-h-[36px] !text-[13px] !leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block">
                          性别 (Gender)
                        </label>
                        <div className="relative">
                          <select
                            value={card.gender || '未知'}
                            onChange={(e: any) => updateCardState((prev) => ({ ...prev, gender: e.target.value }))}
                            className="w-full h-9 min-h-[36px] px-3.5 pr-8 !text-[13px] !leading-relaxed rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                          >
                            <option value="未知">未知 / 通用</option>
                            <option value="男">男 (Male)</option>
                            <option value="女">女 (Female)</option>
                            <option value="其他">其他</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block">
                          所属分组 (Category)
                        </label>
                        <div className="relative">
                          <select
                            value={card.category || '默认'}
                            onChange={(e: any) => updateCardState((prev) => ({ ...prev, category: e.target.value }))}
                            className="w-full h-9 min-h-[36px] px-3.5 pr-8 !text-[13px] !leading-relaxed rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                          >
                            {Array.from(new Set(['默认', ...(appData.normalCardCategories || [])])).map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block">
                          创作者 / 原作者 (Creator)
                        </label>
                        <div className="relative">
                          <BaseInput
                            designId="creator-input"
                            list="creator-options-list"
                            value={card.creator || card.author || ''}
                            onChange={(e: any) => updateCardState((prev) => ({ ...prev, creator: e.target.value, author: e.target.value }))}
                            placeholder="作者名字"
                            className="w-full h-9 min-h-[36px] !text-[13px] !leading-relaxed"
                          />
                          <datalist id="creator-options-list">
                            {existingCreators.map((authorName) => (
                              <option key={authorName} value={authorName} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    </div>

                    {/* Custom Tags */}
                    <div>
                      <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                        自定义标签 (Tags)
                      </label>
                      <TagEditor
                        customTags={card.customTags || card.tags || []}
                        onChange={(newTags) => updateCardState((prev) => ({ ...prev, customTags: newTags, tags: newTags }))}
                        availableTags={appData.normalCardTags || []}
                      />
                    </div>

                    {/* 关联 NPC 配角 (主人设关联随从/专属AI/管家/死党/宿敌，或 NPC 配角查看所属主人设) */}
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                              {!card.isNpc && card.cardRole !== 'npc' ? '关联 NPC 配角' : '所属主人设 / 关联角色'}
                            </h4>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {linkedNpcAssocs.length}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {!card.isNpc && card.cardRole !== 'npc'
                              ? '为该主人设绑定专属配角、随从、专属AI、管家、死党或宿敌 NPC'
                              : '该 NPC 配角关联绑定的主人设角色卡'}
                          </p>
                        </div>
                        
                        {/* 按键放在小字下面，按键缩小 */}
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          {!card.isNpc && card.cardRole !== 'npc' && (
                            <button
                              type="button"
                              onClick={() => setShowGenerateNpcModal(true)}
                              className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-1 transition-all shadow-xs whitespace-nowrap h-6"
                            >
                              <Wand2 className="w-2.5 h-2.5 flex-shrink-0" />
                              <span>✨ 批量生成 NPC</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsAddingNpc(!isAddingNpc)}
                            className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-md flex items-center gap-1 transition-all whitespace-nowrap h-6"
                          >
                            <Plus className={`w-2.5 h-2.5 flex-shrink-0 transition-transform ${isAddingNpc ? 'rotate-45' : ''}`} />
                            <span>{isAddingNpc ? '取消' : '关联 NPC'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick Add Association Box */}
                      {isAddingNpc && (
                        <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2 animate-in fade-in duration-150">
                          <div className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                            {!card.isNpc && card.cardRole !== 'npc' ? '选择并关联 NPC 配角' : '选择关联角色卡'}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <SearchableCardPicker
                                cards={availableNpcCards}
                                selectedCardId={selectedNpcCardId}
                                onSelectCard={(id) => setSelectedNpcCardId(id)}
                                placeholder="-- 搜索并选择已有 NPC 配角 --"
                                filterOnlyNpc={true}
                                excludeCardId={card.id}
                                emptyMessage="暂无可选择的 NPC 配角，可点击上方「✨ 批量生成 NPC」一键生成"
                              />
                            </div>
                            <div>
                              <BaseInput
                                designId="npc-rel-role-input"
                                value={npcRelationType}
                                onChange={(e: any) => setNpcRelationType(e.target.value)}
                                placeholder="身份/关系 (如: 专属AI / 管家 / 死党)"
                                className="w-full h-8 !text-[13px] !leading-relaxed"
                              />
                            </div>
                            <div>
                              <BaseInput
                                designId="npc-rel-note-input"
                                value={npcRelationNote}
                                onChange={(e: any) => setNpcRelationNote(e.target.value)}
                                placeholder="互动备注 (可选)"
                                className="w-full h-8 !text-[13px] !leading-relaxed"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 flex-wrap gap-1.5">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                              {['专属AI', '管家', '随从', '死党', '宿敌', '下属', '暗卫'].map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setNpcRelationType(tag)}
                                  className="px-1.5 py-0.5 text-[9px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 whitespace-nowrap transition-colors"
                                >
                                  +{tag}
                                </button>
                              ))}
                            </div>
                            <BaseButton size="xs"
                              designId="confirm-add-npc-btn"
                              type="button"
                              variant="primary"
                              
                              onClick={handleAddNpcAssociation}
                              className="h-6 px-3 text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs"
                            >
                              确认关联
                            </BaseButton>
                          </div>
                        </div>
                      )}

                      {/* Linked NPCs List */}
                      {linkedNpcAssocs.length === 0 ? (
                        <div className="p-3 text-center text-[10px] text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                          {!card.isNpc && card.cardRole !== 'npc'
                            ? '暂无关联的 NPC 配角，点击上方「批量生成 NPC」或「关联 NPC」即可绑定配角'
                            : '暂无关联角色'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {linkedNpcAssocs.map((assoc: any, idx: number) => {
                            const target = assoc.targetCard;
                            const targetName = assoc.targetCardName || target?.name || target?.charName || '未命名';
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {target?.coverImage ? (
                                    <img
                                      src={target.coverImage}
                                      alt={targetName}
                                      className="w-7 h-7 rounded object-cover flex-shrink-0 border border-zinc-200 dark:border-zinc-700"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0 text-[9px] font-bold">
                                      {target?.isNpc || target?.cardRole === 'npc' ? 'NPC' : '角色'}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold !text-[13px] !leading-relaxed text-zinc-900 dark:text-zinc-100 truncate">
                                        {targetName}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                        {assoc.relationType || '配角'}
                                      </span>
                                    </div>
                                    {assoc.note && (
                                      <p className="text-[9px] text-zinc-500 truncate">{assoc.note}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {target && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLinkedCard(target.id)}
                                      className="p-1 text-zinc-400 hover:text-blue-600 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                      title="查看该角色卡"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNpcAssociation(assoc.targetCardId)}
                                    className="p-1 text-zinc-400 hover:text-rose-500 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                    title="解除关联"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════ 2. 文档全部内容 (原始数据) ══════ */}
            {tavernTab === 'document' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Document Toolbar - Compact refined buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-2.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 w-full sm:flex-1 sm:min-w-[180px]">
                    <div className="relative flex-1">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={contentSearchQuery}
                        onChange={(e) => setContentSearchQuery(e.target.value)}
                        placeholder="在文档全文中搜索关键字..."
                        className="w-full pl-6 pr-2.5 py-1 !text-[13px] !leading-relaxed h-6 sm:h-6.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {contentSearchQuery && (
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                        匹配: {searchMatchCount} 处
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {/* Mode switch: Read vs Edit */}
                    <div className="flex items-center p-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-md">
                      <button
                        type="button"
                        onClick={() => setDocViewMode('read')}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded h-5.5 sm:h-6 flex items-center transition-all ${
                          docViewMode === 'read' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
                        }`}
                      >
                        阅读排版
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocViewMode('edit')}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded h-5.5 sm:h-6 flex items-center transition-all ${
                          docViewMode === 'edit' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
                        }`}
                      >
                        编辑文本
                      </button>
                    </div>

                    <BaseButton size="xs"
                      designId="copy-full-doc-btn"
                      type="button"
                      variant="outline"
                      
                      onClick={handleCopyFullText}
                      className="text-[8.5px] sm:text-[10px] h-5 sm:h-6 px-1.5 sm:px-2 py-0.5 font-medium"
                    >
                      {copiedSuccess ? <Check className="w-2.5 h-2.5 text-emerald-500 mr-1" /> : <Copy className="w-2.5 h-2.5 mr-1" />}
                      复制全文
                    </BaseButton>

                    <BaseButton size="xs"
                      designId="export-txt-btn"
                      type="button"
                      variant="outline"
                      
                      onClick={handleExportTxt}
                      className="text-[8.5px] sm:text-[10px] h-5 sm:h-6 px-1.5 sm:px-2 py-0.5 font-medium"
                    >
                      <Download className="w-2.5 h-2.5 mr-1" />
                      导出 TXT
                    </BaseButton>

                    <BaseButton size="xs"
                      designId="doc-ai-refine-btn"
                      type="button"
                      variant="primary"
                      
                      onClick={() => setShowAIRefineModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs text-[8.5px] sm:text-[10px] h-5 sm:h-6 px-1.5 sm:px-2 py-0.5 font-bold"
                    >
                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                      AI 提取精修
                    </BaseButton>
                  </div>
                </div>

                {/* Content Area */}
                {docViewMode === 'read' ? (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 min-h-[380px] max-h-[550px] overflow-y-auto font-mono !text-[13px] !leading-relaxed leading-relaxed whitespace-pre-wrap select-text">
                    {textContent || '（文档内容为空）'}
                  </div>
                ) : (
                  <textarea
                    value={textContent}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, content: e.target.value, rawContent: e.target.value }))}
                    rows={18}
                    className="w-full p-4 !text-[13px] !leading-relaxed font-mono rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    placeholder="在此编辑人设文档全部原始内容..."
                  />
                )}
              </div>
            )}

            {/* ══════ 3. 角色属性 (性格，年龄，外貌等) ══════ */}
            {tavernTab === 'attributes' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      年龄 (Age)
                    </label>
                    <BaseInput
                      designId="attr-age-input"
                      value={card.age || ''}
                      onChange={(e: any) => updateCardState((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="例如: 38岁 / 24岁"
                      className="w-full !text-[13px] !leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      简量人设 / 他人感知视角 (Brief)
                    </label>
                    <BaseInput
                      designId="attr-brief-input"
                      value={card.brief || ''}
                      onChange={(e: any) => updateCardState((prev) => ({ ...prev, brief: e.target.value }))}
                      placeholder="适合 NPC 或快速感知的一句话或短概括"
                      className="w-full !text-[13px] !leading-relaxed"
                    />
                  </div>
                </div>

                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    外貌描写与细节 (Appearance)
                  </label>
                  <textarea
                    value={card.appearance || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, appearance: e.target.value }))}
                    rows={3}
                    placeholder="五官特征、身高体态、眼眸发色、衣着打扮、标志性外貌特征..."
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    性格特征与行为倾向 (Personality)
                  </label>
                  <textarea
                    value={card.personality || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, personality: e.target.value }))}
                    rows={4}
                    placeholder="核心性格、处事风格、情绪表达、心理防线、喜怒哀乐表现..."
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    核心身世设定与经历 (Description / Persona)
                  </label>
                  <textarea
                    value={card.description || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, description: e.target.value }))}
                    rows={8}
                    placeholder="角色的成长背景、职业经历、当前处境、生活习惯、说话口吻与核心人设设定..."
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* ══════ 4. 家人 (人物关系) ══════ */}
            {tavernTab === 'relations' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* NPC Relative Relation Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      TA 对主角关系称谓 (Relation)
                    </label>
                    <BaseInput
                      designId="rel-to-user-input"
                      value={card.relation || ''}
                      onChange={(e: any) => updateCardState((prev) => ({ ...prev, relation: e.target.value }))}
                      placeholder="例如: 亲密恋人 / 得力下属 / 昔日恩师"
                      className="w-full !text-[13px] !leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      主角对 TA 关系称谓 (Reverse Relation)
                    </label>
                    <BaseInput
                      designId="rel-rev-user-input"
                      value={card.reverseRelation || ''}
                      onChange={(e: any) => updateCardState((prev) => ({ ...prev, reverseRelation: e.target.value }))}
                      placeholder="例如: 唯一软肋 / 顶头上司 / 关门弟子"
                      className="w-full !text-[13px] !leading-relaxed"
                    />
                  </div>
                </div>

                {/* Family & Key Relations List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      家人与重要关系人列表 ({card.familyRelations?.length || 0})
                    </h3>
                  </div>

                  {/* Add New Relation Form */}
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <div className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300">添加人物关系条目</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <BaseInput
                        designId="new-fam-name"
                        value={newFamilyName}
                        onChange={(e: any) => setNewFamilyName(e.target.value)}
                        placeholder="关系人姓名 (如: 白母)"
                        className="!text-[13px] !leading-relaxed"
                      />
                      <BaseInput
                        designId="new-fam-rel"
                        value={newFamilyRelation}
                        onChange={(e: any) => setNewFamilyRelation(e.target.value)}
                        placeholder="关系类型 (如: 母亲 / 弟弟 / 朋友)"
                        className="!text-[13px] !leading-relaxed"
                      />
                      <BaseInput
                        designId="new-fam-note"
                        value={newFamilyNote}
                        onChange={(e: any) => setNewFamilyNote(e.target.value)}
                        placeholder="备注 (如: 极少干涉其私生活)"
                        className="!text-[13px] !leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-end">
                      <BaseButton size="xs"
                        designId="add-fam-btn"
                        type="button"
                        variant="outline"
                        
                        onClick={handleAddFamilyRelation}
                        className="!text-[13px] !leading-relaxed h-7 px-3"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        添加关系
                      </BaseButton>
                    </div>
                  </div>

                  {/* Existing List */}
                  {(!card.familyRelations || card.familyRelations.length === 0) ? (
                    <div className="p-6 text-center !text-[13px] !leading-relaxed text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      暂无人物关系记录，可在上方添加家人、朋友、同门、上下级等关系
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {card.familyRelations.map((rel, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="font-bold !text-[13px] !leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                              {rel.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {rel.relation}
                            </span>
                            {rel.note && (
                              <span className="!text-[13px] !leading-relaxed text-zinc-500 dark:text-zinc-400 truncate">
                                {rel.note}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFamilyRelation(idx)}
                            className="text-zinc-400 hover:text-rose-500 p-1"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked NPC Section in Relations Tab */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      {!card.isNpc && card.cardRole !== 'npc' ? '已绑定的 NPC 配角' : '所属主人设 / 关联角色'} ({linkedNpcAssocs.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTavernTab('details')}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      前往详情管理
                    </button>
                  </div>
                  {linkedNpcAssocs.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      暂无绑定的 NPC 配角，可在「角色卡详情」中关联 NPC
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {linkedNpcAssocs.map((assoc: any, idx: number) => {
                        const target = assoc.targetCard;
                        const targetName = assoc.targetCardName || target?.name || target?.charName || '未命名';
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-bold !text-[13px] !leading-relaxed text-zinc-900 dark:text-zinc-100 truncate">
                                {targetName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                {assoc.relationType || '配角'}
                              </span>
                              {assoc.note && (
                                <span className="text-[10px] text-zinc-500 truncate">{assoc.note}</span>
                              )}
                            </div>
                            {target && (
                              <button
                                type="button"
                                onClick={() => handleOpenLinkedCard(target.id)}
                                className="text-zinc-400 hover:text-blue-600 p-1"
                                title="切换至该角色卡"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════ 5. 对话示例或者开场白 ══════ */}
            {tavernTab === 'dialogue' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* First Mes */}
                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    初始首条开场白 / 登场问候语 (First Message)
                  </label>
                  <textarea
                    value={card.firstMes || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, firstMes: e.target.value }))}
                    rows={5}
                    placeholder="角色初次登场的开场白与问候动作描写..."
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>

                {/* Alternate Greetings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300">
                      备用开场白问候列表 ({card.alternateGreetings?.length || 0})
                    </label>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={newAltGreeting}
                      onChange={(e) => setNewAltGreeting(e.target.value)}
                      rows={2}
                      placeholder="输入新的备用开场白..."
                      className="w-full !text-[13px] !leading-relaxed p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono"
                    />
                    <div className="flex justify-end">
                      <BaseButton size="xs"
                        designId="add-alt-greeting-btn"
                        type="button"
                        variant="outline"
                        
                        onClick={() => {
                          if (!newAltGreeting.trim()) return;
                          updateCardState((prev) => ({
                            ...prev,
                            alternateGreetings: [...(prev.alternateGreetings || []), newAltGreeting.trim()],
                          }));
                          setNewAltGreeting('');
                          showToast('已添加备用开场白', 'success');
                        }}
                        className="!text-[13px] !leading-relaxed h-7 px-3"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        添加备用开场白
                      </BaseButton>
                    </div>
                  </div>

                  {card.alternateGreetings && card.alternateGreetings.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {card.alternateGreetings.map((greet, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-2"
                        >
                          <div className="font-mono !text-[13px] !leading-relaxed text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap flex-1">
                            {greet}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateCardState((prev) => ({
                                ...prev,
                                alternateGreetings: (prev.alternateGreetings || []).filter((_, i) => i !== idx),
                              }));
                            }}
                            className="text-zinc-400 hover:text-rose-500 p-1 flex-shrink-0"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Examples */}
                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    对话样板示例 (Message Example)
                  </label>
                  <textarea
                    value={card.mesExample || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, mesExample: e.target.value }))}
                    rows={6}
                    placeholder="<START>&#10;{{user}}: 你在看什么？&#10;{{char}}: 没什么，窗外的夜景而已。"
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* ══════ 6. 场景对应 ══════ */}
            {tavernTab === 'scenario' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    场景与环境设定 (Scenario)
                  </label>
                  <p className="text-[10px] text-zinc-500 mb-2">
                    角色所处的初始背景、当前事件、地点环境与氛围，引导 AI 生成符合情境的互动。
                  </p>
                  <textarea
                    value={card.scenario || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, scenario: e.target.value }))}
                    rows={8}
                    placeholder="例如: 某私募基金的深夜合伙人办公室内；或是郊区别墅的观星露台上..."
                    className="w-full !text-[13px] !leading-relaxed p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* ══════ 7. 系统提示词与附加指令 ══════ */}
            {tavernTab === 'system' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    系统提示词 (System Prompt)
                  </label>
                  <textarea
                    value={card.systemPrompt || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={4}
                    placeholder="写入角色的系统层级指示与强制扮演规则..."
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    深度历史指令 / 附加注入 (Post History Instructions)
                  </label>
                  <textarea
                    value={card.postHistoryInstructions || ''}
                    onChange={(e) => updateCardState((prev) => ({ ...prev, postHistoryInstructions: e.target.value }))}
                    rows={4}
                    placeholder="在上下文对话历史最末尾处注入的即时指令..."
                    className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      创作者备注 (Creator Notes)
                    </label>
                    <textarea
                      value={card.creatorNotes || ''}
                      onChange={(e) => updateCardState((prev) => ({ ...prev, creatorNotes: e.target.value }))}
                      rows={3}
                      placeholder="作者的特别提示、设定背景说明..."
                      className="w-full !text-[13px] !leading-relaxed p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="!text-[13px] !leading-relaxed font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      角色卡版本号 (Character Version)
                    </label>
                    <BaseInput
                      designId="char-version-input"
                      value={card.characterVersion || '1.0'}
                      onChange={(e: any) => updateCardState((prev) => ({ ...prev, characterVersion: e.target.value }))}
                      placeholder="1.0"
                      className="w-full !text-[13px] !leading-relaxed mb-3"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══════ 8. 历史版本 ══════ */}
            {tavernTab === 'versions' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 block">版本历史与快照</span>
                    <span className="text-[10px] text-zinc-500">
                      当前激活版本: <strong className="text-emerald-600 font-mono">{card.activeVersionLabel || 'v1'}</strong>
                    </span>
                  </div>
                  <BaseButton size="xs"
                    designId="create-manual-ver-btn"
                    type="button"
                    variant="outline"
                    
                    onClick={handleCreateManualVersion}
                    className="!text-[13px] !leading-relaxed h-7 px-2.5"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    创建当前快照
                  </BaseButton>
                </div>

                {(!card.versions || card.versions.length === 0) ? (
                  <div className="p-8 text-center !text-[13px] !leading-relaxed text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    暂无历史版本快照。每次进行 AI 智能精修时，系统均会自动为您生成前置快照版本。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {card.versions.map((ver, idx) => {
                      const isCurrent = card.activeVersionNumber === ver.versionNumber;
                      return (
                        <div
                          key={ver.versionId || idx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isCurrent
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono !text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100">
                                {ver.versionLabel || `v${ver.versionNumber || idx + 1}`}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                  当前使用
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                {new Date(ver.updatedAt || ver.importedAt || Date.now()).toLocaleString()}
                              </span>
                            </div>
                            <p className="!text-[13px] !leading-relaxed text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              {ver.changeSummary || '历史快照记录'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!isCurrent && (
                              <BaseButton size="xs"
                                designId={`revert-ver-${idx}`}
                                type="button"
                                variant="outline"
                                
                                onClick={() => handleRevertVersion(ver)}
                                className="!text-[13px] !leading-relaxed h-7 px-2.5"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                回退此版本
                              </BaseButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════ 9. 外部联动 (关联其他角色卡、世界书、番外小剧场) ══════ */}
            {tavernTab === 'links' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* 1. 关联其他角色卡 */}
                <div className="space-y-3">
                  <h3 className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-500" />
                    关联角色卡 / NPC 配角 (专属AI / 管家 / 随从 / 死党 / 宿敌 / 朋友)
                  </h3>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <SearchableCardPicker
                          cards={(appData.normalCards || []).filter((c) => c.id !== card.id)}
                          selectedCardId={selectedLinkCardId}
                          onSelectCard={(id) => setSelectedLinkCardId(id)}
                          placeholder="-- 搜索并选择已有角色卡/NPC --"
                          filterOnlyNpc={false}
                          excludeCardId={card.id}
                        />
                      </div>
                      <BaseInput
                        designId="link-rel-type"
                        value={linkRelationType}
                        onChange={(e: any) => setLinkRelationType(e.target.value)}
                        placeholder="关系类型 (如: 兄弟/下属/挚友)"
                        className="w-full h-8 !text-[13px] !leading-relaxed"
                      />
                      <BaseInput
                        designId="link-rel-note"
                        value={linkRelationNote}
                        onChange={(e: any) => setLinkRelationNote(e.target.value)}
                        placeholder="联动说明 (可选)"
                        className="w-full h-8 !text-[13px] !leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-end">
                      <BaseButton size="xs"
                        designId="add-card-link-btn"
                        type="button"
                        variant="outline"
                        
                        onClick={handleAddCardAssociation}
                        className="!text-[13px] !leading-relaxed h-7 px-3"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        添加角色联动
                      </BaseButton>
                    </div>
                  </div>

                  {card.associations && card.associations.length > 0 && (
                    <div className="space-y-2">
                      {card.associations.map((assoc: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold !text-[13px] !leading-relaxed text-zinc-900 dark:text-zinc-100">{assoc.targetCardName}</span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                              {assoc.relationType}
                            </span>
                            {assoc.note && <span className="!text-[13px] !leading-relaxed text-zinc-500">{assoc.note}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateCardState((prev) => ({
                                ...prev,
                                associations: (prev.associations || []).filter((_, idx) => idx !== i),
                              }));
                            }}
                            className="text-zinc-400 hover:text-rose-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. 关联世界书 */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    关联世界书 (World Books)
                  </h3>
                  <div className="flex items-center gap-2">
                    <BaseInput
                      designId="wb-input"
                      value={selectedWorldBookName}
                      onChange={(e: any) => setSelectedWorldBookName(e.target.value)}
                      placeholder="输入要绑定的世界书名称或设定集..."
                      className="!text-[13px] !leading-relaxed flex-1"
                    />
                    <BaseButton size="xs"
                      designId="add-wb-btn"
                      type="button"
                      variant="outline"
                      
                      onClick={handleAddWorldBook}
                      className="!text-[13px] !leading-relaxed h-8 px-3"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      绑定
                    </BaseButton>
                  </div>
                  {card.boundWorldBooks && card.boundWorldBooks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.boundWorldBooks.map((wb, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg !text-[13px] !leading-relaxed bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          <BookOpen className="w-3 h-3" />
                          {wb}
                          <button
                            type="button"
                            onClick={() => {
                              updateCardState((prev) => ({
                                ...prev,
                                boundWorldBooks: (prev.boundWorldBooks || []).filter((_, idx) => idx !== i),
                              }));
                            }}
                            className="hover:text-rose-500 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. 关联番外小剧场 */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="!text-[13px] !leading-relaxed font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-purple-500" />
                    关联番外小剧场 (Extra Stories)
                  </h3>
                  <div className="flex items-center gap-2">
                    <BaseInput
                      designId="extra-story-input"
                      value={newExtraStoryTitle}
                      onChange={(e: any) => setNewExtraStoryTitle(e.target.value)}
                      placeholder="输入番外小剧场篇名或短剧主题..."
                      className="!text-[13px] !leading-relaxed flex-1"
                    />
                    <BaseButton size="xs"
                      designId="add-extra-story-btn"
                      type="button"
                      variant="outline"
                      
                      onClick={handleAddExtraStory}
                      className="!text-[13px] !leading-relaxed h-8 px-3"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加番外
                    </BaseButton>
                  </div>
                  {card.extraStories && card.extraStories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.extraStories.map((story, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg !text-[13px] !leading-relaxed bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                          <Film className="w-3 h-3" />
                          {story}
                          <button
                            type="button"
                            onClick={() => {
                              updateCardState((prev) => ({
                                ...prev,
                                extraStories: (prev.extraStories || []).filter((_, idx) => idx !== i),
                              }));
                            }}
                            className="hover:text-rose-500 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </DetailBody>

          {/* Modal Footer */}
          <DetailFooter data-design-id="normal-card-detail-footer">
            <div className="flex items-center gap-2">
              <ActionButton action="delete" context="detail"
                type="button"
                onClick={handleDelete}
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>删除角色卡</span>
              </ActionButton>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 3-Format Export Dropdown */}
              <div className="relative">
                <ActionButton designId="export-normal-card-btn" type="button" onClick={() => setShowExportDropdown((p) => !p)} title="导出角色卡（支持 JSON、PNG、DOC/DOCX/TXT 三种格式）" action="export" context="detail">
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>导出</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </ActionButton>

                {showExportDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportDropdown(false)}
                    />
                    <div className="absolute right-0 bottom-full mb-1.5 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 p-1 space-y-0.5 text-left animate-in fade-in zoom-in-95">
                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full px-2.5 py-1.5 text-[10px] sm:text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-between text-left transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileCode className="w-3.5 h-3.5 text-blue-500" />
                          导出 JSON (.json)
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">V2规范</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportPng}
                        className="w-full px-2.5 py-1.5 text-[10px] sm:text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-between text-left transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                          导出 PNG 卡面 (.png)
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">内嵌卡图</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportDoc('doc')}
                        className="w-full px-2.5 py-1.5 text-[10px] sm:text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-between text-left transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          导出 Word 文档 (.doc)
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">人设档案</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportDoc('txt')}
                        className="w-full px-2.5 py-1.5 text-[10px] sm:text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-between text-left transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <ScrollText className="w-3.5 h-3.5 text-emerald-500" />
                          导出 纯文本 (.txt)
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">正文导出</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <ActionButton designId="save-normal-card-btn" type="button" onClick={handleSave} action="save" context="detail">
                保存修改
              </ActionButton>
            </div>
          </DetailFooter>
        </DetailPanel>
      </div>

      {/* AI Refine Modal */}
      {showAIRefineModal && (
        <NormalCardAIRefineModal
          isOpen={showAIRefineModal}
          onClose={() => setShowAIRefineModal(false)}
          card={card}
          appData={appData}
          updateAppData={updateAppData}
          showToast={showToast}
          onApplyResult={handleAIRefineApply}
        />
      )}

      {/* Generate NPC Modal */}
      {showGenerateNpcModal && (
        <GenerateNPCModal
          isOpen={showGenerateNpcModal}
          onClose={() => setShowGenerateNpcModal(false)}
          card={card}
          appData={appData}
          updateAppData={updateAppData}
          showToast={showToast}
          onNpcsCreated={(newAssocs) => {
            updateCardState((prev) => ({
              ...prev,
              associations: [...(prev.associations || []), ...newAssocs],
            }));
          }}
        />
      )}
    </>
  );
};

