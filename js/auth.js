window.liberarPainel = function() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'none';
    document.getElementById('loginScreen').style.opacity = '0';
    
    setTimeout(() => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'flex';
    }, 300);
    
    document.getElementById('data-consulta').valueAsDate = new Date();
    
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const elementoMes = document.getElementById('mes-atual');
    if (elementoMes) {
        elementoMes.innerText = meses[new Date().getMonth()] + " de " + new Date().getFullYear();
    }
    
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
    
    window.setupAllDraggables();
    
    if(window.registrarLogAtividade) window.registrarLogAtividade("Login Efetuado", "Acessou a Central de Sistemas.");
}

// ================================================================
// LÓGICA DE AUTENTICAÇÃO BLINDADA (REDIRECT EM VEZ DE POPUP)
// ================================================================

// 1. Monitora o estado da autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        window.usuarioLogadoEmail = user.email.toLowerCase();
        window.verificarAcessoBD(window.usuarioLogadoEmail);
    } else {
        document.getElementById('appWrapper').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        document.getElementById('loginScreen').style.display = 'flex';
        setTimeout(() => { document.getElementById('loginScreen').style.opacity = '1'; }, 10);
    }
});

// 2. Captura o resultado do redirecionamento após o login
auth.getRedirectResult().catch((error) => {
    console.error("Erro ao retornar do login:", error);
    document.getElementById('loginLoader').style.display = 'none';
    document.getElementById('loginCard').style.display = 'block';
});

// 3. Função de Login por Redirecionamento (Evita bloqueio COOP/Popups)
window.loginGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Força o Google a pedir a conta sempre, evitando logins automáticos bugados
    provider.setCustomParameters({ prompt: 'select_account' });
    
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'block';
    
    auth.signInWithRedirect(provider);
}
// ================================================================

window.verificarAcessoBD = async function(email) {
    try {
        let authEmail = email.toLowerCase().trim();
        
        let planSnap = await window.db.collection("sistema").doc("acessos_planilha").get();
        if (planSnap.exists && planSnap.data().dados) {
            try { window.planilhaAcessos = JSON.parse(planSnap.data().dados); } catch (e) {}
        }
        
        let manualSnap = await window.db.collection("acessos").get();
        window.acessosData = [];
        manualSnap.forEach(doc => { window.acessosData.push({ id: doc.id, ...doc.data() }); });

        if (window.acessosData.length === 0 && Object.keys(window.planilhaAcessos || {}).length === 0) {
            await window.db.collection("acessos").doc(authEmail).set({ email: authEmail, nick: 'Admin', nivel: "LIDER" });
            window.location.reload(); return;
        }

        let userManual = window.acessosData.find(u => (u.email || '').toLowerCase().trim() === authEmail);
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
            
            let lvl = window.nivelUsuarioGlobal;

            if (lvl === 'COMANDO') {
                window.customAlert("Acesso de Comando restrito ao Painel Público.", "Aviso");
                setTimeout(() => { auth.signOut(); window.location.href = "https://dichbtech.github.io/estrelas"; }, 3000);
                return;
            }

            // Controle de Menus
            const menus = {
                avais: document.getElementById('menu-avais'),
                feedbacks: document.getElementById('menu-feedbacks'),
                estrelas: document.getElementById('menu-estrelas'),
                correcoes: document.getElementById('menu-correcoes'),
                revisao: document.getElementById('menu-revisao'),
                admin: document.getElementById('admin-only-menus')
            };

            if (lvl === 'SUPERVISOR') {
                ['avais', 'feedbacks', 'estrelas', 'correcoes', 'revisao'].forEach(m => { if(menus[m]) menus[m].style.display = 'none'; });
            } 
            else if (lvl === 'AUXILIAR') {
                ['estrelas', 'correcoes', 'revisao'].forEach(m => { if(menus[m]) menus[m].style.display = 'none'; });
            } 
            else if (lvl === 'SUB-LIDER') {
                if(document.getElementById('admin-drag-controls')) document.getElementById('admin-drag-controls').style.display = 'flex';
                if(menus.revisao) menus.revisao.style.display = 'none';
            } 
            else if (['VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl)) {
                if(menus.admin) menus.admin.style.display = 'flex';
                if(document.getElementById('admin-drag-controls')) document.getElementById('admin-drag-controls').style.display = 'flex';
                window.renderTabelaAcessos();
            }
            
            window.liberarPainel();
        } else {
            window.customAlert(`ACESSO NEGADO.<br><br>O e-mail <b>${authEmail}</b> não tem permissão.`, "Falha");
            setTimeout(() => auth.signOut(), 5000);
        }
    } catch (err) {
        console.error(err);
    }
}

window.fazerLogout = function() { 
    if(window.registrarLogAtividade) window.registrarLogAtividade("Logout", "Saiu do sistema.");
    auth.signOut(); 
}

window.abrirSystemDIC = function() {
    window.open('https://dic.systemhb.net/divisao/supervisores', '_blank');
}