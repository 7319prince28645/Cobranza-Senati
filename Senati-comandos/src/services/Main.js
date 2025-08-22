import axios from 'axios';

const BASE_URL = import.meta.env.VITE_URL_API_LOCAL;

const api = axios.create({
    baseURL: BASE_URL,
});

export default api;
