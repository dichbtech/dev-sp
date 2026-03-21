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

    // Agrupando por Data
    let grupos = {};
    docs.forEach(d => {
        let dia = d.dataPostagem.split(' ')[0]; // Extrai só DD/MM/YYYY
        if (!grupos[dia]) grupos[dia] = [];
        grupos[dia].push(d);
    });

    // Função de formatação de Dia da Semana
    let getDiaSemana = (dataString) => {
        let p = dataString.split('/');
        let d = new Date(p[2], p[1]-1, p[0]);
        let nomes = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        return nomes[d.getDay()];
    };

    // Renderizar os grupos
    for (let dia in grupos) {
        let headerHtml = `<div style="background: linear-gradient(90deg, rgba(251,191,36,0.15) 0%, transparent 100%); border-left: 4px solid var(--sup-neon); padding: 12px 20px; margin-top: 25px; margin-bottom: 15px; border-radius: 4px; color: #fff; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display:flex; align-items:center; gap:10px;"><i class="far fa-calendar-alt"></i> ${getDiaSemana(dia)} - ${dia} <span style="background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:12px; font-size:12px;">${grupos[dia].length} Ativ.</span></div>`;
        
        let cardsHtml = '';
        grupos[dia].forEach(d => {
            
            let btnLink = '';
            if (d.link.startsWith('http')) {
                if (d.tipo === 'Relatórios' || d.tipo === 'Grupos' || d.tipo === 'Soldados') {
                    btnLink = `<button class="btn-tech" style="padding: 4px 10px; font-size: 11px;" data-url="${d.link}" onclick="window.abrirLinkIframe(this.getAttribute('data-url'))"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
                } else {
                    btnLink = `<button class="btn-tech" style="padding: 4px 10px; font-size: 11px;" data-url="${d.link}" onclick="window.open(this.getAttribute('data-url'), '_blank')"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
                }
            }

            let justHtml = d.justificativa && d.justificativa !== "" ? `<div style="margin-top:10px; font-size:13px; color:var(--text-sub); border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;"><strong><i class="fas fa-comment-dots"></i> Justificativa:</strong> <span style="color:#fff;">${d.justificativa}</span></div>` : '';
            
            let corNota = d.notaInfo.includes('Inválido') || d.notaInfo.includes('Descontos: ') && !d.notaInfo.includes('Descontos: 0') ? '#ff2a2a' : '#4caf50';

            cardsHtml += `
            <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(251,191,36,0.1); border-radius:8px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div>
                        <div style="color:var(--sup-neon); font-size:12px; font-weight:bold; text-transform:uppercase; margin-bottom:5px;">${d.tipo} <span style="color:#666; margin:0 5px;">|</span> <span style="color:var(--text-sub);"><i class="far fa-clock"></i> ${d.dataPostagem}</span></div>
                        <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
                            <div style="font-size:14px;"><span style="color:var(--text-sub);">Postador:</span> ${window.gerarAvatarNick(d.nick)}</div>
                            <div style="font-size:14px;"><span style="color:var(--text-sub);">Avaliado por:</span> ${window.gerarAvatarNick(d.avaliador)}</div>
                        </div>
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

    // Apaga toda a coleção temp de revisão
    let snap = await window.db.collection("revisao_correcoes").get();
    
    // Deleta os documentos um a um (seguro para o lado do cliente)
    for (let doc of snap.docs) {
        await window.db.collection("revisao_correcoes").doc(doc.id).delete();
    }
    
    // Reseta o comando
    await window.db.collection("sistema").doc("comando_revisao").set({ status: "FINALIZADO" }, { merge: true });

    document.getElementById('rev-results-area').style.display = 'none';
    document.getElementById('rev-data-inicio').value = '';
    document.getElementById('rev-data-fim').value = '';
    
    window.mostrarToast("Revisão concluída e dados apagados com sucesso!", "success");
    window.registrarLogAtividade("Revisão de Correções", "Concluiu e limpou a revisão de um período de atividades.");
    
    btn.innerHTML = '<i class="fas fa-trash-alt"></i> Concluir Revisão (Apagar Dados)';
    btn.disabled = false;
}