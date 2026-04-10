import { API_BASE_URL } from '@env';

// In a real production environment, AI_BASE_URL would be in .env 
// Falling back to localhost:8000 for local development with amo_ai
const AI_BASE_URL = 'http://localhost:8000'; 

const commonHeaders = {
  'Content-Type': 'application/json',
};

export const aiService = {
  validateImage: async (base64, imageType, idNumber = null) => {
    try {
      const response = await fetch(`${AI_BASE_URL}/kyc/validate-image`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({
          image: base64,
          image_type: imageType, // "selfie" or "id"
          id_number: idNumber
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.reason || 'AI validation failed');
      return data;
    } catch (error) {
      console.error('AI validateImage error:', error);
      throw error;
    }
  }
};
