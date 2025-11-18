import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function InvoiceIndex({ idRecepcao }: { idRecepcao: string }) {
    const [notas, setNotas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (idRecepcao) {
            buscarNotasPorRecepcao();
        }
    }, [idRecepcao]);

    async function buscarNotasPorRecepcao() {
        setLoading(true);
        setMessage('');
        try {
            const { data } = await axios.get(`/api/invoice/buscar?id_recepcao=${idRecepcao}`);
            console.log(data);

            setNotas(data);
            setMessage(`${data.length} notas encontradas.`);
        } catch (err: any) {
            setMessage('Erro ao buscar notas.');
        }
        setLoading(false);
    }

    async function processarNotas() {
        setLoading(true);
        setMessage('');
        try {
            // const { data } = await axios.post(`/api/invoice/processar/`, { id_recepcao: idRecepcao });
            const { data } = await axios.post('/api/invoice/processar', { id_recepcao: idRecepcao }, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
                }
            });
            setMessage(data.status || 'Processamento concluído.');
        } catch (err: any) {
            setMessage('Erro ao processar notas.');
        }
        setLoading(false);
    }

    async function enviarNotas() {
        setLoading(true);
        setMessage('');
        try {
            const { data } = await axios.post(`/api/invoice/enviar`, { id_recepcao: idRecepcao });
            setMessage(data.status || 'Notas enviadas.');
        } catch (err: any) {
            setMessage('Erro ao enviar notas.');
        }
        setLoading(false);
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <Head title="Emissão de Nota Fiscal" />
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Emissão de Nota Fiscal</h1>
                {/* <div className="mb-6">
                    <input
                        type="text"
                        value={idRecepcao}
                        // onChange={e => setIdRecepcao(e.target.value)}
                        placeholder="Digite o ID da recepção"
                        className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring"
                        required
                    />
                </div> */}
                <div className="flex space-x-4 mb-6">
                    {/* <button
                        onClick={buscarNotasPorRecepcao}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium"
                        disabled={loading || !idRecepcao}
                    >
                        Buscar Notas
                    </button> */}
                    {message !== '' ?
                        <button
                            onClick={processarNotas}
                            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 font-medium"
                            disabled={loading || !idRecepcao}
                        >
                            Processar Notas
                        </button>
                        :
                        <button
                            onClick={enviarNotas}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
                            disabled={loading || !idRecepcao}
                        >
                            Enviar Notas
                        </button>

                    }
                </div>
                {message && <div className="mb-4 text-indigo-700">{message}</div>}
                {notas.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-gray-100 rounded">
                            <thead>
                                <tr>
                                    <th className="px-2 py-1">ID Nota</th>
                                    <th className="px-2 py-1">Valor</th>
                                    <th className="px-2 py-1">Produto</th>
                                    <th className="px-2 py-1">Unidade</th>
                                    {/* Adicione mais colunas conforme necessário */}
                                </tr>
                            </thead>
                            <tbody>
                                {notas.map((nota, idx) => (
                                    <tr key={idx} className="border-t">
                                        <td className="px-2 py-1">{nota.id_item || nota.id_recepcao_item}</td>
                                        <td className="px-2 py-1">{nota.valor}</td>
                                        <td className="px-2 py-1">{nota.produto || nota.descricao}</td>
                                        <td className="px-2 py-1">{nota.unidade || nota.sigla_unidade}</td>
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
