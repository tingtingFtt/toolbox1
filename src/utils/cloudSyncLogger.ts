export interface CloudSyncLogEntry {
  id: string;
  timestamp: string;
  timeMs: number;
  category: 'baidu' | 'webdav' | 's3' | 'crypto' | 'pipeline' | 'system';
  level: 'info' | 'success' | 'warn' | 'error';
  title: string;
  url?: string;
  method?: string;
  status?: number;
  latencyMs?: number;
  requestDetails?: any;
  responseDetails?: any;
  error?: string;
  diagnosis?: string;
}

type LogListener = (logs: CloudSyncLogEntry[]) => void;

class CloudSyncLoggerService {
  private logs: CloudSyncLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private maxLogs: number = 200;

  constructor() {
    this.addLog({
      category: 'system',
      level: 'info',
      title: '云端同步诊断日志引擎初始化就绪',
      diagnosis: '所有网盘 API 调用、请求链路、加密流与状态码均会在此被实时捕获并分析。',
    });
  }

  public getLogs(): CloudSyncLogEntry[] {
    return [...this.logs];
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addLog(entry: Omit<CloudSyncLogEntry, 'id' | 'timestamp' | 'timeMs'>): CloudSyncLogEntry {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    // Auto-diagnose Baidu specific errno if present
    let diagnosis = entry.diagnosis;
    if (!diagnosis && entry.responseDetails?.errno !== undefined) {
      diagnosis = this.interpretBaiduErrno(entry.responseDetails.errno);
    } else if (!diagnosis && entry.error?.includes('Failed to fetch')) {
      diagnosis = '网络请求被浏览器拦截或目标服务不可达，请检查网络、连接服务地址与服务端跨域设置。GitHub Pages 不提供网盘代理接口。';
    }

    const fullEntry: CloudSyncLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      timeMs: Date.now(),
      diagnosis,
    };

    this.logs = [fullEntry, ...this.logs.slice(0, this.maxLogs - 1)];
    this.notify();
    return fullEntry;
  }

  public clear(): void {
    this.logs = [];
    this.notify();
  }

  private notify(): void {
    const current = this.getLogs();
    this.listeners.forEach((l) => l(current));
  }

  public interpretBaiduErrno(errno: number): string {
    switch (errno) {
      case 0:
        return '操作成功 (errno: 0)';
      case -6:
        return '身份验证失败 (errno: -6)：Access Token 无效、已过期或与当前 AppKey 不匹配，请点击「重新授权」或刷新 Token。';
      case -9:
        return '文件不存在 (errno: -9)：请求的远端文件路径不存在，通常属于首次同步或空目录状态。';
      case 31061:
        return '文件或目录不存在 / 无沙盒访问权限 (errno: 31061)：百度网盘应用通常只能读写「/apps/应用名」沙盒目录，请确认备份路径是否正确。';
      case 31066:
        return '文件已存在 (errno: 31066)：目标路径已存在同名文件。';
      case 31034:
        return '命中频率安全策略 (errno: 31034)：请求过于频繁，请稍候 10 秒后重试。';
      case 31045:
        return '用户不存在 (errno: 31045)。';
      case 111:
        return 'Token 授权过期 (errno: 111)：请重新登录授权。';
      default:
        return `百度网盘返回状态码: errno = ${errno}`;
    }
  }
}

export const syncLogger = new CloudSyncLoggerService();

