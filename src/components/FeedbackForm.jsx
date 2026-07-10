// Reusable single-party feedback form. No party-name condition — this app is
// used by a single party, so feedback is recorded app-wide.
// Saves each submission as a new row in the Google Sheet "Feedback" tab.
//
// Props:
//   source   — optional label stored to identify where the feedback came from
//              (e.g. "Order Confirm"). Written to the sheet's "Source" column.
//   compact  — tighter styling when embedded (e.g. inside the Thank You screen).

import React, { useState } from 'react';
import { Star, Send, Loader2, CheckCircle2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { insertRow } from '../utils/api';

const RATING_LABELS = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
const RATING_EMOJIS = ['😞', '🙁', '😐', '🙂', '😍'];
// Colour accent per rating (1..5) — drives the label pill gradient
const RATING_GRADIENTS = [
  'from-rose-500 to-red-500',
  'from-orange-500 to-amber-500',
  'from-amber-400 to-yellow-500',
  'from-sky-500 to-blue-500',
  'from-emerald-500 to-teal-500',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n) => String(n).padStart(2, '0');
const stamp = () => {
  const d = new Date();
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${p2(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p2(h)}:${p2(d.getMinutes())} ${ap}`;
};

function FeedbackForm({ source = '', compact = false }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [remark, setRemark] = useState('');
  const [liked, setLiked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const lowRating = rating > 0 && rating <= 2;
  const active = hoverRating || rating;

  const likedOptions = lowRating
    ? ['Product Quality', 'Customer Support', 'Pricing', 'Delivery Speed', 'Product Range']
    : ['Product Quality', 'Customer Service', 'Pricing', 'Delivery Speed', 'Product Variety'];

  const remarkTitle = rating === 0
    ? 'Your remarks (optional)'
    : lowRating
      ? 'What can we improve?'
      : rating === 3
        ? 'Share your thoughts'
        : 'What made it great?';

  const toggleLiked = (opt) =>
    setLiked((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));

  const submit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating first');
      return;
    }
    setLoading(true);
    try {
      // Feedback sheet columns:
      // A Timestamp | B Source | C Rating | D Rating Label | E Liked | F Remark
      const rowData = [
        stamp(),
        source,
        rating,
        RATING_LABELS[rating - 1],
        liked.join(', '),
        remark.trim(),
      ];
      const res = await insertRow(rowData, 'Feedback');
      if (res && res.success === false) throw new Error(res.error || 'Save failed');
      setDone(true);
      toast.success('Thank you for your feedback!');
    } catch (err) {
      console.error('Feedback save error:', err);
      toast.error('Could not save feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="fb-rise flex flex-col items-center justify-center text-center py-6 gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <CheckCircle2 className="h-9 w-9 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <p className="text-lg font-bold text-slate-800">Thanks for your feedback!</p>
        <p className="text-sm text-slate-500 max-w-xs">Your input helps us serve you better. 🙏</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'w-full max-w-md mx-auto space-y-5' : 'space-y-6'}>
      {/* Rating */}
      <div className="text-center">
        {!compact && <p className="text-base font-semibold text-slate-700 mb-4">How was your experience?</p>}
        <div className="flex justify-center gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const on = active >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110 active:scale-90 focus:outline-none"
                aria-label={RATING_LABELS[star - 1]}
              >
                <Star
                  className={`h-10 w-10 sm:h-11 sm:w-11 transition-all duration-200 ${
                    on ? `text-yellow-400 fill-yellow-400 fb-star-active ${rating === star ? 'fb-pop' : ''}` : 'text-slate-300'
                  }`}
                />
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <div className="mt-3 flex justify-center">
            <span className={`fb-pop inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-md bg-gradient-to-r ${RATING_GRADIENTS[rating - 1]}`}>
              <span className="text-base leading-none">{RATING_EMOJIS[rating - 1]}</span>
              {RATING_LABELS[rating - 1]}
            </span>
          </div>
        )}
      </div>

      {/* Liked options — only after a rating is chosen */}
      {rating > 0 && (
        <div className="fb-rise">
          <p className="text-sm font-semibold text-slate-700 mb-2.5 text-left">
            {lowRating ? 'What needs improvement?' : 'What did you like?'}
          </p>
          <div className="flex flex-wrap gap-2">
            {likedOptions.map((opt) => {
              const isOn = liked.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLiked(opt)}
                  className={`inline-flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-full border transition-all duration-200 ${
                    isOn
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/25 scale-[1.02]'
                      : 'bg-white/70 text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {isOn && <Check size={14} strokeWidth={3} />}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Remark */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2 text-left">{remarkTitle}</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={compact ? 2 : 3}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-sm shadow-inner focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400 focus:bg-white/90 resize-none outline-none transition-all placeholder:text-slate-400"
          placeholder="Tell us what you liked or what we can improve..."
        />
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={loading || rating === 0}
        className={`fb-shine w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
          loading || rating === 0
            ? 'bg-slate-300 cursor-not-allowed shadow-none'
            : 'fb-animated-gradient shadow-lg shadow-indigo-500/35 hover:shadow-xl hover:shadow-indigo-500/45 hover:-translate-y-0.5 active:translate-y-0'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="h-5 w-5" /> Submit Feedback
          </>
        )}
      </button>
    </div>
  );
}

export default FeedbackForm;
