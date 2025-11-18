import { useState } from 'react';
import { Head } from '@inertiajs/react';

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
    const [idRecepcao, setIdRecepcao] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ReceptionItem[]>([]);
    const [error, setError] = useState('');

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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <Head title="Pesquisar Recepção" />
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Pesquisar Recepção</h1>
                <form onSubmit={handleSearch} className="mb-6">
                    <input
                        type="text"
                        value={idRecepcao}
                        onChange={e => setIdRecepcao(e.target.value)}
                        placeholder="Digite o ID da recepção"
                        className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring"
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
                {error && <div className="text-red-600 mb-4">{error}</div>}
                {results.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-gray-100 dark:bg-gray-700 rounded">
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
            </div>
        </div>
    );
}
