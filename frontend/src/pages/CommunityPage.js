import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, UserPlus, UserCheck, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import IdeaCard from '../components/IdeaCard';
import { Button } from '../components/ui/button.jsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CommunityPage() {
  const { communityId } = useParams();
  const { user } = useAuth();
  const { openCreateForm, refreshKey } = useApp();
  const [community, setCommunity] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchCommunity();
  }, [communityId]);

  useEffect(() => {
    if (community) fetchIdeas(0, false);
  }, [community, refreshKey]);

  const fetchCommunity = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/communities/${communityId}`, { withCredentials: true });
      setCommunity(data);
    } catch (e) { console.error(e); }
  };

  const fetchIdeas = async (skip = 0, append = false) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/ideas`, {
        params: { community_id: communityId, skip, limit: 12, sort: 'popular' },
        withCredentials: true,
      });
      if (append) setIdeas((prev) => [...prev, ...data.ideas]);
      else setIdeas(data.ideas);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleJoinToggle = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      if (community.joined) {
        await axios.delete(`${API_URL}/api/communities/${communityId}/join`, { withCredentials: true });
        setCommunity((c) => ({ ...c, joined: false, members_count: c.members_count - 1 }));
      } else {
        await axios.post(`${API_URL}/api/communities/${communityId}/join`, {}, { withCredentials: true });
        setCommunity((c) => ({ ...c, joined: true, members_count: c.members_count + 1 }));
      }
    } catch (e) { console.error(e); }
    finally { setJoining(false); }
  };

  const handleVoteUpdate = (ideaId, voteData) =>
    setIdeas((prev) => prev.map((i) => i.id === ideaId ? { ...i, ...voteData } : i));
  const handleIdeaDeleted = (ideaId) => {
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    setTotal((t) => t - 1);
  };

  if (!community && !loading) return (
    <div className="text-center py-20">
      <h2 className="text-xl font-bold font-heading">Community not found</h2>
      <Link to="/communities" className="text-[#5D2EFF] hover:underline mt-2 inline-block">Browse communities</Link>
    </div>
  );

  return (
    <div>
      <Link to="/communities" className="inline-flex items-center gap-1 text-sm font-semibold text-[#3C3C3C] hover:text-[#1A1A1A] mb-5 transition-colors font-heading">
        <ArrowLeft className="w-4 h-4" /> All Communities
      </Link>

      {community && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[16px] p-6 mb-6 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${community.cover_color}20 0%, ${community.cover_color}08 100%)`, border: `2px solid ${community.cover_color}40` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{community.emoji}</div>
              <div>
                <h1 className="text-2xl font-bold font-heading text-[#1A1A1A]">{community.name}</h1>
                <p className="text-sm text-[#3C3C3C] mt-1 max-w-lg">{community.description}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Users className="w-4 h-4 text-[#A0A0A0]" />
                  <span className="text-sm text-[#3C3C3C] font-semibold">{community.members_count} members</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {user && (
                <Button
                  onClick={handleJoinToggle}
                  disabled={joining}
                  variant={community.joined ? 'secondary' : 'primary'}
                  size="sm"
                  data-testid="join-community-btn"
                  className="font-heading"
                >
                  {community.joined ? <><UserCheck className="w-4 h-4" /> Joined</> : <><UserPlus className="w-4 h-4" /> Join</>}
                </Button>
              )}
              {community.joined && (
                <Button
                  onClick={() => openCreateForm(communityId)}
                  variant="dark"
                  size="sm"
                  data-testid="community-share-idea-btn"
                  className="font-heading"
                >
                  <Plus className="w-4 h-4" /> Share Idea
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Ideas */}
      <h2 className="text-base font-bold font-heading text-[#1A1A1A] mb-4">
        Local Ideas {total > 0 && <span className="text-[#A0A0A0] font-normal">({total})</span>}
      </h2>

      {loading && ideas.length === 0 && (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#FFE100]" /></div>
      )}

      {!loading && ideas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-[16px]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p className="text-4xl mb-3">📍</p>
          <h3 className="text-lg font-bold font-heading text-[#1A1A1A] mb-2">No ideas yet</h3>
          <p className="text-sm text-[#3C3C3C]">Be the first to share a local idea for {community?.name}!</p>
        </div>
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
          <Button variant="secondary" onClick={() => fetchIdeas(ideas.length, true)} className="font-heading">
            Load More ({total - ideas.length} more)
          </Button>
        </div>
      )}
    </div>
  );
}
