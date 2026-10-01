import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Terminal } from 'lucide-react';
import { triggerIngestion, fetchIngestStatus, IngestionJob } from '../lib/api';

interface IngestControlProps {
  selectedDate?: string;
  onIngestComplete: () => void;
}

export const IngestControl: React.FC<IngestControlProps> = ({ selectedDate, onIngestComplete }) => {
  const [loading, setLoading] = useState(false);
  const [jobInfo, setJobInfo] = useState<IngestionJob | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    setJobInfo(null);

    const triggerRes = await triggerIngestion(selectedDate);
    if (!triggerRes) {
      alert('Failed to trigger ingestion pipeline. Ensure backend is running.');
      setLoading(false);
      return;
    }

    const jobId = triggerRes.jobId;

    // Poll status every 2 seconds
    const interval = setInterval(async () => {
      const statusData = await fetchIngestStatus(jobId);
      if (statusData) {
        setJobInfo(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
          setLoading(false);
          if (statusData.status === 'completed') {
            onIngestComplete();
          }
        }
      }
    }, 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 mb-8 border border-teal-500/20 bg-gradient-to-r from-gray-900/90 via-slate-900/80 to-teal-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Live Data Ingestion Pipeline</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedDate
                ? `Scrape real-time RSS feeds & index TF-IDF topic clusters specifically for ${selectedDate}`
                : 'Scrape real-time RSS feeds from BBC, NPR, Al Jazeera & run TF-IDF topic clustering'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {jobInfo && jobInfo.logs && jobInfo.logs.length > 0 && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-gray-800/80 border border-gray-700/60 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              {showLogs ? 'Hide Logs' : 'View Pipeline Logs'}
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${
              loading
                ? 'bg-teal-950/60 text-teal-300 border border-teal-700/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 text-white shadow-teal-600/30 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingesting & Clustering...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {selectedDate ? `Extract & Cluster (${selectedDate})` : 'Refresh Data'}
              </>
            )}
          </button>
        </div>

      </div>

      {/* Progress Status Bar */}
      {jobInfo && (
        <div className="mt-4 pt-4 border-t border-gray-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {jobInfo.status === 'running' && (
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subprocess running...
                </span>
              )}
              {jobInfo.status === 'completed' && (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline completed! ({jobInfo.articles_fetched} articles, {jobInfo.clusters_created} clusters)
                </span>
              )}
              {jobInfo.status === 'failed' && (
                <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Pipeline error: {jobInfo.error_message}
                </span>
              )}
            </div>
            <span className="text-gray-500">Job ID: {jobInfo.id}</span>
          </div>

          {/* Pipeline Log Drawer */}
          {showLogs && jobInfo.logs && (
            <div className="mt-2 p-3 rounded-xl bg-black/60 font-mono text-[11px] text-emerald-400 max-h-40 overflow-y-auto border border-emerald-950">
              {jobInfo.logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
