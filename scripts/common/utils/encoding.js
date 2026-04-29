export const encodeBase64Unicode = (str) => {
  const utf8Array = new TextEncoder().encode(str);
  const binaryString = String.fromCharCode(...utf8Array);
  return btoa(binaryString);
};
