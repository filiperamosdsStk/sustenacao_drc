<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\RecepcaoController;
use App\Http\Controllers\OverbookingController;
use App\Http\Controllers\InvoiceController;

Route::get('/', function () {
    return Inertia::render('home');
})->name('home');

Route::get('/recepcao', function () {
    return Inertia::render('recepcao/index');
})->name('recepcao.index');

Route::get('/overbooking', function () {
    return Inertia::render('overbooking/index');
})->name('overbooking.index');

Route::get('/assinatura', function () {
    return Inertia::render('assinatura/index');
})->name('assinatura.index');

Route::get('/invoice/validacao', function () {
    return Inertia::render('invoice/validation');
})->name('invoice.validation');