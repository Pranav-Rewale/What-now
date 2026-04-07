import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import IdeaCard from '../components/IdeaCard';
import { Button } from '../components/ui/button.jsx';
import { Loader2, User, TrendingUp, Lightbulb, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProfilePage() {
  const { user } = useAuth();
  const { refreshKey } = useApp();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMyIdeas(); }, [refreshKey]);

  const fetchMyIdeas = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/ideas/my`, { withCredentials: true });
      setIdeas(data.ideas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalUpvotes = ideas.reduce((sum, i) => sum + (i.upvotes || 0), 0);

  const handleIdeaDeleted = (ideaId) => setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
  const handleVoteUpdate = (ideaId, voteData) =>
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === ideaId
          ? { ...i, upvotes: voteData.upvotes, downvotes: voteData.downvotes, score: voteData.score, user_vote: voteData.user_vote }
          : i
      )
    );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        to="/"
        data-testid="back-to-feed"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#3C3C3C] hover:text-[#1A1A1A] mb-6 transition-colors font-heading"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
        Back to Feed
      </Link>

      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-[16px] p-6 mb-8"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FFE100' }}
          >
            <User className="w-7 h-7 text-[#000000]" strokeWidth={2.5} />
          </div>
          <div>
            <h1 data-testid="profile-name" className="text-xl font-black font-heading text-[#1A1A1A]">
              {user?.name || 'Anonymous'}
            </h1>
            <p className="text-sm text-[#3C3C3C]">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <StatCard
            icon={<Lightbulb className="w-5 h-5" style={{ color: '#FFE100' }} strokeWidth={2.5} />}
            value={ideas.length}
            label="Ideas Shared"
            testId="ideas-count"
            accent="#FFE100"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-[#2DFF72]" strokeWidth={2.5} />}
            value={totalUpvotes}
            label="Total Upvotes"
            testId="upvotes-count"
            accent="#2DFF72"
          />
        </div>
      </motion.div>

      {/* My ideas */}
      <h2 className="text-lg font-black font-heading text-[#1A1A1A] mb-5">My Ideas</h2>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFE100]" />
        </div>
      )}

      {!loading && ideas.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white rounded-[16px]"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
        >
          <Lightbulb className="w-12 h-12 text-[#E6E6E6] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-lg font-bold font-heading text-[#1A1A1A] mb-2">No ideas yet!</h3>
          <p className="text-sm text-[#3C3C3C] mb-5">Share your first idea with the community.</p>
          <Button variant="primary" size="default" className="font-heading" asChild>
            <Link to="/">Go to Feed</Link>
          </Button>
        </motion.div>
      )}

      {!loading && ideas.length > 0 && (
        <div data-testid="my-ideas-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea, index) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={index}
              onDeleted={handleIdeaDeleted}
              onVoteUpdate={handleVoteUpdate}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function StatCard({ icon, value, label, testId, accent }) {
  return (
    <div
      className="bg-[#FAFAFA] rounded-[12px] p-4 border border-[#E6E6E6] flex items-center gap-3"
    >
      <div
        className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}20` }}
      >
        {icon}
      </div>
      <div>
        <p data-testid={testId} className="text-xl font-black font-heading text-[#1A1A1A] leading-none">{value}</p>
        <p className="text-xs text-[#3C3C3C] mt-0.5">{label}</p>
      </div>
    </div>
  );
}
