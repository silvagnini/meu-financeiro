let registros = JSON.parse(localStorage.getItem('finance_data')) || [];
let meuGrafico;

window.onload = () => {
    // Define o mês atual como padrão no filtro
    const dataAtual = new Date();
    const mesAno = dataAtual.toISOString().substring(0, 7);
    document.getElementById('filtro-mes').value = mesAno;
    atualizarInterface();
};

function abrirAba(idAba) {
    document.querySelectorAll('.aba-content').forEach(aba => aba.style.display = 'none');
    document.querySelectorAll('.tab-menu button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(idAba).style.display = 'block';
    document.getElementById('btn-' + idAba).classList.add('active');
    
    if(idAba === 'dashboard') atualizarGrafico();
    if(idAba === 'contas') atualizarInterface();
}

function salvarDados() {
    const desc = document.getElementById('desc').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = document.getElementById('tipo').value;
    const categoria = document.getElementById('categoria').value;
    const dataVenc = document.getElementById('data-vencimento').value;

    if(!desc || isNaN(valor) || !dataVenc) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const mesReferencia = dataVenc.substring(0, 7);

    if (tipo === 'receita') {
        const indexExistente = registros.findIndex(r => 
            r.tipo === 'receita' && r.dataVencimento.substring(0, 7) === mesReferencia
        );

        if (indexExistente !== -1) {
            const confirmar = confirm(`Já existe uma receita de R$ ${registros[indexExistente].valor.toFixed(2)} neste mês. Deseja SUBSTITUIR pelo novo valor?`);
            if (confirmar) {
                registros[indexExistente] = { ...registros[indexExistente], desc, valor, dataVencimento: dataVenc };
            } else {
                return;
            }
        } else {
            adicionarRegistro(desc, valor, tipo, categoria, dataVenc);
        }
    } else {
        adicionarRegistro(desc, valor, tipo, categoria, dataVenc);
    }

    localStorage.setItem('finance_data', JSON.stringify(registros));
    limparCampos();
    atualizarInterface();
    alert("Dados salvos com sucesso!");
}

function adicionarRegistro(desc, valor, tipo, categoria, dataVenc) {
    registros.push({
        id: Date.now(),
        desc, valor, tipo, categoria, dataVencimento: dataVenc,
        pago: false
    });
}

function atualizarInterface() {
    const mesFiltro = document.getElementById('filtro-mes').value;
    const dadosFiltrados = registros.filter(r => r.dataVencimento.substring(0, 7) === mesFiltro);

    const totalRec = dadosFiltrados.filter(r => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);
    const totalDesp = dadosFiltrados.filter(r => r.tipo !== 'receita').reduce((s, r) => s + r.valor, 0);
    const saldoGeral = totalRec - totalDesp;

    document.getElementById('resumo-receitas').innerText = `R$ ${totalRec.toFixed(2)}`;
    document.getElementById('resumo-despesas').innerText = `R$ ${totalDesp.toFixed(2)}`;
    
    const resumoSaldo = document.getElementById('resumo-saldo-geral');
    resumoSaldo.innerText = `R$ ${saldoGeral.toFixed(2)}`;

    const cardSaldo = document.getElementById('card-saldo-geral');
    if (saldoGeral < 0) {
        cardSaldo.style.borderBottom = "4px solid #ef4444";
        resumoSaldo.style.color = "#ef4444";
    } else {
        cardSaldo.style.borderBottom = "4px solid #22c55e";
        resumoSaldo.style.color = "#22c55e";
    }

    renderizarContas(dadosFiltrados);
}

function renderizarContas(dados) {
    const lista = document.getElementById('lista-contas');
    if (!lista) return;
    lista.innerHTML = '';

    const despesas = dados.filter(r => r.tipo !== 'receita');

    despesas.forEach(item => {
        const dataObj = new Date(item.dataVencimento);
        const dia = dataObj.getUTCDate();
        const sugestao = (dia >= 5 && dia < 20) ? 'Salário 05' : 'Salário 20';

        lista.innerHTML += `
            <div class="item-conta" style="border-left: 4px solid ${item.pago ? '#22c55e' : '#ef4444'}">
                <div>
                    <strong>${item.desc}</strong> <small>(${item.categoria})</small><br>
                    <small>Vence: ${dia} | Sugestão: ${sugestao}</small>
                </div>
                <div style="text-align:right">
                    <b>R$ ${item.valor.toFixed(2)}</b><br>
                    <button onclick="alternarPago(${item.id})">${item.pago ? '✅' : '⬜'}</button>
                    <button onclick="excluirRegistro(${item.id})">🗑️</button>
                </div>
            </div>`;
    });
}

function limparCampos() {
    document.getElementById('desc').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('data-vencimento').value = '';
    document.getElementById('desc').focus();
}

function alternarPago(id) {
    const r = registros.find(x => x.id === id);
    r.pago = !r.pago;
    localStorage.setItem('finance_data', JSON.stringify(registros));
    atualizarInterface();
}

function excluirRegistro(id) {
    if(confirm("Deseja excluir este item?")) {
        registros = registros.filter(x => x.id !== id);
        localStorage.setItem('finance_data', JSON.stringify(registros));
        atualizarInterface();
    }
}

// FUNÇÃO DE LIMPEZA TOTAL (Corrigida e fora de outras funções)
function limparTodoHistorico() {
    if (confirm("ATENÇÃO: Isso apagará todas as receitas e contas permanentemente. Deseja continuar?")) {
        registros = [];
        localStorage.clear(); 
        alert("Aplicação reiniciada com sucesso!");
        window.location.reload(); 
    }
}

// FUNÇÃO DO GRÁFICO (Necessária para a aba Painel)
function atualizarGrafico() {
    const ctx = document.getElementById('graficoBarras').getContext('2d');
    const mesFiltro = document.getElementById('filtro-mes').value;
    const dados = registros.filter(r => r.dataVencimento.substring(0, 7) === mesFiltro && r.tipo !== 'receita');

    const cats = ['Moradia', 'Serviços', 'Alimentação', 'Lazer', 'Assinaturas', 'Carros', 'Cartão de credito', 'Outros'];
    const valores = cats.map(c => dados.filter(r => r.categoria === c).reduce((s, r) => s + r.valor, 0));

    if(meuGrafico) meuGrafico.destroy();
    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: cats,
            datasets: [{ label: 'Gastos R$', data: valores, backgroundColor: '#22c55e' }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } }
        }
    });
}