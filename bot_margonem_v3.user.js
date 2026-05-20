// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v4.1
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  Całkowite ominięcie startBlockade za pomocą Engine.hero.go oraz Engine.hero.interact
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=4.1
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=4.1
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 350,           // Szybki interwał kroków (emulacja płynnego chodzenia)
        isRunning: false,          
    };

    console.log("[Bot 4.1] Załadowany. Silnik krokowy + interakcja bezpośrednia aktywne.");

    function getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    // 1. SKANOWANIE MAPY W POSZUKIWANIU CELU
    function findNearestMonster() {
        if (!window.Engine || !window.Engine.npcs || !window.Engine.hero) return null;

        const npcs = window.Engine.npcs.check();
        const npcList = Array.isArray(npcs) ? npcs : Object.values(npcs);

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.Engine.hero.d.x;
        const heroY = window.Engine.hero.d.y;

        for (const npc of npcList) {
            if (!npc || !npc.d) continue;

            // Łapie typy potworów: 1, 2, 3, 4
            if (npc.d.type === 1 || npc.d.type === 2 || npc.d.type === 3 || npc.d.type === 4) {
                if (npc.d.del || (typeof npc.d.wt !== 'undefined' && npc.d.wt === 0)) continue;

                const dist = getDistance(heroX, heroY, npc.d.x, npc.d.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestNpc = npc.d;
                }
            }
        }
        return nearestNpc;
    }

    // 2. BEZPIECZNE WYKONANIE JEDNEGO KROKU W KIERUNKU CELU
    function stepTowards(targetX, targetY) {
        const hero = window.Engine.hero;
        if (!hero || !hero.d || typeof hero.go !== 'function') return false;

        const heroX = hero.d.x;
        const heroY = hero.d.y;

        let nextX = heroX;
        let nextY = heroY;

        if (heroX < targetX) nextX++;
        else if (heroX > targetX) nextX--;

        if (heroY < targetY) nextY++;
        else if (heroY > targetY) nextY--;

        if (nextX !== heroX || nextY !== heroY) {
            // Natywny krok silnika, gra traktuje to jak ruch z klawiatury
            hero.go(nextX, nextY);
            return true;
        }
        return false;
    }

    // 3. GŁÓWNA LOGIKA AKCJI
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;
        const engine = window.Engine;
        if (!engine || !engine.hero) return;

        // Auto-zamykanie szybkiej walki
        if (engine.battle && engine.battle.show) {
            const fastFightBtn = document.querySelector('.fast-fight-button, [data-key="f"], .btn-szybka');
            if (fastFightBtn) fastFightBtn.click();
            return;
        }

        // Czekaj, jeśli postać fizycznie wykonuje ruch w danej milisekundzie
        if (engine.hero.moving) return;

        const target = findNearestMonster();

        if (target) {
            const heroX = engine.hero.d.x;
            const heroY = engine.hero.d.y;
            const dist = getDistance(heroX, heroY, target.x, target.y);

            // Jesteśmy obok celu -> Atakujemy przez system interact lub pakiet sieciowy
            if (dist <= 1) {
                console.log(`[Bot 4.1] Atakuję bezpośrednio: ${target.name} (ID: ${target.id})`);
                if (engine.hero.interact) {
                    engine.hero.interact(target.id);
                } else if (typeof window._g === 'function') {
                    window._g('fight&id=' + target.id);
                }
                return;
            }

            // Jesteśmy dalej -> wykonujemy pojedynczy, bezpieczny krok do przodu
            stepTowards(target.x, target.y);
        }
    }

    // 4. PANEL UI
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

        btn.onclick = function() {
            BOT_CONFIG.isRunning = !BOT_CONFIG.isRunning;
            if (BOT_CONFIG.isRunning) {
                btn.innerText = 'BOT: ON';
                btn.style.backgroundColor = '#28a745';
                console.log("[Bot 4.1] Start.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 4.1] Stop.");
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