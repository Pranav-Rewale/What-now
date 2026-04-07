import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES, TIME_OPTIONS } from '../utils/constants';
import { Flame, Clock } from 'lucide-react';

export default function FilterBar({ filters, onFiltersChange }) {
  const setFilter = (key, value) => onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="space-y-5 mb-2">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-black font-heading text-[#1A1A1A]">Ideas Feed</h2>

        {/* Sort toggle */}
        <div className="flex rounded-[8px] overflow-hidden border border-[#E6E6E6] bg-white" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          {[
            { value: 'popular', label: 'Popular', icon: <Flame className="w-3.5 h-3.5" strokeWidth={2.5} /> },
            { value: 'newest', label: 'Newest', icon: <Clock className="w-3.5 h-3.5" strokeWidth={2.5} /> },
          ].map((opt) => (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('sort', opt.value)}
              data-testid={`sort-${opt.value}-btn`}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold font-heading transition-colors ${
                filters.sort === opt.value
                  ? 'bg-[#FFE100] text-[#000000]'
                  : 'bg-white text-[#3C3C3C] hover:bg-[#F5F5F5]'
              } ${opt.value === 'newest' ? 'border-l border-[#E6E6E6]' : ''}`}
            >
              {opt.icon}
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div>
        <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2.5 font-heading">Category</p>
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={filters.category === 'all'}
            onClick={() => setFilter('category', 'all')}
            testId="category-filter-all"
          >
            All
          </FilterPill>
          {CATEGORIES.map((cat) => (
            <FilterPill
              key={cat.value}
              active={filters.category === cat.value}
              onClick={() => setFilter('category', cat.value)}
              testId={`category-filter-${cat.value}`}
              activeBg={cat.bg}
              activeText={cat.text}
            >
              {cat.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Time filters */}
      <div>
        <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-2.5 font-heading">Time Needed</p>
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={filters.timeNeeded === 'all'}
            onClick={() => setFilter('timeNeeded', 'all')}
            testId="time-filter-all"
          >
            All
          </FilterPill>
          {TIME_OPTIONS.map((time) => (
            <FilterPill
              key={time}
              active={filters.timeNeeded === time}
              onClick={() => setFilter('timeNeeded', time)}
              testId={`time-filter-${time.replace(/\s/g, '-')}`}
            >
              <Clock className="w-3 h-3" strokeWidth={2.5} />
              {time}
            </FilterPill>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, testId, activeBg, activeText, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      layout
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold font-heading border transition-all duration-150 ${
        active
          ? 'border-transparent'
          : 'bg-white text-[#3C3C3C] border-[#E6E6E6] hover:border-[#C8C8C8]'
      }`}
      style={
        active
          ? {
              backgroundColor: activeBg || '#FFE100',
              color: activeText || '#000000',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }
          : { boxShadow: 'none' }
      }
    >
      {children}
    </motion.button>
  );
}
