# Agricultural Chatbot System (AgriBot)

A comprehensive AI-powered agricultural assistant system with IoT integration, built with Next.js, NestJS, and modern AI technologies.

## 🌟 Features

### Core Functionality
- **AI-Powered Chatbot**: Vietnamese language support with natural language processing
- **IoT Integration**: Real-time sensor monitoring and device control via MQTT
- **Knowledge Base**: RAG-powered agricultural knowledge system
- **Farm Management**: Complete farm data tracking and analytics
- **Smart Irrigation**: Automated irrigation control based on sensor data

### Technical Features
- **Monorepo Architecture**: Turborepo with Next.js frontend and NestJS backend
- **Modern AI Stack**: LangChain, Hugging Face models, Vector databases (Pinecone/Weaviate)
- **Real-time Communication**: WebSocket support for live updates
- **Authentication**: NextAuth with JWT tokens
- **Database**: PostgreSQL with TypeORM
- **IoT Protocol**: MQTT for sensor data and device control

## 🏗️ Architecture

```
agri-chatbot/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── src/app/           # App Router pages
│   │   ├── src/components/    # React components
│   │   ├── src/lib/          # Utilities and configurations
│   │   └── src/hooks/        # Custom React hooks
│   └── api/                   # NestJS Backend
│       ├── src/modules/       # Feature modules
│       │   ├── auth/         # Authentication
│       │   ├── ai/           # AI services
│       │   ├── iot/          # IoT integration
│       │   ├── chat/         # Chat functionality
│       │   ├── farm/         # Farm management
│       │   └── knowledge/    # Knowledge base
│       └── src/common/       # Shared utilities
├── packages/
│   ├── shared/               # Shared types and utilities
│   ├── ui/                   # Shared UI components
│   └── config/               # Shared configurations
└── docs/                     # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL 14+
- Redis (optional, for caching)
- MQTT Broker (Mosquitto)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agri-chatbot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and create database
   createdb agri_chatbot
   
   # Run migrations
   pnpm db:migrate
   
   # Seed initial data
   pnpm db:seed
   ```

5. **Start Development Servers**
   ```bash
   # Start all services
   pnpm dev
   
   # Or start individually
   pnpm dev:web    # Frontend on http://localhost:3000
   pnpm dev:api    # Backend on http://localhost:3001
   ```

## 🔧 Configuration

### Environment Variables

#### Database
```env
DATABASE_URL=postgresql://username:password@localhost:5432/agri_chatbot
REDIS_URL=redis://localhost:6379
```

#### Authentication
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
JWT_SECRET=your-jwt-secret
```

#### AI Services
```env
OPENAI_API_KEY=your-openai-key
HUGGINGFACE_API_KEY=your-huggingface-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-pinecone-env
```

#### IoT/MQTT
```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your-mqtt-username
MQTT_PASSWORD=your-mqtt-password
```

## 📱 Usage

### For Farmers
1. **Register/Login**: Create account or sign in
2. **Setup Farm**: Add farm details and location
3. **Connect IoT Devices**: Configure sensors and controllers
4. **Chat with AI**: Ask questions about farming practices
5. **Monitor Data**: View real-time sensor data and analytics
6. **Control Devices**: Manage irrigation and other equipment

### For Administrators
1. **Manage Users**: User registration and role management
2. **Knowledge Base**: Add/edit agricultural content
3. **System Monitoring**: View system health and usage
4. **Analytics**: Access comprehensive reports

## 🤖 AI Features

### Natural Language Processing
- **Vietnamese Language Support**: Optimized for Vietnamese agricultural terminology
- **Intent Recognition**: Understands user queries and routing
- **Sentiment Analysis**: Analyzes user feedback and mood
- **Entity Extraction**: Identifies crops, locations, and technical terms

### Knowledge Base (RAG)
- **Document Embedding**: Converts agricultural knowledge to vectors
- **Semantic Search**: Finds relevant information based on meaning
- **Context-Aware Responses**: Provides accurate answers with source references
- **Continuous Learning**: Updates knowledge base with new information

### IoT Integration
- **Sensor Data Processing**: Real-time analysis of environmental data
- **Predictive Analytics**: Forecasts based on historical data
- **Automated Recommendations**: Suggests actions based on current conditions
- **Device Control**: Intelligent automation of irrigation and other systems

## 🔌 IoT Integration

### Supported Sensors
- **Soil Moisture**: Water content monitoring
- **Temperature**: Air and soil temperature
- **Humidity**: Atmospheric humidity levels
- **Light**: Solar radiation and light intensity
- **pH**: Soil acidity/alkalinity
- **Nutrients**: NPK levels in soil
- **Weather**: Wind speed, rainfall, pressure

### Device Control
- **Irrigation Systems**: Automated watering based on soil moisture
- **Fertilizer Dispensers**: Controlled nutrient application
- **Climate Control**: Greenhouse temperature and humidity
- **Pest Control**: Automated spraying systems

### MQTT Topics
```
sensors/{deviceId}/data     # Sensor readings
sensors/{deviceId}/status   # Device status
devices/{deviceId}/control  # Device commands
irrigation/{farmId}/control # Irrigation control
system/status              # System health
```

## 🗄️ Database Schema

### Core Entities
- **Users**: Authentication and user management
- **Farms**: Farm information and ownership
- **Devices**: IoT devices and sensors
- **SensorReadings**: Time-series sensor data
- **Conversations**: Chat history
- **Messages**: Individual chat messages
- **KnowledgeArticles**: Agricultural knowledge base
- **Activities**: Farm activities and records

### Relationships
- Users own multiple Farms
- Farms have multiple Devices
- Devices generate SensorReadings
- Users have Conversations
- Conversations contain Messages
- KnowledgeArticles are searchable via embeddings

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit      # Unit tests
pnpm test:integration  # Integration tests
pnpm test:e2e       # End-to-end tests

# Test coverage
pnpm test:coverage
```

## 📦 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual services
docker build -f docker/Dockerfile.web -t agribot-web .
docker build -f docker/Dockerfile.api -t agribot-api .
```

### Production Setup
1. **Environment**: Set production environment variables
2. **Database**: Configure production PostgreSQL
3. **Redis**: Setup Redis for caching
4. **MQTT**: Configure production MQTT broker
5. **AI Services**: Setup production AI API keys
6. **Monitoring**: Configure logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commit messages
- Ensure code passes linting and formatting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions for questions and ideas
- **Email**: Contact support at support@agribot.com

## 🙏 Acknowledgments

- **LangChain**: For AI orchestration framework
- **Hugging Face**: For Vietnamese NLP models
- **Next.js & NestJS**: For the robust web framework
- **TypeORM**: For database management
- **MQTT**: For IoT communication protocol

---

**Built with ❤️ for Vietnamese farmers and the agricultural community**
