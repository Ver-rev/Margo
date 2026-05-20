// ==UserScript==
// @name         Margonem NI - Auto Exp Bot (Zaawansowany)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Prawdziwy bot expiący do Margonem (Nowy Interfejs) działający na silniku gry (Engine).
// @author       Antigravity
// @match        https://*.margonem.pl/
// @updateURL    https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v2.user.js
// @downloadURL  https://raw.githubusercontent.com/Ver-rev/Margo/main/bot_margonem_v2.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --------------------
    // 0️⃣  GLOBAL LOG BUFFER
    // --------------------
    const LOG_BUFFER = [];
    const LOG_MAX = 500; // keep last 500 entries
    // Helper to store a log entry with timestamp and level
    function addLog(level, args) {
        const time = new Date().toISOString();
        const msg = args.map(a => {
            try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
            catch { return String(a); }
        }).join(' ');
        LOG_BUFFER.push({time, level, msg});
        if (LOG_BUFFER.length > LOG_MAX) LOG_BUFFER.shift();
    }
    // Preserve original console methods
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    console.log = function(...args) { addLog('LOG', args); origLog.apply(console, args); };
    console.warn = function(...args) { addLog('WARN', args); origWarn.apply(console, args); };
    console.error = function(...args) { addLog('ERROR', args); origError.apply(console, args); };
    // Capture uncaught errors and promise rejections
    window.addEventListener('error', function(e) {
        addLog('UNCAUGHT_ERROR', [e.message, 'at', e.filename + ':' + e.lineno]);
    });
    window.addEventListener('unhandledrejection', function(e) {
        addLog('UNHANDLED_REJECTION', [e.reason]);
    });
    // Function to display logs in a simple modal
    function showLogModal() {
        // Remove existing modal if any
        const old = document.getElementById('expbot-log-modal');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'expbot-log-modal';
        modal.style.position = 'fixed';
        modal.style.top = '10%';
        modal.style.left = '50%';
        modal.style.transform = 'translateX(-50%)';
        modal.style.width = '80%';
        modal.style.maxHeight = '70%';
        modal.style.overflowY = 'auto';
        modal.style.background = 'rgba(0,0,0,0.9)';
        modal.style.color = '#fff';
        modal.style.padding = '15px';
        modal.style.border = '2px solid #ff4444';
        modal.style.borderRadius = '5px';
        modal.style.zIndex = '1000000';
        modal.style.fontFamily = 'monospace';
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✖';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '5px';
        closeBtn.style.right = '5px';
        closeBtn.style.background = '#ff4444';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '3px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => modal.remove();
        modal.appendChild(closeBtn);
        // Build log text
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        const lines = LOG_BUFFER.map(e => `[${e.time}] ${e.level}: ${e.msg}`).join('\n');
        pre.textContent = lines || 'Brak logów.';
        modal.appendChild(pre);
        document.body.appendChild(modal);
    }
    
const CONFIG = {
    intervalMs: 800, // How often to check actions (ms)
    isRunning: false,
    maxLevelDiff: 30, // Max level difference above hero (ignore stronger monsters)
    minLevelDiff: 5,  // Min level difference below hero (ignore too weak monsters)
    enablePuzzles: true, // Toggle for puzzle handling
    enableTreeFallback: true, // When no monsters, walk to nearest tree
    enablePassageDebug: false // When true, logs nearby NPCs to help identify passage type
};


    let botInterval = null;

    // Oblicza odległość w kratkach między (x1, y1) a (x2, y2)
    function getDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    // Wyszukuje najbliższego potwora z użyciem wbudowanego Engine gry
    function getNearestMonster() {
        if (!window.Engine || !window.Engine.npcs || !window.Engine.hero) return null;
        
        let npcs = window.Engine.npcs.check(); // Pobiera obiekt/tablicę wszystkich NPC na mapie
        let monsters = [];

        // Przekształcamy na tablicę (zależnie od tego jak Engine to zwraca)
        let npcList = Array.isArray(npcs) ? npcs : Object.values(npcs);

        let heroX = window.Engine.hero.d.x;
        let heroY = window.Engine.hero.d.y;
        let heroLvl = window.Engine.hero.d.lvl;

        for (let npc of npcList) {
            if (!npc || !npc.d) continue;

            // W Margonem type 2 i 3 to potwory/NPC z możliwością walki
            if (npc.d.type === 2 || npc.d.type === 3) {
                
                // Jeśli potwór ma level wyższy od naszego dopuszczalnego limitu, pomijamy go
                let npcLvl = npc.d.lvl || 0;
                // Skip monsters that are too high level
                if (npcLvl > heroLvl + CONFIG.maxLevelDiff) continue;
                // Skip monsters that are significantly lower level
                if (npcLvl < heroLvl - CONFIG.minLevelDiff) continue;

                monsters.push(npc);
            }
        }

        if (monsters.length === 0) return null;

        // Znajdź najbliższego potwora
        let nearest = null;
        let minD = Infinity;

        for (let m of monsters) {
            let d = getDistance(heroX, heroY, m.d.x, m.d.y);
            if (d < minD) {
                minD = d;
                nearest = m;
            }
        }

        return nearest;
    }

// --- Passage detection utilities ---
function isPassageNpc(npc) {
    // Placeholder: type 7 is commonly used for blue portals in many versions.
    // If passages are not detected, enable `enablePassageDebug` to log nearby NPCs and their `type`.
    return npc.d && (npc.d.type === 7);
}

function getNearestPassage() {
    if (!window.Engine || !window.Engine.npcs) return null;
    const npcs = window.Engine.npcs.check();
    const heroX = window.Engine.hero.d.x;
    const heroY = window.Engine.hero.d.y;
    const npcList = Array.isArray(npcs) ? npcs : Object.values(npcs);
    let nearest = null;
    let minD = Infinity;
    for (const npc of npcList) {
        if (!npc?.d) continue;
        if (isPassageNpc(npc)) {
            const d = getDistance(heroX, heroY, npc.d.x, npc.d.y);
            if (d < minD) { minD = d; nearest = npc; }
        }
    }
    return nearest;
}

// Debug helper – logs NPCs within a radius (default 10 tiles)
function debugNearbyNPCs(radius = 10) {
    if (!CONFIG.enablePassageDebug) return;
    if (!window.Engine || !window.Engine.npcs) return;
    const npcs = window.Engine.npcs.check();
    const heroX = window.Engine.hero.d.x;
    const heroY = window.Engine.hero.d.y;
    const list = Array.isArray(npcs) ? npcs : Object.values(npcs);
    const nearby = [];
    for (const npc of list) {
        if (!npc?.d) continue;
        const d = getDistance(heroX, heroY, npc.d.x, npc.d.y);
        if (d <= radius) nearby.push({id: npc.d.id, type: npc.d.type, name: npc.d.name, dist: d});
    }
    console.log('[ExpBot][Debug] Nearby NPCs (≤' + radius + '):', nearby);
}

// --- Tree detection (fallback) ---
function getNearestTree() {
    if (!window.Engine || !window.Engine.npcs) return null;
    const npcs = window.Engine.npcs.check();
    const heroX = window.Engine.hero.d.x;
    const heroY = window.Engine.hero.d.y;
    const list = Array.isArray(npcs) ? npcs : Object.values(npcs);
    let nearest = null;
    let minD = Infinity;
    for (const npc of list) {
        if (!npc?.d) continue;
        if (npc.d.type === 4) {
            const d = getDistance(heroX, heroY, npc.d.x, npc.d.y);
            if (d < minD) { minD = d; nearest = npc; }
        }
    }
    return nearest;
}
    // Główna pętla bota
    function runBotTick() {
        try {
            if (!CONFIG.isRunning || !window.Engine) return;


            // 1. Sprawdzamy czy okno walki jest aktywne
            if (window.Engine.battle && window.Engine.battle.show) {
                console.log("[ExpBot] Trwa walka...");
            
                // Próba kliknięcia w przycisk "Szybka Walka" na nowym interfejsie
                let fastFightBtn = document.querySelector('.fast-fight-button, [data-key="f"], .btn-szybka');
                if (fastFightBtn) {
                    fastFightBtn.click();
                }
                return;
            }

            // 2. Jeśli postać już się porusza, czekamy
            if (window.Engine.hero && window.Engine.hero.moving) {
                return;
            }

            // 3️⃣ First, try to find a passage (blue portal)
            const passage = getNearestPassage();
            if (passage) {
                const heroX = window.Engine.hero.d.x;
                const heroY = window.Engine.hero.d.y;
                const dist = getDistance(heroX, heroY, passage.d.x, passage.d.y);
                console.log(`[ExpBot] Najbliższe przejście → ID:${passage.d.id} Pos:${passage.d.x},${passage.d.y} Dist:${dist}`);
                // Move to passage – try primary methods first
                if (typeof window.Engine.hero.autoGoTo === 'function') {
                    window.Engine.hero.autoGoTo({x: passage.d.x, y: passage.d.y});
                } else if (typeof window.Engine.hero.goTo === 'function') {
                    window.Engine.hero.goTo(passage.d.x, passage.d.y);
                } else if (typeof window._g === 'function') {
                    window._g(`walk=${passage.d.x},${passage.d.y}`);
                } else {
                    // Fallback: try to click the NPC element directly if accessible
                    try {
                        const el = document.querySelector(`[data-npc-id="${passage.d.id}"]`);
                        if (el) { el.click(); console.log('[ExpBot] Clicked passage element directly'); }
                        else console.warn('[ExpBot] No direct passage element found');
                    } catch (e) { console.warn('[ExpBot] Fallback click failed', e); }
                }
                // If we are still far from the passage, wait for next tick
                if (dist > 0) return;
            }
            // Debug when passage not found
            debugNearbyNPCs();
            // 4️⃣ If no passage, find nearest monster
            const target = getNearestMonster();
            if (target) {
                const heroX = window.Engine.hero.d.x;
                const heroY = window.Engine.hero.d.y;
                const dist = getDistance(heroX, heroY, target.d.x, target.d.y);
                console.log(`[ExpBot] Najbliższy potwór → ID:${target.d.id} Lvl:${target.d.lvl} Pos:${target.d.x},${target.d.y} Dist:${dist}`);

                console.log(`[ExpBot] Idę do potwora! ID: ${target.d.id}, Lvl: ${target.d.lvl}, Poz: ${target.d.x},${target.d.y}`);
            
                // Komendy poruszania się dla silnika (zależnie od dokładnej wersji aktualizacji gry)
                if (typeof window.Engine.hero.autoGoTo === 'function') {
                    window.Engine.hero.autoGoTo({x: target.d.x, y: target.d.y});
                } 
                else if (typeof window.Engine.hero.goTo === 'function') {
                    window.Engine.hero.goTo(target.d.x, target.d.y);
                }
                // Zapasowa metoda używana w niektórych buildach/dodatkach
                else if (typeof window._g === 'function') {
                    window._g(`walk=${target.d.x},${target.d.y}`);
                }
                else {
                    console.warn("[ExpBot] Brak kompatybilnej metody poruszania się w silniku (Zaktualizowano grę?)");
                }
            } else {
                // Brak potworów – optional fallback to drzewa
                if (CONFIG.enableTreeFallback) {
                    const tree = getNearestTree();
                    if (tree) {
                        console.log(`[ExpBot] Idę do drzewa (ID: ${tree.d.id})`);
                        if (typeof window.Engine.hero.autoGoTo === 'function') {
                            window.Engine.hero.autoGoTo({x: tree.d.x, y: tree.d.y});
                        } else if (typeof window.Engine.hero.goTo === 'function') {
                            window.Engine.hero.goTo(tree.d.x, tree.d.y);
                        } else if (typeof window._g === 'function') {
                            window._g(`walk=${tree.d.x},${tree.d.y}`);
                        }
                    }
                }
                // console.log("[ExpBot] Brak potworów na ekranie.");
            }
        } catch (e) {
            console.error("[ExpBot] Błąd w runBotTick:", e);
        }
    }

    // Tworzenie graficznego interfejsu
    function createUI() {
        if (document.getElementById('expbot-ui-v2')) return; // Zabezpieczenie przed podwójnym dodaniem

        const uiContainer = document.createElement('div');
        uiContainer.id = 'expbot-ui-v2';
        uiContainer.style.position = 'fixed';
        uiContainer.style.top = '10px';
        uiContainer.style.left = '50%';
        uiContainer.style.transform = 'translateX(-50%)';
        uiContainer.style.zIndex = '999999';
        uiContainer.style.background = 'rgba(0, 0, 0, 0.9)';
        uiContainer.style.color = '#fff';
        uiContainer.style.padding = '15px';
        uiContainer.style.border = '2px solid #ffaa00';
        uiContainer.style.borderRadius = '5px';
        uiContainer.style.fontFamily = 'Verdana, sans-serif';
        uiContainer.style.fontSize = '14px';
        uiContainer.style.textAlign = 'center';
        uiContainer.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.5)';

        const title = document.createElement('div');
        title.innerText = '⚙️ Auto ExpBot NI';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        uiContainer.appendChild(title);

        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = 'START';
        toggleBtn.style.padding = '8px 16px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.background = '#28a745';
        toggleBtn.style.color = 'white';
        toggleBtn.style.border = 'none';
        toggleBtn.style.borderRadius = '5px';
        toggleBtn.style.fontWeight = 'bold';
        toggleBtn.style.transition = '0.3s';

        // Button for puzzle mode toggle, placed next to toggle
        const puzzleBtn = document.createElement('button');
        puzzleBtn.innerText = '🧩 Puzzles: ON';
        puzzleBtn.style.padding = '8px 12px';
        puzzleBtn.style.marginLeft = '8px';
        puzzleBtn.style.cursor = 'pointer';
        puzzleBtn.style.background = '#0069d9';
        puzzleBtn.style.color = 'white';
        puzzleBtn.style.border = 'none';
        puzzleBtn.style.borderRadius = '5px';
        puzzleBtn.style.fontWeight = 'bold';
        puzzleBtn.style.transition = '0.3s';
        puzzleBtn.onclick = () => {
            CONFIG.enablePuzzles = !CONFIG.enablePuzzles;
            puzzleBtn.innerText = `🧩 Puzzles: ${CONFIG.enablePuzzles ? 'ON' : 'OFF'}`;
            console.log('[ExpBot] Puzzles', CONFIG.enablePuzzles ? 'enabled' : 'disabled');
        };
        
        let botTimeout = null;

        function botLoop() {
            if (!CONFIG.isRunning) return;
            runBotTick();
            
            // ANTY-BAN: Losowe opóźnienie odchylone o +/- 30% od bazowego czasu (żeby nie klikać równo co do milisekundy jak maszyna)
            let randomVariation = CONFIG.intervalMs * 0.3;
            let currentDelay = CONFIG.intervalMs + (Math.random() * randomVariation * 2 - randomVariation);
            
            botTimeout = setTimeout(botLoop, currentDelay);
        }

        toggleBtn.onclick = () => {
            CONFIG.isRunning = !CONFIG.isRunning;
            if (CONFIG.isRunning) {
                toggleBtn.innerText = '🛑 STOP';
                toggleBtn.style.background = '#dc3545';
                botLoop();
                console.log("[ExpBot] Uruchomiono auto-expa.");
            } else {
                toggleBtn.innerText = '▶️ START';
                toggleBtn.style.background = '#28a745';
                clearTimeout(botTimeout);
                console.log("[ExpBot] Zatrzymano auto-expa.");
            }
        };

        // --------------------
        // 6️⃣  LOGS BUTTON (modal)
        // --------------------
// --------------------
// 6️⃣  LOGS BUTTON (modal)
// --------------------
const logsBtn = document.createElement('button');
logsBtn.innerText = '📜 Logs';
logsBtn.style.padding = '8px 12px';
logsBtn.style.marginLeft = '8px';
logsBtn.style.cursor = 'pointer';
logsBtn.style.background = '#6c757d';
logsBtn.style.color = 'white';
logsBtn.style.border = 'none';
logsBtn.style.borderRadius = '5px';
logsBtn.style.fontWeight = 'bold';
logsBtn.style.transition = '0.3s';
logsBtn.onclick = showLogModal;
uiContainer.appendChild(logsBtn);

// ---- COPY LOGS BUTTON ----
const copyBtn = document.createElement('button');
copyBtn.innerText = '📋 Copy';
copyBtn.style.padding = '8px 12px';
copyBtn.style.marginLeft = '8px';
copyBtn.style.cursor = 'pointer';
copyBtn.style.background = '#17a2b8';
copyBtn.style.color = 'white';
copyBtn.style.border = 'none';
copyBtn.style.borderRadius = '5px';
copyBtn.style.fontWeight = 'bold';
copyBtn.style.transition = '0.3s';
copyBtn.onclick = () => {
    const text = LOG_BUFFER.map(e => `[${e.time}] ${e.level}: ${e.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => console.log('[ExpBot] Logi skopiowane do schowka.'));
};
uiContainer.appendChild(copyBtn);
        
        uiContainer.appendChild(puzzleBtn);
        document.body.appendChild(uiContainer);
        // Add icon near bag if exists
        const bagIcon = document.querySelector('.bag, .inventory-bag, #bagIcon');
        if (bagIcon) {
            const menuIcon = document.createElement('span');
            menuIcon.innerText = '⚙️';
            menuIcon.title = 'ExpBot Options';
            menuIcon.style.cursor = 'pointer';
            menuIcon.style.marginLeft = '4px';
            menuIcon.style.color = '#ffcc00';
            menuIcon.onclick = () => {
                // Simple toggle of UI visibility
                const ui = document.getElementById('expbot-ui-v2');
                if (ui) ui.style.display = ui.style.display === 'none' ? 'block' : 'none';
            };
            bagIcon.parentNode.insertBefore(menuIcon, bagIcon.nextSibling);
        }    }

    // Uruchom UI po załadowaniu okna (z małym opóźnieniem by silnik gry zdążył wstać)
    // Ensure UI is recreated if it disappears (e.g., after a map change)
    function ensureUI() {
        if (!document.getElementById('expbot-ui-v2')) {
            console.warn('[ExpBot] UI element missing – recreating.');
            createUI();
        }
    }
    // After page load, create UI and start a watchdog
    window.addEventListener('load', () => {
        setTimeout(() => {
            createUI();
            // Check every 5 s whether UI still exists
            setInterval(ensureUI, 5000);
        }, 3000);
    });

})();
