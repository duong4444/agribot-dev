# 🤖 OpenAI Integration Setup Guide

## 📋 **Prerequisites**

1. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Node.js 18+**: Required for LangChain
3. **pnpm**: Package manager

## 🛠️ **Installation Steps**

### 1. Install Dependencies
```bash
cd apps/api
pnpm add @langchain/openai @langchain/core @langchain/community langchain openai
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env file and add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### 3. Uncomment OpenAI Code
In `apps/api/src/modules/ai/openai.service.ts`, uncomment the following lines:

```typescript
// Uncomment these imports
import OpenAI from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Uncomment these in initializeOpenAI()
this.openai = new OpenAI({ apiKey });
this.chatModel = new ChatOpenAI({
  openAIApiKey: apiKey,
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
});

// Uncomment generateWithLangChain() implementation
const template = PromptTemplate.fromTemplate(prompt);
const outputParser = new StringOutputParser();
const chain = template.pipe(this.chatModel).pipe(outputParser);
const result = await chain.invoke({});
```

## 🧪 **Testing**

### 1. Test AI Status
```bash
curl -X GET http://localhost:3000/ai/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test AI Response
```bash
curl -X POST http://localhost:3000/ai/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "cách trồng cà chua"}'
```

### 3. Test OpenAI Direct
```bash
curl -X POST http://localhost:3000/ai/test-openai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Hello OpenAI"}'
```

## 🔧 **Configuration Options**

### Model Selection
```typescript
// In openai.service.ts
modelName: 'gpt-3.5-turbo',  // or 'gpt-4', 'gpt-4-turbo'
temperature: 0.7,            // 0.0 to 1.0
maxTokens: 1000,             // Response length
```

### Agricultural Prompts
The system uses specialized prompts for Vietnamese agricultural context:
- **Intent-specific prompts**: Different prompts for planting, care, harvest, etc.
- **Entity-aware responses**: Considers crop names and time references
- **Vietnamese language**: Optimized for Vietnamese agricultural terminology

## 🚀 **Features**

### ✅ **Implemented**
- OpenAI GPT integration
- LangChain orchestration
- Intent recognition
- Entity extraction
- Agricultural-specific prompts
- Fallback to mock responses
- Error handling
- Performance tracking

### 🔄 **Fallback System**
- If OpenAI API key is missing → Mock responses
- If OpenAI API fails → Mock responses
- If network issues → Error handling

## 📊 **Monitoring**

### Response Metadata
```json
{
  "content": "AI response...",
  "intent": "planting",
  "confidence": 0.8,
  "metadata": {
    "model": "gpt-3.5-turbo",
    "tokens": 150,
    "processingTime": 1200
  }
}
```

### Status Endpoint
```json
{
  "openAIConfigured": true,
  "availableModels": ["gpt-3.5-turbo", "gpt-4"],
  "connectionTest": true,
  "timestamp": "2025-01-23T08:30:00.000Z"
}
```

## 🔒 **Security**

- API keys stored in environment variables
- JWT authentication required for all endpoints
- Rate limiting (to be implemented)
- Input validation and sanitization

## 💰 **Cost Management**

- Token usage tracking
- Response length limits
- Model selection based on complexity
- Caching for repeated queries (to be implemented)

## 🐛 **Troubleshooting**

### Common Issues

1. **"OpenAI API key not found"**
   - Check `.env` file has `OPENAI_API_KEY`
   - Restart the application

2. **"OpenAI API error"**
   - Check API key validity
   - Check network connectivity
   - Check OpenAI account credits

3. **"Module not found"**
   - Run `pnpm install` in `apps/api`
   - Check package.json dependencies

### Debug Mode
```typescript
// Enable debug logging
this.logger.debug('OpenAI request:', { prompt, options });
this.logger.debug('OpenAI response:', response);
```

## 📈 **Next Steps**

1. **Knowledge Base Integration**: Add RAG with vector database
2. **Response Caching**: Cache common responses
3. **Rate Limiting**: Implement API rate limits
4. **Analytics**: Track usage and performance
5. **Multi-model Support**: Support different AI models
6. **Fine-tuning**: Custom model training for agriculture

---

**🎉 Congratulations! Your AI Agricultural Chatbot is now powered by OpenAI!**
