@echo off
echo ==========================================
echo Instalowanie wymaganych bibliotek...
echo ==========================================
pip install pyautogui keyboard pillow
if %errorlevel% neq 0 (
    echo [BLAD] Nie udalo sie zainstalowac bibliotek. Upewnij sie, ze zainstalowales Python i zaznaczyles "Add python.exe to PATH".
    pause
    exit /b
)

echo.
echo ==========================================
echo Uruchamianie bota...
echo ==========================================
echo [PAMETAJ] Aby awaryjnie wylaczyc bota, przytrzymaj klawisz ESC.
python pixel_bot_margonem.py

pause
