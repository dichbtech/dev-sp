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
    document.getElementById('mes-atual').innerText = meses[new Date().getMonth()] + " de " + new Date().getFullYear();
    
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

// CORREÇÃO: Aplicando a persistência LOCAL antes de checar a mudança de estado.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
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
  })
  .catch((error) => {
      console.error("Erro na persistência de autenticação:", error);
  });

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

        if (window.acessosData.length === 0 && Object.keys(window.planilhaAcessos).length === 0) {
            await window.db.collection("acessos").doc(authEmail).set({ email: authEmail, nick: 'Admin', nivel: "LIDER" });
            window.location.reload(); return;
        }

        let userManual = window.acessosData.find(u => (u.email || '').toLowerCase().trim() === authEmail);
        let userPlan = null;
        for (let key in window.planilhaAcessos) {
            if (key.toLowerCase().trim() === authEmail) { userPlan = window.planilhaAcessos[key]; break; }
        }

        let autorizado = false;

        if (userPlan && (userPlan.nivel.includes("LIDER") || userPlan.nivel.includes("VICE") || userPlan.nivel.includes("ADMIN"))) {
            autorizado = true; window.nivelUsuarioGlobal = userPlan.nivel; window.usuarioLogadoNick = userPlan.nick;
        } else if (userManual) {
            autorizado = true; window.nivelUsuarioGlobal = userManual.nivel; window.usuarioLogadoNick = userManual.nick;
        } else if (userPlan) {
            autorizado = true; window.nivelUsuarioGlobal = userPlan.nivel; window.usuarioLogadoNick = userPlan.nick;
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

            let menuAvais = document.getElementById('menu-avais');
            let menuFeedbacks = document.getElementById('menu-feedbacks');
            let menuEstrelas = document.getElementById('menu-estrelas');
            let menuGrupos = document.getElementById('menu-grupos');
            let menuCorrecoes = document.getElementById('menu-correcoes'); 
            let menuAdmin = document.getElementById('admin-only-menus');
            let menuRevisao = document.getElementById('menu-revisao');
            
            let dragControls = document.getElementById('admin-drag-controls');
            let btnEditPos = document.getElementById('btn-edit-pos');
            let btnSavePos = document.querySelector('button[onclick="window.savePositions()"]');
            let dicaResize = document.getElementById('dica-resize');

            if (lvl === 'SUPERVISOR') {
                if(menuAvais) menuAvais.style.display = 'none';
                if(menuFeedbacks) menuFeedbacks.style.display = 'none';
                if(menuEstrelas) menuEstrelas.style.display = 'none';
                if(menuCorrecoes) menuCorrecoes.style.display = 'none';
                if(menuRevisao) menuRevisao.style.display = 'none';
            } 
            else if (lvl === 'AUXILIAR') {
                if(menuEstrelas) menuEstrelas.style.display = 'none';
                if(menuCorrecoes) menuCorrecoes.style.display = 'none';
                if(menuRevisao) menuRevisao.style.display = 'none';
            } 
            else if (lvl === 'SUB-LIDER') {
                if(dragControls) dragControls.style.display = 'flex';
                if(btnEditPos) btnEditPos.style.display = 'none';
                if(btnSavePos) btnSavePos.style.display = 'none';
                if(dicaResize) dicaResize.style.display = 'none';
                if(menuCorrecoes && window.carregarAtividadesPendentes) window.carregarAtividadesPendentes();
                if(menuRevisao) menuRevisao.style.display = 'none';
            } 
            else if (lvl === 'VICE-LIDER' || lvl === 'LIDER' || lvl === 'ADMIN') {
                if(menuAdmin) menuAdmin.style.display = 'flex';
                if(dragControls) dragControls.style.display = 'flex';
                if(menuCorrecoes && window.carregarAtividadesPendentes) window.carregarAtividadesPendentes();
                window.renderTabelaAcessos();
                let boxPrivacidade = document.getElementById('box-editor-privacidade');
                if (boxPrivacidade) { boxPrivacidade.innerHTML = window.buildEditorHTML('editor-privacidade', 'Carregando...'); }
            }
            
            // NOVO: Lógica inteligente de Roteamento pós-login
            let path = window.location.pathname.replace('/', '').trim();
            if (path && path !== 'index.html') {
                let sectionId = 'modulo-' + path;
                let btnId = 'menu-' + path;
                if (document.getElementById(sectionId)) {
                    window.switchSection(sectionId, document.getElementById(btnId));
                } else {
                    window.switchSection('modulo-metas', document.getElementById('menu-metas'));
                }
            } else {
                window.switchSection('modulo-metas', document.getElementById('menu-metas'));
            }
            
            window.liberarPainel();
        } else {
            window.customAlert(`ACESSO NEGADO.<br><br>O e-mail <b>${authEmail}</b> não foi encontrado com permissões ativas.`, "Falha de Permissão");
            setTimeout(() => auth.signOut(), 5000);
        }
    } catch (err) {
        window.customAlert("Erro na comunicação com o banco de dados: " + err.message, "Erro Crítico");
    }
}

window.loginGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('loginLoader').style.display = 'block';
    
    auth.signInWithPopup(provider).catch(() => {
        document.getElementById('loginLoader').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
        document.getElementById('login-error').style.display = 'block';
    });
}

window.fazerLogout = function() { 
    if(window.registrarLogAtividade) window.registrarLogAtividade("Logout", "Saiu do sistema.");
    auth.signOut(); 
}

window.abrirSystemDIC = function() {
    window.open('https://dic.systemhb.net/divisao/supervisores', '_blank');
    if(window.registrarLogAtividade) {
        window.registrarLogAtividade("Acesso Externo", "Clicou para abrir o System DIC num separador novo.");
    }
}