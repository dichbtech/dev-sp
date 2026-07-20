window.switchTabRequerimentos = function(tabId, btnElement) {
    document.querySelectorAll('#tabs-formulario .btn-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#modulo-requerimentos .form-tab-content').forEach(c => c.classList.remove('active'));

    btnElement.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    window.resetConditionalFieldsRequerimentos();
};

window.handleNaturezaChangeRequerimentos = function() {
    const natureza = document.getElementById('relatorio_natureza').value;
    const containerPublicoAlvo = document.getElementById('container_publico_alvo');
    const containerDataRef = document.getElementById('container_data_referencia');
    const inputPublicoAlvo = document.getElementById('relatorio_publico_alvo');
    const inputDataRef = document.getElementById('relatorio_data_referencia');

    if (natureza === "Grupo de Controle") {
        containerPublicoAlvo.style.display = 'block';
        inputPublicoAlvo.required = true;
        containerDataRef.style.display = 'none';
        inputDataRef.required = false;
        inputDataRef.value = '';
    } else if (natureza === "Grupo de Promoções") {
        containerDataRef.style.display = 'block';
        inputDataRef.required = true;
        containerPublicoAlvo.style.display = 'none';
        inputPublicoAlvo.required = false;
        inputPublicoAlvo.value = '';
    } else {
        containerPublicoAlvo.style.display = 'none';
        inputPublicoAlvo.required = false;
        containerDataRef.style.display = 'none';
        inputDataRef.required = false;
    }
};

window.resetConditionalFieldsRequerimentos = function() {
    const natureza = document.getElementById('relatorio_natureza');
    if (natureza) {
        natureza.value = "";
        window.handleNaturezaChangeRequerimentos();
    }
};

window.submitFormRequerimentos = function(event) {
    event.preventDefault();

    const abaAtivaId = document.querySelector('#modulo-requerimentos .form-tab-content.active').id;
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : '';

    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    const horas = String(dataAtual.getHours()).padStart(2, '0');
    const minutos = String(dataAtual.getMinutes()).padStart(2, '0');
    const dataHoraEnvio = `${dia}/${mes}/${ano} ${horas}:${minutos}`;

    let nick = window.usuarioLogadoNick || "Admin";
    let cargo = window.cargoUsuarioGlobal || "Supervisor";

    let formData = {
        tipo: '',
        nick: nick,
        cargo: cargo,
        dataPostagem: dataHoraEnvio,
        avaliado: false,
        lixo: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    let hasError = false;

    if (abaAtivaId === 'tab-relatorios') {
        formData.tipo = 'Relatórios';
        formData.link = getVal('relatorio_link');
        formData.natureza = getVal('relatorio_natureza');
        
        if (!formData.link || !formData.natureza) hasError = true;

        if (formData.natureza === 'Grupo de Controle') {
            formData.publicoAlvo = getVal('relatorio_publico_alvo');
            if (!formData.publicoAlvo) hasError = true;
        } else if (formData.natureza === 'Grupo de Promoções') {
            formData.dataReferencia = getVal('relatorio_data_referencia');
            if (!formData.dataReferencia) hasError = true;
        }
    } 
    else if (abaAtivaId === 'tab-soldados') {
        formData.tipo = 'Soldados';
        formData.link = getVal('soldados_link');
        if (!formData.link) hasError = true;
    }
    else if (abaAtivaId === 'tab-grupos') {
        formData.tipo = 'Grupos';
        formData.link = getVal('grupos_link');
        if (!formData.link) hasError = true;
    }
    else if (abaAtivaId === 'tab-convites') {
        formData.tipo = 'Convites';
        formData.nickConvidado = getVal('convite_nick');
        formData.dataAplicacao = dataHoraEnvio.split(' ')[0];
        formData.horaInicioFim = getVal('convite_data_inicio') + ' ~ ' + getVal('convite_data_fim');
        formData.link = getVal('convite_provas');
        formData.provas = getVal('convite_provas');
        formData.resposta = getVal('convite_status');

        if (!formData.nickConvidado || !getVal('convite_data_inicio') || !getVal('convite_data_fim') || !formData.link || !formData.resposta) {
            hasError = true;
        }
    }
    else if (abaAtivaId === 'tab-ppp') {
        formData.tipo = 'PPP';
        formData.nickPromovido = getVal('ppp_promovido');
        formData.nickPromotor = getVal('ppp_promotor');
        formData.idPromocao = getVal('ppp_id');
        formData.link = getVal('ppp_provas');
        formData.provas = getVal('ppp_provas');

        if (!formData.nickPromovido || !formData.nickPromotor || !formData.idPromocao || !formData.link) {
            hasError = true;
        }
    }

    if (hasError) {
        window.customAlert('Por favor, preencha todos os campos obrigatórios da aba ativa.', 'Atenção');
        return;
    }

    db.collection('atividades_pendentes').add(formData).then(() => {
        window.customAlert('Atividade submetida com sucesso! Aguarde a correção da liderança.', 'Enviado');
        document.getElementById('activityFormRequerimentos').reset();
        window.resetConditionalFieldsRequerimentos();
    }).catch(err => {
        window.customAlert('Erro ao enviar atividade: ' + err.message, 'Erro');
    });
};

window.aplicarRestricoesRequerimentos = function() {
    let lvl = window.nivelUsuarioGlobal;
    
    // Restrição para Supervisor
    if (lvl === 'SUPERVISOR') {
        const tabRelatoriosBtn = document.querySelector('button[data-target="tab-relatorios"]');
        const tabRelatoriosContent = document.getElementById('tab-relatorios');
        
        if (tabRelatoriosBtn) tabRelatoriosBtn.style.display = 'none';
        if (tabRelatoriosContent) tabRelatoriosContent.style.display = 'none';
        
        // Força a mudança de aba se a atual for a bloqueada
        if (tabRelatoriosBtn && tabRelatoriosBtn.classList.contains('active')) {
            const btnSoldados = document.querySelector('button[data-target="tab-soldados"]');
            if (btnSoldados) {
                window.switchTabRequerimentos('tab-soldados', btnSoldados);
            }
        }
    }
    
    // Altera nome da aba PPP
    const btnPPP = document.querySelector('button[data-target="tab-ppp"]');
    if (btnPPP) {
        btnPPP.innerText = 'Fiscalização do Procedimento Pós-Promoção';
    }
    const h4PPP = document.querySelector('#tab-ppp h4');
    if (h4PPP) {
        h4PPP.innerHTML = '<i class="fas fa-chart-line"></i> Fiscalização do Procedimento Pós-Promoção (PPP)';
    }
};
