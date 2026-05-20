// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.1
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Zbudowany od zera bot oparty na silniku gry Margonem NI z poprawionym wykrywaniem i ruchem.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.1
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.1
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. GŁÓWNA KONFIGURACJA BOTA
    const BOT_CONFIG = {
        intervalMs: 1200,          // Czas między decyzjami (1.2 sekundy)
        isRunning: false,          // Stan początkowy bota
        minLevelDiff: 5,           // Minimalna różnica poziomu potwora
        maxLevelDiff: 30,          // Maksymalna różnica poziomu potwora
    };

    console.log("[Bot 3.1] Skrypt załadowany. Czekam na start...");

    // 2. FUNKCJA SZUKAJĄCA POTWORÓW
    function findNearestMonster() {
        if (!window.g || !window.g.npc) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.g.hero.x;
        const heroY = window.g.hero.y;
        const heroLvl = window.g.hero.lvl || 1;

        for (let id in window.g.npc) {
            const npc = window.g.npc[id];

            // Akceptujemy typy: 2 (zwykły mob), 3 (agresywny), 4 (elita itp.)
            if (npc.type === 2 || npc.type === 3 || npc.type === 4) {
                
                // Ignorujemy martwe potwory (wt == 1 oznacza, że mob żyje/czeka)
                if (npc.wt === 0) continue; 

                // Filtrowanie po poziomie, jeśli potwór ma określony lvl
                if (npc.lvl) {
                    const lvlDiff = npc.lvl - heroLvl;
                    // Blokada przed biciem za silnych lub za słabych mobów
                    if (lvlDiff > BOT_CONFIG.maxLevelDiff || (heroLvl - npc.lvl) > BOT_CONFIG.minLevelDiff) {
                        continue;
                    }
                }

                // Obliczamy odległość w lini prostej
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

        // Jeśli jesteśmy w walce, czekamy
        if (window.g && window.g.battle) {
            return;
        }

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.1] Namierzono cel: ${target.name} (${target.x}, ${target.y})`);
            
            // Wysyłanie kliknięcia i ruchu bezpośrednio przez interfejs sieciowy gry NI
            if (window._g) {
                // Najpierw symulujemy wysłanie żądania ruchu do współrzędnych potwora
                window._g("walk", {x: target.x, y: target.y});
            }
        } else {
            console.log("[Bot 3.1] Brak odpowiednich potworów w zasięgu.");
        }
    }

    // 4. INTERFEJS GRAFICZNY (UI)
    function createBotUI() {
        if (document.getElementById('margo-bot-v3-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'margo-bot-v3-btn';
        btn.innerText = 'BOT: OFF';
        btn.style.position = 'fixed';
        btn.style.bottom = '70px'; // Przesunięte wyżej, żeby nie zasłaniać czatu
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
                console.log("[Bot 3.1] Włączony.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.1] Wyłączony.");
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