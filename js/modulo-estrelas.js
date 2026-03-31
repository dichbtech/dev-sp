let militaresEstrelasData = [];
window.listenerDemitidosAtivo = false;

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

// O SITE ATUA E DEPOIS ESVAZIA A LIXEIRA
window.escutarDemitidos = function() {
    if (window.listenerDemitidosAtivo) return;
    window.listenerDemitidosAtivo = true;

    window.db.collection("sistema").doc("demitidos").onSnapshot(async (doc) => {
        if (doc.exists && doc.data().lista) {
            try {
                let demitidos = JSON.parse(doc.data().lista);
                // Se a lista já estiver vazia, não faz nada
                if (!Array.isArray(demitidos) || demitidos.length === 0) return;

                let snap = await window.db.collection("militares").get();
                let promisesDeExclusao = [];

                snap.forEach(militarDoc => {
                    let data = militarDoc.data();
                    let nomeMilitar = data.nome ? data.nome.trim() : militarDoc.id;

                    // Verifica se o militar está na lista de demitidos
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

                // Espera todas as exclusões terminarem e, em seguida, ESVAZIA a lista no Firebase
                await Promise.all(promisesDeExclusao);
                
                window.db.collection("sistema").doc("demitidos").update({
                    lista: "[]" // Limpa o documento para evitar que exclua novamente no futuro
                }).catch(e => console.error("Erro ao esvaziar a lista de demitidos no Firebase:", e));

            } catch (e) {
                console.error("Erro na faxina de demitidos:", e);
            }
        }
    });
}

window.escutarMilitaresEstrelas = function() {
    window.escutarDemitidos(); // Ativa a faxina automática ao abrir o módulo

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
        
        let ts = new Date().getTime();
        let avatarUrl = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${dados.nome}&action=std&direction=2&head_direction=2&gesture=sml&size=m&time=${ts}`;
        
        let premiosHtml = dados.premios_acumulados > 0 ? `<span title="${dados.premios_acumulados} Prêmio(s)">🎖️ x${dados.premios_acumulados}</span>` : '';
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${avatarUrl}" onerror="this.style.display='none'" style="width:45px; height:45px; border-radius:50%; background:rgba(0,0,0,0.8); border:2px solid var(--sup-neon); box-shadow:0 0 10px var(--sup-neon); object-fit:cover; object-position:center top;">
                    <div>
                        <div style="font-weight:bold; color:#fff; font-size:15px;">${dados.nome} ${premiosHtml}</div>
                        ${cargoHtml}
                    </div>
                </div>
            </td>
            <td style="text-align:center; font-weight:bold; font-size:16px;">${dados.promocoes_realizadas || 0} <span style="color:#555; font-size:12px;">/ 3</span></td>
            <td>${eHtml}</td>
            <td style="text-align:center;">${sHtml}</td>
        `;
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

window.buscarPromocoesLote = async function() {
    let dateVal = document.getElementById('lote-data').value;
    if (!dateVal) return window.mostrarToast("Selecione uma data para a validação.", "error");

    let [y, m, d] = dateVal.split('-');
    let dataBr = `${d}/${m}/${y}`;
    
    let excluidosStr = document.getElementById('lote-excluidos').value;
    let excluidosArr = excluidosStr.split(',').map(s => s.trim()).filter(s => s !== "");

    let docSnap = await window.db.collection("sistema").doc("promocoes").get();
    if (!docSnap.exists) return window.customAlert("A planilha oficial ainda não enviou os dados de promoções para o sistema.", "Erro de Sincronização");

    let promocoes = [];
    try {
        promocoes = JSON.parse(docSnap.data().dados);
    } catch (e) {
        return window.mostrarToast("Erro ao processar dados.", "error");
    }

    let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));
    if (filtradas.length === 0) return window.customAlert(`Nenhuma promoção válida encontrada para a data ${dataBr}.`, "Busca Vazia");

    let promotorData = {};
    let idsColetados = [];
    
    filtradas.forEach(p => {
        if (!promotorData[p.promotor]) promotorData[p.promotor] = [];
        promotorData[p.promotor].push(p.id);
        idsColetados.push(p.id);
    });

    let sysLink = `https://dic.systemhb.net/promocao?filtro%5Bdata_inicio%5D=${dateVal}&filtro%5Bdata_termino%5D=${dateVal}&filtro%5Blista%5D=todas`;

    let html = `
    <div style="color:#fff; margin-bottom:15px; font-size:15px; display:flex; flex-direction:column; gap:8px; background: rgba(76,175,80,0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(76,175,80,0.3);">
        <div><i class="fas fa-check-circle" style="color:#4caf50;"></i> ${filtradas.length} promoções válidas localizadas.</div>
        <a href="${sysLink}" target="_blank" style="color:var(--sup-neon); font-size:13px; text-decoration:none;"><i class="fas fa-external-link-alt"></i> Clique aqui para conferir promoções no system.</a>
    </div>
    <ul style="color:var(--text-sub); margin-bottom:15px; list-style: none; padding: 0; display:flex; flex-direction:column; gap:10px;">`;
    
    let contagemParaConfirmacao = {};

    for (let nick in promotorData) {
        let ids = promotorData[nick];
        let qtd = ids.length;
        contagemParaConfirmacao[nick] = qtd;
        
        let txtPromo = qtd === 1 ? "promoção válida" : "promoções válidas";
        let linksIDs = ids.map(id => `<a href="https://dic.systemhb.net/promocao/ver/${id}" target="_blank" style="color:var(--sup-neon); text-decoration:none; font-weight:bold; background:rgba(251,191,36,0.1); padding:3px 8px; border-radius:4px; margin-right:5px; border: 1px solid rgba(251,191,36,0.2); display:inline-block; margin-bottom:5px; transition:0.3s;" onmouseover="this.style.background='var(--sup-neon)'; this.style.color='#000';" onmouseout="this.style.background='rgba(251,191,36,0.1)'; this.style.color='var(--sup-neon)';">#${id}</a>`).join("");
        
        html += `
        <li style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border-left:3px solid var(--sup-neon);">
            <div style="color:#fff; font-size:15px; margin-bottom:8px;">
                <strong style="color:var(--sup-neon); text-transform:uppercase;">${nick}</strong> efetuou ${qtd} ${txtPromo}.
            </div>
            <div style="font-size:12px; display:flex; flex-wrap:wrap; align-items:center;">
                <span style="margin-right:10px;">IDs:</span> ${linksIDs}
            </div>
        </li>`;
    }
    
    html += `</ul><button class="btn-tech btn-save" style="width:100%; margin-top:10px;" onclick='window.confirmarLote(${JSON.stringify(contagemParaConfirmacao)}, ${JSON.stringify(idsColetados)}, "${dataBr}")'><i class="fas fa-check-double"></i> Atribuir Ciclos Oficiais</button>`;

    document.getElementById('resultado-lote').innerHTML = html;
    document.getElementById('resultado-lote').style.display = 'block';
}

window.confirmarLote = async function(contagem, idsColetados, dataBr) {
    let idLoteStr = idsColetados.join(', ');
    if (idLoteStr.length > 50) idLoteStr = idLoteStr.substring(0, 47) + "...";

    for (let nick in contagem) {
        let qtd = contagem[nick];
        let officialNick = Object.keys(window.cargosMap).find(k => k.toLowerCase() === nick.toLowerCase());
        let dbNick = officialNick || nick;

        let ref = window.db.collection("militares").doc(dbNick);
        let docM = await ref.get();
        
        let p = 0; let e = 0; let pr = 0; let status = 'Ativo';
        
        if (docM.exists) {
            let dados = docM.data();
            if (dados.status === 'Suspenso') continue;
            p = dados.promocoes_realizadas || 0;
            e = dados.estrelas || 0;
            pr = dados.premios_acumulados || 0;
            status = dados.status;
        }

        let estrelasAntes = e;
        p += qtd;
        let estrelasGanhas = Math.floor(p / 3);
        p = p % 3;
        e += estrelasGanhas;

        let detailLog = `Validou ${qtd} promoção(ões). `;
        if (estrelasGanhas > 0) detailLog += `Conquistou ${estrelasGanhas} estrela(s)! `;

        let atingiuPremio = Math.floor(estrelasAntes / 10) < Math.floor(e / 10);
        if (atingiuPremio) {
            window.customAlert(`🏅 O policial ${dbNick} acaba de atingir ${e} estrelas no sistema!<br><br>Avise o Comando para realizar o pagamento oficial destas 10 estrelas.`, "Aguardando Pagamento!");
            detailLog += " Atingiu cota para prêmio. (Aguardando Comando)";
        }

        await ref.set({ nome: dbNick, status: status, promocoes_realizadas: p, estrelas: e, premios_acumulados: pr }, { merge: true });
        window.registrarLogEstrela(dbNick, "Validação em Lote", idLoteStr, detailLog, dataBr);
    }

    window.mostrarToast("Lote processado com sucesso!", "success");
    window.registrarLogAtividade("Validação de Lote", `Processou e validou as promoções dos IDs: ${idLoteStr}`);
    document.getElementById('resultado-lote').style.display = 'none';
    document.getElementById('lote-data').value = '';
    document.getElementById('lote-excluidos').value = '';
}

window.buscarCorrecaoLote = async function() {
    let dateVal = document.getElementById('correcao-data').value;
    if (!dateVal) return window.mostrarToast("Selecione a data que deseja corrigir.", "error");

    let [y, m, d] = dateVal.split('-');
    let dataBr = `${d}/${m}/${y}`;
    
    let oldLogsSnap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
    let hasLog = false;
    oldLogsSnap.forEach(doc => {
        if (doc.data().acao === "Validação em Lote" || doc.data().acao === "Correção de Lote") hasLog = true;
    });

    if (!hasLog) {
        return window.customAlert(`O sistema não encontrou nenhum lote validado ou corrigido para o dia ${dataBr}. Não há o que reverter.`, "Sem Registros");
    }

    let excluidosStr = document.getElementById('correcao-excluidos').value;
    let excluidosArr = excluidosStr.split(',').map(s => s.trim()).filter(s => s !== "");

    let docSnap = await window.db.collection("sistema").doc("promocoes").get();
    if (!docSnap.exists) return window.customAlert("A planilha oficial ainda não enviou os dados de promoções para o sistema.", "Erro");

    let promocoes = [];
    try { promocoes = JSON.parse(docSnap.data().dados); } catch (e) { return window.mostrarToast("Erro ao processar dados.", "error"); }

    let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));
    if (filtradas.length === 0) return window.customAlert(`Nenhuma promoção restante na data ${dataBr} após as exclusões.`, "Aviso");

    let promotorData = {};
    let idsColetados = [];
    
    filtradas.forEach(p => {
        if (!promotorData[p.promotor]) promotorData[p.promotor] = [];
        promotorData[p.promotor].push(p.id);
        idsColetados.push(p.id);
    });

    let html = `
    <div style="color:#fff; margin-bottom:15px; font-size:15px; display:flex; flex-direction:column; gap:8px; background: rgba(245,158,11,0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(245,158,11,0.3);">
        <div><i class="fas fa-exclamation-triangle" style="color:#f59e0b;"></i> O sistema apagará a matemática do ciclo anterior do dia ${dataBr} e implementará este novo com ${filtradas.length} promoções.</div>
    </div>
    <ul style="color:var(--text-sub); margin-bottom:15px; list-style: none; padding: 0; display:flex; flex-direction:column; gap:10px;">`;
    
    let contagemParaConfirmacao = {};

    for (let nick in promotorData) {
        let ids = promotorData[nick];
        let qtd = ids.length;
        contagemParaConfirmacao[nick] = qtd;
        
        let txtPromo = qtd === 1 ? "promoção válida" : "promoções válidas";
        let linksIDs = ids.map(id => `<a href="https://dic.systemhb.net/promocao/ver/${id}" target="_blank" style="color:var(--sup-neon); text-decoration:none; font-weight:bold; background:rgba(251,191,36,0.1); padding:3px 8px; border-radius:4px; margin-right:5px; border: 1px solid rgba(251,191,36,0.2); display:inline-block; margin-bottom:5px; transition:0.3s;" onmouseover="this.style.background='var(--sup-neon)'; this.style.color='#000';" onmouseout="this.style.background='rgba(251,191,36,0.1)'; this.style.color='var(--sup-neon)';">#${id}</a>`).join("");
        
        html += `
        <li style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border-left:3px solid var(--admin-neon);">
            <div style="color:#fff; font-size:15px; margin-bottom:8px;">
                <strong style="color:var(--admin-neon); text-transform:uppercase;">${nick}</strong> ficará com ${qtd} ${txtPromo}.
            </div>
            <div style="font-size:12px; display:flex; flex-wrap:wrap; align-items:center;">
                <span style="margin-right:10px;">IDs:</span> ${linksIDs}
            </div>
        </li>`;
    }
    
    html += `</ul><button class="btn-tech btn-save" style="width:100%; margin-top:10px; background:#f59e0b; color:#000;" onclick='window.confirmarCorrecaoLote(${JSON.stringify(contagemParaConfirmacao)}, ${JSON.stringify(idsColetados)}, "${dataBr}")'><i class="fas fa-tools"></i> Executar Substituição de Ciclo</button>`;

    document.getElementById('resultado-correcao').innerHTML = html;
    document.getElementById('resultado-correcao').style.display = 'block';
}

window.confirmarCorrecaoLote = async function(contagem, idsColetados, dataBr) {
    let idLoteStr = idsColetados.join(', ');
    if (idLoteStr.length > 50) idLoteStr = idLoteStr.substring(0, 47) + "...";

    let oldLogsSnap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
    let oldLogs = [];
    oldLogsSnap.forEach(doc => {
        if (doc.data().acao === "Validação em Lote" || doc.data().acao === "Correção de Lote") {
            oldLogs.push({id: doc.id, ...doc.data()});
        }
    });

    for (let log of oldLogs) {
        let matchProm = log.detalhes.match(/Validou (\d+)/);
        let promoRevert = matchProm ? parseInt(matchProm[1]) : 0;
        
        if (promoRevert > 0) {
            let ref = window.db.collection("militares").doc(log.beneficiado);
            let docM = await ref.get();
            if (docM.exists) {
                let mData = docM.data();
                let p = mData.promocoes_realizadas || 0;
                let e = mData.estrelas || 0;
                
                p -= promoRevert;
                while (p < 0) {
                    p += 3;
                    e -= 1;
                }
                if (e < 0) e = 0; 
                
                await ref.set({ promocoes_realizadas: p, estrelas: e }, { merge: true });
            }
        }
        await window.db.collection("logs_estrelas").doc(log.id).delete();
    }

    for (let nick in contagem) {
        let qtd = contagem[nick];
        let officialNick = Object.keys(window.cargosMap).find(k => k.toLowerCase() === nick.toLowerCase());
        let dbNick = officialNick || nick;

        let ref = window.db.collection("militares").doc(dbNick);
        let docM = await ref.get();
        
        let p = 0; let e = 0; let pr = 0; let status = 'Ativo';
        
        if (docM.exists) {
            let dados = docM.data();
            if (dados.status === 'Suspenso') continue;
            p = dados.promocoes_realizadas || 0;
            e = dados.estrelas || 0;
            pr = dados.premios_acumulados || 0;
            status = dados.status;
        }

        let estrelasAntes = e;
        p += qtd;
        let estrelasGanhas = Math.floor(p / 3);
        p = p % 3;
        e += estrelasGanhas;

        let detailLog = `Validou ${qtd} promoção(ões). `;
        if (estrelasGanhas > 0) detailLog += `Conquistou ${estrelasGanhas} estrela(s)! `;

        let atingiuPremio = Math.floor(estrelasAntes / 10) < Math.floor(e / 10);
        if (atingiuPremio) {
            window.customAlert(`🏅 O policial ${dbNick} acaba de atingir ${e} estrelas após a correção!<br><br>Lembre-se de checar o pagamento pendente.`, "Aguardando Pagamento!");
            detailLog += " Atingiu cota para prêmio. (Aguardando Comando)";
        }

        await ref.set({ nome: dbNick, status: status, promocoes_realizadas: p, estrelas: e, premios_acumulados: pr }, { merge: true });
        window.registrarLogEstrela(dbNick, "Correção de Lote", idLoteStr, detailLog, dataBr);
    }

    window.mostrarToast("Ciclo corrigido com sucesso!", "success");
    window.registrarLogAtividade("Correção de Ciclo", `Reverteu e recalculou o lote do dia ${dataBr} com os novos IDs: ${idLoteStr}`);
    
    document.getElementById('resultado-correcao').style.display = 'none';
    document.getElementById('correcao-data').value = '';
    document.getElementById('correcao-excluidos').value = '';
    document.getElementById('modal-correcao-lote').style.display = 'none';
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
            if (d.acao.includes("Pagamento")) cor = "color:#fbbf24;";
            
            tbody.innerHTML += `<tr><td style="font-size:12px;">${d.data_hora}</td><td><strong>${d.autor}</strong></td><td>${d.beneficiado}</td><td style="${cor} font-weight:bold;">${d.acao}</td><td style="font-size:13px; color:var(--text-sub);">ID/Lote: ${d.id_promocao} <br> ${d.detalhes}</td></tr>`;
        });
    });
}