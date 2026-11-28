"use strict";

/* ==========================================
   CONFIGURAÇÕES
========================================== */

const CONFIG = {
    scannerDuration: 7000,
    colorCooldown: 30000,
    doublesCooldown: 30000,
    whiteDiceMin: 66,
    whiteDiceMax: 88,
    blackDiceMin: 15,
    blackDiceMax: 27,
    tieMax: 3
};

/* ==========================================
   ELEMENTOS
========================================== */

const $ = selector => document.querySelector(selector);

const accessMessage = $("#accessMessage");
const accessTitle = $("#accessTitle");
const accessText = $("#accessText");
const doublesSummary = $("#doublesSummary");
const colorButton = $("#colorButton");
const doublesButton = $("#doublesButton");
const playerPercent = $("#playerPercent");
const tiePercent = $("#tiePercent");
const bankerPercent = $("#bankerPercent");
const colorSummary = $("#colorSummary");

const diceArea = $("#diceArea");
const dice = [...document.querySelectorAll(".dice")];

const urlForm = $("#urlForm");
const urlInput = $("#urlInput");
const siteFrame = $("#siteFrame");
const iframePlaceholder = $("#iframePlaceholder");

let colorRunning = false;
let doublesRunning = false;
let audioContext = null;
let navigationReady = false;

const STORAGE_KEY = "goplay_state";

const cooldowns = {
    colors: {
        deadline: 0,
        timer: null,
        button: colorButton,
        duration: CONFIG.colorCooldown,
        originalText: "ϟ GERAR ANÁLISE"
    },
    doubles: {
        deadline: 0,
        timer: null,
        button: doublesButton,
        duration: CONFIG.doublesCooldown,
        originalText: "ϟ GERAR ANÁLISE DE DUPLOS"
    }
};

/* ==========================================
   ESTADO SALVO
========================================== */

function loadSavedState() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveState(data) {
    try {
        const current = loadSavedState();

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                ...current,
                ...data
            })
        );
    } catch (error) {
        console.error("Erro ao salvar estado:", error);
    }
}

/* ==========================================
   CONTROLE DOS COOLDOWNS
========================================== */

function getCooldownRemaining(type) {
    const cooldown = cooldowns[type];

    if (!cooldown) return 0;

    return Math.max(0, cooldown.deadline - Date.now());
}

function isCooldownActive(type) {
    return getCooldownRemaining(type) > 0;
}

function startCooldown(type) {
    const cooldown = cooldowns[type];

    if (!cooldown || !cooldown.button) return;

    if (cooldown.timer) {
        clearInterval(cooldown.timer);
    }

    cooldown.deadline = Date.now() + cooldown.duration;

    cooldown.button.disabled = true;

    function update() {
        const remaining = getCooldownRemaining(type);

        if (remaining <= 0) {
            clearInterval(cooldown.timer);
            cooldown.timer = null;
            cooldown.deadline = 0;

            cooldown.button.innerHTML = cooldown.originalText;

            updateAnalysisAccess();
            return;
        }

        const seconds = Math.ceil(remaining / 1000);

        if (
            type === "colors" && colorRunning ||
            type === "doubles" && doublesRunning
        ) {
            cooldown.button.innerHTML = "ϟ ANALISANDO...";
        } else {
            cooldown.button.innerHTML = `ϟ AGUARDE ${seconds}s`;
        }

        cooldown.button.disabled = true;
    }

    update();

    cooldown.timer = setInterval(update, 200);
}

/* ==========================================
   MENSAGENS
========================================== */

function showAccessMessage(title, message, type = "") {
    if (!accessMessage) return;

    if (accessTitle) accessTitle.textContent = title;
    if (accessText) accessText.textContent = message;

    accessMessage.className = "access-message";

    if (type) {
        accessMessage.classList.add(type);
    }
}

/* ==========================================
   CONTROLE DE ACESSO
========================================== */

function updateAnalysisAccess() {

    window.aplicarBloqueioHorarios?.();   // <<< NOVO

    const hasUrl = Boolean(
        urlInput &&
        urlInput.value.trim() &&
        siteFrame &&
        siteFrame.src
    );

    const canUseAnalysis = navigationReady && hasUrl;

    if (colorButton) {
        colorButton.disabled =
            !canUseAnalysis ||
            colorRunning ||
            isCooldownActive("colors");
    }

    if (doublesButton) {
        doublesButton.disabled =
            !canUseAnalysis ||
            doublesRunning ||
            isCooldownActive("doubles");
    }
}

/* ==========================================
   FUNÇÕES AUXILIARES
========================================== */

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* ==========================================
   SISTEMA DE ÁUDIO
========================================== */

async function getAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) return null;

    if (!audioContext) {
        audioContext = new AudioCtx();
    }

    if (audioContext.state !== "running") {
        await audioContext.resume();
    }

    return audioContext;
}

async function playInterfaceSound() {
    try {
        const ctx = await getAudioContext();
        if (!ctx) return;

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
            1800,
            ctx.currentTime
        );

        gain.gain.setValueAtTime(0.035, ctx.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 0.2
        );

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.22);

    } catch (error) {
        console.error("Erro no áudio:", error);
    }
}

async function playScannerSound() {
    try {
        const ctx = await getAudioContext();
        if (!ctx) return;

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
            1450,
            ctx.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            2100,
            ctx.currentTime + 0.09
        );

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.025,
            ctx.currentTime + 0.015
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 0.16
        );

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.17);

    } catch (error) {
        console.error("Erro no som do scanner:", error);
    }
}

/* ==========================================
   SIMULAÇÃO VISUAL DE CORES
========================================== */

function generateDemoPercentages() {
    const tie = randomInt(0, CONFIG.tieMax);
    const remaining = 100 - tie;

    const player = randomInt(1, remaining - 1);
    const banker = remaining - player;

    return {
        player,
        tie,
        banker
    };
}

function animateNumber(element, target) {
    if (!element) return;

    const duration = 1200;
    const start = performance.now();

    function update(now) {
        const progress = Math.min(
            (now - start) / duration,
            1
        );

        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);

        element.innerHTML = `${current}<small>%</small>`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function showColorSummary(values) {
    const options = [
        { name: "JOGADOR", value: values.player },
        { name: "EMPATE", value: values.tie },
        { name: "BANCA", value: values.banker }
    ];

    options.sort((a, b) => b.value - a.value);

    const winner = $("#colorWinner");
    const description = $("#colorDescription");

    if (winner) {
        winner.textContent =
            `${options[0].name} · ${options[0].value}%`;

        winner.classList.remove("player", "banker", "tie");

        if (options[0].name === "JOGADOR") {
            winner.classList.add("player");
        } else if (options[0].name === "BANCA") {
            winner.classList.add("banker");
        } else {
            winner.classList.add("tie");
        }
    }

    if (description) {
        description.textContent =
            "Proteja no empate ate G1";
    }

    colorSummary?.classList.remove("hidden");
}

/* ==========================================
   ANÁLISE DE CORES
========================================== */

async function generateColorDemo() {

    if (!navigationReady) return;
    if (colorRunning) return;
    if (isCooldownActive("colors")) return;

    if (
        !colorButton ||
        !playerPercent ||
        !tiePercent ||
        !bankerPercent ||
        !colorSummary
    ) {
        console.error("Elementos das cores não encontrados.");
        return;
    }

    colorRunning = true;

    startCooldown("colors");
    updateAnalysisAccess();

    try {
        playInterfaceSound();

        colorSummary.classList.add("hidden");

        playerPercent.innerHTML = "--<small>%</small>";
        tiePercent.innerHTML = "--<small>%</small>";
        bankerPercent.innerHTML = "--<small>%</small>";

        await sleep(350);

        const values = generateDemoPercentages();

        animateNumber(playerPercent, values.player);
        animateNumber(tiePercent, values.tie);
        animateNumber(bankerPercent, values.banker);

        document.querySelectorAll(".color-card").forEach(card => {
            card.classList.remove("updated");
            void card.offsetWidth;
            card.classList.add("updated");
        });

        await sleep(1400);

        showColorSummary(values);

    } catch (error) {
        console.error("Erro nas cores:", error);

    } finally {
        colorRunning = false;
        updateAnalysisAccess();
    }
}

colorButton?.addEventListener("click", generateColorDemo);

/* ==========================================
   DADOS - ESTADO INICIAL
========================================== */

function resetDice() {
    if (!diceArea) return;

    diceArea.classList.remove("scanning");

    dice.forEach(item => {
        item.classList.remove("black-dice");
        item.classList.add("white-dice");

        const liquid = item.querySelector(".liquid");

        if (!liquid) return;

        liquid.style.transition = "none";
        liquid.style.height = "0%";

        void liquid.offsetWidth;

        liquid.style.transition =
            "height 2.5s cubic-bezier(.18,.7,.25,1)";
    });
}

/* ==========================================
   SCANNER DOS DADOS
========================================== */

function startDiceScanner() {
    diceArea?.classList.add("scanning");
}

function stopDiceScanner() {
    diceArea?.classList.remove("scanning");
}

/* ==========================================
   DISTRIBUIÇÃO VISUAL DOS DADOS
========================================== */

function shuffleArray(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(0, i);

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

function fillDice() {
    const blackIndexes = shuffleArray([0, 1, 2, 3, 4, 5])
        .slice(0, 3);

    dice.forEach((item, index) => {
        const liquid = item.querySelector(".liquid");

        if (!liquid) return;

        const isBlack = blackIndexes.includes(index);

        if (isBlack) {
            item.classList.remove("white-dice");
            item.classList.add("black-dice");

            liquid.style.height = `${randomInt(
                CONFIG.blackDiceMin,
                CONFIG.blackDiceMax
            )}%`;

        } else {
            item.classList.remove("black-dice");
            item.classList.add("white-dice");

            liquid.style.height = `${randomInt(
                CONFIG.whiteDiceMin,
                CONFIG.whiteDiceMax
            )}%`;
        }
    });
}

/* ==========================================
   ANÁLISE DE DUPLOS
========================================== */

async function generateDoublesDemo() {

    if (!navigationReady) return;
    if (doublesRunning) return;
    if (isCooldownActive("doubles")) return;

    if (!doublesButton || !diceArea || !doublesSummary) {
        console.error("Elementos dos duplos não encontrados.");
        return;
    }

    doublesRunning = true;

    startCooldown("doubles");
    updateAnalysisAccess();

    try {
        playInterfaceSound();

        doublesSummary.classList.add("hidden");

        resetDice();
        startDiceScanner();

        await sleep(CONFIG.scannerDuration);

        stopDiceScanner();
        fillDice();

        playScannerSound();

        await sleep(2600);

        doublesSummary.classList.remove("hidden");

    } catch (error) {
        console.error("Erro na animação:", error);

    } finally {
        stopDiceScanner();

        doublesRunning = false;
        updateAnalysisAccess();
    }
}

doublesButton?.addEventListener(
    "click",
    generateDoublesDemo
);

/* ==========================================
   CENTRAL DE NAVEGAÇÃO / IFRAME
========================================== */

urlInput?.addEventListener("input", () => {

    navigationReady = false;

    updateAnalysisAccess();

    if (siteFrame) {
        siteFrame.onload = null;
        siteFrame.onerror = null;
        siteFrame.removeAttribute("src");
        siteFrame.style.display = "none";
    }

    if (iframePlaceholder) {
        iframePlaceholder.style.display = "flex";
    }
});

urlForm?.addEventListener("submit", (event) => {

    event.preventDefault();

    let address = urlInput?.value.trim();

    if (!address) {
        showAccessMessage(
            "ENDEREÇO INVÁLIDO",
            "Digite um endereço para continuar.",
            "error"
        );
        return;
    }

    try {

        if (!/^https?:\/\//i.test(address)) {
            address = "https://" + address;
        }

        const parsed = new URL(address);

        if (!["https:", "http:"].includes(parsed.protocol)) {
            throw new Error("Protocolo inválido.");
        }

        if (!siteFrame) {
            throw new Error("Iframe não encontrado.");
        }

        navigationReady = false;
        updateAnalysisAccess();

        showAccessMessage(
            "CARREGANDO PÁGINA",
            "Aguarde enquanto a página é aberta."
        );

        siteFrame.onload = () => {

            navigationReady = true;
            updateAnalysisAccess();

            showAccessMessage(
                "NAVEGAÇÃO INICIADA",
                "A página foi carregada com sucesso.",
                "success"
            );

            saveState({
                lastUrl: parsed.href,
                lastUrlOpened: true
            });
        };

        siteFrame.onerror = () => {

            navigationReady = false;
            updateAnalysisAccess();

            showAccessMessage(
                "ERRO DE CARREGAMENTO",
                "Não foi possível carregar a página.",
                "error"
            );
        };

        siteFrame.src = parsed.href;
        siteFrame.style.display = "block";

        if (iframePlaceholder) {
            iframePlaceholder.style.display = "none";
        }

    } catch (error) {

        navigationReady = false;
        updateAnalysisAccess();

        showAccessMessage(
            "ENDEREÇO INVÁLIDO",
            "Verifique o endereço digitado.",
            "error"
        );

        console.error(error);
    }
});

/* ==========================================
   INICIALIZAÇÃO
========================================== */

resetDice();

updateAnalysisAccess();

console.log("MEGA SIC - Interface inicializada.");

/* ==========================================
   HORÁRIOS PROGRAMADOS / ENCERRADOS
========================================== */

(function () {

    const SLOT_MS = 3 * 60 * 1000;      // intervalo de 3 minutos
    const QTD_PROXIMOS = 4;             // sempre 4 horários futuros
    const QTD_ENCERRADOS = 6;           // quantos encerrados mostrar
    const HORARIOS_KEY = "goplay_horarios";

    const elProximos = document.getElementById("proximosLista");
    const elEncerrados = document.getElementById("encerradosLista");
    const elRelogio = document.getElementById("relogioAtual");

    if (!elProximos || !elEncerrados) return;

    const ICON_RELOGIO =
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

    const ICON_FOGO =
        '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/></svg>';

    const ICON_FOGO_PEQUENO =
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/></svg>';

    /* ---------- estado salvo (sobrevive ao recarregar) ---------- */

    let estado = carregarEstado();
    let assinaturaAtual = "";

    function carregarEstado() {
        try {
            const salvo = JSON.parse(localStorage.getItem(HORARIOS_KEY));
            return {
                hotId: salvo && typeof salvo.hotId === "number" ? salvo.hotId : null,
                hotIds: salvo && Array.isArray(salvo.hotIds) ? salvo.hotIds : []
            };
        } catch {
            return { hotId: null, hotIds: [] };
        }
    }

    function salvarEstado() {
        try {
            localStorage.setItem(HORARIOS_KEY, JSON.stringify(estado));
        } catch (erro) {
            console.error("Erro ao salvar horários:", erro);
        }
    }

    /* ---------- utilitários ---------- */

    const pad = n => String(n).padStart(2, "0");

    function formatarHora(ms) {
        const d = new Date(ms);
        return pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function formatarHoraCompleta(ms) {
        const d = new Date(ms);
        return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function formatarContagem(msRestantes) {
        const total = Math.max(0, Math.ceil(msRestantes / 1000));
        return pad(Math.floor(total / 60)) + ":" + pad(total % 60);
    }

    function inicioDoSlot(agora) {
        return Math.floor(agora / SLOT_MS) * SLOT_MS;
    }

    function sorteio(max) {
        try {
            const buffer = new Uint32Array(1);
            crypto.getRandomValues(buffer);
            return buffer[0] % max;
        } catch {
            return Math.floor(Math.random() * max);
        }
    }

    /* ---------- histórico: mesmo minuto, voltando 1h por registro ---------- */

    function calcularHistorico(inicio) {
        const fim = inicio + SLOT_MS;

        return [1, 2, 3].map(horas => formatarHora(fim - horas * 3600000));
    }

    /* ---------- resultado confirmado (somente se existir fonte real) ----------
       Por padrão nada é marcado como acerto. Se você tiver uma fonte real de
       resultados, preencha window.GOPLAY_RESULTADOS assim:
       window.GOPLAY_RESULTADOS = { "20:08 - 20:11": { confirmado: true, vezes: 2 } };
    ------------------------------------------------------------------------ */

    function obterResultado(inicio) {
        const fonte = window.GOPLAY_RESULTADOS;
        if (!fonte) return null;

        const chave = formatarHora(inicio) + " - " + formatarHora(inicio + SLOT_MS);
        const item = fonte[chave];

        return item && item.confirmado === true ? item : null;
    }

    /* ---------- escolha aleatória do destaque (estável no ciclo) ---------- */

    function garantirDestaque(ids) {
        if (ids.includes(estado.hotId)) return;

        estado.hotId = ids[sorteio(ids.length)];

        if (!estado.hotIds.includes(estado.hotId)) {
            estado.hotIds.push(estado.hotId);
        }

        estado.hotIds = estado.hotIds.slice(-60);

        salvarEstado();
    }

    /* ---------- montagem dos cartões ---------- */

    function montarCartao(inicio, tipo, agora) {
        const fim = inicio + SLOT_MS;
        const destaque = tipo === "proximo"
            ? inicio === estado.hotId
            : estado.hotIds.includes(inicio);

        const historico = calcularHistorico(inicio)
            .map(hora => `<b>${hora}</b>`)
            .join(" · ");

        const rotulo = destaque
            ? `<span class="hr-label">${ICON_FOGO_PEQUENO} MUITO QUENTE</span>`   // <<< CORRIGIDO
            : "";

        let tags = "";

        if (tipo === "proximo") {
            const emAndamento = agora >= inicio;

            tags = `
                <span class="hr-tag ${destaque ? "hr-tag-gray" : "hr-tag-ok"}">${emAndamento ? "EM ANDAMENTO" : "PRÓXIMO"}</span>
                <span class="hr-tag hr-tag-gray hr-count" data-inicio="${inicio}">--:--</span>
            `;
        } else {
            const resultado = obterResultado(inicio);

            if (resultado) {
                tags = `
                    <span class="hr-tag hr-tag-ok">TRIPLO! ✓</span>
                    <span class="hr-tag hr-tag-gray">${Number(resultado.vezes) || 1}× NAS 3H</span>
                `;
            } else {
                tags = `<span class="hr-tag hr-tag-gray">Triplo ✓</span>`;   // <<< CORRIGIDO
            }
        }

        return `
            <div class="hr-card ${destaque ? "hot" : ""}" data-id="${inicio}">
                <div class="hr-icon">${destaque ? ICON_FOGO : ICON_RELOGIO}</div>
                <div class="hr-main">
                    <div class="hr-time">${formatarHora(inicio)} - ${formatarHora(fim)}</div>
                    ${rotulo}
                    <div class="hr-history">Histórico: ${historico}</div>
                </div>
                <div class="hr-tags">${tags}</div>
            </div>
        `;
    }

    /* ---------- renderização ---------- */

    function renderizar(agora) {
        const primeiro = inicioDoSlot(agora);

        const proximos = [];
        for (let i = 0; i < QTD_PROXIMOS; i++) {
            proximos.push(primeiro + i * SLOT_MS);
        }

        const encerrados = [];
        for (let i = 1; i <= QTD_ENCERRADOS; i++) {
            encerrados.push(primeiro - i * SLOT_MS);
        }

        garantirDestaque(proximos);

        // Marca como destaque no histórico os que já foram sorteados
        const assinatura = primeiro + "|" + estado.hotId + "|" + estado.hotIds.join(",");

        if (assinatura === assinaturaAtual) return;

        assinaturaAtual = assinatura;

        elProximos.innerHTML = proximos
            .map(inicio => montarCartao(inicio, "proximo", agora))
            .join("");

        const htmlEncerrados = encerrados
            .map(inicio => montarCartao(inicio, "encerrado", agora))
            .join("");

        elEncerrados.innerHTML =
            htmlEncerrados || '<div class="hr-empty">Nenhum horário encerrado ainda.</div>';
    }

    /* ---------- atualização a cada segundo ---------- */

    function atualizarContagens(agora) {
        elProximos.querySelectorAll(".hr-count").forEach(el => {
            const inicio = Number(el.dataset.inicio);
            const fim = inicio + SLOT_MS;

            if (agora < inicio) {
                el.textContent = "começa em " + formatarContagem(inicio - agora);
            } else {
                el.textContent = "termina em " + formatarContagem(fim - agora);
            }
        });
    }

    /* ---------- bloqueio até abrir uma URL ---------- */   // <<< NOVO

    const elBloqueio = document.getElementById("horariosBloqueio");   // <<< NOVO

    function aplicarBloqueio() {   // <<< NOVO
        if (!elBloqueio) return;

        const liberado = typeof navigationReady !== "undefined" && navigationReady === true;

        elBloqueio.classList.toggle("bloqueado", !liberado);
    }

    window.aplicarBloqueioHorarios = aplicarBloqueio;   // <<< NOVO

    function tick() {
        const agora = Date.now();

        aplicarBloqueio();   // <<< NOVO

        if (elRelogio) {
            elRelogio.textContent = formatarHoraCompleta(agora);
        }

        renderizar(agora);
        atualizarContagens(agora);
    }

    tick();

    setInterval(tick, 1000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) tick();
    });

})();
/* ==========================================
   ALÇA LATERAL: ARRASTAR PARA ROLAR A PÁGINA
========================================== */

(function () {

    const handle = document.getElementById("iframeDragHandle");

    if (!handle) return;

    let arrastando = false;
    let ultimoY = 0;

    handle.addEventListener("pointerdown", (event) => {
        arrastando = true;
        ultimoY = event.clientY;

        handle.setPointerCapture(event.pointerId);
        handle.classList.add("dragging");

        // o CSS tem scroll-behavior: smooth, que atrasaria o movimento
        document.documentElement.style.scrollBehavior = "auto";

        event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
        if (!arrastando) return;

        const diferenca = ultimoY - event.clientY;

        ultimoY = event.clientY;

        // dedo sobe, página sobe; dedo desce, página desce
        window.scrollBy(0, diferenca);

        event.preventDefault();
    });

    function terminar(event) {
        if (!arrastando) return;

        arrastando = false;

        handle.classList.remove("dragging");

        document.documentElement.style.scrollBehavior = "";

        try {
            handle.releasePointerCapture(event.pointerId);
        } catch {}
    }

    handle.addEventListener("pointerup", terminar);
    handle.addEventListener("pointercancel", terminar);

})();

/* ==========================================
   GO PLAY — GESTÃO QIA
   CONTROLE FINANCEIRO PESSOAL
========================================== */

(() => {
    "use strict";

    const STORAGE_KEY = "goplay_qia_personal_finance_v1";

    const defaultState = {
        initialBalance: 0,
        goal: 0,
        days: 30,
        transactions: []
    };

    let state = loadState();
    let editingId = null;

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!saved || !Array.isArray(saved.transactions)) {
                return structuredClone(defaultState);
            }

            return {
                ...defaultState,
                ...saved,
                transactions: saved.transactions
            };
        } catch {
            return structuredClone(defaultState);
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function money(value) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function today() {
        const date = new Date();
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000)
            .toISOString().slice(0, 10);
    }

    function notify(message) {
        let notice = document.querySelector(".qia-notice");

        if (!notice) {
            notice = document.createElement("div");
            notice.className = "qia-notice";
            document.body.appendChild(notice);
        }

        notice.textContent = message;
        notice.classList.add("show");

        clearTimeout(notify.timer);
        notify.timer = setTimeout(() => {
            notice.classList.remove("show");
        }, 2800);
    }

    function transactionsSorted() {
        return [...state.transactions].sort((a, b) =>
            a.date.localeCompare(b.date) || a.createdAt - b.createdAt
        );
    }

    function calculateBalance() {
        return state.transactions.reduce((balance, item) => {
            return balance + (item.type === "income" ? item.amount : -item.amount);
        }, Number(state.initialBalance || 0));
    }

    function totals() {
        const income = state.transactions
            .filter(item => item.type === "income")
            .reduce((sum, item) => sum + item.amount, 0);

        const expenses = state.transactions
            .filter(item => item.type === "expense")
            .reduce((sum, item) => sum + item.amount, 0);

        return {
            income,
            expenses,
            balance: calculateBalance()
        };
    }

    function openPanel() {
        document.querySelector(".qia-overlay")?.classList.add("active");
        render();
    }

    function closePanel() {
        document.querySelector(".qia-overlay")?.classList.remove("active");
    }

    function createInterface() {
        if (document.querySelector(".qia-overlay")) return;

        const launcher = document.createElement("button");
        launcher.className = "qia-launcher";
        launcher.type = "button";
        launcher.textContent = "GESTÃO COM IA";
        launcher.addEventListener("click", openPanel);

        const overlay = document.createElement("div");
        overlay.className = "qia-overlay";

        overlay.innerHTML = `
            <main class="qia-panel" role="dialog" aria-modal="true"
                aria-label="Gestão financeira com IA">

                <header class="qia-header">
                    <div>
                        <h2>GESTÃO <span style="color:#8b78ff">COM IA</span></h2>
                        <p>Seu controle financeiro pessoal</p>
                    </div>
                    <button class="qia-close" type="button"
                        aria-label="Fechar">×</button>
                </header>

                <section class="qia-grid" id="qia-summary"></section>

                <section class="qia-section">
                    <h3>Configuração financeira</h3>
                    <div class="qia-form-grid">
                        <div class="qia-field">
                            <label for="qia-initial">Saldo inicial (R$)</label>
                            <input id="qia-initial" type="number"
                                min="0" step="0.01" placeholder="0,00">
                        </div>
                        <div class="qia-field">
                            <label for="qia-goal">Meta financeira (R$)</label>
                            <input id="qia-goal" type="number"
                                min="0" step="0.01" placeholder="0,00">
                        </div>
                        <div class="qia-field">
                            <label for="qia-days">Período (dias)</label>
                            <input id="qia-days" type="number"
                                min="1" max="3650" step="1">
                        </div>
                    </div>
                    <div class="qia-actions">
                        <button class="qia-btn" id="qia-save-config">
                            Salvar configurações
                        </button>
                    </div>
                </section>

                <section class="qia-section">
                    <h3>Progresso da meta</h3>
                    <div style="display:flex;justify-content:space-between;gap:10px">
                        <span id="qia-goal-label">0% concluído</span>
                        <strong id="qia-goal-value">R$ 0,00</strong>
                    </div>
                    <div class="qia-progress">
                        <div id="qia-goal-bar"></div>
                    </div>
                </section>

                <section class="qia-section">
                    <h3>Registrar movimentação</h3>
                    <form id="qia-transaction-form">
                        <div class="qia-form-grid">
                            <div class="qia-field">
                                <label for="qia-type">Tipo</label>
                                <select id="qia-type" required>
                                    <option value="income">Entrada</option>
                                    <option value="expense">Saída</option>
                                </select>
                            </div>
                            <div class="qia-field">
                                <label for="qia-description">Descrição</label>
                                <input id="qia-description" maxlength="80"
                                    placeholder="Ex.: salário, compra..." required>
                            </div>
                            <div class="qia-field">
                                <label for="qia-amount">Valor (R$)</label>
                                <input id="qia-amount" type="number"
                                    min="0.01" step="0.01" required
                                    placeholder="0,00">
                            </div>
                            <div class="qia-field">
                                <label for="qia-date">Data</label>
                                <input id="qia-date" type="date" required>
                            </div>
                        </div>
                        <div class="qia-actions">
                            <button class="qia-btn" id="qia-submit" type="submit">
                                Registrar movimentação
                            </button>
                            <button class="qia-btn secondary qia-hidden"
                                id="qia-cancel-edit" type="button">
                                Cancelar edição
                            </button>
                        </div>
                    </form>
                </section>

                <section class="qia-section">
                    <h3>Evolução financeira</h3>
                    <div class="qia-chart" id="qia-chart"></div>
                </section>

                <section class="qia-section">
                    <h3>Histórico de movimentações</h3>
                    <div class="qia-table-wrap">
                        <table class="qia-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Descrição</th>
                                    <th>Tipo</th>
                                    <th>Valor</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="qia-history"></tbody>
                        </table>
                    </div>
                </section>

                <section class="qia-section">
                    <h3>Backup e relatórios</h3>
                    <div class="qia-actions">
                        <button class="qia-btn secondary" id="qia-export-json">
                            Exportar backup JSON
                        </button>
                        <button class="qia-btn secondary" id="qia-import-json">
                            Importar backup JSON
                        </button>
                        <button class="qia-btn secondary" id="qia-export-csv">
                            Exportar CSV
                        </button>
                        <input type="file" id="qia-file" accept=".json,application/json"
                            class="qia-hidden">
                    </div>
                </section>
            </main>
        `;

        document.body.append(launcher, overlay);

        overlay.querySelector(".qia-close").addEventListener("click", closePanel);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) closePanel();
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closePanel();
        });

        document.getElementById("qia-save-config")
            .addEventListener("click", saveConfig);

        document.getElementById("qia-transaction-form")
            .addEventListener("submit", saveTransaction);

        document.getElementById("qia-cancel-edit")
            .addEventListener("click", resetForm);

        document.getElementById("qia-export-json")
            .addEventListener("click", exportJSON);

        document.getElementById("qia-import-json")
            .addEventListener("click", () =>
                document.getElementById("qia-file").click()
            );

        document.getElementById("qia-file")
            .addEventListener("change", importJSON);

        document.getElementById("qia-export-csv")
            .addEventListener("click", exportCSV);

        document.getElementById("qia-date").value = today();

        render();
    }

    function saveConfig() {
        const initial = Number(document.getElementById("qia-initial").value);
        const goal = Number(document.getElementById("qia-goal").value);
        const days = Number(document.getElementById("qia-days").value);

        if (!Number.isFinite(initial) || initial < 0 ||
            !Number.isFinite(goal) || goal < 0 ||
            !Number.isInteger(days) || days < 1 || days > 3650) {
            notify("Confira os valores informados.");
            return;
        }

        state.initialBalance = initial;
        state.goal = goal;
        state.days = days;

        saveState();
        render();
        notify("Configurações salvas.");
    }

    function saveTransaction(event) {
        event.preventDefault();

        const type = document.getElementById("qia-type").value;
        const description = document.getElementById("qia-description")
            .value.trim();
        const amount = Number(document.getElementById("qia-amount").value);
        const date = document.getElementById("qia-date").value;

        if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
            notify("Preencha todos os campos corretamente.");
            return;
        }

        if (editingId !== null) {
            const index = state.transactions.findIndex(item => item.id === editingId);
            if (index !== -1) {
                state.transactions[index] = {
                    ...state.transactions[index],
                    type,
                    description,
                    amount,
                    date
                };
            }
            notify("Movimentação atualizada.");
        } else {
            state.transactions.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type,
                description,
                amount,
                date,
                createdAt: Date.now()
            });
            notify("Movimentação registrada.");
        }

        saveState();
        resetForm();
        render();
    }

    function editTransaction(id) {
        const item = state.transactions.find(transaction => transaction.id === id);
        if (!item) return;

        editingId = id;

        document.getElementById("qia-type").value = item.type;
        document.getElementById("qia-description").value = item.description;
        document.getElementById("qia-amount").value = item.amount;
        document.getElementById("qia-date").value = item.date;

        document.getElementById("qia-submit").textContent = "Salvar alterações";
        document.getElementById("qia-cancel-edit").classList.remove("qia-hidden");

        document.getElementById("qia-transaction-form")
            .scrollIntoView({ behavior: "smooth", block: "center" });
    }

/* ==========================================
   MODAL PROFISSIONAL DE CONFIRMAÇÃO
========================================== */

function qiaConfirm(message, title = "Confirmar ação") {
    return new Promise(resolve => {
        const oldModal = document.querySelector(".qia-confirm-overlay");
        if (oldModal) oldModal.remove();

        const overlay = document.createElement("div");
        overlay.className = "qia-confirm-overlay";

        overlay.innerHTML = `
            <div class="qia-confirm-modal" role="dialog"
                aria-modal="true" aria-labelledby="qia-confirm-title">

                <div class="qia-confirm-icon">!</div>

                <h3 id="qia-confirm-title"></h3>
                <p class="qia-confirm-message"></p>

                <div class="qia-confirm-actions">
                    <button type="button" class="qia-confirm-cancel">
                        Cancelar
                    </button>
                    <button type="button" class="qia-confirm-accept">
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        overlay.querySelector("h3").textContent = title;
        overlay.querySelector(".qia-confirm-message").textContent = message;

        document.body.appendChild(overlay);

        const finish = result => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector(".qia-confirm-cancel")
            .addEventListener("click", () => finish(false));

        overlay.querySelector(".qia-confirm-accept")
            .addEventListener("click", () => finish(true));

        overlay.addEventListener("click", event => {
            if (event.target === overlay) finish(false);
        });

        const escapeHandler = event => {
            if (event.key === "Escape") {
                document.removeEventListener("keydown", escapeHandler);
                finish(false);
            }
        };

        document.addEventListener("keydown", escapeHandler);

        overlay.querySelector(".qia-confirm-cancel").focus();
    });
}


    
async function deleteTransaction(id) {
    const item = state.transactions.find(transaction => transaction.id === id);

    if (!item) return;

    
const confirmed = await qiaConfirm(
    "Os dados atuais serão substituídos pelo conteúdo do backup selecionado.",
    "Importar backup"
);

if (!confirmed) return;


    if (!confirmed) return;

    state.transactions = state.transactions.filter(
        transaction => transaction.id !== id
    );

    saveState();
    render();
    notify("Movimentação excluída com sucesso.");
}


    function resetForm() {
        editingId = null;

        const form = document.getElementById("qia-transaction-form");
        form.reset();

        document.getElementById("qia-date").value = today();
        document.getElementById("qia-submit").textContent =
            "Registrar movimentação";

        document.getElementById("qia-cancel-edit")
            .classList.add("qia-hidden");
    }

    function renderSummary() {
        const data = totals();

        document.getElementById("qia-summary").innerHTML = `
            <article class="qia-card">
                <span>Saldo atual</span>
                <strong>${money(data.balance)}</strong>
                <small>Saldo inicial + movimentações</small>
            </article>
            <article class="qia-card">
                <span>Total de entradas</span>
                <strong class="qia-positive">${money(data.income)}</strong>
                <small>Entradas registradas</small>
            </article>
            <article class="qia-card">
                <span>Total de saídas</span>
                <strong class="qia-negative">${money(data.expenses)}</strong>
                <small>Saídas registradas</small>
            </article>
            <article class="qia-card">
                <span>Meta financeira</span>
                <strong>${money(state.goal)}</strong>
                <small>Objetivo definido</small>
            </article>
        `;

        const progress = state.goal > 0
            ? Math.max(0, Math.min(100, data.balance / state.goal * 100))
            : 0;

        document.getElementById("qia-goal-label").textContent =
            `${progress.toFixed(1).replace(".", ",")}% concluído`;

        document.getElementById("qia-goal-value").textContent =
            money(data.balance);

        document.getElementById("qia-goal-bar").style.width = `${progress}%`;
    }

    function renderHistory() {
        const tbody = document.getElementById("qia-history");
        const items = [...state.transactions].sort((a, b) =>
            b.date.localeCompare(a.date) || b.createdAt - a.createdAt
        );

        if (!items.length) {
            tbody.innerHTML = `
                <tr><td colspan="5" class="qia-empty">
                    Nenhuma movimentação registrada.
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>${escapeHTML(item.description)}</td>
                <td>${item.type === "income" ? "Entrada" : "Saída"}</td>
                <td class="${item.type === "income" ? "qia-positive" : "qia-negative"}">
                    ${item.type === "income" ? "+" : "−"} ${money(item.amount)}
                </td>
                <td>
                    <div class="qia-row-actions">
                        <button type="button" data-edit="${escapeHTML(item.id)}">
                            Editar
                        </button>
                        <button type="button" data-delete="${escapeHTML(item.id)}">
                            Excluir
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

        tbody.querySelectorAll("[data-edit]").forEach(button => {
            button.addEventListener("click", () =>
                editTransaction(button.dataset.edit)
            );
        });

        tbody.querySelectorAll("[data-delete]").forEach(button => {
            button.addEventListener("click", () =>
                deleteTransaction(button.dataset.delete)
            );
        });
    }

    function renderChart() {
        const container = document.getElementById("qia-chart");
        const items = transactionsSorted();

        const daily = new Map();
        let balance = Number(state.initialBalance || 0);

        daily.set("Saldo inicial", balance);

        items.forEach(item => {
            balance += item.type === "income" ? item.amount : -item.amount;
            daily.set(item.date, balance);
        });

        const values = [...daily.values()];

        if (values.length < 2) {
            container.innerHTML = `
                <div class="qia-chart-empty">
                    Registre movimentações para visualizar sua evolução financeira.
                </div>
            `;
            return;
        }

        const width = 900;
        const height = 210;
        const padding = 25;

        let min = Math.min(...values, 0);
        let max = Math.max(...values, 0);

        if (min === max) max = min + 1;

        const range = max - min;
        const points = values.map((value, index) => {
            const x = padding + index *
                (width - padding * 2) / (values.length - 1);

            const y = height - padding -
                ((value - min) / range) * (height - padding * 2);

            return `${x},${y}`;
        });

        const polyline = points.join(" ");

        container.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" role="img"
                aria-label="Gráfico da evolução do saldo">
                <line x1="${padding}" y1="${height - padding}"
                    x2="${width - padding}" y2="${height - padding}"
                    stroke="#29362d" stroke-width="1"/>
                <polyline points="${polyline}" fill="none"
                    stroke="#8b78ff" stroke-width="3"
                    stroke-linecap="round" stroke-linejoin="round"/>
                ${points.map(point => {
                    const [x, y] = point.split(",");
                    return `<circle cx="${x}" cy="${y}" r="4"
                        fill="#8b78ff" stroke="#030906" stroke-width="2"/>`;
                }).join("")}
            </svg>
        `;
    }

    function render() {
        if (!document.querySelector(".qia-overlay")) return;

        document.getElementById("qia-initial").value = state.initialBalance;
        document.getElementById("qia-goal").value = state.goal;
        document.getElementById("qia-days").value = state.days;

        renderSummary();
        renderHistory();
        renderChart();
    }

    function downloadFile(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportJSON() {
        downloadFile(
            "goplay-qia-backup.json",
            JSON.stringify(state, null, 2),
            "application/json"
        );
        notify("Backup exportado.");
    }

    function importJSON(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);

                if (
                    !imported ||
                    !Array.isArray(imported.transactions) ||
                    !Number.isFinite(Number(imported.initialBalance)) ||
                    !Number.isFinite(Number(imported.goal)) ||
                    !Number.isFinite(Number(imported.days)) ||
                    imported.transactions.some(item =>
                        !item ||
                        !["income", "expense"].includes(item.type) ||
                        !Number.isFinite(Number(item.amount)) ||
                        Number(item.amount) <= 0 ||
                        typeof item.description !== "string" ||
                        !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
                    )
                ) {
                    throw new Error("Arquivo inválido.");
                }

                if (!confirm("Deseja substituir seus dados pelo backup selecionado?")) {
                    return;
                }

                state = {
                    initialBalance: Number(imported.initialBalance),
                    goal: Number(imported.goal),
                    days: Number(imported.days),
                    transactions: imported.transactions.map(item => ({
                        ...item,
                        amount: Number(item.amount),
                        id: String(item.id || `${Date.now()}-${Math.random()}`),
                        createdAt: Number(item.createdAt) || Date.now()
                    }))
                };

                saveState();
                resetForm();
                render();
                notify("Backup importado com sucesso.");
            } catch {
                notify("Não foi possível importar esse arquivo.");
            } finally {
                event.target.value = "";
            }
        };

        reader.readAsText(file);
    }

    function exportCSV() {
        const rows = [
            ["Data", "Descrição", "Tipo", "Valor"],
            ...transactionsSorted().map(item => [
                item.date,
                item.description,
                item.type === "income" ? "Entrada" : "Saída",
                item.amount.toFixed(2).replace(".", ",")
            ])
        ];

        const csv = "\uFEFF" + rows.map(row =>
            row.map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(";")
        ).join("\n");

        downloadFile("goplay-qia-relatorio.csv", csv, "text/csv;charset=utf-8");
        notify("Relatório CSV exportado.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createInterface);
    } else {
        createInterface();
    }

})();
