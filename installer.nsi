; Universal AI Adapter Installer Script for NSIS
; Save as installer.nsi and compile with NSIS

!include "MUI2.nsh"

; General
Name "Universal AI Adapter"
OutFile "UniversalAIAdapter-Setup.exe"
InstallDir "$PROGRAMFILES\Universal AI Adapter"
InstallDirRegKey HKLM "Software\UniversalAIAdapter" "Install_Dir"

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "Install"
  SetOutPath $INSTDIR
  
  ; Copy files
  File "universal-ai-adapter.exe"
  File "server.js"
  File "web\public\index.html"
  
  ; Create Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\Universal AI Adapter"
  CreateShortCut "$SMPROGRAMS\Universal AI Adapter\Universal AI Adapter.lnk" "$INSTDIR\universal-ai-adapter.exe"
  CreateShortCut "$SMPROGRAMS\Universal AI Adapter\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Create Desktop shortcut
  CreateShortCut "$DESKTOP\Universal AI Adapter.lnk" "$INSTDIR\universal-ai-adapter.exe"
  
  ; Write registry keys
  WriteRegStr HKLM "Software\UniversalAIAdapter" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniversalAIAdapter" "DisplayName" "Universal AI Adapter"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniversalAIAdapter" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove files
  Delete "$INSTDIR\universal-ai-adapter.exe"
  Delete "$INSTDIR\server.js"
  Delete "$INSTDIR\index.html"
  Delete "$INSTDIR\Uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Universal AI Adapter\Universal AI Adapter.lnk"
  Delete "$SMPROGRAMS\Universal AI Adapter\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Universal AI Adapter"
  Delete "$DESKTOP\Universal AI Adapter.lnk"
  
  ; Remove install directory
  RMDir "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\UniversalAIAdapter"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniversalAIAdapter"
SectionEnd
