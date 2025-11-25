const API_URL = 'http://localhost:3000';
let isCadastro = false; // Começa no modo Login

function alternarModo() {
    isCadastro = !isCadastro;
    const titulo = document.getElementById('titulo-form');
    const btnAcao = document.getElementById('btn-acao');
    const btnToggle = document.getElementById('btn-toggle');
    const inputNome = document.getElementById('nome');

    if (isCadastro) {
        titulo.textContent = "Criar Conta";
        btnAcao.textContent = "Cadastrar";
        btnToggle.textContent = "Já tem conta? Entre";
        inputNome.style.display = "block";
        inputNome.required = true;
    } else {
        titulo.textContent = "Entrar";
        btnAcao.textContent = "Entrar";
        btnToggle.textContent = "Não tem conta? Cadastre-se";
        inputNome.style.display = "none";
        inputNome.required = false;
    }
}

document.getElementById('form-auth').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const nome = document.getElementById('nome').value;

    const rota = isCadastro ? '/signup' : '/login';
    const payload = isCadastro ? { nome, email, senha } : { email, senha };

    try {
        const res = await fetch(`${API_URL}${rota}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const dados = await res.json();

        if (res.ok) {
            if (isCadastro) {
                alert("Conta criada! Agora faça login.");
                alternarModo(); // Volta para tela de login
            } else {
                // SUCESSO NO LOGIN!
                // 1. Guardar o Token no cofre do navegador
                localStorage.setItem('token', dados.token);
                localStorage.setItem('usuario', dados.nome);
                
                // 2. Redirecionar para a página principal
                window.location.href = 'index.html';
            }
        } else {
            alert(dados.erro || "Erro na autenticação");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor");
    }
});