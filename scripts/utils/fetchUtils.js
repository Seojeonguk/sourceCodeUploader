export const request = async (
  url,
  method,
  headers,
  body,
  retries = 3,
  timeout = 5000,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    if (
      retries > 0 &&
      (error.name === 'AbortError' || error.name === 'TypeError')
    ) {
      console.warn(`Request failed, retrying... (${retries} retries left)`);
      return request(url, method, headers, body, retries - 1, timeout);
    }

    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
};
