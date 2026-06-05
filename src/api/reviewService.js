import { API_BASE_URL } from '@env';

const BASE_URL = API_BASE_URL;

const commonHeaders = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const buildHeaders = (userId) => ({
  ...commonHeaders,
  'x-user-id': userId,
});

const fetchWithTimeout = (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(res => { clearTimeout(timer); return res; })
    .catch(err => {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
      throw err;
    });
};

export const reviewService = {
  // GET /api/seller/reviews — all reviews for the current seller with analytics
  getSellerReviews: async (userId, { rating, search, productId } = {}) => {
    try {
      const params = new URLSearchParams();
      if (rating && rating !== 'all') params.append('rating', rating);
      if (search) params.append('search', search);
      if (productId) params.append('productId', productId);

      const url = `${BASE_URL}/api/seller/reviews${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: buildHeaders(userId),
      }, 15000);
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to load reviews (${response.status})`);
      return data;
    } catch (error) {
      console.error('getSellerReviews error:', error);
      throw error;
    }
  },

  // POST /api/reviews/[id]/helpful — toggle helpful vote (adds or removes)
  markHelpful: async (userId, reviewId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) {
        throw new Error(data.error || `Failed to vote (${response.status})`);
      }
      // data.voted = true (added) or false (removed)
      return { success: true, voted: data.voted };
    } catch (error) {
      console.error('markHelpful error:', error);
      throw error;
    }
  },

  // PATCH /api/reviews/[id] — seller posts or updates reply on a review
  replyToReview: async (userId, reviewId, reply) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ reply }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to post reply (${response.status})`);
      return data;
    } catch (error) {
      console.error('replyToReview error:', error);
      throw error;
    }
  },

  // PATCH /api/reviews/[id] — buyer edits their own review
  editReview: async (userId, reviewId, { rating, comment }) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ rating, comment }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to update review (${response.status})`);
      return data;
    } catch (error) {
      console.error('editReview error:', error);
      throw error;
    }
  },

  // GET /api/products/[id]/reviews — public reviews for a product (buyer-facing)
  getProductReviews: async (productId, userId) => {
    try {
      const headers = userId ? buildHeaders(userId) : commonHeaders;
      const response = await fetchWithTimeout(`${BASE_URL}/api/products/${productId}/reviews`, {
        method: 'GET',
        headers,
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to load reviews (${response.status})`);
      return data;
    } catch (error) {
      console.error('getProductReviews error:', error);
      throw error;
    }
  },

  // POST /api/products/[id]/reviews — buyer submits a review
  submitReview: async (productId, userId, { rating, comment, orderId }) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ rating, comment, orderId }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to submit review (${response.status})`);
      return data;
    } catch (error) {
      console.error('submitReview error:', error);
      throw error;
    }
  },

  // DELETE /api/reviews/[id] — buyer deletes their review
  deleteReview: async (userId, reviewId) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error(`Invalid response: ${text.slice(0, 100)}`); }
      if (!response.ok) throw new Error(data.error || `Failed to delete review (${response.status})`);
      return data;
    } catch (error) {
      console.error('deleteReview error:', error);
      throw error;
    }
  },
};
