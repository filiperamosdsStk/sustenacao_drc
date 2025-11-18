# 🏥 Sistema de Sustentação DRC

Sistema web para sustentação e automação de processos internos da DR.Consulta, desenvolvido com Laravel 12 + React + TypeScript + Inertia.js.

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [API Endpoints](#-api-endpoints)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Desenvolvimento](#-desenvolvimento)
- [Testes](#-testes)
- [Contribuindo](#-contribuindo)

## 🚀 Funcionalidades

### 1. **Módulo de Recepção**
- 🔍 Pesquisa de itens de recepção por ID
- 📊 Visualização detalhada de dados de recepção
- 🏷️ Exibição de informações de produtos, unidades e valores
- 🧾 Integração com módulo de emissão de notas fiscais

### 2. **Módulo de Emissão de Notas Fiscais**
- 📝 Busca de notas fiscais por recepção
- ⚙️ Processamento automático de notas em lotes
- 📤 Envio de notas para sistema externo
- 📈 Relatório de status de processamento

### 3. **Módulo de Assinatura de Documentos**
- 📅 Filtro de atendimentos por data
- 🏥 Filtro por participação no sistema MEVO
- 📋 Lista de documentos pendentes de assinatura
- 🔄 Processamento automático de assinaturas
- 📊 Relatório de progresso em tempo real

### 4. **Módulo de Overbooking** (Em desenvolvimento)
- 📆 Reprocessamento de agendamentos com overbooking
- ⚡ Otimização de escalas médicas

## 🛠 Tecnologias

### Backend
- **Laravel 12** - Framework PHP moderno
- **MySQL** - Banco de dados relacional
- **PHP 8.2+** - Linguagem de programação

### Frontend
- **React 19** - Biblioteca para interfaces de usuário
- **TypeScript** - Superset tipado do JavaScript
- **Inertia.js** - Ponte entre Laravel e React
- **Tailwind CSS 4** - Framework de estilização
- **Vite** - Build tool moderno

### Ferramentas de Desenvolvimento
- **Laravel Wayfinder** - Roteamento avançado
- **Laravel Boost** - Aceleração de desenvolvimento
- **Pest** - Framework de testes modernos
- **ESLint** - Linting para JavaScript/TypeScript
- **Prettier** - Formatação de código

## 📋 Pré-requisitos

- PHP 8.2 ou superior
- Node.js 18+ e npm
- MySQL 8.0+
- Composer
- Git

## 🔧 Instalação

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd sustentacao_drc
```

2. **Instale as dependências do PHP:**
```bash
composer install
```

3. **Instale as dependências do Node.js:**
```bash
npm install
```

4. **Configure o arquivo de ambiente:**
```bash
cp .env.example .env
php artisan key:generate
```

5. **Configure as variáveis de banco de dados no `.env`:**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sua_base_drc
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha
```

## ⚙️ Configuração

### Configuração do Banco de Dados

O sistema conecta à base de dados DRC existente. Certifique-se de que as seguintes tabelas estão acessíveis:

- `recepcao_itens`
- `produtos`
- `unidades`
- `emissao_notas_fiscais`
- `documentos_assinaturas`
- `atendimentos`

### Configuração de APIs Externas

Configure os endpoints externos no arquivo de configuração ou controllers:

```php
// InvoiceController.php
public $phpEndpoint = 'https://atendimento-externo-92095499668.us-east1.run.app/atendimento_externo';
public $token = 'seu_token_de_autorizacao';
```

## 🎯 Uso

### Executar em Desenvolvimento

1. **Inicie o servidor Laravel e o build do frontend em modo watch:**
```bash
composer run dev
```

3. **Acesse o sistema:**
```
http://localhost:8000
```

### Executar em Produção

1. **Build do frontend:**
```bash
npm run build
```

2. **Configure o servidor web (Apache/Nginx) para o diretório `public/`**

## 🔌 API Endpoints

### Recepção
```http
GET /api/reception?id_recepcao={id}
```

### Notas Fiscais
```http
GET /api/invoice/buscar?id_recepcao={id}
POST /api/invoice/processar
POST /api/invoice/enviar
```

### Assinatura de Documentos
```http
POST /api/assinatura/atendimentos
POST /api/assinatura/processar_atendimento
```

### Overbooking
```http
GET /api/overbooking/get_escalas
POST /api/overbooking/reprocessar_escala
```

## 📁 Estrutura do Projeto

```
sustentacao_drc/
├── app/
│   └── Http/
│       └── Controllers/
│           ├── AssinaturaController.php
│           ├── InvoiceController.php
│           ├── RecepcaoController.php
│           └── OverbookingController.php
├── resources/
│   └── js/
│       └── pages/
│           ├── assinatura/
│           ├── invoice/
│           ├── recepcao/
│           └── overbooking/
├── routes/
│   ├── api.php
│   └── web.php
├── tests/
│   ├── Feature/
│   └── Unit/
└── public/
```

## 💻 Desenvolvimento

### Comandos Úteis

```bash
# Executar testes
php artisan test
# ou
./vendor/bin/pest

# Verificar código
npm run lint

# Formatar código
npm run format

# Verificar tipos TypeScript
npm run types

# Limpar caches
php artisan optimize:clear
```

### Padrões de Código

- **Backend**: PSR-12 para PHP
- **Frontend**: ESLint + Prettier para TypeScript/React
- **Commits**: Conventional Commits

### Estrutura de Componentes React

```tsx
// Exemplo de estrutura de página
export default function ModuleName() {
    const [loading, setLoading] = useState(false);
    
    // Lógica do componente
    
    return (
        <>
            <Head title="Título da Página" />
            <div className="min-h-screen bg-gray-50">
                {/* Conteúdo */}
            </div>
        </>
    );
}
```

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
php artisan test

# Testes específicos
php artisan test --filter ReceptionApiTest

# Com cobertura
php artisan test --coverage
```

### Estrutura de Testes

- `tests/Feature/` - Testes de integração
- `tests/Unit/` - Testes unitários

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrão de Commits

```
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
style: formatação de código
refactor: refatoração sem mudança de funcionalidade
test: adiciona ou modifica testes
chore: tarefas de manutenção
```

## 📊 Monitoramento

### Logs

Os logs do sistema estão em:
- `storage/logs/laravel.log` - Logs gerais do Laravel
- Browser DevTools Console - Logs do frontend

### Debugging

```php
// Controller
Log::info('Mensagem de debug', ['context' => $data]);

// Frontend
console.log('Debug info:', data);
```

## 🔐 Segurança

- Tokens CSRF habilitados
- Sanitização de inputs
- Validação de requests
- Autenticação por tokens bearer para APIs externas

## 📞 Suporte

Para suporte e dúvidas:
- Verifique a documentação
- Consulte os logs de erro
- Utilize o sistema de issues do repositório

---

**Desenvolvido com ❤️ pela equipe de Sustentação DRC**