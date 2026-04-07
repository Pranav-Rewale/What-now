import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const match = hash.match(/session_id=([^&]+)/);

      if (!match) {
        navigate('/', { replace: true });
        return;
      }

      const sessionId = match[1];
      // Clear the hash from URL immediately
      window.history.replaceState(null, '', window.location.pathname);

      try {
        const { data } = await axios.post(
          `${API_URL}/api/auth/google/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );
        setUser(data);
        navigate('/', { replace: true });
      } catch (e) {
        console.error('Google auth failed:', e);
        navigate('/auth', { replace: true });
      }
    };

    processSession();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#3C3C3C] font-heading font-semibold">Signing you in...</p>
      </div>
    </div>
  );
}
