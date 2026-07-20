
// ==========================================
// MÓDULO DE VERIFICAÇÕES (PUNIÇÕES DIC)
// ==========================================

window.unsubVerificacoes = null;

// Inicializa a escuta do banco
window.carregarVerificacoes = function() {
    if(!ehSuperLideranca) return; // Apenas SubLíder+
    
    let container = document.getElementById('lista-verificacoes');
    if(!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--sup-neon);"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    
    if (window.unsubVerificacoes) window.unsubVerificacoes();
    
    window.unsubVerificacoes = db.collection('verificacoes').orderBy('data', 'desc').onSnapshot(snap => {
        let docs = [];
        let contagemPorNick = {};
        
        snap.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            docs.push(d);
            
            // Lógica do Indulto (45 dias)
            if (d.status === 'Ativa') {
                let msPorDia = 24 * 60 * 60 * 1000;
                let diffDias = Math.floor((new Date() - d.data.toDate()) / msPorDia);
                
                if (diffDias >= 45) {
                    // Auto-Perdoar
                    db.collection('verificacoes').doc(d.id).update({
                        status: 'Perdoada'
                    });
                    d.status = 'Perdoada';
                } else {
                    d.diasCorridos = diffDias;
                    // Acumula contagem
                    let nick = d.alvo.toLowerCase();
                    if(!contagemPorNick[nick]) contagemPorNick[nick] = { nome: d.alvo, docs: [] };
                    contagemPorNick[nick].docs.push(d.id);
                }
            }
        });
        
        renderizarAlertas(contagemPorNick);
        renderizarTabelaVerificacoes(docs);
    }, err => {
        console.error("Erro ao carregar verificações:", err);
        container.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar os dados.</p>';
    });
};

function renderizarAlertas(contagem) {
    let container = document.getElementById('alertas-verificacoes-container');
    container.innerHTML = '';
    
    for (let nick in contagem) {
        if (contagem[nick].docs.length >= 3) {
            let idsString = JSON.stringify(contagem[nick].docs);
            let alertDiv = document.createElement('div');
            alertDiv.style.cssText = 'background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;';
            alertDiv.innerHTML = `
                <div>
                    <h4 style="color:#ef4444; margin:0 0 5px 0;"><i class="fas fa-exclamation-triangle"></i> ALERTA CRÍTICO DE ACÚMULO</h4>
                    <p style="margin:0; font-size:14px; color:#fff;">O policial <b>${contagem[nick].nome}</b> acumulou ${contagem[nick].docs.length} verificações Ativas! Aplicar Advertência.</p>
                </div>
                <button class="btn-tech" style="background:#ef4444; border-color:#ef4444; color:#fff;" onclick='window.zerarVerificacoes(${idsString})'><i class="fas fa-eraser"></i> Zerar Verificações (Advertência)</button>
            `;
            container.appendChild(alertDiv);
        }
    }
}

function renderizarTabelaVerificacoes(docs) {
    let tbody = document.getElementById('tb-verificacoes');
    tbody.innerHTML = '';
    
    if(docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma verificação registrada.</td></tr>';
        return;
    }
    
    docs.forEach(d => {
        let tr = document.createElement('tr');
        
        // Formatar data
        let dateObj = d.data.toDate();
        let dataF = dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        
        let msPorDia = 24 * 60 * 60 * 1000;
        let diffDias = Math.floor((new Date() - dateObj) / msPorDia);
        let progresso = (d.status === 'Ativa') ? `<span style="color:#fbbf24; font-weight:bold;">${diffDias}/45 dias</span>` : '-';
        
        let statusColor = '#fff';
        if (d.status === 'Ativa') statusColor = '#fbbf24';
        if (d.status === 'Perdoada') statusColor = '#10b981';
        if (d.status === 'Cancelada') statusColor = '#6b7280';
        if (d.status.includes('Zerada')) statusColor = '#3b82f6';
        
        let acoes = '';
        if (d.status === 'Ativa') {
            acoes = `<button onclick="window.cancelarVerificacao('${d.id}')" style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ef4444; border-radius:4px; cursor:pointer; padding:3px 8px; font-size:12px;" title="Cancelar (Recurso)"><i class="fas fa-times"></i> Cancelar</button>`;
        }
        
        tr.innerHTML = `
            <td>${dataF}</td>
            <td><b>${d.alvo}</b></td>
            <td>${d.idPromo || 'N/A'}</td>
            <td style="color:${statusColor}; font-weight:bold;">${d.status}</td>
            <td>${progresso}</td>
            <td>${acoes}</td>
        `;
        
        // Detalhes expansíveis (opcional, clicando na linha ou apenas tooltip). Vamos fazer o motivo aparecer num title por enquanto, ou melhor, uma 2a linha escondida.
        // Pra simplicidade, apenas colocamos title no alvo
        tr.title = `Responsável: ${d.responsavel}\nMotivo: ${d.motivo}`;
        
        tbody.appendChild(tr);
    });
}

// ==========================================
// FUNÇÕES DE AÇÃO
// ==========================================

window.aplicarVerificacao = function() {
    let alvo = document.getElementById('verif-alvo').value.trim();
    let idPromo = document.getElementById('verif-id').value.trim();
    let motivo = document.getElementById('verif-motivo').value.trim();
    
    if(!alvo || !motivo) {
        window.customAlert('Preencha pelo menos o Nick do Policial e o Motivo.', 'Atenção');
        return;
    }
    
    let btn = document.getElementById('btn-aplicar-verif');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
    btn.disabled = true;
    
    db.collection('verificacoes').add({
        alvo: alvo,
        idPromo: idPromo,
        motivo: motivo,
        responsavel: window.usuarioLogadoNick || 'Desconhecido',
        data: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'Ativa'
    }).then(() => {
        window.customAlert('Verificação aplicada com sucesso!', 'Sucesso');
        document.getElementById('verif-alvo').value = '';
        document.getElementById('verif-id').value = '';
        document.getElementById('verif-motivo').value = '';
    }).catch(err => {
        console.error(err);
        window.customAlert('Erro ao aplicar: ' + err.message, 'Erro');
    }).finally(() => {
        btn.innerHTML = '<i class="fas fa-gavel"></i> Aplicar Verificação';
        btn.disabled = false;
    });
};

window.cancelarVerificacao = function(id) {
    if(confirm('Tem certeza que deseja CANCELAR essa verificação (Recurso Vencido)?')) {
        db.collection('verificacoes').doc(id).update({
            status: 'Cancelada'
        }).then(() => {
            window.customAlert('Verificação cancelada.', 'Sucesso');
        });
    }
};

window.zerarVerificacoes = function(ids) {
    if(confirm('Confirmar o ACÚMULO (Advertência Aplicada)? Isso mudará o status das 3 verificações para Zerada.')) {
        let batch = db.batch();
        ids.forEach(id => {
            let ref = db.collection('verificacoes').doc(id);
            batch.update(ref, { status: 'Zerada (Advertência)' });
        });
        batch.commit().then(() => {
            window.customAlert('Verificações zeradas com sucesso!', 'Sucesso');
        }).catch(err => {
            window.customAlert('Erro ao zerar: ' + err.message, 'Erro');
        });
    }
};


// Ao autenticar, se for Liderança, carrega
firebase.auth().onAuthStateChanged(user => {
    if(user) {
        setTimeout(() => {
            if (window.ehSuperLideranca) {
                window.carregarVerificacoes();
            }
        }, 2000); // Aguarda o auth setar as flags globais
    }
});
