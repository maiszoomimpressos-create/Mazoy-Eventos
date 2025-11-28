import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import AuthStatusMenu from '@/components/AuthStatusMenu';
import MobileMenu from '@/components/MobileMenu';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { Loader2 } from 'lucide-react';

const MIN_LOADING_TIME_MS = 1000; // Tempo mínimo em milissegundos para exibir o loader

const ClientLayout: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [loadingSession, setLoadingSession] = useState(true);
    const [showDelayedLoader, setShowDelayedLoader] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
            setLoadingSession(false);
        });
    }, []);

    const { profile, isLoading: isLoadingProfile } = useProfile(userId);

    // Combined loading state for ClientLayout
    const isLoadingCombined = loadingSession || isLoadingProfile;

    // Efeito para controlar o atraso do loader
    useEffect(() => {
        if (isLoadingCombined) {
            setShowDelayedLoader(true);
        } else {
            const timer = setTimeout(() => {
                setShowDelayedLoader(false);
            }, MIN_LOADING_TIME_MS);
            return () => clearTimeout(timer);
        }
    }, [isLoadingCombined]);

    if (isLoadingCombined || showDelayedLoader) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <header className="fixed top-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md border-b border-yellow-500/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4 sm:space-x-8">
                        <div 
                            className="text-xl sm:text-2xl font-serif text-yellow-500 font-bold cursor-pointer" 
                            onClick={() => navigate('/')}
                        >
                            Mazoy
                        </div>
                        <nav className="hidden md:flex items-center space-x-8">
                            <a href="/#home" className="text-white hover:text-yellow-500 transition-colors duration-300 cursor-pointer">Home</a>
                            <a href="/#eventos" className="text-white hover:text-yellow-500 transition-colors duration-300 cursor-pointer">Eventos</a>
                            <a href="/#categorias" className="text-white hover:text-yellow-500 transition-colors duration-300 cursor-pointer">Categorias</a>
                            <a href="/#contato" className="text-white hover:text-yellow-500 transition-colors duration-300 cursor-pointer">Contato</a>
                        </nav>
                    </div>
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        {/* O campo de busca foi removido daqui e movido para Index.tsx */}
                        <div className="hidden md:block">
                            <AuthStatusMenu />
                        </div>
                        <MobileMenu />
                    </div>
                </div>
            </header>
            <main className="pt-20">
                <Outlet />
            </main>
        </div>
    );
};

export default ClientLayout;