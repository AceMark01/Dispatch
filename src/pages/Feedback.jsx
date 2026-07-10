// In-app Feedback tab.
//  - Regular user  → gives feedback (FeedbackForm).
//  - Admin         → sees every feedback submitted (read from the "Feedback" sheet).

import React, { useEffect, useMemo, useState } from 'react';
import { Star, RefreshCw, MessageSquare, Inbox, Loader2, TrendingUp, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fetchSheetData } from '../utils/api';
import FeedbackForm from '../components/FeedbackForm';

const isAdmin = (user) => (user?.role || '').toString().toUpperCase() === 'ADMIN';

// Accent per rating for the admin cards
const accent = (r) =>
  r <= 2
    ? { bar: 'from-rose-500 to-red-500', ring: 'from-rose-400 to-red-500', text: 'text-rose-600', chip: 'bg-rose-100 text-rose-700' }
    : r === 3
      ? { bar: 'from-amber-400 to-yellow-500', ring: 'from-amber-400 to-yellow-500', text: 'text-amber-600', chip: 'bg-amber-100 text-amber-700' }
      : { bar: 'from-emerald-500 to-teal-500', ring: 'from-emerald-400 to-teal-500', text: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700' };

const Stars = ({ value, size = 14 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={s <= value ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'} style={{ width: size, height: size }} />
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
    if (!rows.length) return { count: 0, avg: 0, positive: 0 };
    const sum = rows.reduce((a, r) => a + r.rating, 0);
    const positive = rows.filter((r) => r.rating >= 4).length;
    return {
      count: rows.length,
      avg: (sum / rows.length).toFixed(1),
      positive: Math.round((positive / rows.length) * 100),
    };
  }, [rows]);

  const kpis = [
    { label: 'Total Feedback', value: stats.count, icon: MessageSquare, grad: 'from-blue-500 to-indigo-600' },
    { label: 'Average Rating', value: stats.avg, icon: Star, grad: 'from-amber-400 to-yellow-500', suffix: '★' },
    { label: 'Positive', value: `${stats.positive}%`, icon: TrendingUp, grad: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-black flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl fb-animated-gradient flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <MessageSquare size={20} className="text-white" />
          </span>
          <span className="fb-gradient-text">Feedback</span>
        </h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 backdrop-blur border border-white/60 text-slate-700 font-semibold shadow-sm hover:bg-white hover:-translate-y-0.5 transition-all disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl p-4 hover-lift overflow-hidden relative">
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${k.grad} opacity-20 blur-xl`} />
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.grad} flex items-center justify-center shadow-md mb-2`}>
              <k.icon size={18} className="text-white" />
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5 flex items-center gap-1">
              {k.value}
              {k.suffix && <span className="text-yellow-400 text-lg">{k.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 gap-2">
            <Loader2 className="animate-spin" /> Loading feedback...
          </div>
        ) : error ? (
          <div className="text-center text-red-600 bg-red-50/80 backdrop-blur border border-red-100 rounded-2xl p-6">{error}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-3">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
              <Inbox size={30} />
            </div>
            <p className="font-medium">No feedback yet.</p>
          </div>
        ) : (
          rows.map((r, i) => {
            const a = accent(r.rating);
            return (
              <div
                key={i}
                className="fb-rise glass rounded-2xl overflow-hidden hover-lift flex"
                style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
              >
                {/* rating accent bar */}
                <div className={`w-1.5 shrink-0 bg-gradient-to-b ${a.bar}`} />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      {/* rating avatar */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.ring} flex items-center justify-center text-white font-black shadow-md shrink-0`}>
                        {r.rating}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold ${a.text}`}>{r.label}</span>
                          <Stars value={r.rating} />
                        </div>
                        {r.source && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-indigo-700">
                            {r.source}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{r.timestamp}</span>
                  </div>

                  {r.remark && (
                    <p className="text-sm text-slate-700 mt-3 leading-relaxed bg-white/40 rounded-xl px-3 py-2">
                      “{r.remark}”
                    </p>
                  )}

                  {r.liked && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {r.liked.split(',').map((t) => t.trim()).filter(Boolean).map((t, k) => (
                        <span key={k} className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${a.chip}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UserFeedback() {
  return (
    <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
      <div className="fb-rise glass-strong rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Premium animated header with decorative glow */}
        <div className="fb-animated-gradient px-6 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-10 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Sparkles size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Share your feedback</h1>
            <p className="text-white/80 mt-1 text-sm">We'd love to hear how we're doing</p>
          </div>
        </div>
        <div className="p-6 sm:p-7">
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
