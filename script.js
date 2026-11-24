
"use strict";

/* ==========================================
   CONFIGURAÇÕES
========================================== */

const CONFIG = {
    scannerDuration: 7000,
    colorCooldown: 10000,
    doublesCooldown: 15000,

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

const cooldownTimers = new WeakMap();

/* ==========================================
   FUNÇÕES AUXILIARES
========================================== */

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function startCooldown(button, duration, originalText, isRunning) {
    if (!button) return;

    const previousTimer = cooldownTimers.get(button);

    if (previousTimer) {
        clearTimeout(previousTimer);
    }

    const deadline = Date.now() + duration;

    button.disabled = true;

    function updateCooldown() {
        const remaining = Math.max(0, deadline - Date.now());

        if (remaining <= 0) {
            button.disabled = false;
            button.innerHTML = originalText;
            cooldownTimers.delete(button);
            return;
        }

        if (isRunning()) {
            button.innerHTML = "ϟ ANALISANDO...";
        } else {
            const seconds = Math.ceil(remaining / 1000);
            button.innerHTML = `ϟ AGUARDE ${seconds}s`;
        }

        const timer = setTimeout(updateCooldown, 200);
        cooldownTimers.set(button, timer);
    }

    updateCooldown();
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

async function generateColorDemo() {
    if (colorRunning) return;

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

    startCooldown(
        colorButton,
        CONFIG.colorCooldown,
        "ϟ GERAR ANÁLISE",
        () => colorRunning
    );

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
   EFEITO VISUAL DO SCANNER NOS DADOS
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
   ANÁLISE DEMONSTRATIVA DOS DUPLOS
========================================== */

async function generateDoublesDemo() {
    if (doublesRunning) return;

    if (!doublesButton || !diceArea || !doublesSummary) {
        console.error("Elementos dos duplos não encontrados.");
        return;
    }

    doublesRunning = true;

    startCooldown(
        doublesButton,
        CONFIG.doublesCooldown,
        "ϟ GERAR ANÁLISE DE DUPLOS",
        () => doublesRunning
    );

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
    }
}

doublesButton?.addEventListener(
    "click",
    generateDoublesDemo
);

/* ==========================================
   CENTRAL DE NAVEGAÇÃO / IFRAME
========================================== */

urlForm?.addEventListener("submit", event => {
    event.preventDefault();

    let address = urlInput?.value.trim();

    if (!address) return;

    try {
        if (!/^https?:\/\//i.test(address)) {
            address = "https://" + address;
        }

        const parsed = new URL(address);

        if (
            parsed.protocol !== "https:" &&
            parsed.protocol !== "http:"
        ) {
            throw new Error("Endereço inválido.");
        }

        if (!siteFrame) {
            throw new Error("Iframe não encontrado.");
        }

        siteFrame.src = parsed.href;
        siteFrame.style.display = "block";

        if (iframePlaceholder) {
            iframePlaceholder.style.display = "none";
        }

    } catch (error) {
        console.error("Erro no endereço:", error);
        alert("Digite um endereço válido.");
    }
});

/* ==========================================
   INICIALIZAÇÃO
========================================== */

resetDice();

console.log("MEGA SIC - Interface inicializada.");
