// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.0
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Zbudowany od zera bot oparty na silniku gry Margonem NI z pominięciem cache GitHub.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.0
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.0
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. GŁÓWNA KONFIGURACJA BOTA
    const BOT_CONFIG = {
        intervalMs: 1000,          // Jak szybko bot podejmuje decyzje (1 sekunda)
        isRunning: false,          // Stan początkowy bota
        minLevel: 1,               // Minimalny poziom potwora do zaatakowania
        maxLevel: 100,             // Maksymalny poziom potwora do zaatakowania
    };

    console.log("[Bot 3.0] Skrypt został pomyślnie wstrzyknięty do gry.");

    // 2. FUNKCJA SZUKAJĄCA POTWORÓW (Bezpośrednio z silnika gry NI)
    function findNearestMonster() {
        if (!window.g || !window.g.npc) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        // Pobieramy pozycję naszej postaci
        const heroX = window.g.hero.x;
        const heroY = window.g.hero.y;

        // Przeszukujemy listę wszystkich NPC na mapie
        for (let id in window.g.npc) {
            const npc = window.g.npc[id];

            // Typ 2 i 3 to zazwyczaj potwory/zwykli przeciwnicy w Margonem
            if (npc.type === 2 || npc.type === 3) {
                
                // Filtrowanie po poziomie (opcjonalnie)
                if (npc.lvl && (npc.lvl < BOT_CONFIG.minLevel || npc.lvl > BOT_CONFIG.maxLevel)) {
                    continue; 
                }

                // Obliczamy odległość (w kratkach)
                const distance = Math.sqrt(Math.pow(npc.x - heroX, 2) + Math.pow(npc.y - heroY, 2));

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestNpc = npc;
                }
            }
        }
        return nearestNpc;
    }

    // 3. GŁÓWNA PĘTLA LOGICZNA BOTA
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;

        // Jeśli postać walczy lub leci animacja, nic nie rób
        if (window.g && window.g.battle) {
            console.log("[Bot 3.0] W walce... czekam.");
            return;
        }

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.0] Idę do potwora: ${target.name} (Poziom: ${target.lvl})`);
            
            // Bezpośredni rozkaz ruchu/ataku wysłany do silnika gry NI
            if (window._g) {
                window._g("walk", {x: target.x, y: target.y});
            }
        } else {
            console.log("[Bot 3.0] Brak potworów na mapie.");
        }
    }

    // 4. PROSTY INTERFEJS GRAFICZNY (UI)
    function createBotUI() {
        const btn = document.createElement('button');
        btn.innerText = 'BOT: OFF';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '99999';
        btn.style.padding = '10px 15px';
        btn.style.backgroundColor = '#dc3545';
        btn.style.color = 'white';
        btn.style.border = '1px solid black';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';

        btn.onclick = function() {
            BOT_CONFIG.isRunning = !BOT_CONFIG.isRunning;
            if (BOT_CONFIG.isRunning) {
                btn.innerText = 'BOT: ON';
                btn.style.backgroundColor = '#28a745';
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
            }
        };

        document.body.appendChild(btn);
        console.log("[Bot 3.0] Interfejs UI dodany do ekranu.");
    }

    // Uruchomienie pętli i UI po załadowaniu okna gry
    window.addEventListener('load', () => {
        setTimeout(() => {
            createBotUI();
            setInterval(botTick, BOT_CONFIG.intervalMs);
        }, 2000); // 2 sekundy opóźnienia na załadowanie zmiennych gry
    })();
})();