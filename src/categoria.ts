// src/categoria.ts

export class Categoria {
    // Propriedade opcional (id?), pois ao criar o objeto na memória,
    // ele ainda não tem ID (o banco de dados que vai gerar depois).
    public id?: number;

    // Propriedade pública, pois queremos acessar o nome facilmente.
    public nome: string;

    constructor(nome: string) {
        // Validação Simples:
        // .trim() remove espaços em branco no início e fim.
        // Se o tamanho for 0, significa que o nome é vazio ou só espaços.
        if (nome.trim().length === 0) {
            throw new Error("O nome da categoria não pode ser vazio");
        }

        this.nome = nome;
    }
}