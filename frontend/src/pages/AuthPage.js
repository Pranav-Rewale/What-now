import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';

function formatError(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(' ');
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

  if (user) { navigate('/'); return null; }

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

  const switchMode = (m) => { setMode(m); setError(''); setForm({ name: '', email: '', password: '' }); };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Brand blurb */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-heading text-[#1A1A1A]">
            Join <span className="bg-[#FFE100] px-2 rounded-[4px]">bored?</span>
          </h1>
          <p className="text-sm text-[#3C3C3C] mt-2">Share what you do when boredom strikes.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          {/* Mode toggle */}
          <div className="flex border-b border-[#E6E6E6]">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                data-testid={m === 'login' ? 'login-tab' : 'register-tab'}
                className={`flex-1 py-3.5 text-sm font-bold font-heading transition-colors ${
                  mode === m
                    ? 'bg-[#FFE100] text-[#000000]'
                    : 'bg-white text-[#3C3C3C] hover:bg-[#FAFAFA]'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="p-7">
            <h2 className="text-xl font-black font-heading text-[#1A1A1A] mb-5">
              {mode === 'login' ? 'Welcome back!' : 'Create your account'}
            </h2>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="auth-error"
                className="bg-[#FFF0F2] border border-[#FF4757] text-[#FF4757] rounded-[8px] px-4 py-3 mb-5 text-sm font-semibold"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                    <Input
                      id="name"
                      data-testid="name-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="What should we call you?"
                      required
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                  <Input
                    id="email"
                    type="email"
                    data-testid="email-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    data-testid="password-input"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Make it strong!"
                    required
                    className="pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#1A1A1A] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="auth-submit-btn"
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full font-heading mt-2"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
