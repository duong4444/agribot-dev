@echo off
echo 🐍 Python AI Service Setup
echo =========================

echo.
echo 📋 Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

echo.
echo 📦 Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ❌ Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo 📥 Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📝 Next steps:
echo 1. Activate virtual environment: venv\Scripts\activate
echo 2. Run service: python src/main.py
echo 3. Test: curl http://localhost:8000/health
echo.
pause




