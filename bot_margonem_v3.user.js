// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v3.8
// @namespace    http://tampermonkey.net/
// @version      3.8
// @description  Ominięcie startBlockade za pomocą natywnego zdarzenia wejścia w interakcję
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.8
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=3.8
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 1200,          // Bezpieczny interwał sprawdzania
        isRunning: false,          
    };

    console.log("[Bot 3.8] Załadowany. Silnik interakcji bezblokadowej aktywne.");

    // 1. SZUKANIE NAJBLIŻSZEGO POTWORA (W oparciu o czysty silnik NI)
    function findNearestMonster() {
        if (!window.Engine || !window.Engine.npc || !window.Engine.hero) return null;

        let nearestNpc = null;
        let minDistance = Infinity;

        const heroX = window.Engine.hero.d.x;
        const heroY = window.Engine.hero.d.y;
        const npcList = window.Engine.npc;

        for (let id in npcList) {
            const npc = npcList[id];

            if (npc.d && (npc.d.type === 1 || npc.d.type === 2 || npc.d.type === 3 || npc.d.type === 4)) {
                if (npc.d.del || (typeof npc.d.wt !== 'undefined' && npc.d.wt === 0)) continue; 

                const distance = Math.abs(npc.d.x - heroX) + Math.abs(npc.d.y - heroY);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestNpc = npc; // Zwracamy pełny obiekt silnika NPC, nie tylko dane .d
                }
            }
        }
        return nearestNpc;
    }

    // 2. GŁÓWNA LOGIKA WYKONYWANIA AKCJI
    function botTick() {
        if (!BOT_CONFIG.isRunning) return;

        // Jeśli trwa walka, dialog, lub postać nie żyje - stój
        if (!window.Engine || window.Engine.battle || (window.Engine.hero && window.Engine.hero.d.dead) || document.getElementById('dialogview')) {
            return;
        }

        // Jeśli postać już biegnie, czekaj
        if (window.Engine.hero && window.Engine.hero.isMoving) return;

        const targetObj = findNearestMonster();

        if (targetObj && targetObj.d) {
            const target = targetObj.d;
            console.log(`[Bot 3.8] Namierzono: ${target.name} (ID: ${target.id}) na [${target.x}, ${target.y}]`);

            // METODA SPRAWDZONA: Emulacja wywołania interakcji przez menedżer interfejsu (Omija startBlockade)
            if (window.Engine.allight && window.Engine.allight.clickNpc) {
                // Wywołujemy natywną dla silnika funkcję kliknięcia w NPC
                window.Engine.allight.clickNpc(target.id);
            } 
            // METODA REZERWOWA: Jeśli gra zmieniła strukturę obiektów, uderzamy w standardowy Interface Manager
            else if (window.Engine.interface && window.Engine.interface.action) {
                window.Engine.interface.action("talk", { id: target.id });
            }
            // METODA TRZECIEGO STOPNIA: Bezpośrednie wysłanie żądania interakcji bez wywoływania ruchu z poziomu JS
            else if (window.Engine.communication && window.Engine.communication.send) {
                window.Engine.communication.send(`talk&id=${target.id}`);
            }

        } else {
            console.log("[Bot 3.8] Szukam celów...");
        }
    }

    // 3. PANEL UI
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
                console.log("[Bot 3.8] Uruchomiony.");
            } else {
                btn.innerText = 'BOT: OFF';
                btn.style.backgroundColor = '#dc3545';
                console.log("[Bot 3.8] Zatrzymany.");
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