import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

function formatError(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).join(' ');
  return String(detail);
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setForm({ name: '', email: '', password: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#FFFDF7' }}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-[#FFFFFF] border-2 border-[#0A0A0A] shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] rounded-2xl p-8">
          {/* Mode Toggle */}
          <div className="flex mb-8 border-2 border-[#0A0A0A] rounded-xl overflow-hidden">
            <button
              onClick={() => switchMode('login')}
              data-testid="login-tab"
              className={`flex-1 py-3 font-bold font-heading text-sm transition-all ${mode === 'login' ? 'bg-[#FACC15] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A] hover:bg-[#FFFDF7]'}`}
            >
              Log In
            </button>
            <button
              onClick={() => switchMode('register')}
              data-testid="register-tab"
              className={`flex-1 py-3 font-bold font-heading text-sm transition-all border-l-2 border-[#0A0A0A] ${mode === 'register' ? 'bg-[#FACC15] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A] hover:bg-[#FFFDF7]'}`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-2xl font-black font-heading text-[#0A0A0A] mb-6">
            {mode === 'login' ? 'Welcome back!' : 'Join the community!'}
          </h2>

          {error && (
            <div data-testid="auth-error" className="bg-red-50 border-2 border-red-500 text-red-700 p-3 rounded-xl mb-5 font-body text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                  <input
                    type="text"
                    data-testid="name-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="What should we call you?"
                    required
                    className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  type="email"
                  data-testid="email-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  data-testid="password-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Make it strong!"
                  required
                  className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0A0A0A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={loading}
              className="w-full bg-[#FACC15] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1 hover:-translate-x-1 font-bold transition-all py-3 rounded-xl font-heading text-base disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account!'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
