import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  X,
  Check,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import { syncLogger } from '../../utils/cloudSyncLogger';

interface BaiduQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (accessToken: string) => void;
  onSwitchToWebAuth?: () => void;
  onGoToAdvanced?: () => void;
  appKey?: string;
  appSecret?: string;
}

export const BaiduQRCodeModal: React.FC<BaiduQRCodeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToWebAuth,
  onGoToAdvanced,
  appKey,
  appSecret,
}) => {
  const effectiveAppKey = appKey?.trim() || '';
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [userCode, setUserCode] = useState<string>('');
  const [verificationUrl, setVerificationUrl] = useState<string>('https://openapi.baidu.com/device');
  const [deviceCode, setDeviceCode] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(300);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error'>('idle');
  const [pollHint, setPollHint] = useState<string>('等待扫码中...');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  const fetchQRCode = async () => {
    // Clear previous timers
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    if (!effectiveAppKey) {
      setLoading(false);
      setStatus('idle');
      return;
    }

    setLoading(true);
    setStatus('waiting');
    setPollHint('等待扫码中...');
    setErrorMessage('');
    setQrCodeUrl('');
    setUserCode('');

    syncLogger.addLog({
      category: 'baidu',
      level: 'info',
      title: '申请百度网盘设备码与扫码登录二维码 (Device Flow)',
      requestDetails: { client_id: effectiveAppKey, has_secret: !!appSecret },
      diagnosis: '正在向 openapi.baidu.com/oauth/2.0/device/code 发起设备码请求...',
    });

    try {
      const response = await fetch(`/api/baidu-device-code?client_id=${encodeURIComponent(effectiveAppKey)}`);
      const data = await response.json();

      if (data.error === 'unconfigured_client' || data.error === 'invalid_client') {
        setLoading(false);
        setStatus('error');
        setErrorMessage(
          data.error === 'unconfigured_client'
            ? '尚未配置百度开放平台 AppKey。'
            : '此 AppKey 未在百度开放平台开通设备码流权限 (invalid_client)。'
        );
        return;
      }

      if (!response.ok || data.error) {
        const errDesc = data.error_description || data.error || data.message || '获取二维码失败';
        throw new Error(errDesc);
      }

      const qrcode = data.qrcode_url;
      const uCode = data.user_code;
      const dCode = data.device_code;
      const vUrl = data.verification_url || 'https://openapi.baidu.com/device';
      const duration = data.expires_in || 300;
      const intervalSec = Math.max(data.interval || 4, 3);

      setQrCodeUrl(qrcode);
      setUserCode(uCode);
      setDeviceCode(dCode);
      setVerificationUrl(vUrl);
      setExpiresIn(duration);
      setLoading(false);
      setStatus('waiting');

      syncLogger.addLog({
        category: 'baidu',
        level: 'success',
        title: '成功生成百度网盘扫码二维码',
        responseDetails: { user_code: uCode, expires_in: duration, interval: intervalSec },
        diagnosis: '二维码已就绪，正在启动后台授权轮询检测...',
      });

      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start polling for token
      startPolling(dCode, intervalSec, effectiveAppKey);
    } catch (err: any) {
      setLoading(false);
      setStatus('error');
      const msg = err.message || '网络连接异常，请检查后端代理';
      setErrorMessage(msg);
      syncLogger.addLog({
        category: 'baidu',
        level: 'error',
        title: '生成百度网盘设备码失败',
        error: msg,
        diagnosis: '请检查高级选项中的 AppKey 设置是否正确。',
      });
    }
  };

  // Check token once immediately
  const checkTokenOnce = async (code: string, activeKey: string) => {
    try {
      let pollUrl = `/api/baidu-poll-token?code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(activeKey)}`;
      if (appSecret) {
        pollUrl += `&client_secret=${encodeURIComponent(appSecret)}`;
      }

      const res = await fetch(pollUrl);
      const data = await res.json();

      if (data.access_token) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setStatus('success');
        setPollHint('授权成功！正在绑定账号...');

        syncLogger.addLog({
          category: 'baidu',
          level: 'success',
          title: '百度网盘扫码授权成功！已换取 Access Token',
          responseDetails: { expires_in: data.expires_in, scope: data.scope },
          diagnosis: '设备码已成功兑换为长期 Access Token，正在执行账号信息同步。',
        });

        setTimeout(() => {
          onSuccess(data.access_token);
          onClose();
        }, 1000);
        return true;
      }

      if (data.error) {
        if (data.error === 'authorization_pending') {
          setPollHint('手机端已打开，请在手机屏幕上点击【同意授权】');
        } else if (data.error === 'slow_down') {
          setPollHint('正在平稳同步手机端授权状态...');
        } else if (data.error === 'authorization_declined') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('error');
          setErrorMessage('手机端已拒绝授权');
        } else if (data.error === 'expired_token' || data.error === 'expired_code') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('expired');
        } else if (data.error === 'invalid_client') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('error');
          setErrorMessage('应用客户端校验失败：此 AppKey 在百度端需配置 AppSecret 或不支持设备码流。');
        }
      }
    } catch {
      // ignore jitter
    }
    return false;
  };

  // Poll for token
  const startPolling = (code: string, intervalSec: number, activeKey: string) => {
    let attempts = 0;
    const pollInterval = Math.max(intervalSec || 5, 5);
    const maxAttempts = Math.floor(300 / pollInterval);

    pollTimerRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollTimerRef.current);
        setStatus('expired');
        return;
      }

      const success = await checkTokenOnce(code, activeKey);
      if (!success) {
        setPollHint((prev) => {
          if (prev.includes('等待扫码')) {
            return `等待手机扫码中 (已检测${attempts}次)`;
          }
          if (prev.includes('同意授权')) {
            return prev;
          }
          return `检测手机授权中... (第${attempts}次)`;
        });
      }
    }, pollInterval * 1000);
  };

  useEffect(() => {
    if (isOpen) {
      if (effectiveAppKey) {
        fetchQRCode();
      } else {
        setStatus('idle');
      }
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, effectiveAppKey]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                百度网盘 App 扫码登录
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                使用百度网盘或百度 App 扫码安全授权
              </p>
            </div>
          </div>
          <span role="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0"><X className="w-4 h-4" /></span>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {!effectiveAppKey ? (
            /* Unconfigured AppKey: Guide directly to Advanced Settings */
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  未配置百度网盘应用 AppKey
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
                  百度网盘扫码登录需使用您在百度开放平台创建的应用 AppKey。请前往高级选项中填写配置。
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToAdvanced?.();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Settings2 className="w-4 h-4" />
                  前往高级选项配置
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium transition"
                >
                  暂不配置
                </button>
              </div>
            </div>
          ) : (
            /* QR Code Display */
            <div className="p-5 flex flex-col items-center text-center space-y-3.5">
              {status === 'error' ? (
                <div className="w-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 text-left space-y-3">
                  <div className="flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs">获取二维码失败</h4>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1 leading-relaxed">
                        {errorMessage || '当前 AppKey 可能无效或未开通设备流授权权限。'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onGoToAdvanced?.();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      前往高级选项修改 AppKey
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchQRCode()}
                      className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重试获取二维码
                    </button>
                  </div>

                  {onSwitchToWebAuth && (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSwitchToWebAuth();
                        }}
                        className="text-stone-600 dark:text-stone-300 hover:underline text-[11px] inline-flex items-center gap-1 font-medium"
                      >
                        切换至网页授权
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* QR Container */}
                  <div className="relative w-48 h-48 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white p-2.5 flex items-center justify-center shadow-inner">
                    {loading ? (
                      <div className="flex flex-col items-center gap-2 text-stone-400">
                        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="text-xs font-medium">正在生成安全二维码...</span>
                      </div>
                    ) : status === 'expired' ? (
                      <div className="absolute inset-0 bg-white/95 dark:bg-stone-900/95 rounded-2xl flex flex-col items-center justify-center p-3 gap-2">
                        <Clock className="w-8 h-8 text-amber-500" />
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          二维码已失效
                        </span>
                        <button
                          onClick={() => fetchQRCode()}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
                        >
                          刷新二维码
                        </button>
                      </div>
                    ) : status === 'success' ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-12 h-12 animate-bounce" />
                        <span className="text-sm font-bold">授权登录成功！</span>
                        <span className="text-xs text-stone-500">正在自动绑定网盘账号...</span>
                      </div>
                    ) : qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="百度网盘登录二维码"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-xs text-stone-400">准备就绪</div>
                    )}
                  </div>

                  {/* Status Instructions & Steps */}
                  {status !== 'success' && (
                    <div className="space-y-2.5 w-full">
                      {/* Step indicator */}
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 text-left text-xs text-stone-700 dark:text-stone-300 space-y-1">
                        <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          扫码操作步骤说明：
                        </div>
                        <div className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400 pl-5 list-decimal space-y-0.5">
                          <div>1. 打开<strong>百度网盘 App</strong> 或 <strong>百度 App</strong> 扫描上方二维码</div>
                          <div>2. 手机登录后，<strong>务必在手机页面点击【同意授权】</strong></div>
                          <div>3. 授权后本页面将自动完成绑定</div>
                        </div>
                      </div>

                      {/* Status & Countdown badge */}
                      <div className="flex items-center justify-between px-2 text-[11px]">
                        <span className="text-stone-500 font-medium truncate flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                          <span className="truncate">{pollHint}</span>
                        </span>
                        <span className="text-stone-400 font-mono shrink-0">
                          倒计时: {formatTime(expiresIn)}
                        </span>
                      </div>

                      {/* Fallback & Manual Trigger Actions */}
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => checkTokenOnce(deviceCode, effectiveAppKey)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition active:scale-98"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>手机端已点击【同意授权】，立即验证绑定</span>
                        </button>

                        {onSwitchToWebAuth && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSwitchToWebAuth();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-medium transition active:scale-98"
                          >
                            <span>若需要，转用【网页跳转授权】</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-stone-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            官方 OAuth2.0 设备安全认证
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium text-xs"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
