// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.9
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  Połączenie stabilnego ruchu z v2.9 z zaawansowanym wykrywaniem potworów typu 1 z v3.x
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.9
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.9
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 1200,          // Odstęp między akcjami (zgodny z v2.9)
        isRunning: false,          
    };

    console.log("[Bot 3.9] Załadowany. Przywrócono stabilny silnik ruchu z wersji 2.x.");

    // 1. STATYCZNE POBIERANIE ODLEGŁOŚCI (z wersji 2.9)
    function getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    // 2. FILTR POTWORÓW (Wychwytuje typ 1, 2, 3, 4 oraz sprawdza punkty życia)
    function findNearestMonster() {
        if (!window.Engine || !window.Engine.npcs || !window.Engine.hero) return null;

        // Bezpieczne pobranie listy z menedżera npcs (tak jak w v2.9)
        const npcs = window.Engine.npcs.check();
        const npcList = Array.isArray(npcs) ? npcs : Object.values(npcs);

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.Engine.hero.d.x;
        const heroY = window.Engine.hero.d.y;

        for (const npc of npcList) {
            if (!npc || !npc.d) continue;

            // Typy potworów: 1 = zwykły (kwiatek), 2 = agresywny, 3 = elita, 4 = heros/e2
            if (npc.d.type === 1 || npc.d.type === 2 || npc.d.type === 3 || npc.d.type === 4) {
                
                // Warunki eliminujące martwe moby
                if (npc.d.del || (typeof npc.d.wt !== 'undefined' && npc.d.wt === 0)) continue;

                const dist = getDistance(heroX, heroY, npc.d.x, npc.d.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestNpc = npc;
                }
            }
        }
        return nearestNpc;
    }

    // 3. STABILNA FUNKCJA RUCHU (Przeniesiona bezpośrednio z v2.9)
    function walkTo(x, y) {
        const engine = window.Engine;
        if (!engine || !engine.hero) return false;

        if (typeof engine.hero.autoGoTo === 'function') {
            engine.hero.autoGoTo({ x, y });
            return true;
        }
        if (typeof engine.hero.goTo === 'function') {
            engine.hero.goTo(x, y);
            return true;
        }
        if (typeof window._g === 'function') {
            window._g(`walk=${x},${y}`);
            return true;
        }
        return false;
    }

    // 4. INICJOWANIE WALKI (Zabezpieczony atak z wersji 2.9)
    function attackMonster(npc) {
        if (!npc || !npc.d) return false;
        const npcId = npc.d.id;

        if (typeof window._g === 'function') {
            window._g('fight&id=' + npcId);
            return true;
        }
        const npcEl = document.querySelector(`#npc${npcId}, [data-id="${npcId}"], .npc-${npcId}`);
        if (npcEl) {
            npcEl.click();
            return true;
        }
        return false;
    }

    // 5. GŁÓWNA PĘTLA BOTA
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;
        const engine = window.Engine;
        if (!engine || !engine.hero) return;

        // Obsługa automatycznego zamykania szybkiej walki
        if (engine.battle && engine.battle.show) {
            const fastFightBtn = document.querySelector('.fast-fight-button, [data-key="f"], .btn-szybka');
            if (fastFightBtn) fastFightBtn.click();
            return;
        }

        // Jeśli postać aktualnie biegnie, pozwól jej dobiec
        if (engine.hero.moving) return;

        const target = findNearestMonster();

        if (target) {
            const heroX = engine.hero.d.x;
            const heroY = engine.hero.d.y;
            const dist = getDistance(heroX, heroY, target.d.x, target.d.y);

            console.log(`[Bot 3.9] Cel: ${target.d.name} (ID: ${target.d.id}) Odległość: ${dist}`);

            // Jeśli jesteśmy tuż obok potwora (dist <= 1), bijemy!
            if (dist <= 1) {
                attackMonster(target);
                return;
            }

            // Jeśli jesteśmy dalej, używamy sprawdzonego podejścia z v2.9
            walkTo(target.d.x, target.d.y);
        } else {
            console.log("[Bot 3.9] Brak żywych potworów (typu 1, 2, 3, 4) na mapie.");
        }
    }

    // 6. NOWY PANEL UI (Dostosowany do prawego dolnego rogu)
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
                console.log("[Bot 3.9] Start.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.9] Stop.");
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