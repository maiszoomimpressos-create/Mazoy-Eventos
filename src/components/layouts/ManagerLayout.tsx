import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const ManagerLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/manager/dashboard', label: 'Dashboard' },
        { path: '/manager/events/create', label: 'Eventos' },
        { path: '#', label: 'Pulseiras' },
        { path: '#', label: 'Relatórios' },
        { path: '#', label: 'Configurações' },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-yellow-500/20">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="text-2xl font-serif text-yellow-500 font-bold flex items-center">
                            Mazoy
                            <span className="ml-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-3 py-1 rounded-lg text-sm font-bold">PRO</span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-6">
                            {navItems.map(item => (
                                <button 
                                    key={item.path}
                                    onClick={() => item.path !== '#' && navigate(item.path)} 
                                    className={`transition-colors duration-300 cursor-pointer pb-1 ${
                                        location.pathname === item.path 
                                        ? 'text-yellow-500 border-b-2 border-yellow-500 font-semibold' 
                                        : 'text-white hover:text-yellow-500'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="relative p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors cursor-pointer">
                            <i className="fas fa-bell text-lg"></i>
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">3</span>
                        </button>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold">
                                <i className="fas fa-user-tie"></i>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-semibold">João Manager</div>
                                <div className="text-gray-400 text-xs">Administrador PRO</div>
                            </div>
                        </div>
                        <Button
                            onClick={() => navigate('/')}
                            className="bg-transparent border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-all duration-300 cursor-pointer"
                        >
                            Sair
                        </Button>
                    </div>
                </div>
            </header>
            <main className="pt-20 p-6">
                <Outlet />
            </main>
        </div>
    );
};

export default ManagerLayout;