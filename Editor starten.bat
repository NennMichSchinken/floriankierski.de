@echo off
REM ---------------------------------------------------------------------
REM  Startet den lokalen Server und oeffnet den Szene-Editor im Browser.
REM  Einfach doppelklicken.
REM
REM  Solange das Fenster offen ist, laeuft der Server. Es sieht dann so aus,
REM  als haenge es - das ist richtig so. Beenden: Fenster schliessen oder
REM  Strg + C druecken.
REM ---------------------------------------------------------------------

cd /d "%~dp0"

set PORT=5173
set ZIEL=http://localhost:%PORT%/tools/szene-editor.html

REM Laeuft schon einer auf dem Port? Dann nur den Browser oeffnen.
netstat -an | findstr /c:":%PORT% " | findstr /i "ABHOEREN LISTENING ABH" >nul
if %errorlevel%==0 (
  echo.
  echo   Auf Port %PORT% laeuft bereits ein Server - es wird nur der Browser geoeffnet.
  echo.
  start "" "%ZIEL%"
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo.
echo   Server startet auf http://localhost:%PORT%
echo.
echo   Editor:   %ZIEL%
echo   Seite:    http://localhost:%PORT%/
echo.
echo   Dieses Fenster offen lassen. Beenden mit Strg + C.
echo.

REM Browser kurz verzoegert oeffnen, damit der Server schon lauscht
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start """" ""%ZIEL%"""

python -m http.server %PORT%

REM Hierher kommt man nur, wenn der Server abbricht
echo.
echo   Der Server wurde beendet.
echo   Kam eine Fehlermeldung ueber Python? Dann ist es nicht installiert
echo   oder nicht im PATH.
echo.
pause
