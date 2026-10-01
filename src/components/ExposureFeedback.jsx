import React, { useState } from 'react';
import { Star, Send, CheckCircle2 } from 'lucide-react';

export function ExposureFeedback({ routeId, routeName }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    routeId,
                    routeName,
                    rating,
                    comment,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (res.ok) {
                setSubmitted(true);
            }
        } catch (err) {
            console.error('Failed to submit feedback:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Thanks for the feedback! This helps us improve our shade calculations.</span>
            </div>
        );
    }

    return (
        <div className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
                How accurate was this exposure calculation?
            </h4>
            <p className="text-xs text-slate-500 mb-3">
                Let us know if actual route shade matches our calculation.
            </p>

            {/* Star Rating Bar */}
            <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                    >
                        <Star
                            className={`w-6 h-6 ${
                                star <= (hoverRating || rating)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300'
                            }`}
                        />
                    </button>
                ))}
                <span className="text-xs text-slate-500 ml-2 font-medium">
          {rating > 0 ? `${rating} / 5` : 'Select rating'}
        </span>
            </div>

            {/* Comment Input & Submit */}
            {rating > 0 && (
                <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Feedback makes us better and we appreciate your time."
              className="w-full text-xs text-slate-900 placeholder:text-slate-400 p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none outline-none font-normal"
              rows={3}
          />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-3.5 h-3.5" />
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            )}
        </div>
    );
}