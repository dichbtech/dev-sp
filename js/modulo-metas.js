
window.setSemanaAtual = function() {
    let hoje = new Date();
    let domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() - hoje.getDay());
    let sabado = new Date(domingo);
    sabado.setDate(domingo.getDate() + 6);
    
    let elInicio = document.getElementById('filtro-semana-inicio');
    let elFim = document.getElementById('filtro-semana-fim');
    
    if(elInicio && elFim) {
        elInicio.value = window.formatDateInput(domingo);
        elFim.value = window.formatDateInput(sabado);
        window.processarPontuacoesSemanais();
    }
}

window.membrosDataArray = [];
window.logsHistoricoGeral = [];
window.admissoesGeral = {};
window.acompanhamentosGeral = [];
window.eventoAtivo = false;
window.eventoMult = 1;
window.pontosExtrasMap = {};
window.dashboardEventosData = [];
window.cargosMap = {};

window.configAtividades = [];
window.statusMetasSemanais = {};
window.dashboardSponsorsData = []; // Array do novo Hub de Patrocinadores

window.normalizeNick = function(str) {
    if (!str) return "";
    return String(str).replace(/\[/g, '').replace(/\]/g, '').trim().toLowerCase();
}

window.cleanHabboNick = function(str) {
    if (!str) return "DIC-Sp";
    return String(str).replace(/\[/g, '').replace(/\]/g, '').trim();
}

window.parseQualquerData = function(dataRaw) {
    if (!dataRaw) return { formatada: "Não localizada", dateObj: null };
    let str = String(dataRaw).trim();
    
    let matchBR = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchBR) {
        let obj = new Date(parseInt(matchBR[3], 10), parseInt(matchBR[2], 10)-1, parseInt(matchBR[1], 10));
        return { formatada: `${matchBR[1]}/${matchBR[2]}/${matchBR[3]}`, dateObj: obj };
    }
    
    let dt = new Date(str);
    if (!isNaN(dt.getTime())) {
        let d = String(dt.getDate()).padStart(2, '0');
        let m = String(dt.getMonth() + 1).padStart(2, '0');
        let y = dt.getFullYear();
        return { formatada: `${d}/${m}/${y}`, dateObj: new Date(y, dt.getMonth(), dt.getDate()) };
    }
    
    return { formatada: str.split(' ')[0], dateObj: null };
}

window.formatDateInput = function(dateObj) {
    let y = dateObj.getFullYear();
    let m = String(dateObj.getMonth() + 1).padStart(2, '0');
    let d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

window.configurarSemanaInicial = function() {
    let hoje = new Date();
    let dia = hoje.getDay(); 
    let domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() - dia);
    let sabado = new Date(domingo);
    sabado.setDate(domingo.getDate() + 6);
    
    let elInicio = document.getElementById('filtro-semana-inicio');
    let elFim = document.getElementById('filtro-semana-fim');
    
    if(elInicio && elFim) {
        elInicio.value = window.formatDateInput(domingo);
        elFim.value = window.formatDateInput(sabado);
    }
}

window.mudarSemanaConsulta = function() {
    let elInicio = document.getElementById('filtro-semana-inicio');
    let elFim = document.getElementById('filtro-semana-fim');
    if(!elInicio || !elFim || !elInicio.value) return;

    let p = elInicio.value.split('-'); 
    if(p.length !== 3) return;
    
    let dataI = new Date(parseInt(p[0], 10), parseInt(p[1], 10)-1, parseInt(p[2], 10), 0, 0, 0);
    
    let sabado = new Date(dataI);
    sabado.setDate(dataI.getDate() + 6);
    
    elFim.value = window.formatDateInput(sabado);
    window.processarPontuacoesSemanais();
}

window.escutarMetasDoFirebase = function() {
    window.db.collection("sistema").doc("controle_metas_semanais").onSnapshot((doc) => {
        if (doc.exists && doc.data().dados) {
            try { window.statusMetasSemanais = JSON.parse(doc.data().dados); } catch(e){ window.statusMetasSemanais = {}; }
            if (document.getElementById('tb-controle-metas') && document.getElementById('tb-controle-metas').style.display !== 'none') {
                if(window.carregarControleMetas) window.carregarControleMetas();
            }
        }
    });

    window.configurarSemanaInicial();

    window.db.collection("sistema").doc("cargos").onSnapshot((doc) => {
        if (doc.exists && doc.data().dados) {
            try { window.cargosMap = JSON.parse(doc.data().dados); } catch(e){}
            window.processarPontuacoesSemanais();
        }
    });

    window.db.collection("sistema").doc("info_adicional").onSnapshot((doc) => {
        if (doc.exists) {
            let d = doc.data();
            let admRaw = JSON.parse(d.admissoes || "{}");
            window.acompanhamentosGeral = JSON.parse(d.acompanhamentos || "[]");
            
            window.admissoesGeral = {};
            for(let key in admRaw) {
                let nickOriginal = String(key).trim(); 
                let nickLimpo = window.normalizeNick(nickOriginal);
                
                if (typeof admRaw[key] === 'object') {
                    window.admissoesGeral[nickLimpo] = { ...admRaw[key], nickOriginal: nickOriginal };
                } else {
                    window.admissoesGeral[nickLimpo] = { cargo: "Sp", data: admRaw[key], nickOriginal: nickOriginal };
                }
            }
            window.processarPontuacoesSemanais();
        }
    });

    window.atividadesCorrigidasGeral = [];
    window.avisosValidosGeral = [];

    // Listen to atividades corrigidas
    window.db.collection("atividades_pendentes").where("avaliado", "==", true).onSnapshot(snap => {
        let docs = [];
        snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
        window.atividadesCorrigidasGeral = docs;
        window.processarPontuacoesSemanais();
    });

    // Listen to avisos (apenas os concluídos e que não estão no lixo)
    window.db.collection("avisos").where("lixo", "==", false).where("status", "==", "concluido").onSnapshot(snap => {
        let docs = [];
        snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
        window.avisosValidosGeral = docs;
        window.processarPontuacoesSemanais();
    });

    // window.escutarConfigDashboard(); // Already called in auth.js, prevents duplicate listener
}

window.processarPontuacoesSemanais = function() {
    if (Object.keys(window.admissoesGeral).length === 0 || window.configAtividades.length === 0) return;

    let valInicio = document.getElementById('filtro-semana-inicio');
    let valFim = document.getElementById('filtro-semana-fim');
    if(!valInicio || !valFim || !valInicio.value) return;

    let pI = valInicio.value.split('-');
    let pF = valFim.value.split('-');
    let dataI = new Date(parseInt(pI[0], 10), parseInt(pI[1], 10)-1, parseInt(pI[2], 10), 0, 0, 0);
    let dataF = new Date(parseInt(pF[0], 10), parseInt(pF[1], 10)-1, parseInt(pF[2], 10), 23, 59, 59);

    window.membrosDataArray = [];
    let nicksValidos = Object.keys(window.admissoesGeral);

    // Prepare config map for easy access (case insensitive)
    let configMap = {};
    window.configAtividades.forEach(cfg => {
        configMap[String(cfg.nome).toLowerCase().trim()] = cfg;
    });

    nicksValidos.forEach(nickLimpo => {
        let info = window.admissoesGeral[nickLimpo];
        let cargoClean = info.cargo ? String(info.cargo).toUpperCase().trim().replace(/[^A-Z]/g, '') : "SP";
        
        if (cargoClean !== "SP") return;

        let parsedAdm = window.parseQualquerData(info.data);
        let dAdm = parsedAdm.dateObj;

        let dadosPatente = (window.dadosGeraisRH && window.dadosGeraisRH.patentes && window.dadosGeraisRH.patentes.get(nickLimpo)) || {};
        let patenteMembro = dadosPatente['Posto/Grad'] || 'Sp: Supervisor';

        let stats = {
            nick: info.nickOriginal,
            total_base: 0, 
            status_base: 'Não cumprida', 
            cargo: patenteMembro,
            atividades_dinamicas: {},
            contagem_dinamicas: {}
        };

        window.configAtividades.forEach(cfg => {
            stats.atividades_dinamicas[cfg.nome] = 0;
            stats.contagem_dinamicas[cfg.nome] = 0;
        });

        // ==========================
        // PROCESSAR ATIVIDADES PENDENTES (Corrigidas)
        // ==========================
        let ativMembro = (window.atividadesCorrigidasGeral || []).filter(a => {
            if (window.normalizeNick(a.nick) !== nickLimpo) return false;
            let dtParsed = window.parseQualquerData(a.dataPostagem);
            if (!dtParsed.dateObj) return false;
            if (dAdm && dtParsed.dateObj < dAdm) return false;
            a._dataObjParaSort = dtParsed.dateObj;
            return dtParsed.dateObj >= dataI && dtParsed.dateObj <= dataF;
        });

        // Ordenação Cronológica (mais antigo para mais novo)
        ativMembro.sort((a, b) => a._dataObjParaSort - b._dataObjParaSort);

        ativMembro.forEach(a => {
            let st = a.status ? String(a.status).toLowerCase().trim() : "";
            let valido = st.startsWith('v'); // Relatórios geralmente são 'Válido' tbm
            
            if (valido) {
                let tipoLower = String(a.tipo || "").toLowerCase().trim();
                let cfgAtividade = configMap[tipoLower];
                
                if (cfgAtividade) {
                    let ptsAtuais = 0;
                    let basePts = parseFloat(cfgAtividade.pontos) || 0;
                    
                    if (a.tipo === 'Grupos' || a.tipo === 'Soldados') {
                        let incorrecoes = parseInt(a.incorrecoes) || 0;
                        ptsAtuais = cfgAtividade.multiplica ? (basePts * incorrecoes) : basePts;
                    } else if (a.tipo === 'Convites' || a.tipo === 'PPP') {
                        let desc = parseFloat(a.descontos) || 0;
                        ptsAtuais = basePts - desc;
                    } else {
                        ptsAtuais = basePts;
                    }
                    
                    if (ptsAtuais < 0) ptsAtuais = 0;
                    
                    // Contagem cronológica
                    stats.contagem_dinamicas[cfgAtividade.nome] = (stats.contagem_dinamicas[cfgAtividade.nome] || 0) + 1;
                    let limite = parseInt(cfgAtividade.limite) || 0;
                    
                    if (limite === 0 || stats.contagem_dinamicas[cfgAtividade.nome] <= limite) {
                        stats.atividades_dinamicas[cfgAtividade.nome] += ptsAtuais;
                        stats.total_base += ptsAtuais;
                    }
                }
            }
        });

        // ==========================
        // PROCESSAR AVISOS
        // ==========================
        let avisosMembro = (window.avisosValidosGeral || []).filter(av => {
            if (av.invalido) return false;
            if (window.normalizeNick(av.criador) !== nickLimpo) return false;
            let dt = new Date(0);
            try {
                let ts = av.dataConclusao ? av.dataConclusao.toMillis() : (av.dataCriacao ? av.dataCriacao.toMillis() : 0);
                dt = new Date(ts);
            } catch(e) {
                let dtParsed = window.parseQualquerData(av.dataConclusao || av.dataCriacao);
                if (dtParsed.dateObj) dt = dtParsed.dateObj;
            }
            if (dAdm && dt < dAdm) return false;
            av._dataObjParaSort = dt;
            return dt >= dataI && dt <= dataF;
        });

        avisosMembro.sort((a, b) => a._dataObjParaSort - b._dataObjParaSort);

        avisosMembro.forEach(av => {
            let cfgAvisos = configMap['avisos'];
            if (cfgAvisos) {
                let basePts = parseFloat(cfgAvisos.pontos) || 0;
                
                stats.contagem_dinamicas[cfgAvisos.nome] = (stats.contagem_dinamicas[cfgAvisos.nome] || 0) + 1;
                let limite = parseInt(cfgAvisos.limite) || 0;
                
                if (limite === 0 || stats.contagem_dinamicas[cfgAvisos.nome] <= limite) {
                    stats.atividades_dinamicas[cfgAvisos.nome] += basePts;
                    stats.total_base += basePts;
                }
            }
        });

        if (typeof window.metaSemanal !== 'undefined' && window.metaSemanal !== null) {
            if (stats.total_base >= window.metaSemanal) stats.status_base = "Cumprida";
        } else {
            stats.status_base = "Sem Meta";
        }
        window.membrosDataArray.push(stats);
    });

    window.popularSelectMembros();
    window.processarPodio();
    
    let selectAtivo = document.getElementById('select-membro');
    if (selectAtivo && selectAtivo.value) {
        window.renderMemberDetails();
    } else {
        let area = document.getElementById('area-detalhes-membro');
        if (area) area.style.display = 'none';
    }
}

window.renderSponsors = function(lista) {
    let unique = [...new Set(lista.filter(n => n && String(n).trim() !== ''))];
    let container = document.getElementById('sponsors-container');
    if (!container) return;
    container.innerHTML = '';
    let ts = new Date().getTime();
    unique.forEach(nick => {
        let safeNick = window.cleanHabboNick(nick);
        container.innerHTML += `
        <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
            <div class="sponsor-avatar" title="${safeNick}" style="position:relative; overflow:hidden;">
                <img src="https://www.habbo.com.br/habbo-imaging/avatarimage?user=${safeNick}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}" draggable="false" style="position:absolute; left:-5px; top:-16px; width:60px; image-rendering: pixelated;">
            </div>
            <div style="color:var(--sup-neon); font-size:10px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; text-align:center;">${safeNick}</div>
        </div>`;
    });
}

window.popularSelectMembros = function() {
    let sel = document.getElementById('select-membro');
    let valAtual = sel ? sel.value : "";
    
    let options = '<option value="" disabled selected>Selecione um membro...</option>';
    let sorted = [...window.membrosDataArray].sort((a, b) => window.normalizeNick(a.nick).localeCompare(window.normalizeNick(b.nick)));
    
    sorted.forEach(m => { 
        options += `<option value="${m.nick}">${m.cargo} ${window.cleanHabboNick(m.nick)}</option>`; 
    });

    if(sel) {
        sel.innerHTML = options;
        if (valAtual) sel.value = valAtual; 
    }

    let histList = document.getElementById('hist-nicks-list');
    if (histList) {
        histList.innerHTML = '';
        let todosNicks = Object.values(window.admissoesGeral).map(o => o.nickOriginal).sort((a, b) => window.normalizeNick(a).localeCompare(window.normalizeNick(b)));
        todosNicks.forEach(nick => {
            histList.innerHTML += `<option value="${nick}">`;
        });
    }
}

window.getPontuacaoFinal = function(m) { 
    return (m.total_base * window.eventoMult) + (window.pontosExtrasMap[m.nick] || 0); 
}

window.formatarNumeroDecimal = function(num) {
    if (isNaN(num)) return "0";
    return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString().replace('.', ',');
}

window.processarPodio = function() {
    let a1 = document.getElementById('avatar-1'); let m1 = document.getElementById('medal-1'); let n1 = document.getElementById('nick-1');
    let a2 = document.getElementById('avatar-2'); let m2 = document.getElementById('medal-2'); let n2 = document.getElementById('nick-2');
    let ae1 = document.getElementById('avatar-empate-1'); let te1 = document.getElementById('txt-empate-1');
    let ae2 = document.getElementById('avatar-empate-2'); let te2 = document.getElementById('txt-empate-2');
    
    if (!a1) return;
    [a1, m1, n1, a2, m2, n2, ae1, te1, ae2, te2].forEach(el => el.style.display = 'none');
    if (window.membrosDataArray.length === 0) return;
    
    let top = [...window.membrosDataArray].sort((a, b) => window.getPontuacaoFinal(b) - window.getPontuacaoFinal(a));
    let p1 = top.length > 0 ? window.getPontuacaoFinal(top[0]) : 0;
    let p2 = top.length > 1 ? window.getPontuacaoFinal(top[1]) : 0;
    let p3 = top.length > 2 ? window.getPontuacaoFinal(top[2]) : 0;
    let ts = new Date().getTime();
    
    let formatarPts = (pts) => `<br><span style="font-size:11px; color:var(--sup-neon); font-weight:bold; letter-spacing:0.5px;">${window.formatarNumeroDecimal(pts)} pts</span>`;

    if (top.length >= 2 && p1 > 0 && p1 === p2) {
        ae1.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=DIC-Sp&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        ae2.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=DIC-Sp&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        te1.innerHTML = `EMPATE` + formatarPts(p1);
        te2.innerHTML = `EMPATE` + formatarPts(p2);
        [ae1, te1, ae2, te2].forEach(el => el.style.display = 'block');
    } else if (top.length > 0 && p1 > 0) {
        let safe1 = window.cleanHabboNick(top[0].nick);
        a1.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${safe1}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
        n1.innerHTML = safe1 + formatarPts(p1);
        [a1, m1, n1].forEach(el => el.style.display = 'block');
        
        if (top.length >= 3 && p2 > 0 && p2 === p3) {
            ae2.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=DIC-Sp&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
            te2.innerHTML = `EMPATE` + formatarPts(p2);
            [ae2, te2].forEach(el => el.style.display = 'block');
        } else if (top.length >= 2 && p2 > 0) {
            let safe2 = window.cleanHabboNick(top[1].nick);
            a2.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${safe2}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
            n2.innerHTML = safe2 + formatarPts(p2);
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
    let safeNick = window.cleanHabboNick(m.nick);
    
    document.getElementById('avatar-selecionado').src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${safeNick}&action=std&direction=2&head_direction=2&gesture=sml&size=b&time=${ts}`;
    
    document.getElementById('det-total').innerHTML = `<span>${window.formatarNumeroDecimal(tCalc)}</span>` + (ptsExtra > 0 ? `<span style="font-size:16px; color:#4caf50; font-weight:normal;">(+${window.formatarNumeroDecimal(ptsExtra)} bônus)</span>` : '');
    
    let stEl = document.getElementById('det-status');
    stEl.innerText = m.status_base;
    stEl.style.color = m.status_base.toLowerCase().includes('não') ? '#ef4444' : '#4caf50';

    let cardsContainer = document.getElementById('dynamic-stats-cards');
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
        window.configAtividades.forEach(cfg => {
            let pontosDaCaixa = m.atividades_dinamicas[cfg.nome] || 0;
            let pontosAposEvento = pontosDaCaixa * window.eventoMult;
            cardsContainer.innerHTML += `<div class="stat-card"><h4>${cfg.nome}</h4><div class="val">${window.formatarNumeroDecimal(pontosAposEvento)}</div></div>`;
        });
    }
}

window.abrirDashboard = function() {
    document.getElementById('modal-dashboard').style.display = 'flex';
    window.renderAdminAtividadesList();
    window.renderAdminSponsorsList();
    window.renderAdminEventosList();
}

window.fecharDashboard = function() { document.getElementById('modal-dashboard').style.display = 'none'; }

// HUB DE ATIVIDADES
window.renderAdminAtividadesList = function() {
    let container = document.getElementById('dash-atividades-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Categorias fixas
    const categoriasFixas = [
        { nome: 'Soldados', defaultPontos: 0.5, multiplica: true, label: 'Soldados (por incorreção)' },
        { nome: 'Grupos', defaultPontos: 0.5, multiplica: true, label: 'Grupos (por incorreção)' },
        { nome: 'Convites', defaultPontos: 1, multiplica: false, label: 'Convites Válidos' },
        { nome: 'PPP', defaultPontos: 1, multiplica: false, label: 'PPP Válidos' },
        { nome: 'Avisos', defaultPontos: 1, multiplica: false, label: 'Avisos Válidos' }
    ];

    categoriasFixas.forEach((cat) => {
        let cfg = window.configAtividades.find(a => String(a.nome).toLowerCase() === cat.nome.toLowerCase());
        let pontosAtuais = cfg ? cfg.pontos : cat.defaultPontos;

        container.innerHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:15px 20px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);" class="admin-atividade-item" data-nome="${cat.nome}" data-multiplica="${cat.multiplica}">
            <div style="flex:1; min-width: 150px;">
                <div style="font-size:15px; font-weight:700; color:var(--sup-neon); text-transform:uppercase; letter-spacing:0.5px;">${cat.label}</div>
            </div>
            <div style="display:flex; gap: 20px; align-items:center;">
                <div style="display:flex; flex-direction:column; gap:5px; align-items:center;">
                    <label class="tech-label" style="margin:0; font-size:11px; text-transform:uppercase; color:#9ca3af; letter-spacing:0.5px;">Limite/Sem (0=inf)</label>
                    <input type="number" step="1" class="input-padrao atv-limite" value="${cfg ? (cfg.limite || 0) : 0}" style="width: 70px; text-align:center; padding: 6px; font-weight:bold; border-color: rgba(251,191,36,0.3);">
                </div>
                <div style="display:flex; flex-direction:column; gap:5px; align-items:center;">
                    <label class="tech-label" style="margin:0; font-size:11px; text-transform:uppercase; color:#9ca3af; letter-spacing:0.5px;">Pontos</label>
                    <input type="number" step="0.1" class="input-padrao atv-pontos" value="${pontosAtuais}" style="width: 70px; text-align:center; padding: 6px; font-weight:bold; border-color: rgba(251,191,36,0.3);">
                </div>
            </div>
        </div>`;
    });
}

// HUB DE PATROCINADORES
window.adicionarNovoSponsor = function() {
    let inp = document.getElementById('dash-novo-sponsor');
    let nick = inp.value.trim();
    if (!nick) return;
    if (!window.dashboardSponsorsData.includes(nick)) {
        window.dashboardSponsorsData.push(nick);
    }
    inp.value = '';
    window.renderAdminSponsorsList();
}
window.removerSponsor = function(index) {
    window.dashboardSponsorsData.splice(index, 1);
    window.renderAdminSponsorsList();
}
window.renderAdminSponsorsList = function() {
    let container = document.getElementById('dash-sponsors-container');
    if (!container) return;
    container.innerHTML = '';
    if(window.dashboardSponsorsData.length === 0) {
        container.innerHTML = '<p style="color:var(--text-sub); font-style:italic; font-size:14px; margin:0;">Nenhum patrocinador manual cadastrado.</p>';
        return;
    }
    window.dashboardSponsorsData.forEach((nick, i) => {
        container.innerHTML += `
        <div style="display:flex; align-items:center; gap:8px; background:rgba(251,191,36,0.1); border:1px solid var(--sup-neon); padding:5px 10px; border-radius:20px; color:#fff; font-size:13px; font-weight:600;">
            ${nick}
            <button type="button" onclick="window.removerSponsor(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-times"></i></button>
        </div>`;
    });
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
    if (!container) return;
    container.innerHTML = '';
    
    if (window.dashboardEventosData.length === 0) {
        container.innerHTML = '<p style="color:var(--text-sub); font-style:italic; font-size:14px; margin-bottom:20px;">Nenhum evento criado.</p>';
        return;
    }
    
    window.dashboardEventosData.forEach((ev, i) => {
        let html = `
        <div class="admin-evento-item" style="position:relative; background:rgba(0,0,0,0.4); padding:25px; border-radius:12px; border:1px solid rgba(251,191,36,0.2); margin-bottom:20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            <button type="button" onclick="window.removerEventoBox(${i})" style="position:absolute; right:15px; top:15px; background:rgba(255,42,42,0.15); border:none; color:#ef4444; width:35px; height:35px; border-radius:8px; cursor:pointer; transition: all 0.2s;"><i class="fas fa-trash"></i></button>
            <h4 style="color:var(--sup-neon); margin-bottom:20px; font-size:16px; font-weight:600; text-transform:uppercase; letter-spacing:1px;"><i class="fas fa-calendar-star"></i> Evento ${i + 1}</h4>
            
            <div style="display:flex; flex-direction:column; gap:15px;">
                <div class="input-block" style="margin:0;">
                    <label class="tech-label" style="font-size:12px; margin-bottom:5px;">Nome do Evento</label>
                    <input type="text" class="admin-input ev-nome" placeholder="Ex: Guerra de Divisões" value="${ev.nome}">
                </div>
                
                <div style="display:flex; gap:20px;">
                    <div style="flex:1;">
                        <label class="tech-label" style="font-size:12px; margin-bottom:5px;">Data de Início</label>
                        <div class="input-block" style="margin:0;">
                            <input type="date" class="admin-input ev-data-inicio" value="${ev.dataInicio}">
                        </div>
                    </div>
                    <div style="flex:1;">
                        <label class="tech-label" style="font-size:12px; margin-bottom:5px;">Data de Fim</label>
                        <div class="input-block" style="margin:0;">
                            <input type="date" class="admin-input ev-data-fim" value="${ev.dataFim}">
                        </div>
                    </div>
                </div>
                
                <div>
                    <label class="tech-label" style="font-size:12px; margin-bottom:5px;">Regras e Descrição</label>
                    ${window.buildEditorHTML ? window.buildEditorHTML(`ev-desc-${i}`, ev.descricao) : `<textarea class="admin-input ev-desc" style="width:100%; height:100px; resize:vertical;">${ev.descricao}</textarea>`}
                </div>
                
                <div class="input-block" style="margin:0;">
                    <label class="tech-label" style="font-size:12px; margin-bottom:5px;">Texto da Premiação</label>
                    <input type="text" class="admin-input ev-premios-txt" placeholder="Ex: 40c + 20 Pontos" value="${ev.premiosTexto || ''}">
                </div>
                
                <div style="display:flex; gap:20px; align-items:center; margin-top:5px; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 8px;">
                    <label class="checkbox-container" style="color:var(--text-sub); font-size:13px;"><input type="checkbox" class="ev-hc" ${ev.hc ? 'checked' : ''}><span class="checkmark"></span> Emblema no Habbo</label>
                    <label class="checkbox-container" style="color:var(--text-sub); font-size:13px;"><input type="checkbox" class="ev-moedas" ${ev.moedas ? 'checked' : ''}><span class="checkmark"></span> Prêmio em Moedas</label>
                </div>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
    
    if (window.inicializarEditoresTexto) window.inicializarEditoresTexto();
}

window.salvarDashboard = function() {
    let evs = [];
    document.querySelectorAll('.admin-evento-item').forEach(el => {
        let descEl = el.querySelector('.ev-desc');
        evs.push({
            nome: el.querySelector('.ev-nome').value,
            dataInicio: el.querySelector('.ev-data-inicio').value,
            dataFim: el.querySelector('.ev-data-fim').value,
            descricao: descEl.innerHTML !== undefined ? descEl.innerHTML : descEl.value,
            premiosTexto: el.querySelector('.ev-premios-txt').value,
            hc: el.querySelector('.ev-hc').checked,
            moedas: el.querySelector('.ev-moedas').checked
        });
    });

    let atvs = [];
    document.querySelectorAll('.admin-atividade-item').forEach(el => {
        let valPontos = String(el.querySelector('.atv-pontos').value).replace(',', '.');
        let valLimite = el.querySelector('.atv-limite') ? parseInt(el.querySelector('.atv-limite').value, 10) : 0;
        atvs.push({
            nome: el.getAttribute('data-nome'),
            pontos: parseFloat(valPontos) || 0,
            limite: valLimite || 0,
            multiplica: el.getAttribute('data-multiplica') === 'true'
        });
    });
    
    let metaSem = document.getElementById('dash-meta-semanal') ? parseFloat(document.getElementById('dash-meta-semanal').value.replace(',', '.')) : 0;

    window.db.collection("sistema").doc("config_metas").set({
        metaSemanal: metaSem,
        textoPatrocinio: document.getElementById('dash-txt-patrocinio').value,
        eventos: evs,
        atividades: atvs,
        sponsors: window.dashboardSponsorsData
    }).then(() => {
        window.customAlert("Configurações do Hub salvas com sucesso!", "Sucesso");
        window.fecharDashboard();
    }).catch(err => {
        console.error(err);
        window.customAlert("Erro ao salvar configurações do Hub.", "Erro");
    });
}

window.escutarConfigDashboard = function() {
    window.db.collection("sistema").doc("config_metas").onSnapshot((doc) => {
        let defaultAtividades = [
            { nome: 'Grupos', pontos: 0.5, multiplica: true },
            { nome: 'Soldados', pontos: 0.5, multiplica: true },
            { nome: 'Convites', pontos: 1, multiplica: false },
            { nome: 'PPP', pontos: 1, multiplica: false },
            { nome: 'Avisos', pontos: 1, multiplica: false }
        ];

        if (doc.exists) {
            let d = doc.data();
            window.eventoAtivo = d.eventoAtivo || false;
            window.eventoMult = window.eventoAtivo ? (parseInt(d.eventoMult, 10) || 1) : 1;
            window.pontosExtrasMap = d.pontosExtras || {};
            window.dashboardEventosData = d.eventos || [];
            
            // Lê os Patrocinadores
            window.dashboardSponsorsData = d.sponsors || [];
            window.renderSponsors(window.dashboardSponsorsData);
            
            window.metaSemanal = d.metaSemanal;
            if (document.getElementById('dash-meta-semanal') && typeof window.metaSemanal !== 'undefined') {
                document.getElementById('dash-meta-semanal').value = window.metaSemanal;
            }
            
            let defaultAtividades = [
                { nome: 'Grupos', pontos: 0.5, multiplica: true },
                { nome: 'Soldados', pontos: 0.5, multiplica: true },
                { nome: 'Convites', pontos: 1, multiplica: false },
                { nome: 'PPP', pontos: 1, multiplica: false },
                { nome: 'Avisos', pontos: 1, multiplica: false }
            ];
            window.configAtividades = d.atividades || defaultAtividades;
            if (window.configAtividades.length === 0) window.configAtividades = defaultAtividades;
            
            let btnPE = document.getElementById('btn-pontos-extras');
            if (['LIDER', 'VICE-LIDER', 'SUB-LIDER', 'ADMIN'].includes(window.nivelUsuarioGlobal)) {
                if (btnPE) btnPE.style.display = window.eventoAtivo ? 'inline-flex' : 'none';
                } else {
                if (btnPE) btnPE.style.display = 'none';
                }

            let banner = document.getElementById('evento-banner');
            if(banner) banner.style.display = (window.eventoAtivo && window.eventoMult > 1) ? 'flex' : 'none';
            
            let tSpon = document.getElementById('ui-txt-patrocinio');
            if (tSpon) tSpon.innerText = d.textoPatrocinio || 'Deseja patrocinar algum dos eventos e ajudar a divisão? Procure a Liderança!';

            let uiLista = document.getElementById('ui-lista-eventos');
            window.processarPontuacoesSemanais();
            if (uiLista) {
                uiLista.innerHTML = '';
                if (window.dashboardEventosData.length === 0) {
                    uiLista.innerHTML = `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--sup-neon); margin-bottom: 15px;"><div style="color: #fff; font-size: 14px;">Fique atento aos anúncios no grupo!</div></div>`;
                } else {
                    window.dashboardEventosData.forEach((ev, i) => {
                        let dtTxt = (ev.dataInicio && ev.dataFim) ? `${window.parseQualquerData(ev.dataInicio).formatada} a ${window.parseQualquerData(ev.dataFim).formatada}` : (ev.dataInicio ? window.parseQualquerData(ev.dataInicio).formatada : "");
                        
                        let pUI = '';
                        if (ev.premiosTexto || ev.hc || ev.moedas) {
                            pUI = `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed rgba(251,191,36,0.2);">`;
                            if (ev.premiosTexto) pUI += `<div style="color:var(--sup-neon); font-size:13px; margin-bottom:10px; font-weight:600;">${ev.premiosTexto}</div>`;
                            if (ev.hc || ev.moedas) {
                                pUI += `<div style="display:flex; gap:15px; align-items:center;">`;
                                if (ev.hc) pUI += `<img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEirfXmN9g_cDNpjq8o7oXeKFIRwJLgI-w2FEisZ3iJdxqblDlMM858H3fDrWh-PpDE12pNyMmPBdxX8TRgBU95PXO8nd24V9Gny1nFTkhqsGKUKfMmtK-AEoIAvFTsJBjsNV2gk2oUkTTpf/s1600/HC31.gif" draggable="false" style="display:block; width:40px;">`;
                                if (ev.moedas) pUI += `<img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjDZ6AWqYyPxpnw-heLbJ-k1qoyj_EZN8_wWWotWVW5MzTQZKPQEY-L3zuPCYIK-ExBKbQFBxyfS_c_F4xY6pPUAgRoHiJvC9HgpWYj6iVUCp4eXDF7M-ilisPyCQ6KBpGfdqgwjpmvWrsi/s1600/15c6908117fc3.gif" draggable="false" style="display:block; width:175px;">`;
                                pUI += `</div>`;
                            }
                            pUI += `</div>`;
                        }

                        uiLista.insertAdjacentHTML('beforeend', `
                            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid var(--sup-neon); margin-bottom: 15px;">
                                <h4 style="color:var(--sup-neon); margin-bottom: 5px; font-size: 18px; text-transform: uppercase;">${ev.nome || 'Evento'}</h4>
                                ${dtTxt ? `<div style="color: var(--text-sub); font-size: 13px; margin-bottom: 10px; display:flex; align-items:center; gap:5px; font-weight:600;"><i class="fas fa-calendar-alt"></i> <span>${dtTxt}</span></div>` : ''}
                                <div style="color: #fff; font-size: 14px; line-height: 1.5;">${ev.descricao || ''}</div>
                                ${pUI}
                            </div>
                        `);
                    });
                }
            }
            window.processarPontuacoesSemanais();
        } else {
            // FALLBACK
            window.configAtividades = defaultAtividades;
            window.metaSemanal = undefined;
            if (document.getElementById('dash-meta-semanal')) document.getElementById('dash-meta-semanal').value = '';
            window.processarPontuacoesSemanais();
        }
    });
}

window.abrirModalPontosExtras = function() {
    document.getElementById('modal-pontos-extras').style.display = 'flex';
    let sel = document.getElementById('pe-select-membro');
    sel.innerHTML = '<option value="" disabled selected>Selecione...</option>';
    [...window.membrosDataArray].sort((a, b) => window.normalizeNick(a.nick).localeCompare(window.normalizeNick(b.nick))).forEach(m => {
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
    if (!nick || isNaN(pts)) return window.mostrarToast ? window.mostrarToast("Selecione um membro e digite a pontuação.", "error") : alert("Erro");
    window.pontosExtrasMap[nick] = pts;
    window.db.collection("sistema").doc("config_metas").set({ pontosExtras: window.pontosExtrasMap }, { merge: true }).then(() => {
        document.getElementById('pe-input-pontos').value = '';
        if (window.mostrarToast) window.mostrarToast(`+${window.formatarNumeroDecimal(pts)} pontos para ${nick}`, "success");
        window.renderTabelaPontosExtras();
    });
}

window.removerPontoExtra = function(nick) {
    delete window.pontosExtrasMap[nick];
    window.db.collection("sistema").doc("config_metas").set({ pontosExtras: window.pontosExtrasMap }, { merge: true });
    window.renderTabelaPontosExtras();
}

window.renderTabelaPontosExtras = function() {
    let tbody = document.querySelector('#tb-pontos-extras tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (let n in window.pontosExtrasMap) {
        tbody.innerHTML += `<tr><td>${n}</td><td style="text-align:center; color:var(--sup-neon); font-weight:bold;">+${window.formatarNumeroDecimal(window.pontosExtrasMap[n])}</td><td style="text-align:right;"><button class="btn-admin-icon btn-admin-del" onclick="window.removerPontoExtra('${n}')"><i class="fas fa-trash"></i></button></td></tr>`;
    }
    if (Object.keys(window.pontosExtrasMap).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-sub);">Nenhum ponto extra.</td></tr>';
    }
}

window.toggleFiltrosHistorico = function() {
    let tipo = document.getElementById('hist-tipo-consulta').value;
    let semanais = document.querySelectorAll('.hist-filtro-semanal');
    let mensal = document.getElementById('hist-filtro-mensal');
    if (tipo === 'semanal') {
        semanais.forEach(el => el.style.display = 'block');
        if(mensal) mensal.style.display = 'none';
    } else {
        semanais.forEach(el => el.style.display = 'none');
        if(mensal) mensal.style.display = 'block';
    }
}

window.getWeekRangeString = function(dateStr) {
    let dtParsed = window.parseQualquerData(dateStr);
    if (!dtParsed.dateObj) return "Data Inválida";
    
    let d = dtParsed.dateObj;
    let day = d.getDay(); 
    let diff = d.getDate() - day;
    let start = new Date(d.setDate(diff));
    let end = new Date(d.setDate(start.getDate() + 6));
    let fmt = (dt) => String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth()+1).padStart(2, '0') + '/' + dt.getFullYear();
    return `${fmt(start)} a ${fmt(end)}`;
}

window.buscarHistoricoMetas = async function() {
    let nickInput = document.getElementById('hist-input-membro');
    let nick = nickInput ? window.normalizeNick(nickInput.value) : "";
    let tipoConsulta = document.getElementById('hist-tipo-consulta').value;
    let detalhamento = document.getElementById('hist-detalhamento').value;
    
    if (!nick) return window.mostrarToast ? window.mostrarToast("Digite um nick policial.", "error") : alert("Digite um nick policial!");

    let dataInicio, dataFim;
    if (tipoConsulta === 'semanal') {
        dataInicio = document.getElementById('hist-data-inicio').value;
        dataFim = document.getElementById('hist-data-fim').value;
        if (!dataInicio || !dataFim) return window.mostrarToast ? window.mostrarToast("Preencha as datas.", "error") : alert("Preencha as datas!");
    } else {
        let mesVal = document.getElementById('hist-mes').value; 
        if (!mesVal) return window.mostrarToast ? window.mostrarToast("Selecione o mês.", "error") : alert("Selecione o mês!");
        let [ano, mes] = mesVal.split('-');
        dataInicio = `${ano}-${mes}-01`;
        dataFim = `${ano}-${mes}-${new Date(ano, mes, 0).getDate()}`;
    }

    let container = document.getElementById('hist-resultados');
    container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando dados históricos e métricas...';
    container.style.display = 'block';

    try {
        let pI = dataInicio.split('-');
        let pF = dataFim.split('-');
        let dI = new Date(parseInt(pI[0], 10), parseInt(pI[1], 10)-1, parseInt(pI[2], 10), 0, 0, 0);
        let dF = new Date(parseInt(pF[0], 10), parseInt(pF[1], 10)-1, parseInt(pF[2], 10), 23, 59, 59);

        let infoAdm = window.admissoesGeral[nick] || {};
        let cargoSigla = infoAdm.cargo ? infoAdm.cargo.toUpperCase().trim() : "SP";
        
        let cargoExtenso = "Supervisor";
        if(cargoSigla === "A.SP") cargoExtenso = "Auxiliar";
        else if(cargoSigla === "S.SP") cargoExtenso = "Sub-Líder";
        else if(cargoSigla === "VL.SP") cargoExtenso = "Vice-Líder";
        else if(cargoSigla === "L.SP") cargoExtenso = "Líder";

        let parsedAdm = window.parseQualquerData(infoAdm.data);
        let dataAdmFormatada = parsedAdm.formatada;
        let dAdm = parsedAdm.dateObj;
        
        let resultLines = [];
        let nickVisual = infoAdm.nickOriginal || nickInput.value.trim();
        resultLines.push(`${cargoExtenso} ${nickVisual}`);
        
        let labelData = cargoExtenso === "Auxiliar" ? "Data de ascensão" : "Data de admissão";
        resultLines.push(`${labelData}: ${dataAdmFormatada}`);

        let filtradas = window.logsHistoricoGeral.filter(a => {
            if (window.normalizeNick(a.nick) !== nick) return false;
            let aDate = window.parseQualquerData(a.data).dateObj;
            if (!aDate) return false;
            if (dAdm && aDate < dAdm) return false;
            return aDate >= dI && aDate <= dF;
        });

        let totalAcompanhamentos = window.acompanhamentosGeral.filter(acc => {
            if (window.normalizeNick(acc.nick) !== nick) return false;
            let accDate = window.parseQualquerData(acc.data).dateObj;
            if (!accDate) return false;
            if (dAdm && accDate < dAdm) return false;
            return accDate >= dI && accDate <= dF;
        }).length;

        if (filtradas.length === 0) {
            resultLines.push(`Nenhuma atividade válida no período.`);
            if (cargoExtenso !== "Auxiliar") resultLines.push(`Acompanhamentos: ${totalAcompanhamentos}`);
        } else {
            let eAuxiliar = filtradas.some(a => a.aba === 'Relatórios');

            if (eAuxiliar) {
                filtradas.sort((a,b) => {
                    let dA = window.parseQualquerData(a.data).dateObj || 0;
                    let dB = window.parseQualquerData(b.data).dateObj || 0;
                    return dA - dB;
                }).forEach(a => {
                    if (a.aba === 'Relatórios') {
                        let fmtData = window.parseQualquerData(a.data).formatada;
                        resultLines.push(`${fmtData} | ${a.grupo || '-'} | ${a.nota}`);
                    }
                });
            } else {
                let semanas = {};
                filtradas.forEach(a => {
                    let pts = 0;
                    let st = a.status ? String(a.status).toLowerCase().trim() : "";
                    
                    let valido = st.startsWith('v'); 
                    if (valido) { 
                        let abaLimpa = a.aba ? String(a.aba).toLowerCase().trim() : "";
                        let cfgAtividade = window.configAtividades.find(c => abaLimpa.includes(String(c.nome).toLowerCase().trim()));
                        
                        if(cfgAtividade) {
                            let valQtd = String(a.qtd || "").trim();
                            let qtdNum = parseFloat(valQtd.replace(',', '.'));
                            if (isNaN(qtdNum) || valQtd === "") qtdNum = 1;
                            
                            let valDesc = String(a.descontos || "0").trim();
                            let descNum = parseFloat(valDesc.replace(',', '.'));
                            if (isNaN(descNum)) descNum = 0;
                            
                            let basePts = parseFloat(cfgAtividade.pontos);
                            if (isNaN(basePts)) basePts = 0;
                            
                            pts = cfgAtividade.multiplica ? (basePts * qtdNum) : basePts;
                            pts -= descNum;
                            if (pts < 0) pts = 0;
                        }
                    }
                    
                    let wk = window.getWeekRangeString(a.data);
                    if(!semanas[wk]) semanas[wk] = { pts: 0, log: [] };
                    semanas[wk].pts += pts;
                    if(detalhamento === 'completo') {
                        let fmtData = window.parseQualquerData(a.data).formatada;
                        semanas[wk].log.push(`   > ${fmtData} | ${a.aba} | ${window.formatarNumeroDecimal(pts)} pts`);
                    }
                });

                Object.keys(semanas).sort((a,b) => {
                    let dA = window.parseQualquerData(a.split(' ')[0]).dateObj || 0;
                    let dB = window.parseQualquerData(b.split(' ')[0]).dateObj || 0;
                    return dA - dB;
                }).forEach(wk => {
                    let total = semanas[wk].pts;
                    let metaCalc = (typeof window.metaSemanal !== 'undefined' && window.metaSemanal !== null) ? window.metaSemanal : 0;
                    let st = 'Não cumprida';
                    if (metaCalc === 0) st = 'Sem Meta';
                    else if (total >= metaCalc) st = 'Cumprida';
                    if (total === 0) st = "Aval/Licença ou Justificada";
                    
                    resultLines.push(`${wk} | ${window.formatarNumeroDecimal(total)} | ${st}`);
                    if (detalhamento === 'completo' && semanas[wk].log.length > 0) resultLines.push(...semanas[wk].log);
                });
                
                if (cargoExtenso !== "Auxiliar") resultLines.push(`Acompanhamentos: ${totalAcompanhamentos}`);
            }
        }
        resultLines.push(`------------------------------------------`);
        container.innerHTML = resultLines.join('\n');
    } catch(err) {
        console.error(err);
        container.innerHTML = 'Erro ao processar busca histórica.';
    }
}

document.addEventListener('DOMContentLoaded', () => { if(window.setSemanaAtual) window.setSemanaAtual(); });

// ==========================================
// ACERVO GERAL DE ATIVIDADES E PONTUACOES

// ==========================================
// ACERVO GERAL DE ATIVIDADES E PONTUACOES (V2)
// ==========================================

window.toggleAcervoGeral = function() {
    let container = document.getElementById('acervo-geral-container');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        let nivel = window.nivelUsuarioGlobal || '';
        let tabs = document.querySelectorAll('.tab-acervo');
        if (nivel === 'AUXILIAR') {
            tabs.forEach(t => { if(t.id !== 'btn-tab-relatorios-auxiliares') t.style.display = 'none'; });
            window.abrirAbaAcervo('Relatórios dos Auxiliares', document.getElementById('btn-tab-relatorios-auxiliares'));
        } else {
            tabs.forEach(t => t.style.display = 'block');
            window.abrirAbaAcervo('Controle de Metas', document.getElementById('btn-tab-controle-metas'));
        }
    } else {
        container.style.display = 'none';
    }
}

window.abrirAbaAcervo = function(abaNome, btnEl) {
    document.querySelectorAll('.tab-acervo').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    
    if (abaNome === 'Controle de Metas') {
        document.getElementById('aba-Controle-de-Metas').style.display = 'block';
        document.getElementById('aba-dinamica-container').style.display = 'none';
        window.carregarControleMetas();
    } else {
        document.getElementById('aba-Controle-de-Metas').style.display = 'none';
        document.getElementById('aba-dinamica-container').style.display = 'block';
        window.renderAcervoDinamico(abaNome);
    }
}

window.getPatenteReal = function(nickLower) {
    let dadosPatente = window.dadosGeraisRH && window.dadosGeraisRH.patentes ? window.dadosGeraisRH.patentes.get(nickLower) : null;
    return dadosPatente ? (dadosPatente['Posto/Grad'] || 'Desconhecida') : 'Desconhecida';
}

window.renderAcervoDinamico = function(abaNome) {
    let trHead = document.getElementById('tb-acervo-thead-tr');
    let tbody = document.getElementById('tb-acervo-tbody');
    trHead.innerHTML = '';
    tbody.innerHTML = '';
    
    let docs = [];
    if (abaNome === 'Avisos') {
        docs = window.avisosValidosGeral || [];
    } else {
        let filtroTipo = abaNome === 'Relatórios dos Auxiliares' ? 'Relatórios' : abaNome;
        docs = (window.atividadesCorrigidasGeral || []).filter(a => a.tipo === filtroTipo || a.aba === filtroTipo);
    }
    
    if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding: 20px;">Nenhum registro encontrado.</td></tr>';
        return;
    }
    
    docs.sort((a,b) => {
        let tA = a.dataPostagem ? window.parseQualquerData(a.dataPostagem).dateObj : (a.dataCriacao ? a.dataCriacao.toMillis() : 0);
        let tB = b.dataPostagem ? window.parseQualquerData(b.dataPostagem).dateObj : (b.dataCriacao ? b.dataCriacao.toMillis() : 0);
        return tB - tA;
    });
    
    // TABELAS INTELIGENTES: Schema definitions per tab
    let baseCols = ['Data', 'Supervisor', 'Patente'];
    let specificCols = [];
    
    if (abaNome === 'Soldados') specificCols = ['Recruta(s)', 'Treinador', 'Link'];
    else if (abaNome === 'Grupos') specificCols = ['Grupo(s)', 'Link'];
    else if (abaNome === 'Convites') specificCols = ['Recruta(s)', 'Link'];
    else if (abaNome === 'PPP') specificCols = ['Participante(s)', 'Resultado', 'Link'];
    else if (abaNome === 'Avisos') specificCols = ['Motivo', 'Observação'];
    else if (abaNome === 'Relatórios dos Auxiliares') specificCols = ['Relatório', 'Link'];
    
    // Auto-discover extra fields that are not in the standard schema but shouldn't be lost
    let ignoreKeys = ['id','tipo','aba','data','timestamp','dataAprovacao','invalido','style','innerHTML','filter','includes','forEach','splice','push','split','_dataObjParaSort','descontos','status','corretor','autor','dataPostagem','dataCriacao','nick','criador'];
    // Add variations of mapped keys to ignore list so we don't duplicate them
    ignoreKeys.push('soldado','recruta','recrutas','participante','treinador','resultado','link','motivo','observacao','relatorio','relatorios','grupo','grupos');
    
    let extraColsSet = new Set();
    docs.forEach(d => {
        Object.keys(d).forEach(k => {
            if (!ignoreKeys.includes(k) && typeof d[k] !== 'function' && typeof d[k] !== 'object') extraColsSet.add(k);
        });
    });
    let extraCols = Array.from(extraColsSet);
    
    let finalCols = baseCols.concat(specificCols).concat(extraCols).concat(['Descontos', 'Status', 'Corretor']);
    
    finalCols.forEach(c => {
        trHead.innerHTML += `<th>${c.toUpperCase()}</th>`;
    });
    
    let formatLink = (val) => {
        if (!val) return '-';
        if (typeof val === 'string' && val.startsWith('http')) return `<a href="${val}" target="_blank" style="color:var(--sup-neon); text-decoration:underline;">Link</a>`;
        return val;
    };
    
    docs.forEach(d => {
        let dt = d.dataPostagem || (d.dataCriacao ? new Date(d.dataCriacao.toMillis()).toLocaleString('pt-BR') : 'N/A');
        let nickFull = d.nick || d.criador || 'N/A';
        let safeNick = window.normalizeNick(nickFull);
        let patente = window.getPatenteReal(safeNick);
        
        let htmlRow = `<td>${dt}</td><td><b>${nickFull}</b></td><td>${patente}</td>`;
        
        // Specific mapping
        if (abaNome === 'Soldados') {
            htmlRow += `<td>${formatLink(d.soldado || d.recruta || d.recrutas || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.treinador || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.link || '-')}</td>`;
        }
        else if (abaNome === 'Grupos') {
            htmlRow += `<td>${formatLink(d.grupo || d.grupos || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.link || '-')}</td>`;
        }
        else if (abaNome === 'Convites') {
            htmlRow += `<td>${formatLink(d.recruta || d.recrutas || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.link || '-')}</td>`;
        }
        else if (abaNome === 'PPP') {
            htmlRow += `<td>${formatLink(d.participante || d.recruta || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.resultado || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.link || '-')}</td>`;
        }
        else if (abaNome === 'Avisos') {
            htmlRow += `<td>${formatLink(d.motivo || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.observacao || d.obs || '-')}</td>`;
        }
        else if (abaNome === 'Relatórios dos Auxiliares') {
            htmlRow += `<td>${formatLink(d.relatorio || '-')}</td>`;
            htmlRow += `<td>${formatLink(d.link || '-')}</td>`;
        }
        
        // Extra cols
        extraCols.forEach(ec => { htmlRow += `<td>${formatLink(d[ec] || '-')}</td>`; });
        
        // Fixed End
        htmlRow += `<td>${d.descontos || '0'}</td>`;
        
        let st = d.status || (d.invalido ? 'Inválido' : 'Válido');
        let color = st.toLowerCase().includes('inv') ? '#ef4444' : '#10b981';
        htmlRow += `<td style="color:${color}; font-weight:bold;">${st}</td>`;
        htmlRow += `<td>${d.corretor || d.autor || '-'}</td>`;
        
        let tr = document.createElement('tr');
        tr.innerHTML = htmlRow;
        tbody.appendChild(tr);
    });
}

// ------------------------------------------
// CONTROLE DE METAS (TIMELINE VERTICAL)
// ------------------------------------------
window.carregarControleMetas = function() {
    let container = document.getElementById('aba-Controle-de-Metas');
    container.innerHTML = '';
    
    let supervisores = Object.values(window.admissoesGeral || {}).filter(m => m.cargo === 'Sp');
    supervisores.sort((a,b) => window.normalizeNick(a.nickOriginal).localeCompare(window.normalizeNick(b.nickOriginal)));
    
    let configMap = {};
    window.configAtividades.forEach(cfg => { configMap[String(cfg.nome).toLowerCase().trim()] = cfg; });
    
    let monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    // Render current year months up to this month
    let hoje = new Date();
    let currentYear = hoje.getFullYear();
    let currentMonth = hoje.getMonth();
    
    for (let m = 0; m <= currentMonth; m++) {
        let mesDiv = document.createElement('div');
        mesDiv.className = 'metas-mes-container';
        mesDiv.innerHTML = `<div class="metas-mes-header">${monthNames[m]} ${currentYear}</div>`;
        
        // Encontrar todas as semanas que comecam ou terminam neste mes
        // Semana Habbo (Dom a Sab). 
        let day1 = new Date(currentYear, m, 1);
        let lastDay = new Date(currentYear, m + 1, 0);
        
        // Recuar pro domingo da primeira semana
        let loopDate = new Date(day1);
        loopDate.setDate(loopDate.getDate() - loopDate.getDay());
        
        let weeksRendered = 0;
        
        while (loopDate <= lastDay) {
            let wStart = new Date(loopDate);
            let wEnd = new Date(loopDate);
            wEnd.setDate(wEnd.getDate() + 6);
            
            // Skip if the week is totally in the past year
            if (wEnd.getFullYear() < currentYear) {
                loopDate.setDate(loopDate.getDate() + 7);
                continue;
            }
            
            // If the week falls exactly into two months, render it on the month where its Sunday belongs.
            // wStart.getMonth() === m
            if (wStart.getMonth() === m) {
                weeksRendered++;
                
                let fmt = d => String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
                let fmtK = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                let sK = fmtK(wStart) + '_' + fmtK(wEnd);
                
                let block = document.createElement('div');
                block.className = 'metas-semana-block';
                
                let btnSave = `<button class="btn-tech" style="float:right; padding: 4px 10px; font-size: 11px; background:#10b981; border-color:#10b981;" onclick="window.salvarSemanaEspecifica('${sK}', this)"><i class="fas fa-save"></i> Salvar Alterações</button>`;
                
                block.innerHTML = `<div class="metas-semana-title"><i class="far fa-calendar-alt"></i> Semana ${fmt(wStart)} a ${fmt(wEnd)} ${btnSave}</div>`;
                
                let tbWrapper = document.createElement('div');
                tbWrapper.className = 'admin-table-wrapper';
                tbWrapper.style.overflowX = 'auto';
                
                let tbHtml = `
                    <table class="admin-table">
                        <thead><tr><th>Policial</th><th>Patente</th><th>Pontuação</th><th>Status da Semana</th></tr></thead>
                        <tbody>
                `;
                
                let savedStatus = window.statusMetasSemanais[sK] || {};
                
                supervisores.forEach(sup => {
                    let safeNick = window.normalizeNick(sup.nickOriginal);
                    let patente = window.getPatenteReal(safeNick);
                    
                    let ptsSemana = 0;
                    let contagem = {};
                    window.configAtividades.forEach(cfg => contagem[cfg.nome] = 0);
                    
                    // Calc activities
                    let wAtivs = (window.atividadesCorrigidasGeral || []).filter(a => {
                        if(window.normalizeNick(a.nick) !== safeNick) return false;
                        let dp = window.parseQualquerData(a.dataPostagem).dateObj;
                        return dp && dp >= wStart && dp <= new Date(wEnd.getTime() + 86399000) && (!a.status || !String(a.status).toLowerCase().includes('inv'));
                    });
                    wAtivs.sort((a,b) => window.parseQualquerData(a.dataPostagem).dateObj - window.parseQualquerData(b.dataPostagem).dateObj);
                    
                    wAtivs.forEach(a => {
                        let cfg = configMap[String(a.tipo).toLowerCase().trim()];
                        if (cfg) {
                            let p = parseFloat(cfg.pontos) || 0;
                            if (a.tipo === 'Grupos' || a.tipo === 'Soldados') p = cfg.multiplica ? (p * (parseInt(a.incorrecoes)||0)) : p;
                            else if (a.tipo === 'Convites' || a.tipo === 'PPP') p = p - (parseFloat(a.descontos)||0);
                            if (p < 0) p = 0;
                            contagem[cfg.nome]++;
                            let lim = parseInt(cfg.limite)||0;
                            if(lim===0 || contagem[cfg.nome]<=lim) ptsSemana += p;
                        }
                    });
                    
                    // Calc avisos
                    let wAvisos = (window.avisosValidosGeral || []).filter(av => {
                        if(av.invalido || window.normalizeNick(av.criador) !== safeNick) return false;
                        let ts = av.dataConclusao ? av.dataConclusao.toMillis() : (av.dataCriacao ? av.dataCriacao.toMillis() : 0);
                        let dt = new Date(ts);
                        return dt >= wStart && dt <= new Date(wEnd.getTime() + 86399000);
                    });
                    wAvisos.forEach(av => {
                        let cfg = configMap['avisos'];
                        if (cfg) {
                            contagem['Avisos'] = (contagem['Avisos']||0)+1;
                            let lim = parseInt(cfg.limite)||0;
                            if(lim===0 || contagem['Avisos']<=lim) ptsSemana += (parseFloat(cfg.pontos)||0);
                        }
                    });
                    
                    let autoStatus = ptsSemana >= (window.metaSemanal||5) ? "Cumprida" : "Não cumprida";
                    let currentStatus = savedStatus[safeNick] || autoStatus;
                    
                    tbHtml += `
                        <tr>
                            <td><b>${sup.nickOriginal}</b></td>
                            <td>${patente}</td>
                            <td><b>${window.formatarNumeroDecimal(ptsSemana)}</b></td>
                            <td>
                                <select class="form-input sel-status-meta-${sK}" data-nick="${safeNick}" onchange="window.highlightUnsaved(this)" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px; border-radius:4px; outline:none; cursor:pointer;">
                                    <option value="Cumprida" ${currentStatus==='Cumprida'?'selected':''}>Cumprida</option>
                                    <option value="Não cumprida" ${currentStatus==='Não cumprida'?'selected':''}>Não cumprida</option>
                                    <option value="Justificada" ${currentStatus==='Justificada'?'selected':''}>Justificada</option>
                                    <option value="Aval/Licença" ${currentStatus==='Aval/Licença'?'selected':''}>Aval/Licença</option>
                                    <option value="Isento" ${currentStatus==='Isento'?'selected':''}>Isento</option>
                                </select>
                            </td>
                        </tr>
                    `;
                });
                
                tbHtml += `</tbody></table>`;
                tbWrapper.innerHTML = tbHtml;
                block.appendChild(tbWrapper);
                mesDiv.appendChild(block);
            }
            loopDate.setDate(loopDate.getDate() + 7);
        }
        
        // Append month reversed so recent months are at the top, or just sequentially? 
        // A timeline is usually Sequential (Jan at top) or Reverse (Recent at top). 
        // Let's prepend to show newest months at the top.
        if (weeksRendered > 0) container.prepend(mesDiv);
    }
}

window.highlightUnsaved = function(selectEl) {
    selectEl.style.borderColor = "var(--sup-neon)";
    selectEl.style.boxShadow = "0 0 5px var(--sup-neon)";
}

window.salvarSemanaEspecifica = function(semanaKey, btn) {
    let selects = document.querySelectorAll(`.sel-status-meta-${semanaKey}`);
    let mapToSave = window.statusMetasSemanais[semanaKey] || {};
    
    selects.forEach(sel => {
        let nick = sel.getAttribute('data-nick');
        mapToSave[nick] = sel.value;
        sel.style.borderColor = "rgba(255,255,255,0.2)"; // remove highlight
        sel.style.boxShadow = "none";
    });
    
    window.statusMetasSemanais[semanaKey] = mapToSave;
    
    let htmlOld = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    window.db.collection("sistema").doc("controle_metas_semanais").set({
        dados: JSON.stringify(window.statusMetasSemanais)
    }, {merge: true}).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
        setTimeout(()=> { btn.innerHTML = htmlOld; }, 2000);
    }).catch(e => {
        btn.innerHTML = '<i class="fas fa-times"></i> Erro';
        console.error(e);
        setTimeout(()=> { btn.innerHTML = htmlOld; }, 2000);
    });
}

window.abrirRelatorioSupervisores = function() {
    document.getElementById('modal-relatorio-supervisores').style.display = 'flex';
    
    let out = "";
    let supervisores = Object.values(window.admissoesGeral || {}).filter(m => m.cargo === 'Sp');
    supervisores.sort((a,b) => window.normalizeNick(a.nickOriginal).localeCompare(window.normalizeNick(b.nickOriginal)));
    
    let configMap = {};
    window.configAtividades.forEach(cfg => { configMap[String(cfg.nome).toLowerCase().trim()] = cfg; });
    let ativs = window.atividadesCorrigidasGeral || [];
    let avisos = window.avisosValidosGeral || [];
    let hoje = new Date();
    
    supervisores.forEach(m => {
        let nickFull = m.nickOriginal;
        let safeNick = window.normalizeNick(nickFull);
        let dAdmRaw = m.data;
        
        out += `Supervisor ${nickFull}\n`;
        out += `Data de admissão: ${dAdmRaw}\n`;
        
        let totalAcompanhamentos = 0;
        let aMembro = ativs.filter(a => window.normalizeNick(a.nick) === safeNick && a.tipo === 'Acompanhamentos' && (!a.status || !String(a.status).toLowerCase().includes('inv')));
        totalAcompanhamentos = aMembro.length; 
        
        let startObj = window.parseQualquerData(dAdmRaw).dateObj;
        if (!startObj || isNaN(startObj)) {
            out += `> Data de admissão inválida, ignorando semanas.\n`;
        } else {
            let day = startObj.getDay();
            let dLoop = new Date(startObj);
            dLoop.setDate(dLoop.getDate() - day);
            
            let fmt = d => String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
            let fmtK = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            
            while (dLoop <= hoje) {
                let wStart = new Date(dLoop);
                let wEnd = new Date(dLoop);
                wEnd.setDate(wEnd.getDate() + 6);
                let sK = fmtK(wStart) + '_' + fmtK(wEnd);
                
                let ptsSemana = 0;
                let contagem = {};
                window.configAtividades.forEach(cfg => contagem[cfg.nome] = 0);
                
                let wAtivs = ativs.filter(a => {
                    if(window.normalizeNick(a.nick) !== safeNick) return false;
                    let dp = window.parseQualquerData(a.dataPostagem).dateObj;
                    return dp && dp >= wStart && dp <= new Date(wEnd.getTime() + 86399000) && (!a.status || !String(a.status).toLowerCase().includes('inv'));
                });
                wAtivs.forEach(a => {
                    let cfg = configMap[String(a.tipo).toLowerCase().trim()];
                    if (cfg) {
                        let p = parseFloat(cfg.pontos) || 0;
                        if (a.tipo === 'Grupos' || a.tipo === 'Soldados') p = cfg.multiplica ? (p * (parseInt(a.incorrecoes)||0)) : p;
                        else if (a.tipo === 'Convites' || a.tipo === 'PPP') p = p - (parseFloat(a.descontos)||0);
                        if (p < 0) p = 0;
                        contagem[cfg.nome]++;
                        let lim = parseInt(cfg.limite)||0;
                        if(lim===0 || contagem[cfg.nome]<=lim) ptsSemana += p;
                    }
                });
                
                let wAvisos = avisos.filter(av => {
                    if(av.invalido || window.normalizeNick(av.criador) !== safeNick) return false;
                    let ts = av.dataConclusao ? av.dataConclusao.toMillis() : (av.dataCriacao ? av.dataCriacao.toMillis() : 0);
                    let dt = new Date(ts);
                    return dt >= wStart && dt <= new Date(wEnd.getTime() + 86399000);
                });
                wAvisos.forEach(av => {
                    let cfg = configMap['avisos'];
                    if (cfg) {
                        contagem['Avisos'] = (contagem['Avisos']||0)+1;
                        let lim = parseInt(cfg.limite)||0;
                        if(lim===0 || contagem['Avisos']<=lim) ptsSemana += (parseFloat(cfg.pontos)||0);
                    }
                });
                
                let savedStatus = window.statusMetasSemanais[sK] || {};
                let sts = savedStatus[safeNick] || (ptsSemana >= (window.metaSemanal||5) ? 'Cumprida' : 'Não cumprida');
                
                out += `${fmt(wStart)} a ${fmt(wEnd)} | ${window.formatarNumeroDecimal(ptsSemana)} | ${sts}\n`;
                dLoop.setDate(dLoop.getDate() + 7);
            }
        }
        out += `Acompanhamentos: ${totalAcompanhamentos}\n------------------------------------------\n\n`;
    });
    
    document.getElementById('txt-relatorio-supervisores').value = out;
}

window.copiarRelatorioSupervisores = function() {
    let txt = document.getElementById('txt-relatorio-supervisores');
    txt.select();
    document.execCommand('copy');
    window.customAlert('Relatório copiado para a área de transferência!', 'Sucesso');
}

