<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class AssinaturaController extends Controller
{
    public function getAtendimentos(Request $request)
    {
        date_default_timezone_set('America/Sao_Paulo');
        
        $compararMevo = $request->mevo_filter ?? null;
        $mevo = New FuncoesController();
        $mevoList = $mevo->get_feature_flag('EXIBIR_BOTAO_PRESCRICAO_MEVO');
        $config_json = json_decode($mevoList[0]->config_json);
        $mevoList = $config_json->ids_profissionais;
        
        // Filtrar valores vazios, nulos ou inválidos do array MEVO
        $mevoList = array_filter($mevoList, function($id) {
            return !empty($id) && is_numeric($id) && trim($id) !== '';
        });
        
        // request recebe data ex 2025-11-01 a condição de inicial e final é 00:00:00 e 23:59:59
        $dataParam = $request->data ?? date('Ymd');
        
        $sql = "SELECT a.id_atendimento, a.id_paciente, a.`data`
            FROM documentos_assinaturas da
            INNER JOIN atendimentos a ON a.id_atendimento = da.id_origem
            WHERE da.origem = 'AT'
            AND da.ativo_sn = 'S'
            AND da.status = 'E'
            AND da.documento_assinado IS NULL
            AND a.`data` = ?
        ";

        $params = [$dataParam];

        if ($request->has('mevo_filter')) {
            $placeholders = str_repeat('?,', count($mevoList) - 1) . '?';
            $sql .= " AND a.id_profissional $request->mevo_filter ($placeholders)";
            $params = array_merge($params, array_values($mevoList));
        }

        if ($request->filled('id_profissional')) {
            $sql .= " AND a.id_profissional = ?";
            $params[] = $request->id_profissional;
        }

        $atendimentos = DB::select($sql, $params);
        return $atendimentos;

    }

    public function processarAtendimento(Request $request)
    {
        $idAtendimento = $request->id_atendimento;
        $url = "https://s2.drconsulta.com/print_proxy/?vai=1&id_atendimento=codigo";
        
        $opts = array(
            'http' => array(
                'method' => 'GET',
                'max_redirects' => '0',
                'ignore_errors' => '1'
            )
        );
        $context = stream_context_create($opts);
        
        try {
            $link = str_replace('codigo', $idAtendimento, $url);
            
            // Capturar a resposta da URL
            $response = file_get_contents($link, false, $context);
            
            // Verificar se houve erro na requisição
            if ($response === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro ao acessar a URL',
                    'url' => $link
                ], 500);
            }
            
            // Capturar headers de resposta HTTP
            $httpResponseHeader = $http_response_header ?? [];
            $statusCode = 200;
            
            // Extrair código de status da primeira linha do header
            if (!empty($httpResponseHeader[0])) {
                preg_match('/HTTP\/\d\.\d\s+(\d+)/', $httpResponseHeader[0], $matches);
                if (isset($matches[1])) {
                    $statusCode = (int)$matches[1];
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => "processado com sucesso",
                'url' => $link,
                'response' => $response,
                'status_code' => $statusCode,
                'headers' => $httpResponseHeader
            ]);
            
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'erro: ' . $e->getMessage()
            ], 500);
        }
    }
}