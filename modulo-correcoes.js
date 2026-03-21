/*
* Módulo: Correção de Atividades (Liderança)
* Responsável por puxar atividades da coleção 'atividades_pendentes' no Firebase, exibir e injetar a nota/correção nela mesma.
*/

window.carregarAtividadesPendentes = function() {
    let tipo = document.getElementById('sel-tipo-atividade').value;
    let container = document.getElementById('lista-atividades-pendentes');
    
    container.innerHTML = '<div style="color:var(--sup-neon); text-align:center; padding:20px;"><i class="fas fa-circle-notch fa-spin"></i> Buscando atividades pendentes...</div>';

    // A planilha (via GAS) envia para 'atividades_pendentes' com a key "avaliado: false".
    // Isso garante que apenas o que não for avaliado aparecerá aqui.
    window.db.collection("atividades_pendentes")
        .where("tipo", "==", tipo)
        .where("avaliado", "==", false)
        .get().then(snap => {
            container.innerHTML = '';
            if (snap.empty) {
                container.innerHTML = `<div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; text-align:center; color: var(--text-sub);">Nenhuma atividade pendente aguardando correção em ${tipo}. Parabéns à Liderança!</div>`;
                return;
            }

            snap.forEach(doc => {
                let d = doc.data();
                d.id = doc.id;
                container.appendChild(window.criarCardAtividade(d));
            });
        }).catch(err => {
            container.innerHTML = `<div style="color:#ff2a2a; text-align:center;">Erro ao carregar as atividades: ${err.message}</div>`;
        });
}

window.criarCardAtividade = function(d) {
    let div = document.createElement('div');
    div.style.background = "rgba(0,0,0,0.4)";
    div.style.border = "1px solid rgba(251,191,36,0.2)";
    div.style.borderRadius = "8px";
    div.style.padding = "20px";
    div.style.position = "relative";

    let infoHtml = ``;
    infoHtml += `<div style="font-size:12px; color:var(--text-sub); margin-bottom:10px; font-weight:600;"><i class="far fa-clock"></i> Postado em: ${d.dataPostagem || '-'}</div>`;
    infoHtml += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;"><span style="color:#fff; font-size:14px;">Postador:</span> ${window.gerarAvatarNick(d.nick)}</div>`;

    // Campos dinâmicos com base no tipo
    if (d.tipo === 'Relatórios') {
        infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Ref.</strong><span style="color:#fff;">${d.dataReferencia || '-'}</span></div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Grupo Associado</strong><span style="color:#fff;">${d.grupo || '-'}</span></div>
        </div>`;
    } else if (d.tipo === 'Convites') {
        infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Aplicação</strong><span style="color:#fff;">${d.dataAplicacao || '-'}</span></div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Convidado</strong>${window.gerarAvatarNick(d.nickConvidado)}</div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Hora (Início ~ Fim)</strong><span style="color:#fff;">${d.horaInicioFim || '-'}</span></div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Resposta</strong><span style="color:#fff;">${d.resposta || '-'}</span></div>
        </div>`;
    } else if (d.tipo === 'PPP') {
        let idLink = d.idPromocao ? `<a href="https://dic.systemhb.net/promocao/ver/${d.idPromocao}" target="_blank" style="color:var(--sup-neon); text-decoration:none; font-weight:600;">${d.idPromocao} <i class="fas fa-external-link-alt"></i></a>` : '-';
        infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">ID Promoção</strong>${idLink}</div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promotor</strong>${window.gerarAvatarNick(d.nickPromotor)}</div>
            <div style="grid-column: 1 / -1;"><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promovido</strong>${window.gerarAvatarNick(d.nickPromovido)}</div>
        </div>`;
    }

    let linkUrl = d.link || '';
    let btnLink = linkUrl.includes('http') ? `<button class="btn-tech" style="padding: 6px 12px; font-size: 13px;" onclick="window.abrirLinkIframe('${linkUrl}')"><i class="fas fa-eye"></i> Visualizar Anexo do Relatório</button>` : `<span style="color:#ff2a2a; font-size:13px; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Link do relatório inválido ou vazio</span>`;

    let inputsHtml = '';
    
    // Inputs Dinâmicos com base em regras
    if (d.tipo === 'Relatórios') {
        inputsHtml = `
            <div style="flex:1; min-width: 200px;"><label class="tech-label" style="font-size:11px;">Nota Final</label><div class="input-block" style="margin:0;"><input type="number" id="nota-${d.id}" placeholder="Nota de 0 a 100" min="0" max="100"></div></div>
        `;
    } else if (d.tipo === 'Grupos' || d.tipo === 'Soldados') {
        let ph = d.tipo === 'Grupos' ? 'Incorreções (Ex: 0 a 20)' : 'Qtd. Incorretos';
        inputsHtml = `
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Incorreções</label><div class="input-block" style="margin:0;"><input type="number" id="inc-${d.id}" placeholder="${ph}" min="0"></div></div>
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Status</label><div class="input-block" style="margin:0;"><select id="status-${d.id}"><option value="Válido">Válido</option><option value="Inválido">Inválido</option></select></div></div>
        `;
    } else if (d.tipo === 'Convites' || d.tipo === 'PPP') {
        inputsHtml = `
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Descontos (0 para nenhum)</label><div class="input-block" style="margin:0;"><input type="number" id="desc-${d.id}" placeholder="Ex: 0.5" step="0.1" min="0"></div></div>
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Status</label><div class="input-block" style="margin:0;"><select id="status-${d.id}"><option value="Válido">Válido</option><option value="Inválido">Inválido</option></select></div></div>
        `;
    }

    // Adiciona o campo de Justificativa para todos os tipos (ocupa a linha inteira)
    inputsHtml += `
        <div style="flex: 100%; margin-top: 5px;">
            <label class="tech-label" style="font-size:11px;">Justificativa (Obrigatória se inválido ou com descontos)</label>
            <div class="input-block" style="margin:0; height:auto; padding:0;">
                <textarea id="just-${d.id}" class="admin-input" style="width:100%; min-height:60px; resize:vertical; background:transparent; border:none; padding:12px; color:#fff; font-family:var(--font-ui);" placeholder="Descreva o motivo dos descontos ou da invalidação..."></textarea>
            </div>
        </div>
    `;

    div.innerHTML = `
        ${infoHtml}
        <div style="margin-bottom:15px;">${btnLink}</div>
        <div style="border-top:1px dashed rgba(251,191,36,0.3); padding-top:15px; background:rgba(251,191,36,0.02); padding: 15px; border-radius: 8px; margin-top:10px;">
            <label class="tech-label"><i class="fas fa-pencil-alt"></i> Área de Avaliação</label>
            <div style="display:flex; gap:15px; align-items:flex-end; flex-wrap:wrap; margin-top:10px;">
                ${inputsHtml}
                <button class="btn-tech btn-save" style="padding:15px; width:100%; margin-top:10px;" onclick="window.salvarAvaliacaoAtividade('${d.id}', '${d.tipo}')"><i class="fas fa-check"></i> Finalizar Avaliação</button>
            </div>
        </div>
    `;
    return div;
}

window.abrirLinkIframe = function(url) {
    document.getElementById('iframe-viewer').src = url;
    document.getElementById('link-externo-fallback').href = url;
    document.getElementById('modal-iframe-link').style.display = 'flex';
}

window.salvarAvaliacaoAtividade = function(id, tipo) {
    let payload = {
        avaliado: true,
        avaliador: window.usuarioLogadoNick,
        timestampAvaliacao: new Date().getTime()
    };
    
    let justificativa = document.getElementById(`just-${id}`).value.trim();

    if (tipo === 'Relatórios') {
        let nota = document.getElementById(`nota-${id}`).value;
        if (nota === '') return window.mostrarToast("Você deve inserir a nota de 0 a 100.", "error");
        
        payload.nota = parseFloat(nota);
        payload.status = 'Válido'; 
        
        if (payload.nota < 100 && justificativa === '') {
            return window.mostrarToast("Insira a justificativa para a perda de pontos.", "error");
        }
    } else if (tipo === 'Grupos' || tipo === 'Soldados') {
        let inc = document.getElementById(`inc-${id}`).value;
        let status = document.getElementById(`status-${id}`).value;
        if (inc === '') return window.mostrarToast("Insira a quantidade de incorreções (Coloque 0 se não tiver erros).", "error");
        
        payload.incorrecoes = parseInt(inc);
        payload.status = status;
        
        if ((payload.incorrecoes > 0 || status === 'Inválido') && justificativa === '') {
            return window.mostrarToast("A justificativa é obrigatória para incorreções ou invalidação.", "error");
        }
    } else if (tipo === 'Convites' || tipo === 'PPP') {
        let desc = document.getElementById(`desc-${id}`).value;
        let status = document.getElementById(`status-${id}`).value;
        if (desc === '') return window.mostrarToast("Insira o valor do desconto (Coloque 0 se não tiver descontos).", "error");
        
        payload.descontos = parseFloat(desc.replace(',', '.'));
        payload.status = status;
        
        if ((payload.descontos > 0 || status === 'Inválido') && justificativa === '') {
            return window.mostrarToast("A justificativa é obrigatória para descontos ou invalidação.", "error");
        }
    }
    
    payload.justificativa = justificativa;

    window.db.collection("atividades_pendentes").doc(id).update(payload).then(() => {
        window.mostrarToast("Avaliação concluída! A alteração foi enviada e a planilha sincronizará em breve.", "success");
        window.registrarLogAtividade("Avaliação de Atividade", `Avaliou uma atividade de [${tipo}] ID do doc: ${id}. Status Atribuído: ${payload.status}`);
        window.carregarAtividadesPendentes();
    }).catch(e => {
        window.mostrarToast("Ocorreu um erro ao tentar salvar a avaliação: " + e.message, "error");
    });
}

window.gerarAvatarNick = function(nick) {
    if (!nick || nick === '-') return '-';
    let n = nick.trim();
    let url = `https://dic.systemhb.net/busca?q=${n}`;
    let img = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${n}&action=std&direction=2&head_direction=2&gesture=sml&size=m`;
    
    return `
    <a href="${url}" target="_blank" style="display:inline-flex; align-items:center; gap:8px; color:#fff; text-decoration:none; font-weight:600; background:rgba(0,0,0,0.6); padding:4px 12px 4px 6px; border-radius:25px; border:1px solid rgba(251,191,36,0.3); transition:0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.3);" onmouseover="this.style.borderColor='var(--sup-neon)'; this.style.boxShadow='0 0 10px rgba(251,191,36,0.3)';" onmouseout="this.style.borderColor='rgba(251,191,36,0.3)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.3)';">
        <div style="width:32px; height:32px; border-radius:50%; overflow:hidden; background:rgba(0,0,0,0.9); border:1px solid var(--sup-neon); display:flex; justify-content:center; align-items:flex-start;">
            <img src="${img}" style="margin-top:-10px; pointer-events:none; width:100%;">
        </div>
        ${n}
    </a>`;
}