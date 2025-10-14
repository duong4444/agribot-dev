@echo off
echo 🧪 Testing Python AI Service
echo ============================

echo.
echo 🔍 Testing health endpoint...
curl -s http://localhost:8000/health
if %errorlevel% neq 0 (
    echo ❌ Service not running! Please start with: run.bat
    pause
    exit /b 1
)

echo.
echo.
echo 🔍 Testing intent classification...
curl -s -X POST http://localhost:8000/intent/classify ^
  -H "Content-Type: application/json" ^
  -d "{\"text\": \"doanh thu tháng này là bao nhiêu?\"}"

echo.
echo.
echo 🔍 Testing NER extraction...
curl -s -X POST http://localhost:8000/ner/extract ^
  -H "Content-Type: application/json" ^
  -d "{\"text\": \"tôi trồng cà chua ở luống A\"}"

echo.
echo.
echo 🔍 Testing combined analysis...
curl -s -X POST http://localhost:8000/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"text\": \"doanh thu tháng này là bao nhiêu?\"}"

echo.
echo.
echo ✅ All tests completed!
pause




