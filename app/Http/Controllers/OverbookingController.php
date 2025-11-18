<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Controllers\FuncoesController;

class OverbookingController extends Controller
{
    public function index()
    {
        $escalas = $this->get_escalas();
        return response()->json($escalas);
    }

    public function get_escalas()
    {
       
        #$dias_pra_frente = 10;
        $dias_pra_frente = 6;

        $escalas = DB::select("
            select e.id_escala, e.id_profissional, e.data, 
             e.slots_ocupados / e.slots_total as ocupacao,
             coalesce(ss.screated,0) as criados 
             from DRC.escalas e
             inner join DRC.profissionais p on p.id_profissional = e.id_profissional and e.ativo_sn = 'S'
             inner join DRC.especialidades es on es.id_especialidade = e.id_especialidade
             left join (select id_escala, count(*) screated 
               from DRC.slots 
               where data > date_format(now(), '%Y%m%d') and data <= date_format( date_add(now(), interval ? day), '%Y%m%d' )
               and id_bloqueio = 1 and overbooked_sn = 'S'
               group by 1
             ) ss on ss.id_escala = e.id_escala
             where e.ativo_sn = 'S'
             and e.data >= '20190130'
             and e.data > date_format(now(), '%Y%m%d') and e.data <= date_format( date_add(now(), interval ? day), '%Y%m%d' )
             and coalesce(p.overbook_sn, es.overbooking_sn, 'N') = 'S'
             and e.minutos >= 120 and e.slots_total >= 6
             and e.slots_ocupados >= e.slots_total * .5
        ", [$dias_pra_frente, $dias_pra_frente]);
        return $escalas;
    }

    public function libera_escala($id_escala, $limite){
        if ( is_numeric($id_escala) && ($id_escala > 0) && is_numeric($limite) && ($limite > 0) ) {
            $response = DB::select("
                select sum(case when overbooked_sn = 'S' then 0 else 1 end) sbase,
                    sum(case when overbooked_sn = 'S' then 1 else 0 end) sover,
                    sum(case when a.id_agenda is not null then coalesce( NULLIF(a.probabilidade_show,0), 1) else 0 end) as ashow,
                    sum(case when a.id_agenda is not null then 1 else 0 end) as atot
                from DRC.escalas e
                inner join DRC.slots s on s.id_escala = e.id_escala and s.id_bloqueio = 0
                left join DRC.agenda a on a.id_agenda = s.id_agenda and a.id_escala = s.id_escala and a.status = 0
                where e.id_escala = ".$id_escala." and e.ativo_sn = 'S'
                and e.stamp_fim > date_add(now(), interval 120 minute)
            ");
            return $response;

            // if ( $bdr->qBD($query) && ($reg = $bdr->obtenerRegA()) ) {
            //     $prob_noshow = floor( $reg['atot'] - $reg['ashow'] );
            //     $max_over = floor($reg['sbase'] * $limite);

                
            //     if ( $reg['sover'] < $max_over ) {
            //         // pode liberar mais slots
            //         $liberar = ($prob_noshow - $reg['sover']) > ($max_over - $reg['sover']) ? $max_over - $reg['sover'] : ($prob_noshow - $reg['sover']);
            //         if(is_numeric($liberar) && $liberar == 0){
            //             return 0;
            //         }
            //         if ( ($liberar > 0) && ($liberar <= ($max_over - $reg['sover'])) ) {
            //             $retorno = $liberar;
            //         }
            //     }
            // }
        }
            //return array($prob_noshow, $max_over, $this->limite, $reg, $liberar, $retorno);
    }

    public function reprocessar(Request $request)
    {
        $escala = (object)[
            'id_escala' => $request->input('id_escala'),
            'data' => $request->input('data'),
            'id_profissional' => $request->input('id_profissional'),
            'criados' => $request->input('criados'),
            'ocupacao' => $request->input('ocupacao'),
        ];
        $feature = new FuncoesController();
        $ff = $feature->get_feature_flag('MODELO_OVERBOOKING');
        $config_json = !empty($ff[0]->config_json) ? $ff[0]->config_json : '{}';
        $json = json_decode($config_json, true);
        $minimo = 0.75;
        if(!empty($json['percentil_liberar'])) {
            $minimo = $json['percentil_liberar'];
        }
        // foreach ( $escalas as $escala ) {
            try {
                $params = array( 'id_escala' => $escala->id_escala, 'data' => $escala->data, 'id_profissional' => $escala->id_profissional );
                if ( $escala->criados == 0 ) {
                    // criar slots se ainda nao foram criados
                    $ret = (new FuncoesController())->metodo('v01', 'escala', 'criar_slots_overbooking', $params);
                }
                if ( $escala->ocupacao >= $minimo ) {
                    // liberar slots
                    $ret = (new FuncoesController())->metodo('v01', 'overbooking', 'update', $params);
                }
                return $ret;
            } catch (\Exception $e) {
                // Log de erro 
                \Log::error("Erro ao processar escala $escala->id_escala: ".$e->getMessage());
                print date('Y-m-d H:i:s')." - Erro ao processar escala $escala->id_escala: ".$e->getMessage()."\n";
                return false;
            }
            
        // }
    }
}
