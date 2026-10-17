import React, { useRef, useState } from 'react';
import { UnifiedModal } from '../ui/UnifiedModal';
import { ActionButton } from '../ui/ActionButton';
import { BaseInput } from '../ui/BaseInput';

export type CardImportSection = 'worldbook' | 'regex' | 'qr';
export interface CardRegexDraft { index: number; scriptName: string; findRegex: string; replaceString: string }
interface Props {
  section: CardImportSection | null;
  onCloseSection: () => void;
  importMode: 'single' | 'all';
  onImportMode: (mode: 'single' | 'all') => void;
  onImportFile: (file: File, section: CardImportSection, mode: 'single' | 'all') => Promise<boolean | undefined>;
  regex: CardRegexDraft | null;
  onRegexChange: (value: CardRegexDraft) => void;
  onSaveRegex: () => void;
  onCloseRegex: () => void;
  qr: { index: number; item: any } | null;
  onSaveQr: (item: any) => void;
  onCloseQr: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}
export function CardActionModals(props: Props) {
  return <>
    {props.section && <CardSectionImport key={props.section} {...props} section={props.section} />}
    <UnifiedModal isOpen={!!props.regex} onClose={props.onCloseRegex} title="编辑角色卡正则" footer={<><ActionButton action="cancel" onClick={props.onCloseRegex}>取消</ActionButton><ActionButton action="save" onClick={props.onSaveRegex}>保存正则</ActionButton></>}>
      {props.regex && <div className="space-y-3">
        <label className="block text-xs">名称<BaseInput aria-label="正则名称" value={props.regex.scriptName} onChange={event => props.onRegexChange({ ...props.regex!, scriptName: event.target.value })} /></label>
        <label className="block text-xs">查找正则<textarea aria-label="查找正则" className="w-full p-2 border bg-transparent font-mono text-xs" rows={4} value={props.regex.findRegex} onChange={event => props.onRegexChange({ ...props.regex!, findRegex: event.target.value })} /></label>
        <label className="block text-xs">替换内容<textarea aria-label="替换内容" className="w-full p-2 border bg-transparent font-mono text-xs" rows={4} value={props.regex.replaceString} onChange={event => props.onRegexChange({ ...props.regex!, replaceString: event.target.value })} /></label>
      </div>}
    </UnifiedModal>
    {props.qr && <QrItemEditor key={props.qr.index} item={props.qr.item} onSave={props.onSaveQr} onClose={props.onCloseQr} showToast={props.showToast} />}
  </>;
}
function CardSectionImport(props: Props & { section: CardImportSection }) {
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [ack, setAck] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const name = { worldbook: '世界书', regex: '正则', qr: 'QR' }[props.section];
  const importFile = async () => {
    if (!file || busy || props.importMode === 'all' && !ack) return;
    setBusy(true);
    try { if (await props.onImportFile(file, props.section, props.importMode)) props.onCloseSection(); }
    catch (error: any) { props.showToast(error.message || '文件读取失败', 'error'); }
    finally { setBusy(false); }
  };
  return <UnifiedModal isOpen onClose={() => { if (!busy) props.onCloseSection(); }} title={`导入角色卡${name}`} closeOnBackdrop={!busy} footer={<><ActionButton action="cancel" disabled={busy} onClick={props.onCloseSection}>取消</ActionButton><ActionButton action="import" disabled={!file || busy || props.importMode === 'all' && !ack} onClick={() => void importFile()}>{busy ? '正在导入…' : '确认导入'}</ActionButton></>}>
    <div className="space-y-3 text-xs">
      <label className="flex gap-2 items-center">导入方式<select aria-label="角色卡导入方式" value={props.importMode} disabled={busy} className="p-2 border bg-transparent" onChange={event => { props.onImportMode(event.target.value as 'single' | 'all'); setAck(false); }}><option value="single">追加文件中的第一条</option><option value="all">覆盖当前全部内容</option></select></label>
      <ActionButton action="import" disabled={busy} onClick={() => input.current?.click()}>选择 JSON 文件</ActionButton>
      <input ref={input} aria-label={`选择${name} JSON 文件`} type="file" accept=".json,application/json" className="hidden" onChange={event => { setFile(event.target.files?.[0] || null); event.target.value = ''; }} />
      <p className="break-all">{file?.name || '尚未选择文件'}</p>
      {props.importMode === 'all' && <label className="flex gap-2 items-start border border-amber-500 p-3"><input type="checkbox" checked={ack} disabled={busy} onChange={event => setAck(event.target.checked)} /><span>我已了解会覆盖此角色卡当前的{name}内容，并确认继续。</span></label>}
    </div>
  </UnifiedModal>;
}
function QrItemEditor({ item, onSave, onClose, showToast }: { item: any; onSave: (value: any) => void; onClose: () => void; showToast: Props['showToast'] }) {
  const [text, setText] = useState(() => JSON.stringify(item, null, 2));
  const save = () => {
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.message !== 'string') throw Error('QR 需要一个包含 message 字符串的 JSON 对象');
      onSave(value);
    } catch (error: any) { showToast(error.message, 'error'); }
  };
  return <UnifiedModal isOpen onClose={onClose} title="编辑 QR" footer={<><ActionButton action="cancel" onClick={onClose}>取消</ActionButton><ActionButton action="save" onClick={save}>保存 QR</ActionButton></>}><textarea aria-label="QR 完整 JSON" className="w-full min-h-[45dvh] p-3 border bg-transparent font-mono text-xs" value={text} onChange={event => setText(event.target.value)} /></UnifiedModal>;
}
