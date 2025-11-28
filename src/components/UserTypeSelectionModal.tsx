import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { User, Building2, ArrowRight } from 'lucide-react';

interface UserTypeSelectionModalProps {
    isOpen: boolean;
    onSelect: (type: 'PF' | 'PJ') => void;
    onClose: () => void;
    isProcessing: boolean;
}

const UserTypeSelectionModal: React.FC<UserTypeSelectionModalProps> = ({ isOpen, onSelect, onClose, isProcessing }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] bg-black/90 border border-yellow-500/30 text-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-yellow-500 text-2xl flex items-center">
                        <User className="h-6 w-6 mr-2" />
                        Tipo de Gestor
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Selecione o tipo de entidade que você representará na plataforma.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 pt-4">
                    {/* Opção Pessoa Física (PF) */}
                    <div 
                        className="p-4 bg-black/60 border border-yellow-500/30 rounded-xl cursor-pointer hover:bg-yellow-500/10 transition-all duration-300"
                        onClick={() => onSelect('PF')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <User className="h-5 w-5 text-yellow-500" />
                                <div>
                                    <p className="text-white font-semibold">Pessoa Física (PF)</p>
                                    <p className="text-gray-400 text-xs">Para promotores individuais.</p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-yellow-500" />
                        </div>
                    </div>

                    {/* Opção Pessoa Jurídica (PJ) */}
                    <div 
                        className="p-4 bg-black/60 border border-yellow-500/30 rounded-xl cursor-pointer hover:bg-yellow-500/10 transition-all duration-300"
                        onClick={() => onSelect('PJ')}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5 text-yellow-500" />
                                <div>
                                    <p className="text-white font-semibold">Pessoa Jurídica (PJ)</p>
                                    <p className="text-gray-400 text-xs">Para empresas e agências de eventos.</p>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-yellow-500" />
                        </div>
                    </div>
                </div>
                
                <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full mt-4 bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                    disabled={isProcessing}
                >
                    Voltar
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default UserTypeSelectionModal;