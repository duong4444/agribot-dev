/**
 * Text Processing Utilities
 */

/**
 * Normalize Vietnamese text
 * - Convert to lowercase
 * - Remove extra whitespaces
 * - Normalize unicode (NFC)
 */
// Tác dụng: Chuẩn hóa mã Unicode về dạng NFC (Normalization Form C).
// Ví dụ: Trong tiếng Việt, chữ "á" có thể được viết bằng 1 ký tự (\u00E1) 
// hoặc 2 ký tự ghép (a + dấu sắc). Hàm này ép tất cả về dạng chuẩn 1 ký tự.
// Mục đích: Đảm bảo các từ tiếng Việt hiển thị giống nhau thì mã bên dưới cũng giống hệt nhau,
//  tránh lỗi so sánh chuỗi.
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
 * Calculate text similarity using multiple algorithms
 * Returns weighted average of Jaccard, Cosine, and Levenshtein
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const jaccard = jaccardSimilarity(text1, text2);
  const cosine = cosineSimilarity(text1, text2);
  const levenshtein = levenshteinSimilarity(text1, text2);

  // Weighted average: Jaccard (40%), Cosine (40%), Levenshtein (20%)
  return jaccard * 0.4 + cosine * 0.4 + levenshtein * 0.2;
}

/**
 * Jaccard similarity (set-based)
 */
export function jaccardSimilarity(text1: string, text2: string): number {
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
 * Cosine similarity (vector-based)
 */
export function cosineSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  // Build vocabulary
  const vocabulary = new Set([...tokens1, ...tokens2]);
  
  // Create frequency vectors
  const vector1: number[] = [];
  const vector2: number[] = [];

  vocabulary.forEach(token => {
    vector1.push(tokens1.filter(t => t === token).length);
    vector2.push(tokens2.filter(t => t === token).length);
  });

  // Calculate dot product
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Levenshtein distance similarity (character-based)
 */
export function levenshteinSimilarity(text1: string, text2: string): number {
  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * BM25 scoring for ranking (used in search)
 */
export function calculateBM25Score(
  query: string,
  document: string,
  avgDocLength: number,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const queryTokens = tokenize(query);
  const docTokens = tokenize(document);
  const docLength = docTokens.length;

  let score = 0;

  queryTokens.forEach(term => {
    const termFreq = docTokens.filter(t => t === term).length;
    
    if (termFreq > 0) {
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
      score += numerator / denominator;
    }
  });

  return score;
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


