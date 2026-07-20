/*
* Módulo: Acompanhamentos
* Alvo: Auxiliares (Executores) e Liderança (Criadores e Auditores)
*/

window.abaAtivaAcomp = 'acomp-disp';
window.unsubAcomp = null;

window.switchTabAcompanhamentos = function(tabId, btnElement) {
    window.abaAtivaAcomp = tabId;
    document.querySelectorAll('#tabs-acompanhamentos .btn-tab').forEach(el => el.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    // Atualizar UI
    window.carregarAcompanhamentos();
};

window.abrirModalCriarAcompanhamento = function() {
    let modalId = 'modal-criar-acomp';
    let m = document.getElementById(modalId);
    if(m) m.remove();

    let html = `
    <div class="modal-overlay" id="${modalId}" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-content card" style="width:90%; max-width:500px; padding:30px; position:relative;">
            <button onclick="document.getElementById('${modalId}').remove()" style="position:absolute; top:15px; right:20px; background:none; border:none; color:#ff2a2a; font-size:24px; cursor:pointer;"><i class="fas fa-times"></i></button>
            <h3 style="margin-top:0;"><i class="fas fa-plus-circle"></i> Criar Acompanhamento</h3>
            
            <div class="input-group">
                <label>Nick do Auxiliar Alvo</label>
                <input type="text" id="acomp-alvo" class="input-padrao" placeholder="Quem deve ser acompanhado?" required>
            </div>
            
            <div class="input-group" style="margin-top:15px;">
                <label>Objeto/Motivação do Acompanhamento</label>
                <textarea id="acomp-motivo" class="input-padrao" rows="4" placeholder="Descreva os detalhes e objetivos do acompanhamento..." required></textarea>
            </div>
            
            <button class="btn-tech" style="width:100%; margin-top:20px;" onclick="window.salvarNovoAcompanhamento()"><i class="fas fa-save"></i> Criar Demanda</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.salvarNovoAcompanhamento = async function() {
    let alvo = document.getElementById('acomp-alvo').value.trim();
    let motivo = document.getElementById('acomp-motivo').value.trim();
    
    if(!alvo || !motivo) {
        window.customAlert('Preencha todos os campos.', 'Erro');
        return;
    }
    
    let btn = document.querySelector('#modal-criar-acomp .btn-tech');
    let txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
    btn.disabled = true;
    
    try {
        await window.db.collection('acompanhamentos').add({
            criador: window.usuarioLogadoNick || 'Desconhecido',
            alvo: alvo,
            motivo: motivo,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'aberto', // aberto, andamento, concluido
            responsavel: null, // Nick do Auxiliar que assumir
            dataInicio: null,
            dataTermino: null,
            duvidasSanadas: null,
            disposicao: null,
            obs: null,
            linkPrint: null,
            dataConclusao: null
        });
        document.getElementById('modal-criar-acomp').remove();
        window.customAlert('Acompanhamento criado com sucesso!', 'Sucesso');
    } catch(e) {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
        window.customAlert('Erro: ' + e.message, 'Erro');
    }
};

window.carregarAcompanhamentos = function() {
    let container = document.getElementById('acomp-lista');
    if(!container) return;

    let nivel = window.nivelUsuarioGlobal;
    let ehLideranca = ['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(nivel);
    
    let btnCriar = document.getElementById('btn-criar-acompanhamento-box');
    if (btnCriar) {
        btnCriar.style.display = ehLideranca ? 'block' : 'none';
    }

    container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Buscando...</div>';

    if (window.unsubAcomp) window.unsubAcomp();

    let ref = window.db.collection('acompanhamentos');

    // Filtros de acordo com a aba
    if (window.abaAtivaAcomp === 'acomp-disp') {
        ref = ref.where('status', '==', 'aberto');
    } else if (window.abaAtivaAcomp === 'acomp-meus') {
        ref = ref.where('status', '==', 'andamento'); // Filtragem de responsavel sera feita na memoria
    } else if (window.abaAtivaAcomp === 'acomp-conc') {
        ref = ref.where('status', '==', 'concluido');
    }

    window.unsubAcomp = ref.onSnapshot(snap => {
        let docs = [];
        snap.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            // Filtro local para evitar erro de Index composto no Firebase
            if (window.abaAtivaAcomp === 'acomp-meus' && !ehLideranca) {
                if (d.responsavel !== window.usuarioLogadoNick) return;
            }
            docs.push(d);
        });

        // Ordenar por data de criacao decrescente
        docs.sort((a,b) => {
            let tA = a.dataCriacao ? a.dataCriacao.toMillis() : 0;
            let tB = b.dataCriacao ? b.dataCriacao.toMillis() : 0;
            return tB - tA;
        });

        container.innerHTML = '';
        if(docs.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-sub);">Nenhum acompanhamento encontrado nesta aba.</div>';
            return;
        }

        docs.forEach(d => {
            container.appendChild(window.gerarCardAcompanhamento(d, ehLideranca));
        });
    });
};

window.gerarCardAcompanhamento = function(d, ehLideranca) {
    let div = document.createElement('div');
    div.className = 'card';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.border = '1px solid rgba(251,191,36,0.2)';
    div.style.position = 'relative';
    div.style.margin = '0'; // removing margin since it's in a grid
    div.style.padding = '20px';

    let dataF = 'Data desconhecida';
    if(d.dataCriacao) {
        let dt = d.dataCriacao.toDate();
        dataF = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    }

    let statusHtml = '';
    if(d.status === 'aberto') statusHtml = '<span style="background:var(--sup-neon); color:#000; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">DISPONÍVEL</span>';
    else if(d.status === 'andamento') statusHtml = '<span style="background:#2196F3; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">EM ANDAMENTO</span>';
    else if(d.status === 'concluido') statusHtml = '<span style="background:#4caf50; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">CONCLUÍDO</span>';

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
            <div style="font-size:18px; font-weight:bold; color:#fff;"><i class="fas fa-user-tag" style="color:var(--sup-neon);"></i> Alvo: ${d.alvo}</div>
            <div>${statusHtml}</div>
        </div>
        <div style="font-size:12px; color:var(--text-sub); margin-bottom:10px;">
            Criado por <b>${d.criador}</b> em ${dataF}
        </div>
        <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin-bottom:15px; font-size:14px; border-left:3px solid var(--sup-neon);">
            ${d.motivo.replace(/\n/g, '<br>')}
        </div>
    `;

    // Botões e inputs dinâmicos
    if (d.status === 'aberto') {
        if (!ehLideranca) {
            html += `<button class="btn-tech" style="width:100%; margin-top:10px;" onclick="window.assumirAcompanhamento('${d.id}')"><i class="fas fa-hand-paper"></i> Assumir Acompanhamento</button>`;
        }
        if (ehLideranca || d.criador === window.usuarioLogadoNick) {
            html += `<button onclick="window.excluirAcompanhamento('${d.id}')" style="width:100%; margin-top:10px; background:none; border:1px solid #ff2a2a; color:#ff2a2a; border-radius:6px; padding:8px; cursor:pointer;"><i class="fas fa-trash"></i> Excluir</button>`;
        }
    } else if (d.status === 'andamento') {
        html += `<div style="margin-bottom:10px; font-size:13px; color:var(--text-sub);"><i class="fas fa-user-check"></i> Responsável: <b>${d.responsavel}</b></div>`;
        
        if (d.responsavel === window.usuarioLogadoNick || ehLideranca) {
            // Se for o responsavel (ou lideranca forçando), mostrar form de conclusao
            html += `
                <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:15px; margin-top:15px;">
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="font-size:11px; color:#aaa;">Data de Início</label>
                            <input type="date" id="dt-ini-${d.id}" class="input-padrao" style="padding:6px; font-size:13px;" value="${d.dataInicio || ''}">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:11px; color:#aaa;">Data de Término</label>
                            <input type="date" id="dt-fim-${d.id}" class="input-padrao" style="padding:6px; font-size:13px;" value="${d.dataTermino || ''}">
                        </div>
                    </div>
                    
                    <div style="margin-bottom:10px;">
                        <label style="font-size:11px; color:#aaa;">Dúvidas Sanadas?</label>
                        <select id="duv-${d.id}" class="input-padrao" style="padding:6px; font-size:13px;">
                            <option value="">Selecione...</option>
                            <option value="Sim" ${d.duvidasSanadas==='Sim'?'selected':''}>Sim</option>
                            <option value="Não" ${d.duvidasSanadas==='Não'?'selected':''}>Não</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom:10px;">
                        <label style="font-size:11px; color:#aaa;">Disposição Atual</label>
                        <select id="disp-${d.id}" class="input-padrao" style="padding:6px; font-size:13px;">
                            <option value="">Selecione...</option>
                            <option value="Muito Baixa" ${d.disposicao==='Muito Baixa'?'selected':''}>Muito Baixa</option>
                            <option value="Baixa" ${d.disposicao==='Baixa'?'selected':''}>Baixa</option>
                            <option value="Média" ${d.disposicao==='Média'?'selected':''}>Média</option>
                            <option value="Alta" ${d.disposicao==='Alta'?'selected':''}>Alta</option>
                            <option value="Muito Alta" ${d.disposicao==='Muito Alta'?'selected':''}>Muito Alta</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom:10px;">
                        <label style="font-size:11px; color:#aaa;">Observação e Comprovação (Links Imgur)</label>
                        <textarea id="obs-${d.id}" class="input-padrao" rows="3" style="padding:6px; font-size:13px;" placeholder="Relate como foi o acompanhamento e cole o link do imgur aqui...">${d.obs || ''}</textarea>
                    </div>
                    
                    <button class="btn-tech" style="width:100%; padding:10px; font-size:14px; background:#4caf50; border-color:#4caf50;" onclick="window.concluirAcompanhamento('${d.id}')"><i class="fas fa-check-double"></i> Finalizar Acompanhamento</button>
                </div>
            `;
        }
    } else if (d.status === 'concluido') {
        html += `<div style="margin-bottom:10px; font-size:13px; color:var(--text-sub);"><i class="fas fa-user-check"></i> Executado por: <b>${d.responsavel}</b></div>`;
        html += `
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; font-size:13px; margin-top:10px;">
                <p style="margin:0 0 5px 0;"><b>Período:</b> ${d.dataInicio} até ${d.dataTermino}</p>
                <p style="margin:0 0 5px 0;"><b>Dúvidas Sanadas:</b> ${d.duvidasSanadas}</p>
                <p style="margin:0 0 5px 0;"><b>Disposição:</b> ${d.disposicao}</p>
                <div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                    <b>Relatório:</b><br>${d.obs ? d.obs.replace(/\n/g, '<br>') : 'Nenhuma observação.'}
                </div>
            </div>
        `;
        
        // Verifica se há link imgur no texto para renderizar
        if (ehLideranca && d.obs && d.obs.includes('imgur.com')) {
            let links = d.obs.match(/https?:\/\/[\w\.\/]+/g) || [];
            let rendered = false;
            links.forEach(l => {
                if(l.includes('imgur.com') && !rendered && window.renderImgurEmbed) {
                    html += window.renderImgurEmbed(l);
                    rendered = true; // renderiza apenas o primeiro embed por enquanto
                }
            });
        }
    }

    div.innerHTML = html;
    return div;
};

window.assumirAcompanhamento = async function(id) {
    if(!window.usuarioLogadoNick) {
        window.customAlert("Usuário não identificado."); return;
    }
    try {
        await window.db.collection('acompanhamentos').doc(id).update({
            status: 'andamento',
            responsavel: window.usuarioLogadoNick
        });
        // alert not needed, realtime sync handles it
    } catch(e) {
        window.customAlert('Erro ao assumir: ' + e.message, 'Erro');
    }
};

window.concluirAcompanhamento = async function(id) {
    let dtIni = document.getElementById('dt-ini-'+id).value;
    let dtFim = document.getElementById('dt-fim-'+id).value;
    let duv = document.getElementById('duv-'+id).value;
    let disp = document.getElementById('disp-'+id).value;
    let obs = document.getElementById('obs-'+id).value.trim();

    if(!dtIni || !dtFim || !duv || !disp || !obs) {
        window.customAlert('Preencha todos os campos do formulário.', 'Aviso');
        return;
    }

    try {
        await window.db.collection('acompanhamentos').doc(id).update({
            status: 'concluido',
            dataInicio: dtIni,
            dataTermino: dtFim,
            duvidasSanadas: duv,
            disposicao: disp,
            obs: obs,
            dataConclusao: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        window.customAlert('Erro ao finalizar: ' + e.message, 'Erro');
    }
};

window.excluirAcompanhamento = async function(id) {
    if(!confirm("Tem certeza que deseja excluir este acompanhamento?")) return;
    try {
        await window.db.collection('acompanhamentos').doc(id).delete();
    } catch(e) {
        window.customAlert('Erro ao excluir: ' + e.message, 'Erro');
    }
};

// Ao entrar no módulo pela primeira vez, será chamado pelo auth/routing
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        let oldSwitch = window.switchSection;
        if(oldSwitch) {
            window.switchSection = function(sectionId, btn) {
                oldSwitch(sectionId, btn);
                if(sectionId === 'modulo-acompanhamentos') {
                    window.carregarAcompanhamentos();
                }
            };
        }
    }, 1500);
});
