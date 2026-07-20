
// ==========================================
// MÓDULO DE CONTROLE INTERNO GERAL
window.unsubSolicitacoes = null;
window.unsubRetiradas = null;

// Proxy Cloudflare Workers dedicado
window.CORS_PROXY = 'https://supervisores.alvesedu-br.workers.dev/?url=';
window.URL_MEMBROS_DIVISAO = 'https://policiadic.com/funcao/supervisores/tabela/membros';
window.URL_PATENTES = 'https://policiadic.com/lista/membros';
window.URL_LICENCAS = 'https://policiadic.com/lista/aval';
window.URL_NOTIFICACOES = 'https://policiadic.com/funcao/supervisores/tabela/notificacao';

window.dadosGeraisRH = {
    membrosDivisao: [],
    patentes: new Map(),
    licencas: new Map(),
    notificacoes: [],
    emails: new Map() // Salvos no nosso Firebase
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================

window.carregarModuloRH = async function() {
    // Verificar permissões
    let ehAuxiliar = ['AUXILIAR', 'SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal);
    let ehSuperLider = ['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal);
    
    if (!ehAuxiliar) return;

    if(!ehSuperLider) {
        document.getElementById('tab-rh-membros').style.display = 'none';
        document.getElementById('tab-rh-retiradas').style.display = 'none';
        document.getElementById('tab-rh-notificacoes').style.display = 'none';
        window.switchTabRH('Solicitacoes', document.getElementById('tab-rh-solicitacoes'));
    } else {
        window.switchTabRH('Membros', document.getElementById('tab-rh-membros'));
    }

    iniciarListenersFirebaseRH();
    
    // Sempre carrega APIs se for auxiliar ou super, pois auxiliar precisa buscar o Cargo na solicitação
    await carregarAPIsGerais();
};

window.switchTabRH = function(tabName, btnElement) {
    document.querySelectorAll('#tabs-rh .btn-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.rh-view').forEach(v => v.style.display = 'none');
    
    if(btnElement) btnElement.classList.add('active');
    let view = document.getElementById('rh-view-' + tabName.toLowerCase());
    if(view) view.style.display = 'block';
    
    if(tabName === 'Membros') renderizarMembrosAtivos();
    if(tabName === 'Notificacoes') renderizarNotificacoes();
};

// ==========================================
// INTEGRAÇÃO DE APIS E CROSS-DATA
// ==========================================

window.parseHtmlTable = function(htmlStr) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(htmlStr, 'text/html');
    let table = doc.querySelector('table');
    if(!table) return [];
    
    let headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
    let rows = Array.from(table.querySelectorAll('tbody tr'));
    
    return rows.map(tr => {
        let obj = {};
        let tds = Array.from(tr.querySelectorAll('td'));
        tds.forEach((td, i) => {
            if(headers[i]) obj[headers[i]] = td.textContent.trim();
        });
        return obj;
    });
}

window.fetchSeguro = async function(url) {
    let htmlText = '';
    try {
        let response = await fetch(url);
        if(!response.ok) throw new Error('Erro HTTP ' + response.status);
        htmlText = await response.text();
    } catch (e) {
        console.warn('Falha acesso direto, tentando proxy para:', url);
        try {
            let proxyRes = await fetch(CORS_PROXY + encodeURIComponent(url));
            if(!proxyRes.ok) throw new Error('Proxy falhou ' + proxyRes.status);
            htmlText = await proxyRes.text();
        } catch (e2) {
            console.error('Erro absoluto no Fetch:', e2);
            return [];
        }
    }
    
    try {
        return JSON.parse(htmlText);
    } catch(e) {
        return parseHtmlTable(htmlText);
    }
}

async function carregarAPIsGerais() {
    let containerStatus = document.getElementById('rh-loading-status');
    if(containerStatus) containerStatus.style.display = 'block';
    
    try {
        let snapEmails = await db.collection('membros_emails').get();
        window.dadosGeraisRH.emails.clear();
        snapEmails.forEach(doc => {
            window.dadosGeraisRH.emails.set(doc.id.replace('[', '').toLowerCase(), doc.data().email);
        });

        const [membrosRes, patentesRes, licencasRes, notificacoesRes] = await Promise.all([
            fetchSeguro(URL_MEMBROS_DIVISAO),
            fetchSeguro(URL_PATENTES),
            fetchSeguro(URL_LICENCAS),
            fetchSeguro(URL_NOTIFICACOES)
        ]);
        
        window.dadosGeraisRH.patentes.clear();
        if(Array.isArray(patentesRes)) {
            patentesRes.forEach(p => {
                if(p.Nick) window.dadosGeraisRH.patentes.set(p.Nick.replace('[', '').toLowerCase(), p);
            });
        }
        
        window.dadosGeraisRH.licencas.clear();
        if(Array.isArray(licencasRes)) {
            licencasRes.forEach(l => {
                if(l.Envolvido && l.Status === 'Aprovado') {
                    window.dadosGeraisRH.licencas.set(l.Envolvido.replace('[', '').toLowerCase(), l);
                }
            });
        }
        
        window.dadosGeraisRH.membrosDivisao = Array.isArray(membrosRes) ? membrosRes : [];
        window.dadosGeraisRH.notificacoes = Array.isArray(notificacoesRes) ? notificacoesRes : [];
        
        if (window.dadosGeraisRH.membrosDivisao.length === 0) {
            console.error("A tabela de membros retornou vazia! Verifique as configurações de proxy e CORS.");
            window.customAlert('Erro: Não foi possível obter os dados da API de membros. Pode haver bloqueio do Cloudflare ou falha no Proxy Vercel (/api/proxy).', 'Falha na Busca');
        }
        
        renderizarMembrosAtivos();
        renderizarNotificacoes();
        
    } catch (err) {
        console.error("Erro no Promise.all das APIs:", err);
        window.customAlert('Erro ao sincronizar com o system. Alguns dados podem estar faltando.', 'Erro de Sincronização');
    } finally {
        if(containerStatus) containerStatus.style.display = 'none';
    }
}

// ==========================================
// ABA 1: MEMBROS ATIVOS
// ==========================================

function renderizarMembrosAtivos() {
    let tbody = document.getElementById('tb-rh-membros');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let membros = window.dadosGeraisRH.membrosDivisao;
    if(membros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum membro encontrado ou dados carregando...</td></tr>';
        return;
    }
    
    membros.forEach(m => {
        let rawNick = (m.Nickname || m.Nick || 'N/A').replace('[', '');
        let nickLower = rawNick.toLowerCase();
        
        let dadosPatente = window.dadosGeraisRH.patentes.get(nickLower) || {};
        let patente = dadosPatente['Posto/Grad'] || 'Desconhecida';
        
        let dadosLicenca = window.dadosGeraisRH.licencas.get(nickLower);
        let status = dadosLicenca ? `<span style="color:#fbbf24;"><i class="fas fa-bed"></i> Licença</span><br><span style="font-size: 10px; color: #aaa;">de ${dadosLicenca['Data de Início'] || '?'} a ${dadosLicenca['Data de Término'] || '?'}</span>` : `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Ativo</span>`;
        
        let email = window.dadosGeraisRH.emails.get(nickLower) || '';
        let funcaoRaw = m.Cargos || m.Cargo || 'Sp';
        
        const mapaFuncoes = {
            "L.Sp": "Líder",
            "V.Sp": "Vice-Líder",
            "S.Sp": "Sub-Líder",
            "A.Sp": "Auxiliar",
            "Sp": "Supervisor"
        };
        let funcaoInterna = mapaFuncoes[funcaoRaw] || funcaoRaw;
        
        let dataAsc = m['Data e Hora'] || '';
        let textoDias = '';
        if(dataAsc.includes('/')) {
            try {
                let dataS = dataAsc.split(' ')[0];
                let partes = dataS.split('/');
                let dataObj = new Date(partes[2], partes[1] - 1, partes[0]);
                let diffTime = Math.abs(new Date() - dataObj);
                let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                textoDias = `<br><span style="font-size: 10px; color: #aaa;">Há ${diffDays} dias atrás</span>`;
            } catch(e){}
        }

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${rawNick}</b></td>
            <td>${patente}</td>
            <td>${funcaoInterna}</td>
            <td>${dataAsc} ${textoDias}</td>
            <td>
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="email" id="email-${nickLower}" class="form-input" style="padding:2px 5px; height:24px; font-size:12px; width:120px;" placeholder="Sem e-mail" value="${email}">
                    <button onclick="salvarEmailRH('${nickLower}')" style="background:transparent; color:var(--accent); border:none; cursor:pointer;" title="Salvar Email"><i class="fas fa-edit"></i></button>
                </div>
            </td>
            <td>${status}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.salvarEmailRH = function(nickLower) {
    let emailInput = document.getElementById(`email-${nickLower}`).value.trim();
    db.collection('membros_emails').doc(nickLower).set({
        email: emailInput,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        window.dadosGeraisRH.emails.set(nickLower, emailInput);
        window.customAlert('E-mail salvo com sucesso.', 'Sucesso');
    }).catch(err => {
        window.customAlert('Erro ao salvar email: ' + err.message, 'Erro');
    });
};

window.demitirMembroRH = function(nick, cargo) {
    if(confirm(`Tem certeza que deseja DEMITIR e Retirar ${nick} da divisão? O membro será movido para a tabela de Retiradas.`)) {
        let nickLower = nick.replace('[', '').toLowerCase();
        let email = window.dadosGeraisRH.emails.get(nickLower) || 'Não informado';
        
        db.collection('retiradas').add({
            nick: nick,
            cargo: cargo,
            email: email,
            responsavel: window.usuarioLogadoNick,
            dataRetirada: firebase.firestore.FieldValue.serverTimestamp(),
            checks: { system: false, groups: false, habbo: false }
        }).then(() => {
            window.customAlert(`${nick} movido para a lista de Retiradas. Lembre-se de removê-lo oficialmente no System.`, 'Sucesso');
            carregarAPIsGerais();
        });
    }
};

// ==========================================
// ABA 2: RETIRADAS (OFFBOARDING)
// ==========================================

function iniciarListenersFirebaseRH() {
    let ehSuperLider = ['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal);
    
    if(ehSuperLider) {
        if(window.unsubRetiradas) window.unsubRetiradas();
        window.unsubRetiradas = db.collection('retiradas').orderBy('dataRetirada', 'desc').onSnapshot(snap => {
            let tbody = document.getElementById('tb-rh-retiradas');
            if(!tbody) return;
            tbody.innerHTML = '';
            
            if(snap.empty) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma retirada pendente.</td></tr>';
                return;
            }
            
            snap.forEach(doc => {
                let d = doc.data();
                let isAllChecked = (d.checks && d.checks.system && d.checks.groups && d.checks.habbo);
                
                let tr = document.createElement('tr');
                if(isAllChecked) tr.style.background = 'rgba(16, 185, 129, 0.1)';
                
                let dateStr = d.dataRetirada ? d.dataRetirada.toDate().toLocaleDateString('pt-BR') : 'Recente';
                
                tr.innerHTML = `
                    <td><b>${d.nick}</b></td>
                    <td><span style="font-size:12px; color:#aaa;">${d.email}</span></td>
                    <td>${d.cargo}</td>
                    <td>${dateStr}<br><span style="font-size:11px; color:#888;">Por: ${d.responsavel}</span></td>
                    <td>
                        <div style="display:flex; gap:10px;">
                            <label style="cursor:pointer;"><input type="checkbox" ${d.checks.system ? 'checked' : ''} onchange="toggleCheckRetirada('${doc.id}', 'system', this.checked)"> SYSTEM</label>
                            <label style="cursor:pointer;"><input type="checkbox" ${d.checks.groups ? 'checked' : ''} onchange="toggleCheckRetirada('${doc.id}', 'groups', this.checked)"> GROUPS</label>
                            <label style="cursor:pointer;"><input type="checkbox" ${d.checks.habbo ? 'checked' : ''} onchange="toggleCheckRetirada('${doc.id}', 'habbo', this.checked)"> HABBO</label>
                        </div>
                    </td>
                    <td>${isAllChecked ? '<span style="color:#10b981; font-weight:bold;"><i class="fas fa-check"></i> Acervo</span>' : '<span style="color:#fbbf24;"><i class="fas fa-clock"></i> Pendente</span>'}</td>
                `;
                tbody.appendChild(tr);
            });
        });
    }

    if(window.unsubSolicitacoes) window.unsubSolicitacoes();
    window.unsubSolicitacoes = db.collection('solicitacoes').orderBy('dataEntrada', 'desc').onSnapshot(snap => {
        let tbody = document.getElementById('tb-rh-solicitacoes');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        if(snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum recruta no funil.</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            let d = doc.data();
            if(d.status !== 'Pendente') return;
            
            let dtEntrada = d.dataEntrada ? d.dataEntrada.toDate() : new Date();
            let dtVencimento = d.vencimento ? d.vencimento.toDate() : new Date();
            let hoje = new Date();
            
            let stylePrazo = (hoje > dtVencimento) ? 'color:#ef4444; font-weight:bold;' : 'color:#10b981;';
            
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${d.nick}</b></td>
                <td>${d.patente || 'Desconhecido'}</td>
                <td>${d.telegram}</td>
                <td>${dtEntrada.toLocaleDateString('pt-BR')}</td>
                <td style="${stylePrazo}">${dtVencimento.toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn-tech" style="padding:4px; font-size:11px;" onclick="renovarPrazoSolicitacao('${doc.id}')" title="Renovar +3 Dias"><i class="fas fa-sync-alt"></i></button>
                    <button class="btn-tech" style="padding:4px; font-size:11px; background:#10b981; color:#fff; border:none;" onclick="aprovarSolicitacao('${doc.id}', '${d.nick}')" title="Aprovou (Ingressou)"><i class="fas fa-check"></i></button>
                    <button class="btn-tech" style="padding:4px; font-size:11px; background:#ef4444; color:#fff; border:none;" onclick="retirarSolicitacao('${doc.id}')" title="Reprovou (Retirar)"><i class="fas fa-times"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

window.toggleCheckRetirada = function(id, campo, valor) {
    let updateData = {};
    updateData[`checks.${campo}`] = valor;
    db.collection('retiradas').doc(id).update(updateData);
};

window.autoFetchEmailRetirada = function(nick) {
    let emailInput = document.getElementById('ret-email');
    if(!nick || !emailInput) return;
    let nickLower = nick.replace('[', '').toLowerCase();
    
    if(window.dadosGeraisRH.emails.has(nickLower)) {
        emailInput.value = window.dadosGeraisRH.emails.get(nickLower);
    } else {
        // Fallback fetch Firebase
        db.collection('membros_emails').doc(nickLower).get().then(doc => {
            if(doc.exists) {
                emailInput.value = doc.data().email;
                window.dadosGeraisRH.emails.set(nickLower, doc.data().email);
            } else {
                emailInput.value = 'Sem E-mail registrado';
            }
        });
    }
};

window.cadastrarRetiradaManual = function() {
    let nick = document.getElementById('ret-nick').value.trim();
    let cargo = document.getElementById('ret-cargo').value.trim();
    let email = document.getElementById('ret-email').value.trim();
    
    if(!nick || !cargo) {
        window.customAlert('Preencha pelo menos o Nick e o Cargo Anterior.', 'Atenção');
        return;
    }
    
    if(email === 'Sem E-mail registrado') email = 'Não informado';
    
    db.collection('retiradas').add({
        nick: nick,
        cargo: cargo,
        email: email,
        responsavel: window.usuarioLogadoNick,
        dataRetirada: firebase.firestore.FieldValue.serverTimestamp(),
        checks: { system: false, groups: false, habbo: false }
    }).then(() => {
        window.customAlert('Retirada cadastrada manualmente.', 'Sucesso');
        document.getElementById('ret-nick').value = '';
        document.getElementById('ret-cargo').value = '';
        document.getElementById('ret-email').value = '';
    });
};

// ==========================================
// ABA 3: NOTIFICAÇÕES (ALERTAS CRÍTICOS)
// ==========================================

function renderizarNotificacoes() {
    let notifs = window.dadosGeraisRH.notificacoes;
    let tbody = document.getElementById('tb-rh-notificacoes');
    let alertasContainer = document.getElementById('rh-notificacoes-alertas');
    if(!tbody || !alertasContainer) return;
    
    tbody.innerHTML = '';
    alertasContainer.innerHTML = '';
    
    if(notifs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma notificação registrada.</td></tr>';
        return;
    }
    
    let contagemPorNick = {};
    let hoje = new Date();
    
    notifs.forEach(n => {
        let status = n.Status || 'Ativo';
        let dataStr = n['Data e Hora'];
        let parseDateStr = dataStr;
        if(parseDateStr && parseDateStr.includes('/')) {
            let parts = parseDateStr.split(' ');
            let dparts = parts[0].split('/');
            if(dparts.length === 3) {
                parseDateStr = `${dparts[2]}-${dparts[1]}-${dparts[0]}`;
                if(parts[1]) parseDateStr += `T${parts[1]}`;
            }
        }
        
        let dtNotif = new Date(parseDateStr);
        let diffDias = 0;
        let isExpirada = false;
        
        if(!isNaN(dtNotif.getTime())) {
            diffDias = Math.floor((hoje - dtNotif) / (24 * 60 * 60 * 1000));
            if(diffDias >= 45 && (status === 'Aprovado' || status === 'Ativo' || status === 'Válida')) {
                isExpirada = true;
            }
        }
        
        let nickLower = (n.Envolvido || '').replace('[', '').toLowerCase();
        if(status === 'Aprovado' || status === 'Ativo' || status === 'Válida') {
            contagemPorNick[nickLower] = (contagemPorNick[nickLower] || 0) + 1;
        }
        
        let tr = document.createElement('tr');
        if(isExpirada) tr.style.background = 'rgba(239, 68, 68, 0.1)';
        
        tr.innerHTML = `
            <td>#${n['# (ID)'] || n.ID || n['#'] || '-'}</td>
            <td>${n.Aplicador || '-'}</td>
            <td><b>${(n.Envolvido || '-').replace('[', '')}</b></td>
            <td>${n['Data e Hora'] || '-'}</td>
            <td>
                ${isExpirada ? '<span style="color:#ef4444; font-weight:bold; padding:2px 5px; background:rgba(239,68,68,0.2); border-radius:4px;"><i class="fas fa-exclamation-triangle"></i> EXPIRADA</span>' : status}
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    for (let nick in contagemPorNick) {
        if(contagemPorNick[nick] >= 3) {
            let alertDiv = document.createElement('div');
            alertDiv.style.cssText = 'background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align:center; box-shadow: 0 0 15px rgba(239,68,68,0.4);';
            alertDiv.innerHTML = `
                <h4 style="color:#ef4444; margin:0 0 5px 0;"><i class="fas fa-biohazard"></i> ATENÇÃO CRÍTICA (EXONERAÇÃO)</h4>
                <p style="margin:0; font-size:15px; color:#fff;">O membro <b>${nick.toUpperCase()}</b> acumulou 3 ou mais notificações internas vigentes. Proceder com exoneração, aplicação de advertência e cancelamento das notificações.</p>
            `;
            alertasContainer.appendChild(alertDiv);
        }
    }
}

// ==========================================
// ABA 4: SOLICITAÇÕES (FUNIL)
// ==========================================

window.autoFetchCargo = function(nick) {
    let feed = document.getElementById('solic-cargo-feedback');
    if(!nick || !feed) return;
    
    let nickLower = nick.replace('[', '').toLowerCase();
    let dadosPatente = window.dadosGeraisRH.patentes.get(nickLower);
    if(dadosPatente && dadosPatente['Posto/Grad']) {
        feed.innerHTML = `Cargo/Posto/Graduação Encontrado: <b>${dadosPatente['Posto/Grad']}</b>`;
        feed.dataset.patente = dadosPatente['Posto/Grad'];
    } else {
        feed.innerHTML = `<span style="color:#fbbf24;">Não encontrado na Base Geral. Será registrado como 'Desconhecido'.</span>`;
        feed.dataset.patente = 'Desconhecido';
    }
};

window.adicionarSolicitacaoRH = function() {
    let nick = document.getElementById('solic-nick').value.trim();
    let telegram = document.getElementById('solic-telegram').value.trim();
    let feed = document.getElementById('solic-cargo-feedback');
    
    if(!nick || !telegram) {
        window.customAlert('Preencha o Nick e o Telegram!', 'Atenção');
        return;
    }
    
    let patente = feed && feed.dataset.patente ? feed.dataset.patente : 'Desconhecido';
    
    let dataEntrada = new Date();
    let dataVencimento = new Date();
    dataVencimento.setDate(dataEntrada.getDate() + 3);
    
    db.collection('solicitacoes').add({
        nick: nick,
        patente: patente,
        telegram: telegram,
        dataEntrada: firebase.firestore.Timestamp.fromDate(dataEntrada),
        vencimento: firebase.firestore.Timestamp.fromDate(dataVencimento),
        status: 'Pendente',
        responsavel: window.usuarioLogadoNick
    }).then(() => {
        window.customAlert('Policial inserido com sucesso!', 'Sucesso');
        document.getElementById('solic-nick').value = '';
        document.getElementById('solic-telegram').value = '';
        if(feed) feed.innerHTML = '';
    }).catch(err => window.customAlert('Erro: ' + err.message, 'Erro'));
};

window.renovarPrazoSolicitacao = function(id) {
    let dataEntrada = new Date();
    let dataVencimento = new Date();
    dataVencimento.setDate(dataEntrada.getDate() + 3);
    
    db.collection('solicitacoes').doc(id).update({
        dataEntrada: firebase.firestore.Timestamp.fromDate(dataEntrada),
        vencimento: firebase.firestore.Timestamp.fromDate(dataVencimento)
    }).then(() => window.customAlert('Prazo renovado para +3 dias!', 'Sucesso'));
};

window.aprovarSolicitacao = function(id, nick) {
    if(confirm(`Confirmar o INGRESSO de ${nick} na divisão? Ele sairá desta lista.`)) {
        db.collection('solicitacoes').doc(id).update({
            status: 'Ingressou'
        }).then(() => {
            window.customAlert(`${nick} aprovado! Lembre-se de adicioná-lo oficialmente no System.`, 'Sucesso');
        });
    }
};

window.retirarSolicitacao = function(id) {
    if(confirm(`O policial falhou ou desistiu? Isso o removerá do funil.`)) {
        db.collection('solicitacoes').doc(id).update({
            status: 'Retirado'
        });
    }
};

firebase.auth().onAuthStateChanged(user => {
    if(user) {
        setTimeout(() => {
            if (window.ehLideranca || ['AUXILIAR'].includes(window.nivelUsuarioGlobal)) {
                window.carregarModuloRH();
            }
        }, 3000);
    }
});
