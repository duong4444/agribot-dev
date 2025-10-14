@echo off
echo 🚀 Starting Python AI Service
echo ============================

echo.
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo 🐍 Starting FastAPI server...
echo Service will be available at: http://localhost:8000
echo Press Ctrl+C to stop
echo.

python src/main.py




