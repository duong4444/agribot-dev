/**
 * Text Processing Utilities
 */

/**
 * Normalize Vietnamese text
 * - Convert to lowercase
 * - Remove extra whitespaces
 * - Normalize unicode (NFC)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text (simple word-based)
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(/\s+/).filter(token => token.length > 0);
}

/**
 * Remove Vietnamese accents/diacritics
 */
export function removeVietnameseAccents(text: string): string {
  const AccentsMap: Record<string, string> = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
  };

  let result = text;
  Object.keys(AccentsMap).forEach(key => {
    const regex = new RegExp(key, 'g');
    result = result.replace(regex, AccentsMap[key]);
  });

  return result;
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));

  const intersection = new Set(
    [...tokens1].filter(token => tokens2.has(token))
  );

  const union = new Set([...tokens1, ...tokens2]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Extract sentences from text
 */
export function extractSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Truncate text to max length
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Count tokens (approximate)
 */
export function countTokens(text: string): number {
  // Simple approximation: Vietnamese ~1.3 tokens per word
  const words = tokenize(text);
  return Math.ceil(words.length * 1.3);
}

/**
 * Chunk text into smaller pieces
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const tokens = tokenize(text);
  const chunks: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const chunk = tokens.slice(i, i + chunkSize);
    chunks.push(chunk.join(' '));
    i += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Extract keywords from text (simple frequency-based)
 */
export function extractKeywords(text: string, topN: number = 5): string[] {
  const STOP_WORDS = new Set([
    'là', 'của', 'và', 'có', 'được', 'trong', 'với', 'cho', 'này', 'đó',
    'các', 'một', 'những', 'để', 'từ', 'trên', 'theo', 'như', 'khi', 'nếu',
  ]);

  const tokens = tokenize(text).filter(
    token => !STOP_WORDS.has(token) && token.length > 2
  );

  const frequency: Record<string, number> = {};
  tokens.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Highlight text matches
 */
export function highlightMatches(
  text: string,
  query: string,
  highlightTag: string = '<mark>'
): string {
  const queryTokens = tokenize(query);
  let result = text;

  queryTokens.forEach(token => {
    const regex = new RegExp(`\\b${token}\\b`, 'gi');
    result = result.replace(
      regex,
      `${highlightTag}$&${highlightTag.replace('<', '</')}`
    );
  });

  return result;
}


