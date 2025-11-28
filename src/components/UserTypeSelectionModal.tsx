"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, Building2 } from 'lucide-react';

interface UserTypeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectUserType: (type: 'individual' | 'legal_entity') => void;
    isProcessing: boolean;
}

const UserTypeSelectionModal: React.FC<UserTypeSelectionModalProps> = ({ isOpen, onClose, onSelectUserType, isProcessing }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-black/90 border border-yellow-500/30 text-white p-6">
                <DialogHeader>
                    <DialogTitle className="text-yellow-500 text-2xl">Tipo de Cadastro</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Selecione o tipo de entidade para o seu perfil de gestor.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Button
                        onClick={() => onSelectUserType('individual')}
                        disabled={isProcessing}
                        className="w-full bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                        <User className="mr-2 h-5 w-5" />
                        Pessoa Física
                    </Button>
                    <Button
                        onClick={() => onSelectUserType('legal_entity')}
                        disabled={isProcessing}
                        className="w-full bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                    >
                        <Building2 className="mr-2 h-5 w-5" />
                        Pessoa Jurídica
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UserTypeSelectionModal;