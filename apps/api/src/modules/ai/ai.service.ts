import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIResponse {
  content: string;
  intent: string;
  confidence: number;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
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

  constructor(private configService: ConfigService) {}

  /** !!!!
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
      ]
    };

    // Tìm intent phù hợp nhất
    let bestIntent = 'general';
    let maxConfidence = 0.3; // Default confidence for general questions

    // 
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
   * Tạo phản hồi AI dựa trên intent và entities
   */
  async generateResponse(
    userMessage: string,
    intentAnalysis: IntentAnalysis
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Tạo prompt dựa trên intent
      const prompt = this.createPrompt(userMessage, intentAnalysis);
      console.log("prompt_gửi AI: ",prompt);
      
      // TODO: Thay thế bằng OpenAI API thực tế
      const response = await this.generateMockResponse(prompt, intentAnalysis);
      
      const processingTime = Date.now() - startTime;

      return {
        content: response,
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        metadata: {
          model: 'mock-agricultural-ai',
          processingTime
        }
      };

    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      
      return {
        content: 'Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        intent: 'error',
        confidence: 0.1,
        metadata: {
          model: 'error-fallback',
          processingTime: Date.now() - startTime
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
Hãy trả lời câu hỏi của người nông dân một cách chính xác, dễ hiểu và thực tế.

Câu hỏi: "${userMessage}"
Intent: ${intent}
Entities: ${JSON.stringify(entities)}

Hãy trả lời bằng tiếng Việt, ngắn gọn nhưng đầy đủ thông tin.`;

    console.log("base prompt: ",basePrompt);
    

    // Customize prompt based on intent
    switch (intent) {
      case 'planting':
        return basePrompt + '\n\nTập trung vào: kỹ thuật trồng, thời vụ, chuẩn bị đất, mật độ trồng.';
      
      case 'care':
        return basePrompt + '\n\nTập trung vào: chăm sóc hàng ngày, tưới nước, bón phân, phòng bệnh.';
      
      case 'harvest':
        return basePrompt + '\n\nTập trung vào: thời điểm thu hoạch, cách thu hoạch, bảo quản sau thu hoạch.';
      
      case 'soil':
        return basePrompt + '\n\nTập trung vào: loại đất phù hợp, cải thiện đất, độ pH, dinh dưỡng.';
      
      case 'weather':
        return basePrompt + '\n\nTập trung vào: ảnh hưởng của thời tiết, biện pháp bảo vệ, thời vụ phù hợp.';
      
      case 'pest':
        return basePrompt + '\n\nTập trung vào: nhận biết sâu bệnh, biện pháp phòng trừ, thuốc bảo vệ thực vật.';
      
      default:
        return basePrompt + '\n\nTrả lời tổng quát về nông nghiệp, cung cấp thông tin hữu ích.';
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
          `Để trồng ${crop} hiệu quả, bạn cần chuẩn bị đất kỹ lưỡng, chọn giống tốt và trồng đúng thời vụ. Đất cần được làm tơi xốp, bón lót phân hữu cơ và đảm bảo thoát nước tốt.`,
          `Kỹ thuật trồng ${crop} bao gồm: chuẩn bị đất, gieo hạt hoặc trồng cây con, tưới nước đều đặn và theo dõi sự phát triển. Nên trồng vào mùa mưa hoặc có hệ thống tưới tiêu.`,
          `Trồng ${crop} cần chú ý đến mật độ trồng phù hợp, khoảng cách giữa các cây để đảm bảo ánh sáng và không khí lưu thông tốt.`
        ];
      
      case 'care':
        return [
          `Chăm sóc ${crop} cần tưới nước đều đặn, bón phân định kỳ và theo dõi sâu bệnh. Tưới nước vào sáng sớm hoặc chiều mát, tránh tưới vào giữa trưa.`,
          `Để ${crop} phát triển tốt, cần bón phân NPK cân đối, làm cỏ thường xuyên và phòng trừ sâu bệnh kịp thời. Kiểm tra lá và thân cây hàng ngày.`,
          `Chăm sóc ${crop} bao gồm: tưới nước, bón phân, cắt tỉa lá già, làm cỏ và phun thuốc phòng bệnh khi cần thiết.`
        ];
      
      case 'harvest':
        return [
          `Thu hoạch ${crop} nên thực hiện vào sáng sớm khi trời mát. Quan sát màu sắc và kích thước để xác định thời điểm thu hoạch phù hợp.`,
          `Thời điểm thu hoạch ${crop} phụ thuộc vào giống và điều kiện thời tiết. Thường từ 60-90 ngày sau khi trồng, tùy loại cây.`,
          `Khi thu hoạch ${crop}, cần cẩn thận để không làm tổn thương cây. Sử dụng dụng cụ sạch và bảo quản nơi thoáng mát.`
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
