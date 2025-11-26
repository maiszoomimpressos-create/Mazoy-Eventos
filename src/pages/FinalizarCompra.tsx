import React from 'react';
import { useNavigate } from 'react-router-dom';

const FinalizarCompra: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <div className="text-center p-8">
                <h1 className="text-3xl font-serif text-yellow-500 mb-4">Finalizar Compra</h1>
                <p className="text-gray-400">Pronto para receber o código de checkout.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="mt-6 text-yellow-500 hover:text-yellow-400 underline"
                >
                    Voltar para a Home
                </button>
            </div>
        </div>
    );
};

export default FinalizarCompra;