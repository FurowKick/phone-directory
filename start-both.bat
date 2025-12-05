@echo off
setlocal

:: Автоматически определяем папку, где лежит .bat-файл
set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"

title Phone Directory - Starting servers

echo [1/3] Checking frontend dependencies...
cd /d "%ROOT_DIR%\frontend"
if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install frontend dependencies. Make sure Node.js is installed.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
) else (
    echo Dependencies already installed.
)

echo.
echo [2/3] Starting backend...
start "Backend" cmd /k "cd /d "%ROOT_DIR%\PhoneDirectory.Api" && dotnet run"

echo [3/3] Starting frontend...
start "Frontend" cmd /k "cd /d "%ROOT_DIR%\frontend" && npm run dev"

echo.
echo ✅ All servers started!
pause
