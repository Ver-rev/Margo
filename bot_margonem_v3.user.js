// ==UserScript==
// @name         Margonem NI - Fresh Engine Bot v4.5 (Z logami)
// @namespace    http://tampermonkey.net/
// @version      4.5
// @description  Czyste podchodzenie do potworów z zaawansowanym systemem debugowania.
// @author       Ver
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=4.5
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v3.user.js?v=4.5
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_CONFIG = {
        intervalMs: 800,           
        isRunning: false,
        debugMode: true            // Włączone logi debugowania
    };

    console.log("[Bot 4.5] Załadowany. Tryb wędrówki z DEBUGOWANIEM aktywny.");

    // --- SYSTEM LOGÓW ---
    function botLog(action, details = "") {
        if (!BOT_CONFIG.debugMode) return;
        const time = new Date().toLocaleTimeString();
        console.log(`[BOT-DEBUG ${time}] ${action} ${details ? '| ' + details : ''}`);
    }

    function botError(action, errorDetail = "") {
        const time = new Date().toLocaleTimeString();
        console.error(`[BOT-ERROR ${time}] ${action} | ${errorDetail}`);
    }
    // --------------------

    function getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    function findNearestMonster() {
        if (!window.Engine || !window.Engine.npcs || !window.Engine.hero) {
            botError("Brak silnika gry", "Engine, Engine.npcs lub Engine.hero jest niedostępne.");
            return null;
        }

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

    function isHeroMoving() {
        const hero = window.Engine.hero;
        if (!hero) return false;
        
        let movingReason = "";
        let isMoving = false;

        if (hero.path && hero.path.length > 0) {
            isMoving = true;
            movingReason = `path.length=${hero.path.length}`;
        } else if (hero.moving) {
            isMoving = true;
            movingReason = "hero.moving=true";
        } else if (hero.d && hero.d.moving) {
            isMoving = true;
            movingReason = "hero.d.moving=true";
        }
        
        if (isMoving && BOT_CONFIG.debugMode) {
            // Logujemy powód ruchu, żeby wiedzieć czemu bot czeka
            // (Zakomentowane botLog tutaj, żeby nie spamować co 800ms, gdy postać idzie długą trasą)
        }

        return isMoving;
    }

    function botTick() {
        if (!BOT_CONFIG.isRunning) return;
        
        const engine = window.Engine;
        if (!engine || !engine.hero) return;

        if (engine.battle && engine.battle.show) {
            botLog("STATUS", "Wykryto okno walki. Bot pauzuje i czeka na autofight.");
            return;
        }

        if (isHeroMoving()) {
            return; // Czekamy aż postać się zatrzyma
        }

        const target = findNearestMonster();

        if (target) {
            const heroX = engine.hero.d.x;
            const heroY = engine.hero.d.y;
            const dist = getDistance(heroX, heroY, target.x, target.y);

            if (dist > 1) {
                botLog("RUCH", `Wysyłam autoGoTo do: ${target.name} (ID: ${target.id}) na [${target.x}, ${target.y}]. Dystans: ${dist}. Moja pozycja: [${heroX}, ${heroY}]`);
                if (typeof engine.hero.autoGoTo === 'function') {
                    try {
                        engine.hero.autoGoTo({ x: target.x, y: target.y });
                    } catch (err) {
                        botError("Błąd autoGoTo", err.message);
                    }
                } else {
                    botError("Brak funkcji", "engine.hero.autoGoTo nie istnieje!");
                }
            } else {