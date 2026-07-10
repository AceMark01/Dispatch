// Public single-party feedback form. Reachable without login at /feedback.
// This app is used by a single party, so no party-name condition is needed.
// Submissions are saved to the Google Sheet "Feedback" tab.

import React from 'react';
import FeedbackForm from '../components/FeedbackForm';

function FeedbackPage() {
  return (
    <div className="min-h-[100dvh] overflow-y-auto flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-7 text-white text-center">
          <h1 className="text-2xl font-bold">Share your feedback</h1>
          <p className="text-blue-100 mt-1">Help us serve you better</p>
        </div>

        <div className="p-6">
          <FeedbackForm source="Feedback Page" />
        </div>
      </div>
    </div>
  );
}

export default FeedbackPage;
