import { Categoria } from './categoria.js';
import { Despesa } from './despesa.js';
import { CategoriaRepository, DespesaRepository, prisma } from './repository.js';

async function main() {
    const catRepo = new CategoriaRepository();
    const despRepo = new DespesaRepository();

    console.log("1. Salvando Categoria...");
    const catAlimentacao = new Categoria("Alimentação");
    await catRepo.salvar(catAlimentacao);
    console.log(`   Categoria salva com ID: ${catAlimentacao.id}`);

    console.log("2. Salvando Despesa...");
    const almoco = new Despesa("Almoço Executivo", 28.50, catAlimentacao);
    await despRepo.salvar(almoco);
    console.log(`   Despesa salva com ID: ${almoco.id}`);

    console.log("\n3. Lendo do Banco de Dados...");
    const todasDespesas = await despRepo.listar();
    console.table(todasDespesas.map(d => ({
        id: d.id,
        desc: d.descricao,
        valor: d.valor,
        categoria: d.categoria.nome
    })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());