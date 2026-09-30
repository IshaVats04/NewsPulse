'use client';

import React from 'react';
import { Layers, Newspaper, Radio, Clock } from 'lucide-react';
import { Cluster } from '@/lib/api';

interface StatsOverviewProps {
  clusters: Cluster[];
  totalSources: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ clusters, totalSources }) => {
  const totalArticles = clusters.reduce((acc, c) => acc + c.article_count, 0);

  let earliestTime = 'N/A';
  let latestTime = 'N/A';

  if (clusters.length > 0) {
    const times = clusters
      .flatMap((c) => [new Date(c.start_time).getTime(), new Date(c.end_time).getTime()])
      .filter((t) => !isNaN(t));

    if (times.length > 0) {
      const min = Math.min(...times);
      const max = Math.max(...times);
      earliestTime = new Date(min).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      latestTime = new Date(max).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      
      <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-gray-400 block font-medium">Topic Clusters</span>
          <strong className="text-xl font-bold text-white">{clusters.length}</strong>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
          <Newspaper className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-gray-400 block font-medium">Total Articles</span>
          <strong className="text-xl font-bold text-white">{totalArticles}</strong>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
          <Radio className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-gray-400 block font-medium">News Outlets</span>
          <strong className="text-xl font-bold text-white">{totalSources}</strong>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-gray-400 block font-medium">Time Horizon</span>
          <strong className="text-xs font-bold text-gray-200 block mt-0.5">
            {earliestTime} – {latestTime}
          </strong>
        </div>
      </div>

    </div>
  );
};
