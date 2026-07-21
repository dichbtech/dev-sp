/*
* Módulo: Avisos
* Alvo: Supervisores (Executores) e Liderança (Criadores e Auditores)
*/

window.abaAtivaAvisos = 'avisos-disp';
window.unsubAvisos = null;

// Fallback templates. We try to fetch from Firebase config first.
window.templatesAvisos = {
    'Reforço Promocional': "Olá, [militar]! A Liderança dos Supervisores comunica que você negligenciou o procedimento pós-promoção na promoção de ID [id_promo]. Reforçamos que o PPP é extremamente necessário... Segue o link... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Aviso': "Olá, [militar]! A Liderança dos Supervisores comunica que está recebendo um aviso pelo seguinte motivo: [motivo], conforme previsto no artigo 34 do Regulamento Disciplinar... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Verificação': "Olá, [militar]! A Liderança dos Supervisores comunica que você está recebendo uma verificação pelo seguinte motivo: [motivo]. Ao passar 60 dias, esta verificação será perdoada... O ID da promoção incorreta é [id_promo]... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Verificação Negligência PPP': "Olá, [militar]! A Liderança dos Supervisores comunica que você está recebendo uma verificação por negligenciar o procedimento pós-promoção na promoção de ID [id_promo], pelo seguinte motivo: [motivo]... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Verificação Perdoada': "Olá, [militar]! A Liderança dos Supervisores comunica que sua verificação referente à promoção de ID [id_promo] foi zerada... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Advertência Promover Incorretamente': "Olá, [militar]! A Liderança dos Supervisores comunica que você está recebendo uma advertência pelo seguinte motivo: [motivo]. O ID da advertência recebida é [id_pun] e da promoção incorreta é [id_promo]... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Advertência Ausência': "Olá, [militar]! A Liderança dos Supervisores comunica que recebeu uma advertência, por ausentar-se de suas atividades por 07 dias ou mais sem a solicitação de uma licença. O ID da advertência recebida é [id_pun]... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Advertência Acúmulo': "Olá, [militar]! A Liderança dos Supervisores comunica que recebeu uma advertência pelo acúmulo de 03 verificações... O ID da advertência recebida é [id_pun]... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Advertência Perfil Offline': "Olá, [militar]! A Liderança dos Supervisores comunica que recebeu uma advertência pelo seguinte motivo: [motivo]... O ID da advertência recebida é [id_pun]... Atenciosamente, [membro], Membro dos Supervisores. ®",
    'Rebaixamento': "Olá, [militar]! A Liderança dos Supervisores comunica que você foi rebaixado pelo acúmulo de 03 advertências escritas. O ID do rebaixamento recebido é [id_pun]... Atenciosamente, [membro], Membro dos Supervisores. ®"
};

// Carregar templates dinâmicos
window.carregarTemplatesAvisos = function() {
    if(!window.db) return;
    window.db.collection('configuracoes').doc('textos_avisos').onSnapshot(doc => {
        if(doc.exists && doc.data().templates) {
            window.templatesAvisos = doc.data().templates;
        }
    });
};

window.switchTabAvisos = function(tabId, btnElement) {
    window.abaAtivaAvisos = tabId;
    document.querySelectorAll('#tabs-avisos .btn-tab').forEach(el => el.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    window.carregarAvisos();
};

window.abrirModalCriarAviso = async function() {
    let modalId = 'modal-criar-aviso';
    let m = document.getElementById(modalId);
    if(m) m.remove();

    // Obter próximo ID de aviso (simples contagem ou busca do último ID)
    let nextId = 1;
    try {
        let qs = await window.db.collection('avisos').orderBy('numAviso', 'desc').limit(1).get();
        if(!qs.empty) {
            nextId = qs.docs[0].data().numAviso + 1;
        }
    } catch(e) {}

    let optionsHTML = Object.keys(window.templatesAvisos).map(k => `<option value="${k}">${k}</option>`).join('');

    let html = `
    <div class="modal-overlay" id="${modalId}" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); z-index:99999; justify-content:center; align-items:center;">
        <div class="modal-content card" style="width:90%; max-width:550px; padding:30px; position:relative;">
            <button onclick="document.getElementById('${modalId}').remove()" style="position:absolute; top:15px; right:20px; background:none; border:none; color:#ff2a2a; font-size:24px; cursor:pointer;"><i class="fas fa-times"></i></button>
            <h3 style="margin-top:0;"><i class="fas fa-bullhorn"></i> Emitir Novo Aviso</h3>
            <p style="margin-top:0; font-size:12px; color:var(--text-sub);">Aviso Nº <b>${nextId}</b> será gerado automaticamente.</p>
            
            <div style="display:flex; gap:10px; margin-top:15px;">
                <div class="input-group" style="flex:1;">
                    <label>Nick do Alvo</label>
                    <input type="text" id="aviso-alvo" class="input-padrao" placeholder="Quem receberá o aviso?" required>
                </div>
                <div class="input-group" style="flex:1;">
                    <label>Tipo de Comunicado</label>
                    <select id="aviso-tipo" class="input-padrao" onchange="window.onChangeTipoAviso()">
                        <option value="">Selecione...</option>
                        ${optionsHTML}
                    </select>
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:15px;">
                <div class="input-group" id="box-id-pun" style="flex:1; display:none;">
                    <label>ID da Punição</label>
                    <input type="number" id="aviso-id-pun" class="input-padrao" placeholder="Ex: 123">
                </div>
                <div class="input-group" id="box-id-promo" style="flex:1; display:none;">
                    <label>ID da Promoção</label>
                    <input type="number" id="aviso-id-promo" class="input-padrao" placeholder="Ex: 456">
                </div>
            </div>
            
            <div class="input-group" style="margin-top:15px;" id="box-motivo">
                <label>Motivo</label>
                <textarea id="aviso-motivo" class="input-padrao" rows="3" placeholder="Qual o motivo?"></textarea>
            </div>
            
            <button class="btn-tech" style="width:100%; margin-top:20px;" onclick="window.salvarNovoAviso(${nextId})"><i class="fas fa-paper-plane"></i> Emitir Aviso</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.onChangeTipoAviso = function() {
    let t = document.getElementById('aviso-tipo').value;
    let bPun = document.getElementById('box-id-pun');
    let bPro = document.getElementById('box-id-promo');
    
    bPun.style.display = 'none';
    bPro.style.display = 'none';

    if (t.includes('Advertência') || t.includes('Rebaixamento')) {
        bPun.style.display = 'block';
    }
    if (t.includes('Reforço') || t.includes('Verificação') || t.includes('Incorretamente')) {
        bPro.style.display = 'block';
    }
};

window.salvarNovoAviso = async function(nextId) {
    let alvo = document.getElementById('aviso-alvo').value.trim();
    let tipo = document.getElementById('aviso-tipo').value;
    let motivo = document.getElementById('aviso-motivo').value.trim();
    let idPun = document.getElementById('aviso-id-pun').value.trim();
    let idPromo = document.getElementById('aviso-id-promo').value.trim();
    
    if(!alvo || !tipo) {
        window.customAlert('Preencha os campos obrigatórios (Alvo e Tipo).', 'Erro');
        return;
    }
    
    let btn = document.querySelector('#modal-criar-aviso .btn-tech');
    let txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Emitindo...';
    btn.disabled = true;
    
    try {
        await window.db.collection('avisos').add({
            numAviso: nextId,
            criador: window.usuarioLogadoNick || 'Desconhecido',
            alvo: alvo,
            tipo: tipo,
            motivo: motivo,
            idPun: idPun,
            idPromo: idPromo,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pendente', // pendente, concluido
            responsavel: null, // quem assumiu
            dataConclusao: null,
            linkPrint: null
        });
        document.getElementById('modal-criar-aviso').remove();
        window.customAlert('Aviso emitido com sucesso!', 'Sucesso');
    } catch(e) {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
        window.customAlert('Erro: ' + e.message, 'Erro');
    }
};

window.carregarAvisos = function() {
    let container = document.getElementById('avisos-lista');
    if(!container) return;

    let nivel = window.nivelUsuarioGlobal;
    let ehLideranca = ['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(nivel);
    
    let btnCriar = document.getElementById('btn-criar-aviso-box');
    if (btnCriar) {
        btnCriar.style.display = ehLideranca ? 'block' : 'none';
    }

    container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><br>Buscando avisos...</div>';

    if (window.unsubAvisos) window.unsubAvisos();

    let ref = window.db.collection('avisos');

    if (window.abaAtivaAvisos === 'avisos-disp') {
        ref = ref.where('status', '==', 'pendente');
    } else if (window.abaAtivaAvisos === 'avisos-conc') {
        ref = ref.where('status', '==', 'concluido');
    }

    window.unsubAvisos = ref.onSnapshot(snap => {
        let docs = [];
        snap.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            docs.push(d);
        });

        // Ordenar por data decrescente
        docs.sort((a,b) => {
            let tA = a.dataCriacao ? a.dataCriacao.toMillis() : 0;
            let tB = b.dataCriacao ? b.dataCriacao.toMillis() : 0;
            return tB - tA;
        });

        container.innerHTML = '';
        if(docs.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-sub);">Nenhum aviso encontrado nesta aba.</div>';
            return;
        }

        docs.forEach(d => {
            container.appendChild(window.gerarCardAviso(d, ehLideranca));
        });
    });
};

window.gerarCardAviso = function(d, ehLideranca) {
    let div = document.createElement('div');
    div.className = 'card';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.border = '1px solid rgba(251,191,36,0.2)';
    div.style.position = 'relative';
    div.style.margin = '0'; 
    div.style.padding = '20px';

    let dataF = 'Data desconhecida';
    if(d.dataCriacao) {
        let dt = d.dataCriacao.toDate();
        dataF = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    }

    let statusHtml = '';
    if (d.invalido) {
        statusHtml = '<span style="background:#ff2a2a; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">INVALIDADO</span>';
    } else if (d.status === 'pendente') {
        statusHtml = '<span style="background:var(--sup-neon); color:#000; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">PENDENTE</span>';
    } else {
        statusHtml = '<span style="background:#4caf50; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">ENVIADO</span>';
    }

    // Gerar Texto Automático (Preview)
    let template = window.templatesAvisos[d.tipo] || `Você recebeu um(a) ${d.tipo}. Motivo: [motivo].`;
    let textoGerado = template
        .replace(/\[militar\]/g, d.alvo || '')
        .replace(/\[id_promo\]/g, d.idPromo || 'N/A')
        .replace(/\[id_pun\]/g, d.idPun || 'N/A')
        .replace(/\[motivo\]/g, d.motivo || '')
        .replace(/\[membro\]/g, d.responsavel || (window.usuarioLogadoNick || '[Seu Nick]'));

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
            <div style="font-size:16px; font-weight:bold; color:#fff;">Aviso #${d.numAviso || '?'}</div>
            <div>${statusHtml}</div>
        </div>
        <div style="margin-bottom:10px; font-size:14px; color:var(--sup-neon); font-weight:bold;">${d.tipo}</div>
        <div style="font-size:12px; color:var(--text-sub); margin-bottom:10px;">
            Para: <b>${d.alvo}</b><br>
            Liberado por <b>${d.criador}</b> em ${dataF}
        </div>
    `;

    if (d.status === 'pendente') {
        if (!d.responsavel) {
            html += `<button class="btn-tech" style="width:100%; margin-top:10px;" onclick="window.assumirAviso('${d.id}')"><i class="fas fa-hand-paper"></i> Assumir Aviso</button>`;
        } else if (d.responsavel === window.usuarioLogadoNick) {
            html += `
                <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; margin:10px 0; font-size:13px; border-left:3px solid #2196F3;">
                    <span style="color:#aaa; font-size:11px; display:block; margin-bottom:5px;">Texto Gerado para o Telegram:</span>
                    <div id="txt-aviso-${d.id}" style="user-select:all; line-height:1.4;">${textoGerado}</div>
                </div>
                <button class="btn-tech" style="width:100%; margin-bottom:15px; background:rgba(251,191,36,0.1); border-color:var(--sup-neon); color:var(--sup-neon);" onclick="window.copiarTextoAviso('${d.id}')"><i class="fas fa-copy"></i> Copiar Texto</button>
                
                <div class="input-group">
                    <label>Link do Imgur (Comprovação de Envio)</label>
                    <input type="text" id="img-aviso-${d.id}" class="input-padrao" placeholder="https://imgur.com/...">
                </div>
                
                <button class="btn-tech" style="width:100%; padding:10px; font-size:14px; background:#4caf50; border-color:#4caf50; margin-top:15px;" onclick="window.concluirAviso('${d.id}')"><i class="fas fa-check"></i> Concluir Envio</button>
            `;
        } else {
            html += `<div style="margin-top:10px; font-size:13px; color:#ff9800;"><i class="fas fa-lock"></i> Sendo assumido por: <b>${d.responsavel}</b></div>`;
        }
        
        if (ehLideranca || d.criador === window.usuarioLogadoNick) {
            html += `<button onclick="window.excluirAviso('${d.id}')" style="width:100%; margin-top:15px; background:none; border:1px solid #ff2a2a; color:#ff2a2a; border-radius:6px; padding:8px; cursor:pointer;"><i class="fas fa-trash"></i> Excluir</button>`;
        }
    } else { // Concluído
        let dataConc = 'Data desconhecida';
        if(d.dataConclusao) {
            let dt = d.dataConclusao.toDate();
            dataConc = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        }
        html += `<div style="margin-bottom:10px; font-size:13px; color:var(--text-sub);"><i class="fas fa-check-circle" style="color:#4caf50;"></i> Enviado por: <b>${d.responsavel}</b> em ${dataConc}</div>`;
        
                if (ehLideranca) {
            let btnInvalidar = d.invalido ? 
                `<button onclick="window.invalidarAviso('${d.id}', true)" style="width:100%; margin-top:15px; background:rgba(76,175,80,0.1); border:1px solid #4caf50; color:#4caf50; border-radius:6px; padding:8px; cursor:pointer;"><i class="fas fa-check"></i> Revalidar Aviso</button>` : 
                `<button onclick="window.invalidarAviso('${d.id}', false)" style="width:100%; margin-top:15px; background:rgba(255,42,42,0.1); border:1px solid #ff2a2a; color:#ff2a2a; border-radius:6px; padding:8px; cursor:pointer;"><i class="fas fa-ban"></i> Invalidar Aviso</button>`;
            html += `
                <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; margin-top:10px;">
                    <div style="font-size:12px; color:#aaa; margin-bottom:10px;">Link de Comprovação: <a href="${d.linkPrint}" target="_blank" style="color:var(--sup-neon);">${d.linkPrint}</a></div>
                    ${(d.linkPrint && window.renderImgurEmbed) ? window.renderImgurEmbed(d.linkPrint) : ''}
                    ${btnInvalidar}
                </div>
            `;
        }
    }

    div.innerHTML = html;
    return div;
};

window.assumirAviso = async function(id) {
    if(!window.usuarioLogadoNick) return;
    try {
        await window.db.collection('avisos').doc(id).update({
            responsavel: window.usuarioLogadoNick
        });
    } catch(e) {
        window.customAlert('Erro ao assumir: ' + e.message, 'Erro');
    }
};

window.copiarTextoAviso = function(id) {
    let txtArea = document.getElementById('txt-aviso-'+id);
    if(txtArea) {
        let texto = txtArea.innerText || txtArea.textContent;
        navigator.clipboard.writeText(texto).then(() => {
            window.customAlert('Texto copiado para a área de transferência!', 'Sucesso');
        }).catch(err => {
            window.customAlert('Não foi possível copiar. Selecione manualmente.', 'Aviso');
        });
    }
};

window.concluirAviso = async function(id) {
    let imgLink = document.getElementById('img-aviso-'+id).value.trim();
    if(!imgLink || !imgLink.includes('imgur.com')) {
        window.customAlert('Por favor, insira um link válido do Imgur.', 'Aviso');
        return;
    }

    try {
        await window.db.collection('avisos').doc(id).update({
            status: 'concluido',
            linkPrint: imgLink,
            dataConclusao: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        window.customAlert('Erro ao concluir: ' + e.message, 'Erro');
    }
};

window.excluirAviso = async function(id) {
    if(!confirm("Tem certeza que deseja excluir este aviso?")) return;
    try {
        await window.db.collection('avisos').doc(id).delete();
    } catch(e) {
        window.customAlert('Erro ao excluir: ' + e.message, 'Erro');
    }
};

// Ao entrar no módulo pela primeira vez, será chamado pelo auth/routing
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(window.carregarTemplatesAvisos) window.carregarTemplatesAvisos();
        let oldSwitch = window.switchSection;
        if(oldSwitch) {
            window.switchSection = function(sectionId, btn) {
                oldSwitch(sectionId, btn);
                if(sectionId === 'modulo-acompanhamentos') {
                    if(window.carregarAcompanhamentos) window.carregarAcompanhamentos();
                }
                if(sectionId === 'modulo-avisos') {
                    if(window.carregarAvisos) window.carregarAvisos();
                }
            };
        }
    }, 1500);
});
