import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface PurchaseItem {
    ticketTypeId: string; // ID da pulseira base (wristband ID)
    quantity: number;
    price: number;
}

interface PurchaseDetails {
    eventId: string;
    purchaseItems: PurchaseItem[];
}

export const usePurchaseTicket = () => {
    const [isLoading, setIsLoading] = useState(false);

    const purchaseTicket = async (details: PurchaseDetails) => {
        const { eventId, purchaseItems } = details;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showError("Você precisa estar logado para finalizar a compra.");
            return false;
        }
        
        if (purchaseItems.length === 0) {
            showError("Nenhum item selecionado para compra.");
            return false;
        }

        setIsLoading(true);

        try {
            // Chamar a Edge Function para processar a transação de forma segura
            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('process-ticket-purchase', {
                body: {
                    eventId: eventId,
                    purchaseItems: purchaseItems,
                },
            });

            if (edgeError) {
                throw new Error(edgeError.message);
            }
            
            if (edgeData.error) {
                throw new Error(edgeData.error);
            }
            
            // Verifica o status retornado pela Edge Function
            if (edgeData.status === 'paid') {
                showSuccess(`Compra de ${edgeData.ticketsAssigned} ingressos concluída com sucesso!`);
                return true;
            } else {
                // Se a Edge Function retornou sucesso, mas o status não é 'paid' (e.g., 'failed' simulation)
                throw new Error(edgeData.error || "Falha na transação de pagamento.");
            }

        } catch (error: any) {
            console.error("Transaction Error:", error);
            showError(error.message || "Falha na transação de compra. Tente novamente.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        purchaseTicket,
    };
};