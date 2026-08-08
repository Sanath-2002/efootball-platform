import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationApi } from '../services/api';
import type { Competition } from '../services/api';
import { FollowerCount } from './FollowerCount';

interface FollowButtonProps {
  competition: Pick<Competition, 'id' | 'isFollowing' | 'followerCount'>;
  onChange?: (isFollowing: boolean, followerCount: number) => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  competition,
  onChange,
  className = '',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(competition.isFollowing ?? false);
  const [followerCount, setFollowerCount] = useState(competition.followerCount ?? 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(competition.isFollowing ?? false);
    setFollowerCount(competition.followerCount ?? 0);
  }, [competition.isFollowing, competition.followerCount]);

  const toggle = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoading(true);
    try {
      const res = isFollowing
        ? await notificationApi.unfollow(competition.id)
        : await notificationApi.follow(competition.id);
      setIsFollowing(res.data.isFollowing);
      setFollowerCount(res.data.followerCount);
      onChange?.(res.data.isFollowing, res.data.followerCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={toggle}
        disabled={loading}
        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors disabled:opacity-50 ${
          isFollowing
            ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {loading ? '...' : isFollowing ? 'Following' : 'Follow Tournament'}
      </button>
      <FollowerCount count={followerCount} />
    </div>
  );
};
