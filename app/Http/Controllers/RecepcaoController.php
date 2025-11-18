<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RecepcaoController extends Controller
{
    /**
     * Busca dados de uma recepção pelo id_recepcao.
     */
    public function show(Request $request)
    {
        $id_recepcao = $request->input('id_recepcao');
        if (!$id_recepcao) {
            return response()->json(['error' => 'id_recepcao é obrigatório'], 400);
        }

        $dados = DB::select('
            select 
                ri.id_item,
                ri.id_recepcao,
                ri.id_paciente,
                ri.stamp_created,
                ri.ativo_sn,
                ri.cancelado_sn,
                ri.id_convenio,
                ri.valor,
                ri.id_item_credito,
                ri.id_invoice_oracle,
                ri.oracle_sequencial,
                u.unidade,
                p.produto 
            from recepcao_itens ri 
            inner join produtos p on p.id_produto = ri.id_produto 
            inner join unidades u on ri.id_unidade = u.id_unidade 
            where 
                ri.id_recepcao = ?
                and ri.ativo_sn = ?
        ', [$id_recepcao, 'S']);

        return response()->json($dados);
    }
}
