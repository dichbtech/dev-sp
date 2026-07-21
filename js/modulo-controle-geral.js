
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
    emails: new Map(),
    congelados: new Set()
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
    if(view) view.style.display = 'flex';
    
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
        let snapCongelados = await db.collection('membros_congelados').get();
        window.dadosGeraisRH.congelados.clear();
        snapCongelados.forEach(doc => window.dadosGeraisRH.congelados.add(doc.id.toLowerCase()));

        window.dadosGeraisRH.emails.clear();
        snapEmails.forEach(doc => {
            window.dadosGeraisRH.emails.set(doc.id.replace(/\[/g, '').replace(/\]/g, '').toLowerCase(), doc.data().email);
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
                if(p.Nick) window.dadosGeraisRH.patentes.set(p.Nick.replace(/\[/g, '').replace(/\]/g, '').toLowerCase(), p);
            });
        }
        
        window.dadosGeraisRH.licencas.clear();
        if(Array.isArray(licencasRes)) {
            licencasRes.forEach(l => {
                if(l.Envolvido && l.Status && !l.Status.toLowerCase().includes('cancelad') && !l.Status.toLowerCase().includes('reprovad')) {
                    // Verificacao de Vigencia
                    let dtI = l['Data e Inicio'] || l['Data de Início'] || l['Data Início'] || '';
                    let dtT = l['Data de Termino'] || l['Data de Término'] || l['Data Término'] || '';
                    
                    if(dtI && dtT && dtI.includes('/') && dtT.includes('/')) {
                        try {
                            let pI = dtI.split(' ')[0].split('/');
                            let pT = dtT.split(' ')[0].split('/');
                            
                            // Cria as datas considerando o fuso local (ignorando horas para comparar apenas os dias)
                            let dataInicio = new Date(pI[2], pI[1] - 1, pI[0]);
                            let dataTermino = new Date(pT[2], pT[1] - 1, pT[0]);
                            
                            let hoje = new Date();
                            hoje.setHours(0,0,0,0);
                            dataInicio.setHours(0,0,0,0);
                            dataTermino.setHours(0,0,0,0);
                            
                            if (hoje >= dataInicio && hoje <= dataTermino) {
                                window.dadosGeraisRH.licencas.set(l.Envolvido.replace(/\[/g, '').replace(/\]/g, '').toLowerCase(), l);
                            }
                        } catch(e) {
                            // Se der erro no parse da data, tenta incluir de qualquer forma (fallback)
                            window.dadosGeraisRH.licencas.set(l.Envolvido.replace(/\[/g, '').replace(/\]/g, '').toLowerCase(), l);
                        }
                    } else {
                        // Sem datas, assume vigente
                        window.dadosGeraisRH.licencas.set(l.Envolvido.replace(/\[/g, '').replace(/\]/g, '').toLowerCase(), l);
                    }
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
        
        // Sincroniza supervisores para o Módulo de Metas
        window.admissoesGeral = {};
        window.dadosGeraisRH.membrosDivisao.forEach(m => {
            let func = String(m['Função'] || m.Funcao || m.Cargo || '').trim();
            if (func === 'Sp' || func === 'Supervisor') {
                let nickOriginal = (m.Nickname || m.Nick || '').replace(/\[/g, '').replace(/\]/g, '').trim();
                let nickLimpo = window.normalizeNick ? window.normalizeNick(nickOriginal) : nickOriginal.toLowerCase();
                let dAdm = m['Data/Hora'] || m['Data de Admissão'] || '';
                window.admissoesGeral[nickLimpo] = { cargo: 'Sp', data: dAdm, nickOriginal: nickOriginal };
            }
        });
        if(window.processarPontuacoesSemanais) window.processarPontuacoesSemanais();
        
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
    
    // Funo auxiliar para converter data da API para Date object
    function parseDate(dataStr) {
        if(!dataStr || !dataStr.includes('/')) return new Date(9999, 11, 31); // Se no tiver, joga pro final
        try {
            let dataS = dataStr.split(' ')[0];
            let partes = dataS.split('/');
            return new Date(partes[2], partes[1] - 1, partes[0]);
        } catch(e) {
            return new Date(9999, 11, 31);
        }
    }

    let lideranca = [];
    let auxiliares = [];
    let supervisores = [];

    const mapaFuncoes = {
        "L.Sp": "Líder",
        "V.Sp": "Vice-Líder",
        "S.Sp": "Sub-Líder",
        "A.Sp": "Auxiliar",
        "Sp": "Supervisor"
    };

        let isAuxiliarOnly = ['AUXILIAR'].includes(window.nivelUsuarioGlobal) && !['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal);
    membros.forEach(m => {
        let rawNick = (m.Nickname || m.Nick || 'N/A').replace(/\[/g, '').replace(/\]/g, '');
        let nickLower = rawNick.toLowerCase();
        let dadosPatente = window.dadosGeraisRH.patentes.get(nickLower) || {};
        let patente = dadosPatente['Posto/Grad'] || 'Desconhecida';
        let dadosLicenca = window.dadosGeraisRH.licencas.get(nickLower);
        let dtI = dadosLicenca ? (dadosLicenca['Data e Inicio'] || dadosLicenca['Data de Início'] || dadosLicenca['Data Início'] || '?') : '?';
        let dtT = dadosLicenca ? (dadosLicenca['Data de Termino'] || dadosLicenca['Data de Término'] || dadosLicenca['Data Término'] || '?') : '?';
        
        let isCongelado = window.dadosGeraisRH.congelados.has(nickLower);
        let baseStatus = dadosLicenca ? `<span style="color:#fbbf24;"><i class="fas fa-bed"></i> Licença</span><br><span style="font-size: 10px; color: #aaa;">de ${dtI} a ${dtT}</span>` : `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Ativo</span>`;
        
        let status = baseStatus;
        if (isCongelado) {
            if (dadosLicenca) {
                status = `<span style="color:#3b82f6;"><i class="fas fa-snowflake"></i> Congelado e em Licença</span><br><span style="font-size: 10px; color: #aaa;">de ${dtI} a ${dtT}</span>`;
            } else {
                status = `<span style="color:#3b82f6;"><i class="fas fa-snowflake"></i> Congelado</span>`;
            }
        }
        
        let checkedStr = isCongelado ? 'checked' : '';
        let disabledStr = isAuxiliarOnly ? 'disabled' : '';

        let email = window.dadosGeraisRH.emails.get(nickLower) || '';
        let funcaoRaw = m.Cargos || m.Cargo || 'Sp';
        let funcaoInterna = mapaFuncoes[funcaoRaw] || funcaoRaw;
        
        let dataAsc = m['Data e Hora'] || '';
        let textoDias = '';
        let dataObj = parseDate(dataAsc);
        if(dataAsc.includes('/')) {
            let diffTime = Math.abs(new Date() - dataObj);
            let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            textoDias = `<br><span style="font-size: 10px; color: #aaa;">Há ${diffDays} dias atrás</span>`;
        }

        let membroData = {
            rawNick, nickLower, patente, status, email, funcaoInterna, dataAsc, textoDias, dataObj, funcaoRaw, checkedStr, disabledStr
        };

        if (['L.Sp', 'V.Sp', 'S.Sp'].includes(funcaoRaw) || ['Líder', 'Vice-Líder', 'Sub-Líder'].includes(funcaoInterna)) {
            lideranca.push(membroData);
        } else if (funcaoRaw === 'A.Sp' || funcaoInterna === 'Auxiliar') {
            auxiliares.push(membroData);
        } else {
            supervisores.push(membroData);
        }
    });

    const hierarquiaLider = {
        'Líder': 1, 'L.Sp': 1,
        'Vice-Líder': 2, 'V.Sp': 2,
        'Sub-Líder': 3, 'S.Sp': 3
    };

    lideranca.sort((a, b) => {
        let pA = hierarquiaLider[a.funcaoInterna] || hierarquiaLider[a.funcaoRaw] || 99;
        let pB = hierarquiaLider[b.funcaoInterna] || hierarquiaLider[b.funcaoRaw] || 99;
        if (pA !== pB) return pA - pB;
        return a.dataObj - b.dataObj;
    });

    auxiliares.sort((a, b) => a.dataObj - b.dataObj);
    supervisores.sort((a, b) => a.dataObj - b.dataObj);

    function appendMembro(m, isLastInBlock = false) {
        let tr = document.createElement('tr');
        if(isLastInBlock) {
            tr.style.borderBottom = '3px solid rgba(255,255,255,0.1)';
        }
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${m.rawNick}&action=std&direction=3&head_direction=3&gesture=std&size=l" style="width:40px; height:40px; border-radius:8px; background:rgba(255,255,255,0.05); object-fit:cover; object-position: center -15px;" alt="">
                    <b>${m.rawNick}</b>
                </div>
            </td>
            <td>${m.patente}</td>
            <td>${m.funcaoInterna}</td>
            <td>${m.dataAsc} ${m.textoDias}</td>
            <td>
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="email" id="email-${m.nickLower}" class="form-input" style="padding:2px 5px; height:24px; font-size:12px; width:120px;" placeholder="Sem e-mail" value="${m.email}">
                    <button onclick="salvarEmailRH('${m.nickLower}')" style="background:transparent; color:var(--accent); border:none; cursor:pointer;" title="Salvar Email"><i class="fas fa-edit"></i></button>
                </div>
            </td>
            <td>${m.status}</td>
            <td style="text-align:center;">
                <input type="checkbox" ${m.checkedStr} ${m.disabledStr} onclick="window.toggleCongelarMembro('${m.nickLower}', this.checked)" style="transform: scale(1.3); cursor: ${m.disabledStr ? 'not-allowed' : 'pointer'};">
            </td>
        `;
        tbody.appendChild(tr);
    }

    if(lideranca.length > 0) {
        let sep = document.createElement('tr');
        sep.innerHTML = '<td colspan="6" style="background:rgba(255,255,255,0.05); text-align:center; font-weight:bold; color:var(--accent); font-size:12px; padding:4px;">LIDERANÇA</td>';
        tbody.appendChild(sep);
        lideranca.forEach(m => appendMembro(m));
    }
    
    if(auxiliares.length > 0) {
        let sep = document.createElement('tr');
        sep.innerHTML = '<td colspan="6" style="background:rgba(255,255,255,0.05); text-align:center; font-weight:bold; color:var(--accent); font-size:12px; padding:4px;">AUXILIARES</td>';
        tbody.appendChild(sep);
        auxiliares.forEach(m => appendMembro(m));
    }
    
    if(supervisores.length > 0) {
        let sep = document.createElement('tr');
        sep.innerHTML = '<td colspan="6" style="background:rgba(255,255,255,0.05); text-align:center; font-weight:bold; color:var(--accent); font-size:12px; padding:4px;">SUPERVISORES</td>';
        tbody.appendChild(sep);
        supervisores.forEach(m => appendMembro(m));
    }
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
        let nickLower = nick.replace(/\[/g, '').replace(/\]/g, '').toLowerCase();
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
            
            
            let isVicePlus = ['VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal);
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
                    <td style="text-align:center;">
                        ${isVicePlus ? `<button class="btn-tech" style="padding:4px 8px; font-size:12px; background:rgba(239,68,68,0.2); color:#ef4444; border-color:#ef4444;" onclick="window.excluirRetirada('${doc.id}')" title="Excluir Retirada"><i class="fas fa-trash"></i></button>` : `<button class="btn-tech" style="padding:4px 8px; font-size:12px; background:rgba(255,255,255,0.05); color:#555; border:none; cursor:not-allowed;" title="Apenas Vice-Líder+"><i class="fas fa-trash"></i></button>`}
                    </td>
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
        
        
            let isVicePlus = ['VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal);
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
    let nickLower = nick.replace(/\[/g, '').replace(/\]/g, '').toLowerCase();
    
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma notificação registrada.</td></tr>';
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
        
        let nickLower = (n.Envolvido || '').replace(/\[/g, '').replace(/\]/g, '').toLowerCase();
        if(status === 'Aprovado' || status === 'Ativo' || status === 'Válida') {
            contagemPorNick[nickLower] = (contagemPorNick[nickLower] || 0) + 1;
        }
        
        let tr = document.createElement('tr');
        
        if (status.toLowerCase().includes('cancelad')) {
            tr.style.background = 'rgba(239, 68, 68, 0.15)';
        } else if (isExpirada) {
            tr.style.background = 'rgba(239, 68, 68, 0.05)';
        }
        
        let displayDias = !isNaN(dtNotif.getTime()) ? `${diffDias}/45` : '-';
        
        tr.innerHTML = `
            <td>#${n['# (ID)'] || n.ID || n['#'] || '-'}</td>
            <td>${(n.Aplicador || '-').replace(/\[/g, '').replace(/\]/g, '')}</td>
            <td><b>${(n.Envolvido || '-').replace(/\[/g, '').replace(/\]/g, '')}</b></td>
            <td>${n['Data e Hora'] || '-'}</td>
            <td><span style="color:#aaa; font-size:12px;">${displayDias}</span></td>
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
    
    let nickLower = nick.replace(/\[/g, '').replace(/\]/g, '').toLowerCase();
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


window.toggleCongelarMembro = function(nickLower, isChecked) {
    let lvl = window.nivelUsuarioGlobal;
    let isAuxiliarOnly = ['AUXILIAR'].includes(lvl) && !['SUB-LIDER', 'VICE-LIDER', 'LIDER', 'ADMIN'].includes(lvl);
    if(isAuxiliarOnly) {
        window.customAlert("Você não tem permissão para alterar este status.", "Acesso Negado");
        return;
    }
    
    if(isChecked) {
        db.collection('membros_congelados').doc(nickLower).set({ status: 'congelado', atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => {
            window.dadosGeraisRH.congelados.add(nickLower);
            renderizarMembrosAtivos();
        })
        .catch(err => console.error("Erro ao congelar:", err));
    } else {
        db.collection('membros_congelados').doc(nickLower).delete()
        .then(() => {
            window.dadosGeraisRH.congelados.delete(nickLower);
            renderizarMembrosAtivos();
        })
        .catch(err => console.error("Erro ao descongelar:", err));
    }
}

window.excluirRetirada = function(id) {
    if(!['VICE-LIDER', 'LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal)) {
        window.customAlert("Apenas Vice-Líderes ou acima podem excluir retiradas.", "Acesso Negado");
        return;
    }
    if(confirm("Tem certeza que deseja apagar o registro desta retirada? Esta ação é irreversível.")) {
        db.collection('retiradas').doc(id).delete()
            .then(() => window.customAlert('Retirada deletada com sucesso!', 'Sucesso'))
            .catch(err => window.customAlert('Erro ao deletar: ' + err.message, 'Erro'));
    }
};
