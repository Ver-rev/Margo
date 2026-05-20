// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.2
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Zbudowany od zera bot oparty na silniku gry Margonem NI z wyłączonym limitem poziomów potworów.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.2
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.2
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. GŁÓWNA KONFIGURACJA BOTA
    const BOT_CONFIG = {
        intervalMs: 1000,          // Decyzja co 1 sekundę
        isRunning: false,          // Stan początkowy bota
    };

    console.log("[Bot 3.2] Skrypt załadowany z wyłączonym filtrem poziomu mobów.");

    // 2. FUNKCJA SZUKAJĄCA POTWORÓW
    function findNearestMonster() {
        if (!window.g || !window.g.npc) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.g.hero.x;
        const heroY = window.g.hero.y;

        for (let id in window.g.npc) {
            const npc = window.g.npc[id];

            // Typ 2, 3 i 4 to potwory (zwykłe, agresywne, elity)
            if (npc.type === 2 || npc.type === 3 || npc.type === 4) {
                
                // Ignorujemy trupy (wt == 0 oznacza, że potwór nie żyje)
                if (npc.wt === 0) continue; 

                // Obliczamy odległość w kratkach (Manhattan distance - idealna dla siatki Margonem)
                const distance = Math.abs(npc.x - heroX) + Math.abs(npc.y - heroY);

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

        // Jeśli postać walczy, nie rób nic
        if (window.g && window.g.battle) {
            return;
        }

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.2] Idę do: ${target.name} (Pozycja: ${target.x}, ${target.y})`);
            
            // Wysłanie komendy ruchu bezpośrednio do silnika gry NI
            if (window._g) {
                window._g("walk", {x: target.x, y: target.y});
            } else if (window.g && window.g.actions && window.g.actions.doWalk) {
                // Alternatywna metoda wywołania ruchu w niektórych wersjach NI
                window.g.actions.doWalk(target.x, target.y);
            }
        } else {
            console.log("[Bot 3.2] Brak żywych potworów na całej mapie.");
        }
    }

    // 4. INTERFEJS GRAFICZNY (UI)
    function createBotUI() {
        if (document.getElementById('margo-bot-v3-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'margo-bot-v3-btn';
        btn.innerText = 'BOT: OFF';
        btn.style.position = 'fixed';
        btn.style.bottom = '70px'; 
        btn.style.right = '20px';
        btn.style.zIndex = '99999';
        btn.style.padding = '12px 20px';
        btn.style.backgroundColor = '#dc3545';
        btn.style.color = 'white';
        btn.style.border = '2px solid #333';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '0px 4px 6px rgba(0,0,0,0.3)';

        btn.onclick = function() {
            BOT_CONFIG.isRunning = !BOT_CONFIG.isRunning;
            if (BOT_CONFIG.isRunning) {
                btn.innerText = 'BOT: ON';
                btn.style.backgroundColor = '#28a745';
                console.log("[Bot 3.2] Włączony.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.2] Wyłączony.");
            }
        };

        document.body.appendChild(btn);
    }

    // Uruchomienie skryptu po pełnym załadowaniu silnika
    if (document.readyState === 'complete') {
        setTimeout(createBotUI, 2000);
        setInterval(botTick, BOT_CONFIG.intervalMs);
    } else {
        window.addEventListener('load', () => {
            setTimeout(createBotUI, 2000);
            setInterval(botTick, BOT_CONFIG.intervalMs);
        });
    }
})();