const mysql = require('mysql2/promise');
class NotasProcessor {
    constructor() {
        this.phpEndpoint = 'https://enviar-nota-fiscal-oracle-92095499668.us-east1.run.app/enviar_nota_fiscal';
        this.dbConfig = {
            host: 'databaseread.drconsulta.com',
            user: 'softtek.filipe.santos',
            password: 'IjS4jzcTFiT8S79O',
            database: 'DRC'
        };
        this.dataInicial = '20240312';
        this.dataFinal = '20240327';
    }
    // Função para contar as notas por id_recepcao
    async countNotasByRecepcao() {
        const connection = await mysql.createConnection(this.dbConfig);
        try {
            const [rows] = await connection.execute(`
                SELECT id_recepcao, COUNT(*) AS total_notas
                FROM emissao_notas_fiscais
                WHERE
                id_recepcao = 30037300
                 AND sigla <> 'TABO'
                 AND status = 'NAO_EMITIDO'
                GROUP BY id_recepcao
            `);
            return rows;
        } finally {
            await connection.end();
        }
    }
    // Função para buscar as notas por id_recepcao
    async getNotasFromDBByRecepcao(id_recepcao) {
        const connection = await mysql.createConnection(this.dbConfig);
        try {
            const [rows] = await connection.execute(`
                SELECT *
                FROM emissao_notas_fiscais
                WHERE
                  sigla <> 'TABO'
                  AND status = 'NAO_EMITIDO'
                  AND account_number IS NOT NULL
                  AND
                  id_recepcao = ?
            `, [id_recepcao]);
            return rows;
        } finally {
            await connection.end();
        }
    }
    // Função para criar o sleep de 1 segundo
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Processar as notas dividindo por id_recepcao e contando o número de notas
    async processarNotasPorRecepcao() {
        try {
            console.log('Contando notas por id_recepcao...');
            const notasCount = await this.countNotasByRecepcao();
            console.log(`${notasCount.length} ids de recepção encontrados`);
            // Armazenando todas as promessas para enviar simultaneamente
            const todasPromessas = [];
            // Para cada id_recepcao, busca as notas e processa
            for (const { id_recepcao, total_notas } of notasCount) {
                console.log(`Processando notas para id_recepcao: ${id_recepcao} com ${total_notas} notas`);
                const notas = await this.getNotasFromDBByRecepcao(id_recepcao);
                console.log(`${notas.length} notas encontradas para id_recepcao ${id_recepcao}`);
                // Divide as notas em blocos
                const blocos = [];
                const blocoSize = total_notas; // Neste caso, o bloco será de todas as notas para aquele id_recepcao
                for (let i = 0; i < notas.length; i += blocoSize) {
                    blocos.push(notas.slice(i, i + blocoSize));
                }
                console.log(`Enviando ${blocos.length} blocos simultaneamente para id_recepcao ${id_recepcao}`);
                // Cria as promessas para envio dos blocos
                blocos.forEach((bloco, index) => {
                    const promise = fetch(this.phpEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer iGgYzfRHMeXM8yoJukY5iT0Z5aw'
                        },
                        body: JSON.stringify(bloco)
                    })
                    .then(async response => {
                        const text = await response.text();
                        console.log(`Bloco ${index + 1} processado para id_recepcao ${id_recepcao}`);
                        return { index: index + 1, response: text };
                    })
                    .catch(error => {
                        console.error(`Erro no bloco ${index + 1} para id_recepcao ${id_recepcao}:`, error.message);
                        return { index: index + 1, error: error.message };
                    });
                    todasPromessas.push(promise); // Adiciona a promessa ao array
                });
            }
            // Agora, espera todas as promessas serem resolvidas simultaneamente
            const resultados = await Promise.all(todasPromessas);
            resultados.forEach(resultado => {
                if (resultado.error) {
                    console.error(`Bloco ${resultado.index} falhou:`, resultado.error);
                } else {
                    console.log(`Bloco ${resultado.index} completado com sucesso`);
                }
            });
            console.log('Todos os blocos foram processados para todos os id_recepcao!');
        } catch (error) {
            console.error('Erro no processamento:', error);
        }
    }
}
// Uso do processador
const processor = new NotasProcessor();
processor.processarNotasPorRecepcao();