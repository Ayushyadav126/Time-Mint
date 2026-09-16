import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  CheckCircleIcon, 
  SearchIcon, 
  LightbulbIcon 
} from '../components/Icons';
import { 
  subscribeToRequests, 
  createRequest, 
  toggleUpvote, 
  getMyUpvotedIds, 
  ensureSignedIn 
} from '../firebase/requests';

export const RequestsPage = ({ navigateTo }) => {
  const [filter, setFilter] = useState('popular'); // 'replied' | 'popular' | 'newest'
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upvotedIds, setUpvotedIds] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lazily sign in anonymously when Requests page mounts (isolated to this page)
  useEffect(() => {
    ensureSignedIn().catch((err) => {
      console.warn('[RequestsPage] Anonymous sign-in deferred or offline:', err);
    });
  }, []);

  // Subscribe to live Firestore requests based on active filter tab
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToRequests(
      filter,
      (items) => {
        setRequestsList(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[RequestsPage] Error subscribing to requests:', err);
        setLoading(false);
        if (err?.message && err.message.includes('create an index')) {
          setError(`Firestore composite index required for "${filter}" tab. Auto-create link logged in console.`);
        } else {
          setError("Can't reach the board right now — check your connection.");
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [filter]);

  // Subscribe to current user's upvoted status for currently-visible requests
  useEffect(() => {
    const requestIds = requestsList.map((r) => r.id);
    const unsubscribe = getMyUpvotedIds(requestIds, (activeSet) => {
      setUpvotedIds(activeSet);
    });

    return () => {
      unsubscribe();
    };
  }, [requestsList]);

  const handleToggleUpvote = async (id) => {
    try {
      await toggleUpvote(id);
    } catch (err) {
      console.error('[RequestsPage] Failed to toggle upvote:', err);
    }
  };

  const handleAddRequest = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createRequest({
        title: newTitle,
        description: newDesc
      });
      setNewTitle('');
      setNewDesc('');
      setShowSubmitModal(false);
      setFilter('newest'); // Switch to newest to see the newly added request
    } catch (err) {
      console.error('[RequestsPage] Failed to create request:', err);
      alert("Could not post request. Please check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Section Title - Dynamically matches selected tab
  let sectionTitle = 'Popular requests';
  if (filter === 'replied') {
    sectionTitle = 'Developer replied requests';
  } else if (filter === 'newest') {
    sectionTitle = 'Newest requests';
  } else {
    sectionTitle = 'Popular requests';
  }

  return (
    <div className="dashboard-content">
      {/* Hero Headline */}
      <h1 className="dashboard-headline">Shape what comes next.</h1>

      {/* Top Banner: Submit a feature request */}
      <div className="submit-request-banner">
        <div className="submit-banner-header">
          <h2>Submit a feature request</h2>
          <button 
            className="plus-round-btn" 
            onClick={() => setShowSubmitModal(true)}
            aria-label="Create new request"
          >
            <PlusIcon color="#1c1f1e" size={16} />
          </button>
        </div>
      </div>

      {/* Search / Similar Ideas Hint Pill (Matches Requests.png) */}
      <div className="req-search-hint-box">
        <SearchIcon color="#8b93a1" size={18} />
        <span>We’ll show similar ideas before you post, so votes stay together.</span>
      </div>

      {/* Filter Tabs: Replied | Popular | Newest */}
      <div className="requests-filter-pills">
        <button 
          className={`filter-pill-btn ${filter === 'replied' ? 'active' : ''}`}
          onClick={() => setFilter('replied')}
        >
          Replied
        </button>
        <button 
          className={`filter-pill-btn ${filter === 'popular' ? 'active' : ''}`}
          onClick={() => setFilter('popular')}
        >
          Popular
        </button>
        <button 
          className={`filter-pill-btn ${filter === 'newest' ? 'active' : ''}`}
          onClick={() => setFilter('newest')}
        >
          Newest
        </button>
      </div>

      {/* Section Title - Dynamically matches selected tab */}
      <div className="requests-section-title">{sectionTitle}</div>

      {/* Requests Feed */}
      <div className="framer-requests-list">
        {loading ? (
          <div className="framer-request-card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Loading requests...
          </div>
        ) : error ? (
          <div className="framer-request-card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>Can’t reach the board right now</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {error.includes('index') ? error : 'Check your connection and try again.'}
            </p>
          </div>
        ) : requestsList.length === 0 ? (
          <div className="framer-request-card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {filter === 'replied' ? 'No developer replies yet.' : 'No feature requests yet. Be the first to submit an idea!'}
          </div>
        ) : (
          requestsList.map((req) => {
            const isUpvoted = upvotedIds.has(req.id);
            const displayStatus = (req.status || 'under_review').replace(/_/g, ' ').toUpperCase();
            const statusClass = (req.status || 'under_review').toLowerCase().replace(/_/g, '-');
            const description = req.description || req.desc || '';
            const hasDevReply = req.hasReply || req.hasReplied;
            // developerReply is a map { text, decision, repliedAt } per the schema,
            // not a plain string — extract .text, with a safe fallback in case it
            // ever arrives as a plain string instead (e.g. legacy/manually-entered data).
            const replyText = (req.developerReply && typeof req.developerReply === 'object')
              ? req.developerReply.text
              : (req.developerReply || req.devReply);

            return (
              <div key={req.id} className="framer-request-card">
                <div className="req-card-top-row">
                  <h3 className="req-card-title">{req.title}</h3>
                  <button 
                    className={`req-upvote-chip ${isUpvoted ? 'active' : ''}`}
                    onClick={() => handleToggleUpvote(req.id)}
                    aria-label={`Upvote request, current count: ${req.upvoteCount ?? req.upvotes ?? 0}`}
                  >
                    <span className="req-plus">+</span>
                    <span className="req-count">{req.upvoteCount ?? req.upvotes ?? 0}</span>
                  </button>
                </div>

                <div className="req-status-badge-row">
                  <span className={`status-tag ${statusClass}`}>
                    {displayStatus}
                  </span>
                </div>

                {description && <p className="req-card-desc">{description}</p>}

                {hasDevReply && replyText && (
                  <div className="framer-dev-reply-box">
                    <span className="dev-reply-badge">DEVELOPER REPLY</span>
                    <p className="dev-reply-text">{replyText}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Guidelines Card: A useful request is specific (Matches Requests.png dark card) */}
      <div className="info-guide-card dark-card">
        <h2>
          <LightbulbIcon color="#c79b3b" size={20} />
          A useful request is specific
        </h2>
        <div className="guide-points-list">
          <div className="guide-check-item">
            <CheckCircleIcon color="#4b7f6b" size={16} />
            <span>Describe the moment where the current flow breaks.</span>
          </div>
          <div className="guide-check-item">
            <CheckCircleIcon color="#4b7f6b" size={16} />
            <span>Upvote a match instead of splitting the conversation.</span>
          </div>
          <div className="guide-check-item">
            <CheckCircleIcon color="#4b7f6b" size={16} />
            <span>Developer decisions include the reason, even when the answer is no.</span>
          </div>
        </div>
      </div>

      {/* Submit Idea Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowSubmitModal(false); }}>
          <div className="modal-card">
            <h2>Submit a Feature Request</h2>
            <form onSubmit={handleAddRequest} className="request-form">
              <input 
                type="text" 
                placeholder="Feature Title (e.g. Pomodoro Audio Cues)" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="form-input"
                required
                autoFocus
              />
              <textarea 
                placeholder="Explain what problem this solves..." 
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="form-textarea"
                rows="3"
              />
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="modal-cancel-btn" 
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="modal-confirm-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
