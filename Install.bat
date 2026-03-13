@echo off
setlocal enabledelayedexpansion

title Universal AI Adapter Installer
color 1f

echo ==========================================
echo   Universal AI Adapter - Installer
echo ==========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This installer requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

:: Check for Node.js
echo Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo   1. Visit https://nodejs.org
    echo   2. Download and install LTS version
    echo   3. Restart this installer
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version
echo.

:: Set installation directory
set "INSTALL_DIR=%PROGRAMFILES%\Universal AI Adapter"

echo Installing to: %INSTALL_DIR%
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    if !errorlevel! neq 0 (
        echo Failed to create installation directory.
        pause
        exit /b 1
    )
)

:: Copy files
echo Copying files...
copy /Y "universal-ai-adapter.exe" "%INSTALL_DIR%\" >nul
copy /Y "server.js" "%INSTALL_DIR%\" >nul
copy /Y "package.json" "%INSTALL_DIR%\" >nul

if !errorlevel! neq 0 (
    echo Failed to copy files.
    pause
    exit /b 1
)

if exist "web" (
    xcopy /E /Y "web" "%INSTALL_DIR%\web\" >nul
)

:: Create Start Menu shortcuts
echo Creating shortcuts...
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter.lnk');$s.TargetPath='%INSTALL_DIR%\universal-ai-adapter.exe';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Universal AI Adapter';$s.Save()"

:: Create Desktop shortcut
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PUBLIC%\Desktop\Universal AI Adapter.lnk');$s.TargetPath='%INSTALL_DIR%\universal-ai-adapter.exe';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Universal AI Adapter';$s.Save()"

:: Create uninstaller
echo Creating uninstaller...
(
echo @echo off
echo title Universal AI Adapter - Uninstaller
echo color 1f
echo echo ==========================================
echo echo   Universal AI Adapter - Uninstall
echo echo ==========================================
echo echo.
echo echo Removing files...
echo rd /s /q "%INSTALL_DIR%"
echo.
echo Removing shortcuts...
echo del "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter.lnk" 2^>nul
echo del "%PUBLIC%\Desktop\Universal AI Adapter.lnk" 2^>nul
echo.
echo ==========================================
echo echo Uninstall complete.
echo ==========================================
echo pause
) > "%INSTALL_DIR%\Uninstall.bat"

:: Create Start Menu shortcut for uninstaller
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter\Uninstall.lnk');$s.TargetPath='%INSTALL_DIR%\Uninstall.bat';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Uninstall Universal AI Adapter';$s.Save()"

:: Create Start Menu folder first
if not exist "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter" (
    mkdir "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter"
)
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter\Universal AI Adapter.lnk');$s.TargetPath='%INSTALL_DIR%\universal-ai-adapter.exe';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Universal AI Adapter';$s.Save()"
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter\Uninstall.lnk');$s.TargetPath='%INSTALL_DIR%\Uninstall.bat';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Uninstall Universal AI Adapter';$s.Save()"

:: Create README
(
echo Universal AI Adapter
echo ===================
echo.
echo Quick Start:
echo 1. Make sure Ollama is installed (https://ollama.ai)
echo 2. Run: node server.js
echo 3. Open http://localhost:3000 in your browser
echo.
echo Or use the CLI:
echo   universal-ai-adapter.exe --prompt "Your question"
echo.
echo For help: https://github.com/universal-ai-adapter
) > "%INSTALL_DIR%\README.txt"

echo.
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo Installed to: %INSTALL_DIR%
echo.
echo You can find the app in:
echo   - Start Menu ^> Universal AI Adapter
echo   - Desktop shortcut
echo.
echo To run:
echo   1. Make sure Ollama is installed (https://ollama.ai)
echo   2. Run: node server.js
echo   3. Open: http://localhost:3000
echo.
echo To uninstall: Start Menu ^> Universal AI Adapter ^> Uninstall
echo.
pause
