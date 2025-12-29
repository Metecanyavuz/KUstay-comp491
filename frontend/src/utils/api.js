// API utility functions
// Handles base URL automatically for development and production

const getApiUrl = (path) => {
  // If path starts with '/', it's relative
  if (path.startsWith('/')) {
    // In production with REACT_APP_API_URL set, prepend it
    // In development, use empty string (proxy handles it)
    const baseUrl = process.env.REACT_APP_API_URL || '';
    return `${baseUrl}${path}`;
  }
  // If path is absolute URL, return as-is
  return path;
};

// Enhanced fetch that handles API URL automatically
const apiFetch = (path, options = {}) => {
  const url = getApiUrl(path);
  return fetch(url, options);
};

export { getApiUrl, apiFetch };
export default apiFetch;
