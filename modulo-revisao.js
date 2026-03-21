/*
* Módulo: Revisão de Correções (Exclusivo Líder, Vice e Admin)
* Puxa e agrupa as correções já feitas da planilha para visualização de fiscalização.
*/

window.listenerRevisao = null;

window.solicitarLevantamento = function() {
    let dInicio = document.getElementById('rev-data-inicio').value;
    let dFim = document.getElementById('rev-data-fim').value;

    if (!dInicio || !dFim) return window.mostrarToast("Selecione a data de início e de fim para a busca.", "error");

    let statusArea = document.getElementById('rev-status-area');
    let resultsArea = document.getElementById('rev-results-area');
    
    statusArea.style.display = 'block';
    resultsArea.style.display = 'none';
    statusArea.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x" style="color:var(--sup-neon)"></i><br><br><span style="color:var(--text-main); font-size:15px;">Enviando comando para a planilha... Aguarde a sincronização (pode levar até 5 minutos).</span>';

    // Grava o comando na Fila para o Google Apps Script rodar
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
    if (window.listenerRevisao) window.listenerRevisao(); // Cancela o anterior se existir

    window.listenerRevisao = window.db.collection("sistema").doc("comando_revisao").onSnapshot(doc => {
        if (doc.exists && doc.data().status === "CONCLUIDO") {
            window.listenerRevisao(); // Parar de escutar
            window.renderizarResultadosRevisao();
        }
    });
}

window.renderizarResultadosRevisao = async function() {
    let statusArea = document.getElementById('rev-status-area');
    let resultsArea = document.getElementById('rev-results-area');
    let lista = document.getElementById('rev-lista');
    
    statusArea.innerHTML = '<i class="fas fa-circle-notch fa-spin fa-2x" style="color:var(--sup-neon)"></i><br><br><span style="color:var(--text-main); font-size:15px;">Baixando os dados agrupados...</span>';

    let docs = [];
    let snap = await window.db.collection("revisao_correcoes").orderBy("dataTimeStamp", "asc").get();
    
    snap.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
    });

    statusArea.style.display = 'none';
    resultsArea.style.display = 'flex';
    lista.innerHTML = '';

    if (docs.length === 0) {
        lista.innerHTML = `<div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(251,191,36, 0.4); padding: 40px 20px; border-radius: 12px; text-align:center;">
            <i class="fas fa-folder-open" style="color: var(--sup-neon); font-size: 40px; margin-bottom: 15px;"></i>
            <h3 style="color: var(--sup-neon); font-size: 18px;">Nenhuma correção encontrada.</h3>
            <p style="color: var(--text-sub); font-size: 14px;">Não localizamos atividades avaliadas neste intervalo de datas específico na planilha.</p>
        </div>`;
        return;
    }

    let grupos = {};
    docs.forEach(d => {
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
            
            // Definição correta das nomenclaturas baseadas no tipo de atividade
            let labelPostador = d.tipo === 'Relatórios' ? 'Auxiliar:' : 'Supervisor:';
            let labelAvaliador = 'Responsável:';
            
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

            // Exibir dados extras se for relatório
            let extraRelatorios = '';
            if (d.tipo === 'Relatórios') {
                extraRelatorios = `<div style="font-size:13px; margin-top:8px; display:flex; gap:15px; flex-wrap:wrap; background:rgba(255,255,255,0.02); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);"><div style="color:var(--text-sub);">Grupo: <span style="color:#fff; font-weight:bold;">${d.grupo || '-'}</span></div><div style="color:var(--text-sub);">Data Ref: <span style="color:#fff; font-weight:bold;">${d.dataReferencia || '-'}</span></div></div>`;
            }

            let justHtml = d.justificativa && d.justificativa !== "" ? `<div style="margin-top:10px; font-size:13px; color:var(--text-sub); border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;"><strong><i class="fas fa-comment-dots"></i> Justificativa(s) na Planilha:</strong> <span style="color:#fff;">${d.justificativa}</span></div>` : '';
            
            // Regra Visual rigorosa: Se Válido E sem desconto E nota 100, Fica verde. Do contrário, Vermelho.
            let corNota = '#4caf50'; // Default verde
            let nInfo = d.notaInfo.toLowerCase();
            
            if (nInfo.includes('inválido') || 
                (nInfo.includes('descontos:') && !nInfo.includes('descontos: 0')) || 
                (nInfo.includes('incorreções:') && !nInfo.includes('incorreções: 0')) || 
                (nInfo.includes('nota final:') && !nInfo.includes('nota final: 100'))) {
                corNota = '#ff2a2a'; // Vermelho (Houve desconto, erro ou invalidação)
            }

            cardsHtml += `
            <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(251,191,36,0.1); border-radius:8px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div>
                        <div style="color:var(--sup-neon); font-size:12px; font-weight:bold; text-transform:uppercase; margin-bottom:5px;">${d.tipo} <span style="color:#666; margin:0 5px;">|</span> <span style="color:var(--text-sub);"><i class="far fa-clock"></i> ${d.dataPostagem}</span></div>
                        <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:10px;">
                            <div style="font-size:14px; display:flex; align-items:center;"><span style="color:var(--text-sub); width:85px;">${labelPostador}</span> ${window.gerarAvatarNick(d.nick)} ${btnRelatorioAnterior}</div>
                            <div style="font-size:14px; display:flex; align-items:center;"><span style="color:var(--text-sub); width:85px;">${labelAvaliador}</span> ${window.gerarAvatarNick(d.avaliador)}</div>
                        </div>
                        ${extraRelatorios}
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