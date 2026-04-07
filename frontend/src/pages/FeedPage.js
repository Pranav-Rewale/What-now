import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import FilterBar from '../components/FilterBar';
import IdeaCard from '../components/IdeaCard';
import { Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button.jsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LIMIT = 12;

export default function FeedPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [filters, setFilters] = useState({ category: 'all', timeNeeded: 'all', sort: 'popular' });
  const { refreshKey } = useApp();

  const fetchIdeas = useCallback(async (currentSkip, currentFilters, append = false) => {
    setLoading(true);
    try {
      const params = { skip: currentSkip, limit: LIMIT, sort: currentFilters.sort };
      if (currentFilters.category !== 'all') params.category = currentFilters.category;
      if (currentFilters.timeNeeded !== 'all') params.time_needed = currentFilters.timeNeeded;
      const { data } = await axios.get(`${API_URL}/api/ideas`, { params, withCredentials: true });
      if (append) {
        setIdeas((prev) => [...prev, ...data.ideas]);
      } else {
        setIdeas(data.ideas);
      }
      setTotal(data.total);
    } catch (e) {
      console.error('Failed to fetch ideas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSkip(0);
    fetchIdeas(0, filters, false);
  }, [filters, refreshKey, fetchIdeas]);

  const handleLoadMore = () => {
    const newSkip = skip + LIMIT;
    setSkip(newSkip);
    fetchIdeas(newSkip, filters, true);
  };

  const handleVoteUpdate = (ideaId, voteData) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? { ...idea, upvotes: voteData.upvotes, downvotes: voteData.downvotes, score: voteData.score, user_vote: voteData.user_vote }
          : idea
      )
    );
  };

  const handleIdeaDeleted = (ideaId) => {
    setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    setTotal((prev) => prev - 1);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 text-center"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A1A1A] font-heading mb-3 leading-tight">
          What to do when{' '}
          <span
            className="px-3 rounded-[8px] inline-block"
            style={{ backgroundColor: '#FFE100', color: '#000000' }}
          >
            bored
          </span>
          ?
        </h1>
        <p className="text-base sm:text-lg text-[#3C3C3C] font-body max-w-xl mx-auto">
          Crowdsourced ideas from real people. Vote for your favorites and share your own!
        </p>
      </motion.div>

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Loading */}
      {loading && ideas.length === 0 && (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-[#FFE100]" />
        </div>
      )}

      {/* Empty */}
      {!loading && ideas.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-[16px] mt-6"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <div className="text-5xl mb-4 font-black text-[#E6E6E6]">?</div>
          <h3 className="text-xl font-bold font-heading text-[#1A1A1A] mb-2">No ideas found!</h3>
          <p className="text-[#3C3C3C] font-body text-sm">Be the first to share an idea for these filters.</p>
        </motion.div>
      )}

      {/* Grid */}
      {ideas.length > 0 && (
        <div
          data-testid="ideas-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
        >
          {ideas.map((idea, index) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={index}
              onVoteUpdate={handleVoteUpdate}
              onDeleted={handleIdeaDeleted}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {ideas.length < total && !loading && (
        <div className="flex justify-center mt-10">
          <Button
            onClick={handleLoadMore}
            data-testid="load-more-btn"
            variant="secondary"
            size="lg"
            className="font-heading"
          >
            Load More ({total - ideas.length} more)
          </Button>
        </div>
      )}

      {loading && ideas.length > 0 && (
        <div className="flex justify-center mt-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFE100]" />
        </div>
      )}
    </main>
  );
}
