<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RecepcaoController;
use App\Http\Controllers\OverbookingController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\AssinaturaController;

// Rota API para buscar dados de recepção
Route::get('/reception', [RecepcaoController::class, 'show']);

// Rota API para buscar escalas de overbooking
Route::get('/overbooking/get_escalas', [OverbookingController::class, 'index']);

// Rota API para reprocessar uma escala de overbooking
Route::post('/overbooking/reprocessar_escala', [OverbookingController::class, 'reprocessar']);

// Rota API para buscar notas fiscais por recepção
Route::get('/invoice/buscar', [InvoiceController::class, 'buscarNotasPorRecepcao']);

// Rota API para buscar notas prontas para processar
Route::get('/invoice/notas-prontas', [InvoiceController::class, 'buscarNotasProntasParaProcessar']);

// Rota API para processar notas fiscais por recepção
Route::post('/invoice/processar', [InvoiceController::class, 'processarNotas']);

// Rota API para enviar notas fiscais por recepção (se necessário)
Route::post('/invoice/enviar', [InvoiceController::class, 'processarNotasPorRecepcao']);

// Rota API para validar se recepção pode emitir NF
Route::get('/invoice/validar-recepcao', [InvoiceController::class, 'validarRecepcaoParaEmissao']);

// Rota API para pegar atendimentos para assinatura
Route::post('/assinatura/atendimentos', [AssinaturaController::class, 'getAtendimentos']);

// Rota API para assinar documentos
Route::post('/assinatura/processar_atendimento', [AssinaturaController::class, 'processarAtendimento']);