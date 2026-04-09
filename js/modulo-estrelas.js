let militaresEstrelasData = [];

// NOVO: Gerenciador de Tela de Carregamento (Loader)
window.mostrarLoader = function(mostrar, texto = "Processando...") {
    let loader = document.getElementById('hub-global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'hub-global-loader';
        loader.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter: blur(4px);';
        loader.innerHTML = `
            <i class="fas fa-circle-notch fa-spin" style="font-size:50px; color:var(--sup-neon); margin-bottom:20px; filter: drop-shadow(0 0 10px var(--sup-neon));"></i>
            <h2 id="hub-loader-texto" style="color:#fff; font-family:Rajdhani, sans-serif; font-weight:600; letter-spacing:1px; margin:0;"></h2>
        `;
        document.body.appendChild(loader);
    }
    
    if (mostrar) {
        document.getElementById('hub-loader-texto').innerText = texto;
        loader.style.display = 'flex';
    } else {
        loader.style.display = 'none';
    }
}

window.verificarPermissaoCorrecao = async function() {
    try {
        let user = window.firebase.auth().currentUser;
        if (!user) return; 
        
        let nivel = "NENHUM";
        
        let docAcesso = await window.db.collection("acessos").doc(user.email).get();
        if (docAcesso.exists) {
            nivel = docAcesso.data().nivel;
        } else {
            let docPlan = await window.db.collection("sistema").doc("acessos_planilha").get();
            if (docPlan.exists && docPlan.data().permissoes_regras && docPlan.data().permissoes_regras[user.email]) {
                nivel = docPlan.data().permissoes_regras[user.email].nivel;
            }
        }
        
        // Exibe botões restritos
        const cargosAutorizados = ["VICE-LIDER", "LIDER", "ADMIN"];
        let btnCorrecao = document.getElementById('btn-dashboard-correcao');
        if (btnCorrecao && cargosAutorizados.includes(nivel)) {
            btnCorrecao.style.display = 'inline-block';
        }

        // Permissão para o Botão Limpar Rank
        const cargosSubPlus = ["SUB-LIDER", "VICE-LIDER", "LIDER", "ADMIN"];
        let btnLimpar = document.getElementById('btn-limpar-rank');
        if (btnLimpar && cargosSubPlus.includes(nivel)) {
            btnLimpar.style.display = 'inline-block';
        }

    } catch (e) {
        console.error("Erro ao verificar permissões:", e);
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

// A AUTOMAÇÃO DE DEMITIDOS FOI REMOVIDA DAQUI PERMANENTEMENTE

window.escutarMilitaresEstrelas = function() {
    window.verificarPermissaoCorrecao();

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
        let cargo = window.cargosMap && window.cargosMap[dados.nome] ? window.cargosMap[dados.nome] : '';
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
        autor: window.usuarioLogadoNick || "Oficial",
        beneficiado: bene,
        acao: acao,
        id_promocao: idProm || '-',
        detalhes: detalhes
    };
    if (dataRef) docData.data_referencia = dataRef;
    window.db.collection("logs_estrelas").add(docData);
}

// ==========================================
// NOVO: REMOÇÃO MANUAL DE DEMITIDOS DO RANK
// ==========================================
window.abrirModalLimparRank = async function() {
    let user = window.firebase.auth().currentUser;
    if (!user) return window.mostrarToast("Sessão expirada.", "error");

    let docAcesso = await window.db.collection("acessos").doc(user.email).get();
    let nivel = docAcesso.exists ? docAcesso.data().nivel : '';
    if (nivel === 'VICELIDER') nivel = 'VICE-LIDER';
    if (nivel === 'SUBLIDER') nivel = 'SUB-LIDER';

    if (!["COMANDO", "LIDER", "VICE-LIDER", "SUB-LIDER", "ADMIN"].includes(nivel)) {
        return window.customAlert("Acesso negado! Apenas Sub-Líderes ou superiores podem remover militares demitidos do rank.", "Sem Permissão");
    }

    let modal = document.getElementById('modal-limpar-rank-central');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-limpar-rank-central';
        modal.style.cssText = 'display:flex; position:fixed; z-index:999999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.85); backdrop-filter:blur(8px); align-items:center; justify-content:center; padding:20px;';
        document.body.appendChild(modal);
    }

    let options = '<option value="" disabled selected>Selecione um policial...</option>';
    let ordenados = [...militaresEstrelasData].sort((a,b) => a.nome.localeCompare(b.nome));
    ordenados.forEach(m => {
        options += `<option value="${m.id}">${m.nome}</option>`;
    });

    modal.innerHTML = `
        <div style="background-color:#121008; border:1px solid #ff9800; border-radius:12px; width:100%; max-width:500px; position:relative; box-shadow:0 0 40px rgba(255,152,0,0.3); padding:35px; font-family:'Rajdhani', sans-serif;">
            <div style="position:absolute; right:20px; top:20px; width:35px; height:35px; background:rgba(255,152,0,0.1); border-radius:50%; color:#ff9800; font-size:18px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.3s;" onmouseover="this.style.background='#ff9800'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,152,0,0.1)'; this.style.color='#ff9800';" onclick="document.getElementById('modal-limpar-rank-central').style.display='none'">
                <i class="fas fa-times"></i>
            </div>
            <h3 style="color:#ff9800; margin-bottom:20px; font-size:22px; text-transform:uppercase;"><i class="fas fa-user-slash"></i> Remover do Rank</h3>
            <p style="color:var(--text-sub, #c9b98b); margin-bottom:20px; font-size:15px;">Selecione o policial demitido para apagá-lo permanentemente do ranking.</p>
            
            <div style="position:relative; width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(255,152,0,0.3); border-radius:6px; display:flex; align-items:center; padding:0 15px; margin-bottom:20px;">
                <i class="fas fa-search" style="color:#ff9800; font-size:16px;"></i>
                <select id="select-remover-central" style="width:100%; background:transparent; border:none; color:#fff; font-size:15px; font-family:'Rajdhani', sans-serif; font-weight:500; padding:15px 10px; outline:none; color-scheme:dark;">
                    ${options}
                </select>
            </div>

            <button onclick="window.confirmarRemocaoRankCentral()" style="background:#ff9800; color:#fff; border:none; padding:15px; border-radius:6px; font-family:'Rajdhani', sans-serif; font-size:15px; font-weight:600; cursor:pointer; text-transform:uppercase; width:100%; display:flex; align-items:center; justify-content:center; gap:8px; transition:0.3s;">
                <i class="fas fa-trash-alt"></i> Apagar Permanentemente
            </button>
        </div>
    `;
    modal.style.display = 'flex';
}

window.confirmarRemocaoRankCentral = function() {
    let id = document.getElementById('select-remover-central').value;
    if (!id) return window.mostrarToast("Selecione um policial primeiro.", "error");
    
    let m = militaresEstrelasData.find(x => x.id === id);
    if (!m) return;

    if (confirm(`ATENÇÃO! Isso vai apagar TODOS os dados e estrelas de ${m.nome} permanentemente.\n\nTem certeza que este policial foi demitido?`)) {
        window.mostrarLoader(true, "Apagando policial do sistema...");
        window.db.collection("militares").doc(id).delete().then(() => {
            window.registrarLogEstrela(m.nome, "Remoção do Rank", "-", "Militar demitido foi removido permanentemente do banco de dados (Ação Manual).");
            window.mostrarToast(`${m.nome} foi removido do rank com sucesso.`, "success");
            if(window.registrarLogAtividade) window.registrarLogAtividade("Limpeza de Rank", `Removeu permanentemente o(a) ex-militar ${m.nome} do banco de estrelas.`);
            document.getElementById('modal-limpar-rank-central').style.display = 'none';
        }).catch(e => {
            console.error(e);
            window.mostrarToast("Erro ao remover.", "error");
        }).finally(() => {
            window.mostrarLoader(false);
        });
    }
}
// ==========================================


window.buscarPromocoesLote = async function() {
    let dateVal = document.getElementById('lote-data').value;
    if (!dateVal) return window.mostrarToast("Selecione uma data para a validação.", "error");
    
    window.mostrarLoader(true, "Analisando sistema. Aguarde...");

    try {
        let [y, m, d] = dateVal.split('-');
        let dataBr = `${d}/${m}/${y}`;
        
        let logCheckSnap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
        let isAlreadyValidated = false;
        logCheckSnap.forEach(doc => {
            if (doc.data().acao === "Validação em Lote" || doc.data().acao === "Correção de Lote") isAlreadyValidated = true;
        });
        
        if (isAlreadyValidated) {
            window.mostrarLoader(false);
            return window.customAlert(`O ciclo do dia ${dataBr} já foi validado! Para evitar quebra do ranking ou duplicidade de estrelas, não é possível validá-lo novamente.<br><br>Se houve um erro e você precisa alterar ou apagar, utilize a aba de <b>Correção</b>.`, "Ciclo Já Validado");
        }
        
        let excluidosStr = document.getElementById('lote-excluidos').value;
        let excluidosArr = excluidosStr.split(',').map(s => s.trim()).filter(s => s !== "");

        let docSnap = await window.db.collection("sistema").doc("promocoes").get();
        if (!docSnap.exists) {
            window.mostrarLoader(false);
            return window.customAlert("A planilha oficial ainda não enviou os dados de promoções para o sistema.", "Erro de Sincronização");
        }

        let promocoes = [];
        try {
            promocoes = JSON.parse(docSnap.data().dados);
        } catch (e) {
            window.mostrarLoader(false);
            return window.mostrarToast("Erro ao processar dados.", "error");
        }

        let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));
        if (filtradas.length === 0) {
            window.mostrarLoader(false);
            return window.customAlert(`Nenhuma promoção válida encontrada para a data ${dataBr}.`, "Busca Vazia");
        }

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

    } catch (error) {
        console.error(error);
        window.mostrarToast("Ocorreu um erro ao buscar as promoções.", "error");
    } finally {
        window.mostrarLoader(false);
    }
}

window.confirmarLote = async function(contagem, idsColetados, dataBr, skipLoader = false) {
    if (!skipLoader) window.mostrarLoader(true, "Atribuindo estrelas e registrando logs...");

    try {
        let idLoteStr = idsColetados.join(', ');

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
        if(window.registrarLogAtividade) window.registrarLogAtividade("Validação de Lote", `Processou e validou as promoções dos IDs: ${idLoteStr}`);
        document.getElementById('resultado-lote').style.display = 'none';
        document.getElementById('lote-data').value = '';
        document.getElementById('lote-excluidos').value = '';
    } catch (error) {
        console.error(error);
        window.mostrarToast("Erro ao salvar lote.", "error");
    } finally {
        if (!skipLoader) window.mostrarLoader(false);
    }
}

window.buscarCorrecaoLote = async function() {
    let dateVal = document.getElementById('correcao-data').value;
    if (!dateVal) return window.mostrarToast("Selecione a data que deseja corrigir.", "error");
    
    window.mostrarLoader(true, "Preparando matemática do ciclo. Aguarde...");

    try {
        let [y, m, d] = dateVal.split('-');
        let dataBr = `${d}/${m}/${y}`;
        
        let oldLogsSnap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
        let hasLog = false;
        oldLogsSnap.forEach(doc => {
            if (doc.data().acao === "Validação em Lote" || doc.data().acao === "Correção de Lote") hasLog = true;
        });

        if (!hasLog) {
            window.mostrarLoader(false);
            return window.customAlert(`O sistema não encontrou nenhum lote validado ou corrigido para o dia ${dataBr}. Não há o que reverter.`, "Sem Registros");
        }

        let excluidosStr = document.getElementById('correcao-excluidos').value;
        let excluidosArr = excluidosStr.split(',').map(s => s.trim()).filter(s => s !== "");

        let docSnap = await window.db.collection("sistema").doc("promocoes").get();
        if (!docSnap.exists) {
            window.mostrarLoader(false);
            return window.customAlert("A planilha oficial ainda não enviou os dados de promoções para o sistema.", "Erro");
        }

        let promocoes = [];
        try { promocoes = JSON.parse(docSnap.data().dados); } catch (e) { 
            window.mostrarLoader(false);
            return window.mostrarToast("Erro ao processar dados.", "error"); 
        }

        let filtradas = promocoes.filter(p => p.data === dataBr && !excluidosArr.includes(p.id));
        if (filtradas.length === 0) {
            window.mostrarLoader(false);
            return window.customAlert(`Nenhuma promoção restante na data ${dataBr} após as exclusões.`, "Aviso");
        }

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
        
        html += `</ul>
        <div style="display:flex; gap:10px; margin-top:10px;">
            <button class="btn-tech btn-save" style="flex:1; background:#f59e0b; color:#000;" onclick='window.confirmarCorrecaoLote(${JSON.stringify(contagemParaConfirmacao)}, ${JSON.stringify(idsColetados)}, "${dataBr}")'><i class="fas fa-tools"></i> Substituir Ciclo</button>
            <button class="btn-tech" style="flex:1; background:#ff2a2a; color:#fff; border:1px solid #ff2a2a;" onclick='window.reverterCicloTotal("${dataBr}")'><i class="fas fa-trash-alt"></i> Apagar Ciclo Original</button>
        </div>`;

        document.getElementById('resultado-correcao').innerHTML = html;
        document.getElementById('resultado-correcao').style.display = 'block';
    } catch (error) {
        console.error(error);
        window.mostrarToast("Erro ao preparar correção.", "error");
    } finally {
        window.mostrarLoader(false);
    }
}

window.confirmarCorrecaoLote = async function(contagem, idsColetados, dataBr) {
    window.mostrarLoader(true, "Substituindo ciclo no banco de dados...");
    try {
        await window.reverterCicloTotal(dataBr, true, true);
        await window.confirmarLote(contagem, idsColetados, dataBr, true);
        window.mostrarToast("Correção aplicada com sucesso!", "success");
        document.getElementById('modal-correcao-lote').style.display = 'none';
    } catch (error) {
        console.error(error);
        window.mostrarToast("Erro ao substituir ciclo.", "error");
    } finally {
        window.mostrarLoader(false);
    }
}

window.reverterCicloTotal = async function(dataBr, silencioso = false, skipLoader = false) {
    if (!silencioso && !confirm(`ATENÇÃO LÍDER: Você está prestes a APAGAR completamente a validação do dia ${dataBr} e remover as estrelas/promoções ganhas por todos os policiais neste dia.\n\nDeseja realmente continuar?`)) return;
    
    if (!skipLoader) window.mostrarLoader(true, "Estornando ciclo do banco de dados...");

    try {
        let snap = await window.db.collection("logs_estrelas").where("data_referencia", "==", dataBr).get();
        let oldLogs = [];
        snap.forEach(doc => {
            if (doc.data().acao === "Validação em Lote" || doc.data().acao === "Correção de Lote") {
                oldLogs.push({id: doc.id, ...doc.data()});
            }
        });

        for (let log of oldLogs) {
            let matchProm = log.detalhes.match(/Validou (\d+)/);
            let promoRevert = matchProm ? parseInt(matchProm[1]) : 0;
            
            if (promoRevert > 0) {
                let ref = window.db.collection("militares").doc(log.beneficiado);
                let dM = await ref.get();
                if (dM.exists) {
                    let p = dM.data().promocoes_realizadas || 0; let e = dM.data().estrelas || 0;
                    
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

        if (!silencioso) {
            window.mostrarToast("Ciclo revertido e apagado com sucesso!", "success");
            if(window.registrarLogAtividade) window.registrarLogAtividade("Reversão de Ciclo", `Apagou totalmente o ciclo do dia ${dataBr} do sistema.`);
            document.getElementById('resultado-correcao').style.display = 'none';
            document.getElementById('correcao-data').value = '';
            document.getElementById('correcao-excluidos').value = '';
            if (document.getElementById('modal-correcao-lote')) document.getElementById('modal-correcao-lote').style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        window.mostrarToast("Erro ao apagar ciclo.", "error");
    } finally {
        if (!skipLoader) window.mostrarLoader(false);
    }
}

window.escutarLogsEstrelas = function() {
    window.db.collection("logs_estrelas").orderBy("timestamp", "desc").onSnapshot(snap => {
        let tbody = document.querySelector('#tb-logs tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        snap.forEach(doc => {
            let d = doc.data();
            let cor = d.acao.includes("Validação") || d.acao.includes("Promoção") ? "color:#4caf50;" : "color:#ff2a2a;";
            if (d.acao.includes("Correção")) cor = "color:#f59e0b;";
            if (d.acao.includes("Pagamento")) cor = "color:#fbbf24;";
            
            let refHtml = d.data_referencia ? `<br><span style="color:var(--sup-neon); font-size:11px; font-weight:bold;"><i class="fas fa-calendar-check"></i> Ref: ${d.data_referencia}</span>` : '';
            
            tbody.innerHTML += `<tr><td style="font-size:12px;">${d.data_hora}</td><td><strong>${d.autor}</strong></td><td>${d.beneficiado}</td><td style="${cor} font-weight:bold;">${d.acao}</td><td style="font-size:13px; color:var(--text-sub);">IDs: ${d.id_promocao} ${refHtml} <br> ${d.detalhes}</td></tr>`;
        });
    });
}