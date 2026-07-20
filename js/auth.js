window.liberarPainel = function() {
    // Garante que a tela de login suma e o painel apareça
    document.getElementById('loginScreen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'flex';
        document.getElementById('loginCard').style.display = 'none';
        document.getElementById('loginLoader').style.display = 'none';
    }, 300);
    
    const dataC = document.getElementById('data-consulta');
    if(dataC) dataC.valueAsDate = new Date();
    
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const txtMes = document.getElementById('mes-atual');
    if(txtMes) txtMes.innerText = meses[new Date().getMonth()] + " de " + new Date().getFullYear();
    
    window.carregarLayoutConfig();
    window.escutarCargos();
    window.escutarConfigDashboard();
    window.escutarMetasDoFirebase();
    
    let lvl = window.nivelUsuarioGlobal;
    if (['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl)) {
        window.escutarMilitaresEstrelas();
    }
    
    if (['VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl)) {
        window.carregarPrivacidade();
        window.escutarLogsEstrelas();
        window.escutarLogsAtividades();
    }
    
    window.initAvatarScene();
    window.setupAllDraggables();
    if(window.registrarLogAtividade) window.registrarLogAtividade("Login Efetuado", "Acessou a Central de Sistemas.");
    
    // Injeção visual na nova UI
    const nick = window.usuarioLogadoNick || "Usuário";
    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick}&action=std&direction=3&head_direction=3&gesture=sml&size=l`;
    
    const loggedNickEl = document.getElementById('loggedNick');
    if(loggedNickEl) loggedNickEl.innerText = nick;
    
    const loggedRoleEl = document.getElementById('loggedRole');
    if(loggedRoleEl) loggedRoleEl.innerText = window.nivelUsuarioGlobal;
    
    const loggedAvatarEl = document.getElementById('loggedAvatar');
    if(loggedAvatarEl) loggedAvatarEl.src = avatarUrl;
    
    
    
    const userProfileEl = document.getElementById('userProfile');
    if(userProfileEl) userProfileEl.style.display = 'flex';
    
    // Gera menu baseado na hierarquia
    if (window.gerarMenusPorNivel) window.gerarMenusPorNivel();
}


window.gerarMenusPorNivel = function() {
    const dock = document.getElementById('dockNav');
    const hub = document.getElementById('central-tools-grid');
    const cmd = document.getElementById('cmd-tools-grid');
    
    let lvl = window.nivelUsuarioGlobal;
    const ehLideranca = ['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl);
    const ehSuperLideranca = ['VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl);
    const ehAuxiliar = ['AUXILIAR', 'SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl);
    
    // Hub Central
    let hubHtml = `
        <div class="tool-card" onclick="window.switchSection('modulo-metas')">
            <div class="tool-icon"><i class="fas fa-bullseye"></i></div>
            <div class="tool-info"><h4>Metas</h4><p>Consulta Semanal</p></div>
        </div>
        ${ehAuxiliar ? `
        <div class="tool-card" onclick="window.switchSection('modulo-avais')">
            <div class="tool-icon"><i class="fas fa-calculator"></i></div>
            <div class="tool-info"><h4>Licenças</h4><p>Cálculo de dias</p></div>
        </div>
        <div class="tool-card" onclick="window.switchSection('modulo-feedbacks')">
            <div class="tool-icon"><i class="fas fa-comments"></i></div>
            <div class="tool-info"><h4>Feedbacks</h4><p>Painel oficial</p></div>
        </div>
        ` : ''}
        <div class="tool-card" onclick="window.switchSection('modulo-grupos')">
            <div class="tool-icon"><i class="fas fa-users"></i></div>
            <div class="tool-info"><h4>Grupos</h4><p>Controle geral</p></div>
        </div>
        <div class="tool-card" onclick="window.switchSection('modulo-correcoes')">
            <div class="tool-icon"><i class="fas fa-check-double"></i></div>
            <div class="tool-info"><h4>Correções</h4><p>Atividades pendentes</p></div>
        </div>
        <div class="tool-card" onclick="window.switchSection('modulo-requerimentos')">
            <div class="tool-icon"><i class="fas fa-file-signature"></i></div>
            <div class="tool-info"><h4>Requerimentos</h4><p>Formulários DIC</p></div>
        </div>
        ${ehAuxiliar ? `
        <div class="tool-card" onclick="window.switchSection('modulo-acompanhamentos')">
            <div class="tool-icon"><i class="fas fa-clipboard-list"></i></div>
            <div class="tool-info"><h4>Acompanhamentos</h4><p>Painel de Tarefas</p></div>
        </div>
        ` : ''}
        <div class="tool-card" onclick="window.switchSection('modulo-avisos')">
            <div class="tool-icon"><i class="fas fa-bullhorn"></i></div>
            <div class="tool-info"><h4>Avisos</h4><p>Emissão Oficial</p></div>
        </div>
        <div class="tool-card" onclick="window.abrirSystemDIC()">
            <div class="tool-icon"><i class="fas fa-external-link-alt"></i></div>
            <div class="tool-info"><h4>System DIC</h4><p>Acesso externo</p></div>
        </div>
    `;
    if (hub) hub.innerHTML = hubHtml;

    
    // Dock Floating (New UI)
    let dockHtml = `
        <div class="dock-item" id="menu-view-home" data-label="Home" onclick="window.switchSection('view-home', this)"><i class="fas fa-home"></i></div>
        <div class="dock-separator"></div>
        <div class="dock-item" id="menu-modulo-metas" data-label="Metas" onclick="window.switchSection('modulo-metas', this)"><i class="fas fa-bullseye"></i></div>
        <div class="dock-item" id="menu-modulo-requerimentos" data-label="Requerimentos" onclick="window.switchSection('modulo-requerimentos', this)"><i class="fas fa-file-signature"></i></div>
        ${ehAuxiliar ? `
        <div class="dock-item" id="menu-modulo-avais" data-label="Licenças" onclick="window.switchSection('modulo-avais', this)"><i class="fas fa-calculator"></i></div>
        <div class="dock-item" id="menu-modulo-feedbacks" data-label="Feedbacks" onclick="window.switchSection('modulo-feedbacks', this)"><i class="fas fa-comments"></i></div>
        <div class="dock-item" id="menu-modulo-acompanhamentos" data-label="Acompanhamentos" onclick="window.switchSection('modulo-acompanhamentos', this)"><i class="fas fa-clipboard-list"></i></div>
        ` : ''}
        <div class="dock-item" id="menu-modulo-avisos" data-label="Avisos" onclick="window.switchSection('modulo-avisos', this)"><i class="fas fa-bullhorn"></i></div>
        <div class="dock-item" id="menu-modulo-grupos" data-label="Controle Grupos" onclick="window.switchSection('modulo-grupos', this)"><i class="fas fa-users"></i></div>
    `;
    if (ehLideranca) {
        dockHtml += `
            <div class="dock-separator"></div>
            <div class="dock-item" id="menu-modulo-correcoes" data-label="Correções" onclick="window.switchSection('modulo-correcoes', this)"><i class="fas fa-check-double"></i></div>
            <div class="dock-item" id="menu-modulo-estrelas" data-label="Estrelas" onclick="window.switchSection('modulo-estrelas', this)"><i class="fas fa-star"></i></div>
            ${ehSuperLideranca ? `<div class="dock-item" id="menu-modulo-verificacoes" data-label="Verificações" onclick="window.switchSection('modulo-verificacoes', this)"><i class="fas fa-gavel"></i></div>` : ''}
            ${ehSuperLideranca ? `<div class="dock-item dock-command" data-label="Configurações da Liderança" onclick="window.toggleCommand()"><i class="fas fa-bolt"></i></div>` : ''}
        `;
    }

    
    if (dock) {
        dock.innerHTML = dockHtml;
        dock.classList.add('active'); // show dock
    }
    
    // Controle de Requerimentos (Ocultar aba relatórios se for membro)
    const btnRelatorios = document.querySelector('button[data-target="tab-relatorios"]');
    if (btnRelatorios) {
        btnRelatorios.style.display = ehAuxiliar ? 'inline-block' : 'none';
    }
    
    // ==========================================
    // Roteamento Inicial (Movel pra cá pra evitar race condition com a injeção do dock)
    // ==========================================
    setTimeout(() => {
        let path = window.location.pathname.replace('/', '').trim();
        if (path && path !== 'index.html' && path !== '') {
            let sectionId = 'modulo-' + path;
            if (document.getElementById(sectionId)) {
                window.switchSection(sectionId, null);
            } else {
                window.switchSection('view-home', null);
            }
        } else {
            window.switchSection('view-home', null);
        }
    }, 50);
    
    if (cmd && ehSuperLideranca) {
                        cmd.innerHTML = `
            <div class="cmd-tile" onclick="window.switchSection('modulo-revisao'); window.toggleCommand();"><i class="fas fa-search"></i><span>Revisão</span></div>
            <div class="cmd-tile" onclick="window.switchSection('modulo-config-avisos'); window.carregarEditorAvisos(); window.toggleCommand();"><i class="fas fa-edit"></i><span>Textos Avisos</span></div>
            <div class="cmd-tile" onclick="window.switchSection('modulo-config-banners'); window.carregarEditorBanners(); window.toggleCommand();"><i class="fas fa-images"></i><span>Banners Home</span></div>
            <div class="cmd-tile" onclick="window.switchSection('modulo-logs-atividades'); window.toggleCommand();"><i class="fas fa-eye"></i><span>Auditoria Global</span></div>
            <div class="cmd-tile" onclick="window.switchSection('modulo-logs'); window.toggleCommand();"><i class="fas fa-history"></i><span>Logs Estrelas</span></div>
            <div class="cmd-tile" onclick="window.switchSection('modulo-acessos'); window.toggleCommand();"><i class="fas fa-users-cog"></i><span>Acessos</span></div>
            <div class="cmd-tile" onclick="window.switchSection('modulo-privacidade'); window.toggleCommand();"><i class="fas fa-shield-alt"></i><span>Privacidade</span></div>
        `;
    }
}


// MONITOR DE SESSÃO ESTABILIZADO
auth.onAuthStateChanged((user) => {
    if (user) {
        window.usuarioLogadoEmail = user.email.toLowerCase();
        // Se já estamos logados, mostramos o loader e verificamos o acesso
        document.getElementById('loginCard').style.display = 'none';
        document.getElementById('loginLoader').style.display = 'block';
        window.verificarAcessoBD(window.usuarioLogadoEmail);
    } else {
        // Se deslogado, volta para a tela de login
        document.getElementById('appWrapper').style.display = 'none';
        document.getElementById('loginLoader').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        document.getElementById('loginScreen').style.display = 'flex';
        setTimeout(() => { document.getElementById('loginScreen').style.opacity = '1'; }, 10);
    }
});

window.verificarAcessoBD = async function(email) {
    try {
        let authEmail = email.toLowerCase().trim();
        
        // Tenta buscar dados do sistema
        const planRef = window.db.collection("sistema").doc("acessos_planilha");
        const planSnap = await planRef.get();
        if (planSnap.exists && planSnap.data().dados) {
            try { window.planilhaAcessos = JSON.parse(planSnap.data().dados); } catch (e) { window.planilhaAcessos = {}; }
        }
        
        const manualSnap = await window.db.collection("acessos").get();
        window.acessosData = [];
        manualSnap.forEach(doc => { window.acessosData.push({ id: doc.id, ...doc.data() }); });

        let userManual = window.acessosData.find(u => (u.email || u.id || '').toLowerCase().trim() === authEmail);
        let userPlan = null;
        if (window.planilhaAcessos) {
            for (let key in window.planilhaAcessos) {
                if (key.toLowerCase().trim() === authEmail) { userPlan = window.planilhaAcessos[key]; break; }
            }
        }

        let autorizado = false;
        if (userPlan) {
            autorizado = true; window.nivelUsuarioGlobal = userPlan.nivel; window.usuarioLogadoNick = userPlan.nick;
        } else if (userManual) {
            autorizado = true; window.nivelUsuarioGlobal = userManual.nivel; window.usuarioLogadoNick = userManual.nick;
        }

        if (autorizado) {
            window.nivelUsuarioGlobal = window.nivelUsuarioGlobal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (window.nivelUsuarioGlobal === 'VICELIDER') window.nivelUsuarioGlobal = 'VICE-LIDER';
            if (window.nivelUsuarioGlobal === 'SUBLIDER') window.nivelUsuarioGlobal = 'SUB-LIDER';
            
            if (window.nivelUsuarioGlobal === 'COMANDO') {
                window.customAlert("Acesso restrito ao Painel Público.", "Aviso");
                setTimeout(() => { auth.signOut(); }, 3000);
                return;
            }

            if (['VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal)) {
                window.renderTabelaAcessos();
            }
            
            window.liberarPainel();
        } else {
            window.customAlert(`O e-mail <b>${authEmail}</b> não tem permissão.`, "Acesso Negado");
            setTimeout(() => auth.signOut(), 4000);
        }
    } catch (err) {
        console.error("Erro na verificação:", err);
        // Se der erro de permissão (bloqueio de navegador), NÃO deslogamos o usuário. 
        // Tentamos apenas liberar o painel para ver se o Firebase se recupera sozinho.
        if (err.message.includes("permissions") || err.message.includes("Insufficient")) {
            console.warn("Bloqueio de segurança detectado. Tentando contornar...");
            if (window.nivelUsuarioGlobal) window.liberarPainel();
        }
    }
}

window.loginGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'block';
    
    // Voltamos para o Popup, mas com tratamento de erro melhorado
    auth.signInWithPopup(provider).catch((error) => {
        console.error("Erro no login:", error);
        document.getElementById('loginLoader').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        if(error.code !== 'auth/popup-closed-by-user') {
            window.customAlert("Erro ao abrir login. Verifique se o seu navegador não bloqueou o popup.", "Erro");
        }
    });
}

window.fazerLogout = function() { 
    if(window.registrarLogAtividade) window.registrarLogAtividade("Logout", "Saiu do sistema.");
    auth.signOut(); 
}

window.abrirSystemDIC = function() {
    window.open('https://dic.systemhb.net/divisao/supervisores', '_blank');
}

window.getLiderNick = function() {
    let liderNick = "Pachieri";
    if (window.acessosData) {
        let lider = window.acessosData.find(u => {
            if(!u.nivel) return false;
            let n = u.nivel.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            return n === 'LIDER';
        });
        if(lider && lider.nick) {
            liderNick = lider.nick;
        }
    }
    return liderNick;
};

window.initAvatarScene = function() {
    const nickLider = window.getLiderNick();
    const av = document.getElementById('hub-avatar');
    const bubble = document.getElementById('hub-bubble');
    if(!av || !bubble) return;
    
    // direction 6 = Anda para a Esquerda
    av.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickLider}&action=wlk&direction=6&head_direction=6&gesture=std&size=l`;
    av.style.transform = 'translateX(150px)';
    av.style.opacity = '0';
    bubble.classList.remove('visible');

    setTimeout(() => {
        av.style.transform = 'translateX(0)'; // Caminha para a posição final definida no CSS
        av.style.opacity = '1';
        setTimeout(() => {
            // direction 3 = Frente, gesture sml = Sorrindo, action wav = Acenando
            av.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nickLider}&action=wav&direction=3&head_direction=3&gesture=sml&size=l`;
            
            // Define o pronome baseado no nick (Adicione outros se necessário)
            const nicksFemininos = ['pachieri', 'luiza41418', 'syby'];
            const pronome = nicksFemininos.includes(nickLider.toLowerCase()) ? 'a' : 'o';
            
            bubble.innerHTML = `Olá, seja bem-vindo aos Supervisores! Eu sou ${pronome} Líder de vocês, ${nickLider}. #SAGE`;
            bubble.classList.add('visible');
        }, 2000); 
    }, 500);
};
