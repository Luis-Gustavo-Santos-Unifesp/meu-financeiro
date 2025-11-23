const API_URL = 'http://localhost:3000';

// Elementos da tela
const form = document.getElementById('form-despesa');
const selectCategoria = document.getElementById('categoria');
const tabelaDespesas = document.getElementById('lista-despesas');

const formCategoria = document.getElementById('form-categoria');
const listaCategoriasUL = document.getElementById('lista-categorias');

const inputDescricao = document.getElementById('descricao');
const inputValor = document.getElementById('valor');
const btnSalvar = form.querySelector('button[type="submit"]'); // O botão do form

const inputMes = document.getElementById('filtro-mes');
const spanTotal = document.getElementById('total-gastos');

// --- INICIALIZAÇÃO DO MÊS ---
// Define o input para o mês atual automaticamente ao abrir
const hoje = new Date();
const ano = hoje.getFullYear();
const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // +1 pq janeiro é 0
inputMes.value = `${ano}-${mes}`;

// Quando mudar o mês, recarrega a lista
inputMes.addEventListener('change', carregarDespesas);

// --- VARIÁVEL DE CONTROLE ---
// Se for null, estamos criando. Se tiver um número, estamos editando esse ID.
let idDespesaEmEdicao = null;
// NOVA VARIÁVEL DE CONTROLE
let idCategoriaEmEdicao = null; 
const btnSalvarCategoria = formCategoria.querySelector('button'); // Pegamos o botão para mudar o texto

const inputData = document.getElementById('data-despesa'); // Nova referência

// Definir "Hoje" como padrão ao carregar
const hojeISO = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
inputData.value = hojeISO;

let meuGrafico = null; // Variável global

// ATUALIZADA: Busca categorias e preenche O SELECT e A LISTA
// ATUALIZADA: carregarCategorias agora cria o botão Editar
async function carregarCategorias() {
    const resposta = await fetch(`${API_URL}/categorias`);
    const categorias = await resposta.json();

    selectCategoria.innerHTML = '<option value="" disabled selected>Categoria</option>';
    listaCategoriasUL.innerHTML = '';

    categorias.forEach(cat => {
        // A) Select de Despesas (Igual)
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nome;
        selectCategoria.appendChild(option);

        // B) Lista de Gestão (AGORA COM BOTÃO EDITAR)
        const li = document.createElement('li');
        li.style = "display: flex; justify-content: space-between; align-items: center; padding: 5px; border-bottom: 1px solid #ddd;";
        li.innerHTML = `
            <span>${cat.nome}</span>
            <div>
                <button onclick="prepararEdicaoCategoria(${cat.id}, '${cat.nome}')" style="background: #ffc107; color: black; padding: 2px 8px; font-size: 0.8rem; margin-right: 5px; border:none; cursor:pointer;">✏️</button>
                <button onclick="deletarCategoria(${cat.id})" style="background: #dc3545; color: white; padding: 2px 8px; font-size: 0.8rem; border:none; cursor:pointer;">🗑️</button>
            </div>
        `;
        listaCategoriasUL.appendChild(li);
    });
}

// NOVA: Função que joga o nome da categoria no input para editar
window.prepararEdicaoCategoria = (id, nome) => {
    document.getElementById('nome-nova-categoria').value = nome;
    idCategoriaEmEdicao = id;
    
    // Muda o visual do botão para indicar edição
    btnSalvarCategoria.textContent = "Atualizar";
    btnSalvarCategoria.style.background = "#ffc107"; // Amarelo
    btnSalvarCategoria.style.color = "black";
}

// NOVO: Função para Salvar Categoria
// ATUALIZADA: Submit agora decide entre Criar ou Editar
formCategoria.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputNome = document.getElementById('nome-nova-categoria');
    const nome = inputNome.value;

    // Lógica de Decisão (Igual à de Despesas)
    let url = `${API_URL}/categorias`;
    let metodo = 'POST';

    if (idCategoriaEmEdicao !== null) {
        url = `${API_URL}/categorias/${idCategoriaEmEdicao}`;
        metodo = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });

        if (res.ok) {
            // Resetar o formulário e o estado
            inputNome.value = ''; 
            idCategoriaEmEdicao = null;
            btnSalvarCategoria.textContent = "Adicionar";
            btnSalvarCategoria.style.background = "#007bff"; // Azul original
            btnSalvarCategoria.style.color = "white";

            carregarCategorias(); 
            // Se editamos uma categoria, precisamos atualizar a tabela de despesas também
            // pois o nome da categoria pode ter mudado lá!
            carregarDespesas(); 
            
            alert(metodo === 'PUT' ? 'Categoria atualizada!' : 'Categoria adicionada!');
        }
    } catch (error) {
        alert('Erro na operação');
    }
});

// NOVO: Função para Deletar Categoria
// (Precisamos anexar ao window para ser acessível pelo onclick do HTML)
window.deletarCategoria = async (id) => {
    if (!confirm("Tem certeza? Se houver despesas nesta categoria, elas impedirão a exclusão.")) return;

    const res = await fetch(`${API_URL}/categorias/${id}`, {
        method: 'DELETE'
    });

    if (res.ok) {
        carregarCategorias();
        alert('Categoria excluída.');
    } else {
        const erro = await res.json();
        alert('Erro: ' + erro.erro);
    }
};

// 2. Função para buscar Despesas e preencher a tabela
// ATUALIZADA: carregarDespesas agora adiciona botões de Ação
// ATUALIZADA: carregarDespesas agora usa o filtro e soma o total
async function carregarDespesas() {
    // 1. Calcular Inicio e Fim com base no input month (ex: "2025-11")
    const [anoSelect, mesSelect] = inputMes.value.split('-');
    
    // Primeiro dia do mês (Ano, Mes-1, 1)
    const dataInicio = new Date(anoSelect, mesSelect - 1, 1);
    
    // Último dia do mês (Ano, Mes, 0) -> O dia 0 do próximo mês é o último deste
    const dataFim = new Date(anoSelect, mesSelect, 0);
    dataFim.setHours(23, 59, 59, 999); // Final do dia

    // 2. Montar a URL com os parametros
    // toISOString() manda no formato padrão que o Backend entende
    const url = `${API_URL}/despesas?inicio=${dataInicio.toISOString()}&fim=${dataFim.toISOString()}`;

    const resposta = await fetch(url);
    const despesas = await resposta.json();

    tabelaDespesas.innerHTML = '';
    let total = 0; // Variável para somar

    despesas.forEach(d => {
        // Somar ao total
        total += d.valor;

        const dataFormatada = new Date(d.data).toLocaleDateString('pt-BR');
        
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${d.descricao}</td>
            <td>${d.categoria}</td>
            <td>${dataFormatada}</td>
            <td class="valor">R$ ${d.valor.toFixed(2)}</td>
            <td>
                <button onclick="prepararEdicao(${d.id}, '${d.descricao}', ${d.valor}, '${d.categoria}', '${d.data}')" style="background: #ffc107; color: black; margin-right: 5px;">Editar</button>
                <button onclick="deletarDespesa(${d.id})" style="background: #dc3545;">X</button>
            </td>
        `;
        tabelaDespesas.appendChild(linha);

        atualizarGrafico();
    });

    // 3. Atualizar o Total na tela
    spanTotal.textContent = `R$ ${total.toFixed(2)}`;
}

// NOVO: Função para Deletar Despesa
window.deletarDespesa = async (id) => {
    if(confirm("Excluir despesa?")) {
        await fetch(`${API_URL}/despesas/${id}`, { method: 'DELETE' });
        carregarDespesas();
    }
}

// NOVO: Função que prepara o formulário para Edição
// (Chamada ao clicar no botão amarelo)
// ATUALIZADA: Função Preparar Edição
window.prepararEdicao = (id, descricao, valor, nomeCategoria, dataISO) => {
    // 1. Preenche os campos com os dados atuais
    inputDescricao.value = descricao;
    inputValor.value = valor;

    // TRUQUE: A data vem do banco completa (2023-11-22T14:00:00.000Z)
    // O input date só aceita os primeiros 10 caracteres (YYYY-MM-DD)
    inputData.value = dataISO.split('T')[0];
    
    // 2. Tenta selecionar a categoria correta no menu
    // (Varremos as opções para achar a que tem o texto igual ao nome da categoria)
    for (const option of selectCategoria.options) {
        if (option.text === nomeCategoria) {
            selectCategoria.value = option.value;
            break;
        }
    }

    // 3. Muda o estado para "Editando"
    idDespesaEmEdicao = id;
    btnSalvar.textContent = "Atualizar Despesa";
    btnSalvar.style.background = "#ffc107"; // Amarelo
    btnSalvar.style.color = "black";
}

// 3. Função para Salvar (Quando clica no botão)
// ATUALIZADA: Função de Submit do Formulário
form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dados = {
        descricao: inputDescricao.value,
        valor: inputValor.value,
        categoriaId: parseInt(selectCategoria.value),
        data: inputData.value // Envia a data escolhida (YYYY-MM-DD)
    };

    // DECISÃO: Criar ou Atualizar?
    let url = `${API_URL}/despesas`;
    let metodo = 'POST';

    if (idDespesaEmEdicao !== null) {
        // Estamos editando!
        url = `${API_URL}/despesas/${idDespesaEmEdicao}`;
        metodo = 'PUT';
    }

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (resposta.ok) {
            resetarFormulario(); // Limpa tudo e volta ao estado "Criar"
            carregarDespesas();
            alert(idDespesaEmEdicao ? 'Atualizado!' : 'Salvo!');
        } else {
            alert('Erro ao salvar');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
});

// Função auxiliar para limpar e voltar ao normal
function resetarFormulario() {
    form.reset();
    inputData.value = hojeISO; // Volta para "Hoje"
    idDespesaEmEdicao = null;
    btnSalvar.textContent = "Salvar";
    btnSalvar.style.background = "#28a745"; // Verde
    btnSalvar.style.color = "white";
}

async function atualizarGrafico() {
    // Pegamos as datas do mesmo input que a tabela usa
    const [anoSelect, mesSelect] = inputMes.value.split('-');
    const dataInicio = new Date(anoSelect, mesSelect - 1, 1);
    const dataFim = new Date(anoSelect, mesSelect, 0);
    dataFim.setHours(23, 59, 59, 999);

    const url = `${API_URL}/dashboard?inicio=${dataInicio.toISOString()}&fim=${dataFim.toISOString()}`;

    const res = await fetch(url);
    const dados = await res.json(); // { labels: [...], valores: [...] }

    const ctx = document.getElementById('grafico-despesas');

    // Se já existe um gráfico anterior, destruímos para criar o novo
    if (meuGrafico) {
        meuGrafico.destroy();
    }

    // Criamos o novo gráfico
    meuGrafico = new Chart(ctx, {
        type: 'pie', // Tipo Pizza
        data: {
            labels: dados.labels,
            datasets: [{
                label: 'Gastos (R$)',
                data: dados.valores,
                borderWidth: 1,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Permite ajustar ao tamanho da div
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

// Inicialização: Carrega os dados ao abrir a página
carregarCategorias();
carregarDespesas();