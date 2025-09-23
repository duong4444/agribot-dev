import { Injectable, Logger } from '@nestjs/common';
import { FarmService } from '../farm/farm.service';
import { User } from '../users/entities/user.entity';

export interface ActionContext {
  user: User;
  intent: string;
  entities?: Record<string, any>;
  message: string;
}

export interface ActionResponse {
  success: boolean;
  data?: any;
  message: string;
  actionType: string;
}

@Injectable()
export class ActionRouterService {
  private readonly logger = new Logger(ActionRouterService.name);

  constructor(private farmService: FarmService) {}

  /**
   * Route action based on intent
   */
  async routeAction(context: ActionContext): Promise<ActionResponse> {
    const { intent, user, entities, message } = context;

    try {
      switch (intent) {
        case 'financial_query':
          return await this.handleFinancialQuery(user, entities, message);
        
        case 'crop_query':
          return await this.handleCropQuery(user, entities, message);
        
        case 'activity_query':
          return await this.handleActivityQuery(user, entities, message);
        
        case 'analytics_query':
          return await this.handleAnalyticsQuery(user, entities, message);
        
        case 'farm_query':
          return await this.handleFarmQuery(user, entities, message);
        
        case 'sensor_query':
          return await this.handleSensorQuery(user, entities, message);
        
        case 'device_control':
          return await this.handleDeviceControl(user, entities, message);
        
        case 'create_record':
          return await this.handleCreateRecord(user, entities, message);
        
        case 'update_record':
          return await this.handleUpdateRecord(user, entities, message);
        
        case 'delete_record':
          return await this.handleDeleteRecord(user, entities, message);
        
        default:
          return {
            success: false,
            message: 'Tôi chưa hiểu yêu cầu của bạn. Vui lòng thử lại.',
            actionType: 'unknown'
          };
      }
    } catch (error) {
      this.logger.error(`Error routing action for intent ${intent}:`, error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi xử lý yêu cầu của bạn.',
        actionType: 'error'
      };
    }
  }

  /**
   * Handle financial queries
   */
  private async handleFinancialQuery(user: User, entities: any, message: string): Promise<ActionResponse> {
    const farms = await this.farmService.getFarmsByUser(user);
    
    if (farms.length === 0) {
      return {
        success: true,
        message: 'Bạn chưa có nông trại nào. Hãy tạo nông trại đầu tiên để theo dõi tài chính.',
        actionType: 'financial_query'
      };
    }

    // Extract time period from message
    const timePeriod = this.extractTimePeriod(message);
    const currentDate = new Date();
    let startDate: Date;
    let endDate: Date = currentDate;

    switch (timePeriod) {
      case 'tháng này':
      case 'this month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      case 'tháng trước':
      case 'last month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        break;
      case 'năm này':
      case 'this year':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    }

    // Calculate financial data
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalProfit = 0;

    for (const farm of farms) {
      const analytics = await this.farmService.getFarmAnalytics(farm.id, user);
      totalRevenue += analytics.finances.estimatedRevenue || 0;
      totalExpenses += analytics.finances.totalExpenses || 0;
      totalProfit += analytics.finances.estimatedProfit || 0;
    }

    const responseMessage = this.generateFinancialResponse(message, {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalProfit,
      period: timePeriod
    });

    return {
      success: true,
      data: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalProfit,
        period: timePeriod
      },
      message: responseMessage,
      actionType: 'financial_query'
    };
  }

  /**
   * Handle crop queries
   */
  private async handleCropQuery(user: User, entities: any, message: string): Promise<ActionResponse> {
    const farms = await this.farmService.getFarmsByUser(user);
    
    if (farms.length === 0) {
      return {
        success: true,
        message: 'Bạn chưa có nông trại nào. Hãy tạo nông trại đầu tiên để quản lý cây trồng.',
        actionType: 'crop_query'
      };
    }

    let totalCrops = 0;
    let totalArea = 0;
    let totalYield = 0;
    const cropTypes: Record<string, number> = {};

    for (const farm of farms) {
      if (farm.crops) {
        totalCrops += farm.crops.length;
        farm.crops.forEach(crop => {
          totalArea += crop.plantedArea || 0;
          totalYield += crop.actualYield || 0;
          cropTypes[crop.type] = (cropTypes[crop.type] || 0) + 1;
        });
      }
    }

    const responseMessage = this.generateCropResponse(message, {
      totalCrops,
      totalArea,
      totalYield,
      cropTypes
    });

    return {
      success: true,
      data: {
        totalCrops,
        totalArea,
        totalYield,
        cropTypes
      },
      message: responseMessage,
      actionType: 'crop_query'
    };
  }

  /**
   * Handle activity queries
   */
  private async handleActivityQuery(user: User, entities: any, message: string): Promise<ActionResponse> {
    const farms = await this.farmService.getFarmsByUser(user);
    
    if (farms.length === 0) {
      return {
        success: true,
        message: 'Bạn chưa có nông trại nào. Hãy tạo nông trại đầu tiên để quản lý hoạt động.',
        actionType: 'activity_query'
      };
    }

    let totalActivities = 0;
    let completedActivities = 0;
    let inProgressActivities = 0;
    const activityTypes: Record<string, number> = {};

    for (const farm of farms) {
      if (farm.activities) {
        totalActivities += farm.activities.length;
        farm.activities.forEach(activity => {
          if (activity.status === 'COMPLETED') completedActivities++;
          if (activity.status === 'IN_PROGRESS') inProgressActivities++;
          activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
        });
      }
    }

    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    const responseMessage = this.generateActivityResponse(message, {
      totalActivities,
      completedActivities,
      inProgressActivities,
      completionRate,
      activityTypes
    });

    return {
      success: true,
      data: {
        totalActivities,
        completedActivities,
        inProgressActivities,
        completionRate,
        activityTypes
      },
      message: responseMessage,
      actionType: 'activity_query'
    };
  }

  /**
   * Handle analytics queries
   */
  private async handleAnalyticsQuery(user: User, entities: any, message: string): Promise<ActionResponse> {
    const farms = await this.farmService.getFarmsByUser(user);
    
    if (farms.length === 0) {
      return {
        success: true,
        message: 'Bạn chưa có nông trại nào. Hãy tạo nông trại đầu tiên để xem thống kê.',
        actionType: 'analytics_query'
      };
    }

    // Get comprehensive analytics
    let totalFarms = farms.length;
    let totalCrops = 0;
    let totalActivities = 0;
    let totalExpenses = 0;
    let totalRevenue = 0;

    for (const farm of farms) {
      totalCrops += farm.crops?.length || 0;
      totalActivities += farm.activities?.length || 0;
      // Calculate expenses from activities
      if (farm.activities) {
        totalExpenses += farm.activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);
      }
      
      if (farm.crops) {
        totalRevenue += farm.crops.reduce((sum, crop) => {
          return sum + ((crop.actualYield || 0) * (crop.marketPrice || 0));
        }, 0);
      }
    }

    const responseMessage = this.generateAnalyticsResponse(message, {
      totalFarms,
      totalCrops,
      totalActivities,
      totalExpenses,
      totalRevenue,
      profit: totalRevenue - totalExpenses
    });

    return {
      success: true,
      data: {
        totalFarms,
        totalCrops,
        totalActivities,
        totalExpenses,
        totalRevenue,
        profit: totalRevenue - totalExpenses
      },
      message: responseMessage,
      actionType: 'analytics_query'
    };
  }

  /**
   * Handle farm queries
   */
  private async handleFarmQuery(user: User, entities: any, message: string): Promise<ActionResponse> {
    const farms = await this.farmService.getFarmsByUser(user);
    
    if (farms.length === 0) {
      return {
        success: true,
        message: 'Bạn chưa có nông trại nào. Hãy tạo nông trại đầu tiên.',
        actionType: 'farm_query'
      };
    }

    const responseMessage = this.generateFarmResponse(message, farms);

    return {
      success: true,
      data: farms,
      message: responseMessage,
      actionType: 'farm_query'
    };
  }

  /**
   * Handle sensor queries (for future IoT integration)
   */
  private async handleSensorQuery(user: User, entities: any, message: string): Promise<ActionResponse> {
    // Placeholder for IoT integration
    return {
      success: true,
      message: 'Tính năng cảm biến IoT sẽ được tích hợp trong phiên bản tiếp theo. Hiện tại tôi chưa thể truy cập dữ liệu cảm biến.',
      actionType: 'sensor_query'
    };
  }

  /**
   * Handle device control (for future IoT integration)
   */
  private async handleDeviceControl(user: User, entities: any, message: string): Promise<ActionResponse> {
    // Placeholder for IoT integration
    return {
      success: true,
      message: 'Tính năng điều khiển thiết bị IoT sẽ được tích hợp trong phiên bản tiếp theo.',
      actionType: 'device_control'
    };
  }

  /**
   * Handle create record
   */
  private async handleCreateRecord(user: User, entities: any, message: string): Promise<ActionResponse> {
    return {
      success: true,
      message: 'Để tạo bản ghi mới, vui lòng sử dụng giao diện quản lý nông trại hoặc cung cấp thông tin chi tiết hơn.',
      actionType: 'create_record'
    };
  }

  /**
   * Handle update record
   */
  private async handleUpdateRecord(user: User, entities: any, message: string): Promise<ActionResponse> {
    return {
      success: true,
      message: 'Để cập nhật bản ghi, vui lòng sử dụng giao diện quản lý nông trại hoặc cung cấp thông tin chi tiết hơn.',
      actionType: 'update_record'
    };
  }

  /**
   * Handle delete record
   */
  private async handleDeleteRecord(user: User, entities: any, message: string): Promise<ActionResponse> {
    return {
      success: true,
      message: 'Để xóa bản ghi, vui lòng sử dụng giao diện quản lý nông trại hoặc cung cấp thông tin chi tiết hơn.',
      actionType: 'delete_record'
    };
  }

  /**
   * Extract time period from message
   */
  private extractTimePeriod(message: string): string {
    const timePatterns = {
      'tháng này': ['tháng này', 'this month', 'tháng hiện tại'],
      'tháng trước': ['tháng trước', 'last month', 'tháng vừa rồi'],
      'năm này': ['năm này', 'this year', 'năm hiện tại'],
      'tuần này': ['tuần này', 'this week', 'tuần hiện tại'],
      'hôm nay': ['hôm nay', 'today', 'ngày hôm nay']
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [period, patterns] of Object.entries(timePatterns)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        return period;
      }
    }

    return 'tháng này'; // Default
  }

  /**
   * Generate financial response
   */
  private generateFinancialResponse(message: string, data: any): string {
    const { revenue, expenses, profit, period } = data;
    
    if (message.includes('doanh thu') || message.includes('revenue')) {
      return `**Doanh thu ${period}:** ${revenue.toLocaleString('vi-VN')} VNĐ`;
    }
    
    if (message.includes('chi phí') || message.includes('expense')) {
      return `**Chi phí ${period}:** ${expenses.toLocaleString('vi-VN')} VNĐ`;
    }
    
    if (message.includes('lợi nhuận') || message.includes('profit')) {
      return `**Lợi nhuận ${period}:** ${profit.toLocaleString('vi-VN')} VNĐ ${profit >= 0 ? '(Lãi)' : '(Lỗ)'}`;
    }
    
    return `**Tổng quan tài chính ${period}:**
• Doanh thu: ${revenue.toLocaleString('vi-VN')} VNĐ
• Chi phí: ${expenses.toLocaleString('vi-VN')} VNĐ  
• Lợi nhuận: ${profit.toLocaleString('vi-VN')} VNĐ ${profit >= 0 ? '(Lãi)' : '(Lỗ)'}`;
  }

  /**
   * Generate crop response
   */
  private generateCropResponse(message: string, data: any): string {
    const { totalCrops, totalArea, totalYield, cropTypes } = data;
    
    const topCrops = Object.entries(cropTypes)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([type, count]) => `• ${type}: ${count} cây`)
      .join('\n');

    return `**Thống kê cây trồng:**
• Tổng số cây: ${totalCrops} cây
• Tổng diện tích: ${totalArea.toLocaleString('vi-VN')} m²
• Tổng sản lượng: ${totalYield.toLocaleString('vi-VN')} kg

**Top cây trồng:**
${topCrops}`;
  }

  /**
   * Generate activity response
   */
  private generateActivityResponse(message: string, data: any): string {
    const { totalActivities, completedActivities, inProgressActivities, completionRate } = data;
    
    return `**Thống kê hoạt động:**
• Tổng hoạt động: ${totalActivities}
• Đã hoàn thành: ${completedActivities}
• Đang thực hiện: ${inProgressActivities}
• Tỷ lệ hoàn thành: ${completionRate.toFixed(1)}%`;
  }

  /**
   * Generate analytics response
   */
  private generateAnalyticsResponse(message: string, data: any): string {
    const { totalFarms, totalCrops, totalActivities, totalExpenses, totalRevenue, profit } = data;
    
    return `**Tổng quan hệ thống:**
• Số nông trại: ${totalFarms}
• Số cây trồng: ${totalCrops}
• Số hoạt động: ${totalActivities}
• Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ
• Tổng chi phí: ${totalExpenses.toLocaleString('vi-VN')} VNĐ
• Lợi nhuận: ${profit.toLocaleString('vi-VN')} VNĐ ${profit >= 0 ? '(Lãi)' : '(Lỗ)'}`;
  }

  /**
   * Generate farm response
   */
  private generateFarmResponse(message: string, farms: any[]): string {
    if (farms.length === 1) {
      const farm = farms[0];
      return `**Nông trại của bạn:**
• Tên: ${farm.name}
• Loại: ${farm.type}
• Diện tích: ${farm.area?.toLocaleString('vi-VN') || 'Chưa xác định'} m²
• Địa điểm: ${farm.location || 'Chưa xác định'}`;
    }
    
    const farmList = farms.map(farm => `• ${farm.name} (${farm.type})`).join('\n');
    
    return `**Danh sách nông trại (${farms.length}):**
${farmList}`;
  }
}
