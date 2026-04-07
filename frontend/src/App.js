import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import FeedPage from './pages/FeedPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import IdeaForm from './components/IdeaForm';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppContent() {
  const { formState, closeForm, handleIdeaSuccess } = useApp();

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AnimatePresence>
        {formState.open && (
          <IdeaForm
            key="idea-form"
            idea={formState.idea}
            onClose={closeForm}
            onSuccess={handleIdeaSuccess}
          />
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
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
