import { Injectable, Logger } from '@nestjs/common';
import { Entity, EntityType } from '../types';
import { ENTITY_PATTERNS } from '../constants';
import { normalizeText } from '../utils';

@Injectable()
export class EntityExtractorService {
  private readonly logger = new Logger(EntityExtractorService.name);

  /**
   * Extract entities from text
   */
  extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    const normalized = normalizeText(text);

    // Extract dates
    entities.push(...this.extractDates(text, normalized));

    // Extract money
    entities.push(...this.extractMoney(text, normalized));

    // Extract crop names
    entities.push(...this.extractCropNames(text, normalized));

    // Extract farm areas
    entities.push(...this.extractFarmAreas(text, normalized));

    // Extract device names
    entities.push(...this.extractDeviceNames(text, normalized));

    this.logger.debug(`Extracted ${entities.length} entities from: "${text}"`);
    return entities;
  }

  /**
   * Extract date entities
   */
  private extractDates(originalText: string, normalized: string): Entity[] {
    const entities: Entity[] = [];

    ENTITY_PATTERNS.DATE.forEach(pattern => {
      const matches = normalized.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        entities.push({
          type: EntityType.DATE,
          value: this.normalizeDateValue(match[0]),
          raw: match[0],
          confidence: 0.9,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
        });
      }
    });

    return entities;
  }

  /**
   * Extract money entities
   */
  private extractMoney(originalText: string, normalized: string): Entity[] {
    const entities: Entity[] = [];

    ENTITY_PATTERNS.MONEY.forEach(pattern => {
      const matches = normalized.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        entities.push({
          type: EntityType.MONEY,
          value: this.normalizeMoneyValue(match[0]),
          raw: match[0],
          confidence: 0.95,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
        });
      }
    });

    return entities;
  }

  /**
   * Extract crop name entities
   */
  private extractCropNames(originalText: string, normalized: string): Entity[] {
    const entities: Entity[] = [];

    ENTITY_PATTERNS.CROP_NAME.forEach(pattern => {
      const matches = normalized.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        entities.push({
          type: EntityType.CROP_NAME,
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.85,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
        });
      }
    });

    return entities;
  }

  /**
   * Extract farm area entities
   */
  private extractFarmAreas(originalText: string, normalized: string): Entity[] {
    const entities: Entity[] = [];

    ENTITY_PATTERNS.FARM_AREA.forEach(pattern => {
      const matches = normalized.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        entities.push({
          type: EntityType.FARM_AREA,
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.9,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
        });
      }
    });

    return entities;
  }

  /**
   * Extract device name entities
   */
  private extractDeviceNames(originalText: string, normalized: string): Entity[] {
    const entities: Entity[] = [];

    ENTITY_PATTERNS.DEVICE_NAME.forEach(pattern => {
      const matches = normalized.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        entities.push({
          type: EntityType.DEVICE_NAME,
          value: match[0].trim(),
          raw: match[0],
          confidence: 0.85,
          position: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
        });
      }
    });

    return entities;
  }

  /**
   * Normalize date value to ISO format
   */
  private normalizeDateValue(dateStr: string): string {
    const normalized = normalizeText(dateStr);

    // Handle relative dates
    const now = new Date();

    if (normalized.includes('hôm nay')) {
      return now.toISOString().split('T')[0];
    }

    if (normalized.includes('hôm qua')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    if (normalized.includes('tuần này')) {
      return 'this_week';
    }

    if (normalized.includes('tuần trước')) {
      return 'last_week';
    }

    if (normalized.includes('tháng này')) {
      return 'this_month';
    }

    const monthMatch = normalized.match(/tháng\s*(\d+)/);
    if (monthMatch) {
      return `month_${monthMatch[1]}`;
    }

    if (normalized.includes('năm này')) {
      return 'this_year';
    }

    const yearMatch = normalized.match(/năm\s*(\d{4})/);
    if (yearMatch) {
      return `year_${yearMatch[1]}`;
    }

    // Handle dd/mm/yyyy format
    const dateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return dateStr;
  }

  /**
   * Normalize money value to number (VNĐ)
   */
  private normalizeMoneyValue(moneyStr: string): string {
    const normalized = normalizeText(moneyStr);

    // Extract number
    const numberMatch = normalized.match(/([\d,\.]+)/);
    if (!numberMatch) return '0';

    let value = parseFloat(numberMatch[1].replace(/,/g, ''));

    // Handle units
    if (normalized.includes('tỷ')) {
      value *= 1000000000;
    } else if (normalized.includes('triệu') || normalized.includes('tr')) {
      value *= 1000000;
    } else if (normalized.includes('k')) {
      value *= 1000;
    }

    return value.toString();
  }
}


