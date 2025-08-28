// ==UserScript==
// @name         GPT-Bot-BR
// @namespace    https://grepolis.com
// @version      1.4.1
// @description  Bot para automações do Grepolis.
// @author       Alexandre458
// @match        https://*.grepolis.com/game/*
// @match        http://*.grepolis.com/game/*
// @grant        GM_xmlhttpRequest
// @connect      https://script.gptbotbr.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @downloadURL  https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.user.js
// @updateURL    https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.user.js
// ==/UserScript==

window.addEventListener('load', () => {
  (async function () {
    'use strict';

    const AUTH_FAIL_RELOAD_MS = 30000;
    const WHATSAPP_LINK = 'https://wa.me/558195608212';
    const INSTALL_URL   = 'https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.user.js';

    checarAtualizacao();

    // --------- API ---------
    // const API_URL = 'http://localhost:3001';
    const API_URL = 'https://script.gptbotbr.com';
    const LS_KEY  = 'painel_grepolis_auth';

    // ---------- Utils ----------
    async function fetchWithTimeout(url, opts = {}, ms = 15000) {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), ms);
      try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
      finally { clearTimeout(id); }
    }

    function injectCode(code, id = 'gptbotbr-painel') {
      if (document.getElementById(id)) { console.warn('[Painel] já injetado:', id); return; }
      const s = document.createElement('script');
      s.id = id; s.type = 'text/javascript'; s.textContent = code;
      (document.head || document.documentElement).appendChild(s);
      console.log('[Painel] injetado via <script>, len=', code.length);
    }

    function getNicknameAtual() {
      const uw = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
      return uw?.Game?.player_name || '';
    }
    function gerarFingerprint() {
      return btoa(`${navigator.userAgent}_${navigator.platform}_${screen.width}x${screen.height}`);
    }

    // --- Mojibake fix (heurístico e seguro) ---
    const PT_ACCENTS = /[áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/g;
    const BAD_SIGNS  = /(Ã|Â|ÿ|�)/g;

    function tryDecodeBytes(str, label) {
      try {
        const bytes = Uint8Array.from([...str].map(ch => ch.charCodeAt(0) & 0xFF));
        return new TextDecoder(label).decode(bytes);
      } catch { return null; }
    }
    function scoreText(t) {
      if (!t) return -1e9;
      let score = 0;
      const good = t.match(PT_ACCENTS)?.length || 0;
      const bad  = t.match(BAD_SIGNS)?.length || 0;
      score += good * 3 - bad * 4;
      // bônus se contém palavras comuns
      if (/usu[aá]rio|licen[cç]a|senha|inv[aá]lida|expirada|nickname/i.test(t)) score += 2;
      return score;
    }
    function repairMojibake(s) {
      if (s == null) return s;
      const original = String(s);

      // candidatos
      const candidates = new Set([original]);
      // bytes -> utf-8 (corrige "jÃ¡")
      const asUtf8 = tryDecodeBytes(original, 'utf-8');       if (asUtf8) candidates.add(asUtf8);
      // bytes -> windows-1252 / latin1 (alguns backends)
      const as1252 = tryDecodeBytes(original, 'windows-1252');if (as1252) candidates.add(as1252);
      const asLatin= tryDecodeBytes(original, 'iso-8859-1');  if (asLatin) candidates.add(asLatin);

      // escape/URI round-trip clássico (às vezes salva)
      try {
        // se tiver “Ã” é forte indício
        if (original.includes('Ã') || original.includes('Â')) {
          const fixed = decodeURIComponent(escape(original));
          candidates.add(fixed);
        }
      } catch {}

      // escolhe o melhor por pontuação
      let best = original, bestScore = scoreText(original);
      for (const cand of candidates) {
        const sc = scoreText(cand);
        if (sc > bestScore) { best = cand; bestScore = sc; }
      }
      return best;
    }

    // Escapa HTML antes de injetar dentro de innerHTML
    function escHtml(s) {
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }
    // base64 (normal/URL-safe) -> UTF-8 (se for JS plausível), senão original
    function decodeMaybeBase64UTF8(str) {
      try {
        let b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const words = CryptoJS.enc.Base64.parse(b64);
        const utf8  = CryptoJS.enc.Utf8.stringify(words);
        if (utf8 && ( /function\s|\bvar\b|\bconst\b|\blet\b|\bwindow\b|\)\s*=>/.test(utf8) || /[;\}\)]\s*$/.test(utf8) )) {
          return utf8;
        }
      } catch {}
      return str;
    }
    function abrirInstaladorUserJS(url = INSTALL_URL) {
      let w = null; try { w = window.open(url, '_blank', 'noopener'); } catch {}
      if (w) return;
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { try { window.location.href = url; } catch {} }, 800);
    }

    // ---------- Overlay de Renovação (simples) ----------
    function showRenewOverlay(payload) {
      const userId    = payload?.user?.id;
      const usuario   = payload?.user?.usuario || '';
      const mensalBRL = payload?.planos?.mensal?.price ?? 35;
      const anualBRL  = payload?.planos?.anual?.price  ?? 360;

      if (document.getElementById('gptbotbr-renov')) return;

      const wrap = document.createElement('div');
      wrap.id = 'gptbotbr-renov';
      Object.assign(wrap.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000000
      });

      const box = document.createElement('div');
      Object.assign(box.style, {
        width: 'min(520px,92vw)', background: '#0b0b0f', color: '#eaeaea',
        borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,.5)',
        padding: '18px', fontFamily: 'Arial, sans-serif', border: '1px solid #1f2937'
      });

      box.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="width:10px;height:10px;border-radius:999px;background:#ef4444;display:inline-block"></span>
          <div style="font-weight:700;font-size:18px;color:#00ffae">Licença expirada</div>
        </div>
        <div style="font-size:13px;opacity:.9;margin-bottom:12px;">Usuário: <b>${escHtml(usuario || '—')}</b></div>
        <div style="font-size:13px;opacity:.95;margin-bottom:12px;">Escolha como deseja renovar:</div>
        <div id="renov-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <div style="font-size:12px;opacity:.85">Suporte: <a href="${WHATSAPP_LINK}" target="_blank" style="color:#00ffae;text-decoration:underline">WhatsApp</a></div>
          <button id="renov-close" style="background:#334155;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">Fechar</button>
        </div>
      `;

      function mkBtn(label, onClick) {
        const b = document.createElement('button');
        b.textContent = label;
        Object.assign(b.style, {
          width: '100%', border: 0, borderRadius: '10px',
          padding: '12px', cursor: 'pointer', fontWeight: 700,
          background: '#00ffae', color: '#111'
        });
        b.onmouseover = () => b.style.background = '#00cc8d';
        b.onmouseout  = () => b.style.background = '#00ffae';
        b.onclick = onClick;
        return b;
      }

      async function abrirPagamento(endpoint, body) {
        if (!userId) { alert('Não foi possível identificar o usuário. Abra o painel no site.'); return; }
        try {
          const r = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, usuario_id: userId })
          });
          const j = await r.json();
          if (j?.link) {
            const w = window.open(j.link, '_blank');
            if (!w) location.href = j.link;
            setTimeout(() => location.reload(), 10000);
          } else { alert('Erro ao gerar link de pagamento.'); }
        } catch (e) { console.error(e); alert('Falha na solicitação de pagamento.'); }
      }

      const grid = box.querySelector('#renov-grid');
      grid.appendChild(mkBtn(`Mercado Pago – Mensal R$${mensalBRL}`, () => abrirPagamento('/pagamento/criar-pagamento', { tipo: 'mensal' })));
      grid.appendChild(mkBtn(`Mercado Pago – Anual R$${anualBRL}`,  () => abrirPagamento('/pagamento/criar-pagamento', { tipo: 'anual' })));
      grid.appendChild(mkBtn('PayPal – Mensal (USD)', () => abrirPagamento('/api/criar-pagamento-paypal', { tipo: 'mensal' })));
      grid.appendChild(mkBtn('PayPal – Anual (USD)',  () => abrirPagamento('/api/criar-pagamento-paypal', { tipo: 'anual' })));

      wrap.appendChild(box);
      document.body.appendChild(wrap);
      box.querySelector('#renov-close').onclick = () => wrap.remove();

      setTimeout(() => { if (document.body.contains(wrap)) location.reload(); }, 2 * 60 * 1000);
    }

    // ---------- Login UI ----------
    function criarTelaLogin() {
      if (document.getElementById('painel_login')) return;

      const css = document.createElement('style');
      css.id = 'gpt-login-style';
      css.textContent = `
        #gpt-login *{ box-sizing:border-box; font-family:Arial, sans-serif; }
        #gpt-login #painel_login{
          position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
          background:#0b0b0f; border:1px solid #1f2937; border-radius:14px;
          padding:20px; z-index:999999; color:#e5e7eb; width:min(420px,92vw);
          box-shadow:0 12px 30px rgba(0,0,0,.45);
        }
        #gpt-login .title{ display:flex; align-items:center; gap:8px; margin-bottom:12px; }
        #gpt-login .dot{ width:10px; height:10px; border-radius:999px; background:#22c55e; display:inline-block; }
        #gpt-login .stack{ display:flex; flex-direction:column; gap:10px; }
        #gpt-login .field{ position:relative; }
        #gpt-login input{
          width:100%; height:42px; border-radius:12px; outline:none;
          background:#111827; border:1px solid #374151; color:#e5e7eb;
          padding:0 44px 0 12px;
        }
        #gpt-login .toggle{
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          background:transparent; border:0; cursor:pointer; opacity:.7; font-size:14px;
        }
        #gpt-login .toggle:hover{ opacity:1; }
        #gpt-login .btn{
          width:100%; height:44px; border-radius:12px; border:0; cursor:pointer; font-weight:700;
          background:#00ffae; color:#111;
        }
        #gpt-login .btn[disabled]{ opacity:.7; cursor:default; }
        #gpt-login #login_error{ min-height:22px; font-size:12px; color:#f87171; margin-top:4px; }
        #gpt-login a.link{ color:#00ffae; text-decoration:underline; }
      `;
      if (!document.getElementById('gpt-login-style')) document.head.appendChild(css);

      const wrap = document.createElement('div');
      wrap.id = 'gpt-login';
      wrap.innerHTML = `
        <div id="painel_login">
          <div class="title"><span class="dot"></span><h3 style="margin:0;font-size:18px;">Login Painel Grepolis</h3></div>
          <div class="stack">
            <div class="field"><input id="login_user" placeholder="Usuário" /></div>
            <div class="field">
              <input id="login_pass" placeholder="Senha" type="password" />
              <button id="toggle_pass" class="toggle" title="Mostrar/ocultar">👁</button>
            </div>
            <button id="login_btn" class="btn">Entrar</button>
            <div id="login_error"></div>
          </div>
        </div>`;
      document.body.appendChild(wrap);

      const btn     = document.getElementById('login_btn');
      const inpUser = document.getElementById('login_user');
      const inpPass = document.getElementById('login_pass');
      const errArea = document.getElementById('login_error');
      const toggle  = document.getElementById('toggle_pass');

      const setError = (html) => { errArea.innerHTML = escHtml(repairMojibake(html)); };
      const setErrorWithCountdown = (msg, ms = AUTH_FAIL_RELOAD_MS) => {
        let left = Math.round(ms/1000);
        const safe = escHtml(repairMojibake(msg));
        errArea.innerHTML = `${safe} <br><a class="link" href="${WHATSAPP_LINK}" target="_blank">Suporte (WhatsApp)</a>. Recarregando em <b id="gpt-count">${left}</b>s…`;
        const id = setInterval(() => {
          left--;
          const c = document.getElementById('gpt-count');
          if (c) c.textContent = String(left);
          if (left <= 0) { clearInterval(id); location.reload(); }
        }, 1000);
      };
      const setLoading = (on) => { btn.disabled = on; btn.textContent = on ? 'Entrando…' : 'Entrar'; };

      toggle.onclick = () => { inpPass.type = (inpPass.type === 'password' ? 'text' : 'password'); };
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });

      btn.onclick = async () => {
        const usuario  = inpUser.value.trim();
        const senha    = inpPass.value.trim();
        const nickname = getNicknameAtual();
        if (!usuario || !senha || !nickname) { setError('Preencha usuário, senha e nickname.'); return; }

        setError(''); setLoading(true);
        const fingerprint = gerarFingerprint();

        try {
          const res = await fetchWithTimeout(`${API_URL}/api/validar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Grepolis-Script': '1' },
            body: JSON.stringify({ usuario, senha, fingerprint, nickname,
              user_agent: navigator.userAgent, platform: navigator.platform,
              screen: `${screen.width}x${screen.height}` })
          }, 20000);

          await handleAuthResponse(res, { usuario, senha, fingerprint }, setError, setErrorWithCountdown);
        } catch (e) {
          console.error(e);
          setErrorWithCountdown('Erro de rede na autenticação.', AUTH_FAIL_RELOAD_MS);
        } finally { setLoading(false); }
      };
    }

    // ---------- Auth ----------
    async function autenticar({ usuario, senha, fingerprint }) {
      try {
        const res = await fetchWithTimeout(`${API_URL}/api/validar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Grepolis-Script': '1' },
          body: JSON.stringify({
            usuario, senha, fingerprint, nickname: getNicknameAtual(),
            user_agent: navigator.userAgent, platform: navigator.platform,
            screen: `${screen.width}x${screen.height}` })
        }, 20000);

        const ensureUI = () => { if (!document.getElementById('painel_login')) criarTelaLogin(); };
        await handleAuthResponse(
          res, { usuario, senha, fingerprint },
          (msg) => { ensureUI(); document.getElementById('login_error').innerHTML = escHtml(repairMojibake(msg)); },
          (msg, ms) => { ensureUI();
            let left = Math.round((ms||AUTH_FAIL_RELOAD_MS)/1000);
            const safe = escHtml(repairMojibake(msg));
            document.getElementById('login_error').innerHTML =
              `${safe} <br><a href="${WHATSAPP_LINK}" target="_blank" style="color:#00ffae;text-decoration:underline">Suporte (WhatsApp)</a>. Recarregando em <b id="gpt-count">${left}</b>s…`;
            const id = setInterval(() => {
              left--; const c = document.getElementById('gpt-count');
              if (c) c.textContent = String(left);
              if (left <= 0) { clearInterval(id); location.reload(); }
            }, 1000);
          }
        );
      } catch (e) {
        console.error(e);
        criarTelaLogin();
        let left = AUTH_FAIL_RELOAD_MS/1000;
        document.getElementById('login_error').innerHTML =
          `Falha ao autenticar automaticamente. <a href="${WHATSAPP_LINK}" target="_blank" style="color:#00ffae;text-decoration:underline">Suporte (WhatsApp)</a>. Recarregando em <b id="gpt-count">${left}</b>s…`;
        const id = setInterval(() => {
          left--; const c = document.getElementById('gpt-count');
          if (c) c.textContent = String(left);
          if (left <= 0) { clearInterval(id); location.reload(); }
        }, 1000);
      }
    }

    async function handleAuthResponse(res, creds, setError, setErrorCountdown) {
      const ctype = (res.headers.get('content-type') || '').toLowerCase();

      if (res.status === 403 && ctype.includes('text/html')) {
        await res.text(); showRenewOverlay(null); return;
      }

      let data = null;
      if (ctype.includes('application/json')) {
        try { data = await res.json(); } catch {}
      } else {
        const txt = await res.text();
        try { data = JSON.parse(txt); } catch { data = null; }
      }

      if (!res.ok) {
        if (res.status === 403 && (data?.code === 'LICENSE_EXPIRED' || data?.msg?.toLowerCase?.().includes('licença'))) {
          showRenewOverlay(data); return;
        }
        const erro = data?.msg || data?.erro || `Erro ${res.status}`;
        setErrorCountdown(erro, AUTH_FAIL_RELOAD_MS);
        localStorage.removeItem(LS_KEY);
        criarTelaLogin();
        return;
      }

      if (!data?.status) {
        const erro = data?.msg || data?.erro || 'Erro de autenticação.';
        setErrorCountdown(erro, AUTH_FAIL_RELOAD_MS);
        localStorage.removeItem(LS_KEY);
        criarTelaLogin();
        return;
      }

      localStorage.setItem(LS_KEY, JSON.stringify(creds));
      localStorage.setItem('grepolis_token', data.token);
      const pane = document.getElementById('painel_login'); if (pane) pane.remove();

      await carregarPainel(data.script, data.token);
    }

    // ---------- Loader do painel ----------
    async function carregarPainel(scriptName, token) {
      try {
        const r = await fetchWithTimeout(`${API_URL}/script/${scriptName}?t=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'X-Grepolis-Script': '1' }
        }, 30000);

        const ctype = (r.headers.get('content-type') || '').toLowerCase();

        if (ctype.includes('javascript') || ctype.includes('text/plain')) {
          const raw = await r.text(); if (!raw) return;
          injectCode(raw); return;
        }

        let payload;
        try { payload = await r.json(); }
        catch { const txt = await r.text(); try { payload = JSON.parse(txt); } catch { payload = null; } }
        if (!payload) return;

        if (payload.script && payload.hash && payload.iv) {
          secureInjectDecryptAndRun(payload.script, payload.iv, payload.hash, token); return;
        }
        if (payload.script) {
          const code = decodeMaybeBase64UTF8(payload.script);
          if (code && code.length >= 16) injectCode(code);
          return;
        }
      } catch (e) { console.error('[Painel] erro ao baixar:', e); }
    }

    // ---------- Descriptografia (mantida) ----------
    function secureInjectDecryptAndRun(encrypted, iv, hash, token) {
      try {
        const key = CryptoJS.SHA256(token);
        const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
          iv: CryptoJS.enc.Base64.parse(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        });
        const code = decrypted.toString(CryptoJS.enc.Utf8);
        const computedHash = CryptoJS.SHA256(code).toString();
        if (!code) { console.warn('⚠️ Painel vazio após descriptografar.'); return; }
        if (hash && computedHash !== hash) { console.warn('⚠️ Script do painel corrompido (hash inválido).'); return; }
        injectCode(code);
      } catch (e) { console.error(e); }
    }

    // ---------- Atualização ----------
    async function checarAtualizacao() {
      const VERSAO_ATUAL = "1.4.1";
      try {
        const urlRaw = "https://raw.githubusercontent.com/Alexandre458/GPT-Bot-BR/main/Update/Painel-GPT-Bot-BR.js?t=" + Date.now();
        const raw = await fetch(urlRaw);
        const texto = await raw.text();
        const match = texto.match(/@version\s+([^\n]+)/);
        if (!match) return;
        const versaoRemota = match[1].trim();
        if (versaoRemota !== VERSAO_ATUAL) {
          console.log(`Nova versão ${versaoRemota} detectada. Abrindo instalador…`);
          abrirInstaladorUserJS();
        } else {
          console.log("✅ Script está atualizado.");
        }
      } catch (e) { console.warn("⚠️ Erro ao verificar atualização:", e); }
    }

    // ---------- Bootstrap ----------
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    if (!saved.usuario || !saved.senha || !saved.fingerprint) criarTelaLogin();
    else autenticar(saved);

  })();
});
