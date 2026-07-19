/* =========================================================================
   INJEÇÃO GLOBAL DE MODAIS E COMPONENTES VISUAIS (AUTO-RENDER)
   ========================================================================= */
const modaisGlobaisHTML = `
  <div id="loginScreen">
    <div id="loginLoader" style="display: none; text-align: center; color: var(--sup-neon); font-size: 16px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
      <div class="spinner-ring" style="margin: 0 auto 20px auto;"></div> Autenticando...
    </div>
    <div class="login-card" id="loginCard">
      <img src="https://www.habbo.com.br/habbo-imaging/badge/b10134s12017s43014t12104s170129cb6c41f26a37e0c3192016b851550a7.gif" alt="Logo">
      <h2>Central de Sistemas</h2>
      <p>Acesso restrito aos membros dos Supervisores</p>
      <button onclick="window.loginGoogle()" class="btn-tech" style="width:100%; font-size:16px;"><i class="fab fa-google"></i> Entrar com o Google</button>
      <p id="login-error" style="color: #ff2a2a; font-size: 14px; margin-top: 15px; display: none; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Erro ao logar.</p>
    </div>
  </div>

  <div id="toastContainer" class="toast-container"></div>

  <div id="custom-alert-modal" class="modal" style="z-index: 99999999;">
      <div class="modal-content" style="max-width: 450px; text-align: center; border-color: var(--sup-neon);">
          <h3 id="custom-alert-title" style="color: var(--sup-neon); margin-bottom: 15px; display: flex; justify-content: center; align-items:center; gap: 10px;"></h3>
          <p id="custom-alert-msg" style="color: #fff; font-size: 15px; margin-bottom: 25px; line-height: 1.6;"></p>
          <button class="btn-tech btn-save" onclick="document.getElementById('custom-alert-modal').style.display='none'">OK, Entendi</button>
      </div>
  </div>

  <div id="custom-prompt-modal" class="modal" style="z-index: 9999999;">
      <div class="modal-content" style="max-width: 400px; text-align: center;">
          <h3 style="color: var(--sup-neon); margin-bottom: 15px;"><i class="fas fa-link"></i> Inserir Link</h3>
          <div class="input-block"><input type="text" id="custom-prompt-input" placeholder="Ex: https://google.com"></div>
          <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
              <button class="btn-tech" onclick="window.fecharCustomPrompt()">Cancelar</button>
              <button class="btn-tech btn-save" onclick="window.confirmarCustomPrompt()">Inserir</button>
          </div>
      </div>
  </div>

  <div id="modal-dashboard" class="modal">
     <div class="modal-content">
        <div class="close-btn" onclick="window.fecharDashboard()"><i class="fas fa-times"></i></div>
        <h3 style="color: var(--sup-neon); margin-bottom: 25px;"><i class="fas fa-tachometer-alt"></i> Dashboard de Metas e Eventos</h3>
        <div style="background: rgba(0,0,0,0.4); padding: 20px; border-radius: 8px; border: 1px dashed rgba(251,191,36,0.3); margin-bottom: 25px;">
           <h4 style="color:#fff; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; font-size:14px;"><i class="fas fa-bolt"></i> Multiplicador Global de Pontos</h4>
           <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
               <div style="display: flex; align-items: center;"><label class="switch" title="Ativar Bônus"><input type="checkbox" id="dash-toggle-evento"><span class="slider"></span></label><span style="color: var(--text-sub); font-size: 14px; font-weight:bold;">ATIVAR BÔNUS</span></div>
               <div class="input-block" style="margin:0; width: 150px;"><select id="dash-mult-evento"><option value="1">1x (Normal)</option><option value="2">2x Pontos</option><option value="3">3x Pontos</option><option value="4">4x Pontos</option></select></div>
           </div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(251,191,36,0.2); padding-bottom:10px; margin-bottom:15px;">
            <h4 style="color:#fff; font-size:16px; text-transform:uppercase; margin:0;"><i class="far fa-calendar-alt"></i> Eventos do Mês</h4>
            <button class="btn-tech" onclick="window.adicionarNovoEventoBox()" style="padding: 5px 10px; font-size: 12px;"><i class="fas fa-plus"></i> Adicionar Evento</button>
        </div>
        <div id="dash-eventos-container"></div>
        <label class="tech-label" style="margin-top: 15px;">Frase de Patrocínio Padrão</label>
        <input type="text" id="dash-txt-patrocinio" class="admin-input" style="margin-bottom:20px;" placeholder="Deseja patrocinar algum dos eventos...">
        <button class="btn-tech btn-save" onclick="window.salvarDashboard()" style="width: 100%; margin-top: 10px; padding: 15px; font-size: 16px;"><i class="fas fa-save"></i> Salvar e Atualizar Painel</button>
     </div>
  </div>

  <div id="modal-pontos-extras" class="modal">
      <div class="modal-content" style="max-width: 500px;">
          <div class="close-btn" onclick="window.fecharModalPontosExtras()"><i class="fas fa-times"></i></div>
          <h3 style="color: var(--sup-neon); margin-bottom: 20px;"><i class="fas fa-star"></i> Gerenciar Pontos Extras</h3>
          <p class="subtext">Atribua pontuações adicionais individualmente.</p>
          <div style="display:flex; gap:15px; align-items:center; margin-bottom: 25px;">
              <div class="input-block" style="flex:2; margin:0;"><i class="fas fa-user"></i><select id="pe-select-membro"><option value="" disabled selected>Selecione...</option></select></div>
              <div class="input-block" style="flex:1; margin:0;"><i class="fas fa-plus"></i><input type="number" id="pe-input-pontos" placeholder="Ex: 5" style="text-align:center;"></div>
              <button class="btn-tech btn-save" onclick="window.salvarPontoExtra()"><i class="fas fa-check"></i> Atribuir</button>
          </div>
          <h4 style="color:#fff; margin-bottom:10px; font-size:14px; text-transform:uppercase; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom:5px;">Membros com Extras</h4>
          <div class="admin-table-wrapper" style="max-height: 250px; overflow-y:auto;">
              <table class="admin-table" id="tb-pontos-extras"><thead><tr><th>Membro</th><th style="text-align:center;">Pontos</th><th style="text-align:right;">Ação</th></tr></thead><tbody></tbody></table>
          </div>
      </div>
  </div>

  <div id="modal-iframe-link" class="modal" style="z-index: 9999999;">
      <div class="modal-content" style="max-width: 900px; width:95%; height:80vh; padding:20px; display:flex; flex-direction:column;">
          <div class="close-btn" onclick="document.getElementById('modal-iframe-link').style.display='none'"><i class="fas fa-times"></i></div>
          <h3 style="color: var(--sup-neon); margin-bottom: 15px;"><i class="fas fa-external-link-alt"></i> Visualização de Anexo</h3>
          <div style="flex:1; border: 1px solid var(--sup-neon); border-radius:8px; overflow:hidden;">
              <iframe id="iframe-viewer" src="" style="width:100%; height:100%; border:none; background:#fff;"></iframe>
          </div>
          <div style="margin-top:10px; text-align:center;">
              <a id="link-externo-fallback" href="" target="_blank" style="color:var(--sup-neon); text-decoration:none; font-size:14px;"><i class="fas fa-link"></i> Abrir em nova guia caso não carregue ou fique em branco</a>
          </div>
      </div>
  </div>

  <div id="modal-correcao-lote" class="modal">
      <div class="modal-content" style="max-width: 600px;">
          <div class="close-btn" onclick="document.getElementById('modal-correcao-lote').style.display='none'"><i class="fas fa-times"></i></div>
          <h3 style="color: var(--sup-neon); margin-bottom: 15px;"><i class="fas fa-tools"></i> Corrigir Ciclo Validado</h3>
          <p class="subtext" style="margin-bottom:20px;">Ao corrigir, o sistema apagará os pontos dados na data selecionada e calculará novamente com os novos IDs excluídos.</p>
          <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:20px;">
              <div style="flex:1; min-width:200px;">
                  <label class="tech-label">Data Original do Ciclo</label>
                  <div class="input-block"><i class="far fa-calendar-alt"></i><input type="date" id="correcao-data"></div>
              </div>
              <div style="flex:1; min-width:200px;">
                  <label class="tech-label">Novos IDs Excluídos / Incorretos</label>
                  <div class="input-block"><i class="fas fa-ban"></i><input type="text" id="correcao-excluidos" placeholder="Ex: 502, 508 (Opcional)"></div>
              </div>
          </div>
          <button class="btn-tech" onclick="window.buscarCorrecaoLote()" style="width: 100%; margin-bottom: 15px;"><i class="fas fa-search"></i> Buscar e Simular Correção</button>
          <div id="resultado-correcao" style="display:none; padding-top:15px; border-top:1px dashed rgba(251,191,36,0.2);"></div>
      </div>
  </div>
`;
document.body.insertAdjacentHTML('afterbegin', modaisGlobaisHTML);
/* ========================================================================= */


/* =========================================================================
   SISTEMA DE ROTEAMENTO (SPA URL CLEAN)
   ========================================================================= */

// Função mestre de troca de telas
window.switchSection = function(sectionId, btnElement) {
    // 1. Apaga a luz de todos os módulos
    document.querySelectorAll('.spa-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));

    // 2. Acende a luz do módulo correto
    let targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');

    // 3. Destaca o botão correto no menu lateral
    if (btnElement) {
        btnElement.classList.add('active');
    } else {
        // Se a função foi chamada automaticamente pela URL, busca o botão
        let pathName = sectionId.replace('modulo-', '');
        let btnId = 'menu-' + pathName;
        let btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');
    }

    // 4. Mágica do Roteamento: Altera a URL do navegador sem recarregar a página!
    let newPath = sectionId.replace('modulo-', '');
    window.history.pushState({ section: sectionId }, '', '/' + newPath);
};

// Quando a página termina de carregar, lê a URL para saber onde o usuário estava
document.addEventListener("DOMContentLoaded", () => {
    let path = window.location.pathname.replace('/', '').trim();
    
    // Ignora se for a página inicial pura ou o index.html
    if (path && path !== 'index.html' && path !== '') {
        let sectionId = 'modulo-' + path;
        let targetSection = document.getElementById(sectionId);
        
        // Se a seção existir no HTML, vai direto para ela
        if (targetSection) {
            window.switchSection(sectionId, null);
        }
    }
});

// Faz os botões "Voltar" e "Avançar" do navegador funcionarem perfeitamente
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.section) {
        window.switchSection(event.state.section, null);
    } else {
        // Fallback: se voltar tudo, vai para as metas
        let path = window.location.pathname.replace('/', '').trim();
        let sectionId = path ? 'modulo-' + path : 'modulo-metas';
        if (document.getElementById(sectionId)) {
            window.switchSection(sectionId, null);
        }
    }
});
/* ========================================================================= */


window.registrarLogAtividade = function(acao, detalhes) {
    if (!window.usuarioLogadoNick) return;
    window.db.collection("logs_atividades").add({
        timestamp: new Date().getTime(),
        data_hora: new Date().toLocaleString('pt-BR'),
        autor: window.usuarioLogadoNick,
        acao: acao,
        detalhes: detalhes || '-'
    }).catch(e => console.error("Erro ao registrar log de atividade:", e));
}

window.mostrarToast = function(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    let toast = document.createElement('div');
    let icon = type === 'success' ? '<i class="fas fa-check-circle" style="color: #4caf50; font-size: 20px;"></i>' : '<i class="fas fa-exclamation-triangle" style="color: #ff2a2a; font-size: 20px;"></i>';
    let bc = type === 'success' ? 'var(--sup-neon)' : '#ff2a2a';
    let sc = type === 'success' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 42, 42, 0.3)';
    
    toast.className = 'toast-msg';
    toast.style.border = `1px solid ${bc}`;
    toast.style.boxShadow = `0 0 20px ${sc}`;
    toast.innerHTML = `${icon}<span style="color:#fff;">${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3500);
}

window.customAlert = function(msg, title = "Aviso") {
    document.getElementById('custom-alert-title').innerHTML = `<i class="fas fa-exclamation-circle"></i> ${title}`;
    document.getElementById('custom-alert-msg').innerHTML = msg;
    document.getElementById('custom-alert-modal').style.display = 'flex';
}

let savedSelection = null;
window.saveSelection = function() {
    if (window.getSelection) {
        let sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) savedSelection = sel.getRangeAt(0);
    }
}

window.restoreSelection = function() {
    if (savedSelection) {
        if (window.getSelection) {
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedSelection);
        }
    }
}

window.applyStyle = function(cmd, val) {
    event.preventDefault();
    document.execCommand(cmd, false, val);
}

window.abrirModalLink = function() {
    event.preventDefault();
    window.saveSelection();
    document.getElementById('custom-prompt-modal').style.display = 'flex';
    document.getElementById('custom-prompt-input').value = '';
    document.getElementById('custom-prompt-input').focus();
}

window.fecharCustomPrompt = function() { document.getElementById('custom-prompt-modal').style.display = 'none'; }

window.confirmarCustomPrompt = function() {
    let url = document.getElementById('custom-prompt-input').value.trim();
    window.fecharCustomPrompt();
    window.restoreSelection();
    if (url) document.execCommand("createLink", false, url);
}

window.buildEditorHTML = function(id, content = '') {
    return `
    <div class="editor-toolbar">
        <button type="button" onmousedown="window.applyStyle('bold')"><i class="fas fa-bold"></i></button>
        <button type="button" onmousedown="window.applyStyle('italic')"><i class="fas fa-italic"></i></button>
        <button type="button" onmousedown="window.applyStyle('underline')"><i class="fas fa-underline"></i></button>
        <button type="button" onmousedown="window.abrirModalLink()"><i class="fas fa-link"></i></button>
        <input type="color" title="Cor" onchange="window.applyStyle('foreColor', this.value)" style="margin-left:5px;">
    </div>
    <div class="rich-editor admin-input ev-desc" contenteditable="true" id="${id}">${content}</div>`;
}

window.aplicarPosicoes = function() {
    for (let id in window.layoutConfig) {
        if (id === 'sponsorInner') continue;
        let el = document.getElementById(id);
        if (el) {
            if (window.layoutConfig[id].left) el.style.left = window.layoutConfig[id].left;
            if (window.layoutConfig[id].top) el.style.top = window.layoutConfig[id].top;
            if (window.layoutConfig[id].width) el.style.width = window.layoutConfig[id].width;
        }
    }
    window.aplicarSponsorInner();
}

window.aplicarSponsorInner = function() {
    let conf = window.layoutConfig['sponsorInner'] || { width: '60px', left: '0px', top: '-10px' };
    document.querySelectorAll('.sponsor-avatar img').forEach(img => {
        if (conf.left) img.style.left = conf.left;
        if (conf.top) img.style.top = conf.top;
        if (conf.width) img.style.width = conf.width;
    });
}

window.carregarLayoutConfig = function() {
    window.db.collection("sistema").doc("config_layout").get().then((doc) => {
        if (doc.exists && doc.data().posicoes) {
            let loaded = doc.data().posicoes;
            for (let k in loaded) { window.layoutConfig[k] = { ...window.layoutConfig[k], ...loaded[k] }; }
        }
        window.aplicarPosicoes();
    });
}

window.savePositions = function() {
    window.db.collection("sistema").doc("config_layout").set({ posicoes: window.layoutConfig }, { merge: true }).then(() => {
        window.mostrarToast("Posições salvas!", "success");
        window.registrarLogAtividade("Editou Layout", "Alterou a posição de elementos na aba Consulta de Metas.");
        if (window.isEditMode) window.toggleEditMode();
    }).catch((e) => window.mostrarToast("Erro ao salvar posições: " + e.message, "error"));
}

window.toggleEditMode = function() {
    window.isEditMode = !window.isEditMode;
    let btn = document.getElementById('btn-edit-pos');
    let dica = document.getElementById('dica-resize');
    let elsDrag = document.querySelectorAll('.draggable-item');
    let elsSponImg = document.querySelectorAll('.sponsor-avatar img');
    let elsPrize = document.querySelectorAll('.resizable-prize');
    let areaDet = document.getElementById('area-detalhes-membro');
    
    if (window.isEditMode) {
        btn.innerHTML = '<i class="fas fa-times"></i> Concluir Edição';
        btn.style.borderColor = '#ef4444'; btn.style.color = '#ef4444'; dica.style.display = 'inline';
        areaDet.style.display = 'flex'; areaDet.style.opacity = '1';
        
        let ts = new Date().getTime();
        let fbacks = [{ id: 'avatar-1' }, { id: 'avatar-2' }, { id: 'avatar-selecionado' }, { id: 'avatar-empate-1' }, { id: 'avatar-empate-2' }];
        
        fbacks.forEach(f => {
            let img = document.getElementById(f.id);
            if (img && (!img.src || img.src.endsWith('='))) img.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=Admin&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        });
        
        document.getElementById('nick-1').innerText = "NICK 1"; document.getElementById('nick-1').style.display = "block";
        document.getElementById('nick-2').innerText = "NICK 2"; document.getElementById('nick-2').style.display = "block";
        
        elsDrag.forEach(e => { e.classList.add('edit-mode'); if (e.tagName === 'IMG' || e.tagName === 'DIV') e.style.display = 'block'; });
        elsSponImg.forEach(img => { img.classList.add('sponsor-edit', 'edit-mode'); });
        elsPrize.forEach(img => { img.classList.add('edit-mode'); });
        
    } else {
        btn.innerHTML = '<i class="fas fa-arrows-alt"></i> Editar Posições';
        btn.style.borderColor = ''; btn.style.color = ''; dica.style.display = 'none';
        
        elsDrag.forEach(e => { e.classList.remove('edit-mode'); });
        elsSponImg.forEach(img => { img.classList.remove('sponsor-edit', 'edit-mode'); });
        elsPrize.forEach(img => { img.classList.remove('edit-mode'); });
        
        if (!document.getElementById('select-membro').value) {
            areaDet.style.display = 'none'; areaDet.style.opacity = '0';
        } else {
            window.renderMemberDetails();
        }
        window.processarPodio();
    }
}

window.setupPrizesResizable = function() {
    document.querySelectorAll('.resizable-prize').forEach(img => {
        if (img.dataset.dragReady) return;
        img.dataset.dragReady = "true";
        img.ondragstart = () => false;
        
        img.addEventListener('wheel', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let w = parseFloat(img.style.width) || img.offsetWidth;
            w += e.deltaY < 0 ? 5 : -5;
            if (w < 15) w = 15;
            img.style.width = w + 'px';
            window.layoutConfig[img.id] = window.layoutConfig[img.id] || {};
            window.layoutConfig[img.id].width = w + 'px';
        }, { passive: false });
    });
}

window.setupAllDraggables = function() {
    document.querySelectorAll('.draggable-item').forEach(el => {
        if (el.dataset.dragReady) return;
        el.dataset.dragReady = "true";
        el.ondragstart = () => false;
        
        el.addEventListener('mousedown', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let startX = e.clientX; let startY = e.clientY;
            let startLeft = el.offsetLeft; let startTop = el.offsetTop;
            
            const onMouseMove = (mEv) => {
                mEv.preventDefault();
                el.style.left = (startLeft + (mEv.clientX - startX)) + 'px';
                el.style.top = (startTop + (mEv.clientY - startY)) + 'px';
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                window.layoutConfig[el.id] = window.layoutConfig[el.id] || {};
                window.layoutConfig[el.id].left = el.style.left;
                window.layoutConfig[el.id].top = el.style.top;
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        el.addEventListener('wheel', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let w = parseFloat(window.getComputedStyle(el).width) || el.offsetWidth;
            w += e.deltaY < 0 ? 5 : -5;
            if (w < 15) w = 15;
            el.style.width = w + 'px';
            window.layoutConfig[el.id] = window.layoutConfig[el.id] || {};
            window.layoutConfig[el.id].width = el.style.width;
        }, { passive: false });
    });
}