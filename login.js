
"use strict";

/* =====================================
   CONFIGURAÇÕES
===================================== */

const USERS_KEY = "goplay_users";
const SESSION_KEY = "goplay_session";

/* =====================================
   ELEMENTOS
===================================== */

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");

const loginTab = document.querySelector("#loginTab");
const registerTab = document.querySelector("#registerTab");

const createAccountLink = document.querySelector("#createAccountLink");
const backToLogin = document.querySelector("#backToLogin");

const loginMessage = document.querySelector("#message");
const registerMessage = document.querySelector("#registerMessage");

/* =====================================
   USUÁRIOS
===================================== */

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        return [];
    }
}

/* =====================================
   MENSAGENS
===================================== */

function showMessage(element, text, error = false) {
    if (!element) return;

    element.textContent = text;
    element.classList.toggle("error", error);
}

/* =====================================
   ALTERNAR LOGIN / CADASTRO
===================================== */

function switchTab(register) {
    loginForm.classList.toggle("hidden", register);
    registerForm.classList.toggle("hidden", !register);

    loginTab.classList.toggle("active", !register);
    registerTab.classList.toggle("active", register);

    showMessage(loginMessage, "");
    showMessage(registerMessage, "");
}

loginTab.addEventListener("click", () => {
    switchTab(false);
});

registerTab.addEventListener("click", () => {
    switchTab(true);
});

createAccountLink.addEventListener("click", () => {
    switchTab(true);
});

backToLogin.addEventListener("click", () => {
    switchTab(false);
});

/* =====================================
   PROTEÇÃO DA SENHA
===================================== */

async function hashPassword(password) {
    if (!window.crypto?.subtle) {
        throw new Error("Recurso de segurança indisponível neste navegador.");
    }

    const data = new TextEncoder().encode(password);

    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

/* =====================================
   CADASTRO
===================================== */

registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const username = document.querySelector("#registerUser")
        .value.trim().toLowerCase();

    const password = document.querySelector("#registerPassword").value;
    const confirmation = document.querySelector("#confirmPassword").value;

    if (username.length < 3) {
        return showMessage(
            registerMessage,
            "O usuário precisa ter pelo menos 3 caracteres.",
            true
        );
    }

    if (password.length < 6) {
        return showMessage(
            registerMessage,
            "A senha precisa ter pelo menos 6 caracteres.",
            true
        );
    }

    if (password !== confirmation) {
        return showMessage(
            registerMessage,
            "As senhas não são iguais.",
            true
        );
    }

    const users = getUsers();

    if (users.some(user => user.username === username)) {
        return showMessage(
            registerMessage,
            "Este usuário já está cadastrado.",
            true
        );
    }

    try {
        const passwordHash = await hashPassword(password);

        users.push({
            username,
            passwordHash
        });

        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        registerForm.reset();

        switchTab(false);

        showMessage(
            loginMessage,
            "Conta criada com sucesso! Agora você pode entrar."
        );

    } catch (error) {
        console.error("Erro no cadastro:", error);

        showMessage(
            registerMessage,
            "Não foi possível criar a conta neste navegador.",
            true
        );
    }
});

/* =====================================
   LOGIN
===================================== */

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const username = document.querySelector("#loginUser")
        .value.trim().toLowerCase();

    const password = document.querySelector("#loginPassword").value;

    const users = getUsers();

    const user = users.find(item => item.username === username);

    if (!user) {
        return showMessage(
            loginMessage,
            "Usuário ou senha incorretos.",
            true
        );
    }

    try {
        const passwordHash = await hashPassword(password);

        if (passwordHash !== user.passwordHash) {
            return showMessage(
                loginMessage,
                "Usuário ou senha incorretos.",
                true
            );
        }

        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                username,
                loggedAt: Date.now()
            })
        );

        showMessage(loginMessage, "Acesso autorizado. Entrando...");

        window.location.href = "painel.html";

    } catch (error) {
        console.error("Erro no login:", error);

        showMessage(
            loginMessage,
            "Não foi possível realizar o login.",
            true
        );
    }
});
