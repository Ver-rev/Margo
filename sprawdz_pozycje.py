import pyautogui
import time
import keyboard

print("==========================================")
print(" NARZĘDZIE DO SPRAWDZANIA WSPÓŁRZĘDNYCH ")
print("==========================================")
print("Najedź kursorem myszy na wybrane miejsce na ekranie.")
print("Współrzędne będą wyświetlane poniżej na bieżąco.")
print("Aby zakończyć, wciśnij klawisz ESC.")
print("------------------------------------------")

try:
    while True:
        if keyboard.is_pressed('esc'):
            print("\nZakończono sprawdzanie.")
            break
            
        x, y = pyautogui.position()
        
        # Pobieranie koloru pod kursorem w formacie RGB
        try:
            r, g, b = pyautogui.pixel(x, y)
            color_info = f" | Kolor (RGB): ({r:>3}, {g:>3}, {b:>3})"
        except Exception:
            color_info = " | Kolor: niedostępny"
            
        position_str = f"Pozycja myszy -> X: {x:>5} Y: {y:>5}{color_info}"
        
        # Wypisywanie w tej samej linii
        print(position_str, end='\r')
        
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\nZakończono sprawdzanie.")
