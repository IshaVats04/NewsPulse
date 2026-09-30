import React, { useMemo } from 'react';
import { Cluster } from '../lib/api';
import { Calendar, Clock, Layers, Sparkles, Flame, ExternalLink } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface TimelineVisualizationProps {
  clusters: Cluster[];
  selectedSources?: string[];
  selectedDate?: string;
  onSelectCluster: (clusterId: string) => void;
}

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  clusters,
  selectedSources = [],
  selectedDate = '',
  onSelectCluster,
}) => {
  // Sort clusters chronologically by start_time
  const sortedClusters = useMemo(() => {
    return [...clusters].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [clusters]);

  const formatDate = (isoString: string) => {
    try {
      const dt = new Date(isoString);
      if (isNaN(dt.getTime())) return isoString;

      const now = new Date();
      const isToday = dt.toDateString() === now.toDateString();

      if (isToday) {
        return `Today at ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      return dt.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Chart data for area timeline trend
  const chartData = useMemo(() => {
    return sortedClusters.map((c) => ({
      time: formatDate(c.start_time),
      cluster: c.label.length > 25 ? c.label.substring(0, 25) + '...' : c.label,
      articles: c.article_count,
      intensity: c.intensity,
    }));
  }, [sortedClusters]);

  if (sortedClusters.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center my-8 border border-gray-800">
        <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-bounce" />
        <h3 className="text-lg font-bold text-gray-300">No clusters match selected filters</h3>
        <p className="text-sm text-gray-500 mt-1">
          {selectedDate || selectedSources.length > 0
            ? `No articles found matching ${selectedDate ? `date ${selectedDate}` : ''} ${selectedSources.length > 0 ? `sources (${selectedSources.join(', ')})` : ''}. Try selecting another date or resetting filters.`
            : 'Click "Refresh Data" to ingest new real-time articles from RSS feeds.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-12">
      {/* 1. Macro Article Intensity Trend Area Chart */}
      <div className="glass-panel rounded-2xl p-5 border border-teal-500/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Story Density & Cluster Coverage Intensity Over Time</span>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {sortedClusters.length} Topic Clusters Plotted
          </span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="articles"
                stroke="#14b8a6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIntensity)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Visual Timeline Block Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            Interactive Topic Clusters Timeline
          </h2>
          <span className="text-xs text-gray-400">Click any cluster for full article drilldown</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {sortedClusters.map((cluster) => {
            const isLarge = cluster.article_count >= 2 || (cluster.sources && cluster.sources.length >= 2);

            const keywordsList: string[] = Array.isArray(cluster.keywords)
              ? cluster.keywords
              : typeof cluster.keywords === 'string'
              ? (cluster.keywords as string).split(',').map((k) => k.trim()).filter(Boolean)
              : [];

            const sourcesList: string[] = Array.isArray(cluster.sources) ? cluster.sources : [];

            return (
              <div
                key={cluster.id}
                onClick={() => onSelectCluster(cluster.id)}
                className={`glass-panel glass-panel-hover rounded-2xl p-5 cursor-pointer relative overflow-hidden transition-all group ${
                  isLarge ? 'border-teal-500/30 bg-slate-900/90' : ''
                }`}
              >
                {/* Left accent marker bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                    isLarge ? 'bg-gradient-to-b from-teal-500 to-cyan-400' : 'bg-gray-700 group-hover:bg-teal-500'
                  }`}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">
                  
                  {/* Cluster Information */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        {cluster.article_count} {cluster.article_count === 1 ? 'Article' : 'Articles'}
                      </span>

                      {sourcesList.map((src) => (
                        <span
                          key={src}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-800/80 text-gray-300 border border-gray-700/60"
                        >
                          {src}
                        </span>
                      ))}

                      {cluster.intensity > 2 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Trending
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-gray-100 group-hover:text-teal-400 transition-colors line-clamp-1">
                      {cluster.label}
                    </h3>

                    {/* Keywords */}
                    {keywordsList.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        {keywordsList.map((kw, i) => (
                          <span key={i} className="text-xs text-gray-400 font-mono bg-gray-900/60 px-2 py-0.5 rounded border border-gray-800">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time Window Span */}
                  <div className="flex flex-col md:items-end justify-center text-xs text-gray-400 border-t md:border-t-0 md:border-l border-gray-800/80 pt-2 md:pt-0 md:pl-6 shrink-0">
                    <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span>{formatDate(cluster.start_time)}</span>
                    </div>
                    {cluster.start_time !== cluster.end_time && (
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Active until {formatDate(cluster.end_time)}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Explore Articles</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
