import pyautogui
import keyboard
import time
import random
import math

# ==========================================
# KONFIGURACJA BOTA
# ==========================================

# Współrzędne obszaru minimapy na ekranie (lewy górny róg X, Y, szerokość, wysokość)
# Musisz dostosować te wartości do swojego ekranu!
# Przykład: minimapa zaczyna się na 1500px w prawo od lewej krawędzi i 50px w dół od górnej. 
# Ma szerokość 300px i wysokość 300px.
MINIMAP_REGION = (2031, 503, 200, 200)

# Współrzędne (X, Y) środka minimapy na ekranie, czyli miejsca, w którym znajduje się Twoja postać.
# Służy to do wyszukiwania najbliższego potwora zaczynając od środka minimapy.
MINIMAP_CENTER = (2131, 603)

# Kolor kwadracika potwora lub znacznika na minimapie w formacie (R, G, B).
# Jeśli twoja minimapa pokazuje potwory jako różowe kropki, ustaw tutaj ten kolor.
# Możesz też dodać kilka wariantów kolorów, jeśli gracze używają różnych skórek / dodatków.
MONSTER_COLORS = [
    (220, 222, 223),  # szary
    (255, 182, 193),  # jasny różowy
    (255, 105, 180),  # średni różowy
    (255, 20, 147),   # mocny różowy
]
COLOR_TOLERANCE = 60 # Zwiększona tolerancja, by złapać różne odcienie i cienie

# Konfiguracja wykrywania walki:
# Podaj koordynaty X, Y miejsca na ekranie, które jest widoczne TYLKO podczas walki.
# Może to być np. czerwony pasek życia potwora lub jakiś element GUI walki.
BATTLE_PIXEL_X = 960
BATTLE_PIXEL_Y = 100
# Podaj kolor, jaki znajduje się w tym miejscu PODCZAS WALKI.
BATTLE_PIXEL_COLOR = (255, 0, 0) # Przykładowy czerwony pasek

# ==========================================
# GŁÓWNA LOGIKA BOTA
# ==========================================

def color_matches(c1, c2, tolerance):
    """Sprawdza czy dwa kolory są do siebie podobne w ramach tolerancji."""
    return (abs(c1[0] - c2[0]) <= tolerance and
            abs(c1[1] - c2[1]) <= tolerance and
            abs(c1[2] - c2[2]) <= tolerance)

def color_matches_any(c1, colors, tolerance):
    return any(color_matches(c1, color, tolerance) for color in colors)

def is_in_battle():
    """Wyłączone - użytkownik ma auto walkę."""
    return False

from PIL import ImageGrab

def find_nearest_monster():
    """Przeszukuje obszar minimapy i znajduje współrzędne najbliższego potwora (szarego kwadracika)."""
    try:
        # Robimy zrzut ekranu używając bezpośrednio PIL.ImageGrab z opcją all_screens=True
        # aby poprawnie złapać obraz z drugiego monitora (bbox to: left, top, right, bottom)
        bbox = (MINIMAP_REGION[0], MINIMAP_REGION[1], MINIMAP_REGION[0] + MINIMAP_REGION[2], MINIMAP_REGION[1] + MINIMAP_REGION[3])
        screenshot = ImageGrab.grab(bbox=bbox, all_screens=True)
        
        # ZAPIS DEBUGUJĄCY: Zapisuje obraz do pliku, żebyśmy widzieli co widzi bot
        screenshot.save('debug_minimap.png')
        
        width, height = screenshot.size
        
        nearest_pos = None
        min_distance = float('inf')
        
        # Skanujemy piksele minimapy (skok co 2 piksele dla optymalizacji wydajności)
        for x in range(0, width, 2):
            for y in range(0, height, 2):
                pixel_color = screenshot.getpixel((x, y))
                
                # Jeśli trafimy na kolor potwora
                if color_matches_any(pixel_color, MONSTER_COLORS, COLOR_TOLERANCE):
                    # Przeliczamy współrzędne obrazka na współrzędne globalne ekranu
                    global_x = MINIMAP_REGION[0] + x
                    global_y = MINIMAP_REGION[1] + y
                    
                    # Obliczamy dystans od środka minimapy (czyli od gracza)
                    dx = global_x - MINIMAP_CENTER[0]
                    dy = global_y - MINIMAP_CENTER[1]
                    distance = math.sqrt(dx**2 + dy**2)
                    
                    if distance < min_distance:
                        # Odrzucamy potwory, które są podejrzanie blisko (np. to jesteśmy my lub NPC na naszym polu)
                        if distance > 5: 
                            min_distance = distance
                            nearest_pos = (global_x, global_y)
                            
        return nearest_pos
    except Exception as e:
        print(f"[Błąd] Błąd podczas szukania potwora: {e}")
        return None

def main():
    print("Bot uruchomiony. Aby wyłączyć wciśnij i przytrzymaj klawisz 'ESC'.")
    print("Zanim bot zacznie działać upewnij się, że masz otwarte okno gry na wierzchu.")
    time.sleep(3) # Czekamy 3 sekundy na przejście do gry
    
    while True:
        # AWARYJNE WYŁĄCZENIE (KILL-SWITCH)
        if keyboard.is_pressed('esc'):
            print("Wykryto naciśnięcie ESC. Bot zostaje zatrzymany.")
            break
            
        # 1. Zabezpieczenie przed klikaniem w trakcie walki
        if is_in_battle():
            print("[Walka] Postać walczy. Czekam...")
            time.sleep(1) # Czekamy 1 sekundę i sprawdzamy ponownie
            continue
            
        # 2. Szukanie potwora na minimapie
        print("[Szukanie] Przeszukuję minimapę...")
        target_pos = find_nearest_monster()
        
        if target_pos:
            target_x, target_y = target_pos
            print(f"[Znalazłem] Cel na współrzędnych: X:{target_x}, Y:{target_y}")
            
            # 4. Anty-Ban: Dodanie losowego marginesu kliknięcia (+/- 2 piksele)
            offset_x = random.randint(-2, 2)
            offset_y = random.randint(-2, 2)
            click_x = target_x + offset_x
            click_y = target_y + offset_y
            
            # 3. Wykonanie ruchu postaci (kliknięcie lewym przyciskiem myszy)
            pyautogui.moveTo(click_x, click_y, duration=random.uniform(0.1, 0.3)) # Naturalny ruch kursorem
            pyautogui.click()
            print(f"[Akcja] Kliknięto: X:{click_x}, Y:{click_y}")
            
            # 4. Anty-Ban: Losowe opóźnienie (od 1.5 do 3 sekund) na dojście do potwora
            delay = random.uniform(1.5, 3.0)
            print(f"[Czekam] Oczekuję {delay:.2f} s na dojście do celu...")
            time.sleep(delay)
        else:
            # Jeśli nie znaleziono żadnych mobów, czekamy chwilę by nie obciążać procesora
            print("[Brak Celu] Nie widzę potworów. Czekam...")
            time.sleep(0.5)

if __name__ == "__main__":
    main()
