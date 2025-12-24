/**
 * Utility to parse date entities from NER into date ranges
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Parse a date entity string into a date range
 * @param dateEntity - The date entity value from NER (e.g., "tháng này", "quý 1")
 * @returns DateRange object with start and end dates
 */
export function parseDateRange(dateEntity: string): DateRange | null {
  const now = new Date();
  const normalized = dateEntity.toLowerCase().trim();
  console.log("date entity đc pass vào hàm parseDateRange sau khi normalize: ",normalized);
  
  // Tháng này
  if (normalized.includes('tháng này')) {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  // Tháng trước
  if (normalized.includes('tháng trước')) {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }

  // Tháng X năm Y: "tháng 11 năm 2024", "tháng 1 năm 2023"
  const monthYearMatch = normalized.match(/tháng\s*(\d{1,2})\s*năm\s*(\d{4})/);
  if (monthYearMatch) {
    const month = parseInt(monthYearMatch[1]);
    const year = parseInt(monthYearMatch[2]);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    }
  }

  // Tháng X năm ngoái/trước: "tháng 11 năm ngoái", "tháng 5 năm trước"
  const monthLastYearMatch = normalized.match(/tháng\s*(\d{1,2})\s*năm\s*(ngoái|trước)/);
  if (monthLastYearMatch) {
    const month = parseInt(monthLastYearMatch[1]);
    const lastYear = now.getFullYear() - 1;
    if (month >= 1 && month <= 12) {
      return {
        start: new Date(lastYear, month - 1, 1),
        end: new Date(lastYear, month, 0, 23, 59, 59, 999),
      };
    }
  }

  // Tháng X năm nay: "tháng 10 năm nay", "tháng 12 năm nay"
  const monthThisYearMatch = normalized.match(/tháng\s*(\d{1,2})\s*năm\s*nay/);
  if (monthThisYearMatch) {
    const month = parseInt(monthThisYearMatch[1]);
    if (month >= 1 && month <= 12) {
      return {
        start: new Date(now.getFullYear(), month - 1, 1),
        end: new Date(now.getFullYear(), month, 0, 23, 59, 59, 999),
      };
    }
  }

  // Năm cụ thể: "năm 2024", "năm 2023"
  const yearMatch = normalized.match(/năm\s*(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 2000 && year <= 2100) {
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    }
  }

  // Tháng cụ thể: "tháng 1", "tháng 2", ..., "tháng 12" (without year)
  const monthMatch = normalized.match(/tháng\s*(\d{1,2})(?!\s*năm)/);
  if (monthMatch) {
    const month = parseInt(monthMatch[1]);
    if (month >= 1 && month <= 12) {
      // Determine year: if month > current month, assume last year
      const targetYear = month > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
      return {
        start: new Date(targetYear, month - 1, 1),
        end: new Date(targetYear, month, 0, 23, 59, 59, 999),
      };
    }
  }

  // Quý 1-4
  const quarterMatch = normalized.match(/quý\s*(\d)/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    if (quarter >= 1 && quarter <= 4) {
      const startMonth = (quarter - 1) * 3;
      return {
        start: new Date(now.getFullYear(), startMonth, 1),
        end: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
      };
    }
  }

  // Năm nay
  if (normalized.includes('năm nay')) {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    };
  }

  // Năm trước
  if (normalized.includes('năm trước') || normalized.includes('năm ngoái')) {
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
    };
  }

  // Tuần này (Monday to Sunday)
  if (normalized.includes('tuần này')) {
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      start: monday,
      end: sunday,
    };
  }

  // Tuần trước
  if (normalized.includes('tuần trước')) {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    lastMonday.setHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    return {
      start: lastMonday,
      end: lastSunday,
    };
  }

  // If no match, return null
  return null;
}

/**
 * Format a date range into a human-readable Vietnamese string
 * @param range - The date range to format
 * @returns Formatted string
 */
export function formatDateRange(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const startStr = range.start.toLocaleDateString('vi-VN', options);
  const endStr = range.end.toLocaleDateString('vi-VN', options);
  return `${startStr} - ${endStr}`;
}
