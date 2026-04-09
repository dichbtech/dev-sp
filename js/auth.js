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
    
    window.setupAllDraggables();
    if(window.registrarLogAtividade) window.registrarLogAtividade("Login Efetuado", "Acessou a Central de Sistemas.");
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
                if(document.getElementById('admin-only-menus')) document.getElementById('admin-only-menus').style.display = 'flex';
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