import { Head, Link } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export default function Menu() {
    // const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Menu Principal">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 dark:from-gray-900 dark:to-gray-800">
                <header className="mb-8 w-full max-w-7xl mx-auto">
                    <nav className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sistema de Atendimento</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* {auth.user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Olá, {auth.user.name}
                                    </span>
                                    <Link
                                        href={'/dashboard'}
                                        className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Dashboard
                                    </Link>
                                </div>
                            ) : ( */}
                                <div className="flex items-center space-x-4">
                                    <Link
                                        href={'/login'}
                                        className="text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                    >
                                        Entrar
                                    </Link>
                                    <Link
                                        href={'/register'}
                                        className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Registrar
                                    </Link>
                                </div>
                            {/* )} */}
                        </div>
                    </nav>
                </header>

                <main className="mx-auto max-w-7xl">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Menu Principal
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300">
                            Acesse as funcionalidades do sistema
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Card de Atendimento */}
                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800">
                            <div className="p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-lg mb-6 mx-auto dark:bg-indigo-900">
                                    <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                                    Atendimentos
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                                    Visualize e gerencie todos os atendimentos cadastrados no sistema
                                </p>
                                <Link
                                    href={'/atendimento.index'}
                                    className="block w-full text-center bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
                                >
                                    Acessar Atendimentos
                                </Link>
                            </div>
                        </div>

                        {/* Card de Reprocessar Overbooking */}
                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800">
                            <div className="p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg mb-6 mx-auto dark:bg-yellow-900">
                                    <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                                    Reprocessar Overbooking
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                                    Execute o reprocessamento dos agendamentos com overbooking
                                </p>
                                <Link
                                    href={'/overbooking'}
                                    className="block w-full text-center bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 transition-colors duration-200 font-medium"
                                >
                                    Reprocessar
                                </Link>
                            </div>
                        </div>

                        {/* Card para ir pra recepção */}
                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800">
                            <div className="p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-lg mb-6 mx-auto dark:bg-purple-900">
                                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M16 3h-1a2 2 0 00-2 2v1H9V5a2 2 0 00-2-2H6a2 2 0 00-2 2v1h16V5a2 2 0
                                        00-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                                    Recepção
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                                    Acesse o módulo de recepção para gerenciar atendimentos
                                </p>
                                <Link
                                    href={'/recepcao'}
                                    className="block w-full text-center bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
                                >
                                    Ir para Recepção
                                </Link>
                            </div>
                        </div>

                        {/* Card para ir para assinatura */}
                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800">
                            <div className="p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg mb-6 mx-auto dark:bg-yellow-900">
                                    <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                                    Assinatura
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                                    Acesse o módulo de assinatura para gerenciar atendimentos
                                </p>
                                <Link
                                    href={'/assinatura'}
                                    className="block w-full text-center bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 transition-colors duration-200 font-medium"
                                >
                                    Ir para Assinatura
                                </Link>
                            </div>
                        </div>

                        {/* Card do Dashboard */}
                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800">
                            <div className="p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mb-6 mx-auto dark:bg-green-900">
                                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                                    Dashboard2
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                                    Acesse o painel administrativo do sistema
                                </p>
                                {/* {auth.user ? (
                                    <Link
                                        href={'/dashboard'}
                                        className="block w-full text-center bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
                                    >
                                        Acessar Dashboard
                                    </Link>
                                ) : ( */}
                                    <Link
                                        href={'/login'}
                                        className="block w-full text-center bg-gray-400 text-white py-3 px-4 rounded-lg cursor-not-allowed font-medium"
                                        title="Faça login para acessar"
                                    >
                                        Login Necessário
                                    </Link>
                                {/* )} */}
                            </div>
                        </div>

                        {/* Card de Configurações */}
                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-gray-800">
                            <div className="p-8">
                                <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg mb-6 mx-auto dark:bg-gray-700">
                                    <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-4">
                                    Configurações
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                                    Gerencie as configurações do sistema (em breve)
                                </p>
                                <button
                                    disabled
                                    className="block w-full text-center bg-gray-300 text-gray-500 py-3 px-4 rounded-lg cursor-not-allowed font-medium"
                                >
                                    Em Desenvolvimento
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                            Sistema de Atendimento © 2025 - Desenvolvido com Laravel e React teste
                        </p>
                    </div>
                </main>
            </div>
        </>
    );
}
