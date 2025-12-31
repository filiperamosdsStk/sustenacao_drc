import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

type Step = 'buscar' | 'processar' | 'enviar';

export default function InvoiceIndex({ idRecepcao }: { idRecepcao: string }) {
    const [notas, setNotas] = useState<any[]>([]);
    const [notasProntas, setNotasProntas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [currentStep, setCurrentStep] = useState<Step>('buscar');
    const [hasNotasToProcess, setHasNotasToProcess] = useState(false);

    useEffect(() => {
        if (idRecepcao) {
            buscarNotasPorRecepcao();
            buscarNotasProntasParaProcessar();
        }
    }, [idRecepcao]);

    async function buscarNotasPorRecepcao() {
        setLoading(true);
        setMessage('');
        try {
            const { data } = await axios.get(`/api/invoice/buscar?id_recepcao=${idRecepcao}`);
            console.log(data);

            setNotas(data);
            if (data.length > 0) {
                setMessage(`${data.length} notas encontradas para processamento.`);
                setCurrentStep('processar');
            } else {
                setMessage('Nenhuma nota encontrada para processamento.');
                setCurrentStep('buscar');
            }
        } catch (err: any) {
            setMessage('Erro ao buscar notas.');
            setCurrentStep('buscar');
        }
        setLoading(false);
    }

    async function buscarNotasProntasParaProcessar() {
        try {
            const { data } = await axios.get(`/api/invoice/notas-prontas?id_recepcao=${idRecepcao}`);
            
            setNotasProntas(data.notas || []);
            setHasNotasToProcess(data.total > 0);
            
            if (data.total > 0) {
                setCurrentStep('enviar');
            }
        } catch (err: any) {
            console.error('Erro ao buscar notas prontas:', err);
            setHasNotasToProcess(false);
        }
    }

    async function processarNotas() {
        setLoading(true);
        setMessage('');
        try {
            const { data } = await axios.post('/api/invoice/processar', { id_recepcao: idRecepcao }, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
                }
            });
            setMessage(data.status || 'Processamento concluído.');
            setCurrentStep('enviar');
            // Atualizar lista de notas prontas após processamento
            await buscarNotasProntasParaProcessar();
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
            setMessage(data.status || 'Notas enviadas com sucesso!');
            setCurrentStep('buscar');
            // Limpar listas após envio
            setNotas([]);
            setNotasProntas([]);
            setHasNotasToProcess(false);
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
                {/* Indicador de Steps */}
                <div className="flex justify-center mb-6">
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 ${currentStep === 'buscar' ? 'text-blue-600' : currentStep === 'processar' || currentStep === 'enviar' ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 'buscar' ? 'bg-blue-100' : currentStep === 'processar' || currentStep === 'enviar' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                1
                            </div>
                            <span>Buscar</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className={`flex items-center space-x-2 ${currentStep === 'processar' ? 'text-blue-600' : currentStep === 'enviar' ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 'processar' ? 'bg-blue-100' : currentStep === 'enviar' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                2
                            </div>
                            <span>Processar</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className={`flex items-center space-x-2 ${currentStep === 'enviar' ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 'enviar' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                3
                            </div>
                            <span>Enviar</span>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={buscarNotasPorRecepcao}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={loading || !idRecepcao}
                    >
                        {loading && currentStep === 'buscar' ? 'Buscando...' : 'Buscar Notas'}
                    </button>
                    
                    <button
                        onClick={processarNotas}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={loading || !idRecepcao || notas.length === 0 || currentStep !== 'processar'}
                    >
                        {loading && currentStep === 'processar' ? 'Processando...' : 'Processar Notas'}
                    </button>
                    
                    <button
                        onClick={enviarNotas}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={loading || !idRecepcao || !hasNotasToProcess || currentStep !== 'enviar'}
                    >
                        {loading && currentStep === 'enviar' ? 'Enviando...' : 'Enviar Notas'}
                    </button>
                </div>
                {message && <div className={`mb-4 p-3 rounded ${message.includes('Erro') ? 'bg-red-100 text-red-700' : message.includes('sucesso') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{message}</div>}
                
                {notas.length > 0 && currentStep === 'processar' && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Notas para Processar ({notas.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-gray-100 rounded">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-1">ID Nota</th>
                                        <th className="px-2 py-1">Valor</th>
                                        <th className="px-2 py-1">Produto</th>
                                        <th className="px-2 py-1">Unidade</th>
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
                    </div>
                )}
                
                {notasProntas.length > 0 && currentStep === 'enviar' && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Notas Prontas para Envio ({notasProntas.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-green-50 rounded">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-1">ID</th>
                                        <th className="px-2 py-1">Status</th>
                                        <th className="px-2 py-1">Account Number</th>
                                        <th className="px-2 py-1">Sigla</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notasProntas.map((nota, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="px-2 py-1">{nota.id}</td>
                                            <td className="px-2 py-1">
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                    {nota.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1">{nota.account_number}</td>
                                            <td className="px-2 py-1">{nota.sigla}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
