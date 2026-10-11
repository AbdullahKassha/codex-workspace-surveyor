@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Workspace Surveyor for Codex
set "SURVEYOR_ROOT=%~dp0"
rem Resolve Node from PATH only; never execute a node.exe in the caller's directory.
for %%N in (node.exe) do set "SURVEYOR_NODE=%%~$PATH:N"
if not defined SURVEYOR_NODE (
  echo Node.js 24 is required on PATH. Complete the setup in README.md, then launch again.
  pause
  exit /b 1
)
if not exist "%SURVEYOR_ROOT%dist\test\support\windows-explorer-entry.js" (
  echo Compiled output is unavailable. Run npm run build in the repository after setup or an update.
  pause
  exit /b 1
)
pushd "%SURVEYOR_ROOT%" >nul 2>&1
if errorlevel 1 (
  echo Cannot enter the Workspace Surveyor repository directory. Check its availability and permissions, then launch again.
  pause
  exit /b 1
)
"%SURVEYOR_NODE%" "%SURVEYOR_ROOT%dist\test\support\windows-explorer-entry.js" %*
set "SURVEYOR_EXIT=%ERRORLEVEL%"
popd
echo.
echo Workspace Surveyor has finished. Review any messages above before closing this window.
pause
exit /b %SURVEYOR_EXIT%
