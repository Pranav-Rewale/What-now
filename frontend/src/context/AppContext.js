import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);
const API_URL = process.env.REACT_APP_BACKEND_URL;

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [formState, setFormState] = useState({ open: false, idea: null, communityId: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [followingIds, setFollowingIds] = useState(new Set());

  const openCreateForm = (communityId = null) => setFormState({ open: true, idea: null, communityId });
  const openEditForm = (idea) => setFormState({ open: true, idea, communityId: null });
  const closeForm = () => setFormState({ open: false, idea: null, communityId: null });
  const triggerRefresh = () => setRefreshKey((k) => k + 1);
  const handleIdeaSuccess = () => { closeForm(); triggerRefresh(); };

  const fetchFollowing = useCallback(async () => {
    if (!user) { setFollowingIds(new Set()); return; }
    try {
      const { data } = await axios.get(`${API_URL}/api/users/following`, { withCredentials: true });
      setFollowingIds(new Set(data.users.map((u) => u.id)));
    } catch { setFollowingIds(new Set()); }
  }, [user]);

  const toggleFollow = async (targetId) => {
    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      await axios.delete(`${API_URL}/api/users/${targetId}/follow`, { withCredentials: true });
      setFollowingIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
    } else {
      await axios.post(`${API_URL}/api/users/${targetId}/follow`, {}, { withCredentials: true });
      setFollowingIds((prev) => new Set([...prev, targetId]));
    }
  };

  return (
    <AppContext.Provider value={{ formState, openCreateForm, openEditForm, closeForm, refreshKey, triggerRefresh, handleIdeaSuccess, followingIds, fetchFollowing, toggleFollow }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
