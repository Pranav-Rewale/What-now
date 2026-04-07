import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import IdeaCard from '../components/IdeaCard';
import { Button } from '../components/ui/button.jsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FollowingPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const { refreshKey } = useApp();

  const fetchIdeas = useCallback(async (currentSkip = 0, append = false) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/ideas/following`, { params: { skip: currentSkip, limit: 12 }, withCredentials: true });
      if (append) setIdeas((prev) => [...prev, ...data.ideas]);
      else setIdeas(data.ideas);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setSkip(0);
    fetchIdeas(0, false);
  }, [refreshKey, fetchIdeas]);

  const handleVoteUpdate = (ideaId, voteData) =>
    setIdeas((prev) => prev.map((i) => i.id === ideaId ? { ...i, ...voteData } : i));
  const handleIdeaDeleted = (ideaId) => {
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    setTotal((t) => t - 1);
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-heading text-[#1A1A1A] mb-1">Following Feed</h1>
        <p className="text-sm text-[#3C3C3C] mb-6">Ideas from people you follow.</p>
      </motion.div>

      {loading && ideas.length === 0 && (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#FFE100]" /></div>
      )}

      {!loading && ideas.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-[16px]"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <UserX className="w-12 h-12 text-[#E6E6E6] mx-auto mb-3" />
          <h3 className="text-lg font-bold font-heading text-[#1A1A1A] mb-2">No ideas yet</h3>
          <p className="text-sm text-[#3C3C3C] mb-4">Follow people from the main feed to see their ideas here.</p>
          <Button variant="primary" size="default" className="font-heading" asChild>
            <Link to="/">Browse Feed</Link>
          </Button>
        </motion.div>
      )}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {ideas.map((idea, i) => (
            <IdeaCard key={idea.id} idea={idea} index={i} onVoteUpdate={handleVoteUpdate} onDeleted={handleIdeaDeleted} />
          ))}
        </div>
      )}

      {ideas.length < total && !loading && (
        <div className="flex justify-center mt-8">
          <Button variant="secondary" onClick={() => { const newSkip = skip + 12; setSkip(newSkip); fetchIdeas(newSkip, true); }} className="font-heading">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
