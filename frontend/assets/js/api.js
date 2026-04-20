(function () {
  const config = window.ENROLLSCHED_CONFIG || {};
  const apiBaseUrl = String(config.API_BASE_URL || "").replace(/\/$/, "");

  function buildApiUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${apiBaseUrl}${normalizedPath}`;
  }

  window.buildApiUrl = buildApiUrl;

  window.apiFetch = function apiFetch(path, options = {}) {
    return fetch(buildApiUrl(path), {
      credentials: "include",
      ...options,
      headers: {
        ...(options.headers || {})
      }
    });
  };
})();
