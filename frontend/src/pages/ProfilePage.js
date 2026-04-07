import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import IdeaCard from '../components/IdeaCard';
import { Loader2, User, Star, Lightbulb, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProfilePage() {
  const { user } = useAuth();
  const { refreshKey } = useApp();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyIdeas();
  }, [refreshKey]);

  const fetchMyIdeas = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/ideas/my`, { withCredentials: true });
      setIdeas(data.ideas);
    } catch (e) {
      console.error('Failed to fetch ideas:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleIdeaDeleted = (ideaId) => {
    setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
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

  const totalUpvotes = ideas.reduce((sum, idea) => sum + (idea.upvotes || 0), 0);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        to="/"
        data-testid="back-to-feed"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#64748B] hover:text-[#0A0A0A] mb-6 transition-colors font-heading"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
        Back to Feed
      </Link>

      {/* Profile Header */}
      <div className="mb-8 bg-[#FFFFFF] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#FACC15] border-2 border-[#0A0A0A] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] flex-shrink-0">
            <User className="w-8 h-8 text-[#0A0A0A]" strokeWidth={2.5} />
          </div>
          <div>
            <h1 data-testid="profile-name" className="text-2xl font-black font-heading text-[#0A0A0A]">
              {user?.name || 'Anonymous'}
            </h1>
            <p className="text-[#64748B] font-body text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-[#FFFDF7] border-2 border-[#0A0A0A] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] rounded-xl p-4 flex items-center gap-3 min-w-[140px]">
            <Lightbulb className="w-6 h-6 text-[#FACC15]" strokeWidth={2.5} />
            <div>
              <p data-testid="ideas-count" className="text-2xl font-black font-heading">{ideas.length}</p>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Ideas Shared</p>
            </div>
          </div>
          <div className="bg-[#FFFDF7] border-2 border-[#0A0A0A] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] rounded-xl p-4 flex items-center gap-3 min-w-[140px]">
            <Star className="w-6 h-6 text-[#EF4444]" strokeWidth={2.5} />
            <div>
              <p data-testid="upvotes-count" className="text-2xl font-black font-heading">{totalUpvotes}</p>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Upvotes</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-black font-heading text-[#0A0A0A] mb-5">My Ideas</h2>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#FACC15]" />
        </div>
      )}

      {!loading && ideas.length === 0 && (
        <div className="text-center py-16 bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-2xl shadow-[4px_4px_0px_0px_rgba(10,10,10,1)]">
          <Lightbulb className="w-12 h-12 text-[#FACC15] mx-auto mb-3" strokeWidth={2} />
          <h3 className="text-xl font-bold font-heading text-[#0A0A0A] mb-2">No ideas yet!</h3>
          <p className="text-[#64748B] font-body mb-5">Share your first idea with the community.</p>
          <Link
            to="/"
            className="bg-[#FACC15] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1 hover:-translate-x-1 font-bold transition-all px-6 py-3 rounded-xl font-heading inline-block"
          >
            Go to Feed
          </Link>
        </div>
      )}

      {!loading && ideas.length > 0 && (
        <div data-testid="my-ideas-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onDeleted={handleIdeaDeleted}
              onVoteUpdate={handleVoteUpdate}
            />
          ))}
        </div>
      )}
    </main>
  );
}
