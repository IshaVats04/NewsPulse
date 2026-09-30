import React from 'react';
import { Newspaper, Radio, Sparkles } from 'lucide-react';

interface HeaderProps {
  totalClusters: number;
  totalArticles: number;
  isAutoRefreshing: boolean;
  onToggleAutoRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalClusters,
  totalArticles,
  isAutoRefreshing,
  onToggleAutoRefresh,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800/80 px-4 sm:px-8 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 shadow-lg shadow-teal-500/20">
            <Newspaper className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-100 to-teal-400 bg-clip-text text-transparent">
                News Pulse
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Pure React + TF-IDF
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time topic-clustered timeline of global news stories
            </p>
          </div>
        </div>

        {/* Live Controls & Auto-refresh */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isAutoRefreshing
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:text-gray-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isAutoRefreshing ? 'animate-pulse text-emerald-400' : ''}`} />
            {isAutoRefreshing ? 'Live Polling Active' : 'Auto-refresh Off'}
          </button>

          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400 border-l border-gray-800 pl-4">
            <div>
              <span className="text-gray-500">Clusters:</span>{' '}
              <strong className="text-white font-semibold">{totalClusters}</strong>
            </div>
            <div>
              <span className="text-gray-500">Articles:</span>{' '}
              <strong className="text-teal-400 font-semibold">{totalArticles}</strong>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};
