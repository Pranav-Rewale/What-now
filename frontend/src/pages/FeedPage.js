import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FilterBar from '../components/FilterBar';
import IdeaCard from '../components/IdeaCard';
import { Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0A0A0A] font-heading mb-3">
          What to do when <span className="bg-[#FACC15] px-2 rounded-lg border-2 border-[#0A0A0A]">bored</span>?
        </h1>
        <p className="text-base sm:text-lg text-[#334155] font-body font-medium max-w-xl mx-auto">
          Crowdsourced ideas from real people. Vote for your favorites and share your own!
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Loading skeleton */}
      {loading && ideas.length === 0 && (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-[#FACC15]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && ideas.length === 0 && (
        <div className="text-center py-24 bg-white border-2 border-[#0A0A0A] rounded-2xl shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] mt-6">
          <p className="text-5xl mb-4">&#129300;</p>
          <h3 className="text-2xl font-bold font-heading text-[#0A0A0A] mb-2">No ideas found!</h3>
          <p className="text-[#64748B] font-body">Be the first to share an idea for these filters.</p>
        </div>
      )}

      {/* Ideas Grid */}
      {ideas.length > 0 && (
        <div
          data-testid="ideas-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
        >
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onVoteUpdate={handleVoteUpdate}
              onDeleted={handleIdeaDeleted}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {ideas.length < total && !loading && (
        <div className="flex justify-center mt-10">
          <button
            onClick={handleLoadMore}
            data-testid="load-more-btn"
            className="bg-[#FFFFFF] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1 hover:-translate-x-1 font-bold transition-all px-8 py-3 rounded-xl font-heading"
          >
            Load More ({total - ideas.length} more)
          </button>
        </div>
      )}

      {loading && ideas.length > 0 && (
        <div className="flex justify-center mt-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#FACC15]" />
        </div>
      )}
    </main>
  );
}
