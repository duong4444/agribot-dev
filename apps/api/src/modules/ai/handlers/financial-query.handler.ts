import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FarmActivity, ActivityType } from '../../farms/entities/farm-activity.entity';
import { Farm } from '../../farms/entities/farm.entity';
import { Entity } from '../types';
import { parseDateRange, formatDateRange } from '../utils/date-parser.util';

export interface FinancialQueryResult {
  success: boolean;
  message: string;
  data?: {
    revenue: number;
    cost: number;
    profit: number;
    period: string;
  };
}

@Injectable()
export class FinancialQueryHandler {
  private readonly logger = new Logger(FinancialQueryHandler.name);

  constructor(
    @InjectRepository(FarmActivity)
    private readonly activityRepository: Repository<FarmActivity>,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
  ) {}

  async handle(
    userId: string,
    entities: Entity[],
    message: string,
  ): Promise<FinancialQueryResult> {

    // Extract date entities
    const dateEntities = entities.filter(e => e.type === 'date');
    let dateString = '';

    // Check if we have separate "month" and "year" entities
    // NER extract ra 2 entities: tháng 11 và năm 2024
    const monthEntity = dateEntities.find(e => e.value.toLowerCase().includes('tháng'));
    const yearEntity = dateEntities.find(e => e.value.toLowerCase().includes('năm'));

    if (monthEntity && yearEntity && !monthEntity.value.includes('năm')) {
      // Merge them: "tháng 11" + "năm 2024" -> "tháng 11 năm 2024"
      dateString = `${monthEntity.value} ${yearEntity.value}`;
      console.log("Merged date entities:", dateString);
    } else if (dateEntities.length > 0) {
      console.log("case này");
      
      // Use the first (or most relevant) entity
      dateString = dateEntities[0].value;
    } else {
      return {
        success: false,
        message: 'Vui lòng truy cập trang tài chính của nông trại để biết thêm chi tiết!',
      };
    }

    // Parse date range
    const dateRange = parseDateRange(dateString);
    console.log("dateRange_ trong FinancialQueryHandler: ", dateRange);
    
    if (!dateRange) {
      return {
        success: false,
        // message: `Tôi không hiểu khoảng thời gian "${dateEntity.value}". Vui lòng thử lại với "tháng này", "quý 1-4", "năm nay", hoặc "tuần này".`,
        message: "Vui lòng truy cập trang tài chính của nông trại để biết thêm chi tiết!"
      };
    }

    try {
      // Find user's farm
      const farm = await this.farmRepository.findOne({
        where: { userId },
      });

      if (!farm) {
        return {
          success: false,
          message: 'Bạn chưa có trang trại nào. Vui lòng tạo trang trại trước.',
        };
      }

      // Query activities in date range
      const activities = await this.activityRepository.find({
        where: {
          farmId: farm.id,
          date: Between(dateRange.start, dateRange.end),
        },
      });
      console.log("activities trả về trong dateRange :",activities);
      

      if (activities.length === 0) {
        const periodStr = formatDateRange(dateRange);
        return {
          success: true,
          message: `Chưa có hoạt động nào được ghi nhận trong khoảng thời gian ${periodStr}.`,
          data: {
            revenue: 0,
            cost: 0,
            profit: 0,
            period: periodStr,
          },
        };
      }

      // Calculate revenue (from revenue field of ALL activities, not just HARVEST)
      // Because OTHER type can also have revenue (e.g., farm tours, other services)
      const revenue = activities
        .reduce((sum, a) => sum + (Number(a.revenue) || 0), 0);
        console.log("revenue: ",revenue);
        

      // Calculate cost (from all activities)
      const cost = activities
        .reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
        console.log("cost: ",cost);
        

      // Calculate profit
      const profit = revenue - cost;

      // Determine query type from message
      const normalizedMessage = message.toLowerCase();
      const isRevenueQuery = normalizedMessage.includes('doanh thu');
      const isCostQuery = normalizedMessage.includes('chi phí') || normalizedMessage.includes('chi tiêu');
      const isProfitQuery = normalizedMessage.includes('lợi nhuận') || normalizedMessage.includes('lãi');

      // Format response
      let responseMessage: string;
      const periodStr = this.formatPeriodName(dateString);

      if (isRevenueQuery) {
        responseMessage = `Tổng doanh thu ${periodStr} là ${this.formatCurrency(revenue)}.`;
      } else if (isCostQuery) {
        responseMessage = `Tổng chi phí ${periodStr} là ${this.formatCurrency(cost)}.`;
      } else if (isProfitQuery) {
        if (profit >= 0) {
          responseMessage = `Lợi nhuận ${periodStr} là ${this.formatCurrency(profit)} (Doanh thu: ${this.formatCurrency(revenue)} - Chi phí: ${this.formatCurrency(cost)}).`;
        } else {
          responseMessage = `${periodStr.charAt(0).toUpperCase() + periodStr.slice(1)} đang lỗ ${this.formatCurrency(Math.abs(profit))} (Doanh thu: ${this.formatCurrency(revenue)} - Chi phí: ${this.formatCurrency(cost)}).`;
        }
      } else {
        // General financial summary
        responseMessage = `Báo cáo tài chính ${periodStr}:\n- Doanh thu: ${this.formatCurrency(revenue)}\n- Chi phí: ${this.formatCurrency(cost)}\n- Lợi nhuận: ${this.formatCurrency(profit)}`;
      }

      return {
        success: true,
        message: responseMessage,
        data: {
          revenue,
          cost,
          profit,
          period: periodStr,
        },
      };
    } catch (error) {
      this.logger.error(`Error handling financial query: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Xin lỗi, tôi gặp sự cố khi lấy dữ liệu tài chính. Vui lòng thử lại sau.',
      };
    }
  }

  /**
   * Format currency in VND
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Format period name for display
   */
  private formatPeriodName(dateEntity: string): string {
    const normalized = dateEntity.toLowerCase().trim();
    
    if (normalized.includes('tháng này')) return 'tháng này';
    if (normalized.includes('tháng trước')) return 'tháng trước';
    
    // Check for specific month: "tháng 1", "tháng 2", etc.
    const monthMatch = normalized.match(/tháng\s*(\d{1,2})/);
    if (monthMatch) {
      return dateEntity; // Return as-is: "tháng 12", "tháng 1", etc.
    }
    
    if (normalized.includes('quý')) return dateEntity;
    if (normalized.includes('năm nay')) return 'năm nay';
    if (normalized.includes('năm trước') || normalized.includes('năm ngoái')) return 'năm trước';
    if (normalized.includes('tuần này')) return 'tuần này';
    if (normalized.includes('tuần trước')) return 'tuần trước';
    
    return dateEntity;
  }
}
