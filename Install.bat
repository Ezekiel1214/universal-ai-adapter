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

:: Create Start Menu shortcuts
echo Creating shortcuts...
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter.lnk');$s.TargetPath='%INSTALL_DIR%\universal-ai-adapter.exe';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Universal AI Adapter';$s.Save()"

:: Create Desktop shortcut
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%PUBLIC%\Desktop\Universal AI Adapter.lnk');$s.TargetPath='%INSTALL_DIR%\universal-ai-adapter.exe';$s.WorkingDirectory='%INSTALL_DIR%';$s.Description='Universal AI Adapter';$s.Save()"

:: Create uninstaller
echo Creating uninstaller...
(
echo @echo off
echo rd /s /q "%INSTALL_DIR%"
echo del "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Universal AI Adapter.lnk" 2^>nul
echo del "%PUBLIC%\Desktop\Universal AI Adapter.lnk" 2^>nul
echo echo Uninstall complete.
echo pause
) > "%INSTALL_DIR%\uninstall.bat"

echo.
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo Installed to: %INSTALL_DIR%
echo.
echo You can find the app in:
echo   - Start Menu
echo   - Desktop
echo.
echo To run the server, you need Node.js installed.
echo.
pause
