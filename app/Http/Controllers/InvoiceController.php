<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;



class InvoiceController extends Controller
{

    public $phpEndpoint = 'https://atendimento-externo-92095499668.us-east1.run.app/atendimento_externo';
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
            COALESCE(aae.id_ac_exame, 0) AS id_ac_atendimento,
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
        LEFT JOIN ac_atendimentos_exames aae ON (aae.id_recepcao_item  = ri.id_item)
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
                        ])->post($this->phpEndpoint, $bloco);

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


}