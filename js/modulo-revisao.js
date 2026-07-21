/*
* Módulo: Revisão de Correções (Exclusivo Líder, Vice e Admin)
* Puxa e agrupa as correções já feitas da coleção atividades_pendentes (avaliado=true)
*/

window.dadosRevisaoGlobais = [];
window.tipoRevisaoAtual = 'Relatórios';

window.solicitarLevantamento = async function() {
    let dInicio = document.getElementById('rev-data-inicio').value;
    let dFim = document.getElementById('rev-data-fim').value;

    if (!dInicio || !dFim) return window.mostrarToast("Selecione a data de início e de fim para a busca.", "error");

    let statusArea = document.getElementById('rev-status-area');
    let resultsArea = document.getElementById('rev-results-area');
    
    statusArea.style.display = 'block';
    resultsArea.style.display = 'none';
    statusArea.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x" style="color:var(--sup-neon)"></i><br><br><span style="color:var(--text-main); font-size:15px;">Buscando dados no banco...</span>';

    window.dadosRevisaoGlobais = [];
    
    try {
        let snap = await window.db.collection("atividades_pendentes")
            .where("avaliado", "==", true)
            .get();
        
        snap.forEach(doc => {
            window.dadosRevisaoGlobais.push({ id: doc.id, ...doc.data() });
        });
        
        statusArea.style.display = 'none';
        resultsArea.style.display = 'flex';
        
        let tabRelatorios = document.querySelector('#tabs-revisao .btn-tab:nth-child(1)');
        window.filtrarRevisao('Relatórios', tabRelatorios);
    } catch (e) {
        statusArea.innerHTML = `<span style="color:#ef4444;">Erro ao buscar dados: ${e.message}</span>`;
    }
}

window.filtrarRevisao = function(tipo, btnElement) {
    window.tipoRevisaoAtual = tipo;
    
    document.querySelectorAll('#tabs-revisao .btn-tab').forEach(el => el.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    window.renderizarListaRevisao();
}

window.salvarEdicaoRevisao = function(id, tipo) {
    let payload = {};
    if (tipo === 'Relatórios') {
        payload.nota = parseFloat(document.getElementById(`rev-nota-${id}`).value);
    } else if (tipo === 'Grupos' || tipo === 'Soldados') {
        payload.incorrecoes = parseInt(document.getElementById(`rev-inc-${id}`).value) || 0;
        payload.status = document.getElementById(`rev-status-${id}`).value;
    } else if (tipo === 'Convites' || tipo === 'PPP') {
        payload.descontos = parseFloat(document.getElementById(`rev-desc-${id}`).value.replace(',', '.')) || 0;
        payload.status = document.getElementById(`rev-status-${id}`).value;
    }
    
    payload.justificativa = document.getElementById(`rev-just-${id}`).value;
    payload.revisadoPor = window.sessionData ? window.sessionData.nick_usuario : 'Vice-Líder';
    
    window.db.collection("atividades_pendentes").doc(id).update(payload).then(() => {
        window.customAlert('Alterações da revisão salvas com sucesso!', 'Revisão');
        let index = window.dadosRevisaoGlobais.findIndex(x => x.id === id);
        if (index > -1) {
            Object.assign(window.dadosRevisaoGlobais[index], payload);
        }
        window.renderizarListaRevisao();
    }).catch(err => {
        window.customAlert('Erro ao salvar: ' + err.message, 'Erro');
    });
}

window.renderizarListaRevisao = function() {
    let lista = document.getElementById('rev-lista');
    lista.innerHTML = '';

    let dataInicioStr = document.getElementById('rev-data-inicio').value;
    let dataFimStr = document.getElementById('rev-data-fim').value;
    
    let dtInicio = dataInicioStr ? new Date(dataInicioStr + 'T00:00:00') : new Date('2000-01-01');
    let dtFim = dataFimStr ? new Date(dataFimStr + 'T23:59:59') : new Date('2100-01-01');

    let dadosFiltrados = window.dadosRevisaoGlobais.filter(d => {
        if (d.tipo !== window.tipoRevisaoAtual) return false;
        
        if (d.dataPostagem) {
            let p1 = d.dataPostagem.split(' ')[0];
            let p2 = p1.split('/');
            if (p2.length === 3) {
                let dtPostagem = new Date(p2[2], p2[1] - 1, p2[0]);
                if (dtPostagem < dtInicio || dtPostagem > dtFim) {
                    return false;
                }
            }
        }
        return true;
    });

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
        let dia = d.dataPostagem.split(' ')[0]; 
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
        let headerHtml = `<div style="background: linear-gradient(90deg, rgba(251,191,36,0.15) 0%, transparent 100%); border-left: 4px solid var(--sup-neon); padding: 12px 20px; margin-top: 25px; margin-bottom: 15px; border-radius: 4px; color: #fff; font-size: 16px; font-weight: bold; text-transform: uppercase; display:flex; align-items:center; gap:10px;"><i class="far fa-calendar-alt"></i> ${getDiaSemana(dia)} - ${dia} <span style="background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:12px; font-size:12px;">${grupos[dia].length} Ativ.</span></div>`;
        
        let cardsHtml = '';
        grupos[dia].forEach(d => {
            let labelPostador = d.tipo === 'Relatórios' ? 'Auxiliar:' : 'Supervisor:';
            
            let btnRelatorioAnterior = '';
            if ((d.tipo === 'Grupos' || d.tipo === 'Soldados') && d.linkAnterior) {
                btnRelatorioAnterior = `<button onclick="window.open('${d.linkAnterior}', '_blank')" style="background: rgba(251,191,36,0.1); border: 1px solid var(--sup-neon); color: var(--sup-neon); padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; text-transform: uppercase; font-weight: bold; margin-left: 10px; transition: 0.3s; display:inline-flex; align-items:center; gap:5px;" onmouseover="this.style.background='var(--sup-neon)'; this.style.color='#000';" onmouseout="this.style.background='rgba(251,191,36,0.1)'; this.style.color='var(--sup-neon)';"><i class="fas fa-history"></i> Relatório Anterior</button>`;
            }

            let infoHtml = ``;
            let dataCorrigido = d.timestampAvaliacao ? new Date(d.timestampAvaliacao).toLocaleString('pt-BR') : '-';
            
            infoHtml += `<div style="font-size:12px; color:var(--text-sub); margin-bottom:10px; font-weight:600;"><i class="far fa-clock"></i> Postado em: ${d.dataPostagem || '-'} &nbsp;|&nbsp; <i class="fas fa-check-circle" style="color:#4caf50;"></i> Corrigido em: ${dataCorrigido}</div>`;
            infoHtml += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
                <span style="color:#fff; font-size:14px; font-weight:600; width:85px;">${labelPostador}</span> ${window.gerarAvatarNick(d.nick)} ${btnRelatorioAnterior}
            </div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; flex-wrap:wrap;">
                <span style="color:#fff; font-size:14px; font-weight:600; width:85px;">Responsável:</span> ${window.gerarAvatarNick(d.avaliador)}
            </div>`;

            if (d.tipo === 'Relatórios') {
                let dataRefFmt = d.dataReferencia;
                if (dataRefFmt && dataRefFmt.includes('-')) {
                    dataRefFmt = dataRefFmt.split('-').reverse().join('/');
                }
                infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Ref.</strong><span style="color:#fff;">${dataRefFmt || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Público Alvo</strong><span style="color:#fff;">${d.publicoAlvo || d.grupo || '-'}</span></div>
                </div>`;
            } else if (d.tipo === 'Convites') {
                let historicoHtml = '<div class="hist-container" style="margin-top:10px; padding:10px; background:rgba(0,0,0,0.5); border-left:3px solid var(--sup-neon); border-radius:4px;"><span style="color:var(--text-sub); font-size:11px;"><i class="fas fa-spinner fa-spin"></i> Buscando histórico de 7 dias...</span></div>';
                
                infoHtml += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05);">
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Aplicação</strong><span style="color:#fff;">${d.dataAplicacao || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Convidado</strong>${window.gerarAvatarNick(d.nickConvidado)}</div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Hora (Início ~ Fim)</strong><span style="color:#fff;">${d.horaInicioFim || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Resposta</strong><span style="color:#fff;">${d.resposta || '-'}</span></div>
                    <div style="grid-column: 1 / -1;" id="hist-revisao-${d.id}">${historicoHtml}</div>
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
            let iframeHtml = '';
            
            if (linkUrl && linkUrl.startsWith('http')) {
                if (d.tipo === 'Relatórios' || d.tipo === 'Grupos' || d.tipo === 'Soldados') {
                    btnLink = `<button class="btn-tech" style="padding: 6px 12px; font-size: 13px;" data-url="${linkUrl}" onclick="window.abrirLinkIframe(this.getAttribute('data-url'))"><i class="fas fa-external-link-alt"></i> ABRIR LINK (PRINTS)</button>`;
                } else {
                    btnLink = `<button class="btn-tech" style="padding: 6px 12px; font-size: 13px;" data-url="${linkUrl}" onclick="window.open(this.getAttribute('data-url'), '_blank')"><i class="fas fa-external-link-alt"></i> ABRIR LINK (PRINTS)</button>`;
                }

                if (linkUrl.includes('docs.google.com')) {
                    let embedUrl = linkUrl.replace(/\/edit.*?$/, '/preview');
                    iframeHtml = `<div style="margin-top:15px; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);"><iframe src="${embedUrl}" style="width:100%; height:400px; border:none;"></iframe></div>`;
                } else if (linkUrl.includes('imgur.com')) {
                    if (window.renderImgurEmbed) {
                        iframeHtml = window.renderImgurEmbed(linkUrl);
                    }
                }

            } else {
                btnLink = `<span style="color:#ff2a2a; font-size:13px; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Link (Print) ausente ou inválido</span>`;
            }

            let edicaoHtml = '';

            if (d.tipo === 'Relatórios') {
                edicaoHtml = `
                    <div style="flex:1;"><label class="tech-label">Nota Final</label><div class="input-block"><input type="number" id="rev-nota-${d.id}" value="${d.nota !== undefined ? d.nota : ''}"></div></div>
                `;
            } else if (d.tipo === 'Grupos' || d.tipo === 'Soldados') {
                edicaoHtml = `
                    <div style="flex:1;"><label class="tech-label">Incorreções</label><div class="input-block"><input type="number" id="rev-inc-${d.id}" value="${d.incorrecoes !== undefined ? d.incorrecoes : 0}"></div></div>
                    <div style="flex:1;"><label class="tech-label">Status</label><div class="input-block"><select id="rev-status-${d.id}"><option value="Válido" ${d.status === 'Válido' ? 'selected' : ''}>Válido</option><option value="Inválido" ${d.status === 'Inválido' ? 'selected' : ''}>Inválido</option></select></div></div>
                `;
            } else if (d.tipo === 'Convites' || d.tipo === 'PPP') {
                edicaoHtml = `
                    <div style="flex:1;"><label class="tech-label">Descontos</label><div class="input-block"><input type="text" id="rev-desc-${d.id}" value="${d.descontos !== undefined ? d.descontos : 0}"></div></div>
                    <div style="flex:1;"><label class="tech-label">Status</label><div class="input-block"><select id="rev-status-${d.id}"><option value="Válido" ${d.status === 'Válido' ? 'selected' : ''}>Válido</option><option value="Inválido" ${d.status === 'Inválido' ? 'selected' : ''}>Inválido</option></select></div></div>
                `;
            }

            cardsHtml += `
            <div id="card-rev-${d.id}" style="background:rgba(0,0,0,0.4); border:1px solid rgba(251,191,36,0.2); border-radius:8px; padding:20px; margin-bottom:15px; position:relative;">
                ${infoHtml}
                <div style="margin-bottom:15px;">${btnLink}</div>
                ${iframeHtml}
                
                <div style="margin-top:15px; border-top:1px dashed rgba(251,191,36,0.3); padding-top:15px; background:rgba(251,191,36,0.02); border-radius: 8px; padding: 15px;">
                    <strong style="color:var(--sup-neon); font-size:13px; margin-bottom:10px; display:block;"><i class="fas fa-edit"></i> Editar Correção</strong>
                    <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:10px;">
                        ${edicaoHtml}
                    </div>
                    <div style="margin-bottom:10px;">
                        <label class="tech-label">Justificativa (Opcional)</label>
                        <div class="input-block" style="height:auto; padding:0;">
                            <textarea id="rev-just-${d.id}" class="admin-input" style="width:100%; min-height:60px; resize:vertical; background:transparent; border:none; padding:12px; color:#fff; font-family:var(--font-ui);">${d.justificativa || ''}</textarea>
                        </div>
                    </div>
                    <div style="text-align:right; display:flex; justify-content:space-between; align-items:flex-end;">
                        ${d.revisadoPor ? `<span style="font-size:11px; color:#aaa;"><i class="fas fa-history"></i> Última edição por: ${d.revisadoPor}</span>` : '<span></span>'}
                        <button class="btn-tech" style="padding: 10px 20px; font-size: 13px; background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;" onclick="window.salvarEdicaoRevisao('${d.id}', '${d.tipo}')"><i class="fas fa-save"></i> Salvar Edição</button>
                    </div>
                </div>
            </div>
            `;
            
            // Asynchronous hook for 7 days history check in Revisões!
            if (d.tipo === 'Convites') {
                setTimeout(() => {
                    let card = document.getElementById(`card-rev-${d.id}`);
                    if (card && window.buscarHistoricoConvites) {
                        window.buscarHistoricoConvites(card, d.nickConvidado, d.dataPostagem);
                    }
                }, 200);
            }
        });

        lista.innerHTML += headerHtml + cardsHtml;
    }
}