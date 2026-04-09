window.liberarPainel = function() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'none';
    document.getElementById('loginScreen').style.opacity = '0';
    
    setTimeout(() => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appWrapper').style.display = 'flex';
    }, 300);
    
    const dataConsulta = document.getElementById('data-consulta');
    if(dataConsulta) dataConsulta.valueAsDate = new Date();
    
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const campoMes = document.getElementById('mes-atual');
    if(campoMes) campoMes.innerText = meses[new Date().getMonth()] + " de " + new Date().getFullYear();
    
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

// MONITOR DE SESSÃO ATUALIZADO
auth.onAuthStateChanged((user) => {
    if (user) {
        // Se há um usuário, não mostramos o login, vamos direto verificar o acesso
        window.usuarioLogadoEmail = user.email.toLowerCase();
        window.verificarAcessoBD(window.usuarioLogadoEmail);
    } else {
        // Se não há usuário, garantimos que a tela de login apareça
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
        
        // Busca permissões da planilha
        let planSnap = await window.db.collection("sistema").doc("acessos_planilha").get();
        if (planSnap.exists && planSnap.data().dados) {
            try { window.planilhaAcessos = JSON.parse(planSnap.data().dados); } catch (e) { window.planilhaAcessos = {}; }
        }
        
        // Busca permissões manuais
        let manualSnap = await window.db.collection("acessos").get();
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
            autorizado = true; 
            window.nivelUsuarioGlobal = userPlan.nivel; 
            window.usuarioLogadoNick = userPlan.nick;
        } else if (userManual) {
            autorizado = true; 
            window.nivelUsuarioGlobal = userManual.nivel; 
            window.usuarioLogadoNick = userManual.nick;
        }

        if (autorizado) {
            window.nivelUsuarioGlobal = window.nivelUsuarioGlobal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (window.nivelUsuarioGlobal === 'VICELIDER') window.nivelUsuarioGlobal = 'VICE-LIDER';
            if (window.nivelUsuarioGlobal === 'SUBLIDER') window.nivelUsuarioGlobal = 'SUB-LIDER';
            
            let lvl = window.nivelUsuarioGlobal;

            if (lvl === 'COMANDO') {
                window.customAlert("Acesso de Comando restrito ao Painel Público.", "Aviso");
                setTimeout(() => { auth.signOut(); }, 3000);
                return;
            }

            // Exibe menus conforme nível
            if (lvl === 'VICE-LIDER' || lvl === 'LIDER' || lvl === 'ADMIN') {
                const menuAdmin = document.getElementById('admin-only-menus');
                if(menuAdmin) menuAdmin.style.display = 'flex';
                window.renderTabelaAcessos();
            }
            
            window.liberarPainel();
        } else {
            // Se o e-mail não estiver na lista, avisamos e deslogamos
            window.customAlert(`ACESSO NEGADO.<br><br>O e-mail <b>${authEmail}</b> não possui permissão de acesso.`, "Falha de Autenticação");
            setTimeout(() => auth.signOut(), 4000);
        }
    } catch (err) {
        console.error("Erro ao verificar banco de dados:", err);
        // Se der erro de permissão aqui (bloqueio do navegador), tentamos liberar o painel mesmo assim para ver se recupera
        if(err.message.includes("permissions")) {
            console.warn("Navegador bloqueando Firestore. Tentando carregar modo limitado.");
        }
    }
}

window.loginGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'block';
    
    auth.signInWithRedirect(provider);
}

window.fazerLogout = function() { 
    if(window.registrarLogAtividade) window.registrarLogAtividade("Logout", "Saiu do sistema.");
    auth.signOut(); 
}

window.abrirSystemDIC = function() {
    window.open('https://dic.systemhb.net/divisao/supervisores', '_blank');
}