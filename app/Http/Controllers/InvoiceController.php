<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;



class InvoiceController extends Controller
{

    public $phpEndpoint = 'https://atendimento-externo-92095499668.us-east1.run.app/atendimento_externo';
    public $phpEnviaNota = 'https://enviar-nota-fiscal-oracle-92095499668.us-east1.run.app/enviar_nota_fiscal';
    public $token = 'iGgYzfRHMeXM8yoJukY5iT0Z5aw';

    public function processarNotas(Request $request)
    {
        $notas = $this->buscarNotasPorRecepcao($request);
        if (empty($notas)) {
            return response()->json(['status' => 'Nenhuma nota para processar.']);
        }
        // Divide em blocos de 50
        $blocos = array_chunk($notas, 50);

        $client = new \GuzzleHttp\Client();

        foreach ($blocos as $index => $bloco) {
            try {
                $response = $client->post($this->phpEndpoint, [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'Authorization' => 'Bearer ' . $this->token,
                    ],
                    'body' => json_encode($bloco),
                    'timeout' => 60,
                ]);
                $body = $response->getBody()->getContents();
                Log::info("Bloco " . ($index + 1) . " processado", ['response' => $body]);
            } catch (\Exception $e) {
                Log::error("Erro no bloco " . ($index + 1) . ": " . $e->getMessage());
            }
        }

        return response()->json(['status' => 'Processamento concluído', 'blocos' => count($blocos)]);
    }

    public function buscarNotasPorRecepcao(Request $request)
    {
        $id_recepcao = $request->id_recepcao;
         $sql = "SELECT
            ri.id_item AS id_recepcao_item,
            ri.id_recepcao,
            COALESCE(ri.id_executante, 0) AS id_executante,
            ri.valor,
            ri.id_invoice_oracle,
            ri.id_produto,
            p.produto AS descricao,
            p.id_item_erp,
            u.id_unidade,
            oru.codigo_servico_municipio AS cod_servico,
            COALESCE(ri.id_solicitante, 0) AS id_solicitante,
            u.id_unidade,
            ri.id_convenio,
            u.sigla,
            a.id_atendimento,
            -- COALESCE(aae.id_ac_exame, 0) AS id_ac_atendimento,
            p.grupo AS grupo_produto,
            ri.id_recepcao AS ordem_venda,
            ri.id_paciente,
            0 AS credito_sn,
            '' AS nsu,
            '' AS codigo_autorizacao,
            '' AS adquirente,
            '' AS bandeira,
            'SERVIÇOS PRESTADOS' AS memolineName,
            'S' AS atendimento_em_sala,
            'A Vista' AS payment_terms,
            u.sigla AS sigla_unidade
        FROM recepcao_itens ri
        INNER JOIN recepcao r ON (ri.id_recepcao = r.id_recepcao
            AND r.ativo_sn = 'S'
            AND r.cobrado_sn = 'S'
            AND r.cancelado_sn <> 'S')
        INNER JOIN datas dt ON dt.data = r.data
        LEFT JOIN atendimentos a ON (a.id_recepcao_item = ri.id_item)
        LEFT JOIN atendimentos_stamps as2 ON (a.id_atendimento = as2.id_atendimento)
        -- LEFT JOIN ac_atendimentos_exames aae ON (aae.id_recepcao_item  = ri.id_item)
        LEFT JOIN executantes e ON ( e.id_executante = ri.id_executante)
        LEFT JOIN produtos p ON ( p.id_produto = ri.id_produto)
        LEFT JOIN unidades u ON (u.id_unidade = ri.id_unidade)
        LEFT JOIN oracle_unidades_servicos oru on (oru.id_unidade = r.id_clinica or oru.id_unidade_oracle = u.id_unidade_oracle) AND p.grupo = oru.grupo
        WHERE
            ri.ativo_sn = 'S'
            AND ri.recoleta_sn != 'S'
            AND ri.id_recepcao = :id_recepcao
            AND ri.id_invoice_oracle IS NULL
            AND (ri.valor - ri.valor_desconto) > 0
            AND (ri.id_convenio = 6 OR ri.id_convenio = 0 OR ri.id_convenio IS NULL)
        ORDER BY ri.id_recepcao ASC
        LIMIT 1500";

        $notas = DB::select($sql, ['id_recepcao' => $id_recepcao]);
        return $notas;
    }
    
    public function countNotasByRecepcao($id_recepcao)
    {
        $sql = "
            SELECT id_recepcao, COUNT(*) AS total_notas
            FROM emissao_notas_fiscais
            WHERE id_recepcao = ?
            AND sigla <> 'TABO'
            AND status = 'NAO_EMITIDO'
            GROUP BY id_recepcao
        ";

        return DB::select($sql, [$id_recepcao]);
    }

    public function processarNotasPorRecepcao(Request $request)
    {
        $id_recepcao = $request->id_recepcao;
        try {

            Log::info('Contando notas por id_recepcao...');
            $notasCount = $this->countNotasByRecepcao($id_recepcao);

            Log::info(count($notasCount) . ' ids de recepção encontrados');

            $resultados = [];

            foreach ($notasCount as $row) {

                $idRecepcao = $row->id_recepcao;
                $totalNotas = $row->total_notas;

                Log::info("Processando notas para id_recepcao: $idRecepcao com $totalNotas notas");

                // Buscar as notas
                $notas = $this->getNotasFromDBByRecepcao($idRecepcao);

                Log::info(count($notas) . " notas encontradas para id_recepcao $idRecepcao");

                // Criar blocos (aqui o bloco contém todas as notas desse id)
                $blocos = array_chunk($notas, $totalNotas);

                Log::info("Enviando " . count($blocos) . " blocos para id_recepcao $idRecepcao");

                foreach ($blocos as $index => $bloco) {

                    try {

                        $response = Http::withHeaders([
                            'Authorization' => 'Bearer iGgYzfRHMeXM8yoJukY5iT0Z5aw'
                        ])->post($this->phpEnviaNota, $bloco);

                        Log::info("Bloco " . ($index + 1) . " processado para id_recepcao $idRecepcao");

                        $resultados[] = [
                            'index' => $index + 1,
                            'response' => $response->body()
                        ];

                    } catch (\Exception $e) {

                        Log::error("Erro no bloco " . ($index + 1) . " para id_recepcao $idRecepcao: " . $e->getMessage());

                        $resultados[] = [
                            'index' => $index + 1,
                            'error' => $e->getMessage()
                        ];
                    }
                }
            }

            return $resultados;

        } catch (\Exception $e) {
            Log::error('Erro no processamento: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    public function getNotasFromDBByRecepcao($id_recepcao)
    {
        $sql = "
            SELECT *
            FROM emissao_notas_fiscais
            WHERE sigla <> 'TABO'
            AND status = 'NAO_EMITIDO'
            AND account_number IS NOT NULL
            AND id_recepcao = ?
        ";

        return DB::select($sql, [$id_recepcao]);
    }

    public function buscarNotasProntasParaProcessar(Request $request)
    {
        $id_recepcao = $request->id_recepcao;
        
        $sql = "
            SELECT *
            FROM emissao_notas_fiscais
            WHERE sigla <> 'TABO'
            AND status = 'NAO_EMITIDO'
            AND account_number IS NOT NULL
            AND id_recepcao = ?
        ";

        $notas = DB::select($sql, [$id_recepcao]);
        
        return response()->json([
            'notas' => $notas,
            'total' => count($notas),
            'status' => count($notas) > 0 ? 'ready' : 'none'
        ]);
    }

    public function validarRecepcaoParaEmissao(Request $request)
    {
        $idRecepcao = $request->query('id_recepcao');

        if (!$idRecepcao) {
            return response()->json(['error' => 'id_recepcao é obrigatório'], 422);
        }

        $recepcaoRows = DB::select(
            "SELECT
                r.id_recepcao,
                r.id_paciente,
                COALESCE(r.responsavel_cpf, '00000000000') AS responsavel_cpf,
                COALESCE(p.cpf, '00000000000') AS cpf_paciente,
                p.nome AS nome_paciente,
                r.id_convenio,
                r.id_clinica AS id_unidade,
                r.ativo_sn,
                r.cancelado_sn,
                r.cobrado_sn,
                r.stamp_fim
            FROM recepcao r
            INNER JOIN pacientes p ON p.id_paciente = r.id_paciente
            WHERE r.id_recepcao = ?
            LIMIT 1",
            [$idRecepcao]
        );

        if (empty($recepcaoRows)) {
            return response()->json([
                'apta_emissao' => false,
                'motivos_bloqueio' => ['Recepção não encontrada'],
            ], 404);
        }

        $recepcao = (array) $recepcaoRows[0];
        $motivosBloqueio = [];

        if (($recepcao['ativo_sn'] ?? null) !== 'S') {
            $motivosBloqueio[] = 'Recepção inativa';
        }
        if (($recepcao['cancelado_sn'] ?? null) === 'S') {
            $motivosBloqueio[] = 'Recepção cancelada';
        }
        if (($recepcao['cobrado_sn'] ?? null) !== 'S') {
            $motivosBloqueio[] = 'Recepção não está cobrada/paga';
        }
        if (empty($recepcao['stamp_fim'])) {
            $motivosBloqueio[] = 'Atendimento não está encerrado (stamp_fim vazio)';
        }

        $b2bRows = DB::select(
            "SELECT DISTINCT b.id_convenio
            FROM recepcao a
            INNER JOIN recepcao_itens b
                ON b.id_recepcao = a.id_recepcao
                AND b.ativo_sn = 'S'
                AND b.cancelado_sn != 'S'
                AND (b.id_invoice_oracle IS NULL OR b.id_invoice_oracle = '')
                AND b.valor > 0.01
                AND b.recoleta_sn != 'S'
                AND (b.id_item_credito = 0 OR b.id_item_credito IS NULL)
                AND (b.valor - b.valor_desconto) > 0
                AND EXISTS (
                    SELECT 1
                    FROM convenios_contratos_tabpreco cct
                    INNER JOIN convenios_contratos cco
                        ON cct.id_contrato = cco.id_contrato
                        AND cco.coparticipacao_sn = 'S'
                    WHERE cct.id_convenio_tabpreco = b.id_convenio_tabpreco
                )
                AND EXISTS (
                    SELECT 1
                    FROM recepcao_cobranca rc
                    WHERE rc.id_recepcao = a.id_recepcao
                      AND rc.id_metodo NOT IN (4, 5, 10)
                )
            INNER JOIN produtos p ON p.id_produto = b.id_produto AND p.retorno = 0
            WHERE a.id_recepcao = ?
              AND a.ativo_sn = 'S'
              AND a.cancelado_sn != 'S'
              AND a.cobrado_sn = 'S'",
            [$idRecepcao]
        );

        $b2cRows = DB::select(
            "SELECT COUNT(*) AS cnt
            FROM recepcao_itens
            WHERE ativo_sn = 'S'
              AND cancelado_sn != 'S'
              AND COALESCE(id_convenio, 0) = 0
              AND id_recepcao = ?",
            [$idRecepcao]
        );
        $temB2c = ((int) (($b2cRows[0]->cnt ?? 0))) > 0;

        $itensElegiveis = DB::select(
            "SELECT DISTINCT
                r.id_recepcao,
                ri.id_item AS id_recepcao_item,
                ri.id_produto,
                ri.id_prevenda,
                p.produto AS nome_produto,
                p.grupo AS grupo_produto,
                p.id_item_erp,
                oru.codigo_servico_municipio AS cod_servico,
                ri.id_convenio,
                ri.valor,
                ri.valor_desconto,
                ri.id_executante,
                ex.tipo AS tipo_executante,
                ri.oracle_sequencial,
                ri.id_invoice_oracle,
                r.data AS data_recepcao
            FROM recepcao r
            INNER JOIN recepcao_itens ri
                ON ri.id_recepcao = r.id_recepcao
               AND ri.ativo_sn = 'S'
               AND ri.cancelado_sn != 'S'
               AND ri.valor > 0
            INNER JOIN produtos p ON p.id_produto = ri.id_produto
            INNER JOIN unidades u ON u.id_unidade = r.id_clinica
            INNER JOIN oracle_unidades_servicos oru
                ON (oru.id_unidade = r.id_clinica OR oru.id_unidade_oracle = u.id_unidade_oracle)
               AND p.grupo = oru.grupo
            LEFT JOIN atendimentos at ON at.id_recepcao_item = ri.id_item
            LEFT JOIN atendimentos_stamps ats ON ats.id_atendimento = at.id_atendimento
            LEFT JOIN ac_atendimentos_exames aae ON aae.id_recepcao_item = ri.id_item
            LEFT JOIN executantes ex ON ex.id_executante = ri.id_executante
            WHERE r.id_recepcao = ?
              AND r.ativo_sn = 'S'
              AND r.cancelado_sn != 'S'
              AND r.cobrado_sn = 'S'
              AND r.stamp_fim IS NOT NULL
              AND (
                    ats.st_consulta_fim IS NOT NULL
                    OR COALESCE(aae.status, 'P') != 'P'
                    OR ex.tipo IN ('E')
                    OR p.realiza_em_sala_sn = 'S'
              )
              AND ri.id_produto NOT IN (9462, 9463, 9464, 9465, 9466, 9467, 9610, 9611)
              AND ri.oracle_sequencial IS NULL
              AND ri.id_invoice_oracle IS NULL
            ORDER BY ri.id_convenio, ri.id_prevenda ASC, r.id_recepcao, r.data DESC",
            [$idRecepcao]
        );

        if (empty($itensElegiveis)) {
            $motivosBloqueio[] = 'Nenhum item elegível para faturamento (filtros de emissão)';
        }

        $itensJaEmitidos = DB::select(
            "SELECT COUNT(*) AS total
            FROM recepcao_itens
            WHERE id_recepcao = ?
              AND id_invoice_oracle IS NOT NULL
              AND id_invoice_oracle != ''",
            [$idRecepcao]
        );

        $totalItensElegiveis = count($itensElegiveis);
        $totalItensJaEmitidos = (int) ($itensJaEmitidos[0]->total ?? 0);

        if ($totalItensElegiveis === 0 && $totalItensJaEmitidos > 0) {
            $motivosBloqueio[] = 'Itens já possuem NF emitida no Oracle';
        }

        $aptaEmissao = empty($motivosBloqueio);

        $itensDiagnosticoRows = DB::select(
            "SELECT
                ri.id_item AS id_recepcao_item,
                ri.id_recepcao,
                ri.id_produto,
                p.produto AS nome_produto,
                p.grupo AS grupo_produto,
                ri.id_convenio,
                ri.valor,
                ri.valor_desconto,
                ri.ativo_sn,
                ri.cancelado_sn,
                ri.recoleta_sn,
                ri.id_item_credito,
                ri.oracle_sequencial,
                ri.id_invoice_oracle,
                r.ativo_sn AS recepcao_ativa_sn,
                r.cancelado_sn AS recepcao_cancelado_sn,
                r.cobrado_sn AS recepcao_cobrado_sn,
                r.stamp_fim AS recepcao_stamp_fim,
                p.realiza_em_sala_sn,
                ex.tipo AS tipo_executante,
                ats.st_consulta_fim,
                aae.status AS status_ac,
                oru.codigo_servico_municipio AS cod_servico,
                CONCAT_WS('; ',
                    IF(r.ativo_sn != 'S', 'recepção inativa', NULL),
                    IF(r.cancelado_sn = 'S', 'recepção cancelada', NULL),
                    IF(r.cobrado_sn != 'S', 'recepção não cobrada/paga', NULL),
                    IF(r.stamp_fim IS NULL, 'recepção sem encerramento (stamp_fim)', NULL),
                    IF(ri.ativo_sn != 'S', 'item inativo', NULL),
                    IF(ri.cancelado_sn = 'S', 'item cancelado', NULL),
                    IF(ri.recoleta_sn = 'S', 'item marcado como recoleta', NULL),
                    IF((ri.valor - ri.valor_desconto) <= 0, 'valor líquido <= 0', NULL),
                    IF(ri.id_produto IN (9462, 9463, 9464, 9465, 9466, 9467, 9610, 9611), 'produto não gera NF', NULL),
                    IF(
                        ri.oracle_sequencial IS NOT NULL,
                        CONCAT('item já possui RPS (oracle_sequencial: ', ri.oracle_sequencial, ')'),
                        NULL
                    ),
                    IF(ri.id_invoice_oracle IS NOT NULL AND ri.id_invoice_oracle != '', 'item já possui NF no Oracle', NULL),
                    IF(oru.codigo_servico_municipio IS NULL OR oru.codigo_servico_municipio = '', 'sem cadastro em oracle_unidades_servicos (grupo/unidade)', NULL),
                    IF(
                        NOT (
                            ats.st_consulta_fim IS NOT NULL
                            OR COALESCE(aae.status, 'P') != 'P'
                            OR ex.tipo IN ('E')
                            OR p.realiza_em_sala_sn = 'S'
                        ),
                        'item não atende regra de elegibilidade (consulta/exame/externo/sala)',
                        NULL
                    )
                ) AS motivo_nao_elegivel
            FROM recepcao_itens ri
            INNER JOIN recepcao r ON r.id_recepcao = ri.id_recepcao
            INNER JOIN produtos p ON p.id_produto = ri.id_produto
            INNER JOIN unidades u ON u.id_unidade = r.id_clinica
            LEFT JOIN atendimentos at ON at.id_recepcao_item = ri.id_item
            LEFT JOIN atendimentos_stamps ats ON ats.id_atendimento = at.id_atendimento
            LEFT JOIN ac_atendimentos_exames aae ON aae.id_recepcao_item = ri.id_item
            LEFT JOIN executantes ex ON ex.id_executante = ri.id_executante
            LEFT JOIN oracle_unidades_servicos oru
                ON (oru.id_unidade = r.id_clinica OR oru.id_unidade_oracle = u.id_unidade_oracle)
               AND p.grupo = oru.grupo
            WHERE ri.id_recepcao = ?
            ORDER BY ri.id_item",
            [$idRecepcao]
        );

        $itensNaoElegiveis = array_values(array_filter(array_map(function ($row) {
            $item = (array) $row;
            $motivos = array_values(array_filter(array_map('trim', explode(';', (string) ($item['motivo_nao_elegivel'] ?? '')))));
            if (empty($motivos)) {
                return null;
            }

            return [
                'id_recepcao_item' => (int) $item['id_recepcao_item'],
                'id_produto' => (int) $item['id_produto'],
                'nome_produto' => $item['nome_produto'],
                'grupo_produto' => $item['grupo_produto'],
                'motivos' => $motivos,
            ];
        }, $itensDiagnosticoRows)));

        $sqlDiagnostico = "SELECT
    ri.id_item AS id_recepcao_item,
    ri.id_recepcao,
    ri.id_produto,
    p.produto AS nome_produto,
    r.ativo_sn AS recepcao_ativa_sn,
    r.cancelado_sn AS recepcao_cancelado_sn,
    r.cobrado_sn AS recepcao_cobrado_sn,
    r.stamp_fim AS recepcao_stamp_fim,
    ri.ativo_sn,
    ri.cancelado_sn,
    ri.recoleta_sn,
    ri.valor,
    ri.valor_desconto,
    ri.oracle_sequencial,
    ri.id_invoice_oracle,
    p.realiza_em_sala_sn,
    ex.tipo AS tipo_executante,
    ats.st_consulta_fim,
    aae.status AS status_ac,
    oru.codigo_servico_municipio AS cod_servico,
    CASE
        WHEN r.ativo_sn <> 'S' THEN 'BLOQ: recepção inativa'
        WHEN r.cancelado_sn = 'S' THEN 'BLOQ: recepção cancelada'
        WHEN r.cobrado_sn <> 'S' THEN 'BLOQ: recepção não cobrada/paga'
        WHEN r.stamp_fim IS NULL THEN 'BLOQ: recepção sem encerramento'
        WHEN ri.ativo_sn <> 'S' THEN 'BLOQ: item inativo'
        WHEN ri.cancelado_sn = 'S' THEN 'BLOQ: item cancelado'
        WHEN ri.recoleta_sn = 'S' THEN 'BLOQ: item marcado como recoleta'
        WHEN (ri.valor - ri.valor_desconto) <= 0 THEN 'BLOQ: valor líquido <= 0'
        WHEN ri.id_produto IN (9462, 9463, 9464, 9465, 9466, 9467, 9610, 9611) THEN 'BLOQ: produto não gera NF'
        WHEN ri.oracle_sequencial IS NOT NULL THEN CONCAT('BLOQ: item já possui RPS (oracle_sequencial: ', ri.oracle_sequencial, ')')
        WHEN ri.id_invoice_oracle IS NOT NULL AND ri.id_invoice_oracle <> '' THEN 'BLOQ: item já possui NF no Oracle'
        WHEN oru.codigo_servico_municipio IS NULL OR oru.codigo_servico_municipio = '' THEN 'BLOQ: sem cadastro em oracle_unidades_servicos'
        WHEN NOT (
            ats.st_consulta_fim IS NOT NULL
            OR COALESCE(aae.status, 'P') <> 'P'
            OR ex.tipo = 'E'
            OR p.realiza_em_sala_sn = 'S'
        ) THEN 'BLOQ: não atende regra consulta/exame/externo/sala'
        ELSE 'ELEGIVEL'
    END AS diagnostico
FROM recepcao_itens ri
INNER JOIN recepcao r ON r.id_recepcao = ri.id_recepcao
INNER JOIN produtos p ON p.id_produto = ri.id_produto
INNER JOIN unidades u ON u.id_unidade = r.id_clinica
LEFT JOIN atendimentos at ON at.id_recepcao_item = ri.id_item
LEFT JOIN atendimentos_stamps ats ON ats.id_atendimento = at.id_atendimento
LEFT JOIN ac_atendimentos_exames aae ON aae.id_recepcao_item = ri.id_item
LEFT JOIN executantes ex ON ex.id_executante = ri.id_executante
LEFT JOIN oracle_unidades_servicos oru
    ON (oru.id_unidade = r.id_clinica OR oru.id_unidade_oracle = u.id_unidade_oracle)
   AND p.grupo = oru.grupo
WHERE ri.id_recepcao = {$idRecepcao}
ORDER BY ri.id_item;";

        return response()->json([
            'id_recepcao' => (int) $idRecepcao,
            'apta_emissao' => $aptaEmissao,
            'motivos_bloqueio' => array_values(array_unique($motivosBloqueio)),
            'resumo' => [
                'total_itens_elegiveis' => $totalItensElegiveis,
                'total_itens_ja_emitidos' => $totalItensJaEmitidos,
                'tem_fluxo_b2b' => count($b2bRows) > 0,
                'tem_fluxo_b2c' => $temB2c,
                'convenios_b2b' => array_values(array_map(
                    fn ($row) => (int) $row->id_convenio,
                    $b2bRows
                )),
            ],
            'dados_recepcao' => $recepcao,
            'itens_para_emissao' => $itensElegiveis,
            'itens_nao_elegiveis' => $itensNaoElegiveis,
            'sql_diagnostico' => $sqlDiagnostico,
        ]);
    }


}