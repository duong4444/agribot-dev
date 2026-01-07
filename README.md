# AgriBot - Smart Agricultural Management System

AgriBot is a comprehensive agricultural management platform that integrates AI-powered assistance, IoT device monitoring, and farm operations management into a single unified system. It empowers farmers to make data-driven decisions, automate processes, and optimize their farming productivity.

## 🚀 Key Features

### 🌾 Farm Management
- **Overview Dashboard:** Real-time insights into farm status, weather, and recent activities.
- **Area Management:** Track and manage different cultivation areas.
- **Activity Logging:** Record farming activities (planting, fertilizing, harvesting).
- **Financial Reports:** Track revenue, expenses, and profit/loss.

### 🤖 AI Chatbot Assistant
- **Expert Advice:** Ask questions about crop care, pest control, and diseases.
- **Natural Language Processing:** Powered by PhoBERT for accurate Vietnamese language understanding.
- **Knowledge Base:** Retrieval-Augmented Generation (RAG) from agricultural documents.

### 📡 IoT & Automation
- **Device Management:** Inventory tracking and status monitoring.
- **Installation Workflow:** End-to-end flow for requesting and installing IoT devices (Farmer -> Admin -> Technician).
- **Real-time Monitoring:** View sensor data (temperature, humidity, soil moisture).
- **Remote Control:** Control irrigation and other devices remotely via MQTT.

### 🌤️ Weather Integration
- **Real-time Weather:** Current conditions for the farm's location.
- **5-Day Forecast:** Detailed forecast to plan farming activities.

## 🛠️ Tech Stack

- **Monorepo:** [Turborepo](https://turbo.build/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Frontend:** [Next.js 15](https://nextjs.org/), TypeScript, Tailwind CSS, Shadcn UI, TanStack Query
- **Backend:** [NestJS](https://nestjs.com/), TypeORM, PostgreSQL (PgVector extension)
- **Real-time:** MQTT (Eclipse Mosquitto), WebSocket (Socket.IO)
- **AI/ML Services:** 
  - Python NLP Service (PhoBERT for Intent Classification & NER)
  - Embedding Service (dangvantuan/vietnamese-document-embedding)
  - PDF Extraction Service (PaddleOCR)
  - LLM Integration (Google Gemini SDK)

## 📋 Prerequisites

- **Node.js:** >= 18.0.0
- **pnpm:** >= 8.0.0
- **Docker & Docker Compose:** For running the database and MQTT broker.

## 🏁 Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd agri-chatbot
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Start Infrastructure
Start PostgreSQL and Mosquitto MQTT broker using Docker Compose:
```bash
docker-compose up -d
```

### 4. Environment Setup
Copy the example environment files and configure them:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
*Note: Ensure `DATABASE_URL` and `MQTT_URL` in `.env` match your Docker configuration.*

### 5. Database Setup
Run migrations and seed initial data:
```bash
pnpm db:migrate
pnpm db:seed
```

### 6. Start Development Server
Start both the frontend and backend in development mode:
```bash
pnpm dev
```
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Docs (Swagger):** http://localhost:3000/api

## 📂 Project Structure

```
├── apps
│   ├── api                      # NestJS Backend Application
│   ├── web                      # Next.js Frontend Application
│   ├── python-ai-service        # Python NLP Service (PhoBERT)
│   ├── firmware                 # ESP32 IoT Device Firmware (C++)
│   └── pdf-extraction-service   # PDF Processing Service
├── embedding-service            # Vector Embedding Service
├── packages                     # Shared libraries and configurations
├── docker-compose.yml           # Infrastructure configuration
├── turbo.json                   # Turborepo configuration
└── package.json                 # Root package configuration
```

## 👥 Roles & Permissions

- **Admin:** Manage users, device inventory, and system settings.
- **Farmer:** Manage farm areas, request device installation, view stats.
- **Technician:** Handle installation requests, activate devices.

## 📄 License

This project is licensed under the MIT License.
