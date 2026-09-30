import React from 'react';
import { Filter, Check, Layers } from 'lucide-react';

interface SourceFilterProps {
  sources: string[];
  selectedSources: string[];
  onToggleSource: (source: string) => void;
  onClearAll: () => void;
}

export const SourceFilter: React.FC<SourceFilterProps> = ({
  sources,
  selectedSources,
  onToggleSource,
  onClearAll,
}) => {
  const isAllSelected = selectedSources.length === 0;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Filter className="w-4 h-4 text-teal-400" />
          <span>Filter by News Outlet</span>
        </div>
        
        {selectedSources.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
          >
            Reset Filters ({selectedSources.length} selected)
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onClearAll}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            isAllSelected
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'bg-gray-800/80 text-gray-400 border border-gray-700/60 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          All Sources
        </button>

        {sources.map((src) => {
          const isSelected = selectedSources.includes(src);
          return (
            <button
              key={src}
              onClick={() => onToggleSource(src)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                isSelected
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-teal-400" />}
              {src}
            </button>
          );
        })}
      </div>
    </div>
  );
};
