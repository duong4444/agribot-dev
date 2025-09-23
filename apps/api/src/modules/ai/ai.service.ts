import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { ActionRouterService } from './action-router.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { IotService } from '../iot/iot.service';

export interface AIResponse {
  content: string;
  intent: string;
  confidence: number;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
    safetyRatings?: any[];
    actionType?: string;
    knowledgeSources?: number;
  };
}

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private configService: ConfigService,
    private geminiService: GeminiService,
    private actionRouterService: ActionRouterService,
    private knowledgeBaseService: KnowledgeBaseService,
    private iotService: IotService,
  ) {}

  /**
   * Phân tích intent của câu hỏi nông nghiệp
   */
  async analyzeIntent(userMessage: string): Promise<IntentAnalysis> {
    const message = userMessage.toLowerCase().trim();

    // Intent patterns cho nông nghiệp
    const intentPatterns = {
      planting: [
        'cách trồng', 'trồng như thế nào', 'kỹ thuật trồng', 'hướng dẫn trồng',
        'planting', 'grow', 'cultivate', 'sow'
      ],
      care: [
        'chăm sóc', 'tưới nước', 'bón phân', 'cắt tỉa', 'phòng bệnh',
        'care', 'water', 'fertilize', 'prune', 'disease'
      ],
      harvest: [
        'thu hoạch', 'khi nào thu hoạch', 'cách thu hoạch', 'thời gian thu hoạch',
        'harvest', 'harvesting', 'when to harvest'
      ],
      soil: [
        'đất', 'loại đất', 'đất phù hợp', 'cải thiện đất', 'độ ph',
        'soil', 'ground', 'ph level', 'soil type'
      ],
      weather: [
        'thời tiết', 'khí hậu', 'nhiệt độ', 'độ ẩm', 'mùa vụ',
        'weather', 'climate', 'temperature', 'humidity', 'season'
      ],
      pest: [
        'sâu bệnh', 'côn trùng', 'bệnh hại', 'phòng trừ', 'thuốc trừ sâu',
        'pest', 'insect', 'disease', 'pesticide', 'control'
      ],
      general: [
        'là gì', 'tại sao', 'như thế nào', 'có thể', 'có nên',
        'what is', 'why', 'how', 'can', 'should'
      ],

      // New Data Query Intents
      financial_query: [
        'doanh thu', 'lợi nhuận', 'chi phí', 'thu nhập', 'lãi lỗ',
        'revenue', 'profit', 'expense', 'income', 'profit loss',
        'tài chính', 'tài khoản', 'ngân sách', 'budget', 'finance'
      ],
      crop_query: [
        'cây trồng', 'năng suất', 'sản lượng', 'diện tích', 'giống',
        'crops', 'yield', 'production', 'area', 'variety',
        'thu hoạch', 'trồng trọt', 'harvest', 'cultivation'
      ],
      activity_query: [
        'hoạt động', 'công việc', 'nhiệm vụ', 'kế hoạch', 'tiến độ',
        'activities', 'tasks', 'work', 'plan', 'progress',
        'lịch trình', 'schedule', 'deadline', 'status'
      ],
      analytics_query: [
        'thống kê', 'báo cáo', 'phân tích', 'biểu đồ', 'xu hướng',
        'statistics', 'report', 'analysis', 'chart', 'trend',
        'dữ liệu', 'metrics', 'kpi', 'dashboard'
      ],
      farm_query: [
        'nông trại', 'trang trại', 'farm', 'farmland', 'agriculture',
        'quản lý nông trại', 'farm management', 'farm data'
      ],

      // IoT Intents
      sensor_query: [
        'độ ẩm', 'nhiệt độ', 'ánh sáng', 'cảm biến', 'sensor',
        'humidity', 'temperature', 'light', 'moisture', 'soil moisture',
        'độ ẩm đất', 'nhiệt độ hiện tại', 'cảm biến độ ẩm', 'dữ liệu cảm biến'
      ],
      device_control: [
        'bật', 'tắt', 'điều khiển', 'tự động', 'manual',
        'turn on', 'turn off', 'control', 'automate', 'irrigation',
        'bật bơm', 'tắt bơm', 'tưới nước', 'điều khiển thiết bị'
      ],

      // Action Intents
      create_record: [
        'tạo', 'thêm', 'ghi nhận', 'lưu', 'nhập',
        'create', 'add', 'record', 'save', 'input',
        'đăng ký', 'register', 'log'
      ],
      update_record: [
        'cập nhật', 'sửa', 'thay đổi', 'chỉnh sửa',
        'update', 'edit', 'modify', 'change'
      ],
      delete_record: [
        'xóa', 'xóa bỏ', 'hủy', 'loại bỏ',
        'delete', 'remove', 'cancel', 'eliminate'
      ]
    };

    // Tìm intent phù hợp nhất
    let bestIntent = 'general';
    let maxConfidence = 0.3; // Default confidence for general questions

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const matches = patterns.filter(pattern => message.includes(pattern));
      if (matches.length > 0) {
        const confidence = Math.min(0.9, 0.5 + (matches.length * 0.1));
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestIntent = intent;
        }
      }
    }

    // Extract entities (crop names, etc.)
    const entities = this.extractEntities(message);

    return {
      intent: bestIntent,
      confidence: maxConfidence,
      entities
    };
  }

  /**
   * Trích xuất entities từ câu hỏi
   */
  private extractEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Crop names
    const crops = [
      'cà chua', 'tomato', 'lúa', 'rice', 'ngô', 'corn', 'khoai tây', 'potato',
      'cà rốt', 'carrot', 'rau muống', 'water spinach', 'bắp cải', 'cabbage',
      'dưa chuột', 'cucumber', 'ớt', 'pepper', 'hành tây', 'onion'
    ];

    const foundCrops = crops.filter(crop => 
      message.toLowerCase().includes(crop.toLowerCase())
    );

    if (foundCrops.length > 0) {
      entities.crops = foundCrops;
    }

    // Time references
    const timePatterns = [
      /\d+\s*(ngày|tuần|tháng|năm)/g,
      /\d+\s*(day|week|month|year)/g
    ];

    const timeMatches = timePatterns.flatMap(pattern => 
      Array.from(message.matchAll(pattern))
    );

    if (timeMatches.length > 0) {
      entities.timeReferences = timeMatches.map(match => match[0]);
    }

    return entities;
  }

  /**
   * Xử lý sensor queries
   */
  async handleSensorQuery(userMessage: string, user: any, intentAnalysis: IntentAnalysis): Promise<AIResponse> {
    try {
      // Get user's farms
      const farms = await this.iotService.getSensorsByFarm('', user); // This needs to be updated
      
      if (farms.length === 0) {
        return {
          content: 'Bạn chưa có cảm biến nào được kết nối. Hãy thêm cảm biến để theo dõi dữ liệu nông trại.',
          intent: intentAnalysis.intent,
          confidence: intentAnalysis.confidence,
          metadata: {
            model: 'iot-service',
            processingTime: 0,
            actionType: 'sensor_query'
          }
        };
      }

      // Get latest sensor readings
      const latestReadings = await this.iotService.getLatestSensorReadings('', user);
      
      let response = '**Dữ liệu cảm biến hiện tại:**\n\n';
      
      latestReadings.forEach(({ sensor, latestReading }) => {
        if (latestReading) {
          response += `• **${sensor.name}** (${sensor.type}): ${latestReading.value}${latestReading.unit}\n`;
          response += `  Thời gian: ${new Date(latestReading.timestamp).toLocaleString('vi-VN')}\n\n`;
        }
      });

      if (latestReadings.length === 0) {
        response = 'Chưa có dữ liệu cảm biến nào. Vui lòng kiểm tra kết nối thiết bị.';
      }

      return {
        content: response,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: 'iot-service',
          processingTime: 0,
          actionType: 'sensor_query'
        }
      };

    } catch (error) {
      this.logger.error('Error handling sensor query:', error);
      return {
        content: 'Xin lỗi, tôi không thể lấy dữ liệu cảm biến. Vui lòng thử lại sau.',
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: 'error-handler',
          processingTime: 0
        }
      };
    }
  }

  /**
   * Xử lý device control commands
   */
  async handleDeviceControl(userMessage: string, user: any, intentAnalysis: IntentAnalysis): Promise<AIResponse> {
    try {
      // Parse command from user message
      const message = userMessage.toLowerCase();
      
      let command = '';
      let deviceType = '';
      let parameters: any = {};

      if (message.includes('bật bơm') || message.includes('turn on pump')) {
        command = 'pump_on';
        deviceType = 'pump';
        
        // Extract duration if mentioned
        const durationMatch = message.match(/(\d+)\s*(phút|minute|min)/);
        if (durationMatch) {
          parameters = { duration: parseInt(durationMatch[1]) * 60 }; // Convert to seconds
        }
      } else if (message.includes('tắt bơm') || message.includes('turn off pump')) {
        command = 'pump_off';
        deviceType = 'pump';
      } else if (message.includes('tưới nước') || message.includes('irrigation')) {
        command = 'irrigation_start';
        deviceType = 'pump';
        parameters = { mode: 'auto' };
      }

      if (!command) {
        return {
          content: 'Tôi không hiểu lệnh điều khiển. Vui lòng thử: "bật bơm 10 phút", "tắt bơm", hoặc "tưới nước".',
          intent: intentAnalysis.intent,
          confidence: intentAnalysis.confidence,
          metadata: {
            model: 'iot-service',
            processingTime: 0,
            actionType: 'device_control'
          }
        };
      }

      // Get user's devices
      const devices = await this.iotService.getDevicesByFarm('', user);
      const targetDevice = devices.find(d => d.type === deviceType && d.isControllable);

      if (!targetDevice) {
        return {
          content: `Không tìm thấy thiết bị ${deviceType} có thể điều khiển. Vui lòng kiểm tra cài đặt thiết bị.`,
          intent: intentAnalysis.intent,
          confidence: intentAnalysis.confidence,
          metadata: {
            model: 'iot-service',
            processingTime: 0,
            actionType: 'device_control'
          }
        };
      }

      // Send command
      const deviceCommand = await this.iotService.sendDeviceCommand(
        targetDevice.id,
        command,
        parameters,
        user
      );

      let response = `Đã gửi lệnh **${command}** đến thiết bị **${targetDevice.name}**.\n\n`;
      
      if (parameters.duration) {
        response += `Thời gian: ${parameters.duration / 60} phút\n`;
      }
      
      response += `Trạng thái: ${deviceCommand.status}\n`;
      response += `Thời gian: ${new Date(deviceCommand.createdAt).toLocaleString('vi-VN')}`;

      return {
        content: response,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: 'iot-service',
          processingTime: 0,
          actionType: 'device_control'
        }
      };

    } catch (error) {
      this.logger.error('Error handling device control:', error);
      return {
        content: 'Xin lỗi, tôi không thể thực hiện lệnh điều khiển. Vui lòng thử lại sau.',
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: 'error-handler',
          processingTime: 0
        }
      };
    }
  }

  /**
   * Tạo phản hồi AI với RAG (Retrieval-Augmented Generation)
   */
  async generateResponseWithRAG(
    userMessage: string,
    intentAnalysis: IntentAnalysis
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Search knowledge base for relevant information
      const knowledgeResults = await this.knowledgeBaseService.searchKnowledge(userMessage, 3);
      
      let context = '';
      if (knowledgeResults.length > 0) {
        context = knowledgeResults.map(result => result.content).join('\n\n');
      }

      // Generate response using RAG
      const ragResponse = await this.knowledgeBaseService.generateRAGResponse(userMessage, context);
      
      const processingTime = Date.now() - startTime;

      return {
        content: ragResponse,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: 'rag-knowledge-base',
          processingTime,
          knowledgeSources: knowledgeResults.length,
        }
      };

    } catch (error) {
      this.logger.error('Error generating RAG response:', error);
      
      // Fallback to original Gemini response
      return await this.generateResponse(userMessage, intentAnalysis);
    }
  }

  /**
   * Tạo phản hồi AI dựa trên intent và entities
   */
  async generateResponse(
    userMessage: string,
    intentAnalysis: IntentAnalysis
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Sử dụng Gemini Service để tạo phản hồi
      const geminiResponse = await this.geminiService.generateAgriculturalResponse(
        userMessage,
        intentAnalysis.intent,
        intentAnalysis.entities
      );

      const processingTime = Date.now() - startTime;

      return {
        content: geminiResponse.content,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: geminiResponse.model,
          tokens: geminiResponse.usage?.totalTokens,
          processingTime,
          safetyRatings: geminiResponse.safetyRatings
        }
      };

    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      
      // Fallback to mock response if Gemini fails
      const mockResponse = await this.generateMockResponse('', intentAnalysis);
      
      return {
        content: mockResponse,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence * 0.5, // Reduce confidence for fallback
        metadata: {
          model: 'fallback-mock',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Xử lý data queries với Action Router
   */
  async handleDataQuery(userMessage: string, user: any): Promise<AIResponse> {
    try {
      const intentAnalysis = await this.analyzeIntent(userMessage);
      
      // Check if this is a data query intent
      const dataQueryIntents = [
        'financial_query', 'crop_query', 'activity_query', 
        'analytics_query', 'farm_query', 'sensor_query',
        'device_control', 'create_record', 'update_record', 'delete_record'
      ];

      if (dataQueryIntents.includes(intentAnalysis.intent)) {
        // Handle IoT-specific intents
        if (intentAnalysis.intent === 'sensor_query') {
          return await this.handleSensorQuery(userMessage, user, intentAnalysis);
        }
        
        if (intentAnalysis.intent === 'device_control') {
          return await this.handleDeviceControl(userMessage, user, intentAnalysis);
        }

        // Handle other data queries via Action Router
        const actionResponse = await this.actionRouterService.routeAction({
          user,
          intent: intentAnalysis.intent,
          entities: intentAnalysis.entities,
          message: userMessage
        });

        return {
          content: actionResponse.message,
          intent: intentAnalysis.intent,
          confidence: intentAnalysis.confidence,
          metadata: {
            model: 'action-router',
            processingTime: 0,
            actionType: actionResponse.actionType
          }
        };
      }

      // Fallback to knowledge-based response with RAG
      return await this.generateResponseWithRAG(userMessage, intentAnalysis);
      
    } catch (error) {
      this.logger.error('Error handling data query:', error);
      return {
        content: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
        intent: 'error',
        confidence: 0,
        metadata: {
          model: 'error-handler',
          processingTime: 0
        }
      };
    }
  }

  /**
   * Tạo prompt cho AI
   */
  private createPrompt(userMessage: string, intentAnalysis: IntentAnalysis): string {
    const { intent, entities } = intentAnalysis;
    
    const basePrompt = `Bạn là một chuyên gia nông nghiệp AI, chuyên tư vấn về kỹ thuật trồng trọt và chăm sóc cây trồng. 

QUAN TRỌNG: Trả lời NGẮN GỌN, SÚC TÍCH trong vòng 150-200 từ. Tập trung vào thông tin thiết yếu nhất.

Câu hỏi: "${userMessage}"
Intent: ${intent}
Entities: ${JSON.stringify(entities)}

Yêu cầu:
- Trả lời bằng tiếng Việt
- Tối đa 200 từ
- Chia thành 2-3 đoạn ngắn
- Sử dụng bullet points khi cần
- Tập trung vào thông tin thực tế, có thể áp dụng ngay`;

    // Customize prompt based on intent
    switch (intent) {
      case 'planting':
        return basePrompt + '\n\nTập trung vào: thời vụ, chuẩn bị đất, mật độ trồng. Chỉ nêu 3-4 điểm quan trọng nhất.';
      
      case 'care':
        return basePrompt + '\n\nTập trung vào: tưới nước, bón phân, phòng bệnh. Nêu 3-4 biện pháp chính.';
      
      case 'harvest':
        return basePrompt + '\n\nTập trung vào: thời điểm thu hoạch, cách thu hoạch. Nêu 2-3 điểm quan trọng.';
      
      case 'soil':
        return basePrompt + '\n\nTập trung vào: loại đất phù hợp, độ pH, cải thiện đất. Nêu 3 điểm chính.';
      
      case 'weather':
        return basePrompt + '\n\nTập trung vào: ảnh hưởng thời tiết, biện pháp bảo vệ. Nêu 2-3 điểm quan trọng.';
      
      case 'pest':
        return basePrompt + '\n\nTập trung vào: nhận biết sâu bệnh, biện pháp phòng trừ. Nêu 3-4 điểm chính.';
      
      default:
        return basePrompt + '\n\nTrả lời tổng quát, nêu 3-4 điểm quan trọng nhất.';
    }
  }

  /**
   * Mock response generator (sẽ thay thế bằng OpenAI)
   */
  private async generateMockResponse(
    prompt: string, 
    intentAnalysis: IntentAnalysis
  ): Promise<string> {
    const { intent, entities } = intentAnalysis;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Generate contextual responses based on intent and entities
    const responses = this.getContextualResponses(intent, entities);
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Lấy câu trả lời theo context
   */
  private getContextualResponses(intent: string, entities: any): string[] {
    const crop = entities.crops?.[0] || 'cây trồng';
    
    switch (intent) {
      case 'planting':
        return [
          `**Thời vụ:** Trồng ${crop} vào mùa mưa (tháng 5-10).\n**Chuẩn bị đất:** Làm tơi xốp, bón lót phân hữu cơ.\n**Mật độ:** Khoảng cách 30-40cm giữa các cây.\n**Lưu ý:** Đảm bảo thoát nước tốt.`,
          `**Kỹ thuật trồng ${crop}:**\n• Chuẩn bị đất tơi xốp\n• Gieo hạt sâu 2-3cm\n• Tưới nước đều đặn\n• Theo dõi sự phát triển`,
          `**Trồng ${crop} hiệu quả:**\n• Chọn giống chất lượng\n• Đất thoát nước tốt\n• Mật độ trồng phù hợp\n• Chăm sóc đúng cách`
        ];
      
      case 'care':
        return [
          `**Chăm sóc ${crop}:**\n• Tưới nước sáng sớm/chiều mát\n• Bón phân NPK định kỳ\n• Làm cỏ thường xuyên\n• Theo dõi sâu bệnh`,
          `**Chế độ chăm sóc:**\n• Tưới nước đều đặn\n• Bón phân cân đối\n• Cắt tỉa lá già\n• Phòng trừ sâu bệnh`,
          `**Lưu ý chăm sóc:**\n• Kiểm tra cây hàng ngày\n• Tưới nước đúng cách\n• Bón phân đúng liều\n• Xử lý sâu bệnh kịp thời`
        ];
      
      case 'harvest':
        return [
          `**Thu hoạch ${crop}:**\n• Thời điểm: 60-90 ngày sau trồng\n• Thời gian: Sáng sớm khi trời mát\n• Cách nhận biết: Màu sắc, kích thước\n• Bảo quản: Nơi khô ráo, thoáng mát`,
          `**Thời điểm thu hoạch:**\n• Quan sát màu sắc cây\n• Kiểm tra kích thước\n• Thu hoạch vào sáng sớm\n• Bảo quản đúng cách`,
          `**Kỹ thuật thu hoạch:**\n• Cẩn thận không làm hỏng\n• Thu hoạch đúng thời điểm\n• Bảo quản khô ráo\n• Tránh ánh nắng trực tiếp`
        ];
      
      case 'soil':
        return [
          `${crop} phù hợp với đất tơi xốp, giàu dinh dưỡng và thoát nước tốt. Độ pH lý tưởng từ 6.0-7.0. Có thể cải thiện đất bằng phân hữu cơ.`,
          `Đất trồng ${crop} cần có cấu trúc tốt, không bị úng nước. Bón vôi để điều chỉnh pH và phân hữu cơ để tăng độ phì nhiêu.`,
          `Loại đất phù hợp cho ${crop}: đất thịt nhẹ, đất phù sa hoặc đất đỏ bazan. Tránh đất sét nặng hoặc đất cát quá khô.`
        ];
      
      case 'weather':
        return [
          `${crop} phát triển tốt trong điều kiện thời tiết ổn định, nhiệt độ từ 20-30°C. Tránh trồng vào mùa khô hạn hoặc mưa quá nhiều.`,
          `Thời tiết ảnh hưởng lớn đến ${crop}. Mùa mưa thuận lợi cho tăng trưởng, nhưng cần chú ý phòng bệnh nấm. Mùa khô cần tưới nước thường xuyên.`,
          `Để bảo vệ ${crop} khỏi thời tiết xấu, có thể sử dụng lưới che nắng, nhà kính hoặc hệ thống tưới tiêu tự động.`
        ];
      
      case 'pest':
        return [
          `Sâu bệnh hại ${crop} thường gặp: rệp, sâu ăn lá, bệnh thối rễ. Phòng trừ bằng cách vệ sinh đồng ruộng, sử dụng thuốc sinh học.`,
          `Để phòng trừ sâu bệnh cho ${crop}, cần kiểm tra thường xuyên, phát hiện sớm và xử lý kịp thời. Ưu tiên sử dụng biện pháp sinh học.`,
          `Sâu bệnh ${crop} có thể phòng trừ bằng cách: luân canh cây trồng, sử dụng giống kháng bệnh, bón phân cân đối và phun thuốc khi cần.`
        ];
      
      default:
        return [
          `Đây là câu hỏi thú vị về ${crop}. Tôi có thể tư vấn chi tiết về kỹ thuật trồng, chăm sóc, thu hoạch và phòng trừ sâu bệnh.`,
          `${crop} là loại cây trồng phổ biến. Bạn có thể hỏi cụ thể về kỹ thuật trồng, chăm sóc hoặc các vấn đề gặp phải.`,
          `Tôi sẵn sàng tư vấn về ${crop} và các vấn đề nông nghiệp khác. Hãy cho tôi biết bạn cần hỗ trợ gì cụ thể.`
        ];
    }
  }
}
