@echo off
setlocal

set "ROOT=%~dp0"
set "MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT"
set "BACK=%ROOT%backend"
set "FRONT=%ROOT%frontend"

echo.
echo ============================================================
echo  WebApp Scacchi - Avvio backend e frontend
echo ============================================================
echo.
echo  Backend  -^> http://localhost:8080
echo  Frontend -^> http://localhost:4200
echo.
echo  Se le porte 8080 o 4200 sono occupate, i processi in ascolto
echo  verranno chiusi prima dell'avvio.
echo.
echo  Chiudi le finestre figlie per fermare i server.
echo ============================================================
echo.

call :KillPort 8080 Backend
if errorlevel 1 goto :Fail

call :KillPort 4200 Frontend
if errorlevel 1 goto :Fail

echo.
echo  Avvio backend e frontend...
echo.

start "WAS - Backend"  cmd /k "cd /d ""%BACK%"" && set MAVEN_OPTS=%MAVEN_OPTS% && mvnw.cmd spring-boot:run"
timeout /t 3 /nobreak >nul
start "WAS - Frontend" cmd /k "cd /d ""%FRONT%"" && npm start"

echo  Finestre avviate.
timeout /t 2 /nobreak >nul
endlocal
exit /b 0

:KillPort
set "PORT=%~1"
set "LABEL=%~2"
echo  Controllo porta %PORT% (%LABEL%)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port=%PORT%; $conns=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; $pids=@($conns | Select-Object -ExpandProperty OwningProcess -Unique); if ($pids.Count -eq 0) { Write-Host ('  Porta {0} libera.' -f $port); exit 0 }; foreach ($processId in $pids) { try { $process=Get-Process -Id $processId -ErrorAction Stop; Write-Host ('  Porta {0} occupata da PID {1} ({2}). Chiusura...' -f $port,$processId,$process.ProcessName); Stop-Process -Id $processId -Force -ErrorAction Stop } catch { Write-Host ('  Errore chiudendo PID {0}: {1}' -f $processId,$_.Exception.Message); exit 1 } }"
exit /b %ERRORLEVEL%

:Fail
echo.
echo  Avvio annullato: impossibile liberare una delle porte richieste.
timeout /t 4 /nobreak >nul
endlocal
exit /b 1
