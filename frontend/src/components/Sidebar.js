import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Users, MapPin, UserPlus, UserCheck, ChevronRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Sidebar() {
  const { user } = useAuth();
  const { followingIds, fetchFollowing, toggleFollow } = useApp();
  const [followingUsers, setFollowingUsers] = useState([]);
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    fetchCommunities();
    if (user) {
      fetchFollowingUsers();
      fetchFollowing();
    }
  }, [user]);

  const fetchFollowingUsers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/users/following`, { withCredentials: true });
      setFollowingUsers(data.users || []);
    } catch { setFollowingUsers([]); }
  };

  const fetchCommunities = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/communities`, { withCredentials: true });
      setCommunities(data.communities || []);
    } catch { setCommunities([]); }
  };

  const handleJoinToggle = async (community) => {
    if (!user) return;
    try {
      if (community.joined) {
        await axios.delete(`${API_URL}/api/communities/${community.id}/join`, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/communities/${community.id}/join`, {}, { withCredentials: true });
      }
      setCommunities((prev) => prev.map((c) => c.id === community.id ? { ...c, joined: !c.joined, members_count: c.members_count + (c.joined ? -1 : 1) } : c));
    } catch (e) { console.error(e); }
  };

  const indiaCommunities = communities.filter((c) => c.country === 'India');
  const usCommunities = communities.filter((c) => c.country === 'USA');

  return (
    <div className="sticky top-20 space-y-5 max-h-[calc(100vh-5rem)] overflow-y-auto pb-6 pr-1">
      {/* Following */}
      {user && (
        <SidebarSection icon={<Users className="w-4 h-4" />} title="Following" actionLabel="Following feed" actionHref="/following">
          {followingUsers.length === 0 ? (
            <p className="text-xs text-[#A0A0A0] py-2">Follow people to see their ideas here.</p>
          ) : (
            followingUsers.slice(0, 6).map((u) => (
              <div key={u.id} className="flex items-center gap-2 py-1.5">
                <div className="w-7 h-7 rounded-full bg-[#FFE100] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#000000]">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm text-[#1A1A1A] font-semibold truncate flex-1">{u.name}</span>
              </div>
            ))
          )}
        </SidebarSection>
      )}

      {/* India Communities */}
      <SidebarSection icon={<span className="text-sm">🇮🇳</span>} title="India" actionLabel="Browse all" actionHref="/communities">
        {indiaCommunities.map((c) => (
          <CommunityItem key={c.id} community={c} onJoinToggle={handleJoinToggle} user={user} />
        ))}
      </SidebarSection>

      {/* US Communities */}
      <SidebarSection icon={<span className="text-sm">🇺🇸</span>} title="United States" actionLabel="Browse all" actionHref="/communities">
        {usCommunities.map((c) => (
          <CommunityItem key={c.id} community={c} onJoinToggle={handleJoinToggle} user={user} />
        ))}
      </SidebarSection>
    </div>
  );
}

function SidebarSection({ icon, title, actionLabel, actionHref, children }) {
  return (
    <div className="bg-white rounded-[12px] p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-bold text-[#1A1A1A] font-heading">{title}</span>
        </div>
        {actionLabel && actionHref && (
          <Link to={actionHref} className="text-xs text-[#5D2EFF] hover:opacity-75 font-semibold flex items-center gap-0.5">
            {actionLabel} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function CommunityItem({ community, onJoinToggle, user }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Link
        to={`/communities/${community.id}`}
        data-testid={`community-link-${community.slug}`}
        className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <div
          className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 text-sm"
          style={{ backgroundColor: `${community.cover_color}30` }}
        >
          {community.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{community.name}</p>
          <p className="text-xs text-[#A0A0A0]">{community.members_count} {community.members_count === 1 ? 'member' : 'members'}</p>
        </div>
      </Link>
      {user && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onJoinToggle(community)}
          data-testid={`join-community-${community.slug}`}
          title={community.joined ? 'Leave' : 'Join'}
          className={`p-1.5 rounded-[6px] flex-shrink-0 transition-colors ${community.joined ? 'bg-[#F0F0F0] text-[#3C3C3C]' : 'bg-[#FFE100] text-[#000000]'}`}
        >
          {community.joined ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
        </motion.button>
      )}
    </div>
  );
}
