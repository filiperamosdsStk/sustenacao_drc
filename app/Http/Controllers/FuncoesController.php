<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class FuncoesController extends Controller
{
    private $erro;
    private $host;
    private $user;
    private $pass;
    private $port;

    public function __construct($host='',$user='',$pass='',$port='') {
        $this->erro = '';
        //
        $this->host = $host != '' ? $host : env('__WS_SERV__');
        $this->user = $user != '' ? $user : env('__WS_USER__');
        $this->pass = $pass != '' ? $pass : env('__WS_PASS__');
        $this->port = $port != '' ? $port : env('__WS_PORT__');
    } 

    public function get_feature_flag($feature)
    {
        $result = DB::select("
            SELECT * FROM feature_flag WHERE ativo_sn = 'S' AND feature = ?
        ", [$feature]);
        return $result;
    }

    function metodo($versao, $modulo, $metodo, $parametros, $params_get = null) {
        global $userX;
        $retorno = false;
        $usr_id = isset($userX) ? $userX->getidusuario() : 0;

        try {
            $ver = preg_match('/^v[0-9][0-9]$/i',$versao)   ? strtolower($versao) : 'v01';
            $mod = preg_match('/^[0-9a-zA-Z_]+$/i',$modulo) ? strtolower($modulo) : '';
            $met = preg_match('/^[0-9a-zA-Z_]+$/i',$metodo) ? strtolower($metodo) : '';

            $parametros['id_usuario'] = $usr_id;

            if ( ($mod != '') && ($met != '') ) {
                $url  = 'https://'.$this->user.':'.$this->pass.'@'.$this->host.$this->port."/$ver/$mod/$met";
                //$url  = 'https://'.__WS_USER__.':'.__WS_PASS__.'@'.__WS_SERV__.__WS_PORT__."/$ver/$mod/$met";

                if ( is_array($params_get) ) {
                    for (reset($params_get); list($a,$b) = each($params_get); ) {
                    if (!preg_match('/^[0-9a-zA-Z]$/', $b)) {
                        $this->erro = "Parametro [$b] invalido";
                        return false;
                    }
                    $url .=  '/'.$b;
                    }
                }

                $curl = curl_init();

                //curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, 0);
                //curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);
                //curl_setopt($curl, CURLOPT_HTTPHEADER, array( 'Authorization: '. $this->token_type . ' ' . $this->token_str, 'Content-Type: application/x-www-form-urlencoded' ) );
                curl_setopt($curl, CURLOPT_URL, $url);
                curl_setopt($curl, CURLOPT_POST, true);
                curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($parametros));

                curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

                if ($result = curl_exec($curl)) {
                    $header_size = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
                    $header      = substr($result, 0, $header_size);
                    $status      = curl_getinfo($curl, CURLINFO_HTTP_CODE);

                    if ($status == 200) {
                        $ret = json_decode($result);

                        if ( $ret ) {
                            if ( isset($ret->code) && is_numeric($ret->code) && ($ret->code == 200) && isset($ret->data) ) {
                            $retorno = $ret->data;
                            }
                            else {
                            $this->erro = isset($ret->data) ? (isset($ret->data->erro) ? $ret->data->erro : $ret->data) : 'Erro '.$ret->code;
                            }
                        }
                    }else {
                        $ret2 = json_decode($result);
                        if (isset($ret2) && isset($ret2->status) && ($ret2->status > 200) ) {
                            $this->erro = $ret2->data;
                        }
                    }
                }
            }
        }catch (Exception $e) { 
            print_r($e); 
        }
        return $retorno;
    }
}
