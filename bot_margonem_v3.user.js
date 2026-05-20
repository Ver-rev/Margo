// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.3
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Zbudowany od zera bot oparty na silniku gry Margonem NI z pełną emulacją pakietów ruchu.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.3
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.3
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. GŁÓWNA KONFIGURACJA BOTA
    const BOT_CONFIG = {
        intervalMs: 1000,          // Decyzja co 1 sekundę
        isRunning: false,          // Stan początkowy bota
    };

    console.log("[Bot 3.3] Skrypt załadowany. Gotowy na emulację ruchu NI.");

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

                // Odległość na siatce (Manhattan distance)
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

        // Jeśli postać walczy, nic nie rób
        if (window.g && window.g.battle) {
            return;
        }

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.3] Atakuję/Idę do: ${target.name} na pozycję (${target.x}, ${target.y})`);
            
            // --- OFICJALNY SYSTEM RUCHU MARGONEM NI ---
            // Sposób A: Przez główny silnik akcji gry
            if (window.g.actions && window.g.actions.doWalk) {
                window.g.actions.doWalk(target.x, target.y);
            } 
            // Sposób B: Bezpośredni pakiet sieciowy do Gateway (najskuteczniejszy w NI)
            else if (window.g.gateway && window.g.gateway.send) {
                window.g.gateway.send(`walk&x=${target.x}&y=${target.y}`);
            }
            // Sposób C: Tradycyjna funkcja wejścia
            else if (window._g) {
                window._g("walk", {x: target.x, y: target.y});
            }
        } else {
            console.log("[Bot 3.3] Brak żywych potworów na całej mapie.");
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
                console.log("[Bot 3.3] Włączony.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.3] Wyłączony.");
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