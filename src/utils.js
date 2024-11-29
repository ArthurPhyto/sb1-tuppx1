export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function isSameDomain(domain1, domain2) {
  if (!domain1 || !domain2) return false;
  return domain1.toLowerCase() === domain2.toLowerCase();
}