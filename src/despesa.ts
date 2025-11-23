// src/despesa.ts

// 1. Importamos a classe Categoria.
// IMPORTANTE: Em projetos ESM modernos (NodeNext), usamos a extensão .js na importação
// mesmo que o arquivo seja .ts. O TypeScript entende isso.
import { Categoria } from './categoria.js';

export class Despesa {
    public id?: number;
    public descricao: string;
    public categoria: Categoria; // ASSOCIAÇÃO: Despesa "tem uma" Categoria
    public data: Date;
    
    // ENCAPSULAMENTO: O valor é privado (ninguém mexe nele diretamente)
    private _valor: number = 0;

    constructor(descricao: string, valor: number, categoria: Categoria, data?: Date) {
        this.descricao = descricao;
        this.categoria = categoria;
        // Se passar uma data, usa ela. Se não, usa "agora".
        this.data = data || new Date();
        
        // Chamamos o SETTER para aplicar a validação desde a criação
        this.valor = valor;
    }

    // GETTER: Para ler o valor
    public get valor(): number {
        return this._valor;
    }

    // SETTER: Para alterar o valor com SEGURANÇA
    public set valor(novoValor: number) {
        if (novoValor <= 0) {
            throw new Error("O valor da despesa deve ser maior que zero.");
        }

        // Arredonda para 2 casas decimais (evita erros como 10.99999999)
        // Ex: 10.567 * 100 = 1056.7 -> round -> 1057 / 100 = 10.57
        this._valor = Math.round(novoValor * 100) / 100;
    }
}