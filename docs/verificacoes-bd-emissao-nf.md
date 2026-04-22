# Verificações de Banco de Dados para Emissão de Nota Fiscal

> **Fonte:** `classes/class_oracle.php` — método público `faturar($id_recepcao)`
> **Data de análise:** 2026-04-22

---

## Visão Geral do Fluxo

```
faturar()
  ├── _get_recepcao_faturar()         → valida se a recepção está apta
  ├── _verifica_b2b()                 → há itens de convênio (coparticipação)?
  ├── _verifica_b2c()                 → há itens de paciente pessoa física?
  │
  ├── [B2B] faturar_b2b($id_convenio)
  │     └── get_recepcao_itens_faturar()
  │           └── gerar_notas()
  │                 ├── verificar_amostra_ac_enviada()
  │                 ├── verificar_voucher_externo_consumido()
  │                 └── verificar_procedimento_realizado()
  │
  └── [B2C] faturar_b2c()
        ├── recuperar_id_invoice_oracle()
        ├── paciente_cpf_cep_desatualizado()  [feature flag ORACLE_SYNC_PACIENTE]
        ├── get_recepcao_itens_faturar()
        └── gerar_notas()
              ├── verificar_amostra_ac_enviada()
              ├── verificar_voucher_externo_consumido()
              └── verificar_procedimento_realizado()
```

---

## 1. `_get_recepcao_faturar()` — Verifica se a recepção pode ser faturada

**Tabelas:** `recepcao`, `pacientes`, `recepcao_itens`, `produtos`, `atendimentos`, `atendimentos_stamps`, `ac_atendimentos_exames`, `executantes`

**Query principal:**
```sql
SELECT DISTINCT r.id_recepcao, r.id_paciente,
       COALESCE(r.responsavel_cpf,'00000000000') AS responsavel_cpf,
       COALESCE(p.cpf,'00000000000') AS cpf,
       p.nome, r.id_convenio, r.id_clinica AS id_unidade
FROM recepcao r
INNER JOIN pacientes p ON p.id_paciente = r.id_paciente
LEFT JOIN recepcao_itens RC ON RC.id_recepcao = r.id_recepcao AND RC.id_motivo_credito IS NULL
LEFT JOIN produtos PRO ON PRO.id_produto = RC.id_produto
LEFT JOIN atendimentos at ON at.id_recepcao_item = RC.id_item
LEFT JOIN atendimentos_stamps at_s ON at_s.id_atendimento = at.id_atendimento
LEFT JOIN ac_atendimentos_exames ac_at ON ac_at.id_recepcao_item = RC.id_item
LEFT JOIN executantes exc ON exc.id_executante = RC.id_executante
WHERE r.ativo_sn = 'S'
  AND r.cancelado_sn != 'S'
  AND r.cobrado_sn = 'S'              -- recepção deve estar paga
  AND r.stamp_fim IS NOT NULL         -- atendimento encerrado
  AND (
    PRO.id_produto IN (<exames_sensiveis>)  -- lista via feature flag EMISSAO_NOTA_FISCAL_EXAMES_SENSIVEIS
    OR at_s.st_consulta_fim IS NOT NULL     -- consulta finalizada
    OR ac_at.status != 'P'                  -- exame AC não está mais pendente
    OR exc.tipo IN ('E')                    -- executante externo
    OR PRO.realiza_em_sala_sn = 'S'         -- procedimento realizado em sala
  )
  AND r.id_recepcao = {id_recepcao}
```

**Condições obrigatórias para continuar:**
| Condição | Campo | Valor esperado |
|----------|-------|----------------|
| Recepção ativa | `recepcao.ativo_sn` | `'S'` |
| Recepção não cancelada | `recepcao.cancelado_sn` | diferente de `'S'` |
| Recepção cobrada | `recepcao.cobrado_sn` | `'S'` |
| Atendimento encerrado | `recepcao.stamp_fim` | `NOT NULL` |
| Pelo menos 1 item apto | condição OR acima | deve retornar ao menos 1 linha |

**Após obter o resultado — validação de CPF (feature flag `OBRIGATORIEDADE_CPF`):**
- Se a feature flag está **parcialmente ativa**: usa CPF da unidade (`pacientes.cpf`) apenas para unidades listadas; caso contrário usa `responsavel_cpf`.
- Se a feature flag está **totalmente ativa**: usa `pacientes.cpf` para todas as unidades.

---

## 2. `_verifica_b2b()` — Verifica itens de convênio (coparticipação)

**Tabelas:** `recepcao`, `recepcao_itens`, `convenios_contratos_tabpreco`, `convenios_contratos`, `recepcao_cobranca`, `produtos`

```sql
SELECT DISTINCT b.id_convenio, b.id_recepcao
FROM recepcao a
INNER JOIN recepcao_itens b FORCE INDEX FOR JOIN (idx_recepcao_itens_243)
       ON b.id_recepcao = a.id_recepcao AND b.ativo_sn = 'S'
       AND EXISTS (
           SELECT 1 FROM DRC.convenios_contratos_tabpreco cct
           INNER JOIN convenios_contratos cco ON cct.id_contrato = cco.id_contrato
                                              AND cco.coparticipacao_sn = 'S'  -- convênio exige coparticipação
           WHERE cct.id_convenio_tabpreco = b.id_convenio_tabpreco
       )
       AND EXISTS (
           SELECT 1 FROM DRC.recepcao_cobranca rc
           WHERE rc.id_recepcao = a.id_recepcao
             AND rc.id_metodo NOT IN (4, 5, 10)  -- exclui métodos: 4=cortesia, 5=desconto, 10=?
       )
       AND b.cancelado_sn != 'S'
       AND (b.id_invoice_oracle IS NULL OR b.id_invoice_oracle = '')  -- ainda não faturado
INNER JOIN produtos p ON p.id_produto = b.id_produto AND p.retorno = 0  -- não é retorno
WHERE a.ativo_sn = 'S' AND a.cancelado_sn != 'S' AND a.cobrado_sn = 'S'
  AND b.valor > 0.01                   -- item com valor positivo
  AND b.recoleta_sn != 'S'             -- não é recoleta
  AND (b.id_item_credito = 0 OR b.id_item_credito IS NULL)  -- não é crédito
  AND (b.valor - b.valor_desconto) > 0 -- valor líquido positivo
  AND a.id_recepcao = {id_recepcao}
```

**Resultado:** lista de convênios distintos com itens elegíveis. Se vazia, não há faturamento B2B.

---

## 3. `_verifica_b2c()` — Verifica itens de pessoa física (sem convênio)

**Tabela:** `recepcao_itens`

```sql
SELECT count(*) cnt
FROM recepcao_itens
WHERE ativo_sn = 'S'
  AND cancelado_sn != 'S'
  AND COALESCE(id_convenio, 0) = 0   -- sem convênio vinculado
  AND id_recepcao = {id_recepcao}
```

**Resultado:** se `cnt > 0`, existe ao menos 1 item B2C para faturar.

---

## 4. `get_recepcao_itens_faturar()` — Lista os itens elegíveis para a NF

**Tabelas:** `recepcao`, `recepcao_itens`, `produtos`, `unidades`, `oracle_unidades_servicos`, `atendimentos`, `atendimentos_stamps`, `ac_atendimentos_exames`, `executantes`

```sql
SELECT DISTINCT r.id_recepcao,
       ri.id_item AS id_recepcao_item,
       ri.id_executante, ri.id_produto,
       oru.codigo_servico_municipio AS cod_servico,
       pr.id_item_erp,
       ri.id_convenio,
       COALESCE(ri.oracle_sequencial, NULL) AS oracle_sequencial,
       COALESCE(ri.id_invoice_oracle, NULL)  AS id_invoice_oracle,
       exc.id_executante
FROM recepcao r
INNER JOIN recepcao_itens ri ON ri.id_recepcao = r.id_recepcao
                             AND ri.ativo_sn = 'S'
                             AND ri.cancelado_sn != 'S'
                             AND ri.valor > 0  -- [para não-crédito; crédito não filtra valor]
INNER JOIN produtos pr ON pr.id_produto = ri.id_produto
INNER JOIN unidades u ON u.id_unidade = r.id_clinica
INNER JOIN oracle_unidades_servicos oru ON (oru.id_unidade = r.id_clinica
                                        OR oru.id_unidade_oracle = u.id_unidade_oracle)
                                       AND pr.grupo = oru.grupo
LEFT JOIN atendimentos at ON at.id_recepcao_item = ri.id_item
LEFT JOIN atendimentos_stamps at_s ON at_s.id_atendimento = at.id_atendimento
LEFT JOIN ac_atendimentos_exames ac_at ON ac_at.id_recepcao_item = ri.id_item
LEFT JOIN executantes exc ON exc.id_executante = ri.id_executante
WHERE r.ativo_sn = 'S'
  AND r.cancelado_sn != 'S'
  AND r.cobrado_sn = 'S'
  AND r.stamp_fim IS NOT NULL
  AND r.id_recepcao = {id_recepcao}
  AND (
      pr.id_produto IN (<exames_sensiveis>)   -- feature flag EMISSAO_NOTA_FISCAL_EXAMES_SENSIVEIS
      OR at_s.st_consulta_fim IS NOT NULL     -- consulta finalizada
      OR ac_at.status != 'P'                  -- exame não pendente
      OR exc.tipo IN ('E')                    -- executante externo
      OR pr.realiza_em_sala_sn = 'S'          -- procedimento em sala
  )
  AND ri.id_convenio = {id_convenio}          -- 0 para B2C, id_convenio para B2B
  AND ri.id_produto NOT IN (9462, 9463, 9464, 9465, 9466, 9467, 9610, 9611)  -- produtos sem NF
  AND ri.oracle_sequencial IS NULL            -- NF ainda não gerada (sem RPS)
  AND ri.id_invoice_oracle IS NULL            -- NF ainda não emitida no Oracle
ORDER BY ri.id_convenio, ri.id_prevenda ASC, r.id_recepcao, r.data DESC
```

**Filtros críticos que bloqueiam um item de ser faturado:**
| Condição | Motivo |
|----------|--------|
| `ri.oracle_sequencial IS NULL` | Item já tem RPS — provável NF em andamento |
| `ri.id_invoice_oracle IS NULL` | Item já tem NF emitida no Oracle — não duplicar |
| `ri.id_produto NOT IN (lista)` | Produtos específicos não geram NF (ex: taxa adm) |
| `ri.cancelado_sn = 'S'` | Item cancelado não fatura |
| `ri.valor = 0` (para não-crédito) | Item sem valor não gera NF |

---

## 5. `recuperar_id_invoice_oracle()` — Recupera NF já emitida sem ID registrado

Executado **antes** de gerar novas NFs no fluxo B2C para verificar se já existe uma NF no Oracle para RPS sem `id_invoice_oracle` cadastrado.

**Tabelas:** `recepcao_itens`, `recepcao`, `unidades`, `oracle_unidades`, `oracle_pacientes`

```sql
SELECT DISTINCT ri.oracle_sequencial, u.id_unidade_oracle, oru.unidade, oru.bu_id,
       r.responsavel_cpf, op.customer_account_id
FROM recepcao_itens ri
INNER JOIN recepcao r ON r.id_recepcao = ri.id_recepcao
INNER JOIN unidades u ON u.id_unidade = ri.id_unidade
INNER JOIN oracle_unidades oru ON (oru.sigla = u.sigla OR oru.id_unidade_oracle = u.id_unidade_oracle)
LEFT JOIN oracle_pacientes op ON op.id_paciente = r.id_paciente AND op.cpf = r.responsavel_cpf
WHERE ri.id_recepcao = {id_recepcao}
  AND (ri.id_invoice_oracle IS NULL OR ri.id_invoice_oracle = '')  -- sem ID de NF registrado
  AND ri.oracle_sequencial IS NOT NULL                              -- mas já tem número RPS
```

Se encontrar RPS sem `id_invoice_oracle`, consulta o Oracle via SOAP (`getDebitMemo`) e atualiza `recepcao_itens.id_invoice_oracle`.

---

## 6. `paciente_cpf_cep_desatualizado()` — Verifica sincronização do paciente com Oracle

> Executada apenas quando a feature flag `ORACLE_SYNC_PACIENTE` está ativa.

**Tabelas:** `pacientes`, `oracle_pacientes`, `cep`, `pacientes_audit`

**Verificação 1 — CPF sincronizado:**
```sql
SELECT p.cpf, p.cep,
  (SELECT COUNT(*) FROM oracle_pacientes op
   WHERE op.id_paciente = p.id_paciente AND op.cpf = p.cpf) AS cpf_sincronizado
FROM pacientes p
WHERE p.id_paciente = {id_paciente} LIMIT 1
```
→ Se `cpf_sincronizado = 0`: CPF diverge → sincronizar antes de faturar.

**Verificação 2 — CEP válido:**
```sql
SELECT cep FROM cep WHERE cep = '{cep_paciente}' LIMIT 1
```
→ CEP do paciente deve existir na tabela de CEPs.

**Verificação 3 — CEP sincronizado com Oracle:**
```sql
SELECT cep FROM oracle_pacientes
WHERE id_paciente = {id_paciente} AND cpf = '{cpf}' LIMIT 1
```
→ Se CEP do S2 ≠ CEP do `oracle_pacientes`: sincronizar.

**Verificação 4 — Nome alterado:**
```sql
SELECT CASE WHEN paa1.nome <> paa2.nome THEN 1 ELSE 0 END AS nome_alterado
FROM
  (SELECT nome FROM pacientes_audit WHERE id_paciente = {id} ORDER BY stamp DESC LIMIT 1) paa1,
  (SELECT nome FROM pacientes_audit WHERE id_paciente = {id} ORDER BY stamp DESC LIMIT 1 OFFSET 1) paa2
```
→ Se o nome mudou desde o último audit: sincronizar.

---

## 7. `verificar_amostra_ac_enviada()` — Valida status da amostra de exame AC

Executada para **cada item** dentro de `gerar_notas()`.

**Verificação 1 — É produto do grupo AC?**
```sql
SELECT p.grupo FROM produtos p
INNER JOIN recepcao_itens ri ON ri.id_produto = p.id_produto
WHERE ri.id_item = {id_recepcao_item} AND p.grupo = 'AC'
```
→ Se não for AC: **permite faturar** (retorna `true`).

**Verificação 2 — Status da amostra:**
```sql
SELECT status FROM ac_atendimentos_exames
WHERE id_recepcao_item = {id_recepcao_item}
  AND ativo_sn = 'S' LIMIT 1
```

**Status que BLOQUEIAM o faturamento:**
| Status | Significado |
|--------|-------------|
| `P`  | Pendente |
| `PA` | Pendente Parcial |
| `DP` | Despacho Pendente |
| `E`  | Cancelado por Erro |
| `IP` | Integração Pendente |
| `RF` | Resultado com Falha |
| `FE` | Falha no Envio |
| `R`  | Recusado |

Se sem registro na tabela → bloqueia (`false`).

---

## 8. `verificar_voucher_externo_consumido()` — Valida voucher de executante externo

> Controlado pela feature flag `QRCODE_EXECUTANTES_EXTERNO`.

**Tabelas:** `feature_flags` (via `get_feature_flag()`), `vouchers_externos`

```sql
SELECT voucher_consumido_sn
FROM vouchers_externos
WHERE id_recepcao_item = {id_recepcao_item}
  AND ativo_sn = 'S'
```

**Resultado:**
- `voucher_consumido_sn = 'S'` → **permite faturar**.
- `voucher_consumido_sn = 'N'` ou sem registro → **bloqueia**.
- Executante não está na lista da feature flag → **permite faturar** (não se aplica).

---

## 9. `verificar_procedimento_realizado()` — Valida se o procedimento em sala foi concluído

**Tabelas:** `produtos`, `recepcao_itens`, `ac_atendimentos_exames`, `atendimentos`, `atendimentos_stamps`

**Verificação 1 — Grupo e se realiza em sala:**
```sql
SELECT p.grupo, p.realiza_em_sala_sn FROM produtos p
INNER JOIN recepcao_itens ri ON ri.id_produto = p.id_produto
WHERE ri.id_item = {id_recepcao_item}
```
→ Se `grupo = 'AC'`: já validado na etapa 7, **permite faturar**.
→ Se `realiza_em_sala_sn != 'S'`: não requer validação de sala, **permite faturar**.

**Verificação 2 — Status em `ac_atendimentos_exames` (ex.: grupo PD):**
```sql
SELECT status FROM ac_atendimentos_exames
WHERE id_recepcao_item = {id_recepcao_item}
  AND ativo_sn = 'S' LIMIT 1
```
→ Se status não está nos bloqueados (mesma lista da etapa 7): **permite faturar**.

**Verificação 3 — Atendimento concluído via `atendimentos_stamps`:**
```sql
SELECT at_s.st_consulta_fim
FROM atendimentos at
INNER JOIN atendimentos_stamps at_s ON at_s.id_atendimento = at.id_atendimento
WHERE at.id_recepcao_item = {id_recepcao_item}
  AND at_s.st_consulta_fim IS NOT NULL
```
→ Se `st_consulta_fim IS NOT NULL`: **permite faturar**.
→ Se não encontrar: **bloqueia**.

---

## 10. `gerar_notas()` — Verificação de NF já existente antes de criar nova

Antes de chamar o Oracle para criar uma nova NF, verifica os campos `oracle_sequencial` e `id_invoice_oracle` de cada item:

| `oracle_sequencial` | `id_invoice_oracle` | Ação |
|---|---|---|
| vazio / NULL | vazio / NULL | Cria nova NF no Oracle (`create_invoice`) |
| > 0 | vazio / NULL | Tenta recuperar NF existente via SOAP; se não encontrar, recria |
| > 0 | preenchido | NF já emitida — **não cria nova**, apenas referencia |

**Limite por NF:** máximo de **60 itens por nota fiscal** (`array_chunk($itens_validados, 60)`).

---

## 11. `receipts()` — Verifica pagamentos para aplicar na NF

**Tabelas via `get_recepcao_cobranca()`:** `recepcao_cobranca`, `recepcao`

Valida e aplica os recebimentos na NF criada:

| Método de cobrança | Tratamento |
|---|---|
| `id_metodo IN (1,2,3,4,6,7,8,9,80)` | Cria receipt padrão no Oracle |
| `id_metodo = 5` (Desconto) | Verifica `verifica_desconto_prevenda()` — evita duplicidade com prevenda |
| `id_metodo IN (20, 40)` | Busca receipt da prevenda via `get_pagamentos()` |

**Verificação de duplicidade de desconto:**
```sql
-- (dentro de verifica_desconto_prevenda)
-- verifica se o desconto já foi enviado pela prevenda
```

**Verificação de receipt já existente:**
- Se `oracle_receipt_id IS NULL` no `recepcao_cobranca`: busca no Oracle via SOAP (`find_standard_receipt`) antes de criar novo.
- Se já existe: marca como enviado via `update_envio_receipt()`.

---

## Resumo: Tabelas Consultadas e Finalidade

| Tabela | Finalidade |
|--------|------------|
| `recepcao` | Verifica se está paga, ativa, encerrada |
| `recepcao_itens` | Lista itens; verifica se já tem RPS/NF; filtra cancelados, recoletas, créditos |
| `pacientes` | CPF e dados do responsável |
| `pacientes_audit` | Detecta alteração de nome para sincronização Oracle |
| `produtos` | Grupo do produto (AC, PD, etc.), `realiza_em_sala_sn`, `id_item_erp` |
| `atendimentos` | Liga item à consulta médica |
| `atendimentos_stamps` | Verifica se consulta foi finalizada (`st_consulta_fim`) |
| `ac_atendimentos_exames` | Status da amostra de exame AC |
| `executantes` | Tipo do executante (interno/externo `'E'`) |
| `unidades` | Liga recepção à unidade física |
| `oracle_unidades` | Dados de faturamento da unidade no Oracle (BU, sigla) |
| `oracle_unidades_servicos` | Código de serviço municipal por grupo de produto |
| `oracle_pacientes` | IDs do paciente no Oracle (PartyId, AccountId, SiteId, CPF) |
| `recepcao_cobranca` | Pagamentos da recepção para gerar receipts |
| `convenios_contratos` | Verifica coparticipação (`coparticipacao_sn`) |
| `convenios_contratos_tabpreco` | Liga item ao contrato de convênio |
| `vouchers_externos` | Status de consumo do voucher de executante externo |
| `cep` | Valida CEP do paciente antes de sincronizar com Oracle |
| `ibge_municipios` | Cidade e UF para dados de endereço Oracle |
| `prevenda_cobranca` | Receipts de pré-venda (métodos 20/40) |

---

## Regra de Negócio: Quando a NF **NÃO** é emitida

A NF é **bloqueada** se qualquer das condições abaixo for verdadeira:

1. `recepcao.ativo_sn != 'S'` — recepção inativa
2. `recepcao.cancelado_sn = 'S'` — recepção cancelada
3. `recepcao.cobrado_sn != 'S'` — recepção não paga
4. `recepcao.stamp_fim IS NULL` — atendimento não encerrado
5. Nenhum item passa no filtro de produtos elegíveis (sem consulta finalizada, sem exame concluído, sem executante externo, sem produto sensível, sem procedimento em sala)
6. Todos os itens já têm `id_invoice_oracle` preenchido — NF já emitida
7. Item é produto da lista sem NF: `9462, 9463, 9464, 9465, 9466, 9467, 9610, 9611`
8. Item do grupo AC com status de amostra bloqueante (`P, PA, DP, E, IP, RF, FE, R`)
9. Executante externo com voucher não consumido (quando feature flag ativa)
10. Procedimento em sala sem `st_consulta_fim` e sem status conclusivo em `ac_atendimentos_exames`
