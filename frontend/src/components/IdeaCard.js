import React, { useState } from 'react';
import axios from 'axios';
import { Clock, ThumbsUp, ThumbsDown, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getCategoryColor, getCategoryLabel } from '../utils/constants';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 2) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function IdeaCard({ idea, onVoteUpdate, onDeleted }) {
  const { user } = useAuth();
  const { openEditForm } = useApp();
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoryColor = getCategoryColor(idea.category);
  const categoryLabel = getCategoryLabel(idea.category);
  const isAuthor = user && (user.id === idea.author_id || user._id === idea.author_id);

  const handleVote = async (voteType) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    if (voting) return;
    setVoting(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/ideas/${idea.id}/vote`,
        { vote_type: voteType },
        { withCredentials: true }
      );
      onVoteUpdate?.(idea.id, data);
    } catch (e) {
      console.error('Vote failed:', e);
    } finally {
      setVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/ideas/${idea.id}`, { withCredentials: true });
      onDeleted?.(idea.id);
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      data-testid="idea-card"
      className="bg-[#FFFFFF] border-2 border-[#0A0A0A] shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 ease-out hover:shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-1"
    >
      {/* Color accent bar */}
      <div className="h-2 w-full flex-shrink-0" style={{ backgroundColor: categoryColor }} />

      {/* Image */}
      {idea.image_url && (
        <div className="relative h-44 border-b-2 border-[#0A0A0A] flex-shrink-0">
          <img
            src={idea.image_url}
            alt={idea.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            data-testid="category-badge"
            className="border-2 border-[#0A0A0A] text-[#0A0A0A] font-bold text-xs uppercase px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] leading-none"
            style={{ backgroundColor: categoryColor }}
          >
            {categoryLabel}
          </span>
          <span
            data-testid="time-badge"
            className="bg-[#FFFFFF] border-2 border-[#0A0A0A] text-[#0A0A0A] font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] leading-none"
          >
            <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={3} />
            {idea.time_needed}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-black font-heading text-[#0A0A0A] leading-tight line-clamp-2">
          {idea.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#334155] font-body font-medium leading-relaxed line-clamp-3 flex-1">
          {idea.description}
        </p>

        {/* Link */}
        {idea.link_url && (
          <a
            href={idea.link_url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="idea-link"
            className="flex items-center gap-1 text-xs font-bold text-[#60A5FA] hover:text-[#3B82F6] underline"
          >
            <ExternalLink className="w-3 h-3" />
            Visit Link
          </a>
        )}

        {/* Author & Date */}
        <div className="flex items-center justify-between text-xs text-[#64748B] font-body">
          <span className="font-bold truncate mr-2">by {idea.author_name}</span>
          <span className="flex-shrink-0">{formatDate(idea.created_at)}</span>
        </div>

        {/* Vote & Actions */}
        <div className="flex items-center justify-between pt-2 border-t-2 border-[#E2E8F0]">
          {/* Vote Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote('upvote')}
              data-testid="upvote-btn"
              disabled={voting}
              title={user ? 'Upvote' : 'Login to vote'}
              className={`flex items-center gap-1.5 border-2 border-[#0A0A0A] rounded-xl px-3 py-1.5 font-bold text-sm transition-all shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 disabled:opacity-50 ${
                idea.user_vote === 'upvote' ? 'bg-[#EF4444] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#0A0A0A]'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{idea.upvotes}</span>
            </button>
            <button
              onClick={() => handleVote('downvote')}
              data-testid="downvote-btn"
              disabled={voting}
              title={user ? 'Downvote' : 'Login to vote'}
              className={`flex items-center gap-1.5 border-2 border-[#0A0A0A] rounded-xl px-3 py-1.5 font-bold text-sm transition-all shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 disabled:opacity-50 ${
                idea.user_vote === 'downvote' ? 'bg-[#3B82F6] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#0A0A0A]'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{idea.downvotes}</span>
            </button>
          </div>

          {/* Edit/Delete - only for author */}
          {isAuthor && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openEditForm(idea)}
                data-testid="edit-idea-btn"
                className="bg-[#FFFFFF] border-2 border-[#0A0A0A] rounded-xl p-1.5 shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 transition-all"
                title="Edit idea"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#0A0A0A]" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleDelete}
                data-testid="delete-idea-btn"
                disabled={deleting}
                title={confirmDelete ? 'Click again to confirm' : 'Delete idea'}
                className={`border-2 border-[#0A0A0A] rounded-xl p-1.5 shadow-[2px_2px_0px_0px_rgba(10,10,10,1)] hover:shadow-[3px_3px_0px_0px_rgba(10,10,10,1)] hover:-translate-y-0.5 transition-all disabled:opacity-50 ${
                  confirmDelete ? 'bg-[#EF4444] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#0A0A0A]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
