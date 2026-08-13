@echo off
cd /d "%~dp0"
echo.
echo Vokabel-Held wird gestartet...
echo.
echo Auf dem Handy im selben WLAN im Browser oeffnen:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4"') do echo    https://%%a:8420  (Leerzeichen am Anfang ignorieren)
echo.
echo Beim ALLERERSTEN Oeffnen zeigt das Handy eine Sicherheitswarnung
echo ("Verbindung ist nicht privat" o.ae.) - das ist normal bei einem
echo selbst erstellten Zertifikat fuer das Heimnetzwerk. Auf "Trotzdem
echo oeffnen" bzw. "Erweitert - Weiter" tippen. Das passiert nur einmal.
echo.
echo Dieses Fenster muss offen bleiben, solange die App auf dem Handy genutzt wird.
echo Zum Beenden: Fenster einfach schliessen.
echo.
python https-server.py
pause
