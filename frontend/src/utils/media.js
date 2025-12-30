const resolveMediaUrl = (url) => {
  if (!url) {
    return null;
  }
  if (url.startsWith('http://') && window.location.protocol === 'https:') {
    return url.replace('http://', 'https://');
  }
  if (url.startsWith('/')) {
    const baseUrl = process.env.REACT_APP_API_URL || '';
    return `${baseUrl}${url}`;
  }
  return url;
};

export { resolveMediaUrl };
