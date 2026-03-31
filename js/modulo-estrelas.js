let militaresEstrelasData = [];
window.listenerDemitidosAtivo = false;

// FUNÇÃO DE PERMISSÃO: Mostra o tacômetro apenas para Vice+
window.verificarPermissaoCorrecao = function() {
    const nivel = window.usuarioLogadoNivel; // Assume-se que esta variável global existe com o nível do usuário
    const cargosAutorizados = ["VICE-LIDER", "LIDER", "ADMIN"];
    
    let btn = document.getElementById('btn-dashboard-correcao');
    if (btn && cargosAutorizados.includes(nivel)) {
        btn.style.display = 'inline-block';
    }
}

window.escutarCargos = function() {
    window.db.collection("sistema").doc("cargos").onSnapshot((doc) => {
        if (doc.exists && doc.data().dados) {
            try {
                window.cargosMap = JSON.parse(doc.data().dados);
                window.renderTabelaEstrelas();
            } catch (e) {
                console.error("Erro no parse dos cargos", e);
            }
        }
    });
}

window.escutarDemitidos = function() {
    if (window.listenerDemitidosAtivo) return;
    window.listenerDemitidosAtivo = true;

    window.db.collection("sistema").doc("demitidos").onSnapshot(async (doc) => {
        if (doc.exists && doc.data().lista) {
            try {
                let demitidos = JSON.parse(doc.data().lista);
                if (!Array.isArray(demitidos) || demitidos.length === 0) return;

                let snap = await window.db.collection("militares").get();
                let promisesDeExclusao = [];

                snap.forEach(militarDoc => {
                    let data = militarDoc.data();
                    let nomeMilitar = data.nome ? data.nome.trim() : militarDoc.id;
                    let isDemitido = demitidos.some(d => d.toLowerCase() === nomeMilitar.toLowerCase());

                    if (isDemitido) {
                        let p = window.db.collection("militares").doc(militarDoc.id).delete()
                        .then(() => {
                            window.registrarLogEstrela(
                                nomeMilitar,
                                "Remoção (Demissão)",
                                "-",
                                "O perfil foi removido automaticamente do rank de estrelas devido a registro de Demissão na planilha."
                            );
                        }).catch(e => console.error("Erro ao apagar demitido:", e));
                        promisesDeExclusao.push(p);
                    }
                });

                await Promise.all(promisesDeExclusao);
                window.db.collection("sistema").doc("demitidos").update({ lista: "[]" });
            } catch (e) { console.error("Erro na faxina:", e); }
        }
    });
}

window.escutarMilitaresEstrelas = function() {
    window.verificarPermissaoCorrecao(); // Checa se mostra o ícone de tacômetro
    window.escutarDemitidos(); 

    window.db.collection("militares").onSnapshot((snapshot) => {
        militaresEstrelasData = [];
        snapshot.forEach((docSnap) => {
            militaresEstrelasData.push({ id: docSnap.id, ...docSnap.data() });
        });
        window.renderTabelaEstrelas();
    });
}

window.renderTabelaEstrelas = function() {
    let tbody = document.querySelector('#tb-militares-estrelas tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (militaresEstrelasData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-sub);">Nenhum policial registrado.</td></tr>';
        return;
    }
    
    let lista = [...militaresEstrelasData];
    lista.sort((a, b) => (b.estrelas || 0) - (a.estrelas || 0) || (b.promocoes_realizadas || 0) - (a.promocoes_realizadas || 0));
    
    lista.forEach(dados => {
        let cargo = window.cargosMap[dados.nome] || '';
        let cargoHtml = cargo ? `<span style="color:var(--text-sub); font-size:11px; text-transform:uppercase; letter-spacing:1px; display:block; margin-top:2px;">${cargo}</span>` : '';
        let str = '★'.repeat(dados.estrelas || 0);
        let eHtml = `<span style="color:var(--sup-neon); font-size:14px; letter-spacing:2px; filter: drop-shadow(0 0 5px var(--sup-glow));">${str}</span> <span style="font-weight:bold; color:#fff; margin-left:5px;">(${dados.estrelas || 0})</span>`;
        let sHtml = dados.status === 'Suspenso' ? '<span style="color:#ff2a2a; font-weight:bold; background:rgba(255,42,42,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">SUSPENSO</span>' : '<span style="color:#4caf50; background:rgba(76,175,80,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">ATIVO</span>';
        let avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${dados.nome}&action=std&direction=2&head_direction=2&gesture=sml&size=m&time=${new Date().getTime()}`;
        let premiosHtml = dados.premios_acumulados > 0 ? `<span title="${dados.premios_acumulados} Prêmio(s)">🎖️ x${dados.premios_acumulados}</span>` : '';
        
        let tr = document.createElement('tr');
        tr.innerHTML = `<td><div style="display:flex; align-items:center; gap:12px;"><img src="${avatarUrl}" style="width:45px; height:45px; border-radius:50%; background:rgba(0,0,0,0.8); border:2px solid var(--sup-neon); box-shadow:0 0 10px var(--sup-neon); object-fit:cover; object-position:center top;"><div><div style="font-weight:bold; color:#fff; font-size:15px;">${dados.nome} ${premiosHtml}</div>${cargoHtml}</div></div></td><td style="text-align:center; font-weight:bold; font-size:16px;">${dados.promocoes_realizadas || 0} <span style="color:#555; font-size:12px;">/ 3</span></td><td>${eHtml}</td><td style="text-align:center;">${sHtml}</td>`;
        tbody.appendChild(tr);
    });
}

window.registrarLogEstrela = function(bene, acao, idProm, detalhes, dataRef = null) {
    let docData = {
        timestamp: new Date().getTime(),
        data_hora: new Date().toLocaleString('pt-BR'),
        autor: window.usuarioLogadoNick,
        beneficiado: bene,
        acao: acao,
        id_promocao: idProm || '-',
        detalhes: detalhes
    };
    if (dataRef) docData.data_referencia = dataRef;
    window.db.collection("logs_estrelas").add(docData);
}

// TRAVA ANTI-DUPLICIDADE
window.buscarPromocoesLote = async function() {
    let dateVal = document.getElementById('lote-data').value;
    if (!dateVal) return window.mostrarToast("Selecione uma data para a validação.", "error");
    let [y, m, d] = dateVal.split('-');
    let dataBr = `${d}/${m}/${y}`;
    
    let logCheckSnap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
    let validated = false;
    logCheckSnap.forEach(doc => { if (doc.data().acao.includes("Lote")) validated = true; });
    if (validated) return window.customAlert(`O ciclo do dia ${dataBr} já foi validado! Use a aba Correção para alterações.`, "Ciclo Já Validado");

    let docSnap = await window.db.collection("sistema").doc("promocoes").get();
    if (!docSnap.exists) return window.customAlert("Dados não sincronizados.", "Erro");

    let promocoes = JSON.parse(docSnap.data().dados);
    let excluidosArr = document.getElementById('lote-excluidos').value.split(',').map(s => s.trim()).filter(s => s !== "");
    let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));

    if (filtradas.length === 0) return window.customAlert(`Nada encontrado para ${dataBr}.`, "Busca Vazia");

    let promotorData = {};
    let idsColetados = [];
    filtradas.forEach(p => {
        if (!promotorData[p.promotor]) promotorData[p.promotor] = [];
        promotorData[p.promotor].push(p.id);
        idsColetados.push(p.id);
    });

    let html = `<div style="background:rgba(76,175,80,0.1); padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #4caf50;">${filtradas.length} promoções válidas encontradas.</div><ul style="list-style:none; padding:0;">`;
    let contagem = {};
    for (let nick in promotorData) {
        let ids = promotorData[nick];
        contagem[nick] = ids.length;
        html += `<li style="margin-bottom:10px; background:rgba(0,0,0,0.2); padding:8px; border-radius:5px;"><strong style="color:var(--sup-neon);">${nick}</strong> efetuou ${ids.length} promoção(ões).</li>`;
    }
    html += `</ul><button class="btn-tech btn-save" style="width:100%;" onclick='window.confirmarLote(${JSON.stringify(contagem)}, ${JSON.stringify(idsColetados)}, "${dataBr}")'>Atribuir Ciclos</button>`;
    
    document.getElementById('resultado-lote').innerHTML = html;
    document.getElementById('resultado-lote').style.display = 'block';
}

window.confirmarLote = async function(contagem, idsColetados, dataBr) {
    let idLoteStr = idsColetados.join(', ').substring(0, 50);
    for (let nick in contagem) {
        let qtd = contagem[nick];
        let officialNick = Object.keys(window.cargosMap).find(k => k.toLowerCase() === nick.toLowerCase()) || nick;
        let ref = window.db.collection("militares").doc(officialNick);
        let docM = await ref.get();
        let p = 0; let e = 0; let pr = 0; let status = 'Ativo';
        if (docM.exists) {
            let d = docM.data(); if (d.status === 'Suspenso') continue;
            p = d.promocoes_realizadas || 0; e = d.estrelas || 0; pr = d.premios_acumulados || 0; status = d.status;
        }
        let estrelasAntes = e; p += qtd; e += Math.floor(p / 3); p = p % 3;
        if (Math.floor(estrelasAntes / 10) < Math.floor(e / 10)) window.customAlert(`🏅 ${officialNick} atingiu ${e} estrelas!`, "Pagamento!");
        await ref.set({ nome: officialNick, status, promocoes_realizadas: p, estrelas: e, premios_acumulados: pr }, { merge: true });
        window.registrarLogEstrela(officialNick, "Validação em Lote", idLoteStr, `Validou ${qtd} promo.`, dataBr);
    }
    window.mostrarToast("Lote processado!", "success");
    document.getElementById('resultado-lote').style.display = 'none';
}

// ÁREA DE CORREÇÃO (DASHBOARD)
window.buscarCorrecaoLote = async function() {
    let dateVal = document.getElementById('correcao-data').value;
    if (!dateVal) return window.mostrarToast("Selecione uma data.", "error");
    let [y, m, d] = dateVal.split('-');
    let dataBr = `${d}/${m}/${y}`;
    
    let oldLogsSnap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
    let hasLog = false;
    oldLogsSnap.forEach(doc => { if (doc.data().acao.includes("Lote")) hasLog = true; });
    if (!hasLog) return window.customAlert(`Sem registros para ${dataBr}.`, "Erro");

    let docSnap = await window.db.collection("sistema").doc("promocoes").get();
    let promocoes = JSON.parse(docSnap.data().dados);
    let excluidosArr = document.getElementById('correcao-excluidos').value.split(',').map(s => s.trim()).filter(s => s !== "");
    let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));

    let promotorData = {};
    let idsColetados = [];
    filtradas.forEach(p => {
        if (!promotorData[p.promotor]) promotorData[p.promotor] = [];
        promotorData[p.promotor].push(p.id);
        idsColetados.push(p.id);
    });

    let html = `<div style="background:rgba(245,158,11,0.1); padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #f59e0b;">O sistema reverterá o ciclo de ${dataBr} e aplicará este novo.</div><ul style="list-style:none; padding:0;">`;
    let contagem = {};
    for (let nick in promotorData) {
        contagem[nick] = promotorData[nick].length;
        html += `<li style="margin-bottom:5px;"><strong style="color:var(--admin-neon);">${nick}</strong> ficará com ${contagem[nick]} promo.</li>`;
    }
    html += `</ul><div style="display:flex; gap:10px;"><button class="btn-tech" style="flex:1; background:#f59e0b; color:#000;" onclick='window.confirmarCorrecaoLote(${JSON.stringify(contagem)}, ${JSON.stringify(idsColetados)}, "${dataBr}")'>Substituir</button><button class="btn-tech" style="flex:1; background:#ff2a2a; color:#fff;" onclick='window.reverterCicloTotal("${dataBr}")'>Apagar Tudo</button></div>`;
    
    document.getElementById('resultado-correcao').innerHTML = html;
    document.getElementById('resultado-correcao').style.display = 'block';
}

window.confirmarCorrecaoLote = async function(contagem, idsColetados, dataBr) {
    await window.reverterCicloTotal(dataBr, true);
    await window.confirmarLote(contagem, idsColetados, dataBr);
    window.mostrarToast("Correção aplicada!", "success");
    document.getElementById('modal-correcao-lote').style.display = 'none';
}

window.reverterCicloTotal = async function(dataBr, silencioso = false) {
    if (!silencioso && !confirm(`Deseja APAGAR a validação de ${dataBr}?`)) return;
    let snap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
    for (let logDoc of snap.docs) {
        let log = logDoc.data();
        let matchProm = log.detalhes.match(/Validou (\d+)/);
        let promoRevert = matchProm ? parseInt(matchProm[1]) : 0;
        if (promoRevert > 0) {
            let ref = window.db.collection("militares").doc(log.beneficiado);
            let dM = await ref.get();
            if (dM.exists) {
                let p = dM.data().promocoes_realizadas || 0; let e = dM.data().estrelas || 0;
                p -= promoRevert;
                while (p < 0) { p += 3; e -= 1; }
                if (e < 0) e = 0;
                await ref.set({ promocoes_realizadas: p, estrelas: e }, { merge: true });
            }
        }
        await window.db.collection("logs_estrelas").doc(logDoc.id).delete();
    }
    if (!silencioso) {
        window.mostrarToast("Ciclo apagado!", "success");
        document.getElementById('modal-correcao-lote').style.display = 'none';
    }
}

window.escutarLogsEstrelas = function() {
    window.db.collection("logs_estrelas").orderBy("timestamp", "desc").limit(50).onSnapshot(snap => {
        let tbody = document.querySelector('#tb-logs tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        snap.forEach(doc => {
            let d = doc.data();
            let cor = d.acao.includes("Validação") || d.acao.includes("Promoção") ? "color:#4caf50;" : "color:#ff2a2a;";
            if (d.acao.includes("Correção")) cor = "color:#f59e0b;";
            tbody.innerHTML += `<tr><td style="font-size:12px;">${d.data_hora}</td><td><strong>${d.autor}</strong></td><td>${d.beneficiado}</td><td style="${cor} font-weight:bold;">${d.acao}</td><td style="font-size:13px; color:var(--text-sub);">ID/Lote: ${d.id_promocao} <br> ${d.detalhes}</td></tr>`;
        });
    });
}