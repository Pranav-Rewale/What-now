import React from 'react';
import { CATEGORIES, TIME_OPTIONS } from '../utils/constants';
import { Flame, Clock } from 'lucide-react';

export default function FilterBar({ filters, onFiltersChange }) {
  const setFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-4 mb-2">
      {/* Header row: title + sort toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-black font-heading text-[#0A0A0A]">Ideas Feed</h2>

        {/* Sort Toggle */}
        <div className="flex border-2 border-[#0A0A0A] rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(10,10,10,1)]">
          <button
            onClick={() => setFilter('sort', 'popular')}
            data-testid="sort-popular-btn"
            className={`flex items-center gap-1.5 px-4 py-2 font-bold text-sm font-heading transition-all ${
              filters.sort === 'popular' ? 'bg-[#FACC15] text-[#0A0A0A]' : 'bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#FFFDF7]'
            }`}
          >
            <Flame className="w-4 h-4" strokeWidth={2.5} />
            Popular
          </button>
          <button
            onClick={() => setFilter('sort', 'newest')}
            data-testid="sort-newest-btn"
            className={`flex items-center gap-1.5 px-4 py-2 font-bold text-sm font-heading transition-all border-l-2 border-[#0A0A0A] ${
              filters.sort === 'newest' ? 'bg-[#FACC15] text-[#0A0A0A]' : 'bg-[#FFFFFF] text-[#0A0A0A] hover:bg-[#FFFDF7]'
            }`}
          >
            <Clock className="w-4 h-4" strokeWidth={2.5} />
            Newest
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div>
        <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 font-heading">Category</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('category', 'all')}
            data-testid="category-filter-all"
            className={`px-4 py-2 rounded-full font-bold text-sm border-2 border-[#0A0A0A] transition-all shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] font-heading ${
              filters.category === 'all'
                ? 'bg-[#0A0A0A] text-[#FFFFFF] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)]'
                : 'bg-[#FFFFFF] text-[#0A0A0A] hover:-translate-y-0.5'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter('category', cat.value)}
              data-testid={`category-filter-${cat.value}`}
              className={`px-4 py-2 rounded-full font-bold text-sm border-2 border-[#0A0A0A] transition-all font-heading ${
                filters.category === cat.value
                  ? 'shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] -translate-y-0.5'
                  : 'bg-[#FFFFFF] text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5'
              }`}
              style={{ backgroundColor: filters.category === cat.value ? cat.bg : '#FFFFFF' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Filters */}
      <div>
        <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2 font-heading">Time Needed</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('timeNeeded', 'all')}
            data-testid="time-filter-all"
            className={`px-4 py-2 rounded-full font-bold text-sm border-2 border-[#0A0A0A] transition-all font-heading shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] ${
              filters.timeNeeded === 'all'
                ? 'bg-[#0A0A0A] text-[#FFFFFF] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)]'
                : 'bg-[#FFFFFF] text-[#0A0A0A] hover:-translate-y-0.5'
            }`}
          >
            All
          </button>
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              onClick={() => setFilter('timeNeeded', time)}
              data-testid={`time-filter-${time.replace(/\s/g, '-')}`}
              className={`px-4 py-2 rounded-full font-bold text-sm border-2 border-[#0A0A0A] transition-all font-heading flex items-center gap-1 ${
                filters.timeNeeded === time
                  ? 'bg-[#0A0A0A] text-[#FFFFFF] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] -translate-y-0.5'
                  : 'bg-[#FFFFFF] text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5'
              }`}
            >
              <Clock className="w-3 h-3" strokeWidth={2.5} />
              {time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
