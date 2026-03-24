/*
* Módulo: Revisão de Correções (Exclusivo Líder, Vice e Admin)
* Puxa e agrupa as correções já feitas da planilha para visualização de fiscalização.
*/

window.listenerRevisao = null;
window.dadosRevisaoGlobais = [];
window.tipoRevisaoAtual = 'Relatórios';

window.solicitarLevantamento = function() {
    let dInicio = document.getElementById('rev-data-inicio').value;
    let dFim = document.getElementById('rev-data-fim').value;

    if (!dInicio || !dFim) return window.mostrarToast("Selecione a data de início e de fim para a busca.", "error");

    let statusArea = document.getElementById('rev-status-area');
    let resultsArea = document.getElementById('rev-results-area');
    
    statusArea.style.display = 'block';
    resultsArea.style.display = 'none';
    statusArea.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x" style="color:var(--sup-neon)"></i><br><br><span style="color:var(--text-main); font-size:15px;">Enviando comando para a planilha... Aguarde a sincronização (pode levar até 5 minutos).</span>';

    window.db.collection("sistema").doc("comando_revisao").set({
        status: "PENDENTE",
        dataInicio: dInicio,
        dataFim: dFim,
        timestamp: new Date().getTime()
    }, { merge: true }).then(() => {
        window.iniciarEscutaComandoRevisao();
    });
}

window.iniciarEscutaComandoRevisao = function() {
    if (window.listenerRevisao) window.listenerRevisao();

    window.listenerRevisao = window.db.collection("sistema").doc("comando_revisao").onSnapshot(doc => {
        if (doc.exists && doc.data().status === "CONCLUIDO") {
            window.listenerRevisao(); 
            window.carregarDadosDoBanco();
        }
    });
}

window.carregarDadosDoBanco = async function() {
    let statusArea = document.getElementById('rev-status-area');
    statusArea.innerHTML = '<i class="fas fa-circle-notch fa-spin fa-2x" style="color:var(--sup-neon)"></i><br><br><span style="color:var(--text-main); font-size:15px;">Baixando os dados agrupados...</span>';

    window.dadosRevisaoGlobais = [];
    let snap = await window.db.collection("revisao_correcoes").orderBy("dataTimeStamp", "asc").get();
    
    snap.forEach(doc => {
        window.dadosRevisaoGlobais.push({ id: doc.id, ...doc.data() });
    });

    statusArea.style.display = 'none';
    document.getElementById('rev-results-area').style.display = 'flex';
    
    // Reseta o menu de abas para o padrão
    window.filtrarRevisao('Relatórios', document.querySelector('#tabs-revisao .btn-tab:nth-child(1)'));
}

window.filtrarRevisao = function(tipo, btnElement) {
    window.tipoRevisaoAtual = tipo;
    
    document.querySelectorAll('#tabs-revisao .btn-tab').forEach(el => el.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    window.renderizarListaRevisao();
}

window.renderizarListaRevisao = function() {
    let lista = document.getElementById('rev-lista');
    lista.innerHTML = '';

    // Filtra os dados em memória com base na aba atual clicada
    let dadosFiltrados = window.dadosRevisaoGlobais.filter(d => d.tipo === window.tipoRevisaoAtual);

    if (dadosFiltrados.length === 0) {
        lista.innerHTML = `<div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(251,191,36, 0.4); padding: 40px 20px; border-radius: 12px; text-align:center;">
            <i class="fas fa-folder-open" style="color: var(--sup-neon); font-size: 40px; margin-bottom: 15px;"></i>
            <h3 style="color: var(--sup-neon); font-size: 18px;">Nenhuma correção encontrada.</h3>
            <p style="color: var(--text-sub); font-size: 14px;">Não localizamos atividades avaliadas de <b>${window.tipoRevisaoAtual}</b> neste intervalo.</p>
        </div>`;
        return;
    }

    let grupos = {};
    dadosFiltrados.forEach(d => {
        let dia = d.dataPostagem.split(' ')[0]; // Extrai só DD/MM/YYYY
        if (!grupos[dia]) grupos[dia] = [];
        grupos[dia].push(d);
    });

    let getDiaSemana = (dataString) => {
        let p = dataString.split('/');
        let d = new Date(p[2], p[1]-1, p[0]);
        let nomes = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        return nomes[d.getDay()];
    };

    for (let dia in grupos) {
        let headerHtml = `<div style="background: linear-gradient(90deg, rgba(251,191,36,0.15) 0%, transparent 100%); border-left: 4px solid var(--sup-neon); padding: 12px 20px; margin-top: 25px; margin-bottom: 15px; border-radius: 4px; color: #fff; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display:flex; align-items:center; gap:10px;"><i class="far fa-calendar-alt"></i> ${getDiaSemana(dia)} - ${dia} <span style="background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:12px; font-size:12px;">${grupos[dia].length} Ativ.</span></div>`;
        
        let cardsHtml = '';
        grupos[dia].forEach(d => {
            
            let labelPostador = d.tipo === 'Relatórios' ? 'Auxiliar:' : 'Supervisor:';
            let labelAvaliador = 'Responsável:';
            
            // Botão Principal de Link
            let btnLink = '';
            if (d.link.startsWith('http')) {
                if (d.tipo === 'Relatórios' || d.tipo === 'Grupos' || d.tipo === 'Soldados') {
                    btnLink = `<button class="btn-tech" style="padding: 4px 10px; font-size: 11px;" data-url="${d.link}" onclick="window.abrirLinkIframe(this.getAttribute('data-url'))"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
                } else {
                    btnLink = `<button class="btn-tech" style="padding: 4px 10px; font-size: 11px;" data-url="${d.link}" onclick="window.open(this.getAttribute('data-url'), '_blank')"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
                }
            }
            
            // Botão Relatório Anterior (Apenas para Grupos e Soldados)
            let btnRelatorioAnterior = '';
            if ((d.tipo === 'Grupos' || d.tipo === 'Soldados') && d.linkAnterior) {
                btnRelatorioAnterior = `<button onclick="window.open('${d.linkAnterior}', '_blank')" style="background: rgba(251,191,36,0.1); border: 1px solid var(--sup-neon); color: var(--sup-neon); padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer; text-transform: uppercase; font-weight: bold; margin-left: 8px; transition: 0.3s; display:inline-flex; align-items:center; gap:4px;" onmouseover="this.style.background='var(--sup-neon)'; this.style.color='#000';" onmouseout="this.style.background='rgba(251,191,36,0.1)'; this.style.color='var(--sup-neon)';"><i class="fas fa-history"></i> Relatório Anterior</button>`;
            }

            // Exibir Detalhes Extras como na Correção Real
            let detalhesExtras = '';
            if (d.tipo === 'Relatórios') {
                detalhesExtras = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Ref.</strong><span style="color:#fff; font-size:13px;">${d.dataReferencia || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Grupo Associado</strong><span style="color:#fff; font-size:13px;">${d.grupo || '-'}</span></div>
                </div>`;
            } else if (d.tipo === 'Convites') {
                detalhesExtras = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Aplicação</strong><span style="color:#fff; font-size:13px;">${d.dataAplicacao || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Convidado</strong><span style="color:#fff; font-size:13px;">${d.nickConvidado || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Hora (Início ~ Fim)</strong><span style="color:#fff; font-size:13px;">${d.horaInicioFim || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Resposta</strong><span style="color:#fff; font-size:13px;">${d.resposta || '-'}</span></div>
                </div>`;
            } else if (d.tipo === 'PPP') {
                let idLnk = d.idPromocao ? `<a href="https://dic.systemhb.net/promocao/ver/${d.idPromocao}" target="_blank" style="color:var(--sup-neon); text-decoration:none; font-weight:600;">${d.idPromocao} <i class="fas fa-external-link-alt"></i></a>` : '-';
                detalhesExtras = `<div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">ID Promoção</strong><span style="color:#fff; font-size:13px;">${idLnk}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promotor</strong><span style="color:#fff; font-size:13px;">${d.nickPromotor || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promovido</strong><span style="color:#fff; font-size:13px;">${d.nickPromovido || '-'}</span></div>
                </div>`;
            }

            let justHtml = d.justificativa && d.justificativa.trim() !== "" ? `<div style="margin-top:10px; font-size:13px; color:var(--text-sub); border-top:1px dashed rgba(255,255,255,0.1); padding-top:10px;"><strong><i class="fas fa-comment-dots"></i> Justificativa(s) na Planilha:</strong> <span style="color:#fff;">${d.justificativa}</span></div>` : '';
            
            // Regra Visual exigida: Se houver qualquer justificativa (Nota inserida na planilha), fica VERMELHO. Se não houver, VERDE.
            let corNota = (d.justificativa && d.justificativa.trim() !== "") ? '#ff2a2a' : '#4caf50';

            cardsHtml += `
            <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(251,191,36,0.1); border-radius:8px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div style="flex: 1;">
                        <div style="color:var(--text-sub); font-size:12px; font-weight:bold; margin-bottom:10px;"><i class="far fa-clock"></i> Postado em: ${d.dataPostagem}</div>
                        <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
                            <div style="font-size:14px; display:flex; align-items:center;"><span style="color:#fff; font-weight:600; width:85px;">${labelPostador}</span> ${window.gerarAvatarNick(d.nick)} ${btnRelatorioAnterior}</div>
                            <div style="font-size:14px; display:flex; align-items:center;"><span style="color:#fff; font-weight:600; width:85px;">${labelAvaliador}</span> ${window.gerarAvatarNick(d.avaliador)}</div>
                        </div>
                        ${detalhesExtras}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                        <span style="background:rgba(0,0,0,0.6); padding:6px 12px; border-radius:6px; font-weight:bold; font-size:13px; color:${corNota}; border: 1px solid ${corNota}33;">${d.notaInfo}</span>
                        ${btnLink}
                    </div>
                </div>
                ${justHtml}
            </div>
            `;
        });

        lista.innerHTML += headerHtml + cardsHtml;
    }
}

window.concluirRevisao = async function() {
    if (!confirm("Você tem certeza? Isso irá apagar todos os dados de fiscalização carregados e limpar o sistema para o próximo levantamento.")) return;

    let btn = document.querySelector('button[onclick="window.concluirRevisao()"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Apagando dados...';
    btn.disabled = true;

    let snap = await window.db.collection("revisao_correcoes").get();
    
    for (let doc of snap.docs) {
        await window.db.collection("revisao_correcoes").doc(doc.id).delete();
    }
    
    await window.db.collection("sistema").doc("comando_revisao").set({ status: "FINALIZADO" }, { merge: true });

    document.getElementById('rev-results-area').style.display = 'none';
    document.getElementById('rev-data-inicio').value = '';
    document.getElementById('rev-data-fim').value = '';
    
    window.mostrarToast("Revisão concluída e dados apagados com sucesso!", "success");
    window.registrarLogAtividade("Revisão de Correções", "Concluiu e limpou a revisão de um período de atividades.");
    
    btn.innerHTML = '<i class="fas fa-trash-alt"></i> Concluir Revisão (Apagar Dados)';
    btn.disabled = false;
}