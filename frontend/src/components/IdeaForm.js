import React, { useState } from 'react';
import axios from 'axios';
import { X, Clock, Image, Link } from 'lucide-react';
import { CATEGORIES, TIME_OPTIONS } from '../utils/constants';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function formatError(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).join(' ');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        data-testid="idea-form-modal"
        className="bg-[#FFFDF7] border-2 border-[#0A0A0A] shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-[#0A0A0A] sticky top-0 bg-[#FFFDF7] z-10">
          <h2 className="text-xl font-black font-heading text-[#0A0A0A]">
            {isEditing ? 'Edit Idea' : 'Share an Idea!'}
          </h2>
          <button
            onClick={onClose}
            data-testid="close-form-btn"
            className="bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 transition-all"
          >
            <X className="w-5 h-5 text-[#0A0A0A]" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div data-testid="form-error" className="bg-red-50 border-2 border-red-500 text-red-700 p-3 rounded-xl text-sm font-semibold font-body">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">Title *</label>
            <input
              type="text"
              data-testid="idea-title-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What's the idea?"
              required
              maxLength={100}
              className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">Description *</label>
            <textarea
              data-testid="idea-description-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the idea in detail..."
              required
              rows={4}
              maxLength={1000}
              className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">Category *</label>
            <div className="flex flex-wrap gap-2" data-testid="category-selector">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  data-testid={`category-${cat.value}`}
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`border-2 border-[#0A0A0A] font-bold text-xs uppercase px-3 py-2 rounded-full transition-all ${
                    form.category === cat.value
                      ? 'shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] -translate-y-0.5'
                      : 'bg-[#FFFFFF] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5'
                  }`}
                  style={{ backgroundColor: form.category === cat.value ? cat.bg : '#FFFFFF' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Needed */}
          <div>
            <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading flex items-center gap-1">
              <Clock className="w-4 h-4 inline" strokeWidth={2.5} />
              Time Needed *
            </label>
            <div className="flex flex-wrap gap-2" data-testid="time-selector">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  type="button"
                  data-testid={`time-${time.replace(/\s/g, '-')}`}
                  onClick={() => setForm({ ...form, time_needed: time })}
                  className={`border-2 border-[#0A0A0A] font-bold text-sm px-4 py-2 rounded-full transition-all ${
                    form.time_needed === time
                      ? 'bg-[#0A0A0A] text-[#FFFFFF] shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] -translate-y-0.5'
                      : 'bg-[#FFFFFF] text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">
              <Image className="w-4 h-4 inline mr-1" strokeWidth={2.5} />
              Image URL <span className="text-[#64748B] font-normal">(optional)</span>
            </label>
            <input
              type="url"
              data-testid="idea-image-input"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)]"
            />
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-bold text-[#0A0A0A] mb-2 font-heading">
              <Link className="w-4 h-4 inline mr-1" strokeWidth={2.5} />
              Link URL <span className="text-[#64748B] font-normal">(optional)</span>
            </label>
            <input
              type="url"
              data-testid="idea-link-input"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder="https://example.com"
              className="w-full bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-[#FACC15]/50 font-body font-medium text-[#0A0A0A] shadow-[2px_2px_0px_0px_rgba(10,10,10,1)]"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            data-testid="submit-idea-btn"
            disabled={loading}
            className="w-full bg-[#FACC15] text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-[6px_6px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1 hover:-translate-x-1 font-bold transition-all py-3 rounded-xl font-heading text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : isEditing ? 'Save Changes' : 'Share with the World!'}
          </button>
        </form>
      </div>
    </div>
  );
}
