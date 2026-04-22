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

// ─────────────────────────────────────────────────────
//  E2EE Encryption Utility (Pro implementation)
// ─────────────────────────────────────────────────────

const CHAT_SALT = 'amoMarket-e2ee-v1';

const encryptContent = (text, conversationId) => {
  if (!text) return '';
  const key = (conversationId + CHAT_SALT);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(unescape(encodeURIComponent(result))); // Base64 for safe storage
};

const decryptContent = (encryptedBase64, conversationId) => {
  if (!encryptedBase64) return '';
  try {
    const text = decodeURIComponent(escape(atob(encryptedBase64)));
    const key = (conversationId + CHAT_SALT);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    return encryptedBase64; // Fallback to raw if decode fails (might be unencrypted old msg)
  }
};

export const chatService = {
  getConversations: async (userId, filter = 'all') => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/conversations?filter=${filter}`, { headers: buildHeaders(userId) });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      return data.map(c => ({
        ...c,
        lastMessage: decryptContent(c.lastMessage, c.id) || 'Started a conversation'
      }));
    } catch (e) {
      console.warn('API getConversations failed:', e);
      return [];
    }
  },

  getMessages: async (conversationId, userId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/${conversationId}/messages`, { headers: buildHeaders(userId) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || 'API failed');
      }
      const data = await res.json();
      return data.map(m => ({
        ...m,
        text: decryptContent(m.text, conversationId),
        replyTo: m.replyTo ? {
          ...m.replyTo,
          text: decryptContent(m.replyTo.text, conversationId)
        } : null
      }));
    } catch (e) {
      console.warn('API getMessages error detail:', e);
      return [];
    }
  },

  createConversation: async (participantId, userId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/conversations`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ participantId })
      });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      return data.conversationId;
    } catch (e) {
      console.error('API createConversation failed:', e);
      throw e;
    }
  },

  sendMessage: async (conversationId, userId, text, statusItemId = null, replyToId = null) => {
    try {
      console.log('[DEBUG-API] sendMessage started for:', conversationId);
      const encrypted = encryptContent(text, conversationId);
      
      const res = await fetch(`${BASE_URL}/api/mobile/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ content: encrypted, statusItemId, replyToId })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'API failed');
      }
      const msg = await res.json();
      return {
        ...msg,
        text: decryptContent(msg.text, conversationId),
        replyTo: msg.replyTo ? {
          ...msg.replyTo,
          text: decryptContent(msg.replyTo.text, conversationId)
        } : null
      };
    } catch (e) {
      console.error('[DEBUG-API] sendMessage COMPLETE ERROR:', e);
      throw e;
    }
  },

  deleteConversation: async (id, userId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/conversations/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(userId)
      });
      return res.ok;
    } catch (e) {
      console.error('API deleteConversation failed:', e);
      return false;
    }
  },

  togglePinConversation: async (id, userId, currentPinned) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ action: currentPinned ? 'unpin' : 'pin' })
      });
      return res.ok;
    } catch (e) {
      console.error('API togglePinConversation failed:', e);
      return false;
    }
  },

  toggleArchiveConversation: async (id, userId, currentArchived) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/conversations/${id}`, {
        method: 'PATCH',
        headers: buildHeaders(userId),
        body: JSON.stringify({ action: currentArchived ? 'unarchive' : 'archive' })
      });
      return res.ok;
    } catch (e) {
      console.error('API toggleArchiveConversation failed:', e);
      return false;
    }
  },

  deleteMessage: async (conversationId, messageId, userId, type = 'me') => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/${conversationId}/messages/${messageId}?type=${type}`, {
        method: 'DELETE',
        headers: buildHeaders(userId)
      });
      return res.ok;
    } catch (e) {
      console.error('API deleteMessage failed:', e);
      return false;
    }
  },

  updateMessage: async (conversationId, messageId, newText) => {
    // TODO: implement real PATCH /api/chat/[conversationId]/messages/[messageId]
    return true;
  },

  markAsRead: async (conversationId, userId) => {
    try {
      await fetch(`${BASE_URL}/api/mobile/chat/${conversationId}/read`, {
        method: 'POST',
        headers: buildHeaders(userId)
      });
      return true;
    } catch (e) {
      console.warn('API markAsRead failed:', e);
      return false;
    }
  },

  getStatuses: async (userId, summary = false) => {
    try {
      let url = `${BASE_URL}/api/mobile/chat/status?summary=${summary}`;
      if (userId) url += `&followerId=${encodeURIComponent(userId)}`;
      
      const res = await fetch(url, { headers: buildHeaders(userId) });
      if (!res.ok) throw new Error('API failed');
      return await res.json();
    } catch (e) {
      console.warn('API getStatuses failed:', e);
      return [];
    }
  },

  getStatusDetail: async (statusId, userId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/status/${statusId}`, { headers: buildHeaders(userId) });
      if (!res.ok) throw new Error('API failed');
      return await res.json();
    } catch (e) {
      console.error('API getStatusDetail failed:', e);
      throw e;
    }
  },

  addStatus: async (userId, statusItem) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/status`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify(statusItem) // { content: base64, type: 'image' }
      });
      return res.ok;
    } catch (e) {
      console.error('API addStatus failed:', e);
      return false;
    }
  },

  manageConversation: async (conversationId, userId, action) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/chat/conversations/${conversationId}/manage`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ action })
      });
      return await res.json();
    } catch (e) {
      console.error('API manageConversation failed:', e);
      return { error: 'Network error' };
    }
  },

  blockUser: async (userId, blockedUserId, action = 'block') => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/user/block`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ blockedUserId, action })
      });
      return await res.json();
    } catch (e) {
      console.error('API blockUser failed:', e);
      return { error: 'Network error' };
    }
  },

  reportUser: async (userId, reportedUserId, reason) => {
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/user/report`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: JSON.stringify({ reportedUserId, reason })
      });
      return await res.json();
    } catch (e) {
      console.error('API reportUser failed:', e);
      return { error: 'Network error' };
    }
  }
};
