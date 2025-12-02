import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { 
  IntentType, 
  Entity, 
  BusinessQueryResult, 
  IoTCommandResult 
} from '../types';
import { LLMFallbackService } from './llm-fallback.service';
import { DeviceControlHandler } from '../handlers/device-control.handler';
import { SensorQueryHandler } from '../handlers/sensor-query.handler';

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
    private readonly llmFallback: LLMFallbackService,
    private readonly deviceControlHandler: DeviceControlHandler,
    private readonly sensorQueryHandler: SensorQueryHandler,
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
          console.log("------CASE FINANCIAL_QUERY TRONG SWITCH CASE CỦA ROUTE ACTION----");
          return await this.handleFinancialQuery(user, entities, query);

        case IntentType.SENSOR_QUERY:
          console.log("------CASE SENSOR_QUERY TRONG SWITCH CASE CỦA ROUTE ACTION----");
          return await this.handleSensorQuery(user, entities, query);

        case IntentType.DEVICE_CONTROL:
          console.log("------CASE DEVICE_CONTROL TRONG SWITCH CASE CỦA ROUTE ACTION----");
          return await this.handleDeviceControl(user, entities, query);

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
   * TODO: Implement when Farm & Financial module is ready
   */
  private async handleFinancialQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    return {
      success: false,
      message: 'Chức năng quản lý tài chính đang được phát triển. Vui lòng quay lại sau.',
    };
  }



  /**
   * Handle sensor queries (IoT)
   */
  private async handleSensorQuery(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    try {
      console.log("BEGIN=====================handleSensorQuery========================");
      
      const result = await this.sensorQueryHandler.handle(user.id, entities, query);
      console.log("END=====================END handleSensorQuery========================");

      return {
        success: result.success,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Sensor query error:', error);
      return {
        success: false,
        message: 'Không thể lấy dữ liệu cảm biến. Vui lòng thử lại.',
      };
    }
  }

  /**
   * Handle device control (IoT)
   */
  private async handleDeviceControl(
    user: User,
    entities: Entity[],
    query: string
  ): Promise<ActionResult> {
    // Extract device info from entities
    const deviceEntity = entities.find(e => e.type === 'device_name');
    console.log("DEVICE ENTITY ĐC EXTRACT TỪ PYTHON_ TRONG handleDeviceControl: ",deviceEntity);
    
    const areaEntity = entities.find(e => e.type === 'farm_area');
    console.log("AREA ENTITY ĐC EXTRACT TỪ PYTHON_ TRONG handleDeviceControl: ",areaEntity);

    if (!deviceEntity && !areaEntity) {
      console.log("KO CÓ DEVICE ENTITY VÀ AREA ENTITY");
      
      return {
        success: false,
        message: 'Không xác định được thiết bị hoặc khu vực cần điều khiển.',
      };
    }

    // Call device control handler
    try {
      const result = await this.deviceControlHandler.handle(user.id, entities, query);
      
      return {
        success: result.success,
        message: result.message,
        iotCommand: {
          success: result.success,
          deviceType: result.deviceType,
          action: result.action,
          area: result.area,
          duration: result.duration,
        },
      };
    } catch (error) {
      this.logger.error('Device control error:', error);
      return {
        success: false,
        message: error.message || 'Không thể điều khiển thiết bị. Vui lòng thử lại.',
      };
    }
  }

}



