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
    const avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b`;
    
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
    
    // Hub Central
    let hubHtml = `
        <div class="tool-card" onclick="window.switchSection('modulo-metas')">
            <div class="tool-icon"><i class="fas fa-bullseye"></i></div>
            <div class="tool-info"><h4>Metas</h4><p>Consulta Semanal</p></div>
        </div>
        <div class="tool-card" onclick="window.switchSection('modulo-avais')">
            <div class="tool-icon"><i class="fas fa-calculator"></i></div>
            <div class="tool-info"><h4>Licenças</h4><p>Cálculo de dias</p></div>
        </div>
        <div class="tool-card" onclick="window.switchSection('modulo-feedbacks')">
            <div class="tool-icon"><i class="fas fa-comments"></i></div>
            <div class="tool-info"><h4>Feedbacks</h4><p>Painel oficial</p></div>
        </div>
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
        <div class="tool-card" onclick="window.abrirSystemDIC()">
            <div class="tool-icon"><i class="fas fa-external-link-alt"></i></div>
            <div class="tool-info"><h4>System DIC</h4><p>Acesso externo</p></div>
        </div>
    `;
    if (hub) hub.innerHTML = hubHtml;

    
    // Dock Floating (New UI)
    let dockHtml = `
        <div class="dock-item" data-label="Home" onclick="window.switchSection('view-home', this)"><i class="fas fa-home"></i></div>
        <div class="dock-separator"></div>
        <div class="dock-item" data-label="Metas" onclick="window.switchSection('modulo-metas', this)"><i class="fas fa-bullseye"></i></div>
        <div class="dock-item" data-label="Requerimentos" onclick="window.switchSection('modulo-requerimentos', this)"><i class="fas fa-file-signature"></i></div>
        <div class="dock-item" data-label="Licenças" onclick="window.switchSection('modulo-avais', this)"><i class="fas fa-calculator"></i></div>
        <div class="dock-item" data-label="Feedbacks" onclick="window.switchSection('modulo-feedbacks', this)"><i class="fas fa-comments"></i></div>
        <div class="dock-item" data-label="Controle Grupos" onclick="window.switchSection('modulo-grupos', this)"><i class="fas fa-users"></i></div>
    `;
    if (ehLideranca) {
        dockHtml += `
            <div class="dock-separator"></div>
            <div class="dock-item" data-label="Correções" onclick="window.switchSection('modulo-correcoes', this)"><i class="fas fa-check-double"></i></div>
            <div class="dock-item" data-label="Estrelas" onclick="window.switchSection('modulo-estrelas', this)"><i class="fas fa-star"></i></div>
            <div class="dock-item dock-command" data-label="Configurações da Liderança" onclick="window.toggleCommand()"><i class="fas fa-bolt"></i></div>
        `;
    }

    
    if (dock) {
        dock.innerHTML = dockHtml;
        dock.classList.add('active'); // show dock
    }
    
    if (cmd && ehSuperLideranca) {
                        cmd.innerHTML = `
            <div class="cmd-tile" onclick="window.switchSection('modulo-revisao'); window.toggleCommand();"><i class="fas fa-search"></i><span>Revisão</span></div>
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
            let n = u.nivel.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return n === 'LIDER' || n === 'ADMIN' || n === 'LIDERANCA';
        });
        if(lider && lider.nick) liderNick = lider.nick;
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
    av.style.right = '-150px'; 
    bubble.classList.remove('visible');

    setTimeout(() => {
        av.style.right = '20px'; // Caminha pro centro do espaço
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
