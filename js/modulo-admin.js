window.carregarPrivacidade = function() {
    window.db.collection("sistema").doc("config_geral").get().then((doc) => {
        let htmlPadrao = `<p>Escreva aqui a Política de Privacidade.</p>`;
        if (doc.exists && doc.data().textoPrivacidade) {
            document.getElementById('editor-privacidade').innerHTML = doc.data().textoPrivacidade;
        } else {
            document.getElementById('editor-privacidade').innerHTML = htmlPadrao;
        }
    });
}

window.salvarPrivacidade = function() {
    window.db.collection("sistema").doc("config_geral").set({ 
        textoPrivacidade: document.getElementById('editor-privacidade').innerHTML 
    }, { merge: true }).then(() => {
        window.mostrarToast("Política de Privacidade salva!", "success");
        window.registrarLogAtividade("Editou Privacidade", "Modificou a política pública.");
    });
}

// NOVO: Adiciona a caixa visual para um novo aval
window.adicionarAval = function() {
    let container = document.getElementById('lista-avais-container');
    let count = container.querySelectorAll('.aval-item').length + 1;
    let div = document.createElement('div');
    div.className = 'row aval-item';
    div.style.display = 'flex';
    div.style.gap = '20px';
    div.style.flexWrap = 'wrap';
    div.style.marginTop = '15px';
    div.style.paddingTop = '15px';
    div.style.borderTop = '1px dashed rgba(251,191,36,0.2)';
    div.style.position = 'relative';
    
    div.innerHTML = `
        <button type="button" onclick="this.closest('.aval-item').remove()" style="position:absolute; right:0; top:-15px; background:rgba(255,42,42,0.1); border:none; color:#ef4444; width:30px; height:30px; border-radius:50%; cursor:pointer; z-index:10;"><i class="fas fa-times"></i></button>
        <div class="form-group" style="flex:1; min-width:200px;"><label class="tech-label">Início do Aval ${count}</label><div class="input-block"><i class="fas fa-hourglass-start"></i><input type="date" class="data-aval-input"></div></div>
        <div class="form-group" style="flex:1; min-width:200px;"><label class="tech-label">Dias de Aval</label><div class="input-block"><i class="fas fa-sort-numeric-up"></i><input type="number" class="dias-aval-input" min="1" placeholder="Ex: 7"></div></div>
    `;
    container.appendChild(div);
}

// NOVO: Motor de cálculo dia-a-dia para cruzar todos os avais inseridos
window.processarCalculo = function() {
    const d1 = document.getElementById('data-login').value;
    const d3 = document.getElementById('data-consulta').value;
    
    if (!d1 || !d3) return window.customAlert("Preencha Último Login e Data da Consulta.", "Atenção");
    
    const u = new Date(d1 + 'T00:00:00');
    const c = new Date(d3 + 'T00:00:00');
    
    if (c < u) return window.customAlert("A Data da Consulta não pode ser anterior ao Último Login.", "Erro");
    
    let periodos = [];
    document.querySelectorAll('.aval-item').forEach(node => {
        let dt = node.querySelector('.data-aval-input').value;
        let ds = parseInt(node.querySelector('.dias-aval-input').value);
        if(dt && !isNaN(ds) && ds > 0) {
            let ini = new Date(dt + 'T00:00:00');
            let fim = new Date(ini);
            fim.setDate(ini.getDate() + ds - 1);
            periodos.push({ i: ini, f: fim });
        }
    });
    
    let totalAusencia = 0;
    let emAval = false;
    
    for(let p of periodos) {
        if(c >= p.i && c <= p.f) emAval = true;
    }
    
    let curr = new Date(u);
    curr.setDate(curr.getDate() + 1); // A contagem começa 1 dia após o último login oficial
    
    let gaps = [];
    let curGapStart = null;
    let curGapLen = 0;
    
    // Percorre todos os dias entre o último login e a data da consulta
    while(curr <= c) {
        let covered = false;
        // Checa se o dia atual cai dentro de qualquer um dos avais (mesmo que se cruzem)
        for(let p of periodos) {
            if(curr >= p.i && curr <= p.f) { covered = true; break; }
        }
        
        if(!covered) {
            totalAusencia++;
            curGapLen++;
            if(!curGapStart) curGapStart = new Date(curr);
        } else {
            if(curGapStart) {
                let endGap = new Date(curr);
                endGap.setDate(endGap.getDate() - 1);
                gaps.push({ s: curGapStart, e: endGap, len: curGapLen });
                curGapStart = null;
                curGapLen = 0;
            }
        }
        curr.setDate(curr.getDate() + 1);
    }
    
    // Se terminou a contagem com um "buraco" ainda aberto
    if(curGapStart) {
        let endGap = new Date(c);
        gaps.push({ s: curGapStart, e: endGap, len: curGapLen });
    }
    
    const fmtDt = (dt) => dt.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric'});
    
    let html = "";
    if (periodos.length === 0) {
        html += `Nenhum aval registrado.<br>Ausência contínua de <strong>${totalAusencia} dia(s)</strong>.`;
    } else {
        if (emAval) html += `<div style="color:var(--sup-neon); font-weight:bold; margin-bottom:15px; font-size:16px;"><i class="fas fa-check-circle"></i> O militar encontra-se de Aval no dia de hoje.</div>`;
        
        if (totalAusencia === 0) {
            html += `<span style="color:#4caf50;">O período está 100% coberto pelos avais indicados. Nenhuma ausência extra.</span>`;
        } else {
            html += `<div style="margin-bottom:10px; color:var(--text-sub); font-size:14px; text-transform:uppercase;">Extrato de Dias Descobertos (Buracos):</div>`;
            gaps.forEach(g => {
                let ds = fmtDt(g.s);
                let de = fmtDt(g.e);
                let txt = ds === de ? `${ds}` : `${ds} até ${de}`;
                html += `<div style="margin-bottom:6px; background:rgba(255,42,42,0.1); border:1px solid rgba(239,68,68,0.2); padding:8px 12px; border-radius:4px; color:#fff;"><i class="fas fa-exclamation-triangle" style="color:#ff2a2a; margin-right:5px;"></i> ${txt}: <strong>${g.len} dia(s)</strong></div>`;
            });
        }
    }
    
    if (totalAusencia > 0 || periodos.length > 0) {
        let corFinal = totalAusencia === 0 ? "#4caf50" : "#ff2a2a";
        html += `<div style="margin-top:20px; border-top:1px dashed rgba(251,191,36,0.3); padding-top:15px; font-size:18px; font-weight:bold;">Ausência Efetiva Resultante: <span style="color:${corFinal};">${totalAusencia} dia(s)</span></div>`;
    }
    
    document.getElementById('texto-resultado').innerHTML = html;
    document.getElementById('resultado-aval').style.display = 'block';
    window.registrarLogAtividade("Cálculo de Aval", `Calculou avais múltiplos resultando em ${totalAusencia} dia(s) de falta.`);
}

window.renderTabelaAcessos = function() {
    var tbody = document.querySelector('#tbAcessos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let rendered = new Set();
    
    window.acessosData.forEach(item => {
        tbody.appendChild(window.criarRowAcesso(item, 'manual'));
        rendered.add(item.email.toLowerCase());
    });
    
    for (let email in window.planilhaAcessos) {
        if (!rendered.has(email.toLowerCase())) {
            let item = { email: email, nick: window.planilhaAcessos[email].nick, nivel: window.planilhaAcessos[email].nivel };
            tbody.appendChild(window.criarRowAcesso(item, 'planilha'));
        }
    }
}

window.criarRowAcesso = function(item, origem) {
    var tr = document.createElement('tr');
    
    let sL = item.nivel === 'LIDER' ? 'selected' : '';
    let sA = item.nivel === 'ADMIN' ? 'selected' : '';
    let sV = item.nivel === 'VICE-LIDER' ? 'selected' : '';
    let sS = item.nivel === 'SUB-LIDER' ? 'selected' : '';
    let sAux = item.nivel === 'AUXILIAR' ? 'selected' : '';
    let sSup = item.nivel === 'SUPERVISOR' ? 'selected' : '';
    let sC = item.nivel === 'COMANDO' ? 'selected' : '';
    
    let hideAcoes = (window.nivelUsuarioGlobal === 'VICE-LIDER' && (item.nivel === 'LIDER' || item.nivel === 'ADMIN')) ? 'display:none;' : '';
    let tBadge = origem === 'planilha' ? '<span style="background:rgba(251,191,36,0.2); color:var(--sup-neon); padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">PLANILHA</span>' : '<span style="background:rgba(76,175,80,0.2); color:#4caf50; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px;">MANUAL</span>';
    let acoes = origem === 'planilha' ? '<span style="color:#888; font-size:11px;">Via Planilha</span>' : `<button class="btn-admin-icon btn-admin-edit" onclick="window.toggleEditRow(this)" title="Editar"><i class="fas fa-pencil-alt"></i></button><button class="btn-admin-icon btn-admin-del" onclick="this.closest('tr').remove()" title="Excluir"><i class="fas fa-trash"></i></button>`;
    
    tr.innerHTML = `
        <td><input type="text" class="admin-input inp-email" value="${item.email || ''}" readonly style="width:70%; display:inline-block; margin-right:5px;">${tBadge}</td>
        <td><input type="text" class="admin-input inp-nick" value="${item.nick || ''}" readonly></td>
        <td>
            <select class="admin-input inp-nivel" disabled>
                <option value="ADMIN" ${sA}>Admin (Externa)</option>
                <option value="LIDER" ${sL}>Líder</option>
                <option value="VICE-LIDER" ${sV}>Vice-Líder</option>
                <option value="SUB-LIDER" ${sS}>Sub-Líder</option>
                <option value="AUXILIAR" ${sAux}>Auxiliar</option>
                <option value="SUPERVISOR" ${sSup}>Supervisor</option>
                <option value="COMANDO" ${sC}>Comando</option>
            </select>
        </td>
        <td class="action-cell" style="${hideAcoes}" data-origem="${origem}">${acoes}</td>
    `;
    return tr;
}

window.addLinhaAcesso = function() {
    var tbody = document.querySelector('#tbAcessos tbody');
    var tr = window.criarRowAcesso({ email: '', nick: '', nivel: 'SUPERVISOR' }, 'manual');
    tbody.appendChild(tr);
    window.toggleEditRow(tr.querySelector('.btn-admin-edit'));
}

window.toggleEditRow = function(btn) {
    var tr = btn.closest('tr');
    tr.querySelectorAll('input, select').forEach(inp => inp.removeAttribute('disabled'));
    tr.querySelectorAll('input').forEach(inp => inp.removeAttribute('readonly'));
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.className = 'btn-admin-icon btn-admin-check';
    btn.onclick = function() { window.confirmEditRow(btn); };
}

window.confirmEditRow = function(btn) {
    var tr = btn.closest('tr');
    tr.querySelectorAll('input, select').forEach(inp => inp.setAttribute('disabled', true));
    tr.querySelectorAll('input').forEach(inp => inp.setAttribute('readonly', true));
    btn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    btn.className = 'btn-admin-icon btn-admin-edit';
    btn.onclick = function() { window.toggleEditRow(btn); };
}

window.salvarAcessos = function() {
    var rows = document.querySelectorAll('#tbAcessos tbody tr');
    const batch = window.db.batch();
    
    window.acessosData.forEach(ac => {
        batch.delete(window.db.collection("acessos").doc(ac.email));
    });
    
    rows.forEach(r => {
        let isManual = r.querySelector('.action-cell').getAttribute('data-origem') === 'manual';
        if (isManual) {
            var email = r.querySelector('.inp-email').value.trim().toLowerCase();
            if (email) {
                batch.set(window.db.collection("acessos").doc(email), {
                    email: email,
                    nick: r.querySelector('.inp-nick').value.trim(),
                    nivel: r.querySelector('.inp-nivel').value.toUpperCase()
                });
            }
        }
    });
    
    batch.commit().then(() => {
        window.mostrarToast("Acessos manuais salvos!", "success");
        window.registrarLogAtividade("Editou Acessos", "Modificou as permissões manuais do sistema.");
    }).catch((e) => {
        window.mostrarToast("Erro: " + e.message, "error");
    });
}

window.escutarLogsAtividades = function() {
    window.db.collection("logs_atividades").orderBy("timestamp", "desc").limit(100).onSnapshot(snap => {
        let tbody = document.querySelector('#tb-logs-atividades tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        snap.forEach(doc => {
            let d = doc.data();
            tbody.innerHTML += `<tr><td style="font-size:12px; color:var(--text-sub);">${d.data_hora}</td><td><strong style="color:var(--sup-neon);">${d.autor}</strong></td><td style="font-weight:bold; color:#fff;">${d.acao}</td><td style="font-size:13px; color:#aaa;">${d.detalhes}</td></tr>`;
        });
    });
}