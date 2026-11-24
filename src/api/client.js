import axios from 'axios';

// Set VITE_API_URL (e.g. in client/.env.local) to point at a local server; defaults to the deployed backend
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://collabboard-backend-0pgn.onrender.com',
  withCredentials: true
});

// The session token is also sent as a header, because some browsers block the
// cross-site cookie between the Vercel frontend and the Render API
const TOKEN_KEY = 'cb-token';
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (token) => { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// When the session expires anywhere, let the auth context know so it can send the user to /login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// Readable message from an API error
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the API is running.';
  return fallback;
};

export default client;
