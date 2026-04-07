import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { X, Clock } from 'lucide-react';
import { CATEGORIES, TIME_OPTIONS } from '../utils/constants';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Textarea } from './ui/textarea.jsx';
import { Label } from './ui/label.jsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function formatError(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(' ');
  return String(detail);
}

export default function IdeaForm({ idea, onClose, onSuccess }) {
  const isEditing = !!idea;
  const [form, setForm] = useState({
    title: idea?.title || '',
    description: idea?.description || '',
    category: idea?.category || '',
    time_needed: idea?.time_needed || '',
    image_url: idea?.image_url || '',
    link_url: idea?.link_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { setError('Please select a category'); return; }
    if (!form.time_needed) { setError('Please select time needed'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        time_needed: form.time_needed,
        image_url: form.image_url?.trim() || null,
        link_url: form.link_url?.trim() || null,
      };
      if (isEditing) {
        await axios.put(`${API_URL}/api/ideas/${idea.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/ideas`, payload, { withCredentials: true });
      }
      onSuccess?.();
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-[#000000]/60"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal panel */}
      <motion.div
        data-testid="idea-form-modal"
        className="relative z-10 w-full sm:max-w-lg max-h-[95vh] overflow-y-auto bg-white sm:rounded-[16px] rounded-t-[20px]"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#E6E6E6] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E6E6]">
          <h2 className="text-lg font-black font-heading text-[#1A1A1A]">
            {isEditing ? 'Edit Idea' : 'Share an Idea'}
          </h2>
          <button
            onClick={onClose}
            data-testid="close-form-btn"
            className="p-1.5 rounded-[8px] text-[#3C3C3C] hover:bg-[#E6E6E6] transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div
              data-testid="form-error"
              className="bg-[#FFF0F2] border border-[#FF4757] text-[#FF4757] rounded-[8px] px-4 py-3 text-sm font-semibold"
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="idea-title">Title *</Label>
            <Input
              id="idea-title"
              data-testid="idea-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What's the idea?"
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="idea-description">Description *</Label>
            <Textarea
              id="idea-description"
              data-testid="idea-description-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the idea in detail..."
              required
              rows={4}
              maxLength={1000}
            />
          </div>

          {/* Category */}
          <div>
            <Label>Category *</Label>
            <div className="flex flex-wrap gap-2" data-testid="category-selector">
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.value}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  data-testid={`category-${cat.value}`}
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full border transition-all ${
                    form.category === cat.value
                      ? 'border-transparent'
                      : 'bg-white border-[#E6E6E6] text-[#3C3C3C] hover:border-[#C8C8C8]'
                  }`}
                  style={
                    form.category === cat.value
                      ? { backgroundColor: cat.bg, color: cat.text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                      : {}
                  }
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Time Needed */}
          <div>
            <Label className="flex items-center gap-1">
              <Clock className="w-4 h-4" strokeWidth={2.5} />
              Time Needed *
            </Label>
            <div className="flex flex-wrap gap-2" data-testid="time-selector">
              {TIME_OPTIONS.map((time) => (
                <motion.button
                  key={time}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  data-testid={`time-${time.replace(/\s/g, '-')}`}
                  onClick={() => setForm({ ...form, time_needed: time })}
                  className={`text-sm font-bold px-4 py-1.5 rounded-full border transition-all ${
                    form.time_needed === time
                      ? 'bg-[#1A1A1A] text-[#FFE100] border-[#1A1A1A]'
                      : 'bg-white border-[#E6E6E6] text-[#3C3C3C] hover:border-[#C8C8C8]'
                  }`}
                >
                  {time}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <Label htmlFor="idea-image">Image URL <span className="text-[#A0A0A0] font-normal">(optional)</span></Label>
            <Input
              id="idea-image"
              type="url"
              data-testid="idea-image-input"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <Label htmlFor="idea-link">Link URL <span className="text-[#A0A0A0] font-normal">(optional)</span></Label>
            <Input
              id="idea-link"
              type="url"
              data-testid="idea-link-input"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <Button
            type="submit"
            data-testid="submit-idea-btn"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full font-heading text-base"
          >
            {loading ? 'Submitting...' : isEditing ? 'Save Changes' : 'Share with the World!'}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
