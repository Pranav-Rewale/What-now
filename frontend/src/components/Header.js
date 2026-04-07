import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button.jsx';
import { Plus, User, LogOut, Zap } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const { openCreateForm } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-[#000000] sticky top-0 z-50" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="bg-[#FFE100] rounded-[8px] p-1.5"
          >
            <Zap className="w-5 h-5 text-[#000000]" strokeWidth={3} />
          </motion.div>
          <span className="text-xl font-black font-heading text-[#FFE100] tracking-tight">bored?</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                onClick={openCreateForm}
                data-testid="share-idea-btn"
                variant="primary"
                size="sm"
                className="text-sm font-heading"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Share Idea</span>
              </Button>

              <Button variant="ghost-white" size="default" className="text-sm font-heading" asChild>
                <Link to="/profile" data-testid="profile-link">
                  <User className="w-4 h-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">{user.name || 'Profile'}</span>
                </Link>
              </Button>

              <Button
                onClick={handleLogout}
                data-testid="logout-btn"
                variant="ghost-white"
                size="icon"
                title="Logout"
              >
                <LogOut className="w-4 h-4" strokeWidth={2.5} />
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" className="font-heading text-sm" asChild>
              <Link to="/auth" data-testid="login-btn">
                Login / Sign Up
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
