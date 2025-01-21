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
      console.debug(`Response : `, await response.json());
      console.debug(`Reuqest url : ${url}`);
      console.debug(`Request method : ${method}`);
      console.debug(`Reuqest headers : `, headers);
      console.debug(`Reuqest body : `, body);
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

export const createGithubAuthHeader = (token) => {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };
};
