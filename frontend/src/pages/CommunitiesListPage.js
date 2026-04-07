import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button.jsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function CommunitiesListPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, [user]);

  const fetchCommunities = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/communities`, { withCredentials: true });
      setCommunities(data.communities || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleJoinToggle = async (community) => {
    if (!user) return;
    try {
      if (community.joined) {
        await axios.delete(`${API_URL}/api/communities/${community.id}/join`, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/communities/${community.id}/join`, {}, { withCredentials: true });
      }
      setCommunities((prev) =>
        prev.map((c) => c.id === community.id ? { ...c, joined: !c.joined, members_count: c.members_count + (c.joined ? -1 : 1) } : c)
      );
    } catch (e) { console.error(e); }
  };

  const india = communities.filter((c) => c.country === 'India');
  const usa = communities.filter((c) => c.country === 'USA');

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-heading text-[#1A1A1A] mb-1">Local Communities</h1>
        <p className="text-sm text-[#3C3C3C] mb-6">Discover and join local communities. Find hidden gems, great restaurants, and activities near you.</p>
      </motion.div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#FFE100]" /></div>}

      {!loading && (
        <>
          <CommunityGroup title="🇮🇳 India" communities={india} user={user} onJoinToggle={handleJoinToggle} />
          <CommunityGroup title="🇺🇸 United States" communities={usa} user={user} onJoinToggle={handleJoinToggle} />
        </>
      )}
    </div>
  );
}

function CommunityGroup({ title, communities, user, onJoinToggle }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold font-heading text-[#1A1A1A] mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {communities.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white rounded-[12px] p-4 flex items-center gap-3"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Link to={`/communities/${c.id}`} data-testid={`community-card-${c.slug}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${c.cover_color}25` }}>
                {c.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold font-heading text-[#1A1A1A]">{c.name}</p>
                <p className="text-xs text-[#A0A0A0]">{c.members_count} members</p>
              </div>
            </Link>
            {user && (
              <Button
                onClick={() => onJoinToggle(c)}
                variant={c.joined ? 'secondary' : 'primary'}
                size="icon-sm"
                title={c.joined ? 'Leave' : 'Join'}
              >
                {c.joined ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
