import { API_BASE_URL } from '@env';

const BASE_URL = `${API_BASE_URL}/api/locations`;

const fetchList = async (params) => {
  try {
    const qs = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}?${qs}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    const json = await response.json();
    return json.data ?? [];
  } catch (error) {
    console.error('fetchList error:', error);
    return [];
  }
};

export const locationService = {
  fetchProvinces: () => fetchList({ type: 'provinces' }),
  fetchDistricts: (p) => fetchList({ type: 'districts', p }),
  fetchSectors: (p, d) => fetchList({ type: 'sectors', p, d }),
  fetchCells: (p, d, s) => fetchList({ type: 'cells', p, d, s }),
  fetchVillages: (p, d, s, c) => fetchList({ type: 'villages', p, d, s, c }),
};
