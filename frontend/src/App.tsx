import React, { useEffect, useState, useCallback } from 'react';
import { fetchTimeline, fetchClusterDetail, fetchSources, Cluster } from './lib/api';
import { Header } from './components/Header';
import { IngestControl } from './components/IngestControl';
import { SourceFilter } from './components/SourceFilter';
import { DateFilter } from './components/DateFilter';
import { StatsOverview } from './components/StatsOverview';
import { TimelineVisualization } from './components/TimelineVisualization';
import { ClusterDetailModal } from './components/ClusterDetailModal';

export default function App() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeCluster, setActiveCluster] = useState<Cluster | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  const [loading, setLoading] = useState(true);

  // Load timeline data from Node.js backend
  const loadData = useCallback(async () => {
    const [timelineRes, sourcesRes] = await Promise.all([
      fetchTimeline(selectedSources, selectedDate),
      fetchSources(),
    ]);

    setClusters(timelineRes);
    if (sources.length === 0 && sourcesRes.length > 0) {
      setSources(sourcesRes);
    }
    setLoading(false);
  }, [selectedSources, selectedDate, sources.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live auto-refresh polling (every 10s) - only when no date is selected
  useEffect(() => {
    if (!isAutoRefreshing || selectedDate) return;

    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAutoRefreshing, selectedDate, loadData]);

  // Source filter toggles
  const handleToggleSource = (sourceName: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceName)
        ? prev.filter((s) => s !== sourceName)
        : [...prev, sourceName]
    );
  };

  const handleClearSources = () => {
    setSelectedSources([]);
  };

  // Open cluster detail drilldown modal
  const handleSelectCluster = async (clusterId: string) => {
    const detail = await fetchClusterDetail(clusterId, selectedSources, selectedDate);
    if (detail) {
      setActiveCluster(detail);
    }
  };

  const totalArticles = clusters.reduce((acc, c) => acc + c.article_count, 0);

  return (
    <div className="min-h-screen pb-16">
      
      {/* Header */}
      <Header
        totalClusters={clusters.length}
        totalArticles={totalArticles}
        isAutoRefreshing={isAutoRefreshing}
        onToggleAutoRefresh={() => setIsAutoRefreshing(!isAutoRefreshing)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8">
        
        {/* Python Ingestion Subprocess Trigger Control */}
        <IngestControl selectedDate={selectedDate} onIngestComplete={loadData} />

        {/* Calendar Date Filter Picker */}
        <DateFilter
          selectedDate={selectedDate}
          onDateChange={(d) => setSelectedDate(d)}
          onClearDate={() => setSelectedDate('')}
        />

        {/* Source Filter Chips */}
        <SourceFilter
          sources={sources}
          selectedSources={selectedSources}
          onToggleSource={handleToggleSource}
          onClearAll={handleClearSources}
        />

        {/* KPI Stats Overview */}
        <StatsOverview clusters={clusters} totalSources={sources.length} />

        {/* Main Timeline Visualization */}
        {loading ? (
          <div className="glass-panel rounded-2xl p-16 text-center my-8">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-medium">Loading news timeline & topic clusters...</p>
          </div>
        ) : (
          <TimelineVisualization
            clusters={clusters}
            selectedSources={selectedSources}
            selectedDate={selectedDate}
            onSelectCluster={handleSelectCluster}
          />
        )}

      </main>

      {/* Cluster Explorer Drawer Modal */}
      <ClusterDetailModal
        cluster={activeCluster}
        onClose={() => setActiveCluster(null)}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-8 mt-16 text-center text-xs text-gray-500 border-t border-gray-800/80 pt-8">
        <span>News Pulse Assessment — Engineered with React.js, Express & Python TF-IDF</span>
      </footer>

    </div>
  );
}
