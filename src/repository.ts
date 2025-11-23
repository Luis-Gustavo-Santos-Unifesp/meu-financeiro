// src/repository.ts
import { PrismaClient } from '@prisma/client';
import { Categoria } from './categoria.js';
import { Despesa } from './despesa.js';

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
    async salvar(despesa: Despesa): Promise<Despesa> {
        if (!despesa.categoria.id) {
            throw new Error("A categoria precisa ser salva antes da despesa.");
        }

        const despesaDB = await prisma.despesa.create({
            data: {
                descricao: despesa.descricao,
                valor: despesa.valor,
                data: despesa.data,
                categoriaId: despesa.categoria.id
            }
        });

        despesa.id = despesaDB.id;
        return despesa;
    }

// ATUALIZADO: Agora aceita inicio e fim (opcionais)
    async listar(inicio?: Date, fim?: Date): Promise<Despesa[]> {
        
        // Montamos o filtro dinamicamente
        const filtroWhere: any = {};

        if (inicio && fim) {
            filtroWhere.data = {
                gte: inicio, // Maior ou igual ao inicio
                lte: fim     // Menor ou igual ao fim
            };
        }

        const despesasDB = await prisma.despesa.findMany({
            where: filtroWhere, // Aplicamos o filtro aqui
            include: { categoria: true },
            orderBy: { data: 'desc' } // Dica extra: Ordenar do mais recente para o antigo fica melhor!
        });

        return despesasDB.map(dbItem => {
            const cat = new Categoria(dbItem.categoria.nome);
            cat.id = dbItem.categoria.id;

            const desp = new Despesa(dbItem.descricao, dbItem.valor, cat);
            desp.id = dbItem.id;
            desp.data = dbItem.data; 

            return desp;
        });
    }

    // NOVO: Excluir
    async excluir(id: number): Promise<void> {
        await prisma.despesa.delete({ where: { id } });
    }

    // NOVO: Atualizar
    // Adicionamos 'data: Date' nos argumentos
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