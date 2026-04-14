import { API_BASE_URL } from '@env';

// AI validation is proxied through the amomarket Next.js backend.
// This is essential so real devices (not just simulators) can reach the AI server.
// The proxy at /api/seller/kyc/validate-image forwards requests to localhost:8000.
const BASE_URL = API_BASE_URL;

const commonHeaders = {
  'Content-Type': 'application/json',
};

export const aiService = {
  /**
   * Validates a KYC image (id or selfie) via the AI server proxy.
   * @param {string} base64 - Base64 encoded image string
   * @param {'id'|'selfie'} imageType - Type of image
   * @param {string|null} idNumber - National ID number to verify against OCR
   * @param {string|null} dateOfBirth - Date of birth (YYYY-MM-DD) to verify against OCR
   */
  validateImage: async (base64, imageType, idNumber = null, dateOfBirth = null) => {
    try {
      const response = await fetch(`${BASE_URL}/api/seller/kyc/validate-image`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          image: base64,
          image_type: imageType, // "selfie" or "id"
          id_number: idNumber || undefined,
          date_of_birth: dateOfBirth || undefined,
        }),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { valid: false, reason: text }; }

      if (!response.ok) throw new Error(data.reason || 'AI validation failed');
      return data;
    } catch (error) {
      console.error('AI validateImage error:', error);
      throw error;
    }
  }
};
