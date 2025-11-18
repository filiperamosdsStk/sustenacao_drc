import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function OverbookingIndex() {
    const [escalas, setEscalas] = useState<any[]>([]);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        fetchEscalas();
    }, []);

    async function fetchEscalas() {
        setLoading(true);
        const { data } = await axios.get('/api/overbooking/get_escalas', {});
        setEscalas(data);        
        setLoading(false);
    }

    async function reprocessarTodos() {
        setLoading(true);
        setProgress(0);
        setLogs([]);

        for (let i = 0; i < escalas.length; i++) {
            let logMsg = '';
            
            try {
                const { data } = await axios.post('/api/overbooking/reprocessar_escala', {
                    id_escala: escalas[i].id_escala,
                    data: escalas[i].data,
                    id_profissional: escalas[i].id_profissional,
                    criados: escalas[i].criados,
                    ocupacao: escalas[i].ocupacao,
                });
                console.log(data);
                
                logMsg = `Escala ${escalas[i].id_escala}: ${data}`;
                // logMsg = `Escala ${escalas[i].id_escala}: sucesso`; // Mock para teste
            } catch (error: any) {
                logMsg = `Escala ${escalas[i].id_escala}: erro ao reprocessar`;
            }
            // adiciona log no inicio do array
            setLogs(prev => [logMsg, ...prev]);
            setProgress(i + 1);
            // await new Promise(resolve => setTimeout(resolve, 300)); // Simula tempo de processamento
        }
        setLoading(false);
    }

    return (
        <>
            <Head title="Overbooking" />
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Overbooking</h1>
                                <p className="mt-2 text-sm text-gray-600">
                                    Lista de escalas com potencial overbooking
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
                    <button
                        onClick={reprocessarTodos}
                        disabled={loading || escalas.length === 0}
                        className={`mb-6 px-6 py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-yellow-600 hover:bg-yellow-700'} transition`}
                    >
                        {loading ? 
                            escalas.length === 0 ? 'Carregando...' : 'Reprocessando...'
                        : 'Reprocessar Overbooking'}
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
                        {progress} de {escalas.length} escalas reprocessadas
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