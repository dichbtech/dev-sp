/*
* Módulo: Correção de Atividades (Liderança)
* Responsável por puxar atividades da coleção 'atividades_pendentes' no Firebase, exibir e injetar a nota/correção nela mesma.
*/

window.tipoAtividadeAtual = 'Relatórios';
window.unsubPendentes = null; // Variável para controlar a escuta em tempo real

window.carregarAtividadesPendentes = function(tipo = window.tipoAtividadeAtual, btnElement = null) {
    window.tipoAtividadeAtual = tipo;
    
    if (btnElement) {
        document.querySelectorAll('.btn-tab').forEach(el => el.classList.remove('active'));
        btnElement.classList.add('active');
    } else {
        document.querySelectorAll('.btn-tab').forEach(el => {
            el.classList.remove('active');
            if (el.id === 'tab-' + tipo) el.classList.add('active');
        });
    }

    let container = document.getElementById('lista-atividades-pendentes');
    container.innerHTML = '<div style="color:var(--sup-neon); text-align:center; padding:40px;"><i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>Buscando atividades pendentes...</div>';

    if (window.unsubPendentes) {
        window.unsubPendentes();
    }

    window.unsubPendentes = window.db.collection("atividades_pendentes")
        .where("avaliado", "==", false)
        .onSnapshot(snap => {
            let contagens = { 'Relatórios': 0, 'Grupos': 0, 'Soldados': 0, 'Convites': 0, 'PPP': 0 };
            let docsAtuais = [];

            snap.forEach(doc => {
                let d = doc.data();
                if (contagens[d.tipo] !== undefined) {
                    contagens[d.tipo]++;
                }
                if (d.tipo === tipo) {
                    d.id = doc.id;
                    docsAtuais.push(d);
                }
            });

            for (let cat in contagens) {
                let tab = document.getElementById('tab-' + cat);
                if (tab) {
                    tab.innerHTML = cat + (contagens[cat] > 0 ? ' <span class="badge-tab">' + contagens[cat] + '</span>' : '');
                }
            }

            container.innerHTML = '';
            
            if (docsAtuais.length === 0) {
                container.innerHTML = `
                    <div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(76, 175, 80, 0.4); padding: 50px 20px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
                        <i class="fas fa-check-circle" style="color: #4caf50; font-size: 50px; margin-bottom: 15px; filter: drop-shadow(0 0 10px rgba(76,175,80,0.3));"></i>
                        <h3 style="color: #4caf50; font-size: 22px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Tudo Limpo!</h3>
                        <p style="color: var(--text-sub); font-size: 15px; margin: 0;">Nenhuma atividade aguardando correção na aba <b>${tipo}</b>.<br>Excelente trabalho da Liderança!</p>
                    </div>`;
                return;
            }

            docsAtuais.forEach(d => {
                container.appendChild(window.criarCardAtividade(d));
            });
        }, err => {
            container.innerHTML = `<div style="color:#ff2a2a; text-align:center; padding:20px;"><i class="fas fa-exclamation-triangle"></i> Erro ao espelhar as atividades em tempo real: ${err.message}</div>`;
        });
}

window.criarCardAtividade = function(d) {
    let div = document.createElement('div');
    div.style.background = "rgba(0,0,0,0.4)";
    div.style.border = "1px solid rgba(251,191,36,0.2)";
    div.style.borderRadius = "8px";
    div.style.padding = "20px";
    div.style.position = "relative";

    let labelPostador = (d.tipo === 'Relatórios') ? 'Auxiliar:' : 'Supervisor:';
    
    let btnRelatorioAnterior = '';
    if ((d.tipo === 'Grupos' || d.tipo === 'Soldados') && d.linkAnterior) {
        btnRelatorioAnterior = `<button onclick="window.open('${d.linkAnterior}', '_blank')" style="background: rgba(251,191,36,0.1); border: 1px solid var(--sup-neon); color: var(--sup-neon); padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; text-transform: uppercase; font-weight: bold; margin-left: 10px; transition: 0.3s; display:inline-flex; align-items:center; gap:5px;" onmouseover="this.style.background='var(--sup-neon)'; this.style.color='#000';" onmouseout="this.style.background='rgba(251,191,36,0.1)'; this.style.color='var(--sup-neon)';"><i class="fas fa-history"></i> Relatório Anterior</button>`;
    }

    let infoHtml = ``;
    infoHtml += `<div style="font-size:12px; color:var(--text-sub); margin-bottom:10px; font-weight:600;"><i class="far fa-clock"></i> Postado em: ${d.dataPostagem || '-'}</div>`;
    infoHtml += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; flex-wrap:wrap;"><span style="color:#fff; font-size:14px; font-weight:600;">${labelPostador}</span> ${window.gerarAvatarNick(d.nick)} ${btnRelatorioAnterior}</div>`;

    if (d.tipo === 'Relatórios') {
        infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Ref.</strong><span style="color:#fff;">${d.dataReferencia || '-'}</span></div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Grupo Associado</strong><span style="color:#fff;">${d.grupo || '-'}</span></div>
        </div>`;
    } else if (d.tipo === 'Convites') {
        let historicoHtml = '<div style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.5); border-left:3px solid var(--sup-neon); border-radius:4px;"><strong style="color:var(--sup-neon); font-size:12px; display:block; margin-bottom:8px;"><i class="fas fa-history"></i> HISTÓRICO DE CONVITES</strong>';
        
        if (d.historico) {
            try {
                let histArr = JSON.parse(d.historico);
                if (histArr.length > 0) {
                    let parseDateStr = function(str) {
                        if (!str) return null;
                        let p = str.split(' ')[0].split('/'); 
                        if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]);
                        return null;
                    };
                    
                    let dtAtual = parseDateStr(d.dataAplicacao);

                    histArr.forEach(h => {
                        let corResp = h.resposta.toLowerCase().includes('aceitou') ? '#4caf50' : '#ff2a2a';
                        
                        let dtHist = parseDateStr(h.data);
                        let diffDias = 0;
                        
                        if (dtAtual && dtHist) {
                            let diffTime = Math.abs(dtAtual.getTime() - dtHist.getTime());
                            diffDias = Math.round(diffTime / (1000 * 3600 * 24));
                        }
                        
                        let dataFormatada = h.data.split(' ')[0]; 
                        historicoHtml += `<div style="font-size:11px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                            <span><i class="far fa-calendar-alt"></i> ${dataFormatada}</span>
                            <span style="color:${corResp}; font-weight:bold; text-transform:uppercase;">${h.resposta}</span>
                            <span style="color:var(--text-sub);">(${diffDias} dias atrás)</span>
                        </div>`;
                    });
                } else {
                    historicoHtml += '<span style="color:var(--text-sub); font-size:11px;">Nenhum convite anterior registrado para este policial.</span>';
                }
            } catch(e) {
                historicoHtml += '<span style="color:var(--text-sub); font-size:11px;">Erro ao ler histórico.</span>';
            }
        } else {
            historicoHtml += '<span style="color:var(--text-sub); font-size:11px;">Nenhum convite anterior registrado para este policial.</span>';
        }
        historicoHtml += '</div>';

        infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Aplicação</strong><span style="color:#fff;">${d.dataAplicacao || '-'}</span></div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Convidado</strong>${window.gerarAvatarNick(d.nickConvidado)}</div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Hora (Início ~ Fim)</strong><span style="color:#fff;">${d.horaInicioFim || '-'}</span></div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Resposta</strong><span style="color:#fff;">${d.resposta || '-'}</span></div>
            <div style="grid-column: 1 / -1;">${historicoHtml}</div>
        </div>`;
    } else if (d.tipo === 'PPP') {
        let idLink = d.idPromocao ? `<a href="https://dic.systemhb.net/promocao/ver/${d.idPromocao}" target="_blank" style="color:var(--sup-neon); text-decoration:none; font-weight:600;">${d.idPromocao} <i class="fas fa-external-link-alt"></i></a>` : '-';
        infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">ID Promoção</strong>${idLink}</div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promotor</strong>${window.gerarAvatarNick(d.nickPromotor)}</div>
            <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promovido</strong>${window.gerarAvatarNick(d.nickPromovido)}</div>
        </div>`;
    }

    let linkUrl = d.link ? d.link.trim() : '';
    let btnLink = '';
    
    if (linkUrl && linkUrl.startsWith('http')) {
        if (d.tipo === 'Relatórios' || d.tipo === 'Grupos' || d.tipo === 'Soldados') {
            btnLink = `<button class="btn-tech" style="padding: 6px 12px; font-size: 13px;" data-url="${linkUrl}" onclick="window.abrirLinkIframe(this.getAttribute('data-url'))"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
        } else {
            btnLink = `<button class="btn-tech" style="padding: 6px 12px; font-size: 13px;" data-url="${linkUrl}" onclick="window.open(this.getAttribute('data-url'), '_blank')"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
        }
    } else {
        btnLink = `<span style="color:#ff2a2a; font-size:13px; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Link ausente ou inválido</span>`;
    }

    let inputsHtml = '';
    
    if (d.tipo === 'Relatórios') {
        inputsHtml = `
            <div style="flex:1; min-width: 200px;"><label class="tech-label" style="font-size:11px;">Nota Final</label><div class="input-block" style="margin:0;"><input type="number" id="nota-${d.id}" placeholder="Nota de 0 a 100" min="0" max="100"></div></div>
        `;
    } else if (d.tipo === 'Grupos' || d.tipo === 'Soldados') {
        inputsHtml = `
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Incorreções</label><div class="input-block" style="margin:0;"><input type="number" id="inc-${d.id}" placeholder="" min="0"></div></div>
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Status</label><div class="input-block" style="margin:0;"><select id="status-${d.id}" onchange="this.style.color = this.value==='Válido'?'#4caf50':'#ff2a2a';"><option value="Válido" style="color:#fff;">Válido</option><option value="Inválido" style="color:#fff;">Inválido</option></select></div></div>
        `;
    } else if (d.tipo === 'Convites' || d.tipo === 'PPP') {
        inputsHtml = `
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Descontos</label><div class="input-block" style="margin:0;"><input type="number" id="desc-${d.id}" placeholder="" step="0.1" min="0"></div></div>
            <div style="flex:1; min-width: 150px;"><label class="tech-label" style="font-size:11px;">Status</label><div class="input-block" style="margin:0;"><select id="status-${d.id}" onchange="this.style.color = this.value==='Válido'?'#4caf50':'#ff2a2a';"><option value="Válido" style="color:#fff;">Válido</option><option value="Inválido" style="color:#fff;">Inválido</option></select></div></div>
        `;
    }

    inputsHtml += `
        <div style="flex: 100%; margin-top: 5px;">
            <label class="tech-label" style="font-size:11px;">Justificativa (Opcional)</label>
            <div class="input-block" style="margin:0; height:auto; padding:0;">
                <textarea id="just-${d.id}" class="admin-input" style="width:100%; min-height:60px; resize:vertical; background:transparent; border:none; padding:12px; color:#fff; font-family:var(--font-ui);" placeholder="Descreva o motivo dos descontos ou da invalidação (caso houver)..."></textarea>
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
    let iframe = document.getElementById('iframe-viewer');
    iframe.src = 'about:blank'; 
    setTimeout(() => { iframe.src = url; }, 50);
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
    } else if (tipo === 'Grupos' || tipo === 'Soldados') {
        let inc = document.getElementById(`inc-${id}`).value;
        let status = document.getElementById(`status-${id}`).value;
        
        payload.incorrecoes = inc === '' ? 0 : parseInt(inc);
        payload.status = status;
    } else if (tipo === 'Convites' || tipo === 'PPP') {
        let desc = document.getElementById(`desc-${id}`).value;
        let status = document.getElementById(`status-${id}`).value;
        
        payload.descontos = desc === '' ? 0 : parseFloat(desc.replace(',', '.'));
        payload.status = status;
    }
    
    payload.justificativa = justificativa;

    window.db.collection("atividades_pendentes").doc(id).update(payload).then(() => {
        window.mostrarToast("Correção finalizada!", "success");
        window.registrarLogAtividade("Avaliação de Atividade", `Avaliou uma atividade de [${tipo}] ID do doc: ${id}. Status Atribuído: ${payload.status}`);
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