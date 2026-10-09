import { CardEntry, STWorldBookEntry, AppData } from '../types';
import { injectBoundAssetsForExport, generateCardPngBlob, createZip, triggerFileDownload, extractPngTextAsync, fileToDataURL } from '../utils';

export interface TavernConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  latencyMs?: number;
  serverVersion?: string;
  errorMessage?: string;
  lastChecked?: number;
  serverUrl?: string;
}

export interface TavernPullResult {
  charactersCount: number;
  worldBooksCount: number;
  newCards: CardEntry[];
  newWorldBooks: Partial<STWorldBookEntry>[];
  errors: string[];
}

/**
 * Helper to build standard Headers instance
 */
function createApiHeaders(apiKey?: string, contentType?: string): Headers {
  const h = new Headers();
  h.set('Accept', 'application/json');
  if (contentType) {
    h.set('Content-Type', contentType);
  }
  if (apiKey?.trim()) {
    h.set('Authorization', `Bearer ${apiKey.trim()}`);
    h.set('x-api-key', apiKey.trim());
  }
  return h;
}

/**
 * Clean URL: trim whitespace and trailing slashes
 */
export function normalizeServerUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'http://127.0.0.1:8000';
  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Test connectivity to a SillyTavern server
 */
export async function testSillyTavernConnection(
  rawUrl: string,
  apiKey?: string
): Promise<TavernConnectionStatus> {
  const serverUrl = normalizeServerUrl(rawUrl);
  const startTime = Date.now();
  const headers = createApiHeaders(apiKey);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let response: Response | null = null;
    let versionStr = '';
    let corsBlocked = false;

    // 1. Try JSON API endpoints with CORS
    const endpointsToTry = ['/api/version', '/api/characters', '/api/worldinfo', '/api/settings'];
    for (const ep of endpointsToTry) {
      try {
        const testRes = await fetch(`${serverUrl}${ep}`, {
          method: 'GET',
          headers,
          signal: controller.signal,
          mode: 'cors',
        });
        if (testRes.ok) {
          response = testRes;
          const data = await testRes.json().catch(() => ({}));
          versionStr = data.version || data.tag || 'SillyTavern API';
          break;
        } else if (testRes.status === 401 || testRes.status === 403) {
          response = testRes;
          versionStr = 'SillyTavern (需鉴权密钥)';
          break;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        corsBlocked = true;
      }
    }

    // 2. If CORS was blocked or endpoints failed, test if server is physically alive with no-cors probe
    if (!response) {
      try {
        const probeHeaders = new Headers();
        probeHeaders.set('Accept', '*/*');
        const probeRes = await fetch(`${serverUrl}/`, {
          method: 'GET',
          headers: probeHeaders,
          signal: controller.signal,
          mode: 'no-cors',
        });
        if (probeRes.type === 'opaque') {
          response = probeRes;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
      }
    }

    clearTimeout(timeoutId);
    const latencyMs = Math.max(1, Date.now() - startTime);

    if (response && response.ok) {
      return {
        status: 'connected',
        latencyMs,
        serverVersion: versionStr || 'SillyTavern (在线)',
        lastChecked: Date.now(),
        serverUrl,
      };
    } else if (response && response.status === 401) {
      return {
        status: 'error',
        errorMessage: '401 未授权：酒馆服务开启了鉴权，请在下方填写正确的 API 访问令牌/密钥。',
        lastChecked: Date.now(),
        serverUrl,
      };
    } else if (response && response.type === 'opaque') {
      // The server is alive, but CORS mode was blocked
      return {
        status: 'connected',
        latencyMs,
        serverVersion: 'SillyTavern 服务运行中 (建议开启 CORS)',
        lastChecked: Date.now(),
        serverUrl,
      };
    } else {
      return {
        status: 'error',
        errorMessage: corsBlocked
          ? '跨域限制 (CORS)：检测到目标地址可能未开启 CORS。请在 SillyTavern 的 config.yaml 中设置 cors.origin 为 ["*"] 并重启酒馆；或直接在「文件夹存档」中选择目录进行免跨域同步。'
          : '无法连接到酒馆：请确认 SillyTavern 服务正在运行且地址/端口填写正确。',
        lastChecked: Date.now(),
        serverUrl,
      };
    }
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    const isCors = err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError');
    const isHttpsToHttp = typeof window !== 'undefined' && window.location.protocol === 'https:' && serverUrl.startsWith('http://');

    let msg = isAbort
      ? '连接超时：请确认 SillyTavern 正在本机或局域网运行且端口开放。'
      : isHttpsToHttp
      ? '浏览器安全拦截 (HTTPS 无法直连本地 HTTP 酒馆)：当前网页处于 HTTPS 安全环境，手机浏览器禁止向本地 HTTP 发送请求。解决方式：① 在手机浏览器设置中允许该网站访问「不安全内容/私网」；② 直接使用下方「文件夹存档」免网络读取。'
      : isCors
      ? '跨域限制 (CORS) 或网络不可达：请确保 SillyTavern 的 config.yaml 已开启 cors: true 并设置 origin: ["*"]，或直接在「文件夹存档」中选择酒馆目录秒级拉取。'
      : err?.message?.includes('reading \'get\'')
      ? '请求头解析拦截异常：检测到浏览器扩展或脚本拦截了网络请求。建议使用「文件夹存档」直接选择本地酒馆目录，100% 免网络免拦截。'
      : `连接失败: ${err?.message || '未知错误'}`;

    return {
      status: 'error',
      errorMessage: msg,
      lastChecked: Date.now(),
      serverUrl,
    };
  }
}

/**
 * Pull Character Cards and World Books from SillyTavern
 */
export async function pullFromSillyTavern(
  rawUrl: string,
  apiKey?: string,
  onProgress?: (current: number, total: number, itemName: string, phase?: string) => void
): Promise<TavernPullResult> {
  const serverUrl = normalizeServerUrl(rawUrl);
  const headers = createApiHeaders(apiKey);

  const result: TavernPullResult = {
    charactersCount: 0,
    worldBooksCount: 0,
    newCards: [],
    newWorldBooks: [],
    errors: [],
  };

  // 1. Fetch Characters list
  try {
    const res = await fetch(`${serverUrl}/api/characters`, { method: 'GET', headers });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const totalChars = list.length;
        for (let i = 0; i < totalChars; i++) {
          const item = list[i];
          const charName = typeof item === 'string' ? item : item.name || item.avatar;
          if (!charName) continue;

          onProgress?.(i + 1, totalChars, charName);

          // Fetch individual card PNG details & metadata
          try {
            const avatarUrl = `${serverUrl}/characters/${encodeURIComponent(charName)}`;
            const avatarHeaders = new Headers();
            avatarHeaders.set('Accept', 'image/*,*/*');
            if (apiKey?.trim()) {
              avatarHeaders.set('Authorization', `Bearer ${apiKey.trim()}`);
              avatarHeaders.set('x-api-key', apiKey.trim());
            }
            const avatarRes = await fetch(avatarUrl, {
              method: 'GET',
              headers: avatarHeaders,
            });
            let coverImage = '';
            let parsedRawData: any = typeof item === 'object' ? item : null;
            let parsedAuthor = typeof item === 'object' ? (item.creator || item.author || '') : '';
            let recognizedName = typeof item === 'object' && item.name ? item.name : charName.replace(/\.[^/.]+$/, '');
            let parsedVersion = 'v2';

            if (avatarRes.ok) {
              const blob = await avatarRes.blob();
              coverImage = await fileToDataURL(blob);

              try {
                const arrayBuf = await blob.arrayBuffer();
                const textChunks = await extractPngTextAsync(arrayBuf);
                
                if (textChunks['ccv3']) {
                  const rawCcv3 = String(textChunks['ccv3'] || '').trim();
                  const candidates: string[] = [rawCcv3];
                  const normalizedBase64 = rawCcv3.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
                  if (normalizedBase64) {
                    const padded = normalizedBase64 + '='.repeat((4 - (normalizedBase64.length % 4)) % 4);
                    try {
                      const decoded = atob(padded);
                      const bytes = new Uint8Array(decoded.length);
                      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
                      candidates.push(new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '').trim());
                    } catch {}
                  }

                  for (const cand of candidates) {
                    if (!cand) continue;
                    try {
                      const val = JSON.parse(cand);
                      if (val && typeof val === 'object') {
                        parsedRawData = val.data || val;
                        parsedVersion = 'v3';
                        parsedAuthor = val.data?.creator || val.data?.extensions?.author || val.creator || val.author || parsedAuthor;
                        if (parsedRawData.name) recognizedName = parsedRawData.name;
                        break;
                      }
                    } catch {}
                  }
                }

                if (!parsedRawData && textChunks['chara']) {
                  try {
                    const decoded = atob(textChunks['chara']);
                    const bytes = new Uint8Array(decoded.length);
                    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
                    const jsonStr = new TextDecoder('utf-8').decode(bytes);
                    parsedRawData = JSON.parse(jsonStr);
                    parsedVersion = 'v2';
                    parsedAuthor = parsedRawData.author || parsedRawData.creator || parsedAuthor;
                    if (parsedRawData.name) recognizedName = parsedRawData.name;
                  } catch (err) {
                    console.warn('Tavern chara v2 parse error:', err);
                  }
                }
              } catch (e) {
                // If PNG text chunk extraction fails, fallback to item info
              }
            }

            const rawCardObj = parsedRawData || (typeof item === 'object' ? item : { name: recognizedName });
            const cardId = 'card_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

            const cardEntry: CardEntry = {
              id: cardId,
              name: recognizedName,
              fileName: typeof item === 'string' ? item : `${charName}.png`,
              coverImage: coverImage || null,
              author: parsedAuthor,
              authorManual: false,
              customTags: ['酒馆拉取'],
              version: parsedVersion,
              fileType: 'png',
              source: 'tavern-network',
              group: '酒馆拉取',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              rawData: rawCardObj,
              versions: []
            };

            result.newCards.push(cardEntry);
            result.charactersCount++;
          } catch (e: any) {
            result.errors.push(`拉取角色 ${charName} 失败: ${e.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`无法获取酒馆角色列表: ${err.message}`);
  }

  // 2. Fetch World Info / Books
  try {
    const res = await fetch(`${serverUrl}/api/worldinfo`, { method: 'GET', headers });
    if (res.ok) {
      const wbs = await res.json();
      if (Array.isArray(wbs)) {
        for (const wb of wbs) {
          result.newWorldBooks.push({
            name: typeof wb === 'string' ? wb : (wb.name || '世界书'),
            source: 'tavern-network',
            entries: wb.entries || [],
            jsonData: wb,
          });
          result.worldBooksCount++;
        }
      } else if (typeof wbs === 'object' && wbs !== null) {
        for (const [key, val] of Object.entries(wbs)) {
          result.newWorldBooks.push({
            name: key,
            source: 'tavern-network',
            entries: (val as any)?.entries || [],
            jsonData: val,
          });
          result.worldBooksCount++;
        }
      }
    }
  } catch (err: any) {
    // Non-blocking error
  }

  return result;
}

/**
 * Push Character Cards to SillyTavern Server
 */
export async function pushCardToSillyTavern(
  rawUrl: string,
  card: CardEntry,
  appData: AppData,
  apiKey?: string
): Promise<{ success: boolean; message: string }> {
  const serverUrl = normalizeServerUrl(rawUrl);
  const uploadHeaders = new Headers();
  if (apiKey?.trim()) {
    uploadHeaders.set('Authorization', `Bearer ${apiKey.trim()}`);
    uploadHeaders.set('x-api-key', apiKey.trim());
  }

  try {
    const pngBlob = await generateCardPngBlob(card, appData);
    const safeName = (card.name || 'character').replace(/[\\/:*?"<>|]/g, '_');
    const fileName = `${safeName}.png`;

    const formData = new FormData();
    formData.append('avatar', pngBlob, fileName);
    formData.append('file', pngBlob, fileName);

    let res = await fetch(`${serverUrl}/api/characters/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });

    // Fallback to /api/characters/import if upload endpoint rejected
    if (!res.ok) {
      const v3Payload = injectBoundAssetsForExport(card, appData);
      const jsonHeaders = createApiHeaders(apiKey, 'application/json');
      res = await fetch(`${serverUrl}/api/characters/import`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          file_type: 'json',
          ...v3Payload,
        }),
      });
    }

    if (res.ok) {
      // Sync bound worldbooks to tavern if available
      if (card.boundWorldBooks?.length) {
        const boundWbs = (appData.stWorldBooks || []).filter(w => card.boundWorldBooks!.includes(w.id));
        for (const wb of boundWbs) {
          try {
            const wbHeaders = createApiHeaders(apiKey, 'application/json');
            await fetch(`${serverUrl}/api/worldinfo/import`, {
              method: 'POST',
              headers: wbHeaders,
              body: JSON.stringify(wb.jsonData || { name: wb.name, description: wb.description, entries: wb.entries || [] })
            });
          } catch {}
        }
      }

      return { success: true, message: `角色卡「${card.name}」已成功推送到酒馆！` };
    } else {
      const errText = await res.text().catch(() => '');
      return { success: false, message: `推送失败 (${res.status}): ${errText || '服务器拒绝请求'}` };
    }
  } catch (err: any) {
    return { success: false, message: `网络推送异常: ${err.message}` };
  }
}

/**
 * Package selected cards for SillyTavern Import
 */
export async function packageCardsForSillyTavern(
  cards: CardEntry[],
  appData: AppData
): Promise<void> {
  const files: Array<{ name: string; content: Blob | Uint8Array | string }> = [];
  const processedWbIds = new Set<string>();

  for (const card of cards) {
    const safeName = (card.name || 'character').replace(/[\\/:*?"<>|]/g, '_');
    const historyVersions = card.versions || [];
    const activeVerNum = card.activeVersionNumber || (historyVersions.length + 1);
    const activeVerLabel = card.activeVersionLabel || `v${activeVerNum}`;
    
    // 1. Current active version with version label
    const activeFileBase = `${safeName}_${activeVerLabel}`;
    try {
      const pngBlob = await generateCardPngBlob(card, appData);
      files.push({
        name: `characters/${activeFileBase}.png`,
        content: pngBlob,
      });
    } catch (e) {
      const fullData = injectBoundAssetsForExport(card, appData);
      files.push({
        name: `characters/${activeFileBase}.json`,
        content: JSON.stringify(fullData, null, 2),
      });
    }

    const fullData = injectBoundAssetsForExport(card, appData);
    files.push({
      name: `characters_json/${activeFileBase}.json`,
      content: JSON.stringify(fullData, null, 2),
    });

    // 2. All historical versions with version label
    for (const ver of historyVersions) {
      const vNum = ver.versionNumber;
      const vLabel = ver.versionLabel || `v${vNum}`;
      const histFileBase = `${safeName}_${vLabel}`;

      const histCard: CardEntry = {
        ...card,
        ...(ver.data || {}),
        name: ver.data?.name || card.name,
        charName: ver.data?.charName || card.charName || card.name,
        fileName: ver.data?.fileName || card.fileName,
        fileType: ver.data?.fileType || card.fileType || 'png',
        version: ver.data?.version || card.version,
        author: ver.data?.author || card.author,
        rawData: ver.data?.rawData || card.rawData,
        coverImage: ver.data?.coverImage || card.coverImage,
        boundWorldBooks: ver.data?.boundWorldBooks || card.boundWorldBooks,
        boundScripts: ver.data?.boundScripts || card.boundScripts,
        boundRegexes: ver.data?.boundRegexes || card.boundRegexes,
        customTags: ver.data?.customTags || card.customTags
      };

      try {
        const pngBlob = await generateCardPngBlob(histCard, appData);
        files.push({
          name: `characters/${histFileBase}.png`,
          content: pngBlob,
        });
      } catch (e) {
        const hData = injectBoundAssetsForExport(histCard, appData);
        files.push({
          name: `characters/${histFileBase}.json`,
          content: JSON.stringify(hData, null, 2),
        });
      }

      const hData = injectBoundAssetsForExport(histCard, appData);
      files.push({
        name: `characters_json/${histFileBase}.json`,
        content: JSON.stringify(hData, null, 2),
      });
    }

    // 3. Extract bound worldbooks into worldinfo/ folder
    if (card.boundWorldBooks?.length) {
      const boundWbs = (appData.stWorldBooks || []).filter(w => card.boundWorldBooks!.includes(w.id));
      for (const wb of boundWbs) {
        if (!processedWbIds.has(wb.id)) {
          processedWbIds.add(wb.id);
          const safeWbName = (wb.name || 'worldbook').replace(/[\\/:*?"<>|]/g, '_');
          files.push({
            name: `worldinfo/${safeWbName}.json`,
            content: JSON.stringify(wb.jsonData || { name: wb.name, description: wb.description, entries: wb.entries || [] }, null, 2),
          });
        }
      }
    }
  }

  const zipBlob = await createZip(files);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  triggerFileDownload(zipBlob, `SillyTavern_Cards_Export_${dateStr}.zip`);
}
