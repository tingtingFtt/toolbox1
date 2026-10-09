import React, { useState, useMemo, useEffect } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { BaseInput } from '../ui/BaseInput';
import { AppData, NormalCardEntry, ItemVersion } from '../../types';
import {
  X,
  Sparkles,
  CheckCircle2,
  FileText,
  User,
  Tags,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Info,
  Sliders,
  Settings,
  ShieldCheck,
  Layers,
  Users
} from 'lucide-react';
import { getGlobalApiSettings } from '../../utils';

export interface NormalCardAIRefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: NormalCardEntry;
  cards?: NormalCardEntry[];
  appData: AppData;
  updateAppData: (updater: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onApplyResult: (updatedCard: NormalCardEntry, targetMode: 'tavern' | 'document') => void;
}

// ══════ 智能文本清洗工具 ══════
export function normalizeInvisible(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ');
}

export function cleanNoiseAndAuthor(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const filtered: string[] = [];

  for (const line of lines) {
    const tr = line.trim();
    if (!tr) {
      filtered.push(line);
      continue;
    }

    // Filter author / sharing / disclaimers
    if (
      /^(?:作者|文案|人设创作者|原作者|原案|卡作者|整理|搬运|二传|二改|转存|禁二传|禁二改|不可二传|严禁商用|免责声明|声明|🐧|企鹅|QQ群|交流群|粉丝群|售后群|微信|vx|wechat|微博|小红书|lofter|爱发电)[:：\s]/i.test(tr) ||
      /^(?:QQ|企鹅|群号|🐧|群|企鹅群)[:：\s]*\d{5,12}/i.test(tr) ||
      /^(?:只能|仅限|禁止|不可)\s*(?:bg|bl|gb|gl|r18|全年龄|梦向|乙女|言情)\b/i.test(tr) ||
      /^(?:本卡片?仅供|仅供学习|侵权必删|最终解释权|版权所有|未经许可)/i.test(tr) ||
      /^(?:不可二传二改|严禁倒卖|盗卖必究|禁止转载)/i.test(tr)
    ) {
      continue;
    }

    filtered.push(line);
  }

  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function guessGender(name: string, content: string): 'female' | 'male' | 'all' {
  const combined = (name + '\n' + content).toLowerCase();
  
  // Explicit gender declarations
  const genderMatch = /【?\s*(?:性别|gender)\s*】?[:：]\s*(女|男|女性|男性|female|male|boy|girl)/i.exec(combined);
  if (genderMatch) {
    const val = genderMatch[1].toLowerCase();
    if (val.includes('女') || val.includes('female') || val.includes('girl')) return 'female';
    if (val.includes('男') || val.includes('male') || val.includes('boy')) return 'male';
  }

  // Count indicators
  const femaleSignals = (combined.match(/(?:她|少女|女生|女孩|女子|女性|小姐|学姐|妹妹|姐姐|母亲|女仆|魔女|姬|女主|女警|女修|女巫)/g) || []).length;
  const maleSignals = (combined.match(/(?:他|少年|男生|男孩|男子|男性|先生|学长|弟弟|哥哥|父亲|男仆|魔王|殿下|男主|男警|男修|巫师)/g) || []).length;

  if (femaleSignals > maleSignals + 2) return 'female';
  if (maleSignals > femaleSignals + 2) return 'male';
  return 'all';
}

// ══════ 提取模板定义（严格移除第一人称自述与小说片段提炼） ══════
export interface RefineTemplate {
  id: string;
  name: string;
  info: string;
  targetLength: string;
  rules: string[];
}

export const CHAR_TEMPLATES: RefineTemplate[] = [
  {
    id: 'standard',
    name: '标准角色卡（推荐）',
    info: '身份、外貌、性格、身世、人际关系全面提取，条理严谨，完全忠实原文档。',
    targetLength: '300 ~ 800 字',
    rules: [
      'persona 撰写为第三人称详细设定，覆盖：身份与职业、年龄外貌、身世经历、当前处境、人际关系、生活习惯与说话风格。',
      '完全基于原文档中的客观信息提取，严禁无中生有、脑补或过度修饰。',
      'personality 提炼 80~200 字浓缩性格特征与行为倾向。',
      '必须彻底清除作者名、QQ/微信群、二传二改声明、平台免责声明等与人设无关的杂质。'
    ]
  },
  {
    id: 'faithful',
    name: '忠实还原（长文档小传）',
    info: '尽可能完整保留原文全部细节脉络（地点、名字、事件、数据），宁长勿缺。',
    targetLength: '最长 1500 字',
    rules: [
      'persona 尽可能保留原文的全部设定细节，宁长勿缺，保留全部具体人物、地名、事件。',
      '按原文组织脉络整理，不重写风格、不篡改作者原定脉络。',
      '完全基于原文，剔除作者版权与声明等杂质。'
    ]
  },
  {
    id: 'concise',
    name: '精简速用',
    info: '仅保留对扮演最关键的核心身份、性格底色与标志性设定，适合长篇文档快速浓缩。',
    targetLength: '150 ~ 300 字',
    rules: [
      'persona 控制在 150~300 字，仅保留核心身份、性格底色、说话方式与一到两个标志性关键经历。',
      '严格基于原文提炼核心，省略次要琐事，剔除任何作者声明。'
    ]
  }
];

export const NPC_TEMPLATES: RefineTemplate[] = [
  {
    id: 'npc_standard',
    name: '标准配角（推荐）',
    info: '克制的配角卡，完整人设 + 100~200 字简量人设 (brief) + 双向关系。',
    targetLength: '300 ~ 600 字',
    rules: [
      '这是一位 NPC 配角。人设完整但克制，忠实原文档中配角的身世与定位。',
      'persona 覆盖身份背景、外貌印象、性格特点、说话风格与习惯，300~600 字。',
      'brief 撰写 100~200 字第三人称简量人设，仅包含他人可感知的信息。',
      'relation 填写 TA 相对主角是什么人（如 同事、下属、密友、宿敌）；reverseRelation 填写主角相对 TA 是什么人。'
    ]
  },
  {
    id: 'npc_light',
    name: '轻量路人 / 群演',
    info: '120~250 字基础设定，适合一次性登场或短暂互动的轻量路人。',
    targetLength: '120 ~ 250 字',
    rules: [
      '轻量配角设定，persona 控制在 120~250 字，仅写身份、外貌印象、性格底色、说话特点。',
      'brief 撰写 60~120 字极简概述。',
      'relation / reverseRelation 简明填写。'
    ]
  },
  {
    id: 'npc_family',
    name: '亲友圈成员',
    info: '侧重与主角的关系史、相处模式与称呼习惯，适合家人、昔日旧友、搭档。',
    targetLength: '300 ~ 600 字',
    rules: [
      '这是主角亲友圈里的关键配角。persona 重点写 TA 与主角的关系渊源、共同经历、相处模式与称呼习惯。',
      'brief 突出 TA 在主角人际关系网中所扮演的角色。',
      'relation / reverseRelation 必须使用准确具体的亲友称谓。'
    ]
  }
];

// ══════ 提取结果结构 ══════
export interface ExtractedCardData {
  name: string;
  gender: 'female' | 'male' | 'all';
  age?: string;
  appearance?: string;
  persona: string;
  personality: string;
  brief?: string;
  relation?: string;
  reverseRelation?: string;
  familyRelations?: { name: string; relation: string; note?: string }[];
  scenario?: string;
  firstMes?: string;
  systemPrompt?: string;
  tags: string[];
  rawResult?: string;
}

export const NormalCardAIRefineModal: React.FC<NormalCardAIRefineModalProps> = ({
  isOpen,
  onClose,
  card: initialCard,
  cards,
  appData,
  updateAppData,
  showToast,
  onApplyResult,
}) => {
  if (!isOpen) return null;

  const [cardIndex, setCardIndex] = useState<number>(0);
  const cardList = useMemo(() => {
    if (cards && cards.length > 0) return cards;
    if (initialCard) return [initialCard];
    return [];
  }, [cards, initialCard]);

  const card = cardList[cardIndex] || initialCard;

  // Mode: CHAR vs NPC
  const [targetKind, setTargetKind] = useState<'char' | 'npc'>(card?.isNpc || card?.cardRole === 'npc' ? 'npc' : 'char');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(card?.isNpc || card?.cardRole === 'npc' ? 'npc_standard' : 'standard');
  const [customHint, setCustomHint] = useState<string>('');

  // Switch card effect
  useEffect(() => {
    if (card) {
      setTargetKind(card.isNpc || card.cardRole === 'npc' ? 'npc' : 'char');
      setSelectedTemplateId(card.isNpc || card.cardRole === 'npc' ? 'npc_standard' : 'standard');
      setStep('config');
      setExtractedData(null);
      setStatusMessage('');
      setErrorMessage('');
    }
  }, [cardIndex, card?.id]);

  // Execution & Step states
  const [step, setStep] = useState<'config' | 'processing' | 'result'>('config');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // API Config State from global app settings
  const globalApi = useMemo(() => getGlobalApiSettings(appData), [appData]);
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [apiUrl, setApiUrl] = useState<string>(globalApi.url || 'https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState<string>(globalApi.key || '');
  const [apiModel, setApiModel] = useState<string>(globalApi.model || 'gpt-4o');
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiTestResult, setApiTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [apiTab, setApiTab] = useState<'preset' | 'custom'>('preset');

  // Result state
  const [extractedData, setExtractedData] = useState<ExtractedCardData | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Active Template list
  const templates = targetKind === 'char' ? CHAR_TEMPLATES : NPC_TEMPLATES;
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Handle Kind toggle (reset to default template)
  // function removed as it is no longer used

  // Test API Connection
  const handleTestApi = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      setApiTestResult({ ok: false, msg: '请先填写 API Base URL 与 API Key' });
      return;
    }
    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const cleanUrl = apiUrl.replace(/\/+$/, '');
      const endpoint = cleanUrl.endsWith('/chat/completions') ? cleanUrl : `${cleanUrl}/chat/completions`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: apiModel.trim() || 'gpt-4o',
          messages: [{ role: 'user', content: 'Reply with "OK" only.' }],
          max_tokens: 10,
          temperature: 0,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '连接成功';
      setApiTestResult({ ok: true, msg: `连接正常！模型响应: ${reply.trim()}` });
      localStorage.setItem('tavern_vault_default_api_url', apiUrl.trim());
      localStorage.setItem('tavern_vault_default_api_key', apiKey.trim());
      localStorage.setItem('tavern_vault_default_api_model', apiModel.trim());
    } catch (e: any) {
      setApiTestResult({ ok: false, msg: `连接测试失败: ${e.message || '网络或凭证错误'}` });
    } finally {
      setIsTestingApi(false);
    }
  };

  // ══════ 本地离线规则提炼 ══════
  const performLocalRuleExtraction = (text: string): ExtractedCardData => {
    const cleaned = cleanNoiseAndAuthor(normalizeInvisible(text));
    const lines = cleaned.split('\n');

    // 1. Name Guess
    let name = '';
    const nameMatch = /(?:^|\n)\s*[【\[\*·•\-]*\s*(?:本名|真名|真实姓名|全名|姓名|名字|角色名|角色姓名|name|full_?name|char_?name)\s*(?:[\(（][^\)）\n]*[\)）])?\s*[】\]\*]*\s*[:：]\s*["'“「]?\s*([^\n\r"'”」]{1,40})/i.exec(cleaned);
    if (nameMatch) {
      name = nameMatch[1].replace(/[*_`]/g, '').trim().split(/[（\(、，,]/)[0].trim();
    }
    if (!name) {
      for (let i = 0; i < Math.min(lines.length, 6); i++) {
        const ln = lines[i].replace(/^#+\s*/, '').replace(/[*_`【】\[\]]/g, '').trim();
        if (ln && ln.length <= 16 && !/[，。！？；：、]/.test(ln)) {
          name = ln;
          break;
        }
      }
    }
    if (!name) name = card.fileName || card.name || '未命名角色';

    // 2. Age Guess
    let age = '';
    const ageMatch = /(?:^|\n)\s*[【\[\*·•\-]*\s*(?:年龄|岁数|age)\s*[】\]\*]*\s*[:：]\s*([^\n\r]{1,20})/i.exec(cleaned);
    if (ageMatch) age = ageMatch[1].trim();

    // 3. Gender Guess
    const gender = guessGender(name, cleaned);

    // 4. Split sections
    const personaLines: string[] = [];
    const personalityLines: string[] = [];
    const appearanceLines: string[] = [];
    let inSection: 'persona' | 'personality' | 'appearance' = 'persona';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const tr = line.trim();
      if (/^【?\s*(?:性格|性格特点|性格特征|性格表现|个性|脾气|personality)\s*】?[:：]?/i.test(tr)) {
        inSection = 'personality';
        continue;
      } else if (/^【?\s*(?:外貌|长相|容貌|衣着|装扮|体态|外貌细节|appearance)\s*】?[:：]?/i.test(tr)) {
        inSection = 'appearance';
        continue;
      } else if (/^【?\s*(?:身份|背景|身世|设定|经历|技能|爱好)\s*】?[:：]?/i.test(tr)) {
        inSection = 'persona';
      }

      if (inSection === 'personality') personalityLines.push(line);
      else if (inSection === 'appearance') appearanceLines.push(line);
      else personaLines.push(line);
    }

    const tags: string[] = [];
    if (targetKind === 'npc') tags.push('配角');
    if (gender === 'female') tags.push('女性');
    else if (gender === 'male') tags.push('男性');

    return {
      name,
      gender,
      age: age || undefined,
      appearance: appearanceLines.join('\n').trim() || undefined,
      persona: personaLines.join('\n').trim() || cleaned,
      personality: personalityLines.join('\n').trim() || '性格鲜明，言行举止符合自身身份背景。',
      brief: targetKind === 'npc' ? `${name}，${gender === 'female' ? '女性' : gender === 'male' ? '男性' : ''}配角。` : undefined,
      relation: targetKind === 'npc' ? '相识者' : undefined,
      reverseRelation: targetKind === 'npc' ? '相识者' : undefined,
      tags: Array.from(new Set(tags)),
    };
  };

  // ══════ 执行 AI 提取精修 ══════
  const handleStartRefine = async () => {
    const rawContent = card.content || '';
    if (!rawContent.trim()) {
      showToast('文档内容为空，无法进行提取精修', 'error');
      return;
    }

    setStep('processing');
    setIsProcessing(true);
    setErrorMessage('');
    setStatusMessage('正在清洗文档杂质与作者声明...');

    // 1. Clean Noise
    const cleanedText = cleanNoiseAndAuthor(normalizeInvisible(rawContent));
    const trimmedText = cleanedText.length > 50000 ? cleanedText.slice(0, 50000) : cleanedText;

    // Check if API key is present
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const activeKey = apiKey.trim() || globalApi.key;
    const hasValidApi = Boolean(cleanUrl && activeKey);

    if (!hasValidApi) {
      // Fallback to fast local rule-based extraction
      setStatusMessage('未检测到 API Key，正在使用本地智能规则进行提炼...');
      await new Promise((r) => setTimeout(r, 600));
      const localResult = performLocalRuleExtraction(trimmedText);
      setExtractedData(localResult);
      setIsProcessing(false);
      setStep('result');
      showToast('已完成本地规则快速提炼（配置 API 后可使用大模型深度精修）', 'info');
      return;
    }

    // 2. Call LLM API
    try {
      setStatusMessage(`正在调用大模型 (${apiModel}) 进行人设结构化精修...`);

      const isNpc = targetKind === 'npc';
      const systemPromptLines = [
        `你是极其专业、严谨的角色卡结构化与人设精修专家。`,
        `【忠实性第一铁律】所有提取与精修必须完全基于用户提供的原文档数据和内容，绝对不能过度修饰、修改、或凭空捏造事实、人物关系与剧情设定。忠实还原原作者设定的各项细节。`,
        `你的任务：深入分析用户提供的人物小传/人设文档，严格按【${currentTemplate.name}】标准进行提炼重构，输出标准 JSON 格式。`,
        ``,
        `【输出 JSON 字段规范】`,
        `{`,
        `  "name": "角色姓名 (纯净名字，不含前后缀)",`,
        `  "gender": "female" | "male" | "all",`,
        `  "age": "年龄 (如 38岁，未提及则留空)",`,
        `  "appearance": "外貌细节描述 (提炼文档中身高身材容貌衣着，未提及则留空)",`,
        `  "persona": "核心身世与详细设定 (${currentTemplate.targetLength})",`,
        `  "personality": "性格与行为特征浓缩 (80~200字)",`,
        isNpc ? `  "brief": "简量人设 (100~200字第三人称，他人可感知视角)",\n  "relation": "TA 是主角的…… (2~6字称谓)",\n  "reverseRelation": "主角是 TA 的…… (2~6字称谓)",` : '',
        `  "familyRelations": [`,
        `    { "name": "关系人姓名", "relation": "关系类型(如: 父母/兄弟/家人/朋友/下属/情缘)", "note": "互动或背景简注" }`,
        `  ],`,
        `  "scenario": "角色所处的核心场景或当前处境 (若文档有明确背景则提炼，否则留空)",`,
        `  "firstMes": "初始开场白/问候语 (若原文有标志性台词或登场对话则提炼，否则写符合人设的开场白)",`,
        `  "systemPrompt": "系统提示词 (为大模型扮演提供简短系统指令，可选)",`,
        `  "tags": ["特征标签1", "特征标签2", "特征标签3"]`,
        `}`,
        ``,
        `【精修与模板准则】`,
        ...currentTemplate.rules.map((r, i) => `${i + 1}. ${r}`),
        ``,
        `【通用铁律】`,
        `- 剔除杂质：彻底清除所有作者名、QQ/微信群、二传二改提醒、平台免责声明等与角色设定无关的内容。`,
        `- 绝不过度修饰：只使用文档中的客观信息，不要脑补无关重要背景；文档未涉及之处不强行编造。`,
        `- tags：提取 3~8 个精准特征短标签（如: 现代、金融、外冷内热）。`,
        customHint.trim() ? `\n【用户补充特别要求】\n${customHint.trim()}` : '',
        `\n请务必只输出纯 JSON 对象，不要附加任何 Markdown 代码块外的文字解释。`
      ];

      const endpoint = cleanUrl.endsWith('/chat/completions') ? cleanUrl : `${cleanUrl}/chat/completions`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: apiModel.trim() || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPromptLines.join('\n') },
            { role: 'user', content: `【原人设文档内容】\n\n文件名: ${card.fileName || card.name}\n\n${trimmedText}` },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API 响应错误 (HTTP ${res.status}): ${errorText.slice(0, 200)}`);
      }

      const resData = await res.json();
      let rawResponse = resData.choices?.[0]?.message?.content || '';
      rawResponse = rawResponse.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').replace(/```$/g, '').trim();

      // Parse JSON from response
      let parsedObj: any = null;
      try {
        parsedObj = JSON.parse(rawResponse);
      } catch {
        const jsonMatch = /\{[\s\S]*\}/.exec(rawResponse);
        if (jsonMatch) {
          try {
            parsedObj = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }

      if (!parsedObj || typeof parsedObj !== 'object') {
        throw new Error('模型返回的内容无法解析为标准 JSON 格式');
      }

      const normalizedResult: ExtractedCardData = {
        name: parsedObj.name?.trim() || card.fileName || card.name || '未命名角色',
        gender: parsedObj.gender === 'female' || parsedObj.gender === 'male' ? parsedObj.gender : guessGender(parsedObj.name, parsedObj.persona),
        age: parsedObj.age?.trim() || undefined,
        appearance: parsedObj.appearance ? cleanNoiseAndAuthor(parsedObj.appearance) : undefined,
        persona: cleanNoiseAndAuthor(parsedObj.persona || ''),
        personality: cleanNoiseAndAuthor(parsedObj.personality || ''),
        brief: parsedObj.brief ? cleanNoiseAndAuthor(parsedObj.brief) : undefined,
        relation: parsedObj.relation?.trim() || undefined,
        reverseRelation: parsedObj.reverseRelation?.trim() || undefined,
        familyRelations: Array.isArray(parsedObj.familyRelations) ? parsedObj.familyRelations.filter((r: any) => r && r.name) : undefined,
        scenario: parsedObj.scenario ? cleanNoiseAndAuthor(parsedObj.scenario) : undefined,
        firstMes: parsedObj.firstMes ? cleanNoiseAndAuthor(parsedObj.firstMes) : undefined,
        systemPrompt: parsedObj.systemPrompt?.trim() || undefined,
        tags: Array.isArray(parsedObj.tags) ? parsedObj.tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
        rawResult: rawResponse,
      };

      setExtractedData(normalizedResult);
      setIsProcessing(false);
      setStep('result');
      showToast('AI 精修提炼完成！请校对结果', 'success');
    } catch (e: any) {
      setIsProcessing(false);
      setErrorMessage(e.message || '精修过程发生未知错误');
      setStep('config');
      showToast(`AI 精修失败: ${e.message}`, 'error');
    }
  };

  // Add Tag to Extracted Data
  const handleAddTag = () => {
    if (!newTagInput.trim() || !extractedData) return;
    const tag = newTagInput.trim();
    if (!extractedData.tags.includes(tag)) {
      setExtractedData({
        ...extractedData,
        tags: [...extractedData.tags, tag],
      });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      tags: extractedData.tags.filter((_, i) => i !== index),
    });
  };

  // Copy Single Field
  const handleCopyField = (fieldName: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`已复制【${fieldName}】内容`, 'success');
    setTimeout(() => setCopiedField(null), 1800);
  };

  // ══════ 应用精修结果并自动生成新版本 ══════
  const handleApplyAndCreateNewVersion = () => {
    if (!extractedData) return;

    const isNpc = targetKind === 'npc';
    const currentVersions = card.versions || [];
    const newVerNum = currentVersions.length + 1;
    const newVerLabel = `v${newVerNum + 1}`;

    // 1. Snapshot previous state into version history
    const prevSnapshot: ItemVersion<any> = {
      versionId: `ver_${card.id}_${newVerNum}_${Date.now()}`,
      versionNumber: newVerNum,
      versionLabel: card.activeVersionLabel || `v${newVerNum}`,
      updatedAt: card.updatedAt || card.createdAt || Date.now(),
      importedAt: (card as any).importedAt || card.createdAt || Date.now(),
      fileName: card.fileName || card.name,
      changeSummary: `精修前快照 (v${newVerNum})`,
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

    // 2. Build structured document text
    const structuredDoc = [
      `# ${extractedData.name}`,
      `【身份】${isNpc ? 'NPC 配角' : '主人设'}`,
      `【性别】${extractedData.gender === 'female' ? '女性' : extractedData.gender === 'male' ? '男性' : '未知 / 通用'}`,
      extractedData.age ? `【年龄】${extractedData.age}` : '',
      `【标签】${extractedData.tags.join('、') || '无'}`,
      '',
      '---',
      '## 核心身世与设定 (Persona)',
      extractedData.persona,
      '',
      '---',
      '## 性格特征 (Personality)',
      extractedData.personality,
      extractedData.appearance ? `\n---\n## 外貌描写 (Appearance)\n${extractedData.appearance}` : '',
      extractedData.brief ? `\n---\n## 简量人设 (Brief)\n${extractedData.brief}` : '',
      extractedData.relation ? `\n---\n## 相对关系\n- 对主角关系: ${extractedData.relation}\n- 主角对TA: ${extractedData.reverseRelation || '无'}` : '',
      extractedData.familyRelations && extractedData.familyRelations.length > 0 ? `\n---\n## 人物关系与家人\n${extractedData.familyRelations.map(r => `- ${r.name} (${r.relation}): ${r.note || ''}`).join('\n')}` : '',
      extractedData.firstMes ? `\n---\n## 开场白与台词\n${extractedData.firstMes}` : '',
      extractedData.scenario ? `\n---\n## 场景对应\n${extractedData.scenario}` : '',
    ].filter(Boolean).join('\n');

    const updatedCard: NormalCardEntry = {
      ...card,
      name: extractedData.name || card.name,
      charName: extractedData.name || card.charName,
      gender: extractedData.gender === 'female' ? '女' : extractedData.gender === 'male' ? '男' : '未知',
      age: extractedData.age || card.age,
      appearance: extractedData.appearance || card.appearance,
      description: extractedData.persona || card.description,
      personality: extractedData.personality || card.personality,
      scenario: extractedData.scenario || card.scenario,
      firstMes: extractedData.firstMes || card.firstMes,
      systemPrompt: extractedData.systemPrompt || card.systemPrompt,
      brief: extractedData.brief || card.brief,
      relation: extractedData.relation || card.relation,
      reverseRelation: extractedData.reverseRelation || card.reverseRelation,
      familyRelations: extractedData.familyRelations || card.familyRelations,
      tags: extractedData.tags || card.tags,
      customTags: extractedData.tags || card.customTags,
      isNpc,
      cardRole: isNpc ? 'npc' : 'main',
      rawContent: card.rawContent || card.content, // preserve original raw document text
      content: structuredDoc,
      cardType: 'tavern',
      importFormat: 'json',
      activeVersionNumber: newVerNum + 1,
      activeVersionLabel: newVerLabel,
      currentVersionSummary: `AI 精修 (${currentTemplate.name})`,
      versions: [...currentVersions, prevSnapshot],
      updatedAt: Date.now(),
    };

    onApplyResult(updatedCard, 'tavern');
    if (cardList.length > 1 && cardIndex < cardList.length - 1) {
      showToast(`AI 精修完成！已生成新版本 ${newVerLabel} 并写入，已为您自动切换至下一张卡片`, 'success');
      setCardIndex((prev) => prev + 1);
    } else {
      showToast(`AI 精修完成！已生成新版本 ${newVerLabel} 并写入酒馆格式`, 'success');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-start sm:items-center justify-between gap-2 bg-zinc-50/80 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  AI 智能提取精修
                </h3>

                {cardList.length > 1 && (
                  <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-md px-1.5 py-0.5 text-[10px]">
                    <span className="text-purple-700 dark:text-purple-300 font-semibold shrink-0">
                      {cardIndex + 1}/{cardList.length}
                    </span>
                    <select
                      value={cardIndex}
                      onChange={(e) => setCardIndex(Number(e.target.value))}
                      className="bg-transparent text-[10px] font-bold text-purple-900 dark:text-purple-100 border-none outline-none cursor-pointer max-w-[120px] truncate"
                    >
                      {cardList.map((c, idx) => (
                        <option key={c.id || idx} value={idx} className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                          {c.charName || c.name || c.fileName || `卡片 ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={cardIndex === 0}
                      onClick={() => setCardIndex((prev) => Math.max(0, prev - 1))}
                      className="text-purple-600 disabled:opacity-30 hover:text-purple-800 p-0.5"
                      title="上一张"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={cardIndex >= cardList.length - 1}
                      onClick={() => setCardIndex((prev) => Math.min(cardList.length - 1, prev + 1))}
                      className="text-purple-600 disabled:opacity-30 hover:text-purple-800 p-0.5"
                      title="下一张"
                    >
                      ▶
                    </button>
                  </div>
                )}

                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {targetKind === 'char' ? '主人设' : 'NPC 配角'}
                </span>
                <span className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                  ({card.fileName || card.name})
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                基于原文档忠实提取属性、身世、性格与人物关系，精修后自动生成新版本
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowApiSettings(!showApiSettings)}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 border ${
                showApiSettings
                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              }`}
              title="配置 API 接口"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-medium pr-0.5">API 设置</span>
            </button>
            <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
          </div>
        </div>

        {/* API Settings Collapsible Drawer -> Converted to floating popover */}
        {showApiSettings && (
          <div className="absolute top-[64px] right-4 w-[280px] sm:w-[320px] bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 shadow-2xl rounded-xl z-50 p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                API 接口配置
              </span>
              <span role="button" onClick={() => setShowApiSettings(false)} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
            </div>

            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-3">
               <button 
                  onClick={() => setApiTab('preset')}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md ${apiTab === 'preset' ? 'bg-white dark:bg-zinc-700 shadow-xs text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
               >保存的预设</button>
               <button 
                  onClick={() => setApiTab('custom')}
                  className={`flex-1 py-1 text-[11px] font-medium rounded-md ${apiTab === 'custom' ? 'bg-white dark:bg-zinc-700 shadow-xs text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
               >新增自定义</button>
            </div>

            {apiTab === 'preset' ? (
              <div className="max-h-[200px] overflow-y-auto no-scrollbar space-y-2 pb-1">
                {(globalApi.key || globalApi.url) ? (
                  <button 
                    onClick={() => {
                      setApiUrl(globalApi.url || '');
                      setApiKey(globalApi.key || '');
                      setApiModel(globalApi.model || 'gpt-4o');
                    }}
                    className="w-full text-left p-2 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-800 relative transition-colors"
                  >
                    <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300">全局默认配置</div>
                    <div className="text-[10px] text-purple-600/70 dark:text-purple-400/70 truncate mt-0.5">来源: {globalApi.source} • {globalApi.model}</div>
                    {(apiUrl === globalApi.url || !apiUrl) && (apiKey === globalApi.key || !apiKey) ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : null}
                  </button>
                ) : null}

                {/* Iterate over appData.apiKeys */}
                {appData?.apiKeys?.map((apiEntry: any) => 
                  apiEntry.keys?.map((k: any) => (
                    <button
                      key={`${apiEntry.id}-${k.id}`}
                      onClick={() => {
                        setApiUrl(apiEntry.url);
                        setApiKey(k.key);
                      }}
                      className="w-full text-left p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 relative transition-colors"
                    >
                      <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{apiEntry.name} {k.memo ? `(${k.memo})` : ''}</div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{apiEntry.url}</div>
                      {apiUrl === apiEntry.url && apiKey === k.key ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      ) : null}
                    </button>
                  ))
                )}
                
                {(!globalApi.key && !globalApi.url && (!appData?.apiKeys || appData.apiKeys.length === 0)) && (
                  <div className="py-4 text-center text-[10px] text-zinc-500">
                    暂无保存的预设，请先添加自定义
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 mb-2.5 leading-relaxed">
                  优先自动读取全局设置。当前来源: <strong className="text-purple-700 dark:text-purple-300">{globalApi.source}</strong>
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">API Base URL</label>
                    <BaseInput
                      designId="ai-refine-api-url"
                      value={apiUrl}
                      onChange={(e: any) => setApiUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">API Key</label>
                    <BaseInput
                      designId="ai-refine-api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e: any) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">模型 (Model)</label>
                    <BaseInput
                      designId="ai-refine-api-model"
                      value={apiModel}
                      onChange={(e: any) => setApiModel(e.target.value)}
                      placeholder="gpt-4o / claude-3-5-sonnet"
                      className="w-full text-xs py-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate mr-2">
                    {apiTestResult ? (
                      <span className={apiTestResult.ok ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400'} title={apiTestResult.msg}>
                        {apiTestResult.msg}
                      </span>
                    ) : (
                      <span>未配置将离线提炼</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <BaseButton
                      designId="test-api-btn"
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestApi}
                      disabled={isTestingApi}
                      className="text-[11px] h-6 px-2.5"
                    >
                      {isTestingApi ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                      测试
                    </BaseButton>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {step === 'config' && (
            <div className="space-y-4">
              
              {/* Kind Switch (Char vs NPC) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                <div>
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block">精修目标角色定位</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                    {targetKind === 'char' ? '主角人设：提取完整深度人设，条目清晰覆盖全貌' : 'NPC 配角：提取克制配角卡，包含简量人设 (Brief) 与双向视角关系'}
                  </span>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <span className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 flex items-center gap-1.5 border border-purple-200 dark:border-purple-800/80">
                    {targetKind === 'char' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    {targetKind === 'char' ? '主人设' : 'NPC 配角'}
                  </span>
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-2">
                  选择精修结构化模板
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {templates.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 ring-2 ring-purple-500/20'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{tpl.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                              {tpl.targetLength}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">
                            {tpl.info}
                          </p>
                        </div>
                        <ul className="text-[9px] text-zinc-400 dark:text-zinc-500 space-y-1 list-disc list-inside pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80">
                          {tpl.rules.slice(0, 2).map((r, i) => (
                            <li key={i} className="truncate">{r}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strict Fidelity Notice */}
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-[9px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong className="font-bold">保真精修准则：</strong> AI 精修完全忠实于原文档中已有的人设与数据，坚决不进行过度修饰、不胡乱扩写未提及的背景，自动清除作者声明与无关杂质。
                </div>
              </div>

              {/* Custom Instruction */}
              <div>
                <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-1.5">
                  补充精修要求（可选）
                </label>
                <textarea
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  placeholder="例如：特别保留他的法医职业习惯与标志性冷幽默口癖；强调他与主角的师徒关系等..."
                  rows={2}
                  className="w-full text-[11px] p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Source Document Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                    待精修文档预览 ({card.content?.length || 0} 字符)
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-400 max-h-32 overflow-y-auto leading-relaxed">
                  {card.content || '无文档内容'}
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto animate-spin">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {statusMessage || 'AI 正在分析并忠实提炼人设...'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  正在按【{currentTemplate.name}】标准进行人设结构化与去杂质处理
                </p>
              </div>
            </div>
          )}

          {step === 'result' && extractedData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>精修完成！已成功从文档中提取结构化属性，确认后将自动创建新版本。</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('config')}
                  className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline font-bold"
                >
                  重新配置
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    角色姓名
                  </label>
                  <BaseInput
                    designId="extracted-name-input"
                    value={extractedData.name}
                    onChange={(e: any) => setExtractedData({ ...extractedData, name: e.target.value })}
                    className="w-full text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-1">性别</label>
                    <select
                      value={extractedData.gender}
                      onChange={(e: any) => setExtractedData({ ...extractedData, gender: e.target.value })}
                      className="w-full text-[11px] p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="all">通用 / 未知</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-1">年龄</label>
                    <BaseInput
                      designId="extracted-age-input"
                      value={extractedData.age || ''}
                      onChange={(e: any) => setExtractedData({ ...extractedData, age: e.target.value })}
                      placeholder="如: 38岁"
                      className="w-full text-[11px] py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-1.5">
                  提取的特征标签
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800">
                  {extractedData.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="hover:text-rose-500 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="添加标签..."
                      className="text-[10px] px-2 py-0.5 bg-transparent outline-hidden w-24"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Persona */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                    核心身世与详细设定 (Persona)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyField('persona', extractedData.persona)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'persona' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    复制
                  </button>
                </div>
                <textarea
                  value={extractedData.persona}
                  onChange={(e) => setExtractedData({ ...extractedData, persona: e.target.value })}
                  rows={5}
                  className="w-full text-[11px] p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 leading-relaxed font-mono"
                />
              </div>

              {/* Personality */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                    性格特征 (Personality)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyField('personality', extractedData.personality)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'personality' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    复制
                  </button>
                </div>
                <textarea
                  value={extractedData.personality}
                  onChange={(e) => setExtractedData({ ...extractedData, personality: e.target.value })}
                  rows={3}
                  className="w-full text-[11px] p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 leading-relaxed font-mono"
                />
              </div>

              {/* Appearance */}
              {extractedData.appearance && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    外貌描写 (Appearance)
                  </label>
                  <textarea
                    value={extractedData.appearance}
                    onChange={(e) => setExtractedData({ ...extractedData, appearance: e.target.value })}
                    rows={2}
                    className="w-full text-[11px] p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 leading-relaxed font-mono"
                  />
                </div>
              )}

              {/* Family & Relations */}
              {extractedData.familyRelations && extractedData.familyRelations.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 block mb-1.5">
                    人物关系与家人 ({extractedData.familyRelations.length})
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {extractedData.familyRelations.map((rel, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px]">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{rel.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium text-[9px]">
                          {rel.relation}
                        </span>
                        <span className="text-zinc-500 truncate flex-1">{rel.note || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NPC Specific Fields */}
              {targetKind === 'npc' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">TA 对主角关系</label>
                    <BaseInput
                      designId="extracted-relation-input"
                      value={extractedData.relation || ''}
                      onChange={(e: any) => setExtractedData({ ...extractedData, relation: e.target.value })}
                      placeholder="如: 下属 / 密友"
                      className="w-full text-[11px] py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">主角对 TA 关系</label>
                    <BaseInput
                      designId="extracted-rev-relation-input"
                      value={extractedData.reverseRelation || ''}
                      onChange={(e: any) => setExtractedData({ ...extractedData, reverseRelation: e.target.value })}
                      placeholder="如: 上级 / 恩师"
                      className="w-full text-[11px] py-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 bg-zinc-50/80 dark:bg-zinc-950/40">
          <div className="text-[10px] text-zinc-500 max-w-[140px] sm:max-w-none truncate">
            {step === 'result' ? (
              <span>点击右侧按钮直接生成新版本并同步到酒馆卡片格式</span>
            ) : (
              <span>当前选定: <strong>{currentTemplate.name}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <BaseButton
              designId="cancel-ai-refine-btn"
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-[11px] h-7 px-3"
            >
              取消
            </BaseButton>

            {step === 'config' && (
              <BaseButton
                designId="start-ai-refine-btn"
                type="button"
                variant="primary"
                size="sm"
                onClick={handleStartRefine}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs text-[11px] font-bold px-3 sm:px-4 h-7"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                开始精修
              </BaseButton>
            )}

            {step === 'result' && (
              <BaseButton
                designId="apply-and-version-btn"
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApplyAndCreateNewVersion}
                className="bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs text-[11px] font-bold px-3 sm:px-4 h-7"
              >
                <Layers className="w-3 h-3 mr-1" />
                {cardList.length > 1 && cardIndex < cardList.length - 1
                  ? `写入并进入下一张 (${cardIndex + 2}/${cardList.length})`
                  : '生成新版本并写入'}
              </BaseButton>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
