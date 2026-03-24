window.escutarMetasDoFirebase = function() {
    window.db.collection("sistema").doc("metas").onSnapshot((doc) => {
        if (doc.exists && doc.data().dados) {
            let rows = [];
            try { rows = JSON.parse(doc.data().dados); } catch (e) { return; }
            
            if (rows.length > 17 && rows[17][1]) {
                document.getElementById('meta-week-title').innerText = rows[17][1];
            }
            
            window.membrosDataArray = [];
            let sponsorsList = [];
            
            for (let i = 3; i < rows.length; i++) {
                if (rows[i][15]) sponsorsList.push(rows[i][15]);
                if (rows[i][16]) sponsorsList.push(rows[i][16]);
                if (rows[i][17]) sponsorsList.push(rows[i][17]);
            }
            
            window.renderSponsors(sponsorsList);
            
            // Função para proteger e captar as casas decimais enviadas da planilha (ex: 0,5 ou 0.5)
            let parseNum = (val) => parseFloat(String(val).replace(',', '.')) || 0;

            for (let i = 20; i < rows.length; i++) {
                if (!rows[i][3]) continue;
                window.membrosDataArray.push({
                    cargo: rows[i][2] || '', nick: rows[i][3].trim(),
                    convite: parseNum(rows[i][5]), 
                    ppp: parseNum(rows[i][6]),
                    rels: parseNum(rows[i][7]), 
                    relcg: parseNum(rows[i][9]),
                    avisos: parseNum(rows[i][10]), 
                    total_base: parseNum(rows[i][11]),
                    status_base: (rows[i][12] || '').toString().trim()
                });
            }
            
            window.popularSelectMembros();
            window.processarPodio();
        }
    });
}

window.renderSponsors = function(lista) {
    let unique = [...new Set(lista.filter(n => n.trim() !== ''))];
    let container = document.getElementById('sponsors-container');
    if (!container) return;
    
    container.innerHTML = '';
    let ts = new Date().getTime();
    
    unique.forEach(nick => {
        container.innerHTML += `
        <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
            <div class="sponsor-avatar" title="${nick.trim()}">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${nick.trim()}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}" draggable="false">
            </div>
            <div style="color:var(--sup-neon); font-size:10px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; text-align:center;">${nick.trim()}</div>
        </div>`;
    });
    
    window.aplicarSponsorInner();
    
    document.querySelectorAll('.sponsor-avatar img').forEach(img => {
        if (img.dataset.dragReady) return;
        img.dataset.dragReady = "true";
        img.ondragstart = () => false;
        
        img.addEventListener('mousedown', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let sX = e.clientX; let sY = e.clientY;
            let sL = img.offsetLeft; let sT = img.offsetTop;
            
            const onMv = (mEv) => {
                mEv.preventDefault();
                window.layoutConfig['sponsorInner'] = window.layoutConfig['sponsorInner'] || {};
                window.layoutConfig['sponsorInner'].left = (sL + (mEv.clientX - sX)) + 'px';
                window.layoutConfig['sponsorInner'].top = (sT + (mEv.clientY - sY)) + 'px';
                window.aplicarSponsorInner();
            };
            
            const onUp = () => {
                document.removeEventListener('mousemove', onMv);
                document.removeEventListener('mouseup', onUp);
            };
            
            document.addEventListener('mousemove', onMv);
            document.addEventListener('mouseup', onUp);
        });
        
        img.addEventListener('wheel', (e) => {
            if (!window.isEditMode) return;
            e.preventDefault(); e.stopPropagation();
            let w = parseFloat(window.getComputedStyle(img).width) || img.offsetWidth;
            w += e.deltaY < 0 ? 3 : -3;
            if (w < 10) w = 10;
            window.layoutConfig['sponsorInner'] = window.layoutConfig['sponsorInner'] || {};
            window.layoutConfig['sponsorInner'].width = w + 'px';
            window.aplicarSponsorInner();
        }, { passive: false });
        
        if (window.isEditMode) img.classList.add('sponsor-edit', 'edit-mode');
    });
}

window.popularSelectMembros = function() {
    let sel = document.getElementById('select-membro');
    if (!sel) return;
    let valAtual = sel.value;
    sel.innerHTML = '<option value="" disabled selected>Selecione um membro...</option>';
    let sorted = [...window.membrosDataArray].sort((a, b) => a.nick.localeCompare(b.nick));
    sorted.forEach(m => { sel.innerHTML += `<option value="${m.nick}">${m.cargo} ${m.nick}</option>`; });
    if (valAtual) sel.value = valAtual;
}

window.getPontuacaoFinal = function(m) { 
    return (m.total_base * window.eventoMult) + (window.pontosExtrasMap[m.nick] || 0); 
}

// Formatador visual para exibir na interface (troca ponto por vírgula em decimais)
window.formatarNumeroDecimal = function(num) {
    return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString().replace('.', ',');
}

window.processarPodio = function() {
    if (window.isEditMode) return;
    let a1 = document.getElementById('avatar-1'); let m1 = document.getElementById('medal-1'); let n1 = document.getElementById('nick-1');
    let a2 = document.getElementById('avatar-2'); let m2 = document.getElementById('medal-2'); let n2 = document.getElementById('nick-2');
    let ae1 = document.getElementById('avatar-empate-1'); let te1 = document.getElementById('txt-empate-1');
    let ae2 = document.getElementById('avatar-empate-2'); let te2 = document.getElementById('txt-empate-2');
    
    if (!a1) return;
    [a1, m1, n1, a2, m2, n2, ae1, te1, ae2, te2].forEach(el => el.style.display = 'none');
    if (window.membrosDataArray.length === 0) return;
    
    let top = [...window.membrosDataArray].sort((a, b) => window.getPontuacaoFinal(b) - window.getPontuacaoFinal(a));
    let p1 = window.getPontuacaoFinal(top[0]);
    let p2 = (top.length > 1) ? window.getPontuacaoFinal(top[1]) : 0;
    let ts = new Date().getTime();
    
    if (top.length >= 2 && p1 > 0 && p1 === p2) {
        ae1.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=DIC-Sp&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        ae2.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=DIC-Sp&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        [ae1, te1, ae2, te2].forEach(el => el.style.display = 'block');
    } else if (top.length > 0 && p1 > 0) {
        a1.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${top[0].nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        n1.innerText = top[0].nick;
        [a1, m1, n1].forEach(el => el.style.display = 'block');
        if (top.length > 1 && p2 > 0) {
            a2.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${top[1].nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
            n2.innerText = top[1].nick;
            [a2, m2, n2].forEach(el => el.style.display = 'block');
        }
    }
}

window.renderMemberDetails = function() {
    let nick = document.getElementById('select-membro').value;
    let m = window.membrosDataArray.find(x => x.nick === nick);
    if (!m) return;
    
    document.getElementById('area-detalhes-membro').style.display = 'flex';
    setTimeout(() => { document.getElementById('area-detalhes-membro').style.opacity = '1'; }, 50);
    
    let tCalc = window.getPontuacaoFinal(m);
    let ptsExtra = window.pontosExtrasMap[m.nick] || 0;
    let ts = new Date().getTime();
    
    document.getElementById('avatar-selecionado').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${m.nick}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
    
    document.getElementById('det-total').innerHTML = `<span>${window.formatarNumeroDecimal(tCalc)}</span>` + (ptsExtra > 0 ? `<span style="font-size:16px; color:#4caf50; font-weight:normal;">(+${window.formatarNumeroDecimal(ptsExtra)} bônus)</span>` : '');
    document.getElementById('det-convite').innerText = window.formatarNumeroDecimal(m.convite * window.eventoMult);
    document.getElementById('det-ppp').innerText = window.formatarNumeroDecimal(m.ppp * window.eventoMult);
    document.getElementById('det-rels').innerText = window.formatarNumeroDecimal(m.rels * window.eventoMult);
    document.getElementById('det-relcg').innerText = window.formatarNumeroDecimal(m.relcg * window.eventoMult);
    document.getElementById('det-avisos').innerText = window.formatarNumeroDecimal(m.avisos * window.eventoMult);
    
    let stEl = document.getElementById('det-status');
    let sFinal = m.status_base;
    if (tCalc >= 5) sFinal = "CUMPRIDA";
    
    stEl.innerText = sFinal;
    stEl.style.color = sFinal.toLowerCase().includes('não') ? '#ef4444' : '#4caf50';
}

window.abrirDashboard = function() {
    document.getElementById('modal-dashboard').style.display = 'flex';
    window.renderAdminEventosList();
}

window.fecharDashboard = function() { document.getElementById('modal-dashboard').style.display = 'none'; }

window.formatarDataBR = function(dataStr) {
    if (!dataStr) return "";
    let d = new Date(dataStr + "T00:00:00");
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

window.adicionarNovoEventoBox = function() {
    window.dashboardEventosData.push({ nome: '', dataInicio: '', dataFim: '', descricao: '', premiosTexto: '', hc: false, moedas: false });
    window.renderAdminEventosList();
}

window.removerEventoBox = function(index) {
    window.dashboardEventosData.splice(index, 1);
    window.renderAdminEventosList();
}

window.renderAdminEventosList = function() {
    let container = document.getElementById('dash-eventos-container');
    container.innerHTML = '';
    
    if (window.dashboardEventosData.length === 0) {
        container.innerHTML = '<p style="color:var(--text-sub); font-style:italic; font-size:14px; margin-bottom:20px;">Nenhum evento criado.</p>';
        return;
    }
    
    window.dashboardEventosData.forEach((ev, i) => {
        let html = `
        <div class="admin-evento-item">
            <button type="button" onclick="window.removerEventoBox(${i})" style="position:absolute; right:15px; top:15px; background:rgba(255,42,42,0.1); border:none; color:#ef4444; width:30px; height:30px; border-radius:50%; cursor:pointer;"><i class="fas fa-trash"></i></button>
            <h4 style="color:#fff; margin-bottom:10px; font-size:13px; text-transform:uppercase;">Evento ${i + 1}</h4>
            <div class="input-block" style="margin-bottom:10px;"><input type="text" class="ev-nome" placeholder="Nome do Evento" value="${ev.nome}"></div>
            <div style="display:flex; gap:15px; margin-bottom:10px;">
                <div style="flex:1;"><label class="tech-label">Início</label><div class="input-block" style="margin:0;"><input type="date" class="ev-data-inicio" value="${ev.dataInicio}"></div></div>
                <div style="flex:1;"><label class="tech-label">Fim</label><div class="input-block" style="margin:0;"><input type="date" class="ev-data-fim" value="${ev.dataFim}"></div></div>
            </div>
            <label class="tech-label">Regras e Descrição</label>
            ${window.buildEditorHTML(`ev-desc-${i}`, ev.descricao)}
            <label class="tech-label">Texto da Premiação</label>
            <input type="text" class="admin-input ev-premios-txt" style="margin-bottom:10px;" placeholder="Ex: 4 HCs para o 1º lugar..." value="${ev.premiosTexto || ''}">
            <div style="display:flex; gap:20px; background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <label style="color:#fff; cursor:pointer;"><input type="checkbox" class="ev-hc" ${ev.hc ? 'checked' : ''}> HC</label>
            <label style="color:#fff; cursor:pointer;"><input type="checkbox" class="ev-moedas" ${ev.moedas ? 'checked' : ''}> Moedas</label>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

window.salvarDashboard = function() {
    let evs = [];
    document.querySelectorAll('.admin-evento-item').forEach(el => {
        evs.push({
            nome: el.querySelector('.ev-nome').value,
            dataInicio: el.querySelector('.ev-data-inicio').value,
            dataFim: el.querySelector('.ev-data-fim').value,
            descricao: el.querySelector('.ev-desc').innerHTML,
            premiosTexto: el.querySelector('.ev-premios-txt').value,
            hc: el.querySelector('.ev-hc').checked,
            moedas: el.querySelector('.ev-moedas').checked
        });
    });
    
    window.db.collection("sistema").doc("config_metas").set({
        eventoAtivo: document.getElementById('dash-toggle-evento').checked,
        eventoMult: parseInt(document.getElementById('dash-mult-evento').value) || 1,
        textoPatrocinio: document.getElementById('dash-txt-patrocinio').value,
        eventos: evs
    }, { merge: true }).then(() => {
        window.mostrarToast("Painel Atualizado!", "success");
        window.fecharDashboard();
        window.registrarLogAtividade("Editou Dashboard", "Atualizou mural de eventos ou multiplicador.");
    }).catch((e) => window.mostrarToast("Erro ao salvar Dashboard.", "error"));
}

window.escutarConfigDashboard = function() {
    window.db.collection("sistema").doc("config_metas").onSnapshot((doc) => {
        if (doc.exists) {
            let d = doc.data();
            window.eventoAtivo = d.eventoAtivo || false;
            window.eventoMult = parseInt(d.eventoMult) || 1;
            window.pontosExtrasMap = d.pontosExtras || {};
            window.dashboardEventosData = d.eventos || [];
            
            if (['LIDER', 'VICE-LIDER', 'SUB-LIDER'].includes(window.nivelUsuarioGlobal)) {
                let tg = document.getElementById('dash-toggle-evento'); if (tg) tg.checked = window.eventoAtivo;
                let ml = document.getElementById('dash-mult-evento'); if (ml) ml.value = window.eventoMult;
                let pr = document.getElementById('dash-txt-patrocinio'); if (pr) pr.value = d.textoPatrocinio || '';
            }

            let btnPE = document.getElementById('btn-pontos-extras');
            if (btnPE && ['LIDER', 'VICE-LIDER', 'SUB-LIDER'].includes(window.nivelUsuarioGlobal)) {
                btnPE.style.display = window.eventoAtivo ? 'inline-flex' : 'none';
            }

            let banner = document.getElementById('evento-banner');
            if (window.eventoAtivo && window.eventoMult > 1) {
                banner.style.display = 'flex';
            } else {
                banner.style.display = 'none';
                window.eventoMult = 1;
            }

            let tSpon = document.getElementById('ui-txt-patrocinio');
            if (tSpon) {
                tSpon.innerText = d.textoPatrocinio || 'Deseja patrocinar algum dos eventos e ajudar a divisão? Procure a Liderança!';
            }

            let uiLista = document.getElementById('ui-lista-eventos');
            if (uiLista) {
                uiLista.innerHTML = '';
                if (window.dashboardEventosData.length === 0) {
                    uiLista.innerHTML = `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--sup-neon); margin-bottom: 15px;"><div style="color: #fff; font-size: 14px;">Fique atento aos anúncios no grupo!</div></div>`;
                } else {
                    window.dashboardEventosData.forEach((ev, i) => {
                        let dtTxt = '';
                        if (ev.dataInicio && ev.dataFim) {
                            dtTxt = `${window.formatarDataBR(ev.dataInicio)} a ${window.formatarDataBR(ev.dataFim)}`;
                        } else if (ev.dataInicio) {
                            dtTxt = `A partir de ${window.formatarDataBR(ev.dataInicio)}`;
                        }
                        
                        let pUI = '';
                        if (ev.premiosTexto || ev.hc || ev.moedas) {
                            pUI = `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed rgba(251,191,36,0.2);">`;
                            if (ev.premiosTexto) pUI += `<div style="color:var(--sup-neon); font-size:13px; margin-bottom:10px; font-weight:600;">${ev.premiosTexto}</div>`;
                            if (ev.hc || ev.moedas) {
                                let wHC = window.layoutConfig[`img-premio-hc-${i}`] ? window.layoutConfig[`img-premio-hc-${i}`].width : '40px';
                                let wM = window.layoutConfig[`img-premio-moedas-${i}`] ? window.layoutConfig[`img-premio-moedas-${i}`].width : '40px';
                                pUI += `<div style="display:flex; gap:15px; align-items:center;">`;
                                if (ev.hc) pUI += `<img id="img-premio-hc-${i}" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEirfXmN9g_cDNpjq8o7oXeKFIRwJLgI-w2FEisZ3iJdxqblDlMM858H3fDrWh-PpDE12pNyMmPBdxX8TRgBU95PXO8nd24V9Gny1nFTkhqsGKUKfMmtK-AEoIAvFTsJBjsNV2gk2oUkTTpf/s1600/HC31.gif" class="resizable-prize" draggable="false" style="display:block; width:${wHC};">`;
                                if (ev.moedas) pUI += `<img id="img-premio-moedas-${i}" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDZ6AWqYyPxpnw-heLbJ-k1qoyj_EZN8_wWWotWVW5MzTQZKPQEY-L3zuPCYIK-ExBKbQFBxyfS_c_F4xY6pPUAgRoHiJvC9HgpWYj6iVUCp4eXDF7M-ilisPyCQ6KBpGfdqgwjpmvWrsi/s1600/15c6908117fc3.gif" class="resizable-prize" draggable="false" style="display:block; width:${wM};">`;
                                pUI += `</div>`;
                            }
                            pUI += `</div>`;
                        }
                        
                        uiLista.insertAdjacentHTML('beforeend', `
                            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--sup-neon); margin-bottom: 15px;">
                                <h4 style="color:var(--sup-neon); margin-bottom: 5px; font-size: 18px; text-transform: uppercase;">${ev.nome || 'Evento'}</h4>
                                ${dtTxt ? `<div style="color: var(--text-sub); font-size: 13px; margin-bottom: 10px; display:flex; align-items:center; gap:5px; font-weight:600;"><i class="far fa-calendar-day"></i> <span>${dtTxt}</span></div>` : ''}
                                <div style="color: #fff; font-size: 14px; line-height: 1.5;">${ev.descricao || ''}</div>
                                ${pUI}
                            </div>
                        `);
                    });
                }
            }
            
            window.setupPrizesResizable();
            
            if (window.membrosDataArray.length > 0) {
                window.processarPodio();
                if (document.getElementById('select-membro').value) {
                    window.renderMemberDetails();
                }
                window.renderTabelaPontosExtras();
            }
        }
    });
}

window.abrirModalPontosExtras = function() {
    document.getElementById('modal-pontos-extras').style.display = 'flex';
    let sel = document.getElementById('pe-select-membro');
    sel.innerHTML = '<option value="" disabled selected>Selecione...</option>';
    
    [...window.membrosDataArray].sort((a, b) => a.nick.localeCompare(b.nick)).forEach(m => {
        sel.innerHTML += `<option value="${m.nick}">${m.nick}</option>`;
    });
    
    window.renderTabelaPontosExtras();
}

window.fecharModalPontosExtras = function() {
    document.getElementById('modal-pontos-extras').style.display = 'none';
}

window.salvarPontoExtra = function() {
    let nick = document.getElementById('pe-select-membro').value;
    let pts = parseFloat(document.getElementById('pe-input-pontos').value.replace(',', '.'));
    
    if (!nick || isNaN(pts)) return window.mostrarToast("Selecione um membro e digite a pontuação.", "error");
    
    window.pontosExtrasMap[nick] = pts;
    
    window.db.collection("sistema").doc("config_metas").set({ pontosExtras: window.pontosExtrasMap }, { merge: true }).then(() => {
        document.getElementById('pe-input-pontos').value = '';
        window.mostrarToast(`+${window.formatarNumeroDecimal(pts)} pontos para ${nick}`, "success");
        window.registrarLogAtividade("Adicionou Ponto Extra", `Atribuiu +${window.formatarNumeroDecimal(pts)} pontos para ${nick}.`);
    });
}

window.removerPontoExtra = function(nick) {
    delete window.pontosExtrasMap[nick];
    window.db.collection("sistema").doc("config_metas").set({ pontosExtras: window.pontosExtrasMap }, { merge: true });
    window.registrarLogAtividade("Removeu Ponto Extra", `Removeu o bônus do militar ${nick}.`);
}

window.renderTabelaPontosExtras = function() {
    let tbody = document.querySelector('#tb-pontos-extras tbody');
    tbody.innerHTML = '';
    
    for (let n in window.pontosExtrasMap) {
        tbody.innerHTML += `<tr><td>${n}</td><td style="text-align:center; color:var(--sup-neon); font-weight:bold;">+${window.formatarNumeroDecimal(window.pontosExtrasMap[n])}</td><td style="text-align:right;"><button class="btn-admin-icon btn-admin-del" onclick="window.removerPontoExtra('${n}')"><i class="fas fa-trash"></i></button></td></tr>`;
    }
    
    if (Object.keys(window.pontosExtrasMap).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-sub);">Nenhum ponto extra.</td></tr>';
    }
}
