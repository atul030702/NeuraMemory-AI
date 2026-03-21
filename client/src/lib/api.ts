import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  console.warn(
    '[api] VITE_API_URL is not set. Falling back to http://localhost:3000. ' +
    'Set VITE_API_URL in your .env file for production builds.',
  );
}

export const api = axios.create({
    baseURL: baseURL ?? 'http://localhost:3000',
    withCredentials: true,
});
