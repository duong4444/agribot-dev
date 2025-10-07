import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { FarmService } from '../../farm/farm.service';
import { 
  IntentType, 
  Entity, 
  BusinessQueryResult, 
  IoTCommandResult 
} from '../types';
import { LLMFallbackService } from './llm-fallback.service';

export interface ActionContext {
  user: User;
  intent: IntentType;
  entities: Entity[];
  query: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  businessData?: BusinessQueryResult;
  iotCommand?: IoTCommandResult;
  data?: any;
  requiresConfirmation?: boolean;
}

@Injectable()
export class ActionRouterService {
  private readonly logger = new Logger(ActionRouterService.name);

  constructor(
    private readonly farmService: FarmService,
    private readonly llmFallback: LLMFallbackService,
  ) {}

  /**
   * Route action based on intent
   */
  async routeAction(context: ActionContext): Promise<ActionResult> {
    const { intent, user, entities, query } = context;

    this.logger.log(`Routing action for intent: ${intent}`);

    try {
      switch (intent) {
        case IntentType.FINANCIAL_QUERY:
          return await this.handleFinancialQuery(user, entities, query);

        case IntentType.CROP_QUERY:
          return await this.handleCropQuery(user, entities, query);

        case IntentType.ACTIVITY_QUERY:
          return await this.handleActivityQuery(user, entities, query);

        case IntentType.ANALYTICS_QUERY:
          return await this.handleAnalyticsQuery(user, entities, query);

        case IntentType.FARM_QUERY:
          return await this.handleFarmQuery(user, entities, query);

        case IntentType.SENSOR_QUERY:
          return await this.handleSensorQuery(user, entities, query);

        case IntentType.DEVICE_CONTROL:
          return await this.handleDeviceControl(user, entities, query);

        case IntentType.CREATE_RECORD:
          return await this.handleCreateRecord(user, entities, query);

        case IntentType.UPDATE_RECORD:
          return await this.handleUpdateRecord(user, entities, query);

        case IntentType.DELETE_RECORD:
          return await this.handleDeleteRecord(user, entities, query);

        default:
          return {
            success: false,
            message: 'Intent này không yêu cầu action cụ thể.',
          };
      }
    } catch (error) {
      this.logger.error(`Error routing action for intent ${intent}:`, error);
      return {
        success: false,
        message: 'Có lỗi xảy ra khi xử lý yêu cầu của bạn.',
      };
    }
  }

  /**
   * Handle financial queries (doanh thu, chi phí)
   */
  private async handleFinancialQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    try {
      // Get user's farms
      const farms = await this.farmService.getFarmsByUser(user);

      if (farms.length === 0) {
        return {
          success: true,
          message: 'Bạn chưa có nông trại nào. Hãy tạo nông trại đầu tiên để theo dõi tài chính.',
        };
      }

      // Extract time period from entities
      const timePeriod = this.extractTimePeriodFromEntities(entities);

      // Calculate financial data
      const financialData = await this.calculateFinancials(
        farms,
        timePeriod.start,
        timePeriod.end
      );

      // Generate human-friendly explanation
      const explanation = await this.llmFallback.generateWithContext(
        query,
        financialData
      );

      return {
        success: true,
        message: explanation,
        businessData: {
          success: true,
          data: financialData,
          query,
        },
      };
    } catch (error) {
      this.logger.error('Error handling financial query:', error);
      return {
        success: false,
        message: 'Không thể truy vấn dữ liệu tài chính.',
      };
    }
  }

  /**
   * Handle crop queries
   */
  private async handleCropQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    try {
      const farms = await this.farmService.getFarmsByUser(user);

      if (farms.length === 0) {
        return {
          success: true,
          message: 'Bạn chưa có nông trại nào.',
        };
      }

      // Get all crops
      const allCrops = [];
      for (const farm of farms) {
        const crops = await this.farmService.getCropsByFarm(farm.id);
        allCrops.push(...crops);
      }

      // Filter by crop name if specified in entities
      const cropNameEntity = entities.find(e => e.type === 'crop_name');
      const filteredCrops = cropNameEntity
        ? allCrops.filter(crop => 
            crop.name.toLowerCase().includes(cropNameEntity.value.toLowerCase())
          )
        : allCrops;

      const explanation = await this.llmFallback.generateWithContext(
        query,
        filteredCrops
      );

      return {
        success: true,
        message: explanation,
        businessData: {
          success: true,
          data: filteredCrops,
          query,
        },
      };
    } catch (error) {
      this.logger.error('Error handling crop query:', error);
      return {
        success: false,
        message: 'Không thể truy vấn dữ liệu cây trồng.',
      };
    }
  }

  /**
   * Handle activity queries
   */
  private async handleActivityQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    try {
      const farms = await this.farmService.getFarmsByUser(user);

      if (farms.length === 0) {
        return {
          success: true,
          message: 'Bạn chưa có nông trại nào.',
        };
      }

      const timePeriod = this.extractTimePeriodFromEntities(entities);

      // Get activities
      const allActivities = [];
      for (const farm of farms) {
        const activities = await this.farmService.getActivitiesByFarm(
          farm.id,
          timePeriod.start,
          timePeriod.end
        );
        allActivities.push(...activities);
      }

      const explanation = await this.llmFallback.generateWithContext(
        query,
        allActivities
      );

      return {
        success: true,
        message: explanation,
        businessData: {
          success: true,
          data: allActivities,
          query,
        },
      };
    } catch (error) {
      this.logger.error('Error handling activity query:', error);
      return {
        success: false,
        message: 'Không thể truy vấn dữ liệu hoạt động.',
      };
    }
  }

  /**
   * Handle analytics queries
   */
  private async handleAnalyticsQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    try {
      const farms = await this.farmService.getFarmsByUser(user);

      if (farms.length === 0) {
        return {
          success: true,
          message: 'Bạn chưa có nông trại nào.',
        };
      }

      // Get analytics for all farms
      const analyticsData = [];
      for (const farm of farms) {
        const analytics = await this.farmService.getAnalytics(farm.id);
        analyticsData.push({
          farmName: farm.name,
          ...analytics,
        });
      }

      const explanation = await this.llmFallback.generateWithContext(
        query,
        analyticsData
      );

      return {
        success: true,
        message: explanation,
        businessData: {
          success: true,
          data: analyticsData,
          query,
          visualization: {
            type: 'chart',
            config: {
              type: 'bar',
              data: analyticsData,
            },
          },
        },
      };
    } catch (error) {
      this.logger.error('Error handling analytics query:', error);
      return {
        success: false,
        message: 'Không thể truy vấn dữ liệu phân tích.',
      };
    }
  }

  /**
   * Handle farm queries
   */
  private async handleFarmQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    try {
      const farms = await this.farmService.getFarmsByUser(user);

      const explanation = await this.llmFallback.generateWithContext(
        query,
        farms
      );

      return {
        success: true,
        message: explanation,
        businessData: {
          success: true,
          data: farms,
          query,
        },
      };
    } catch (error) {
      this.logger.error('Error handling farm query:', error);
      return {
        success: false,
        message: 'Không thể truy vấn dữ liệu nông trại.',
      };
    }
  }

  /**
   * Handle sensor queries (IoT)
   */
  private async handleSensorQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    // TODO: Implement IoT sensor query
    // This will be implemented when IoT module is ready
    
    return {
      success: false,
      message: 'Chức năng truy vấn cảm biến đang được phát triển.',
    };
  }

  /**
   * Handle device control (IoT)
   */
  private async handleDeviceControl(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    // TODO: Implement IoT device control
    // This will be implemented when IoT module is ready

    // Extract device info from entities
    const deviceEntity = entities.find(e => e.type === 'device_name');
    const areaEntity = entities.find(e => e.type === 'farm_area');

    if (!deviceEntity && !areaEntity) {
      return {
        success: false,
        message: 'Không xác định được thiết bị hoặc khu vực cần điều khiển.',
      };
    }

    // For now, return placeholder
    return {
      success: false,
      message: `Chức năng điều khiển thiết bị "${deviceEntity?.value || areaEntity?.value}" đang được phát triển.`,
      requiresConfirmation: true,
    };
  }

  /**
   * Handle create record
   */
  private async handleCreateRecord(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    return {
      success: false,
      message: 'Chức năng tạo bản ghi đang được phát triển.',
      requiresConfirmation: true,
    };
  }

  /**
   * Handle update record
   */
  private async handleUpdateRecord(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    return {
      success: false,
      message: 'Chức năng cập nhật bản ghi đang được phát triển.',
      requiresConfirmation: true,
    };
  }

  /**
   * Handle delete record
   */
  private async handleDeleteRecord(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    return {
      success: false,
      message: 'Chức năng xóa bản ghi đang được phát triển.',
      requiresConfirmation: true,
    };
  }

  /**
   * Extract time period from entities
   */
  private extractTimePeriodFromEntities(entities: Entity[]): {
    start: Date;
    end: Date;
  } {
    const dateEntity = entities.find(e => e.type === 'date');
    const now = new Date();

    if (!dateEntity) {
      // Default: this month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end };
    }

    const value = dateEntity.value.toLowerCase();

    // This week
    if (value === 'this_week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }

    // This month
    if (value === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end };
    }

    // This year
    if (value === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { start, end };
    }

    // Specific date
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(value);
      return { start: date, end: date };
    }

    // Default: this month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }

  /**
   * Calculate financial data
   */
  private async calculateFinancials(
    farms: any[],
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const farm of farms) {
      const expenses = await this.farmService.getExpensesByFarm(
        farm.id,
        startDate,
        endDate
      );

      const farmExpense = expenses.reduce(
        (sum, exp) => sum + parseFloat(exp.amount.toString()),
        0
      );

      totalExpense += farmExpense;
    }

    const profit = totalRevenue - totalExpense;

    return {
      revenue: totalRevenue,
      expense: totalExpense,
      profit,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
    };
  }
}



