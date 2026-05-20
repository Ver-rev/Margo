// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.4
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  Zbudowany od zera bot oparty na silniku gry Margonem NI z emulacją kliknięć w obiekty NPC.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.4
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.4
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 1000,          // Szukaj potwora co 1 sekundę
        isRunning: false,          
    };

    console.log("[Bot 3.4] Załadowany. Gotowy do klikania w obiekty NPC.");

    // 1. SZUKANIE NAJBLIŻSZEGO POTWORKA
    function findNearestMonster() {
        if (!window.g || !window.g.npc) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.g.hero.x;
        const heroY = window.g.hero.y;

        for (let id in window.g.npc) {
            const npc = window.g.npc[id];

            // Typ 2, 3, 4 (potwory)
            if (npc.type === 2 || npc.type === 3 || npc.type === 4) {
                if (npc.wt === 0) continue; // Pomiń trupy

                const distance = Math.abs(npc.x - heroX) + Math.abs(npc.y - heroY);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestNpc = npc;
                }
            }
        }
        return nearestNpc;
    }

    // 2. GŁÓWNA PĘTLA DZIAŁANIA
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;

        // Jeśli jesteśmy w walce lub na nią czekamy, nic nie rób
        if (window.g && (window.g.battle || window.g.dead)) {
            return;
        }

        const target = findNearestMonster();

        if (target) {
            console.log(`[Bot 3.4] Interakcja z: ${target.name} (ID: ${target.id}) na pozycji (${target.x}, ${target.y})`);

            // METODA 1: Najskuteczniejsza w NI - atak i rozmowa przez ID potwora
            if (window._g) {
                // Komenda "talk" z ID potwora automatycznie zmusza postać do podbiegnięcia i zaatakowania moba
                window._g("talk", { id: target.id });
            } 
            // METODA 2: Jeśli powyższe nie reaguje, klikamy bezpośrednio w element HTML potwora na mapie
            else {
                const npcElement = document.querySelector(`[data-npc-id="${target.id}"]`) || document.getElementById(`npc${target.id}`);
                if (npcElement) {
                    npcElement.click();
                }
            }
        } else {
            console.log("[Bot 3.4] Brak potworów.");
        }
    }

    // 3. PROSTY PANEL UI
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
                console.log("[Bot 3.4] Włączony.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.4] Wyłączony.");
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