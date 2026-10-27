"use strict";

const $ = (id) => document.getElementById(id);

// ==========================================================================
// 1. RESOURCE NAVIGATION & LESSON WORKSPACE
// ==========================================================================

const resources = [
    { id: "aim", title: "Aim & Objectives", type: "manual", icon: "▤" },
    { id: "theory", title: "Theory — Stack Architecture", type: "manual", icon: "▤" },
    { id: "procedure", title: "Procedure — Laboratory Guide", type: "manual", icon: "▤" },
    { id: "simulation", title: "Interactive Simulation & Sandbox", type: "interactive", icon: "▣" },
    { id: "levels", title: "Exploit Levels & Payloads", type: "interactive", icon: "⚡" },
    { id: "assessment", title: "Assessment — Quiz", type: "interactive", icon: "✓" },
    { id: "feedback", title: "FAQ & References", type: "manual", icon: "▤" }
];

let currentIndex = 0;
let selectedTab = "all";
const visitedSections = new Set(["aim"]);

function showResource(id) {
    const index = resources.findIndex((r) => r.id === id);
    if (index < 0) return;

    currentIndex = index;

    // Toggle active lesson
    document.querySelectorAll(".lesson").forEach((lesson) => {
        lesson.classList.toggle("active", lesson.id === id);
    });

    // Toggle active resource button
    document.querySelectorAll(".resource-item").forEach((btn) => {
        const active = btn.dataset.resource === id;
        btn.classList.toggle("active", active);
        if (active) btn.setAttribute("aria-current", "page");
        else btn.removeAttribute("aria-current");
    });

    // Update page number
    const pageNumber = $("pageNumber");
    if (pageNumber) {
        pageNumber.textContent = `${currentIndex + 1} / ${resources.length}`;
    }

    // Scroll to top of lesson on mobile
    if (window.innerWidth <= 850 && $("lessonContent")) {
        $("lessonContent").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Mark as visited in learning path
    markSectionVisited(id);
}
window.showResource = showResource;

function renderResources() {
    const list = $("resourceList");
    if (!list) return;

    list.replaceChildren();

    const visibleResources = resources.filter((resource) => {
        if (selectedTab === "all") return true;
        return resource.type === selectedTab;
    });

    if (visibleResources.length === 0) {
        const empty = document.createElement("p");
        empty.className = "resource-note";
        empty.textContent = "No resources found in this category.";
        list.appendChild(empty);
        return;
    }

    visibleResources.forEach((resource) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "resource-item";
        button.dataset.resource = resource.id;
        if (resource.id === resources[currentIndex].id) {
            button.classList.add("active");
            button.setAttribute("aria-current", "page");
        }

        const icon = document.createElement("span");
        icon.className = "resource-icon";
        icon.textContent = resource.icon;

        const title = document.createElement("span");
        title.textContent = resource.title;

        button.appendChild(icon);
        button.appendChild(title);

        button.addEventListener("click", () => showResource(resource.id));
        list.appendChild(button);
    });
}

function initNavigation() {
    // Tab filtering
    document.querySelectorAll(".resource-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".resource-tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            selectedTab = tab.dataset.tab;
            renderResources();
        });
    });

    // Prev / Next buttons
    $("prevButton")?.addEventListener("click", () => {
        if (currentIndex > 0) showResource(resources[currentIndex - 1].id);
    });

    $("nextButton")?.addEventListener("click", () => {
        if (currentIndex < resources.length - 1) showResource(resources[currentIndex + 1].id);
    });

    // Menu toggle for collapsible sidebar
    $("menuButton")?.addEventListener("click", () => {
        document.body.classList.toggle("menu-collapsed");
    });

    // Back button
    $("backButton")?.addEventListener("click", () => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = "/";
    });

    // Share button
    $("shareButton")?.addEventListener("click", async () => {
        const url = window.location.href;
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                alert("Laboratory link copied to clipboard!");
            } else {
                prompt("Copy laboratory link:", url);
            }
        } catch (_) {
            prompt("Copy laboratory link:", url);
        }
    });

    renderResources();
    initLearningPath();
}

// ==========================================================================
// 2. LEARNING PATH CHECKLIST
// ==========================================================================

function initLearningPath() {
    const list = $("learningPathList");
    if (!list) return;

    list.replaceChildren();

    resources.forEach((r) => {
        const li = document.createElement("li");
        li.className = "learning-path-item";
        li.id = `pathItem-${r.id}`;

        const check = document.createElement("span");
        check.className = "learning-check-icon";
        check.textContent = "✓";

        const text = document.createElement("span");
        text.textContent = r.title.split("—")[0].trim();

        li.appendChild(check);
        li.appendChild(text);
        list.appendChild(li);
    });

    updateLearningProgress();
}

function markSectionVisited(id) {
    visitedSections.add(id);
    updateLearningProgress();
}

function updateLearningProgress() {
    const total = resources.length;
    const completed = visitedSections.size;
    const percent = Math.round((completed / total) * 100);

    const countEl = $("learningPathCount");
    const barEl = $("learningProgressFill");

    if (countEl) countEl.textContent = `${completed} / ${total}`;
    if (barEl) barEl.style.width = `${percent}%`;

    visitedSections.forEach((id) => {
        const item = $(`pathItem-${id}`);
        if (item) item.classList.add("completed");
    });
}

// ==========================================================================
// 3. WEBASSEMBLY STACK MEMORY VISUALIZER
// ==========================================================================

const BUF_SIZE = 16;
const ADJ_SIZE = 8;
const TOTAL_MEM_SIZE = BUF_SIZE + ADJ_SIZE;
let wasmInstance = null;
let isVisualizing = false;

async function initWasmVisualizer() {
    const grid = $("vizMemoryGrid");
    const badge = $("vizStatusBadge");
    const readout = $("vizReadout");

    if (!grid) return;

    grid.replaceChildren();

    // Create 24 memory cells (0-15 buffer, 16-23 adjacent stack)
    for (let i = 0; i < TOTAL_MEM_SIZE; i++) {
        const cell = document.createElement("div");
        const isBuf = i < BUF_SIZE;
        cell.className = `mem-cell ${isBuf ? "buf" : "adj"}`;
        cell.id = `memCell${i}`;

        const idx = document.createElement("span");
        idx.className = "mem-cell-idx";
        idx.textContent = `[${i}]`;

        const val = document.createElement("span");
        val.className = "mem-cell-val";
        val.textContent = "00";

        cell.appendChild(idx);
        cell.appendChild(val);
        grid.appendChild(cell);
    }

    // Load overflow.wasm
    try {
        const resp = await fetch("/vendor/overflow.wasm");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const bytes = await resp.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes);
        wasmInstance = instance.exports;
        wasmInstance.reset_region();
        if (badge) {
            badge.textContent = `● WASM Engine Ready (${bytes.byteLength} B)`;
            badge.classList.add("active");
        }
    } catch (e) {
        console.warn("WASM instantiation failed, using JS memory simulation fallback:", e);
        if (badge) badge.textContent = "● Emulated Memory Engine";
        // JS memory fallback
        const mockMemory = new Uint8Array(TOTAL_MEM_SIZE);
        wasmInstance = {
            reset_region: () => mockMemory.fill(0),
            write_byte: (i, byte) => { if (i < TOTAL_MEM_SIZE) mockMemory[i] = byte; },
            read_byte: (i) => mockMemory[i] || 0
        };
    }

    renderMemoryGrid();

    // Button event listeners
    $("vizInjectBtn")?.addEventListener("click", () => {
        const input = $("vizInput")?.value || "";
        injectPayload(input);
    });

    $("vizResetBtn")?.addEventListener("click", () => {
        if (isVisualizing) return;
        wasmInstance.reset_region();
        renderMemoryGrid();
        if (readout) readout.textContent = "Memory reset to 0x00. Safe buffer is clear.";
    });
}

function renderMemoryGrid() {
    for (let i = 0; i < TOTAL_MEM_SIZE; i++) {
        const val = wasmInstance.read_byte(i);
        const cell = $(`memCell${i}`);
        if (!cell) continue;

        const valSpan = cell.querySelector(".mem-cell-val");
        if (valSpan) {
            valSpan.textContent = val ? val.toString(16).padStart(2, "0").toUpperCase() : "00";
        }

        cell.classList.remove("overflow");
        if (i >= BUF_SIZE && val !== 0) {
            cell.classList.add("overflow");
        }
    }
}

async function injectPayload(str) {
    if (isVisualizing || !wasmInstance) return;
    isVisualizing = true;

    const readout = $("vizReadout");
    wasmInstance.reset_region();
    renderMemoryGrid();

    const writeLength = Math.min(str.length, TOTAL_MEM_SIZE);

    for (let i = 0; i < writeLength; i++) {
        const charCode = str.charCodeAt(i);
        wasmInstance.write_byte(i, charCode);

        const cell = $(`memCell${i}`);
        if (cell) cell.classList.add("hit");

        renderMemoryGrid();

        await new Promise((r) => setTimeout(r, 70));
        if (cell) cell.classList.remove("hit");
    }

    if (str.length > BUF_SIZE) {
        const overflowCount = str.length - BUF_SIZE;
        if (readout) {
            readout.innerHTML = `<span style="color:var(--vuln); font-weight:700;">⚠ BUFFER OVERFLOW DETECTED:</span> Wrote ${str.length} bytes into a 16-byte buffer. <strong>${overflowCount} byte(s)</strong> spilled over and corrupted the adjacent stack frame / return address pointer!`;
        }
    } else {
        if (readout) {
            readout.innerHTML = `<span style="color:var(--safe); font-weight:700;">✔ SAFE MEMORY WRITE:</span> Wrote ${str.length} bytes completely within the 16-byte buffer allocation. Adjacent stack frame memory remained completely uncorrupted.`;
        }
    }

    isVisualizing = false;
}

function applyVizPreset(preset) {
    const input = $("vizInput");
    if (!input) return;

    if (preset === "Normal") {
        input.value = "CyberLab";
    } else if (preset === "Boundary") {
        input.value = "1234567890123456";
    } else if (preset === "Overflow") {
        input.value = "AAAAAAAAAAAAAAAAAAAA"; // 20 bytes
    } else if (preset === "Hijack") {
        input.value = "AAAAAAAAAAAAAAAA\xEF\xBE\xAD\xDE\x00\x00\x00\x00"; // 24 bytes with deadbeef
    }

    injectPayload(input.value);
}
window.applyVizPreset = applyVizPreset;

// ==========================================================================
// 4. LIVE DOCKER SANDBOX TERMINAL (XTERM.JS + WEBSOCKET)
// ==========================================================================

let term = null;
let ws = null;

function initTerminal() {
    const container = $("termContainer");
    const statusDot = $("termStatusDot");
    const statusText = $("termStatusText");

    if (!container || typeof Terminal === "undefined") return;

    term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
        theme: {
            background: "#100e0c",
            foreground: "#f4ede8",
            cursor: "#e2a03f",
            selectionBackground: "rgba(166, 125, 105, 0.4)"
        }
    });

    term.open(container);

    connectWebSocket();

    $("termReconnectBtn")?.addEventListener("click", () => {
        if (ws) ws.close();
        term.writeln("\r\n[Reconnecting sandbox session...]");
        connectWebSocket();
    });

    $("termClearBtn")?.addEventListener("click", () => {
        term.clear();
    });

    term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
}

function connectWebSocket() {
    const statusDot = $("termStatusDot");
    const statusText = $("termStatusText");

    const protocol = location.protocol === "https:" ? "wss://" : "ws://";
    ws = new WebSocket(`${protocol}${location.host}/session`);
    ws.binaryType = "arraybuffer";

    if (statusDot) statusDot.className = "status-dot";
    if (statusText) statusText.textContent = "connecting to docker sandbox...";

    ws.onopen = () => {
        if (statusDot) statusDot.className = "status-dot live";
        if (statusText) statusText.textContent = "connected to docker sandbox";

        if (term) {
            ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }

        const activeLevel = document.querySelector(".level-card.open");
        if (activeLevel?.dataset.level) {
            ws.send(JSON.stringify({ type: "setLevel", levelId: activeLevel.dataset.level }));
        }
    };

    ws.onerror = () => {
        if (statusDot) statusDot.className = "status-dot dead";
        if (statusText) statusText.textContent = "connection error";
    };

    ws.onclose = () => {
        if (statusDot) statusDot.className = "status-dot dead";
        if (statusText) statusText.textContent = "disconnected";
        if (term) term.writeln("\r\n[Sandbox session disconnected. Click 'Restart Session' to reconnect.]");
    };

    ws.onmessage = (ev) => {
        if (typeof ev.data === "string") {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.type === "flag") {
                    revealCapturedFlag(msg.levelId, msg.flag);
                }
            } catch (_) {}
            return;
        }
        if (term) term.write(new Uint8Array(ev.data));
    };
}

function sendTerminalCommand(cmd) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(`${cmd}\n`);
    } else {
        alert("Sandbox terminal is not connected. Please click 'Restart Session' or wait for connection.");
    }
}
window.sendTerminalCommand = sendTerminalCommand;

function revealCapturedFlag(levelId, flag) {
    const card = document.querySelector(`.level-card[data-level="${levelId}"]`);
    if (!card) return;

    const slot = card.querySelector(".flag-slot");
    if (slot) {
        slot.hidden = false;
        slot.innerHTML = `🏁 <strong>FLAG CAPTURED:</strong> <code>${flag}</code>`;
    }
}

// ==========================================================================
// 5. EXPLOIT LEVELS ACCORDION & CODE UTILITIES
// ==========================================================================

function toggleLevelCard(headerBtn) {
    const card = headerBtn.closest(".level-card");
    if (!card) return;

    const isOpen = card.classList.contains("open");
    card.classList.toggle("open", !isOpen);

    if (!isOpen && card.dataset.level && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "setLevel", levelId: card.dataset.level }));
    }
}
window.toggleLevelCard = toggleLevelCard;

async function copySnippet(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            prompt("Copy command:", text);
        }
        const btn = event?.target;
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = orig; }, 1500);
        }
    } catch (_) {
        prompt("Copy command:", text);
    }
}
window.copySnippet = copySnippet;

// ==========================================================================
// 6. SELF-CHECK ASSESSMENT / QUIZ
// ==========================================================================

const quizQuestions = [
    {
        q: "Why can the standard library function gets() never be used safely?",
        opts: [
            "It requires root/superuser execution privileges",
            "It accepts no destination length argument to prevent unbounded reading",
            "It only compiles on x86 architectures",
            "It automatically encrypts input data"
        ],
        correct: 1,
        explanation: "gets() only receives a pointer to destination memory with zero capacity information, making it impossible to prevent unbounded user writes."
    },
    {
        q: "What defensive mechanism does AddressSanitizer (ASan) use to detect buffer overflows?",
        opts: [
            "Poisoned redzones placed around variables in shadow memory",
            "Automatic XOR encryption of pointers",
            "Real-time CPU frequency throttling",
            "Stack pointer compression"
        ],
        correct: 0,
        explanation: "ASan instruments memory accesses and surrounds allocations with poisoned redzone bytes. Accessing a redzone triggers immediate termination."
    },
    {
        q: "What is the primary function of a Stack Canary (StackGuard)?",
        opts: [
            "To prevent the heap from growing into the stack",
            "To speed up function returns via branch prediction",
            "To detect corruption of the saved frame pointer and return address before a function returns",
            "To allocate dynamic arrays without malloc"
        ],
        correct: 2,
        explanation: "A canary is placed right before the saved EBP and return address. Altering it triggers __stack_chk_fail() to prevent hijacked returns."
    },
    {
        q: "What is the root cause of the vulnerability in Level 05 (memcpy)?",
        opts: [
            "memcpy() is inherently deprecated in C",
            "An unvalidated or caller-controlled length parameter exceeds the destination buffer",
            "The compiler automatically enables ASLR",
            "Destination and source pointers are stored in little-endian format"
        ],
        correct: 1,
        explanation: "memcpy() will obediently copy whatever length is provided. If the length check is omitted or flawed, a buffer overflow occurs."
    },
    {
        q: "What does Address Space Layout Randomization (ASLR) randomize?",
        opts: [
            "Variable names inside the symbol table",
            "Base memory addresses of the stack, heap, and shared libraries per run",
            "The order of statements in compiled functions",
            "The clock cycle count of system calls"
        ],
        correct: 1,
        explanation: "ASLR randomizes memory regions at execution time, rendering hardcoded target addresses unpredictable to attackers."
    },
    {
        q: "In an instruction pointer hijack (Level 07), what does the exploit payload overwrite?",
        opts: [
            "The program counter register while the CPU is powered off",
            "The saved Return Address (RET) on the call stack",
            "The kernel filesystem superblock",
            "The terminal emulator window title"
        ],
        correct: 1,
        explanation: "By overwriting the saved Return Address on the stack with the address of win(), the CPU pops win()'s entry point into RIP upon returning."
    }
];

let quizScore = 0;
let answeredCount = 0;

function initQuiz() {
    const container = $("quizContainer");
    if (!container) return;

    container.replaceChildren();
    quizScore = 0;
    answeredCount = 0;

    $("quizScoreBanner") && ($("quizScoreBanner").style.display = "none");

    quizQuestions.forEach((item, qIdx) => {
        const card = document.createElement("div");
        card.className = "quiz-card";

        const qTitle = document.createElement("p");
        qTitle.className = "quiz-question";
        qTitle.textContent = `${qIdx + 1}. ${item.q}`;
        card.appendChild(qTitle);

        const optsWrap = document.createElement("div");
        optsWrap.className = "quiz-options";

        const expl = document.createElement("div");
        expl.className = "quiz-explanation";
        expl.textContent = `Explanation: ${item.explanation}`;

        item.opts.forEach((optText, optIdx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "quiz-opt";
            btn.textContent = optText;

            btn.addEventListener("click", () => {
                if (btn.dataset.locked) return;

                optsWrap.querySelectorAll(".quiz-opt").forEach((b) => (b.dataset.locked = "true"));

                if (optIdx === item.correct) {
                    btn.classList.add("correct");
                    quizScore++;
                } else {
                    btn.classList.add("wrong");
                    optsWrap.children[item.correct].classList.add("correct");
                }

                expl.style.display = "block";
                answeredCount++;

                if (answeredCount === quizQuestions.length) {
                    showQuizResults();
                }
            });

            optsWrap.appendChild(btn);
        });

        card.appendChild(optsWrap);
        card.appendChild(expl);
        container.appendChild(card);
    });
}

function showQuizResults() {
    const banner = $("quizScoreBanner");
    const text = $("quizScoreText");
    if (!banner || !text) return;

    banner.style.display = "flex";
    text.textContent = `You scored ${quizScore} out of ${quizQuestions.length} (${Math.round((quizScore / quizQuestions.length) * 100)}%). Excellent work!`;
}

function resetQuiz() {
    initQuiz();
}
window.resetQuiz = resetQuiz;

// ==========================================================================
// 7. GUIDED ONBOARDING TOUR ENGINE
// ==========================================================================

const tourSteps = [
    {
        id: "welcome",
        selector: null,
        title: "Welcome to Buffer Overflow Virtual Lab!",
        text: "In this laboratory, you will explore stack-based memory corruption, understand why classic C functions fail without bounds checking, and observe how attackers hijack control flow.",
        analogy: "Think of a buffer as an 8-ounce glass of water. If you pour 12 ounces in, the excess 4 ounces spills onto your table, soaking adjacent papers! In computer memory, those 'papers' are control pointers that tell the CPU what to do next."
    },
    {
        id: "header",
        selector: ".topbar",
        title: "Header Navigation & Actions",
        text: "The header shows your laboratory subject. Use the back button (←) to return to the catalog, or click 'Share' to copy a direct link to this experiment."
    },
    {
        id: "navigator",
        selector: ".toolbar",
        title: "Workbook Page Navigator",
        text: "Step sequentially through the curriculum using the '‹' and '›' buttons. Track your progress with the page indicator (e.g. 1 / 7)."
    },
    {
        id: "menu",
        selector: "#menuButton",
        title: "Sidebar Toggle",
        text: "Need more room for terminal commands and visualizer analysis? Click this button to collapse the sidebar for a full-width experience."
    },
    {
        id: "sidebar",
        selector: "#resourcesPanel",
        title: "Curriculum Resources Directory",
        text: "Switch between All, Interactive, and Manual materials. Track your learning achievements with the real-time checklist and progress bar!"
    },
    {
        id: "simulation",
        selector: "#simulation",
        title: "Interactive WASM Visualizer & Live Terminal",
        text: "Experience stack memory in action! Use the WebAssembly memory visualizer to inspect byte-by-byte buffer writes, and use the integrated terminal connected to the live Docker sandbox.",
        onEnter: () => showResource("simulation")
    },
    {
        id: "levels",
        selector: "#levels",
        title: "Vulnerability Catalog & Payloads",
        text: "Explore all 7 levels (gets, strcpy, strcat, sprintf, memcpy, array-indexing, and return redirect). Copy exploit triggers and observe crash reports in the sandbox.",
        onEnter: () => showResource("levels")
    },
    {
        id: "assessment",
        selector: "#assessment",
        title: "Self-Check Assessment",
        text: "Test your mastery of memory safety and defenses with instant feedback on each question.",
        onEnter: () => showResource("assessment")
    }
];

let currentTourStep = 0;

function startTour() {
    currentTourStep = 0;
    const overlay = $("tourOverlay");
    if (!overlay) return;

    overlay.hidden = false;
    renderTourStep(0);
}
window.startTour = startTour;

function endTour() {
    const overlay = $("tourOverlay");
    if (overlay) overlay.hidden = true;
}
window.endTour = endTour;

function renderTourStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= tourSteps.length) return;
    currentTourStep = stepIndex;

    const step = tourSteps[stepIndex];
    if (typeof step.onEnter === "function") {
        try { step.onEnter(); } catch (_) {}
    }

    const titleEl = $("tourTitle");
    const textEl = $("tourText");
    const badgeEl = $("tourBadge");
    const analogyBox = $("tourAnalogyBox");
    const analogyText = $("tourAnalogyText");
    const dots = $("tourDots");
    const spotlight = $("tourSpotlight");
    const tooltip = $("tourTooltip");

    if (titleEl) titleEl.textContent = step.title;
    if (textEl) textEl.textContent = step.text;
    if (badgeEl) badgeEl.textContent = `Step ${stepIndex + 1} of ${tourSteps.length}`;

    if (step.analogy) {
        if (analogyBox) analogyBox.hidden = false;
        if (analogyText) analogyText.textContent = step.analogy;
    } else {
        if (analogyBox) analogyBox.hidden = true;
    }

    // Render progress dots
    if (dots) {
        dots.replaceChildren();
        tourSteps.forEach((_, idx) => {
            const dot = document.createElement("span");
            dot.className = `tour-dot ${idx === stepIndex ? "active" : ""}`;
            dots.appendChild(dot);
        });
    }

    // Position spotlight & tooltip
    let target = null;
    if (step.selector) target = document.querySelector(step.selector);

    if (target && spotlight && tooltip) {
        spotlight.style.display = "block";
        const rect = target.getBoundingClientRect();
        const pad = 8;
        spotlight.style.top = `${rect.top - pad}px`;
        spotlight.style.left = `${rect.left - pad}px`;
        spotlight.style.width = `${rect.width + pad * 2}px`;
        spotlight.style.height = `${rect.height + pad * 2}px`;

        // Position tooltip below or above target
        const tooltipTop = Math.min(window.innerHeight - 340, Math.max(20, rect.bottom + 16));
        const tooltipLeft = Math.min(window.innerWidth - 460, Math.max(20, rect.left));
        tooltip.style.top = `${tooltipTop}px`;
        tooltip.style.left = `${tooltipLeft}px`;
    } else if (spotlight && tooltip) {
        spotlight.style.display = "none";
        tooltip.style.top = "50%";
        tooltip.style.left = "50%";
        tooltip.style.transform = "translate(-50%, -50%)";
    }

    // Next button label
    const nextBtn = $("tourNextBtn");
    if (nextBtn) {
        nextBtn.textContent = stepIndex === tourSteps.length - 1 ? "Finish" : "Next ›";
    }
}

function initTour() {
    $("startTourButton")?.addEventListener("click", startTour);
    $("floatingHelpBtn")?.addEventListener("click", startTour);
    $("tourCloseBtn")?.addEventListener("click", endTour);
    $("tourSkipBtn")?.addEventListener("click", endTour);

    $("tourNextBtn")?.addEventListener("click", () => {
        if (currentTourStep < tourSteps.length - 1) {
            renderTourStep(currentTourStep + 1);
        } else {
            endTour();
        }
    });

    $("tourBackBtn")?.addEventListener("click", () => {
        if (currentTourStep > 0) {
            renderTourStep(currentTourStep - 1);
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !$("tourOverlay")?.hidden) {
            endTour();
        }
    });
}

// ==========================================================================
// 8. GLOBAL INITIALIZATION
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initWasmVisualizer();
    initTerminal();
    initQuiz();
    initTour();
});
