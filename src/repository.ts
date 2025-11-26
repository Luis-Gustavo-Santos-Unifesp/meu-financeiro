// src/repository.ts
import { PrismaClient } from '@prisma/client';
import { Categoria } from './categoria.js';
import { Despesa } from './despesa.js';
import bcrypt from 'bcryptjs'; // <--- NOVO IMPORT

// Instanciação Vazia!
// O Prisma lerá automaticamente o arquivo .env na raiz do projeto.
export const prisma = new PrismaClient();

export class CategoriaRepository {
    async salvar(categoria: Categoria): Promise<Categoria> {
        const categoriaDB = await prisma.categoria.create({
            data: { nome: categoria.nome }
        });
        categoria.id = categoriaDB.id;
        return categoria;
    }

    async listar(): Promise<Categoria[]> {
        const categoriasDB = await prisma.categoria.findMany();
        return categoriasDB.map(dbItem => {
            const cat = new Categoria(dbItem.nome);
            cat.id = dbItem.id;
            return cat;
        });
    }

    // NOVO: Excluir Categoria
    async excluir(id: number): Promise<void> {
        // O Prisma lança erro se tentarmos apagar uma categoria que tem despesas
        await prisma.categoria.delete({
            where: { id }
        });
    }

    // NOVO: Atualizar Categoria
    async atualizar(id: number, nome: string): Promise<Categoria> {
        const categoriaDB = await prisma.categoria.update({
            where: { id },
            data: { nome }
        });
        
        const cat = new Categoria(categoriaDB.nome);
        cat.id = categoriaDB.id;
        return cat;
    }
}

export class DespesaRepository {
    // ATUALIZADO: Agora precisamos saber QUEM é o dono da despesa (usuarioId)
    async salvar(despesa: Despesa, usuarioId: number): Promise<Despesa> {
        if (!despesa.categoria.id) throw new Error("Categoria obrigatória");

        const despesaDB = await prisma.despesa.create({
            data: {
                descricao: despesa.descricao,
                valor: despesa.valor,
                data: despesa.data,
                categoriaId: despesa.categoria.id,
                usuarioId: usuarioId // <--- NOVO CAMPO OBRIGATÓRIO
            }
        });

        despesa.id = despesaDB.id;
        return despesa;
    }

    // ATUALIZADO: Agora aceita inicio e fim (opcionais)
    // ATUALIZADO: Listar apenas as despesas do usuário logado
    async listar(usuarioId: number, inicio?: Date, fim?: Date): Promise<Despesa[]> {
        const filtro: any = { usuarioId }; // <--- FILTRO DE SEGURANÇA

        if (inicio && fim) {
            filtro.data = { gte: inicio, lte: fim };
        }

        const despesasDB = await prisma.despesa.findMany({
            where: filtro,
            include: { categoria: true },
            orderBy: { data: 'desc' }
        });

        return despesasDB.map(dbItem => {
            const cat = new Categoria(dbItem.categoria.nome);
            cat.id = dbItem.categoria.id;
            const desp = new Despesa(dbItem.descricao, dbItem.valor, cat, dbItem.data);
            desp.id = dbItem.id;
            return desp;
        });
    }

    // NOVO: Excluir
    async excluir(id: number): Promise<void> {
        await prisma.despesa.delete({ where: { id } });
    }

    // NOVO: Atualizar
    // Adicionamos 'data: Date' nos argumentos
    // ... (excluir e atualizar também deveriam verificar o usuarioId por segurança, mas vamos simplificar por agora)
    async atualizar(id: number, descricao: string, valor: number, categoriaId: number, data: Date): Promise<Despesa> {
        const despesaDB = await prisma.despesa.update({
            where: { id },
            data: {
                descricao,
                valor,
                categoriaId,
                data // Agora atualizamos a data no banco também!
            },
            include: { categoria: true }
        });

        // Re-hidratando o objeto para devolver
        const cat = new Categoria(despesaDB.categoria.nome);
        cat.id = despesaDB.categoria.id;
        
        const desp = new Despesa(despesaDB.descricao, despesaDB.valor, cat);
        desp.id = despesaDB.id;
        desp.data = despesaDB.data;
        
        return desp;
    }
}

// --- NOVO: Repositório de Usuários ---
export class UsuarioRepository {
    async criar(nome: string, email: string, senhaPlana: string) {
        // 1. Criptografar a senha (Hash)
        const senhaHash = await bcrypt.hash(senhaPlana, 10);

        // 2. Salvar no banco
        const usuario = await prisma.usuario.create({
            data: {
                nome,
                email,
                senha: senhaHash
            }
        });

        // Retornamos dados básicos (sem a senha!)
        return { id: usuario.id, nome: usuario.nome, email: usuario.email };
    }

    async buscarPorEmail(email: string) {
        console.log("Tentando buscar email:", email); // <--- Debug
        return prisma.usuario.findUnique({
            where: { email }
        });
    }
}

// --- NOVO: Repositório de Logs (Auditoria) ---
export class LogRepository {
    // 1. Gravar um novo log
    async registrar(usuarioId: number, acao: string, detalhes: string) {
        try {
            await prisma.log.create({
                data: {
                    usuarioId,
                    acao,
                    detalhes
                }
            });
        } catch (e) {
            // Se o log falhar, apenas imprimimos no console para não travar o sistema principal
            console.error("Falha ao gravar log:", e);
        }
    }

    // 2. Listar logs de um usuário
    async listar(usuarioId: number): Promise<any[]> {
        return prisma.log.findMany({
            where: { usuarioId },
            orderBy: { dataHora: 'desc' }, // Mais recentes primeiro
            take: 50 // Limita aos últimos 50
        });
    }
}