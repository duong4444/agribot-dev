#!/bin/bash

# Agricultural Chatbot System Setup Script
# This script sets up the development environment for the AgriBot project

set -e

echo "🌱 Setting up Agricultural Chatbot System (AgriBot)"
echo "=================================================="

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Node.js version is 18+
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ pnpm version: $(pnpm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Setup environment files
echo ""
echo "🔧 Setting up environment files..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

if [ ! -f apps/web/.env.local ]; then
    cp env.example apps/web/.env.local
    echo "✅ Created apps/web/.env.local file"
else
    echo "✅ apps/web/.env.local file already exists"
fi

if [ ! -f apps/api/.env ]; then
    cp env.example apps/api/.env
    echo "✅ Created apps/api/.env file"
else
    echo "✅ apps/api/.env file already exists"
fi

# Build shared packages
echo ""
echo "🔨 Building shared packages..."
pnpm --filter @agri-chatbot/shared build

# Check if PostgreSQL is running
echo ""
echo "🗄️  Checking database connection..."
if command -v psql &> /dev/null; then
    if psql -h localhost -U postgres -d postgres -c '\q' 2>/dev/null; then
        echo "✅ PostgreSQL is running"
        
        # Create database if it doesn't exist
        if ! psql -h localhost -U postgres -d agri_chatbot -c '\q' 2>/dev/null; then
            echo "📊 Creating database..."
            createdb -h localhost -U postgres agri_chatbot
            echo "✅ Database 'agri_chatbot' created"
        else
            echo "✅ Database 'agri_chatbot' already exists"
        fi
    else
        echo "⚠️  PostgreSQL is not running or not accessible"
        echo "   Please start PostgreSQL and ensure it's accessible"
    fi
else
    echo "⚠️  PostgreSQL client not found"
    echo "   Please install PostgreSQL and ensure it's running"
fi

# Check if Redis is running
echo ""
echo "🔴 Checking Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping 2>/dev/null | grep -q PONG; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not running"
        echo "   Please start Redis server"
    fi
else
    echo "⚠️  Redis client not found"
    echo "   Please install Redis and ensure it's running"
fi

# Check if MQTT broker is accessible
echo ""
echo "📡 Checking MQTT broker..."
if command -v mosquitto_pub &> /dev/null; then
    if timeout 5 mosquitto_pub -h localhost -t test -m "test" 2>/dev/null; then
        echo "✅ MQTT broker is accessible"
    else
        echo "⚠️  MQTT broker is not accessible"
        echo "   Please install and start Mosquitto MQTT broker"
    fi
else
    echo "⚠️  MQTT client not found"
    echo "   Please install Mosquitto MQTT broker"
fi

# Run database migrations
echo ""
echo "🗃️  Running database migrations..."
if pnpm db:migrate 2>/dev/null; then
    echo "✅ Database migrations completed"
else
    echo "⚠️  Database migrations failed"
    echo "   Please check your database configuration in .env"
fi

# Seed database
echo ""
echo "🌱 Seeding database..."
if pnpm db:seed 2>/dev/null; then
    echo "✅ Database seeded with initial data"
else
    echo "⚠️  Database seeding failed"
    echo "   Please check your database configuration"
fi

# Build applications
echo ""
echo "🔨 Building applications..."
if pnpm build 2>/dev/null; then
    echo "✅ Applications built successfully"
else
    echo "⚠️  Build failed - this is normal for first setup"
    echo "   Run 'pnpm build' after configuring your environment"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env files with your configuration:"
echo "   - Database credentials"
echo "   - AI service API keys (OpenAI, Hugging Face)"
echo "   - Vector database credentials (Pinecone/Weaviate)"
echo "   - MQTT broker settings"
echo ""
echo "2. Start the development servers:"
echo "   pnpm dev"
echo ""
echo "3. Access the applications:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo ""
echo "4. Create your first user account and start using AgriBot!"
echo ""
echo "📚 For more information, check the documentation in the /docs folder"
echo ""
echo "Happy farming! 🌾"
