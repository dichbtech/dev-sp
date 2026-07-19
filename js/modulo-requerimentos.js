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

    let nick = "Admin";
    let cargo = "Supervisor";
    if (window.sessionData) {
        nick = window.sessionData.nick_usuario || nick;
        cargo = window.sessionData.cargo_usuario || cargo;
    }

    let formData = {
        nick_autor: nick,
        cargo_autor: cargo,
        data_hora_envio: dataHoraEnvio,
        aba_submetida: abaAtivaId
    };

    let hasError = false;

    if (abaAtivaId === 'tab-relatorios') {
        formData.link = getVal('relatorio_link');
        formData.natureza = getVal('relatorio_natureza');
        
        if (!formData.link || !formData.natureza) hasError = true;

        if (formData.natureza === 'Grupo de Controle') {
            formData.publico_alvo = getVal('relatorio_publico_alvo');
            if (!formData.publico_alvo) hasError = true;
        } else if (formData.natureza === 'Grupo de Promoções') {
            formData.data_referencia = getVal('relatorio_data_referencia');
            if (!formData.data_referencia) hasError = true;
        }
    } 
    else if (abaAtivaId === 'tab-soldados') {
        formData.link = getVal('soldados_link');
        if (!formData.link) hasError = true;
    }
    else if (abaAtivaId === 'tab-grupos') {
        formData.link = getVal('grupos_link');
        if (!formData.link) hasError = true;
    }
    else if (abaAtivaId === 'tab-convites') {
        formData.nick_convidado = getVal('convite_nick');
        formData.data_inicio = getVal('convite_data_inicio');
        formData.data_fim = getVal('convite_data_fim');
        formData.provas = getVal('convite_provas');
        formData.status = getVal('convite_status');

        if (!formData.nick_convidado || !formData.data_inicio || !formData.data_fim || !formData.provas || !formData.status) {
            hasError = true;
        }
    }
    else if (abaAtivaId === 'tab-ppp') {
        formData.nick_promovido = getVal('ppp_promovido');
        formData.nick_promotor = getVal('ppp_promotor');
        formData.id_promocao = getVal('ppp_id');
        formData.provas = getVal('ppp_provas');

        if (!formData.nick_promovido || !formData.nick_promotor || !formData.id_promocao || !formData.provas) {
            hasError = true;
        }
    }

    if (hasError) {
        alert('Por favor, preencha todos os campos obrigatórios da aba ativa.');
        return;
    }

    console.log('=== DADOS DO FORMULÁRIO ENVIADO ===');
    console.log(JSON.stringify(formData, null, 2));
    console.log('===================================');

    alert('Formulário enviado com sucesso! Verifique o console.log (F12) para ver os dados gerados.');
    
    document.getElementById('activityFormRequerimentos').reset();
    window.resetConditionalFieldsRequerimentos();
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
