// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.5
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Naprawione wykrywanie zwykłych potworów (typ 1) na silniku Margonem NI.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.5
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.5
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 1200,          // Czas sprawdzenia
        isRunning: false,          
    };

    console.log("[Bot 3.5] Załadowany. Pełne spektrum typów NPC aktywne.");

    // 1. ZAAWANSOWANE SZUKANIE POTWORÓW
    function findNearestMonster() {
        // Bezpieczne pobranie listy NPC z silnika gry
        const npcList = (window.g && window.g.npc) ? window.g.npc : (window.Engine && window.Engine.npc ? window.Engine.npc : null);
        if (!npcList || !window.g || !window.g.hero) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.g.hero.x;
        const heroY = window.g.hero.y;

        for (let id in npcList) {
            const npc = npcList[id];

            // Typ 1 = Zwykły potwór, Typ 2 = Agresywny, Typ 3 = Elita, Typ 4 = Elita II / Heros
            if (npc.type === 1 || npc.type === 2 || npc.type === 3 || npc.type === 4) {
                
                // Warunek żywego potwora: wt (wirtualne zdrowie/życie) musi być większe od 0
                if (typeof npc.wt !== 'undefined' && npc.wt === 0) continue; 

                // Obliczanie odległości (Manhattan)
                const distance = Math.abs(npc.x - heroX) + Math.abs(npc.y - heroY);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestNpc = npc;
                }
            }
        }
        return nearestNpc;
    }

    // 2. GŁÓWNA LOGIKA AKCJI
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;

        // Blokada działania podczas walki lub gdy postać padła
        if (window.g && (window.g.battle || window.g.dead)) return;

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.5] Namierzono cel: ${target.name} (ID: ${target.id}) na pozycji [${target.x}, ${target.y}]`);

            // Wysłanie natywnej komendy podejścia i ataku do silnika Margonem
            if (window._g) {
                window._g("talk", { id: target.id });
            } else if (window.g.actions && window.g.actions.doWalk) {
                window.g.actions.doWalk(target.x, target.y);
            }
        } else {
            console.log("[Bot 3.5] Brak potworów w zasięgu wzroku bota.");
        }
    }

    // 3. GRAFICZNY PANEL KONTROLNY
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
                console.log("[Bot 3.5] Bot zaczął pracować.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.5] Bot zatrzymany.");
            }
        };

        document.body.appendChild(btn);
    }

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