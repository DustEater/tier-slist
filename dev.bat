@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo [错误] 未找到 npm，请先安装 Node.js: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo 正在首次安装依赖...
  call npm install
  if errorlevel 1 (
    echo [错误] npm install 失败
    pause
    exit /b 1
  )
)

echo 启动开发服务器，请在浏览器打开终端里显示的地址...
echo 按 Ctrl+C 可停止服务。
echo.
call npm run dev
echo.
pause
