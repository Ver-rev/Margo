// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.7
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  W pełni stabilny bot oparty na bezpośrednich funkcjach ruchu silnika NI
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.7
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.7
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 1000,          // Sprawdzanie sytuacji co 1 sekundę
        isRunning: false,          
    };

    console.log("[Bot 3.7] Załadowany. Autorskie sterowanie ruchem NI aktywne.");

    // 1. ANATOMIA POSZUKIWANIA CELU
    function findNearestMonster() {
        if (!window.Engine || !window.Engine.npc || !window.Engine.hero) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.Engine.hero.d.x;
        const heroY = window.Engine.hero.d.y;
        const npcList = window.Engine.npc;

        for (let id in npcList) {
            const npc = npcList[id];

            // Typ 1 (zwykły), 2 (agresywny), 3 (elita), 4 (heros/e2)
            if (npc.d && (npc.d.type === 1 || npc.d.type === 2 || npc.d.type === 3 || npc.d.type === 4)) {
                
                // Pomijaj martwe potwory
                if (npc.d.del || (typeof npc.d.wt !== 'undefined' && npc.d.wt === 0)) continue; 

                // Odległość Manhattan
                const distance = Math.abs(npc.d.x - heroX) + Math.abs(npc.d.y - heroY);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestNpc = npc.d; // Zwracamy czyste dane potwora
                }
            }
        }
        return nearestNpc;
    }

    // 2. REAKCJA I WYKONANIE RUCHU
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;

        // Blokady: walka, śmierć, otwarty dialog
        if (!window.Engine || window.Engine.battle || (window.Engine.hero && window.Engine.hero.d.dead) || document.getElementById('dialogview')) {
            return;
        }

        // Blokada jeśli postać aktualnie idzie – pozwólmy jej dobiec do celu
        if (window.Engine.hero && window.Engine.hero.isMoving) return;

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.7] Cel: ${target.name} (ID: ${target.id}) na pozycjach [${target.x}, ${target.y}]`);

            // WYKONANIE AKCJI:
            // Krok A: Wydajemy silnikowi rozkaz pójścia na koordynaty potwora
            if (window.Engine.hero && typeof window.Engine.hero.moveTo === "function") {
                window.Engine.hero.moveTo(target.x, target.y);
            }

            // Krok B: Wysyłamy pakiet rozpoczęcia rozmowy/ataku bezpośrednio przez serwer gry
            if (window.Engine.communication && window.Engine.communication.send) {
                // Dokładnie to wysyła gra po podejsciu do NPC
                window.Engine.communication.send(`talk&id=${target.id}`);
            } else if (window._g) {
                window._g("talk", { id: target.id });
            }

        } else {
            console.log("[Bot 3.7] Szukam przeciwników...");
        }
    }

    // 3. WIZUALNY PANEL KONTROLNY
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
                console.log("[Bot 3.7] Włączony.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.7] Wyłączony.");
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