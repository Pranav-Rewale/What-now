import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Clock, ThumbsUp, ThumbsDown, Edit2, Trash2, ExternalLink, UserPlus, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getCategoryColor, getCategoryTextColor, getCategoryLabel } from '../utils/constants';
import { Badge } from './ui/badge.jsx';

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

export default function IdeaCard({ idea, onVoteUpdate, onDeleted, index = 0 }) {
  const { user } = useAuth();
  const { openEditForm, followingIds, toggleFollow } = useApp();
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const catBg = getCategoryColor(idea.category);
  const catText = getCategoryTextColor(idea.category);
  const catLabel = getCategoryLabel(idea.category);
  const isAuthor = user && (user.id === idea.author_id || user._id === idea.author_id);
  const canFollow = user && !isAuthor && idea.author_id !== 'system';
  const isFollowing = followingIds.has(idea.author_id);

  const handleVote = async (voteType) => {
    if (!user) { window.location.href = '/auth'; return; }
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
    <motion.div
      data-testid="idea-card"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.045, 0.35) }}
      whileHover={{ y: -6, transition: { duration: 0.22, ease: 'easeOut' } }}
      className="bg-white rounded-[16px] overflow-hidden flex flex-col"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
      onHoverStart={(e) => { e.target.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18)'; }}
      onHoverEnd={(e) => { e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
    >
      {/* Category color bar */}
      <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: catBg }} />

      {/* Optional image */}
      {idea.image_url && (
        <div className="h-44 flex-shrink-0 overflow-hidden">
          <img
            src={idea.image_url}
            alt={idea.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            data-testid="category-badge"
            style={{ backgroundColor: catBg, color: catText }}
          >
            {catLabel}
          </Badge>
          <Badge variant="time" data-testid="time-badge">
            <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
            {idea.time_needed}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-base font-black font-heading text-[#1A1A1A] leading-tight line-clamp-2">
          {idea.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#3C3C3C] font-body leading-relaxed line-clamp-3 flex-1">
          {idea.description}
        </p>

        {/* External link */}
        {idea.link_url && (
          <a
            href={idea.link_url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="idea-link"
            className="flex items-center gap-1 text-xs font-bold text-[#5D2EFF] hover:opacity-75 transition-opacity"
          >
            <ExternalLink className="w-3 h-3" />
            Visit Link
          </a>
        )}

        {/* Author & date */}
        <div className="flex items-center justify-between text-xs text-[#3C3C3C]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold truncate">by {idea.author_name}</span>
            {canFollow && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => toggleFollow(idea.author_id)}
                title={isFollowing ? 'Unfollow' : 'Follow'}
                className={`flex-shrink-0 p-0.5 rounded transition-colors ${isFollowing ? 'text-[#5D2EFF]' : 'text-[#A0A0A0] hover:text-[#5D2EFF]'}`}
              >
                {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              </motion.button>
            )}
          </div>
          <span className="flex-shrink-0 text-[#A0A0A0] ml-2">{formatDate(idea.created_at)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#E6E6E6]" />

        {/* Votes + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Upvote */}
            <motion.button
              whileTap={{ scale: 0.82 }}
              whileHover={{ scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => handleVote('upvote')}
              data-testid="upvote-btn"
              disabled={voting}
              title={user ? 'Upvote' : 'Login to vote'}
              className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-bold border transition-colors disabled:opacity-50 ${
                idea.user_vote === 'upvote'
                  ? 'bg-[#2DFF72] text-[#000000] border-[#2DFF72]'
                  : 'bg-[#FAFAFA] text-[#3C3C3C] border-[#E6E6E6] hover:border-[#2DFF72] hover:text-[#000000]'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{idea.upvotes}</span>
            </motion.button>

            {/* Downvote */}
            <motion.button
              whileTap={{ scale: 0.82 }}
              whileHover={{ scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => handleVote('downvote')}
              data-testid="downvote-btn"
              disabled={voting}
              title={user ? 'Downvote' : 'Login to vote'}
              className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm font-bold border transition-colors disabled:opacity-50 ${
                idea.user_vote === 'downvote'
                  ? 'bg-[#FF4757] text-[#FFFFFF] border-[#FF4757]'
                  : 'bg-[#FAFAFA] text-[#3C3C3C] border-[#E6E6E6] hover:border-[#FF4757] hover:text-[#FF4757]'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{idea.downvotes}</span>
            </motion.button>
          </div>

          {/* Author actions */}
          {isAuthor && (
            <div className="flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => openEditForm(idea)}
                data-testid="edit-idea-btn"
                title="Edit idea"
                className="p-1.5 rounded-[8px] text-[#3C3C3C] hover:bg-[#E6E6E6] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleDelete}
                data-testid="delete-idea-btn"
                disabled={deleting}
                title={confirmDelete ? 'Click again to confirm' : 'Delete idea'}
                className={`p-1.5 rounded-[8px] transition-colors disabled:opacity-50 ${
                  confirmDelete
                    ? 'bg-[#FF4757] text-white'
                    : 'text-[#3C3C3C] hover:bg-[#FFE8EA] hover:text-[#FF4757]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
