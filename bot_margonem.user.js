// ==UserScript==
// @name         Margonem NI - Bot (Minimapa)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Bot do Margonem (NI), który sam klika w szare kwadraciki (potwory) na minimapie.
// @author       Antigravity
// @match        https://*.margonem.pl/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Konfiguracja
    const CONFIG = {
        // Klasa CSS "szarego kwadracika" (potworka) na minimapie.
        // Będziesz musiał to dostosować, zależnie od tego, jakiego dodatku do minimapy używasz.
        // Jeśli używasz dodatków typu miniMap+, szukaj klas takich jak '.npc', '.minimap-npc' itp.
        npcSelector: '.minimap-dot-npc, .minimap-marker.monster', 
        
        // Czas między kolejnymi sprawdzeniami (w milisekundach)
        intervalMs: 1500,
        
        // Czy bot ma działać
        isRunning: false
    };

    let botInterval = null;

    // Funkcja do obliczania odległości między dwoma elementami na ekranie
    function getDistance(el1, el2) {
        const rect1 = el1.getBoundingClientRect();
        const rect2 = el2.getBoundingClientRect();
        
        const x1 = rect1.left + rect1.width / 2;
        const y1 = rect1.top + rect1.height / 2;
        
        const x2 = rect2.left + rect2.width / 2;
        const y2 = rect2.top + rect2.height / 2;
        
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // Główna funkcja bota
    function runBotTick() {
        if (!CONFIG.isRunning) return;

        // Sprawdź, czy gracz nie jest w walce lub czy postać już się porusza
        // (W Margonem NI obiekt Engine posiada te informacje, jeśli masz do nich dostęp)
        if (typeof Engine !== 'undefined') {
            if (Engine.battle && Engine.battle.show) {
                return; // Jesteśmy w walce, czekamy
            }
            if (Engine.hero && Engine.hero.moving) {
                return; // Postać już gdzieś idzie
            }
        }

        // Znajdź wszystkie "szare kwadraciki" (potwory) na minimapie
        const npcs = document.querySelectorAll(CONFIG.npcSelector);
        
        if (npcs.length === 0) {
            console.log("[Bot] Nie znaleziono potworów na minimapie.");
            return;
        }

        // Zakładamy, że nasza postać jest na środku minimapy, 
        // lub znajdujemy znacznik gracza.
        let playerDot = document.querySelector('.minimap-dot-player, .minimap-marker.hero');
        
        let targetDot = null;
        
        if (playerDot) {
            // Znajdź najbliższego potwora względem gracza na minimapie
            let minDistance = Infinity;
            
            npcs.forEach(npc => {
                const dist = getDistance(playerDot, npc);
                if (dist < minDistance) {
                    minDistance = dist;
                    targetDot = npc;
                }
            });
        } else {
            // Jeśli nie można znaleźć gracza, po prostu kliknij pierwszy dostępny potwór
            targetDot = npcs[0];
        }

        if (targetDot) {
            console.log("[Bot] Klikam w potwora na minimapie!", targetDot);
            
            // Symulacja kliknięcia
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: targetDot.getBoundingClientRect().left + 2,
                clientY: targetDot.getBoundingClientRect().top + 2
            });
            targetDot.dispatchEvent(clickEvent);
            
            // Po kliknięciu na minimapie, gra powinna zacząć iść w stronę potwora.
            // Uwaga: jeśli gra nie łapie automatycznie walki po dojściu,
            // trzeba by było dodać logikę klikania na potwora na głównej mapie, gdy już podejdziemy.
        }
    }

    // Tworzenie UI do sterowania botem
    function createUI() {
        const uiContainer = document.createElement('div');
        uiContainer.style.position = 'fixed';
        uiContainer.style.top = '10px';
        uiContainer.style.left = '10px';
        uiContainer.style.zIndex = '999999';
        uiContainer.style.background = 'rgba(0, 0, 0, 0.8)';
        uiContainer.style.color = '#fff';
        uiContainer.style.padding = '10px';
        uiContainer.style.border = '1px solid #444';
        uiContainer.style.borderRadius = '5px';
        uiContainer.style.fontFamily = 'sans-serif';
        uiContainer.style.fontSize = '12px';

        const title = document.createElement('div');
        title.innerText = 'Bot Minimapy';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5px';
        uiContainer.appendChild(title);

        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = 'START';
        toggleBtn.style.padding = '5px 10px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.background = '#28a745';
        toggleBtn.style.color = 'white';
        toggleBtn.style.border = 'none';
        toggleBtn.style.borderRadius = '3px';
        
        toggleBtn.onclick = () => {
            CONFIG.isRunning = !CONFIG.isRunning;
            if (CONFIG.isRunning) {
                toggleBtn.innerText = 'STOP';
                toggleBtn.style.background = '#dc3545';
                botInterval = setInterval(runBotTick, CONFIG.intervalMs);
                console.log("[Bot] Uruchomiony");
            } else {
                toggleBtn.innerText = 'START';
                toggleBtn.style.background = '#28a745';
                clearInterval(botInterval);
                console.log("[Bot] Zatrzymany");
            }
        };

        uiContainer.appendChild(toggleBtn);
        document.body.appendChild(uiContainer);
    }

    // Inicjalizacja
    window.addEventListener('load', () => {
        console.log("[Bot] Inicjalizacja skryptu bota...");
        setTimeout(createUI, 3000); // Czekamy chwilę aż interfejs gry się załaduje
    });

})();
