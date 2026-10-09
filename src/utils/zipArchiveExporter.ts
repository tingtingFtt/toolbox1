import { AppData, ItemVersion } from '../types';
import { zipSync, strToU8 } from 'fflate';

/**
 * 格式化文件名中的非法字符 (Windows/Mac/Linux 兼容)
 */
export function sanitizeFileName(name?: string | null, fallback = 'untitled'): string {
  if (!name || typeof name !== 'string') return fallback;
  const cleaned = name
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
    .trim()
    .slice(0, 100);
  return cleaned || fallback;
}

/**
 * 格式化时间戳为易读日期 YYYY-MM-DD
 */
export function formatTimestamp(ts?: number): string {
  if (!ts) return '未知日期';
  try {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '未知日期';
  }
}

/**
 * 将 Base64 DataURL 解析为二进制 Uint8Array 和文件后缀
 */
export function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; ext: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;

    const meta = dataUrl.slice(0, commaIdx);
    const base64Data = dataUrl.slice(commaIdx + 1);

    const match = meta.match(/data:([^;]+)/);
    const mimeType = match ? match[1].toLowerCase() : '';

    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    let ext = 'png';
    if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';
    else if (mimeType.includes('json')) ext = 'json';
    else if (mimeType.includes('font') || mimeType.includes('ttf')) ext = 'ttf';
    else if (mimeType.includes('woff2')) ext = 'woff2';
    else if (mimeType.includes('woff')) ext = 'woff';
    else if (mimeType.includes('otf')) ext = 'otf';

    return { bytes, ext };
  } catch (err) {
    console.warn('Failed to parse data URL:', err);
    return null;
  }
}

export interface ExportZipProgress {
  stage: string;
  currentSection: string;
  percent: number;
  details: string;
}

export interface ExportZipResult {
  blob: Blob;
  fileName: string;
  sizeBytes: number;
  stats: {
    totalSections: number;
    totalItems: number;
    totalVersions: number;
    totalImages: number;
    breakdown: Record<string, { items: number; versions: number; images: number }>;
  };
}

/**
 * 全量结构化数据压缩包导出引擎
 * - 按照各个分界面的中文名称分目录存放
 * - 提取所有图片/立绘/头像/资产并保存为独立图片文件
 * - 对包含多个版本的项目，明确标注版本号、更新日期与变更说明
 * - 内置根目录全量 JSON 备份与清晰的 README 说明
 */
export async function generateFullDataZipArchive(
  appData: AppData,
  onProgress?: (progress: ExportZipProgress) => void,
  signal?: AbortSignal
): Promise<ExportZipResult> {
  const zipFiles: Record<string, Uint8Array> = {};

  const stats = {
    totalSections: 0,
    totalItems: 0,
    totalVersions: 0,
    totalImages: 0,
    breakdown: {} as Record<string, { items: number; versions: number; images: number }>
  };

  const reportLogs: string[] = [];

  const addFile = (path: string, content: Uint8Array | string) => {
    if (typeof content === 'string') {
      zipFiles[path] = strToU8(content);
    } else {
      zipFiles[path] = content;
    }
  };

  const recordStat = (sec: string, hasItem = true, versionCount = 0, imageCount = 0) => {
    if (!stats.breakdown[sec]) {
      stats.breakdown[sec] = { items: 0, versions: 0, images: 0 };
    }
    if (hasItem) stats.breakdown[sec].items += 1;
    stats.breakdown[sec].versions += versionCount;
    stats.breakdown[sec].images += imageCount;

    if (hasItem) stats.totalItems += 1;
    stats.totalVersions += versionCount;
    stats.totalImages += imageCount;
  };

  const nowStr = formatTimestamp(Date.now());
  const dateStrForFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  onProgress?.({
    stage: 'preparing',
    currentSection: '初始化',
    percent: 5,
    details: '正在准备全量结构化归档引擎...'
  });

  // 1. 根目录全量 JSON 备份
  addFile(
    `完整数据备份_TavernVault_Backup_${dateStrForFile}.json`,
    JSON.stringify(appData, null, 2)
  );

  // ================= 01. ST 角色卡 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 角色卡',
    percent: 12,
    details: '正在整理 ST 角色卡、多版本及立绘资产...'
  });

  const cards = appData.cards || [];
  if (cards.length > 0) {
    stats.totalSections += 1;
    cards.forEach((card, idx) => {
      const cardName = sanitizeFileName(card.charName || card.name, `角色卡_${idx + 1}`);
      const verCount = (card.versions || []).length;
      let imgCount = 0;

      const baseFolder = `01_ST角色卡/${cardName}`;

      // (1) 主立绘 / 头像
      if (card.coverImage) {
        const parsed = dataUrlToUint8Array(card.coverImage);
        if (parsed) {
          addFile(`${baseFolder}/${cardName}_主立绘.${parsed.ext}`, parsed.bytes);
          imgCount++;
        }
      }

      // (2) 备选立绘 / extraCovers
      if (Array.isArray(card.extraCovers)) {
        card.extraCovers.forEach((extraImg, eIdx) => {
          const parsed = dataUrlToUint8Array(extraImg);
          if (parsed) {
            addFile(`${baseFolder}/备选立绘_${eIdx + 1}.${parsed.ext}`, parsed.bytes);
            imgCount++;
          }
        });
      }

      // (3) 当前最新版本角色卡数据
      const activeVerLabel = card.activeVersionLabel || (card.version ? `v${card.version}` : '当前版本');
      const activePayload = {
        name: card.name,
        charName: card.charName || card.name,
        author: card.author || '未知',
        category: card.category || '默认',
        tags: card.customTags || [],
        version: card.version,
        activeVersionLabel: activeVerLabel,
        updatedAt: card.updatedAt || card.createdAt,
        rawData: card.rawData,
        content: card.content
      };
      addFile(`${baseFolder}/[${activeVerLabel}] ${cardName}_角色数据.json`, JSON.stringify(activePayload, null, 2));

      // (4) 历史版本分类整理 (若存在多个版本)
      if (verCount > 0) {
        const verHistoryLogs: string[] = [
          `【${cardName}】版本更新历史清单:`,
          `当前活跃版本: ${activeVerLabel} (更新时间: ${formatTimestamp(card.updatedAt)})`,
          `历史归档版本数: ${verCount} 个`,
          '----------------------------------------'
        ];

        card.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt || ver.importedAt);
          const vLabel = sanitizeFileName(ver.versionLabel || `v${vNum}`);
          const vSummary = ver.changeSummary ? `_${sanitizeFileName(ver.changeSummary).slice(0, 20)}` : '';
          const verPath = `${baseFolder}/历史版本/[第${vNum}版_${vDate}_${vLabel}${vSummary}]`;

          verHistoryLogs.push(`- 版本 ${vNum} (${vLabel}): 日期 ${vDate}${ver.changeSummary ? ` | 变更: ${ver.changeSummary}` : ''}`);

          // 保存版本数据
          addFile(`${verPath}/${cardName}_版本${vNum}.json`, JSON.stringify(ver.data || ver, null, 2));

          // 若版本数据自带立绘
          if (ver.data?.coverImage) {
            const vImg = dataUrlToUint8Array(ver.data.coverImage);
            if (vImg) {
              addFile(`${verPath}/${cardName}_版本${vNum}_立绘.${vImg.ext}`, vImg.bytes);
              imgCount++;
            }
          }
        });

        addFile(`${baseFolder}/历史版本/版本更新历史说明.txt`, verHistoryLogs.join('\n'));
      }

      recordStat('ST角色卡', true, verCount, imgCount);
    });

    addFile('01_ST角色卡/ST角色卡汇总清单.json', JSON.stringify(cards, null, 2));
  }

  // ================= 02. ST 主题 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 主题',
    percent: 20,
    details: '正在整理 ST 主题与样式文件...'
  });

  const themes = appData.themes || [];
  if (themes.length > 0) {
    stats.totalSections += 1;
    themes.forEach((theme, idx) => {
      const themeName = sanitizeFileName(theme.name, `主题_${idx + 1}`);
      const verCount = (theme.versions || []).length;
      let imgCount = 0;
      const baseFolder = `02_ST主题/${themeName}`;

      if (theme.coverImage) {
        const parsed = dataUrlToUint8Array(theme.coverImage);
        if (parsed) {
          addFile(`${baseFolder}/${themeName}_预览图.${parsed.ext}`, parsed.bytes);
          imgCount++;
        }
      }

      if (theme.css) {
        addFile(`${baseFolder}/${themeName}_样式.css`, theme.css);
      }

      addFile(`${baseFolder}/[当前版本] ${themeName}.json`, JSON.stringify(theme.jsonData || theme, null, 2));

      if (verCount > 0) {
        theme.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${themeName}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('ST主题', true, verCount, imgCount);
    });

    addFile('02_ST主题/ST主题汇总清单.json', JSON.stringify(themes, null, 2));
  }

  // ================= 03. ST 预设 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 预设',
    percent: 28,
    details: '正在整理 ST 预设与规则配置...'
  });

  const presets = appData.presets || [];
  if (presets.length > 0) {
    stats.totalSections += 1;
    presets.forEach((preset, idx) => {
      const presetName = sanitizeFileName(preset.name || preset.title, `预设_${idx + 1}`);
      const verCount = (preset.versions || []).length;
      const baseFolder = `03_ST预设/${presetName}`;

      addFile(`${baseFolder}/[当前版本] ${presetName}.json`, JSON.stringify(preset.jsonData || preset, null, 2));

      if (verCount > 0) {
        preset.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${presetName}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('ST预设', true, verCount, 0);
    });

    addFile('03_ST预设/ST预设汇总清单.json', JSON.stringify(presets, null, 2));
  }

  // ================= 04. ST 插件 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 插件',
    percent: 34,
    details: '正在整理 ST 插件配置...'
  });

  const plugins = appData.plugins || [];
  if (plugins.length > 0) {
    stats.totalSections += 1;
    plugins.forEach((plugin, idx) => {
      const pluginName = sanitizeFileName(plugin.name, `插件_${idx + 1}`);
      const baseFolder = `04_ST插件/${pluginName}`;
      addFile(`${baseFolder}/${pluginName}.json`, JSON.stringify(plugin.jsonData || plugin, null, 2));
      recordStat('ST插件', true, 0, 0);
    });
    addFile('04_ST插件/ST插件汇总清单.json', JSON.stringify(plugins, null, 2));
  }

  // ================= 05. ST 脚本 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 脚本',
    percent: 40,
    details: '正在整理 ST 脚本及多版本...'
  });

  const scripts = appData.scripts || [];
  if (scripts.length > 0) {
    stats.totalSections += 1;
    scripts.forEach((script, idx) => {
      const scriptName = sanitizeFileName(script.name, `脚本_${idx + 1}`);
      const verCount = (script.versions || []).length;
      const baseFolder = `05_ST脚本/${scriptName}`;

      addFile(`${baseFolder}/[当前版本] ${scriptName}.json`, JSON.stringify(script.jsonData || script, null, 2));

      if (verCount > 0) {
        script.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${scriptName}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('ST脚本', true, verCount, 0);
    });
    addFile('05_ST脚本/ST脚本汇总清单.json', JSON.stringify(scripts, null, 2));
  }

  // ================= 06. ST 世界书 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 世界书',
    percent: 48,
    details: '正在整理 ST 世界书与条目...'
  });

  const stWorldBooks = appData.stWorldBooks || [];
  if (stWorldBooks.length > 0) {
    stats.totalSections += 1;
    stWorldBooks.forEach((wb, idx) => {
      const wbName = sanitizeFileName(wb.name, `世界书_${idx + 1}`);
      const verCount = (wb.versions || []).length;
      const baseFolder = `06_ST世界书/${wbName}`;

      addFile(`${baseFolder}/[当前版本] ${wbName}.json`, JSON.stringify(wb.jsonData || wb, null, 2));

      if (verCount > 0) {
        wb.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${wbName}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('ST世界书', true, verCount, 0);
    });
    addFile('06_ST世界书/ST世界书汇总清单.json', JSON.stringify(stWorldBooks, null, 2));
  }

  // ================= 07. ST 正则 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'ST 正则',
    percent: 54,
    details: '正在整理 ST 正则替换脚本...'
  });

  const stRegexScripts = appData.stRegexScripts || [];
  if (stRegexScripts.length > 0) {
    stats.totalSections += 1;
    stRegexScripts.forEach((rx, idx) => {
      const rxName = sanitizeFileName(rx.scriptName || (rx as any).name, `正则_${idx + 1}`);
      const verCount = (rx.versions || []).length;
      const baseFolder = `07_ST正则/${rxName}`;

      addFile(`${baseFolder}/[当前版本] ${rxName}.json`, JSON.stringify(rx.jsonData || rx, null, 2));

      if (verCount > 0) {
        rx.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${rxName}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('ST正则', true, verCount, 0);
    });
    addFile('07_ST正则/ST正则汇总清单.json', JSON.stringify(stRegexScripts, null, 2));
  }

  // ================= 08. 聊天记录存储 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '聊天记录存储',
    percent: 60,
    details: '正在导出聊天记录与对话会话...'
  });

  const chatLogs = appData.chatLogs || [];
  if (chatLogs.length > 0) {
    stats.totalSections += 1;
    chatLogs.forEach((log, idx) => {
      const logTitle = sanitizeFileName(log.title || `${log.characterName || '未命名'}_对话记录`, `聊天记录_${idx + 1}`);
      const verCount = (log.versions || []).length;
      const baseFolder = `08_聊天记录存储/${logTitle}`;

      // 导出 JSON
      addFile(`${baseFolder}/[当前版本] ${logTitle}.json`, JSON.stringify(log, null, 2));

      // 同时导出易于阅读的纯文本对话
      if (Array.isArray(log.messages) && log.messages.length > 0) {
        const txtLines = [
          `=== 聊天记录: ${log.title} ===`,
          `角色: ${log.characterName || '未知'} | 用户: ${log.userName || 'User'} | 消息数: ${log.messages.length}`,
          `创建时间: ${formatTimestamp(log.createdAt)} | 更新时间: ${formatTimestamp(log.updatedAt)}`,
          '========================================\n'
        ];
        log.messages.forEach(m => {
          const sender = m.is_user ? (log.userName || 'User') : (m.name || log.characterName || 'Character');
          const time = m.send_date ? ` (${m.send_date})` : '';
          txtLines.push(`[${sender}]${time}:\n${m.mes || m.content || ''}\n`);
        });
        addFile(`${baseFolder}/${logTitle}_纯文本阅读版.txt`, txtLines.join('\n'));
      }

      if (verCount > 0) {
        log.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${logTitle}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('聊天记录存储', true, verCount, 0);
    });
    addFile('08_聊天记录存储/聊天记录汇总清单.json', JSON.stringify(chatLogs, null, 2));
  }

  // ================= 09. 小手机链接 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '小手机链接',
    percent: 66,
    details: '正在导出小手机链接清单...'
  });

  const phoneLinks = appData.phoneLinks || [];
  if (phoneLinks.length > 0) {
    stats.totalSections += 1;
    const txtLines = [
      '=== 小手机链接清单 ===',
      `导出时间: ${nowStr} | 共 ${phoneLinks.length} 条链接`,
      '----------------------------------------'
    ];
    phoneLinks.forEach((link, i) => {
      txtLines.push(`${i + 1}. 【${link.name}】`);
      txtLines.push(`   链接: ${link.url}`);
      if (link.contact) txtLines.push(`   联系方式: ${link.contact}`);
      if (link.description) txtLines.push(`   描述: ${link.description}`);
      txtLines.push('');
      recordStat('小手机链接', true, 0, 0);
    });
    addFile('09_小手机链接/小手机链接清单.txt', txtLines.join('\n'));
    addFile('09_小手机链接/小手机链接清单.json', JSON.stringify(phoneLinks, null, 2));
  }

  // ================= 10. 普通角色卡 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '普通角色卡',
    percent: 72,
    details: '正在整理普通角色卡与立绘...'
  });

  const normalCards = appData.normalCards || [];
  if (normalCards.length > 0) {
    stats.totalSections += 1;
    normalCards.forEach((card, idx) => {
      const cardName = sanitizeFileName(card.charName || card.name || card.realName, `普通角色_${idx + 1}`);
      const verCount = (card.versions || []).length;
      let imgCount = 0;
      const baseFolder = `10_普通角色卡/${cardName}`;

      if (card.coverImage) {
        const parsed = dataUrlToUint8Array(card.coverImage);
        if (parsed) {
          addFile(`${baseFolder}/${cardName}_立绘.${parsed.ext}`, parsed.bytes);
          imgCount++;
        }
      }

      addFile(`${baseFolder}/[当前版本] ${cardName}.json`, JSON.stringify(card, null, 2));

      if (card.content || card.description) {
        const descText = [
          `=== 角色设定: ${cardName} ===`,
          `作者: ${card.author || card.creator || '未知'}`,
          `分类: ${card.category || '默认'}`,
          `性格/设定: ${card.personality || '未填写'}`,
          `情景: ${card.scenario || '未填写'}`,
          '----------------------------------------',
          card.content || card.description || ''
        ].join('\n\n');
        addFile(`${baseFolder}/${cardName}_设定文本.txt`, descText);
      }

      if (verCount > 0) {
        card.versions?.forEach((ver, vIdx) => {
          const vNum = ver.versionNumber || vIdx + 1;
          const vDate = formatTimestamp(ver.updatedAt);
          addFile(
            `${baseFolder}/历史版本/[第${vNum}版_${vDate}] ${cardName}.json`,
            JSON.stringify(ver.data || ver, null, 2)
          );
        });
      }

      recordStat('普通角色卡', true, verCount, imgCount);
    });
    addFile('10_普通角色卡/普通角色卡汇总清单.json', JSON.stringify(normalCards, null, 2));
  }

  // ================= 11. 表情包 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '表情包',
    percent: 78,
    details: '正在提取表情包图片与表情包组...'
  });

  const stickerPacks = appData.stickerPacks || [];
  if (stickerPacks.length > 0) {
    stats.totalSections += 1;
    stickerPacks.forEach((pack, pIdx) => {
      const packName = sanitizeFileName(pack.title || pack.name, `表情包组_${pIdx + 1}`);
      const baseFolder = `11_表情包/${packName}`;
      let imgCount = 0;

      if (Array.isArray(pack.items)) {
        pack.items.forEach((item, iIdx) => {
          const itemName = sanitizeFileName(item.name, `表情_${iIdx + 1}`);
          if (item.url) {
            const parsed = dataUrlToUint8Array(item.url);
            if (parsed) {
              addFile(`${baseFolder}/${String(iIdx + 1).padStart(2, '0')}_${itemName}.${parsed.ext}`, parsed.bytes);
              imgCount++;
            }
          }
        });
      }

      addFile(`${baseFolder}/表情包信息.json`, JSON.stringify(pack, null, 2));
      recordStat('表情包', true, 0, imgCount);
    });
    addFile('11_表情包/表情包汇总清单.json', JSON.stringify(stickerPacks, null, 2));
  }

  // ================= 12. 世界书 (通用) =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '世界书',
    percent: 82,
    details: '正在整理通用世界书设定...'
  });

  const worldBooks = appData.worldBooks || [];
  if (worldBooks.length > 0) {
    stats.totalSections += 1;
    worldBooks.forEach((wb, idx) => {
      const wbName = sanitizeFileName(wb.title || wb.name, `世界书_${idx + 1}`);
      const baseFolder = `12_世界书/${wbName}`;

      addFile(`${baseFolder}/${wbName}.json`, JSON.stringify(wb.jsonData || wb, null, 2));
      if (wb.content) {
        addFile(`${baseFolder}/${wbName}_设定文本.txt`, wb.content);
      }
      recordStat('世界书', true, 0, 0);
    });
    addFile('12_世界书/世界书汇总清单.json', JSON.stringify(worldBooks, null, 2));
  }

  // ================= 13. 番外小剧场 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '番外小剧场',
    percent: 86,
    details: '正在整理番外小剧场与故事剧本...'
  });

  const extraStories = appData.extraStories || [];
  if (extraStories.length > 0) {
    stats.totalSections += 1;
    extraStories.forEach((story, idx) => {
      const storyTitle = sanitizeFileName(story.title, `剧场_${idx + 1}`);
      const baseFolder = `13_番外小剧场/${storyTitle}`;
      addFile(`${baseFolder}/${storyTitle}.txt`, story.content || '');
      addFile(`${baseFolder}/${storyTitle}.json`, JSON.stringify(story, null, 2));
      recordStat('番外小剧场', true, 0, 0);
    });
    addFile('13_番外小剧场/番外小剧场汇总清单.json', JSON.stringify(extraStories, null, 2));
  }

  // ================= 14. 聊天梗 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '聊天梗',
    percent: 89,
    details: '正在整理聊天梗库...'
  });

  const chatMemes = appData.chatMemes || [];
  if (chatMemes.length > 0) {
    stats.totalSections += 1;
    chatMemes.forEach((meme, idx) => {
      const memeTitle = sanitizeFileName(meme.title || meme.content.slice(0, 15), `梗_${idx + 1}`);
      addFile(`14_聊天梗/${memeTitle}.txt`, meme.content);
      recordStat('聊天梗', true, 0, 0);
    });
    addFile('14_聊天梗/聊天梗汇总清单.json', JSON.stringify(chatMemes, null, 2));
  }

  // ================= 15. 美化 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '美化',
    percent: 92,
    details: '正在整理美化主题与资源...'
  });

  const beautifications = appData.beautifications || [];
  if (beautifications.length > 0) {
    stats.totalSections += 1;
    beautifications.forEach((b, idx) => {
      const bName = sanitizeFileName(b.name, `美化_${idx + 1}`);
      let imgCount = 0;
      const baseFolder = `15_美化/${bName}`;

      if (b.coverImage) {
        const parsed = dataUrlToUint8Array(b.coverImage);
        if (parsed) {
          addFile(`${baseFolder}/${bName}_效果图.${parsed.ext}`, parsed.bytes);
          imgCount++;
        }
      }
      if (b.css) {
        addFile(`${baseFolder}/${bName}.css`, b.css);
      }
      addFile(`${baseFolder}/${bName}.json`, JSON.stringify(b.jsonData || b, null, 2));
      recordStat('美化', true, (b.versions || []).length, imgCount);
    });
    addFile('15_美化/美化汇总清单.json', JSON.stringify(beautifications, null, 2));
  }

  // ================= 16. 字体 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '字体',
    percent: 94,
    details: '正在整理自定义字体文件...'
  });

  const fonts = appData.fonts || [];
  if (fonts.length > 0) {
    stats.totalSections += 1;
    fonts.forEach((f, idx) => {
      const fName = sanitizeFileName(f.name, `字体_${idx + 1}`);
      const baseFolder = `16_字体/${fName}`;
      if (f.fileData) {
        const parsed = dataUrlToUint8Array(f.fileData);
        if (parsed) {
          addFile(`${baseFolder}/${fName}.${parsed.ext || 'ttf'}`, parsed.bytes);
        }
      }
      addFile(`${baseFolder}/字体信息.json`, JSON.stringify(f, null, 2));
      recordStat('字体', true, 0, 0);
    });
    addFile('16_字体/字体汇总清单.json', JSON.stringify(fonts, null, 2));
  }

  // ================= 17. API 存储 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'API 存储',
    percent: 96,
    details: '正在整理 API 配置清单...'
  });

  const apis = appData.apis || [];
  if (apis.length > 0) {
    stats.totalSections += 1;
    addFile('17_API存储/API配置清单.json', JSON.stringify(apis, null, 2));
    recordStat('API存储', true, 0, 0);
  }

  // ================= 18. 小手机破限与预设 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: '破限/预设',
    percent: 97,
    details: '正在整理破限与预设清单...'
  });

  const mobilePresets = appData.mobilePresets || [];
  if (mobilePresets.length > 0) {
    stats.totalSections += 1;
    mobilePresets.forEach((p, idx) => {
      const pName = sanitizeFileName(p.name || p.title, `预设_${idx + 1}`);
      const folder = `18_小手机破限预设/${p.mode === 'online' ? '线上预设' : '线下预设'}/${pName}`;
      if (p.jailbreakPrompt) {
        addFile(`${folder}/破限词.txt`, p.jailbreakPrompt);
      }
      if (p.systemPrompt) {
        addFile(`${folder}/系统设定.txt`, p.systemPrompt);
      }
      addFile(`${folder}/完整配置.json`, JSON.stringify(p, null, 2));
      recordStat('破限/预设', true, (p.versions || []).length, 0);
    });
    addFile('18_小手机破限预设/破限预设汇总清单.json', JSON.stringify(mobilePresets, null, 2));
  }

  // ================= 19. HTML 管理 =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'exporting',
    currentSection: 'HTML 管理',
    percent: 98,
    details: '正在整理 HTML 组件与模板...'
  });

  const htmlStorages = appData.htmlStorages || [];
  if (htmlStorages.length > 0) {
    stats.totalSections += 1;
    htmlStorages.forEach((h, idx) => {
      const hName = sanitizeFileName(h.title || h.name, `HTML组件_${idx + 1}`);
      const folder = `19_HTML管理/${hName}`;
      let combinedHtml = h.htmlContent || '';
      if (h.cssContent) {
        combinedHtml = `<style>\n${h.cssContent}\n</style>\n${combinedHtml}`;
      }
      if (h.jsContent) {
        combinedHtml = `${combinedHtml}\n<script>\n${h.jsContent}\n</script>`;
      }
      addFile(`${folder}/${hName}.html`, combinedHtml);
      addFile(`${folder}/配置信息.json`, JSON.stringify(h, null, 2));
      recordStat('HTML管理', true, (h.versions || []).length, 0);
    });
    addFile('19_HTML管理/HTML管理汇总清单.json', JSON.stringify(htmlStorages, null, 2));
  }

  // ================= README 归档清单与版本说明 =================
  const readmeContent = [
    '========================================================================',
    '                 TavernVault 全量数据结构化归档压缩包                   ',
    '========================================================================',
    `导出时间: ${nowStr} (${new Date().toLocaleString()})`,
    `总板块数: ${stats.totalSections} 个板块`,
    `总数据条目: ${stats.totalItems} 条`,
    `总历史版本: ${stats.totalVersions} 个归档版本`,
    `总图片/立绘资产: ${stats.totalImages} 张图片`,
    '------------------------------------------------------------------------',
    '【目录分类说明】',
    '本压缩包已按照 TavernVault 各个功能分界面的名称清晰分类，包含所有文本、JSON配置、多版本历史归档以及提取出的独立立绘与图片资产：',
    '',
    ...Object.entries(stats.breakdown).map(([sec, st]) => {
      return `  📁 ${sec.padEnd(16, ' ')} : ${st.items} 条数据 | ${st.versions} 个历史版本 | ${st.images} 张图片`;
    }),
    '',
    '------------------------------------------------------------------------',
    '【多版本说明】',
    '- 每个包含历史版本的项目，均在对应目录下设有「历史版本」子文件夹。',
    '- 历史版本均按 [版本号_更新日期_版本标签] 的标准格式清晰命名，并附带更新说明。',
    '- 根目录下的「完整数据备份_TavernVault_Backup.json」可随时用于在软件中一键完整还原。',
    '========================================================================'
  ].join('\n');

  addFile('README_归档清单与版本说明.txt', readmeContent);

  // ================= 打包生成 ZIP =================
  if (signal?.aborted) throw new Error('导出中断');
  onProgress?.({
    stage: 'compressing',
    currentSection: '压缩打包',
    percent: 98,
    details: '正在高效构建 ZIP 归档包 (含所有分类与图片)...'
  });

  const zipped = zipSync(zipFiles, { level: 6 });
  const blob = new Blob([zipped as any], { type: 'application/zip' });

  const finalFileName = `TavernVault_FullArchive_${dateStrForFile}.zip`;

  onProgress?.({
    stage: 'complete',
    currentSection: '完成',
    percent: 100,
    details: '导出打包完成！'
  });

  return {
    blob,
    fileName: finalFileName,
    sizeBytes: blob.size,
    stats
  };
}
