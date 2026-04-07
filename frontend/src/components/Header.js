import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
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
    <header className="bg-[#FFFDF7] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 group">
          <div className="bg-[#FACC15] border-2 border-[#0A0A0A] rounded-xl p-2 shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] group-hover:shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] group-hover:-translate-y-0.5 transition-all">
            <Zap className="w-5 h-5 text-[#0A0A0A]" strokeWidth={3} />
          </div>
          <span className="text-2xl font-black font-heading text-[#0A0A0A]">bored?</span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={openCreateForm}
                data-testid="share-idea-btn"
                className="bg-[#FACC15] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1 hover:-translate-x-1 font-bold transition-all px-4 py-2 rounded-xl font-heading flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                <span className="hidden sm:inline">Share Idea</span>
              </button>
              <Link
                to="/profile"
                data-testid="profile-link"
                className="bg-[#FFFFFF] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 font-bold transition-all p-2 rounded-xl flex items-center gap-2"
              >
                <User className="w-5 h-5" strokeWidth={2.5} />
                <span className="hidden sm:inline text-sm font-heading">{user.name || 'Profile'}</span>
              </Link>
              <button
                onClick={handleLogout}
                data-testid="logout-btn"
                className="bg-[#FFFFFF] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 font-bold transition-all p-2 rounded-xl"
              >
                <LogOut className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              data-testid="login-btn"
              className="bg-[#FACC15] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1 hover:-translate-x-1 font-bold transition-all px-5 py-2 rounded-xl font-heading text-sm"
            >
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
