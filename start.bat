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
echo  Chiudi le finestre figlie per fermare i server.
echo ============================================================
echo.

start "WAS - Backend"  cmd /k "cd /d %BACK% && set MAVEN_OPTS=%MAVEN_OPTS% && mvnw.cmd spring-boot:run"
timeout /t 3 /nobreak >nul
start "WAS - Frontend" cmd /k "cd /d %FRONT% && npm start"

echo  Finestre avviate.
timeout /t 2 /nobreak >nul
endlocal
