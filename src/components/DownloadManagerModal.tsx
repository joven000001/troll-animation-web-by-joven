import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Trash2, 
  FileVideo, 
  Image as ImageIcon, 
  Smile, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Sparkles,
  Smartphone,
  Monitor
} from 'lucide-react';
import { DownloadFormat, DownloadQuality, DownloadTask, MediaItem } from '../types/media';
import { downloadManager } from '../services/downloadManager';

interface DownloadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultItems: MediaItem[];
}

export const DownloadManagerModal: React.FC<DownloadManagerModalProps> = ({
  isOpen,
  onClose,
  vaultItems,
}) => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>('MP4');
  const [selectedQuality, setSelectedQuality] = useState<DownloadQuality>('original');
  const [batchCategory, setBatchCategory] = useState<'all' | 'video' | 'photo' | 'emoji'>('all');

  useEffect(() => {
    return downloadManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
    });
  }, []);

  if (!isOpen) return null;

  const handleStartBatchDownload = () => {
    let itemsToDownload = vaultItems;
    if (batchCategory !== 'all') {
      itemsToDownload = vaultItems.filter((i) => i.type === batchCategory);
    }
    if (itemsToDownload.length === 0) return;

    downloadManager.batchDownload(itemsToDownload, selectedFormat, selectedQuality);
  };

  const activeTasks = tasks.filter((t) => t.status === 'downloading' || t.status === 'queued');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-[#1c1814] border border-[#44382c] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] celluloid-border">
        
        {/* Traditional Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#382f25] bg-[#15120f] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-black/50 border border-amber-400/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#fbf7ee] font-serif">Vault Download Manager</h3>
                {activeTasks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    {activeTasks.length} active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#a89b8c]">Fast PC & Mobile multi-format export pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg sm:rounded-xl text-[#a89b8c] hover:text-[#fbf7ee] hover:bg-[#251f1a] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Quick Batch Download Panel */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#15120f] border border-[#382f25] space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#fbf7ee] font-serif uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Batch Export Vault Content
              </h4>
              <span className="text-[10px] sm:text-[11px] text-[#8e8071]">
                {vaultItems.length} total in vault
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {/* Category Filter */}
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Items to Download</label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#1a1613] border border-[#382f25] rounded-xl text-xs text-[#ede8df] focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Vault Media ({vaultItems.length})</option>
                  <option value="video">Videos Only ({vaultItems.filter(i => i.type === 'video').length})</option>
                  <option value="photo">Photos Only ({vaultItems.filter(i => i.type === 'photo').length})</option>
                  <option value="emoji">Emojis Only ({vaultItems.filter(i => i.type === 'emoji').length})</option>
                </select>
              </div>

              {/* Format Target */}
              <div>
                <label className="text-[11px] font-medium text-[#a89b8c] block mb-1">Target Format</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as DownloadFormat)}
                  className="w-full px-3 py-2 bg-[#1a1613] border border-[#382f25] rounded-xl text-xs text-[#ede8df] focus:outline-none focus:border-amber-500"
                >
                  <optgroup label="Video Formats">
                    <option value="MP4">MP4 (Universal Video)</option>
                    <option value="WEBM">WebM (Fast Web)</option>
                    <option value="GIF">Animated GIF</option>
                  </optgroup>
                  <optgroup label="Image & Sticker Formats">
                    <option value="PNG">PNG (High-Res Sticker/Photo)</option>
                    <option value="JPG">JPG (Standard Photo)</option>
                    <option value="WEBP">WebP (Compressed)</option>
                    <option value="SVG">SVG (Vector Emoji)</option>
                    <option value="UNICODE">Raw Unicode Text</option>
                  </optgroup>
                </select>
              </div>

              {/* Quality Preset */}
              <div>
                <label className="text-[11px] font-medium text-[#a89b8c] block mb-1">Quality Preset</label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value as DownloadQuality)}
                  className="w-full px-3 py-2 bg-[#1a1613] border border-[#382f25] rounded-xl text-xs text-[#ede8df] focus:outline-none focus:border-amber-500"
                >
                  <option value="original">Original Master Quality</option>
                  <option value="1080p">1080p Social Ready</option>
                  <option value="720p">720p Mobile-Optimized</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleStartBatchDownload}
              disabled={vaultItems.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-black/40 border border-amber-500/40 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Selected Batch to Device</span>
            </button>
          </div>

          {/* Active Tasks Queue */}
          {activeTasks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                Active Downloads ({activeTasks.length})
              </h4>
              <div className="space-y-2">
                {activeTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-sm">
                        {t.type === 'video' ? (
                          <FileVideo className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : t.type === 'photo' ? (
                          <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <Smile className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="font-semibold text-white truncate">{t.title}</span>
                        <span className="text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800">
                          {t.format}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-400 text-[11px]">{t.speed}</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-150"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download History / Completed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Download History ({tasks.length})
              </h4>
              {tasks.length > 0 && (
                <button
                  onClick={() => downloadManager.clearHistory()}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear History
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-zinc-950/40 border border-zinc-800/80 text-zinc-500 text-xs">
                No recent downloads. Tap Download on any video, photo, or emoji to begin.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3 truncate max-w-sm">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : task.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-xs font-semibold text-zinc-200 truncate">
                          {task.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span>{task.format}</span>
                          <span>·</span>
                          <span>{task.quality}</span>
                          <span>·</span>
                          <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        task.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : task.status === 'downloading'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => downloadManager.removeTask(task.id)}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300"
                        title="Remove from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device storage helper info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
              <Monitor className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Desktop (PC/Mac):</strong> Files are saved directly to your browser's default Downloads folder in master quality.
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Mobile (Android/iOS):</strong> Tap Save to Camera Roll or Files when your browser prompt appears.
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
          >
            Close Manager
          </button>
        </div>

      </div>
    </div>
  );
};
