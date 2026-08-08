import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

interface ShareGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionName: string;
  publicUrl: string;
  children: React.ReactNode;
}

export const ShareGraphicModal: React.FC<ShareGraphicModalProps> = ({
  isOpen,
  onClose,
  competitionName,
  publicUrl,
  children,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const capture = async () => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
  };

  const download = async () => {
    setBusy(true);
    setMessage('');
    try {
      const dataUrl = await capture();
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${competitionName.replace(/\s+/g, '-').toLowerCase()}-share.png`;
      a.click();
      setMessage('Downloaded PNG');
    } catch {
      setMessage('Failed to generate image');
    } finally {
      setBusy(false);
    }
  };

  const copyImage = async () => {
    setBusy(true);
    setMessage('');
    try {
      const dataUrl = await capture();
      if (!dataUrl) return;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setMessage('Image copied to clipboard');
    } catch {
      setMessage('Copy not supported — use Download instead');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    const text = `Check ${competitionName}: ${publicUrl}`;
    await navigator.clipboard.writeText(text);
    setMessage('Link copied for WhatsApp');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Share Graphic</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-xs font-bold">
            Close
          </button>
        </div>

        <div className="p-4 flex justify-center overflow-x-auto bg-slate-100">
          <div ref={cardRef}>{children}</div>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          {message && <p className="text-xs text-emerald-700 font-medium">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={download}
              disabled={busy}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded disabled:opacity-50"
            >
              Download PNG
            </button>
            <button
              onClick={copyImage}
              disabled={busy}
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-xs font-bold rounded disabled:opacity-50"
            >
              Copy Image
            </button>
            <button
              onClick={copyLink}
              className="px-3 py-1.5 bg-emerald-800 text-white text-xs font-bold rounded"
            >
              Copy WhatsApp Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ShareButton: React.FC<{ onClick: () => void; className?: string }> = ({
  onClick,
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline ${className}`}
    title="Share graphic"
  >
    Share
  </button>
);
