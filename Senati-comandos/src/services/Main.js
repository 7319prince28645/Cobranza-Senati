import axios from 'axios';
import { getApiUrl } from "./apiConfig";

const BASE_URL = getApiUrl();

const api = axios.create({
    baseURL: BASE_URL,
});

export default api;
