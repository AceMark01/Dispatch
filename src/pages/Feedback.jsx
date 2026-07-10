// In-app Feedback tab.
//  - Regular user  → gives feedback (FeedbackForm).
//  - Admin         → sees every feedback submitted (read from the "Feedback" sheet).

import React, { useEffect, useMemo, useState } from 'react';
import { Star, RefreshCw, MessageSquare, Inbox, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fetchSheetData } from '../utils/api';
import FeedbackForm from '../components/FeedbackForm';

const isAdmin = (user) => (user?.role || '').toString().toUpperCase() === 'ADMIN';

const Stars = ({ value }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`h-4 w-4 ${s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
    ))}
  </div>
);

function AdminFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await fetchSheetData('Feedback');
      // Row 0 = header. Columns: Timestamp | Source | Rating | Rating Label | Liked | Remark
      const data = (raw || []).slice(1)
        .filter((r) => r && (r[2] || r[3] || r[5]))
        .map((r) => ({
          timestamp: r[0] || '',
          source: r[1] || '',
          rating: Number(r[2]) || 0,
          label: r[3] || '',
          liked: r[4] || '',
          remark: r[5] || '',
        }))
        .reverse(); // newest first
      setRows(data);
    } catch (err) {
      console.error('Feedback load error:', err);
      setError('Could not load feedback. Make sure a "Feedback" sheet exists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!rows.length) return { count: 0, avg: 0 };
    const sum = rows.reduce((a, r) => a + r.rating, 0);
    return { count: rows.length, avg: (sum / rows.length).toFixed(1) };
  }, [rows]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="text-blue-600" /> Feedback
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Feedback</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{stats.count}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Average Rating</p>
          <p className="text-2xl font-black text-slate-800 mt-1 flex items-center gap-1">
            {stats.avg} <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 gap-2">
            <Loader2 className="animate-spin" /> Loading feedback...
          </div>
        ) : error ? (
          <div className="text-center text-red-600 bg-red-50 rounded-2xl p-6">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <Inbox size={40} /> No feedback yet.
          </div>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="glass rounded-2xl p-4 hover-lift">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Stars value={r.rating} />
                  <span className="font-semibold text-slate-800">{r.label}</span>
                  {r.source && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {r.source}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{r.timestamp}</span>
              </div>
              {r.remark && <p className="text-sm text-slate-700 mt-2">{r.remark}</p>}
              {r.liked && <p className="text-xs text-slate-500 mt-2">Liked: {r.liked}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UserFeedback() {
  return (
    <div className="flex-1 overflow-y-auto flex items-start justify-center p-4">
      <div className="glass-strong rounded-3xl max-w-lg w-full overflow-hidden my-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-7 text-white text-center">
          <h1 className="text-2xl font-bold">Share your feedback</h1>
          <p className="text-blue-100 mt-1">Help us serve you better</p>
        </div>
        <div className="p-6">
          <FeedbackForm source="Feedback Tab" />
        </div>
      </div>
    </div>
  );
}

function Feedback() {
  const { user } = useAuthStore();
  return isAdmin(user) ? <AdminFeedback /> : <UserFeedback />;
}

export default Feedback;
