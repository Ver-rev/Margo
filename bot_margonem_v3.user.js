// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v4.3
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  Bot poruszający się za pomocą emulacji klawiatury (W,A,S,D) - ominięcie blokad NI
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=4.3
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=4.3
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 300,           // Szybki interwał sprawdzania i kroków
        isRunning: false,          
    };

    console.log("[Bot 4.3] Załadowany. Emulacja klawiatury sprzętowej aktywna.");

    function getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    // 1. SYSTEM EMULACJI KLIKNIĘĆ KLAWIATURY (Gra widzi to jako fizyczny przycisk)
    function simulateKey(keyCode, keyName) {
        const documentElement = document.documentElement;
        
        const downEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            keyCode: keyCode,
            key: keyName,
            code: keyName,
            which: keyCode
        });
        
        const upEvent = new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            keyCode: keyCode,
            key: keyName,
            code: keyName,
            which: keyCode
        });

        documentElement.dispatchEvent(downEvent);
        setTimeout(() => { documentElement.dispatchEvent(upEvent); }, 50);
    }

    // 2. WYSZUKIWANIU ZWYKŁYCH POTWORÓW
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

    // 3. STEROWANIE SZYBKOŚCIĄ I KIERUNKIEM RUCHU
    function moveTowardsWithKeyboard(targetX, targetY) {
        const hero = window.Engine.hero;
        if (!hero || !hero.d) return;

        const heroX = hero.d.x;
        const heroY = hero.d.y;

        // Idź w prawo (KeyD / Strzałka w prawo)
        if (heroX < targetX) {
            simulateKey(68, 'KeyD');
            return;
        }
        // Idź w lewo (KeyA / Strzałka w lewo)
        if (heroX > targetX) {
            simulateKey(65, 'KeyA');
            return;
        }
        // Idź w dół (KeyS / Strzałka w dół)
        if (heroY < targetY) {
            simulateKey(83, 'KeyS');
            return;
        }
        // Idź w górę (KeyW / Strzałka w górę)
        if (heroY > targetY) {
            simulateKey(87, 'KeyW');
            return;
        }
    }

    // 4. GŁÓWNA LOGIKA
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

        // Jeśli postać fizycznie się porusza, nie klikaj kolejnego klawisza
        if (engine.hero.moving) return;

        const target = findNearestMonster();

        if (target) {
            const heroX = engine.hero.d.x;
            const heroY = engine.hero.d.y;
            const dist = getDistance(heroX, heroY, target.x, target.y);

            // Jesteśmy przy potworze -> Atak przez paczkę sieciową (to działało!)
            if (dist <= 1) {
                console.log(`[Bot 4.3] Atakuję: ${target.name}`);
                if (window._g) {
                    window._g('fight&id=' + target.id);
                }
                return;
            }

            // Jesteśmy dalej -> "wciskamy" klawisz kierunkowy
            moveTowardsWithKeyboard(target.x, target.y);
        }
    }

    // 5. PANEL UI
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
                console.log("[Bot 4.3] Start.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 4.3] Stop.");
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