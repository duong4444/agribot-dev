@echo off
setlocal enabledelayedexpansion

echo 🌱 Setting up Agricultural Chatbot System (AgriBot)
echo ==================================================

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pnpm is not installed. Please install pnpm first:
    echo    npm install -g pnpm
    pause
    exit /b 1
)

REM Check if Node.js version is 18+
for /f "tokens=1 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node -v
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node -v
echo ✅ pnpm version: 
pnpm --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
pnpm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Setup environment files
echo.
echo 🔧 Setting up environment files...
if not exist .env (
    copy env.example .env >nul
    echo ✅ Created .env file from template
    echo ⚠️  Please edit .env file with your configuration
) else (
    echo ✅ .env file already exists
)

if not exist apps\web\.env.local (
    copy env.example apps\web\.env.local >nul
    echo ✅ Created apps\web\.env.local file
) else (
    echo ✅ apps\web\.env.local file already exists
)

if not exist apps\api\.env (
    copy env.example apps\api\.env >nul
    echo ✅ Created apps\api\.env file
) else (
    echo ✅ apps\api\.env file already exists
)

REM Build shared packages
echo.
echo 🔨 Building shared packages...
pnpm --filter @agri-chatbot/shared build
if errorlevel 1 (
    echo ⚠️  Failed to build shared packages - this is normal for first setup
)

REM Check if PostgreSQL is available
echo.
echo 🗄️  Checking database connection...
where psql >nul 2>&1
if not errorlevel 1 (
    echo ✅ PostgreSQL client found
    echo ⚠️  Please ensure PostgreSQL is running and create database 'agri_chatbot'
) else (
    echo ⚠️  PostgreSQL client not found
    echo    Please install PostgreSQL and ensure it's running
)

REM Check if Redis is available
echo.
echo 🔴 Checking Redis connection...
where redis-cli >nul 2>&1
if not errorlevel 1 (
    echo ✅ Redis client found
    echo ⚠️  Please ensure Redis server is running
) else (
    echo ⚠️  Redis client not found
    echo    Please install Redis and ensure it's running
)

REM Check if MQTT broker is available
echo.
echo 📡 Checking MQTT broker...
where mosquitto_pub >nul 2>&1
if not errorlevel 1 (
    echo ✅ MQTT client found
    echo ⚠️  Please ensure MQTT broker is running
) else (
    echo ⚠️  MQTT client not found
    echo    Please install Mosquitto MQTT broker
)

REM Try to run database migrations
echo.
echo 🗃️  Running database migrations...
pnpm db:migrate >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Database migrations failed
    echo    Please check your database configuration in .env
) else (
    echo ✅ Database migrations completed
)

REM Try to seed database
echo.
echo 🌱 Seeding database...
pnpm db:seed >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Database seeding failed
    echo    Please check your database configuration
) else (
    echo ✅ Database seeded with initial data
)

REM Try to build applications
echo.
echo 🔨 Building applications...
pnpm build >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Build failed - this is normal for first setup
    echo    Run 'pnpm build' after configuring your environment
) else (
    echo ✅ Applications built successfully
)

echo.
echo 🎉 Setup completed!
echo.
echo 📋 Next steps:
echo 1. Edit .env files with your configuration:
echo    - Database credentials
echo    - AI service API keys (OpenAI, Hugging Face)
echo    - Vector database credentials (Pinecone/Weaviate)
echo    - MQTT broker settings
echo.
echo 2. Start the development servers:
echo    pnpm dev
echo.
echo 3. Access the applications:
echo    - Frontend: http://localhost:3000
echo    - Backend API: http://localhost:3001
echo.
echo 4. Create your first user account and start using AgriBot!
echo.
echo 📚 For more information, check the documentation in the /docs folder
echo.
echo Happy farming! 🌾
echo.
pause
