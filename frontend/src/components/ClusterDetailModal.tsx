import React, { useState } from 'react';
import { Cluster, Article } from '../lib/api';
import { X, ExternalLink, Calendar, Newspaper, ChevronDown, ChevronUp, Sparkles, BookOpen } from 'lucide-react';

interface ClusterDetailModalProps {
  cluster: Cluster | null;
  onClose: () => void;
}

export const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({ cluster, onClose }) => {
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  if (!cluster) return null;

  const toggleExpand = (id: string) => {
    setExpandedArticleId(expandedArticleId === id ? null : id);
  };

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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Safely normalize keywords whether string or array
  const keywordsList: string[] = Array.isArray(cluster.keywords)
    ? cluster.keywords
    : typeof cluster.keywords === 'string'
    ? (cluster.keywords as string).split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  const articlesList: Article[] = Array.isArray(cluster.articles) ? cluster.articles : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl glass-panel border border-teal-500/30 shadow-2xl overflow-hidden bg-slate-950">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800 bg-slate-900/80">
          <div className="pr-8">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {articlesList.length > 0 ? articlesList.length : cluster.article_count} Articles
              </span>
              {keywordsList.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Key Terms: {keywordsList.join(', ')}</span>
                </div>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {cluster.label}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Article List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-teal-400" />
            Grouped Articles (Chronological Order)
          </h3>

          {articlesList.length > 0 ? (
            articlesList.map((art: Article) => {
              const isExpanded = expandedArticleId === art.id;

              return (
                <div
                  key={art.id}
                  className="rounded-2xl bg-slate-900/60 border border-gray-800 p-5 hover:border-teal-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 text-teal-400 border border-gray-700">
                        {art.source}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        {formatDate(art.published_at)}
                      </span>
                    </div>

                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors self-start sm:self-auto"
                    >
                      <span>Original Source</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <h4 className="text-base font-bold text-gray-100 hover:text-teal-400 transition-colors mb-2">
                    <a href={art.url} target="_blank" rel="noopener noreferrer">
                      {art.title}
                    </a>
                  </h4>

                  {art.summary && (
                    <p className="text-sm text-gray-300 leading-relaxed mb-3">
                      {art.summary}
                    </p>
                  )}

                  {/* Full extracted text accordion */}
                  {art.content && (
                    <div className="mt-3 pt-3 border-t border-gray-800/80">
                      <button
                        onClick={() => toggleExpand(art.id)}
                        className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-medium"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {isExpanded ? 'Hide Extracted Article Body' : 'Read Full Extracted Article Body'}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-xl bg-gray-950/80 text-xs text-gray-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto border border-gray-800">
                          {art.content}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No detailed article records available for this cluster.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-slate-900/60 flex items-center justify-between text-xs text-gray-400">
          <span>Cluster ID: {cluster.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            Close Explorer
          </button>
        </div>

      </div>
    </div>
  );
};
