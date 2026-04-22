import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import InvoiceIndex from '../invoice';

interface ReceptionItem {
    id_item: number;
    id_recepcao: number;
    id_paciente: number;
    stamp_created: string;
    ativo_sn: string;
    cancelado_sn: string;
    id_convenio: number;
    valor: number;
    id_item_credito: number;
    id_invoice_oracle: number;
    oracle_sequencial: string;
    unidade: string;
    produto: string;
}

export default function ReceptionSearch() {
    const [idRecepcao, setIdRecepcao] = useState('29737154');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ReceptionItem[]>([]);
    const [error, setError] = useState('');
    const [showInvoice, setShowInvoice] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults([]);

        try {
            const response = await fetch(`/api/reception?id_recepcao=${encodeURIComponent(idRecepcao)}`);
            if (!response.ok) throw new Error('Recepção não encontrada');
            const data = await response.json();
            if (!data || data.length === 0) throw new Error('Nenhum dado encontrado para esta recepção');
            setResults(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar dados');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Recepção" />
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Recepção</h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    Pesquise os itens de uma recepção pelo ID
                                </p>
                            </div>
                            <Link
                                href={'/'}
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                ← Voltar ao Menu
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="mx-auto max-w-7xl px-4 py-8">
                    <form onSubmit={handleSearch} className="mb-6 max-w-xl mx-auto">
                        <input
                            type="text"
                            value={idRecepcao}
                            onChange={e => setIdRecepcao(e.target.value)}
                            placeholder="Digite o ID da recepção"
                            className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring"
                            required
                        />
                        <button
                            type="submit"
                            className="mt-4 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 font-medium"
                            disabled={loading}
                        >
                            {loading ? 'Buscando...' : 'Pesquisar'}
                        </button>
                    </form>
                    {error && <div className="text-red-600 mb-4 max-w-xl mx-auto">{error}</div>}
                    {results.length > 0 && (
                        <div className="overflow-x-auto mx-auto">
                            <table className="min-w-full bg-white rounded shadow">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-1">ID Item</th>
                                        <th className="px-2 py-1">ID Recepção</th>
                                        <th className="px-2 py-1">ID Paciente</th>
                                        <th className="px-2 py-1">Data</th>
                                        <th className="px-2 py-1">Ativo</th>
                                        <th className="px-2 py-1">Cancelado</th>
                                        <th className="px-2 py-1">Convênio</th>
                                        <th className="px-2 py-1">Valor</th>
                                        <th className="px-2 py-1">Item Crédito</th>
                                        <th className="px-2 py-1">Invoice Oracle</th>
                                        <th className="px-2 py-1">Sequencial Oracle</th>
                                        <th className="px-2 py-1">Unidade</th>
                                        <th className="px-2 py-1">Produto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(item => (
                                        <tr key={item.id_item} className="border-t">
                                            <td className="px-2 py-1">{item.id_item}</td>
                                            <td className="px-2 py-1">{item.id_recepcao}</td>
                                            <td className="px-2 py-1">{item.id_paciente}</td>
                                            <td className="px-2 py-1">{item.stamp_created}</td>
                                            <td className="px-2 py-1">{item.ativo_sn}</td>
                                            <td className="px-2 py-1">{item.cancelado_sn}</td>
                                            <td className="px-2 py-1">{item.id_convenio}</td>
                                            <td className="px-2 py-1">{item.valor}</td>
                                            <td className="px-2 py-1">{item.id_item_credito}</td>
                                            <td className="px-2 py-1">{item.id_invoice_oracle}</td>
                                            <td className="px-2 py-1">{item.oracle_sequencial}</td>
                                            <td className="px-2 py-1">{item.unidade}</td>
                                            <td className="px-2 py-1">{item.produto}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
                {results.length > 0 && (
                    <div className="mt-8 flex justify-center gap-4">
                        <button
                            type="button"
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 shadow"
                            onClick={() => setShowInvoice(true)}
                        >
                            Abrir Emissão de Nota Fiscal
                        </button>
                        <Link
                            href={`/invoice/validacao?id_recepcao=${encodeURIComponent(idRecepcao)}`}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow"
                        >
                            Validar Aptidão para Emissão
                        </Link>
                    </div>
                )}
                {showInvoice && (
                    <div className="mt-8">
                        <InvoiceIndex idRecepcao={idRecepcao} />
                    </div>
                )}
            </div>
        </>
    );
}
