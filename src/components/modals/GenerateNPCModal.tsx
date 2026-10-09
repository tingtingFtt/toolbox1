import React, { useState, useMemo } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { AppData, NormalCardEntry, CardAssociation } from '../../types';
import {
  X,
  Sparkles,
  Users,
  UserPlus,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  ChevronDown,
  Info,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { getGlobalApiSettings } from '../../utils';

export interface GeneratedNPCItem {
  id: string;
  selected: boolean;
  name: string;
  gender: string;
  age: string;
  relation: string; // TA 对主角的称谓
  reverseRelation: string; // 主角对 TA 的称谓
  relationNote?: string;
  brief: string; // 简量人设
  personality: string; // 性格特征
  appearance?: string; // 外貌细节
  persona?: string; // 背景小传
}

export interface GenerateNPCModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: NormalCardEntry;
  appData: AppData;
  updateAppData: (updater: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNpcsCreated?: (newAssocs: CardAssociation[]) => void;
}

const RELATION_PRESETS = [
  { id: 'random', label: '🎲 随机混合 (由系统智能搭配)' },
  { id: 'friend', label: '朋友 / 闺蜜 / 死党' },
  { id: 'subordinate', label: '下属 / 助理 / 秘书' },
  { id: 'corporate', label: '公司同事 / 商业合伙人' },
  { id: 'pursuer', label: '追求者 / 爱慕者 / 欢喜冤家' },
  { id: 'ai', label: '专属AI / 电子管家 / 智能辅助' },
  { id: 'rival', label: '宿敌 / 商业劲敌 / 死对头' },
  { id: 'guardian', label: '保镖 / 暗卫 / 守护者' },
  { id: 'childhood', label: '青梅竹马 / 昔日同窗' },
  { id: 'family', label: '长辈亲友 / 师徒同门' },
];

export const GenerateNPCModal: React.FC<GenerateNPCModalProps> = ({
  isOpen,
  onClose,
  card,
  appData,
  updateAppData,
  showToast,
  onNpcsCreated,
}) => {
  // Settings State
  const [npcCount, setNpcCount] = useState<number>(2);
  const [selectedRelations, setSelectedRelations] = useState<string[]>(['random']);
  const [customRelationPrompt, setCustomRelationPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<'config' | 'preview'>('config');
  const [generatedList, setGeneratedList] = useState<GeneratedNPCItem[]>([]);

  if (!isOpen) return null;

  const toggleRelation = (relId: string) => {
    if (relId === 'random') {
      setSelectedRelations(['random']);
      return;
    }
    const next = selectedRelations.filter((r) => r !== 'random');
    if (next.includes(relId)) {
      const filtered = next.filter((r) => r !== relId);
      setSelectedRelations(filtered.length ? filtered : ['random']);
    } else {
      setSelectedRelations([...next, relId]);
    }
  };

  // ══════ 本地智能 NPC 算法生成引擎 ══════
  const generateNPCsLocally = (count: number, relations: string[], customReq: string): GeneratedNPCItem[] => {
    const mainName = card.name || card.charName || '主角';
    const mainGender = card.gender || '未知';

    // Chinese Names pool
    const maleSurnames = ['陆', '沈', '顾', '霍', '周', '裴', '萧', '温', '季', '谢', '傅', '江', '秦', '闻', '林'];
    const femaleSurnames = ['白', '苏', '虞', '林', '阮', '黎', '姜', '唐', '南', '宋', '叶', '乔', '程', '许', '宁'];
    const maleNames = ['云舟', '叙言', '淮之', '景琛', '知行', '以恒', '泊远', '承宇', '见深', '安南', '子澈', '慎行', '崇礼', '予安'];
    const femaleNames = ['知微', '语桐', '书意', '清念', '婉宁', '若竹', '听澜', '沐云', '怀夕', '静好', '如许', '微澜', '知棠', '凝安'];
    const aiNames = ['伊娃 (E.V.A)', '代号-幽芒 (Zero)', '阿特拉斯 (Atlas)', '墨弦-V3', '青鸟 (Echo)', '织星 (Stella)'];

    // Relation archetype options
    const relationArchetypes = [
      {
        type: 'friend',
        relTag: '死党',
        reverseTag: '挚友',
        genders: ['男', '女'],
        ageOffset: 0,
        personalities: ['豁达重义，看似毒舌实则极其护短，总在主角最需要时挺身而出。', '风趣幽默，社交达人，是主角紧绷生活里的调节剂。'],
        brief: `与${mainName}相识多年的挚友，无条件支持主角的任何决定。`,
        note: '经常互相吐槽，但关键时刻绝不掉链子',
      },
      {
        type: 'subordinate',
        relTag: '助理 / 下属',
        reverseTag: '直属上司',
        genders: ['男', '女'],
        ageOffset: -3,
        personalities: ['办事雷厉风行、条理严谨，对主角的行事风格与习惯了如指掌。', '沉稳内敛，执行力极强，是主角最信任的事业帮手。'],
        brief: `${mainName}身边的得力助手，负责协助处理一切大小事务。`,
        note: '主角的日程安排与重要公私事务均由其一手把关',
      },
      {
        type: 'corporate',
        relTag: '商业合伙人',
        reverseTag: '合作搭档',
        genders: ['男', '女'],
        ageOffset: 2,
        personalities: ['精明冷静、洞察敏锐，在商业谈判与宏观布局上与主角相辅相成。', '务实干练，注重契约精神与长远回报。'],
        brief: `与${mainName}共同掌舵核心利益的合伙人，彼此既有信任也有制衡。`,
        note: '在重大利益与决策上与主角保持紧密协作',
      },
      {
        type: 'pursuer',
        relTag: '追求者',
        reverseTag: '倾心对象',
        genders: [mainGender === '男' ? '女' : mainGender === '女' ? '男' : '女'],
        ageOffset: -1,
        personalities: ['自信耀眼，带有几分骄傲与执着，从不掩饰对主角的偏爱与探究欲。', '温润细腻，善解人意，总能恰到好处地体察主角细微的情绪变化。'],
        brief: `对${mainName}怀有强烈好感与探究欲的追求者，频繁出现在主角生活圈中。`,
        note: '对主角情愫深种，既想靠近又恪守分寸',
      },
      {
        type: 'ai',
        relTag: '专属AI / 管家',
        reverseTag: '授权缔约者',
        genders: ['未知', '女', '男'],
        ageOffset: 0,
        personalities: ['逻辑绝对理性，语调优雅克制，在数据与信息处理上具有超凡算力，偶尔带有微不可察的人性化关切。'],
        brief: `专属于${mainName}的高智能拟人化AI助手兼数字管家。`,
        note: '负责全天候协助主角检索资料、预警风险并提供私人定制服务',
      },
      {
        type: 'rival',
        relTag: '商业竞争对手 / 宿敌',
        reverseTag: '值得尊重的劲敌',
        genders: ['男', '女'],
        ageOffset: 1,
        personalities: ['心气极高，野心勃勃，将主角视作此生最难缠也最钦佩的对手。', '行事缜密凌厉，喜欢在智谋与格局上与主角一较高下。'],
        brief: `与${mainName}处于对立竞争阵营的劲敌，亦敌亦友。`,
        note: '竞争时毫不留情，但也绝不允许宵小暗算主角',
      },
      {
        type: 'guardian',
        relTag: '贴身保镖 / 守护者',
        reverseTag: '守护对象',
        genders: ['男', '女'],
        ageOffset: 4,
        personalities: ['寡言少语，警戒心极高，对主角的人身安全有近乎本能的敏锐与忠诚。', '面冷心热，习惯隐于暗处，只在危险降临那一刻破局而出。'],
        brief: `暗中或明面上护卫${mainName}安全的高手，忠诚度极高。`,
        note: '时刻关注主角周边异常动向，以命相护',
      },
    ];

    const results: GeneratedNPCItem[] = [];

    for (let i = 0; i < count; i++) {
      let chosenType = relations[i % relations.length];
      if (chosenType === 'random' || !chosenType) {
        const pool = ['friend', 'subordinate', 'corporate', 'pursuer', 'ai', 'rival', 'guardian'];
        chosenType = pool[Math.floor(Math.random() * pool.length)];
      }

      const matchedArchetype = relationArchetypes.find((a) => a.type === chosenType) || relationArchetypes[i % relationArchetypes.length];
      const gender = matchedArchetype.genders[Math.floor(Math.random() * matchedArchetype.genders.length)];
      
      let name = '';
      if (chosenType === 'ai') {
        name = aiNames[i % aiNames.length];
      } else if (gender === '女') {
        name = femaleSurnames[Math.floor(Math.random() * femaleSurnames.length)] + femaleNames[Math.floor(Math.random() * femaleNames.length)];
      } else {
        name = maleSurnames[Math.floor(Math.random() * maleSurnames.length)] + maleNames[Math.floor(Math.random() * maleNames.length)];
      }

      const mainAgeNum = parseInt(card.age || '25', 10) || 25;
      const ageStr = `${Math.max(18, mainAgeNum + matchedArchetype.ageOffset)}岁`;
      const personality = matchedArchetype.personalities[Math.floor(Math.random() * matchedArchetype.personalities.length)];

      let customBrief = matchedArchetype.brief;
      if (customReq.trim()) {
        customBrief += `【特别设定: ${customReq.trim()}】`;
      }

      results.push({
        id: 'gen_npc_' + Date.now() + '_' + i,
        selected: true,
        name,
        gender,
        age: ageStr,
        relation: matchedArchetype.relTag,
        reverseRelation: matchedArchetype.reverseTag,
        relationNote: matchedArchetype.note,
        brief: customBrief,
        personality,
        appearance: gender === '女' ? '身姿高挑修长，气质干练雅致，眼神清澈而敏锐。' : '仪表堂堂，眉宇沉稳，衣着得体考究。',
        persona: `${name}，${ageStr}，${gender}。与${mainName}因长期的交集与共同经历建立起了深厚的${matchedArchetype.relTag}关系。行事风格鲜明，在关键时刻总能发挥不可或缺的作用。`,
      });
    }

    return results;
  };

  // ══════ 调用大模型 AI 或智能引擎 ══════
  const handleGenerate = async () => {
    setIsGenerating(true);

    const activeRelations = selectedRelations.length ? selectedRelations : ['random'];
    const activeReq = customRelationPrompt.trim();

    // Check if API settings exist
    const globalApi = getGlobalApiSettings();
    const hasApi = Boolean(globalApi.url && globalApi.key);

    if (!hasApi) {
      // Use rich local intelligent generator
      await new Promise((r) => setTimeout(r, 450));
      const list = generateNPCsLocally(npcCount, activeRelations, activeReq);
      setGeneratedList(list);
      setGenerationStep('preview');
      setIsGenerating(false);
      showToast(`已成功为【${card.name || card.charName}】生成 ${list.length} 位专属 NPC 配角！`, 'success');
      return;
    }

    // Call LLM API
    try {
      const cleanUrl = globalApi.url.replace(/\/+$/, '');
      const ep = `${cleanUrl}/chat/completions`;
      const model = globalApi.model || 'gemini-2.5-flash';

      const prompt = `你是一位顶级角色设计大师与世界观编剧。请针对主人设【${card.name || card.charName || '主角'}】，为其生成 ${npcCount} 位深度融合、富有人格魅力的专属 NPC 配角。

【主人设信息】
- 姓名: ${card.name || card.charName}
- 性别: ${card.gender || '未知'}
- 年龄: ${card.age || '未知'}
- 分组与背景: ${card.category || '默认'}
- 核心人设/小传: ${card.brief || card.description || card.content || '（暂无详细小传）'}
- 性格: ${card.personality || '鲜明'}

【生成要求】
- 生成数量: 严格生成 ${npcCount} 位 NPC。
- 关系倾向: ${activeRelations.join('、')}
${activeReq ? `- 用户自定义特殊要求: ${activeReq}` : ''}
- 输出要求: 必须直接返回合法的纯 JSON 数组（不要包裹任何前言或总结文本），每个对象格式如下:
[
  {
    "name": "NPC姓名",
    "gender": "男/女/其他",
    "age": "24岁",
    "relation": "TA对主角的称谓/身份(例如: 贴身助理/死党/商业对手/追求者)",
    "reverseRelation": "主角对TA的称谓(例如: 得力下属/挚友/难缠劲敌)",
    "relationNote": "一两句话概括两人的相处模式与互动细节",
    "brief": "80~150字简量人设(他人可感知的身份与定位)",
    "personality": "性格特点与处事风格",
    "appearance": "外貌衣着特征",
    "persona": "150~250字背景小传"
  }
]`;

      const resp = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${globalApi.key.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are an expert character and worldbuilding designer. Always reply in valid JSON array.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
        }),
      });

      if (!resp.ok) {
        throw new Error(`API HTTP ${resp.status}`);
      }

      const json = await resp.json();
      const rawMsg = json.choices?.[0]?.message?.content || '';
      const cleanJsonStr = rawMsg.replace(/^```json/m, '').replace(/```$/m, '').trim();
      const parsedArray = JSON.parse(cleanJsonStr);

      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        const formatted: GeneratedNPCItem[] = parsedArray.map((item: any, idx: number) => ({
          id: 'ai_npc_' + Date.now() + '_' + idx,
          selected: true,
          name: item.name || `配角${idx + 1}`,
          gender: item.gender || '未知',
          age: item.age || '22岁',
          relation: item.relation || 'NPC配角',
          reverseRelation: item.reverseRelation || '主角',
          relationNote: item.relationNote || '',
          brief: item.brief || `${item.name}，与主角相关的配角。`,
          personality: item.personality || '性格立体鲜明。',
          appearance: item.appearance || '',
          persona: item.persona || '',
        }));

        setGeneratedList(formatted);
        setGenerationStep('preview');
        showToast(`AI 大模型已完成生成，请在下方预览并确认！`, 'success');
      } else {
        throw new Error('解析生成结果失败');
      }
    } catch (err: any) {
      console.warn('AI NPC generation failed, fallback to local:', err);
      // Fallback to local
      const list = generateNPCsLocally(npcCount, activeRelations, activeReq);
      setGeneratedList(list);
      setGenerationStep('preview');
      showToast('大模型接口异常，已启用本地高精度规则完成生成！', 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  // ══════ 确认创建并双向关联 ══════
  const handleConfirmCreateAndLink = () => {
    const selectedNpcs = generatedList.filter((n) => n.selected);
    if (selectedNpcs.length === 0) {
      showToast('请至少勾选一位 NPC 配角进行创建', 'error');
      return;
    }

    const now = Date.now();
    const newCards: NormalCardEntry[] = [];
    const newAssociationsForMain: CardAssociation[] = [];

    selectedNpcs.forEach((npc, index) => {
      const npcId = 'npc_' + now + '_' + index + '_' + Math.random().toString(36).slice(2, 6);

      // Create new NPC Card
      const newCard: NormalCardEntry = {
        id: npcId,
        name: npc.name,
        charName: npc.name,
        fileName: `${npc.name}.json`,
        category: card.category || '默认',
        gender: npc.gender,
        age: npc.age,
        creator: card.creator || card.author || '系统生成',
        author: card.creator || card.author || '系统生成',
        isNpc: true,
        cardRole: 'npc',
        brief: npc.brief,
        personality: npc.personality,
        appearance: npc.appearance,
        relation: npc.relation,
        reverseRelation: npc.reverseRelation,
        description: npc.persona || npc.brief,
        content: `【NPC 配角】${npc.name}\n性别: ${npc.gender}\n年龄: ${npc.age}\n关系: ${npc.relation}\n\n【简量人设】\n${npc.brief}\n\n【性格特征】\n${npc.personality}\n\n【背景小传】\n${npc.persona || ''}`,
        rawContent: `【NPC 配角】${npc.name}\n\n${npc.brief}`,
        cardType: 'document',
        customTags: ['NPC', '配角', npc.relation || '关联人物'],
        tags: ['NPC', '配角', npc.relation || '关联人物'],
        // Link to main character
        associations: [
          {
            cardId: card.id,
            note: `${npc.relation} (所属主角: ${card.name || card.charName})`,
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      newCards.push(newCard);

      // Link to main character's associations
      newAssociationsForMain.push({
        cardId: npcId,
        note: npc.relationNote || npc.relation,
        createdAt: now,
      });
    });

    // Save to AppData: add all new NPC cards, and update main character's associations
    updateAppData((prev: AppData) => {
      const existingCards = prev.normalCards || [];
      const updatedExisting = existingCards.map((c) => {
        if (c.id === card.id) {
          const currentAssocs = c.associations || [];
          return {
            ...c,
            associations: [...currentAssocs, ...newAssociationsForMain],
            updatedAt: now,
          };
        }
        return c;
      });

      return {
        ...prev,
        normalCards: [...newCards, ...updatedExisting],
      };
    });

    if (onNpcsCreated) {
      onNpcsCreated(newAssociationsForMain);
    }

    showToast(`已成功创建 ${selectedNpcs.length} 位 NPC 并双向绑定到【${card.name || card.charName}】！`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                生成对应主人设的 NPC 配角
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                为【{card.name || card.charName || '当前角色'}】智能创建与其世界观融洽的专属配角
              </p>
            </div>
          </div>

          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {generationStep === 'config' ? (
            <div className="space-y-4">
              {/* Step 1: Count Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>1. 生成 NPC 配角人数</span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">当前: {npcCount} 位</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setNpcCount(cnt)}
                      className={`h-8 rounded-xl border text-[11px] font-bold flex items-center justify-center transition-all ${
                        npcCount === cnt
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-500/20'
                          : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cnt} 位 {cnt === 2 ? '🔥' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Relation Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    2. 关系生成设定 (支持多选或随机)
                  </label>
                  <span className="text-[10px] text-zinc-400">已选 {selectedRelations.length} 项</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {RELATION_PRESETS.map((preset) => {
                    const isSelected = selectedRelations.includes(preset.id);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => toggleRelation(preset.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium border transition-all ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/80 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Custom Relation Prompt */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                  3. 自定义手写关系 / 背景要求 (可选，灵活自定)
                </label>
                <textarea
                  rows={3}
                  value={customRelationPrompt}
                  onChange={(e) => setCustomRelationPrompt(e.target.value)}
                  placeholder="例如: 需要一位表面上在科技公司当法务、背地里暗中调查主角的刑警追求者；或者忠心耿耿但说话毒舌的专属管家..."
                  className="w-full p-2.5 text-[10px] sm:text-[11px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono leading-relaxed placeholder:text-zinc-400"
                />
              </div>

              {/* Character Context Hint */}
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1">
                <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  智能锚定主人设核心上下文
                </div>
                <p>
                  系统将结合【{card.name || card.charName}】的性别 ({card.gender || '未知'})、职业分组 ({card.category || '默认'}) 及人设经历，自动生成契合度极高的 NPC 配角。
                </p>
              </div>
            </div>
          ) : (
            /* Step: Preview Generated NPCs */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    生成的 NPC 配角预览 ({generatedList.filter((n) => n.selected).length}/{generatedList.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGenerationStep('config')}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  重新配置生成
                </button>
              </div>

              <div className="space-y-3">
                {generatedList.map((npc, idx) => (
                  <div
                    key={npc.id}
                    className={`p-3 rounded-xl border transition-all ${
                      npc.selected
                        ? 'bg-white dark:bg-zinc-900 border-purple-300 dark:border-purple-800 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={npc.selected}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setGeneratedList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, selected: val } : item))
                            );
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                        />
                        <span className="font-bold text-[11px] text-zinc-900 dark:text-zinc-100">
                          配角 #{idx + 1}
                        </span>
                      </label>

                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        {npc.relation}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">姓名</label>
                        <BaseInput
                          designId={`npc-name-${idx}`}
                          value={npc.name}
                          onChange={(e: any) => {
                            const val = e.target.value;
                            setGeneratedList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                            );
                          }}
                          className="h-7 text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">性别 / 年龄</label>
                        <div className="flex items-center gap-1">
                          <select
                            value={npc.gender}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGeneratedList((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, gender: val } : item))
                              );
                            }}
                            className="h-7 px-2 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                          >
                            <option value="男">男</option>
                            <option value="女">女</option>
                            <option value="未知">未知/AI</option>
                          </select>
                          <BaseInput
                            designId={`npc-age-${idx}`}
                            value={npc.age}
                            onChange={(e: any) => {
                              const val = e.target.value;
                              setGeneratedList((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, age: val } : item))
                              );
                            }}
                            className="h-7 text-[10px] flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-zinc-500 block mb-0.5">对主角称谓</label>
                        <BaseInput
                          designId={`npc-rel-${idx}`}
                          value={npc.relation}
                          onChange={(e: any) => {
                            const val = e.target.value;
                            setGeneratedList((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, relation: val } : item))
                            );
                          }}
                          className="h-7 text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 block">简量人设 (Brief)</label>
                      <textarea
                        rows={2}
                        value={npc.brief}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGeneratedList((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, brief: val } : item))
                          );
                        }}
                        className="w-full p-2 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 font-mono leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60">
          {generationStep === 'config' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                取消
              </button>
              <BaseButton
                designId="start-generate-npc-btn"
                type="button"
                variant="primary"
                size="sm"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 px-4 text-xs shadow-xs border-none"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    正在智能构思 NPC...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    开始生成专属 NPC
                  </>
                )}
              </BaseButton>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setGenerationStep('config')}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                返回修改配置
              </button>
              <BaseButton
                designId="confirm-save-npcs-btn"
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmCreateAndLink}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 px-4 text-xs shadow-xs border-none"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                确认创建并双向绑定 ({generatedList.filter((n) => n.selected).length} 位)
              </BaseButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
