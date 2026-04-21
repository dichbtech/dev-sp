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
        
        let nivelRaw = "NENHUM";
        
        let docAcesso = await window.db.collection("acessos").doc(user.email).get();
        if (docAcesso.exists) {
            nivelRaw = docAcesso.data().nivel;
        } else {
            let docPlan = await window.db.collection("sistema").doc("acessos_planilha").get();
            if (docPlan.exists && docPlan.data().permissoes_regras && docPlan.data().permissoes_regras[user.email]) {
                nivelRaw = docPlan.data().permissoes_regras[user.email].nivel;
            }
        }
        
        let nivel = nivelRaw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nivel === 'VICELIDER') nivel = 'VICE-LIDER';
        if (nivel === 'SUBLIDER') nivel = 'SUB-LIDER';
        
        window.nivelUsuarioGlobal = nivel; // Guarda para o Hub

        // Oculta para sempre o botão antigo de limpar rank para evitar poluição visual
        let btnLimpar = document.getElementById('btn-limpar-rank');
        if (btnLimpar) btnLimpar.style.display = 'none';

        // O botão tachometer agora se torna o HUB ADMINISTRATIVO GERAL (Sub-Líderes+)
        const cargosHub = ["COMANDO", "LIDER", "VICE-LIDER", "ADMIN", "SUB-LIDER"];
        let btnCorrecao = document.getElementById('btn-dashboard-correcao');
        if (btnCorrecao && cargosHub.includes(nivel)) {
            btnCorrecao.style.display = 'inline-block';
            // Intercepta o clique para abrir o nosso novo Hub em vez do HTML antigo
            btnCorrecao.onclick = () => window.abrirPainelAdminEstrelas();
            btnCorrecao.title = "Painel Administrativo de Estrelas";
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
// NOVO: HUB ADMINISTRATIVO CENTRALIZADO
// ==========================================
window.abrirPainelAdminEstrelas = async function() {
    let nivel = window.nivelUsuarioGlobal;
    if (!["COMANDO", "LIDER", "VICE-LIDER", "SUB-LIDER", "ADMIN"].includes(nivel)) return;

    let modal = document.getElementById('modal-hub-estrelas');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-hub-estrelas';
        modal.style.cssText = 'display:flex; position:fixed; z-index:999990; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.85); backdrop-filter:blur(8px); align-items:center; justify-content:center; padding:20px;';
        document.body.appendChild(modal);
    }

    let options = '<option value="" disabled selected style="background:#121008; color:#fff;">Selecione um policial...</option>';
    let ordenados = [...militaresEstrelasData].sort((a,b) => a.nome.localeCompare(b.nome));
    ordenados.forEach(m => {
        options += `<option value="${m.id}" style="background:#121008; color:#fff;">${m.nome}</option>`;
    });

    let isVicePlus = ["COMANDO", "LIDER", "VICE-LIDER", "ADMIN"].includes(nivel);

    modal.innerHTML = `
        <div style="background-color:#1a1a24; border:1px solid var(--sup-neon); border-radius:12px; width:100%; max-width:550px; max-height:90vh; overflow-y:auto; position:relative; box-shadow:0 0 30px rgba(251,191,36,0.2); padding:25px; font-family:'Rajdhani', sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="color:var(--sup-neon); margin:0; font-size:20px; text-transform:uppercase;"><i class="fas fa-toolbox"></i> Administração de Estrelas</h2>
                <button onclick="document.getElementById('modal-hub-estrelas').style.display='none'" style="background:none; border:none; color:#fff; cursor:pointer; font-size:18px;"><i class="fas fa-times"></i></button>
            </div>

            <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin-bottom:15px;">
                <h4 style="color:#fff; margin:0 0 10px 0; font-size:15px;"><i class="fas fa-exchange-alt" style="color:#3b82f6;"></i> Transferência de Nick</h4>
                <p style="color:var(--text-sub); font-size:12px; margin-bottom:10px;">Transfere ou soma os dados de um nick antigo para um novo.</p>
                <select id="transfer-old" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:10px; border-radius:5px; margin-bottom:10px;">${options}</select>
                <input type="text" id="transfer-new" placeholder="Digite o NOVO Nick Exato" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:10px; border-radius:5px; margin-bottom:10px; box-sizing:border-box; font-family:'Rajdhani', sans-serif;">
                <button onclick="window.confirmarTransferencia()" style="width:100%; background:#3b82f6; color:#fff; border:none; padding:10px; border-radius:5px; font-family:'Rajdhani', sans-serif; font-size:14px; font-weight:bold; cursor:pointer; text-transform:uppercase; transition:0.2s;"><i class="fas fa-random"></i> Efetuar Transferência</button>
            </div>

            <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin-bottom:15px;">
                <h4 style="color:#fff; margin:0 0 10px 0; font-size:15px;"><i class="fas fa-user-slash" style="color:#ef4444;"></i> Tirar Demitidos</h4>
                <p style="color:var(--text-sub); font-size:12px; margin-bottom:10px;">Remove permanentemente o policial do ranking e apaga sua carteira.</p>
                <select id="select-remover-central" style="width:100%; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:10px; border-radius:5px; margin-bottom:10px;">${options}</select>
                <button onclick="window.confirmarRemocaoRankCentral()" style="width:100%; background:transparent; color:#ef4444; border:1px solid #ef4444; padding:10px; border-radius:5px; font-family:'Rajdhani', sans-serif; font-size:14px; font-weight:bold; cursor:pointer; text-transform:uppercase; transition:0.2s;"><i class="fas fa-trash-alt"></i> Apagar Policial</button>
            </div>

            ${isVicePlus ? `
            <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                <h4 style="color:#fff; margin:0 0 10px 0; font-size:15px;"><i class="fas fa-tools" style="color:var(--sup-neon);"></i> Correção de Lotes e Ciclos</h4>
                <p style="color:var(--text-sub); font-size:12px; margin-bottom:10px;">Reverta ou substitua validações feitas em datas anteriores.</p>
                <button onclick="document.getElementById('modal-hub-estrelas').style.display='none'; document.getElementById('modal-correcao-lote').style.display='flex';" style="width:100%; background:var(--sup-neon); color:#000; border:none; padding:10px; border-radius:5px; font-family:'Rajdhani', sans-serif; font-size:14px; font-weight:bold; cursor:pointer; text-transform:uppercase; transition:0.2s;"><i class="fas fa-external-link-alt"></i> Abrir Painel de Correção</button>
            </div>
            ` : ''}
        </div>
    `;
    modal.style.display = 'flex';
}

window.confirmarTransferencia = async function() {
    let oldId = document.getElementById('transfer-old').value;
    let newNick = document.getElementById('transfer-new').value.trim();

    if(!oldId || !newNick) {
        return window.mostrarToast ? window.mostrarToast("Preencha os campos.", "error") : alert("Preencha os campos!");
    }
    if(oldId.toLowerCase() === newNick.toLowerCase()) {
        return window.mostrarToast ? window.mostrarToast("Os nicks não podem ser iguais.", "error") : alert("Nicks iguais!");
    }

    let oldM = militaresEstrelasData.find(x => x.id === oldId);
    if(!oldM) return;

    if(confirm(`Tem certeza que deseja transferir todo o saldo de ${oldM.nome} para a conta ${newNick}?\n\nIsso somará os valores se o nick novo já existir, e excluirá o registro antigo.`)) {
        window.mostrarLoader(true, "Migrando dados...");
        try {
            let newRef = window.db.collection("militares").doc(newNick);
            let docNew = await newRef.get();

            let p = oldM.promocoes_realizadas || 0;
            let e = oldM.estrelas || 0;
            let pr = oldM.premios_acumulados || 0;

            if (docNew.exists) {
                let newD = docNew.data();
                p += (newD.promocoes_realizadas || 0);
                e += (newD.estrelas || 0);
                pr += (newD.premios_acumulados || 0);
                
                // Converte as promoções que excederam em estrelas
                let extraEstrelas = Math.floor(p / 3);
                e += extraEstrelas;
                p = p % 3;
            }

            // Grava os dados no Nick Novo
            await newRef.set({
                nome: newNick,
                estrelas: e,
                promocoes_realizadas: p,
                premios_acumulados: pr,
                status: docNew.exists ? docNew.data().status : "Ativo"
            }, {merge: true});

            // Apaga o Nick Antigo
            await window.db.collection("militares").doc(oldM.id).delete();

            window.registrarLogEstrela(newNick, "Transferência de Nick", "-", `Recebeu as promoções e estrelas migradas do antigo nick: ${oldM.nome}.`);
            if(window.registrarLogAtividade) window.registrarLogAtividade("Transferência de Nick", `Migrou os dados do militar de ${oldM.nome} para ${newNick}.`);

            if(window.mostrarToast) window.mostrarToast("Transferência concluída com sucesso!", "success");
            
            document.getElementById('transfer-new').value = '';
            document.getElementById('modal-hub-estrelas').style.display = 'none';
        } catch(err) {
            console.error(err);
            if(window.mostrarToast) window.mostrarToast("Erro ao transferir.", "error");
        } finally {
            window.mostrarLoader(false);
        }
    }
}

window.confirmarRemocaoRankCentral = function() {
    let id = document.getElementById('select-remover-central').value;
    if (!id) return window.mostrarToast ? window.mostrarToast("Selecione um policial.", "error") : alert("Selecione um policial!");
    
    let m = militaresEstrelasData.find(x => x.id === id);
    if (!m) return;

    if (confirm(`ATENÇÃO! Isso vai apagar TODOS os dados e estrelas de ${m.nome} permanentemente.\n\nTem certeza que este policial foi demitido?`)) {
        window.mostrarLoader(true, "Apagando policial do sistema...");
        window.db.collection("militares").doc(id).delete().then(() => {
            window.registrarLogEstrela(m.nome, "Remoção do Rank", "-", "Militar demitido foi removido permanentemente do banco de dados (Ação Manual).");
            if(window.mostrarToast) window.mostrarToast(`${m.nome} removido.`, "success");
            if(window.registrarLogAtividade) window.registrarLogAtividade("Limpeza de Rank", `Removeu permanentemente o(a) ex-militar ${m.nome} do banco.`);
            document.getElementById('modal-hub-estrelas').style.display = 'none';
        }).catch(e => {
            console.error(e);
            if(window.mostrarToast) window.mostrarToast("Erro ao remover.", "error");
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