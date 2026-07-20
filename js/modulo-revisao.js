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
            let labelAvaliador = 'Responsável:';
            
            let btnLink = '';
            if (d.link && d.link.startsWith('http')) {
                btnLink = `<button class="btn-tech" style="padding: 4px 10px; font-size: 11px;" data-url="${d.link}" onclick="window.open(this.getAttribute('data-url'), '_blank')"><i class="fas fa-external-link-alt"></i> ABRIR LINK</button>`;
            }
            
            let detalhesExtras = '';
            let edicaoHtml = '';

            if (d.tipo === 'Relatórios') {
                detalhesExtras = `
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Data Ref.</strong><span style="color:#fff; font-size:13px;">${d.dataReferencia || '-'}</span></div>
                    <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Público Alvo</strong><span style="color:#fff; font-size:13px;">${d.publicoAlvo || '-'}</span></div>
                `;
                edicaoHtml = `
                    <div style="flex:1;"><label class="tech-label">Nota Final</label><input type="number" id="rev-nota-${d.id}" class="form-input" style="padding:8px;" value="${d.nota !== undefined ? d.nota : ''}"></div>
                `;
            } else if (d.tipo === 'Grupos' || d.tipo === 'Soldados') {
                edicaoHtml = `
                    <div style="flex:1;"><label class="tech-label">Incorreções</label><input type="number" id="rev-inc-${d.id}" class="form-input" style="padding:8px;" value="${d.incorrecoes !== undefined ? d.incorrecoes : 0}"></div>
                    <div style="flex:1;"><label class="tech-label">Status</label><select id="rev-status-${d.id}" class="form-input" style="padding:8px;"><option value="Válido" ${d.status === 'Válido' ? 'selected' : ''}>Válido</option><option value="Inválido" ${d.status === 'Inválido' ? 'selected' : ''}>Inválido</option></select></div>
                `;
            } else if (d.tipo === 'Convites' || d.tipo === 'PPP') {
                if(d.tipo === 'Convites') {
                    detalhesExtras = `
                        <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Convidado</strong><span style="color:#fff; font-size:13px;">${d.nickConvidado || '-'}</span></div>
                        <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Provas</strong><span style="color:#fff; font-size:13px;">${d.provas || '-'}</span></div>
                    `;
                } else {
                    detalhesExtras = `
                        <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promotor</strong><span style="color:#fff; font-size:13px;">${d.nickPromotor || '-'}</span></div>
                        <div><strong style="color:var(--sup-neon); font-size:12px; display:block;">Promovido</strong><span style="color:#fff; font-size:13px;">${d.nickPromovido || '-'}</span></div>
                    `;
                }
                edicaoHtml = `
                    <div style="flex:1;"><label class="tech-label">Descontos</label><input type="text" id="rev-desc-${d.id}" class="form-input" style="padding:8px;" value="${d.descontos !== undefined ? d.descontos : 0}"></div>
                    <div style="flex:1;"><label class="tech-label">Status</label><select id="rev-status-${d.id}" class="form-input" style="padding:8px;"><option value="Válido" ${d.status === 'Válido' ? 'selected' : ''}>Válido</option><option value="Inválido" ${d.status === 'Inválido' ? 'selected' : ''}>Inválido</option></select></div>
                `;
            }

            cardsHtml += `
            <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(251,191,36,0.1); border-radius:8px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div style="flex: 1;">
                        <div style="color:var(--text-sub); font-size:12px; font-weight:bold; margin-bottom:10px;"><i class="far fa-clock"></i> Postado em: ${d.dataPostagem} (Corrigido em: ${d.dataAvaliacao || '-'})</div>
                        <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
                            <div style="font-size:14px; display:flex; align-items:center;"><span style="color:#fff; font-weight:600; width:85px;">${labelPostador}</span> <b>${d.nick}</b></div>
                            <div style="font-size:14px; display:flex; align-items:center;"><span style="color:#fff; font-weight:600; width:85px;">${labelAvaliador}</span> <b>${d.avaliador || '-'}</b></div>
                        </div>
                        ${detalhesExtras ? `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">${detalhesExtras}</div>` : ''}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                        ${btnLink}
                    </div>
                </div>
                
                <div style="margin-top:15px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:15px;">
                    <strong style="color:var(--sup-neon); font-size:13px; margin-bottom:10px; display:block;"><i class="fas fa-edit"></i> Editar Correção</strong>
                    <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:10px;">
                        ${edicaoHtml}
                    </div>
                    <div style="margin-bottom:10px;">
                        <label class="tech-label">Justificativa</label>
                        <input type="text" id="rev-just-${d.id}" class="form-input" style="padding:8px;" value="${d.justificativa || ''}">
                    </div>
                    <div style="text-align:right;">
                        ${d.revisadoPor ? `<span style="font-size:11px; color:#aaa; margin-right:15px;">Última edição por: ${d.revisadoPor}</span>` : ''}
                        <button class="btn-tech" style="padding: 6px 15px; font-size: 12px; background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;" onclick="window.salvarEdicaoRevisao('${d.id}', '${d.tipo}')"><i class="fas fa-save"></i> Salvar Edição</button>
                    </div>
                </div>
            </div>
            `;
        });

        lista.innerHTML += headerHtml + cardsHtml;
    }
}