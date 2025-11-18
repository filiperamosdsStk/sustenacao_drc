<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReceptionApiTest extends TestCase
{
    public function test_api_reception_route_exists_and_returns_200()
    {
        $response = $this->get('/api/reception?id_recepcao=1');
        $response->assertStatus(200);
    }
}
