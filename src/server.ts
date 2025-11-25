// src/server.ts
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken'; // <--- NOVO
import bcrypt from 'bcryptjs';  // <--- NOVO
import { Categoria } from './categoria.js';
import { Despesa } from './despesa.js';
import { CategoriaRepository, DespesaRepository, UsuarioRepository } from './repository.js'; // <--- NOVO

const app = express();
const port = 3000;
const JWT_SECRET = "minha-chave-secreta-super-segura"; // Em produção, isso iria no .env

// 1. Configurações Básicas
app.use(cors());          // Permite acesso externo (do frontend)
app.use(express.json());  // Permite ler JSON no corpo das requisições (req.body)
app.use(express.static('public'));  // Diz ao Express para servir os arquivos da pasta 'public' como um site estático

// 2. Instanciar os Repositórios
const catRepo = new CategoriaRepository();
const despRepo = new DespesaRepository();
const userRepo = new UsuarioRepository(); // <--- NOVO

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
// Essa função age como um porteiro.
// Ela adiciona uma propriedade 'userId' ao objeto da requisição se o token for válido.
// Para o TypeScript não reclamar, vamos estender o tipo Request (truque rápido)
declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

const autenticar = (req: any, res: any, next: any) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ erro: "Acesso negado. Faça login." });

    try {
        // O token vem como "Bearer eyJhbG..."
        // Removemos o "Bearer " se estiver presente, ou pegamos direto
        const tokenReal = token.startsWith('Bearer ') ? token.slice(7) : token;
        
        const payload = jwt.verify(tokenReal, JWT_SECRET) as any;
        req.userId = payload.id; // Guardamos o ID do usuário na requisição!
        next(); // Pode passar
    } catch (error) {
        res.status(403).json({ erro: "Token inválido" });
    }
};

// --- ROTAS PÚBLICAS (Qualquer um acessa) ---

// 1. Cadastro (Sign Up)
app.post('/signup', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const usuario = await userRepo.criar(nome, email, senha);
        res.status(201).json(usuario);
    } catch (error: any) {
        res.status(400).json({ erro: "Erro ao criar usuário (Email já existe?)" });
    }
});

// 2. Login
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await userRepo.buscarPorEmail(email);

        if (!usuario) return res.status(400).json({ erro: "Email ou senha incorretos" });

        // Compara a senha enviada com o hash no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(400).json({ erro: "Email ou senha incorretos" });

        // Gera o Token
        const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, nome: usuario.nome });
    } catch (error: any) {
        res.status(500).json({ erro: error.message });
    }
});

// --- ROTAS DE CATEGORIA ---

// GET /categorias -> Listar todas
app.get('/categorias', autenticar, async (req, res) => {
    try {
        const categorias = await catRepo.listar();
        res.json(categorias);
    } catch (error: any) {
        res.status(500).json({ erro: error.message });
    }
});

// POST /categorias -> Criar nova
app.post('/categorias', autenticar, async (req, res) => {
    try {
        // O nome vem do JSON enviado pelo cliente
        const nome = req.body.nome; 
        const novaCategoria = new Categoria(nome);
        
        const categoriaSalva = await catRepo.salvar(novaCategoria);
        res.status(201).json(categoriaSalva);
    } catch (error: any) {
        res.status(400).json({ erro: error.message });
    }
});

// NOVO: DELETE /categorias/:id -> Apagar
// Exemplo de chamada: DELETE /categorias/5
app.delete('/categorias/:id', autenticar, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await catRepo.excluir(id);
        res.status(204).send(); // 204 = No Content (Deu certo, sem corpo de volta)
    } catch (error: any) {
        // Erro P2003 do Prisma = Violação de chave estrangeira (tem despesas vinculadas)
        if (error.code === 'P2003') {
            res.status(400).json({ erro: "Não é possível excluir categoria que possui despesas." });
        } else {
            res.status(500).json({ erro: error.message });
        }
    }
});

// NOVO: PUT /categorias/:id -> Atualizar
app.put('/categorias/:id', autenticar, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome } = req.body; // O novo nome vem no JSON
        
        const categoriaAtualizada = await catRepo.atualizar(id, nome);
        res.json(categoriaAtualizada);
    } catch (error: any) {
        res.status(400).json({ erro: error.message });
    }
});

// --- ROTAS PROTEGIDAS (Precisam de Token) ---

// GET /despesas (Agora filtra pelo usuário logado!)
app.get('/despesas', autenticar, async (req, res) => {
    try {
        const { inicio, fim } = req.query;
        let dataInicio: Date | undefined;
        let dataFim: Date | undefined;
        if (inicio && fim) {
            dataInicio = new Date(inicio as string);
            dataFim = new Date(fim as string);
        }

        // Passamos o req.userId (que o middleware pegou) para o repositório
        const despesas = await despRepo.listar(req.userId!, dataInicio, dataFim);
        
        // Mapeamento igual...
        const resposta = despesas.map(d => ({
            id: d.id, descricao: d.descricao, valor: d.valor, data: d.data, categoria: d.categoria.nome
        }));
        res.json(resposta);
    } catch (error: any) {
        res.status(500).json({ erro: error.message });
    }
});

// POST /despesas (Salva com o dono!)
app.post('/despesas', autenticar, async (req, res) => {
    try {
        const { descricao, valor, categoriaId, data } = req.body;
        const categoriaTemp = new Categoria("Temp"); categoriaTemp.id = categoriaId;
        const dataObj = data ? new Date(data + "T12:00:00") : undefined;
        const novaDespesa = new Despesa(descricao, parseFloat(valor), categoriaTemp, dataObj);
        
        // Passamos o req.userId para salvar!
        const despesaSalva = await despRepo.salvar(novaDespesa, req.userId!);
        res.status(201).json(despesaSalva);
    } catch (error: any) {
        res.status(400).json({ erro: error.message });
    }
});

// NOVO: DELETE /despesas/:id
app.delete('/despesas/:id', autenticar, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await despRepo.excluir(id);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ erro: error.message });
    }
});

// NOVO: PUT /despesas/:id
app.put('/despesas/:id', autenticar, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Recebemos a data aqui também
        const { descricao, valor, categoriaId, data } = req.body;
        
        // Convertemos a string para Date (obrigatório na edição)
        // FIX: Adicionamos "T12:00:00" para fixar no meio do dia e evitar o bug de fuso horário.
        // Ex: "2025-11-22" vira "2025-11-22T12:00:00"
        const dataObj = new Date(data + "T12:00:00");

        const despesaAtualizada = await despRepo.atualizar(id, descricao, parseFloat(valor), parseInt(categoriaId), dataObj);
        res.json(despesaAtualizada);
    } catch (error: any) {
        res.status(400).json({ erro: error.message });
    }
});

/* // NOVO: Rota para dados do Gráfico
app.get('/dashboard', autenticar, async (req, res) => {
    try {
        const { inicio, fim } = req.query;
        
        // 1. Buscamos as despesas do período (reutilizando o repositório existente!)
        let dataInicio: Date | undefined;
        let dataFim: Date | undefined;

        if (inicio && fim) {
            dataInicio = new Date(inicio as string);
            dataFim = new Date(fim as string);
        }

        const despesas = await despRepo.listar(dataInicio, dataFim);

        // 2. Lógica de Agrupamento (Magia do Backend)
        // Vamos criar um objeto assim: { "Alimentação": 150.00, "Lazer": 50.00 }
        const totaisPorCategoria: Record<string, number> = {};

        despesas.forEach(d => {
            const categoriaNome = d.categoria.nome;
            // Se já tem valor, soma. Se não, começa com 0.
            if (!totaisPorCategoria[categoriaNome]) {
                totaisPorCategoria[categoriaNome] = 0;
            }
            totaisPorCategoria[categoriaNome] += d.valor;
        });

        // 3. Formatamos para o Chart.js (dois arrays: labels e valores)
        const labels = Object.keys(totaisPorCategoria); // ["Alimentação", "Lazer"]
        const valores = Object.values(totaisPorCategoria); // [150.00, 50.00]

        res.json({ labels, valores });

    } catch (error: any) {
        res.status(500).json({ erro: error.message });
    }
}); */

// ATUALIZADO: Agora com 'autenticar' e passando o ID do usuário
app.get('/dashboard', autenticar, async (req, res) => {
    try {
        const { inicio, fim } = req.query;
        
        let dataInicio: Date | undefined;
        let dataFim: Date | undefined;

        if (inicio && fim) {
            dataInicio = new Date(inicio as string);
            dataFim = new Date(fim as string);
        }

        // CORREÇÃO PRINCIPAL AQUI:
        // Passamos o req.userId (que vem do token) como primeiro argumento!
        const despesas = await despRepo.listar(req.userId!, dataInicio, dataFim);

        // Lógica de Agrupamento (Continua igual)
        const totaisPorCategoria: Record<string, number> = {};

        despesas.forEach(d => {
            const categoriaNome = d.categoria.nome;
            if (!totaisPorCategoria[categoriaNome]) {
                totaisPorCategoria[categoriaNome] = 0;
            }
            totaisPorCategoria[categoriaNome] += d.valor;
        });

        const labels = Object.keys(totaisPorCategoria);
        const valores = Object.values(totaisPorCategoria);

        res.json({ labels, valores });

    } catch (error: any) {
        console.error("Erro no dashboard:", error); // Log para ajudar a debugar
        res.status(500).json({ erro: error.message });
    }
});

// 3. Iniciar o Servidor
app.listen(port, () => {
    console.log(`🚀 Servidor Seguro rodando em http://localhost:${port}`);
    console.log(`- Acesse /categorias para ver as categorias`);
    console.log(`- Acesse /despesas para ver as despesas`);
});