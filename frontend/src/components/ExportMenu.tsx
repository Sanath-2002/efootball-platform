import React, { useState } from 'react';
import { api } from '../services/api';

type DataReportType = 'fixtures' | 'standings' | 'rosters' | 'results' | 'player-stats';
type GraphicReportType =
  | 'cover'
  | 'summary'
  | 'standings'
  | 'fixtures'
  | 'bracket'
  | 'match-result'
  | 'round-summary'
  | 'champion'
  | 'team-stats'
  | 'tournament-stats';

type GraphicFormat = 'pdf' | 'png' | 'jpeg';
type DataFormat = 'csv' | 'xlsx';
type ThemeId = 'efootball_yellow' | 'ucl_blue' | 'premier_purple' | 'laliga_dark' | 'custom';
type SizePreset =
  | 'a4'
  | 'a3'
  | 'social_1080x1350'
  | 'story_1080x1920'
  | 'hd_1920x1080'
  | 'uhd_4k';

interface ExportMenuProps {
  competitionId: string;
  matches?: Array<{ id: string; round: number; matchNumber: number; label: string }>;
}

const GRAPHICS: { type: GraphicReportType; label: string; needsMatch?: boolean; needsRound?: boolean }[] = [
  { type: 'cover', label: 'Tournament Cover' },
  { type: 'summary', label: 'Tournament Summary' },
  { type: 'standings', label: 'League Standings' },
  { type: 'fixtures', label: 'Match Fixtures' },
  { type: 'bracket', label: 'Knockout Bracket' },
  { type: 'match-result', label: 'Match Result Card', needsMatch: true },
  { type: 'round-summary', label: 'Round Summary', needsRound: true },
  { type: 'champion', label: 'Champion Poster' },
  { type: 'team-stats', label: 'Team Statistics' },
  { type: 'tournament-stats', label: 'Tournament Statistics' },
];

const DATA_REPORTS: { type: DataReportType; label: string; formats: DataFormat[] }[] = [
  { type: 'fixtures', label: 'Fixtures (data)', formats: ['csv', 'xlsx'] },
  { type: 'standings', label: 'Standings (data)', formats: ['csv', 'xlsx'] },
  { type: 'rosters', label: 'Team Rosters', formats: ['csv', 'xlsx'] },
  { type: 'results', label: 'Match Results', formats: ['csv', 'xlsx'] },
  { type: 'player-stats', label: 'Player Statistics', formats: ['csv', 'xlsx'] },
];

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'efootball_yellow', label: 'eFootball Yellow' },
  { id: 'ucl_blue', label: 'Champions League Blue' },
  { id: 'premier_purple', label: 'Premier League Purple' },
  { id: 'laliga_dark', label: 'La Liga Dark' },
  { id: 'custom', label: 'Custom Brand' },
];

const SIZES: { id: SizePreset; label: string }[] = [
  { id: 'a4', label: 'A4 Print' },
  { id: 'a3', label: 'A3 Print' },
  { id: 'social_1080x1350', label: '1080×1350 Social' },
  { id: 'story_1080x1920', label: '1080×1920 Story' },
  { id: 'hd_1920x1080', label: '1920×1080 HD' },
  { id: 'uhd_4k', label: '4K' },
];

export const ExportMenu: React.FC<ExportMenuProps> = ({ competitionId, matches = [] }) => {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>('efootball_yellow');
  const [size, setSize] = useState<SizePreset>('a4');
  const [matchId, setMatchId] = useState('');
  const [round, setRound] = useState('1');
  const [graphicFormat, setGraphicFormat] = useState<GraphicFormat>('png');

  const download = async (
    reportType: string,
    format: string,
    extra?: { matchId?: string; round?: number }
  ) => {
    const key = `${reportType}-${format}`;
    setDownloading(key);
    try {
      const res = await api.get(`/competitions/${competitionId}/export/${reportType}`, {
        params: {
          format,
          theme,
          size,
          ...(extra?.matchId && { matchId: extra.matchId }),
          ...(extra?.round != null && { round: extra.round }),
        },
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] as string | undefined;
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `${reportType}.${format}`;
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Blob } };
      if (e.response?.data instanceof Blob) {
        const text = await e.response.data.text();
        try {
          const json = JSON.parse(text);
          alert(json.error || 'Export failed');
        } catch {
          alert('Export failed');
        }
      } else {
        alert('Export failed');
      }
    } finally {
      setDownloading(null);
    }
  };

  const downloadGraphic = (g: (typeof GRAPHICS)[0]) => {
    if (g.needsMatch && !matchId) {
      alert('Select a match for Match Result export');
      return;
    }
    if (g.needsRound && !round) {
      alert('Enter a round number');
      return;
    }
    download(g.type, graphicFormat, {
      matchId: g.needsMatch ? matchId : undefined,
      round: g.needsRound ? parseInt(round, 10) : undefined,
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded text-xs hover:bg-slate-200"
      >
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 max-h-[85vh] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-3 px-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Graphics settings</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-[10px]">
                Theme
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeId)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-1 py-1"
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px]">
                Size
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as SizePreset)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-1 py-1"
                >
                  {SIZES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-[10px] block mb-3">
              Graphic format
              <select
                value={graphicFormat}
                onChange={(e) => setGraphicFormat(e.target.value as GraphicFormat)}
                className="w-full mt-0.5 text-xs border border-slate-200 rounded px-1 py-1"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="pdf">PDF</option>
              </select>
            </label>

            {matches.length > 0 && (
              <label className="text-[10px] block mb-2">
                Match (for result card)
                <select
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-1 py-1"
                >
                  <option value="">Select match</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-[10px] block mb-3">
              Round (for round summary)
              <input
                type="number"
                min={1}
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full mt-0.5 text-xs border border-slate-200 rounded px-1 py-1"
              />
            </label>

            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-t border-slate-100 pt-2">
              Broadcast graphics
            </p>
            <div className="space-y-1 mb-3">
              {GRAPHICS.map((g) => {
                const key = `${g.type}-${graphicFormat}`;
                return (
                  <button
                    key={g.type}
                    disabled={downloading === key}
                    onClick={() => downloadGraphic(g)}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium rounded hover:bg-slate-100 disabled:opacity-50 flex justify-between"
                  >
                    <span>{g.label}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{graphicFormat}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-t border-slate-100 pt-2">
              Data exports
            </p>
            {DATA_REPORTS.map((report) => (
              <div key={report.type} className="py-1.5 border-b border-slate-50 last:border-0">
                <p className="text-[10px] font-bold text-slate-600 mb-1">{report.label}</p>
                <div className="flex gap-1">
                  {report.formats.map((format) => {
                    const key = `${report.type}-${format}`;
                    return (
                      <button
                        key={key}
                        disabled={downloading === key}
                        onClick={() => download(report.type, format)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
                      >
                        {downloading === key ? '...' : format}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
