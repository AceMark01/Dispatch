// Reusable single-party feedback form. No party-name condition — this app is
// used by a single party, so feedback is recorded app-wide.
// Saves each submission as a new row in the Google Sheet "Feedback" tab.
//
// Props:
//   source   — optional label stored to identify where the feedback came from
//              (e.g. "Order Confirm"). Written to the sheet's "Source" column.
//   compact  — tighter styling when embedded (e.g. inside the Thank You screen).

import React, { useState } from 'react';
import { Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { insertRow } from '../utils/api';

const RATING_LABELS = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
const RATING_EMOJIS = ['😞', '🙁', '😐', '🙂', '😍'];

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
      <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
        <CheckCircle2 className="h-5 w-5" />
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className={compact ? 'w-full max-w-md mx-auto space-y-4' : 'space-y-6'}>
      {/* Rating */}
      <div className="text-center">
        {!compact && <p className="text-base font-medium text-slate-700 mb-3">How was your experience?</p>}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-9 w-9 sm:h-10 sm:w-10 transition-colors ${
                  hoverRating >= star || rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-base font-semibold text-slate-800">
            {RATING_LABELS[rating - 1]} {RATING_EMOJIS[rating - 1]}
          </p>
        )}
      </div>

      {/* Liked options — only after a rating is chosen */}
      {rating > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2 text-left">
            {lowRating ? 'What needs improvement?' : 'What did you like?'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {likedOptions.map((opt) => {
              const active = liked.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLiked(opt)}
                  className={`text-left text-sm px-3 py-2 rounded-xl border transition ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white/60 text-slate-700 border-slate-200 hover:border-blue-400'
                  }`}
                >
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
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/70 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none outline-none"
          placeholder="Tell us what you liked or what we can improve..."
        />
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={loading || rating === 0}
        className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition ${
          loading || rating === 0
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg'
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
