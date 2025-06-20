// ==UserScript==
// @name         GPT-Bot-BR
// @namespace    https://grepolis.com
// @version      1.2
// @description  Bot para automações do Grepolis.
// @author       Alexandre458
// @match        https://*.grepolis.com/game/*
// @match        http://*.grepolis.com/game/*
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.js
// @downloadURL  https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.js
// @connect      script.gptbotbr.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// ==/UserScript==

window.addEventListener('load', () => {
    (async function() {
        'use strict';
        const API_URL = 'https://script.gptbotbr.com';
        const LS_KEY = 'painel_grepolis_auth';
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');

        if (!saved.usuario || !saved.senha || !saved.fingerprint) {
            criarTelaLogin();
        } else {
            autenticar(saved);
        }

        function getNicknameAtual() {
            var uw;
            if (typeof unsafeWindow == 'undefined') {
                uw = window;
            } else {
                uw = unsafeWindow;
            }
            return uw?.Game?.player_name || '';
        }



        function criarTelaLogin() {
            const container = document.createElement('div');
            container.innerHTML = `
        <div id="painel_login" style="position:fixed;top:30%;left:50%;transform:translateX(-50%);
        background:#1e1e1e;padding:20px;border-radius:10px;z-index:999999;
        color:white;font-family:Arial,sans-serif;box-shadow:0 0 15px rgba(0,0,0,0.5);min-width:300px;">
          <h3 style="text-align:center;margin-bottom:10px;">Login Painel Grepolis</h3>
          <input id="login_user" placeholder="Usuário" style="margin:5px 0;width:100%;padding:5px;" />
          <input id="login_pass" placeholder="Senha" type="password" style="margin:5px 0;width:100%;padding:5px;" />
          <button id="login_btn" style="width:100%;padding:8px;background:#2ecc71;color:white;border:none;border-radius:5px;margin-top:10px;cursor:pointer;">
            Entrar
          </button>
        </div>
      `;
            document.body.appendChild(container);

            document.getElementById('login_btn').onclick = async () => {
                const usuario = document.getElementById('login_user').value.trim();
                const senha = document.getElementById('login_pass').value.trim();
                const nickname = getNicknameAtual();

                if (!usuario || !senha || !nickname) {
                    return alert('Preencha usuario, senha e nickname');
                }

                const fingerprint = gerarFingerprint();

                const res = await fetch(`${API_URL}/api/validar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Grepolis-Script': '1'
                    },
                    body: JSON.stringify({
                        usuario,
                        senha,
                        fingerprint,
                        nickname,
                        user_agent: navigator.userAgent,
                        platform: navigator.platform,
                        screen: `${screen.width}x${screen.height}`
                    })
                });

                const data = await res.json();
                if (!data.status) {
                    const erro = data.msg || data.erro || JSON.stringify(data);
                    return alert(erro);
                }


                localStorage.setItem(LS_KEY, JSON.stringify({
                    usuario,
                    senha,
                    fingerprint
                }));
                localStorage.setItem('grepolis_token', data.token);

                document.getElementById('painel_login').remove();
                carregarPainel(data.script, data.token);
                checarAtualizacao();
            };
        }

        async function autenticar({
            usuario,
            senha,
            fingerprint
        }) {
            try {
                const res = await fetch(`${API_URL}/api/validar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Grepolis-Script': '1'
                    },
                    body: JSON.stringify({
                        usuario,
                        senha,
                        fingerprint,
                        nickname: getNicknameAtual(),
                        user_agent: navigator.userAgent,
                        platform: navigator.platform,
                        screen: `${screen.width}x${screen.height}`
                    })
                });

                const data = await res.json();
                if (!data.status) {
                    localStorage.removeItem(LS_KEY);
                    return criarTelaLogin();
                }

                localStorage.setItem('grepolis_token', data.token);
                carregarPainel(data.script, data.token);
                checarAtualizacao();
            } catch (e) {
                console.error(e);
                alert('Erro ao autenticar automaticamente');
                criarTelaLogin();
            }
        }

        function gerarFingerprint() {
            return btoa(`${navigator.userAgent}_${navigator.platform}_${screen.width}x${screen.height}`);
        }

        async function carregarPainel(script, token) {
            try {
                const r = await fetch(`${API_URL}/script/${script}?t=${Date.now()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Grepolis-Script': '1'
                    }
                });

                const {
                    script: encrypted,
                    hash,
                    iv
                } = await r.json();
                secureInjectDecryptAndRun(encrypted, iv, hash, token);
            } catch (e) {
                console.error(e);
                alert('Erro ao carregar script remoto');
            }
        }

        function secureInjectDecryptAndRun(encrypted, iv, hash, token) {
            try {
                const key = CryptoJS.SHA256(token);
                const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                    iv: CryptoJS.enc.Base64.parse(iv),
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });

                const code = decrypted.toString(CryptoJS.enc.Utf8);
                const computedHash = CryptoJS.SHA256(code).toString();

                if (computedHash !== hash) {
                    alert("⚠️ Script corrompido");
                    return;
                }

                const scriptTag = document.createElement('script');
                scriptTag.textContent = code;
                document.documentElement.appendChild(scriptTag);
            } catch (e) {
                console.error(e);
                alert("Erro ao desencriptar ou validar hash do script.");
            }
        }

        async function checarAtualizacao() {
            const VERSAO_ATUAL = "1.2";
            try {
                const raw = await fetch("https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.js");
                const texto = await raw.text();
                const regex = /@version\s+([^\n]+)/;
                const match = texto.match(regex);
                if (!match) return;

                const versaoRemota = match[1].trim();
                if (versaoRemota !== VERSAO_ATUAL) {
                    if (confirm(`🆕 Nova versão disponível: ${versaoRemota}\nDeseja atualizar agora?`)) {
                        window.open("https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.js", "_blank");
                    }
                } else {
                    console.log("✅ Script está atualizado.");
                }
            } catch (e) {
                console.warn("⚠️ Erro ao verificar atualização:", e);
            }
        }
    })();
});