# 🤖 Google Gemini Integration Setup Guide

## 📋 **Prerequisites**

1. **Google AI Studio API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Node.js 18+**: Required for Google Generative AI
3. **pnpm**: Package manager

## 🛠️ **Installation Steps**

### 1. Install Dependencies ✅
```bash
cd apps/api
pnpm add @google/generative-ai
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env file and add your Gemini API key
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 3. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add it to your `.env` file

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

### 3. Test Gemini Direct
```bash
curl -X POST http://localhost:3000/ai/test-gemini \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Hello Gemini"}'
```

## 🔧 **Configuration Options**

### Model Selection
```typescript
// In gemini.service.ts
model: 'gemini-1.5-flash',  // or 'gemini-1.5-pro', 'gemini-1.0-pro'
temperature: 0.7,           // 0.0 to 1.0
maxOutputTokens: 1000,      // Response length
```

### Available Models
- **gemini-1.5-flash**: Fast, efficient, good for most tasks
- **gemini-1.5-pro**: More capable, better for complex reasoning
- **gemini-1.0-pro**: Stable, reliable model

### Safety Settings
```typescript
safetySettings: [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  // ... more safety categories
]
```

## 🚀 **Features**

### ✅ **Implemented**
- Google Gemini AI integration
- Agricultural-specific prompts
- Intent recognition
- Entity extraction
- Safety ratings and content filtering
- Fallback to mock responses
- Error handling
- Performance tracking

### 🔄 **Fallback System**
- If Gemini API key is missing → Mock responses
- If Gemini API fails → Mock responses
- If network issues → Error handling

## 📊 **Monitoring**

### Response Metadata
```json
{
  "content": "AI response...",
  "intent": "planting",
  "confidence": 0.8,
  "metadata": {
    "model": "gemini-1.5-flash",
    "tokens": 150,
    "processingTime": 1200,
    "safetyRatings": [...]
  }
}
```

### Status Endpoint
```json
{
  "geminiConfigured": true,
  "availableModels": ["gemini-1.5-flash", "gemini-1.5-pro"],
  "connectionTest": true,
  "timestamp": "2025-01-23T08:30:00.000Z"
}
```

## 🔒 **Security & Safety**

- API keys stored in environment variables
- JWT authentication required for all endpoints
- Built-in safety filters for content
- Safety ratings in responses
- Input validation and sanitization

## 💰 **Cost Management**

- **Free Tier**: 15 requests per minute
- **Paid Tier**: Higher rate limits
- Token usage tracking
- Response length limits
- Model selection based on complexity

## 🆚 **Gemini vs OpenAI**

| Feature | Gemini | OpenAI |
|---------|--------|--------|
| **Cost** | Free tier available | Pay per token |
| **Speed** | Very fast | Fast |
| **Quality** | Excellent | Excellent |
| **Vietnamese** | Good support | Good support |
| **Safety** | Built-in filters | Manual setup |
| **Rate Limits** | 15/min (free) | Varies |

## 🐛 **Troubleshooting**

### Common Issues

1. **"Gemini API key not found"**
   - Check `.env` file has `GEMINI_API_KEY`
   - Restart the application

2. **"Gemini API error"**
   - Check API key validity
   - Check network connectivity
   - Check rate limits (15 requests/minute for free tier)

3. **"Module not found"**
   - Run `pnpm install` in `apps/api`
   - Check package.json dependencies

4. **"Safety filter blocked"**
   - Adjust safety settings in `gemini.service.ts`
   - Check content for inappropriate material

### Debug Mode
```typescript
// Enable debug logging
this.logger.debug('Gemini request:', { prompt, options });
this.logger.debug('Gemini response:', response);
```

## 📈 **Next Steps**

1. **Knowledge Base Integration**: Add RAG with vector database
2. **Response Caching**: Cache common responses
3. **Rate Limiting**: Implement API rate limits
4. **Analytics**: Track usage and performance
5. **Multi-model Support**: Support different AI models
6. **Fine-tuning**: Custom model training for agriculture

## 🎯 **Agricultural Prompts**

The system uses specialized prompts for Vietnamese agricultural context:
- **Intent-specific prompts**: Different prompts for planting, care, harvest, etc.
- **Entity-aware responses**: Considers crop names and time references
- **Vietnamese language**: Optimized for Vietnamese agricultural terminology
- **Safety filters**: Ensures appropriate agricultural content

---

**🎉 Congratulations! Your AI Agricultural Chatbot is now powered by Google Gemini!**

## 🔗 **Useful Links**

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Generative AI Node.js SDK](https://www.npmjs.com/package/@google/generative-ai)
- [Safety Settings Guide](https://ai.google.dev/docs/safety_setting_gemini)
