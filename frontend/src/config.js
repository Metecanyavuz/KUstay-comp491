// API Configuration
// In production, use REACT_APP_API_URL environment variable
// In development, use proxy (localhost:8000)

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export { API_BASE_URL };
