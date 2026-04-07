import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import FeedPage from './pages/FeedPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import CommunityPage from './pages/CommunityPage';
import CommunitiesListPage from './pages/CommunitiesListPage';
import FollowingPage from './pages/FollowingPage';
import IdeaForm from './components/IdeaForm';
import AuthCallback from './components/AuthCallback';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AppRouter() {
  const location = useLocation();
  const { formState, closeForm, handleIdeaSuccess } = useApp();

  if (location.hash?.includes('session_id=')) return <AuthCallback />;

  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {isAuthPage ? (
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        ) : (
          <div className="flex gap-6 py-6 pb-24 lg:pb-8">
            {/* Left Sidebar — desktop only */}
            <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
              <Sidebar />
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
              <Routes>
                <Route path="/" element={<FeedPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/communities" element={<CommunitiesListPage />} />
                <Route path="/communities/:communityId" element={<CommunityPage />} />
                <Route path="/following" element={<ProtectedRoute><FollowingPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        )}
      </div>

      {/* Bottom nav — mobile only */}
      {!isAuthPage && <BottomNav />}

      <AnimatePresence>
        {formState.open && (
          <IdeaForm key="idea-form" idea={formState.idea} communityId={formState.communityId} onClose={closeForm} onSuccess={handleIdeaSuccess} />
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRouter />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
