// ==UserScript==
// @name         Margonem NI - Auto Exp Bot (Stable)
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Upraszczony bot dla Margonem NI działający na silniku gry.
// @author       Antigravity
// @match        https://*.margonem.pl/*
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v2.user.js
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v2.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        intervalMs: 1200,
        isRunning: false,
        maxLevelDiff: 30,
        minLevelDiff: 5,
        enableTreeFallback: false,
        enableRandomFallback: true,
        randomFallbackRange: 8,
        passageTypes: [7, 8, 9, 10, 11, 12], // Rozszerzone typy przejść/portali
        enablePassageDebug: true
    };

    const SCRIPT_VERSION = '2.8';
    const LOG_BUFFER = [];
    const LOG_MAX = 300;

    function addLog(level, ...args) {
        const time = new Date().toISOString();
        const text = args.map(v => {
            try { return typeof v === 'object' ? JSON.stringify(v) : String(v); }
            catch { return String(v); }
        }).join(' ');
        LOG_BUFFER.push({ time, level, text });
        if (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.shift();
        console.log(`[ExpBot][${level}] ${text}`);
    }

    addLog('INFO', `ExpBot loaded v${SCRIPT_VERSION}`);

    function showLogModal() {
        const existing = document.getElementById('expbot-log-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'expbot-log-modal';
        modal.style.position = 'fixed';
        modal.style.top = '10%';
        modal.style.left = '50%';
        modal.style.transform = 'translateX(-50%)';
        modal.style.width = '80%';
        modal.style.maxHeight = '70%';
        modal.style.overflowY = 'auto';
        modal.style.background = 'rgba(0,0,0,0.92)';
        modal.style.color = '#fff';
        modal.style.padding = '14px';
        modal.style.border = '2px solid #ffa500';
        modal.style.borderRadius = '8px';
        modal.style.zIndex = '1000000';
        modal.style.fontFamily = 'monospace';
        modal.style.whiteSpace = 'pre-wrap';

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✖';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '8px';
        closeBtn.style.right = '8px';
        closeBtn.style.background = '#ff4444';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => modal.remove();

        const title = document.createElement('div');
        title.innerText = 'ExpBot logi';
        title.style.marginBottom = '10px';
        title.style.fontWeight = 'bold';

        const content = document.createElement('div');
        content.textContent = LOG_BUFFER.map(e => `[${e.time}] ${e.level}: ${e.text}`).join('\n') || 'Brak logów.';

        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    function getEngine() {
        return window.Engine || null;
    }

    function getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    function getNpcList() {
        const engine = getEngine();
        if (!engine || !engine.npcs) return [];
        const npcs = engine.npcs.check();
        return Array.isArray(npcs) ? npcs : Object.values(npcs);
    }

    function isMonster(npc) {
        return npc?.d && (npc.d.type === 2 || npc.d.type === 3);
    }

    function getNearestMonster() {
        const engine = getEngine();
        if (!engine || !engine.hero) return null;

        const heroX = engine.hero.d.x;
        const heroY = engine.hero.d.y;
        const heroLvl = engine.hero.d.lvl || 0;
        const candidates = getNpcList().filter(npc => {
            if (!isMonster(npc)) return false;
            const lvl = npc.d.lvl || 0;
            if (lvl > heroLvl + CONFIG.maxLevelDiff) return false;
            if (lvl < heroLvl - CONFIG.minLevelDiff) return false;
            return true;
        });

        let nearest = null;
        let best = Infinity;
        for (const npc of candidates) {
            const dist = getDistance(heroX, heroY, npc.d.x, npc.d.y);
            if (dist < best) {
                best = dist;
                nearest = npc;
            }
        }
        return nearest;
    }

    function isPassageNpc(npc) {
        return npc?.d && CONFIG.passageTypes.includes(npc.d.type);
    }

    function getNearestPassage() {
        const engine = getEngine();
        if (!engine || !engine.hero) return null;

        const heroX = engine.hero.d.x;
        const heroY = engine.hero.d.y;
        let nearest = null;
        let best = Infinity;
        let fallbackNearest = null;
        let fallbackBest = Infinity;

        for (const npc of getNpcList()) {
            if (!npc?.d) continue;
            const dist = getDistance(heroX, heroY, npc.d.x, npc.d.y);
            if (isPassageNpc(npc)) {
                if (dist < best) {
                    best = dist;
                    nearest = npc;
                }
                continue;
            }

            // Jeśli nie ma dopasowanego typu przejścia, użyjemy kandydata
            // który nie jest potworem i nie jest drzewem.
            if (!isMonster(npc) && npc.d.type !== 4) {
                if (dist < fallbackBest) {
                    fallbackBest = dist;
                    fallbackNearest = npc;
                }
            }
        }

        if (nearest) return nearest;
        if (CONFIG.enablePassageDebug && fallbackNearest) {
            addLog('DEBUG', 'Nie znaleziono typu przejścia, używam kandydata fallback', 'type', fallbackNearest.d.type, 'id', fallbackNearest.d.id, 'pos', fallbackNearest.d.x, fallbackNearest.d.y);
        }
        return fallbackNearest;
    }

    function getNearestTree() {
        const engine = getEngine();
        if (!engine || !engine.hero) return null;

        const heroX = engine.hero.d.x;
        const heroY = engine.hero.d.y;
        let nearest = null;
        let best = Infinity;

        for (const npc of getNpcList()) {
            if (!npc?.d || npc.d.type !== 4) continue;
            const dist = getDistance(heroX, heroY, npc.d.x, npc.d.y);
            if (dist < best) {
                best = dist;
                nearest = npc;
            }
        }

        return nearest;
    }

    function getRandomNearbyPoint() {
        const engine = getEngine();
        if (!engine || !engine.hero) return null;
        const heroX = engine.hero.d.x;
        const heroY = engine.hero.d.y;
        const range = CONFIG.randomFallbackRange;
        const offsetX = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const offsetY = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const destX = heroX + offsetX;
        const destY = heroY + offsetY;
        if (destX === heroX && destY === heroY) {
            if (offsetX === range) return { x: heroX - range, y: heroY };
            return { x: heroX + range, y: heroY };
        }
        return { x: destX, y: destY };
    }

    function walkTo(x, y) {
        const engine = getEngine();
        if (!engine || !engine.hero) {
            addLog('ERROR', 'walkTo: brak silnika lub bohatera');
            return false;
        }

        if (typeof engine.hero.autoGoTo === 'function') {
            addLog('DEBUG', 'walkTo używa autoGoTo', x, y);
            engine.hero.autoGoTo({ x, y });
            return true;
        }
        if (typeof engine.hero.goTo === 'function') {
            addLog('DEBUG', 'walkTo używa goTo', x, y);
            engine.hero.goTo(x, y);
            return true;
        }
        if (typeof window._g === 'function') {
            addLog('DEBUG', 'walkTo używa _g walk', x, y);
            window._g(`walk=${x},${y}`);
            return true;
        }
        addLog('ERROR', 'walkTo: brak dostępnej metody ruchu', x, y);
        return false;
    }

    function clickFastFight() {
        const button = document.querySelector('.fast-fight-button, [data-key="f"], .btn-szybka');
        if (button) {
            button.click();
            addLog('INFO', 'Kliknięto szybka walka.');
            return true;
        }
        return false;
    }

    function runBotTick() {
        if (!CONFIG.isRunning) return;
        const engine = getEngine();
        if (!engine || !engine.hero) return;

        try {
            if (engine.battle && engine.battle.show) {
                addLog('INFO', 'Trwa walka, próbuję szybka walka.');
                clickFastFight();
                return;
            }

            if (engine.hero.moving) {
                return;
            }

            // Pomijamy przejścia, by bot nie podchodził do roślin i fałszywych obiektów.
            const target = getNearestMonster();
            if (target) {
                const heroX = engine.hero.d.x;
                const heroY = engine.hero.d.y;
                const dist = getDistance(heroX, heroY, target.d.x, target.d.y);
                addLog('INFO', 'Idę do potwora', target.d.id, 'lvl', target.d.lvl, 'pos', target.d.x, target.d.y, 'dist', dist);
                if (walkTo(target.d.x, target.d.y)) return;
                addLog('WARN', 'Nie udało się ruszyć do potwora');
            } else {
                const allCount = getNpcList().filter(isMonster).length;
                addLog('DEBUG', 'Brak potwora zgodnego z kryteriami', 'wszystkich potworów', allCount);
            }

            const passage = getNearestPassage();
            if (passage) {
                const heroX = engine.hero.d.x;
                const heroY = engine.hero.d.y;
                const passageDist = getDistance(heroX, heroY, passage.d.x, passage.d.y);
                addLog('INFO', 'Brak potworów, idę do przejścia', passage.d.id, passage.d.x, passage.d.y, 'dist', passageDist);
                if (walkTo(passage.d.x, passage.d.y)) return;
                addLog('WARN', 'Nie udało się ruszyć do przejścia');
            } else {
                addLog('DEBUG', 'Brak przejścia do fallbacku lub passageTypes nie pasuje');
            }

            if (CONFIG.enableTreeFallback) {
                const tree = getNearestTree();
                if (tree) {
                    addLog('INFO', 'Brak potworów, idę do drzewa', tree.d.id, tree.d.x, tree.d.y);
                    if (walkTo(tree.d.x, tree.d.y)) return;
                    addLog('WARN', 'Nie udało się ruszyć do drzewa');
                } else {
                    addLog('DEBUG', 'Brak drzewa do fallbacku');
                }
            }

            if (CONFIG.enableRandomFallback) {
                const point = getRandomNearbyPoint();
                if (point) {
                    addLog('INFO', 'Brak celów, idę losowo', point.x, point.y);
                    if (!walkTo(point.x, point.y)) {
                        addLog('WARN', 'Nie udało się ruszyć losowo');
                    }
                } else {
                    addLog('DEBUG', 'Nie udało się wyznaczyć punktu losowego');
                }
            }
        } catch (error) {
            addLog('ERROR', 'Błąd w runBotTick:', error);
        }
    }

    function createUI() {
        if (document.getElementById('expbot-ui-v2')) return;

        const container = document.createElement('div');
        container.id = 'expbot-ui-v2';
        container.style.position = 'fixed';
        container.style.top = '12px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '1000000';
        container.style.background = 'rgba(0,0,0,0.86)';
        container.style.color = '#fff';
        container.style.padding = '12px';
        container.style.border = '1px solid #888';
        container.style.borderRadius = '8px';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.fontSize = '13px';
        container.style.boxShadow = '0 0 12px rgba(0,0,0,0.45)';

        const title = document.createElement('div');
        title.innerText = 'ExpBot NI';
        title.style.fontWeight = '700';
        title.style.marginBottom = '8px';
        container.appendChild(title);

        const versionInfo = document.createElement('div');
        versionInfo.innerText = `Wersja ${SCRIPT_VERSION}`;
        versionInfo.style.fontSize = '11px';
        versionInfo.style.opacity = '0.7';
        versionInfo.style.marginBottom = '8px';
        container.appendChild(versionInfo);

        const startBtn = document.createElement('button');
        startBtn.innerText = 'START';
        startBtn.style.marginRight = '8px';
        startBtn.style.padding = '6px 10px';
        startBtn.style.border = 'none';
        startBtn.style.borderRadius = '5px';
        startBtn.style.cursor = 'pointer';
        startBtn.style.background = '#28a745';
        startBtn.style.color = '#fff';
        startBtn.onclick = () => {
            CONFIG.isRunning = !CONFIG.isRunning;
            if (CONFIG.isRunning) {
                startBtn.innerText = 'STOP';
                startBtn.style.background = '#dc3545';
                addLog('INFO', 'Bot uruchomiony.');
                runBotTick();
            } else {
                startBtn.innerText = 'START';
                startBtn.style.background = '#28a745';
                addLog('INFO', 'Bot zatrzymany.');
            }
        };
        container.appendChild(startBtn);

        const logBtn = document.createElement('button');
        logBtn.innerText = 'LOGI';
        logBtn.style.marginRight = '8px';
        logBtn.style.padding = '6px 10px';
        logBtn.style.border = 'none';
        logBtn.style.borderRadius = '5px';
        logBtn.style.cursor = 'pointer';
        logBtn.style.background = '#007bff';
        logBtn.style.color = '#fff';
        logBtn.onclick = showLogModal;
        container.appendChild(logBtn);

        const copyBtn = document.createElement('button');
        copyBtn.innerText = 'KOPIUJ LOGI';
        copyBtn.style.padding = '6px 10px';
        copyBtn.style.border = 'none';
        copyBtn.style.borderRadius = '5px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.background = '#17a2b8';
        copyBtn.style.color = '#fff';
        copyBtn.onclick = () => {
            const text = LOG_BUFFER.map(e => `[${e.time}] ${e.level}: ${e.text}`).join('\n');
            navigator.clipboard.writeText(text).then(() => addLog('INFO', 'Logi skopiowane do schowka')).catch(() => addLog('ERROR', 'Nie udało się skopiować logów'));
        };
        container.appendChild(copyBtn);

        document.body.appendChild(container);
    }

    function startLoop() {
        runBotTick();
        const delay = CONFIG.intervalMs + (Math.random() * 400 - 200);
        setTimeout(startLoop, Math.max(500, delay));
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            createUI();
            setInterval(() => {
                if (!document.getElementById('expbot-ui-v2')) {
                    createUI();
                }
            }, 4000);
            startLoop();
        }, 2200);
    });
})();
