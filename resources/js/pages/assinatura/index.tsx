import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function AssinaturaIndex() {
    const [escalas, setEscalas] = useState<any[]>([]);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    // Data selecionada para filtro padrao now 
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [mevoFilter, setMevoFilter] = useState('todos'); // 'mevo', 'nao_mevo', 'todos'

    useEffect(() => {
        // Busca inicial sem data específica
        fetchAtendimentos();
    }, []);

    async function fetchAtendimentos(data?: string, filtroMevo?: string) {
        setLoading(true);
        // Converter data de YYYY-MM-DD para YYYYMMDD
        const dataToSend = data || selectedDate;
        const dataFormatada = dataToSend ? dataToSend.replace(/-/g, '') : undefined;
        
        const filterValue = filtroMevo || mevoFilter;
        const requestData: any = {
            data: dataFormatada
        };
        
        // Só enviar mevo_filter se não for "todos"
        if (filterValue !== 'todos') {
            requestData.mevo_filter = filterValue;
        }
        
        const { data: response } = await axios.post('/api/assinatura/atendimentos', requestData);
        setEscalas(response);        
        setLoading(false);
    }

    async function reprocessarTodos() {
        setLoading(true);
        setProgress(0);
        setLogs([]);

        for (let i = 0; i < escalas.length; i++) {
            let logMsg = '';
            
            try {
                const { data } = await axios.post('/api/assinatura/processar_atendimento', {
                    id_atendimento: escalas[i].id_atendimento
                });
                
                logMsg = `[${escalas.length}/${i + 1}] Atendimento ${escalas[i].id_atendimento}: ${data.response || 'processado com sucesso'}`;
                
            } catch (error: any) {
                logMsg = `[${escalas.length}/${i + 1}] Atendimento ${escalas[i].id_atendimento}: erro ao processar`;
            }
            
            // adiciona log no inicio do array
            setLogs(prev => [logMsg, ...prev]);
            setProgress(i + 1);
            
            // Aguarda 1 segundo entre requisições (como no código PHP)
            // if (i < escalas.length - 1) {
            //     await new Promise(resolve => setTimeout(resolve, 1000));
            // }
        }
        setLoading(false);
    }

    return (
        <>
            <Head title="Assinatura" />
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Assinatura</h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    Lista de atendimentos para assinatura
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
                    <div className="mb-6 flex space-x-4 items-end">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                                Selecionar Data
                            </label>
                            <input
                                type="date"
                                id="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="mevo-filter" className="block text-sm font-medium text-gray-700 mb-2">
                                Filtro MEVO
                            </label>
                            <select
                                id="mevo-filter"
                                value={mevoFilter}
                                onChange={(e) => setMevoFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="todos">Todos os médicos</option>
                                <option value="IN">Médicos na MEVO</option>
                                <option value="NOT IN">Médicos fora da MEVO</option>
                            </select>
                        </div>
                        <button
                            onClick={() => fetchAtendimentos(selectedDate, mevoFilter)}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                        >
                            Buscar
                        </button>
                    </div>
                    <button
                        onClick={reprocessarTodos}
                        disabled={loading || escalas.length === 0}
                        className={`mb-6 px-6 py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'} transition`}
                    >
                        {loading ? 
                            escalas.length === 0 ? 'Carregando...' : 'Reprocessando...'
                        : 'Reprocessar Assinaturas'}
                    </button>
                    {loading && (
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                            <div
                                className="bg-yellow-500 h-4 rounded-full transition-all duration-300"
                                style={{ width: `${(progress / escalas.length) * 100}%` }}
                            />
                        </div>
                    )}
                    <div className="mb-4 text-sm text-gray-700">
                        {progress} de {escalas.length} atendimentos reprocessados
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 h-64 overflow-y-auto text-xs">
                        <div className="font-bold mb-2 text-gray-800">Log de reprocessamento:</div>
                        {logs.map((log, idx) => (
                            <div key={idx} className="mb-1 text-gray-800">{log}</div>
                        ))}
                    </div>
                </main>
            </div>
        </>
    );
}