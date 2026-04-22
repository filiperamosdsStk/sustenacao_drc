import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';

type ValidationResponse = {
    id_recepcao: number;
    apta_emissao: boolean;
    motivos_bloqueio: string[];
    resumo: {
        total_itens_elegiveis: number;
        total_itens_ja_emitidos: number;
        tem_fluxo_b2b: boolean;
        tem_fluxo_b2c: boolean;
        convenios_b2b: number[];
    };
    dados_recepcao: {
        id_recepcao: number;
        id_paciente: number;
        responsavel_cpf: string;
        cpf_paciente: string;
        nome_paciente: string;
        id_convenio: number | null;
        id_unidade: number;
        ativo_sn: string;
        cancelado_sn: string;
        cobrado_sn: string;
        stamp_fim: string | null;
    };
    itens_para_emissao: Array<{
        id_recepcao_item: number;
        id_produto: number;
        nome_produto: string;
        grupo_produto: string;
        id_item_erp: string | null;
        cod_servico: string | null;
        id_convenio: number | null;
        valor: number;
        valor_desconto: number;
        id_executante: number | null;
        tipo_executante: string | null;
        oracle_sequencial: string | null;
        id_invoice_oracle: string | null;
    }>;
};

export default function InvoiceValidationPage() {
    const [idRecepcao, setIdRecepcao] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ValidationResponse | null>(null);

    const canSearch = useMemo(() => idRecepcao.trim().length > 0, [idRecepcao]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const idFromQuery = params.get('id_recepcao');
        if (idFromQuery) {
            setIdRecepcao(idFromQuery);
        }
    }, []);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!canSearch) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const { data } = await axios.get<ValidationResponse>('/api/invoice/validar-recepcao', {
                params: { id_recepcao: idRecepcao.trim() },
            });
            setResult(data);
        } catch (err: any) {
            const backendMessage = err?.response?.data?.error;
            setError(backendMessage || 'Erro ao validar recepção para emissão de nota.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Head title="Validação de Emissão de Nota" />
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                    Validação de Emissão de Nota
                                </h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    Consulte por id_recepcao e veja se está apta para emitir NF.
                                </p>
                            </div>
                            <Link
                                href="/"
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                ← Voltar ao Menu
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-8">
                    <form onSubmit={handleSubmit} className="mx-auto mb-6 max-w-xl rounded-lg bg-white p-4 shadow">
                        <label htmlFor="id_recepcao" className="mb-2 block text-sm font-medium text-gray-700">
                            ID da recepção
                        </label>
                        <input
                            id="id_recepcao"
                            type="text"
                            value={idRecepcao}
                            onChange={(e) => setIdRecepcao(e.target.value)}
                            placeholder="Ex.: 29737154"
                            className="w-full rounded border border-gray-300 px-4 py-2 focus:outline-none focus:ring"
                            required
                        />
                        <button
                            type="submit"
                            className="mt-4 w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                            disabled={loading || !canSearch}
                        >
                            {loading ? 'Validando...' : 'Validar Recepção'}
                        </button>
                    </form>

                    {error && <div className="mx-auto mb-6 max-w-xl rounded bg-red-100 px-4 py-3 text-red-700">{error}</div>}

                    {result && (
                        <div className="space-y-6">
                            <section className="rounded-lg bg-white p-6 shadow">
                                <h2 className="mb-3 text-xl font-semibold text-gray-900">Status da emissão</h2>
                                <div
                                    className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                                        result.apta_emissao ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                                >
                                    {result.apta_emissao ? 'Apta para emissão' : 'Bloqueada para emissão'}
                                </div>

                                {result.motivos_bloqueio.length > 0 && (
                                    <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-gray-700">
                                        {result.motivos_bloqueio.map((motivo) => (
                                            <li key={motivo}>{motivo}</li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="rounded-lg bg-white p-6 shadow">
                                <h2 className="mb-3 text-xl font-semibold text-gray-900">Resumo para emissão</h2>
                                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                                    <div className="rounded bg-gray-100 p-3">
                                        <strong>Itens elegíveis:</strong> {result.resumo.total_itens_elegiveis}
                                    </div>
                                    <div className="rounded bg-gray-100 p-3">
                                        <strong>Itens já emitidos:</strong> {result.resumo.total_itens_ja_emitidos}
                                    </div>
                                    <div className="rounded bg-gray-100 p-3">
                                        <strong>Fluxo B2B:</strong> {result.resumo.tem_fluxo_b2b ? 'Sim' : 'Não'}
                                    </div>
                                    <div className="rounded bg-gray-100 p-3">
                                        <strong>Fluxo B2C:</strong> {result.resumo.tem_fluxo_b2c ? 'Sim' : 'Não'}
                                    </div>
                                    <div className="rounded bg-gray-100 p-3">
                                        <strong>Convênios B2B:</strong>{' '}
                                        {result.resumo.convenios_b2b.length > 0
                                            ? result.resumo.convenios_b2b.join(', ')
                                            : 'Nenhum'}
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-lg bg-white p-6 shadow">
                                <h2 className="mb-3 text-xl font-semibold text-gray-900">Dados da recepção</h2>
                                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                                    <p>
                                        <strong>ID recepção:</strong> {result.dados_recepcao.id_recepcao}
                                    </p>
                                    <p>
                                        <strong>ID paciente:</strong> {result.dados_recepcao.id_paciente}
                                    </p>
                                    <p>
                                        <strong>Paciente:</strong> {result.dados_recepcao.nome_paciente}
                                    </p>
                                    <p>
                                        <strong>CPF paciente:</strong> {result.dados_recepcao.cpf_paciente}
                                    </p>
                                    <p>
                                        <strong>CPF responsável:</strong> {result.dados_recepcao.responsavel_cpf}
                                    </p>
                                    <p>
                                        <strong>ID unidade:</strong> {result.dados_recepcao.id_unidade}
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-lg bg-white p-6 shadow">
                                <h2 className="mb-3 text-xl font-semibold text-gray-900">
                                    Itens aptos para geração da NF ({result.itens_para_emissao.length})
                                </h2>
                                {result.itens_para_emissao.length === 0 ? (
                                    <p className="text-sm text-gray-600">Nenhum item elegível para emissão no momento.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="px-2 py-2">ID Item</th>
                                                    <th className="px-2 py-2">Produto</th>
                                                    <th className="px-2 py-2">Grupo</th>
                                                    <th className="px-2 py-2">Convênio</th>
                                                    <th className="px-2 py-2">Valor</th>
                                                    <th className="px-2 py-2">Cod. Serviço</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.itens_para_emissao.map((item) => (
                                                    <tr key={item.id_recepcao_item} className="border-b">
                                                        <td className="px-2 py-2">{item.id_recepcao_item}</td>
                                                        <td className="px-2 py-2">{item.nome_produto}</td>
                                                        <td className="px-2 py-2">{item.grupo_produto}</td>
                                                        <td className="px-2 py-2">{item.id_convenio ?? 0}</td>
                                                        <td className="px-2 py-2">{item.valor}</td>
                                                        <td className="px-2 py-2">{item.cod_servico ?? '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
