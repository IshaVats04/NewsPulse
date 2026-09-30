import React from 'react';
import { Calendar as CalendarIcon, Clock, X, Sparkles } from 'lucide-react';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onClearDate: () => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  selectedDate,
  onDateChange,
  onClearDate,
}) => {
  // Format today's YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <CalendarIcon className="w-4 h-4 text-teal-400" />
          <span>Filter by Article Publication Date</span>
        </div>

        {selectedDate && (
          <button
            onClick={onClearDate}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Clear Date Filter
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* HTML5 Calendar Date Picker */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-gray-900/90 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-gray-700/80 focus:border-teal-500 focus:outline-none transition-all shadow-inner cursor-pointer"
          />
        </div>

        {/* Quick Date Presets */}
        <button
          onClick={() => onDateChange(todayStr)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
            selectedDate === todayStr
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
              : 'bg-gray-800/60 text-gray-400 border-gray-700/50 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          Today ({todayStr})
        </button>

        <button
          onClick={onClearDate}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            !selectedDate
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
              : 'bg-gray-800/80 text-gray-400 border border-gray-700/60 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          All Dates
        </button>

        {selectedDate && (
          <span className="text-xs text-teal-300 font-medium bg-teal-500/10 px-3 py-1.5 rounded-xl border border-teal-500/20">
            Showing articles for <strong>{selectedDate}</strong>
          </span>
        )}
      </div>
    </div>
  );
};
