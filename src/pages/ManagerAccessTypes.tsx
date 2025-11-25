import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Loader2, Edit, Trash2, Tag, Calendar, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useManagerEvents, ManagerEvent } from '@/hooks/use-manager-events';
import { useAccessTypes, AccessTypeData } from '@/hooks/use-access-types';
import { showError, showSuccess } from '@/utils/toast';

const ManagerAccessTypes: React.FC = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [newAccessTypeName, setNewAccessTypeName] = useState('');
    const [newAccessTypeDescription, setNewAccessTypeDescription] = useState('');
    const [editingAccessType, setEditingAccessType] = useState<AccessTypeData | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUserId(user?.id);
        });
    }, []);

    const { events, isLoading: isLoadingEvents, isError: isErrorEvents } = useManagerEvents(userId);
    const { 
        accessTypes, 
        isLoading: isLoadingAccessTypes, 
        isError: isErrorAccessTypes,
        createAccessType,
        updateAccessType,
        deleteAccessType,
        isCreating,
        isUpdating,
        isDeleting,
    } = useAccessTypes(selectedEventId);

    const handleCreateAccessType = async () => {
        if (!selectedEventId || !newAccessTypeName.trim()) {
            showError("Selecione um evento e insira um nome para o tipo de acesso.");
            return;
        }
        try {
            await createAccessType({
                event_id: selectedEventId,
                name: newAccessTypeName.trim(),
                description: newAccessTypeDescription.trim() || null,
            });
            setNewAccessTypeName('');
            setNewAccessTypeDescription('');
        } catch (error) {
            // Erro já tratado no hook
        }
    };

    const handleEditAccessType = (accessType: AccessTypeData) => {
        setEditingAccessType(accessType);
        setNewAccessTypeName(accessType.name);
        setNewAccessTypeDescription(accessType.description || '');
    };

    const handleUpdateAccessType = async () => {
        if (!editingAccessType || !newAccessTypeName.trim()) {
            showError("Insira um nome para o tipo de acesso.");
            return;
        }
        try {
            await updateAccessType({
                id: editingAccessType.id,
                name: newAccessTypeName.trim(),
                description: newAccessTypeDescription.trim() || null,
                updated_at: new Date().toISOString(),
            });
            setEditingAccessType(null);
            setNewAccessTypeName('');
            setNewAccessTypeDescription('');
        } catch (error) {
            // Erro já tratado no hook
        }
    };

    const handleDeleteAccessType = async (id: string) => {
        try {
            await deleteAccessType(id);
        } catch (error) {
            // Erro já tratado no hook
        }
    };

    const handleCancelEdit = () => {
        setEditingAccessType(null);
        setNewAccessTypeName('');
        setNewAccessTypeDescription('');
    };

    const loading = isLoadingEvents || isLoadingAccessTypes;
    const error = isErrorEvents || isErrorAccessTypes;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-0 text-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">Carregando dados...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 text-center py-10 flex flex-col items-center">
                <AlertTriangle className="h-10 w-10 mb-4" />
                Erro ao carregar dados. Verifique sua conexão ou tente novamente.
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl sm:text-3xl font-serif text-yellow-500 flex items-center">
                    <Tag className="h-7 w-7 mr-3" />
                    Gerenciar Tipos de Acesso
                </h1>
                <Button 
                    onClick={() => navigate('/manager/settings')}
                    variant="outline"
                    className="bg-black/60 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10 p-6 mb-8">
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-white text-xl sm:text-2xl font-semibold">
                        {editingAccessType ? "Editar Tipo de Acesso" : "Adicionar Novo Tipo de Acesso"}
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Defina tipos de acesso personalizados para suas pulseiras.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                    <div>
                        <label htmlFor="eventSelect" className="block text-sm font-medium text-white mb-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-yellow-500" />
                            Selecionar Evento *
                        </label>
                        <Select onValueChange={setSelectedEventId} value={selectedEventId} disabled={isCreating || isUpdating || isDeleting}>
                            <SelectTrigger className="w-full bg-black/60 border-yellow-500/30 text-white focus:ring-yellow-500">
                                <SelectValue placeholder="Escolha um evento" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-yellow-500/30 text-white">
                                {events.length === 0 ? (
                                    <SelectItem value="" disabled>Nenhum evento cadastrado</SelectItem>
                                ) : (
                                    events.map((event: ManagerEvent) => (
                                        <SelectItem key={event.id} value={event.id} className="hover:bg-yellow-500/10 cursor-pointer">
                                            {event.title}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {!selectedEventId && (
                            <p className="text-red-400 text-xs mt-1 flex items-center">
                                <Info className="h-3 w-3 mr-1" />
                                Selecione um evento para gerenciar seus tipos de acesso.
                            </p>
                        )}
                    </div>

                    {selectedEventId && (
                        <>
                            <div>
                                <label htmlFor="accessTypeName" className="block text-sm font-medium text-white mb-2 flex items-center">
                                    <Tag className="h-4 w-4 mr-2 text-yellow-500" />
                                    Nome do Tipo de Acesso *
                                </label>
                                <Input 
                                    id="accessTypeName" 
                                    value={newAccessTypeName} 
                                    onChange={(e) => setNewAccessTypeName(e.target.value)} 
                                    placeholder="Ex: VIP, Staff, Plateia Premium"
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500"
                                    disabled={isCreating || isUpdating || isDeleting}
                                />
                            </div>
                            <div>
                                <label htmlFor="accessTypeDescription" className="block text-sm font-medium text-white mb-2 flex items-center">
                                    <Info className="h-4 w-4 mr-2 text-yellow-500" />
                                    Descrição (Opcional)
                                </label>
                                <Textarea 
                                    id="accessTypeDescription" 
                                    value={newAccessTypeDescription} 
                                    onChange={(e) => setNewAccessTypeDescription(e.target.value)} 
                                    placeholder="Breve descrição sobre este tipo de acesso."
                                    className="bg-black/60 border-yellow-500/30 text-white placeholder-gray-500 focus:border-yellow-500 min-h-[60px]"
                                    disabled={isCreating || isUpdating || isDeleting}
                                />
                            </div>
                            <div className="flex space-x-4">
                                {editingAccessType ? (
                                    <>
                                        <Button
                                            onClick={handleUpdateAccessType}
                                            disabled={isUpdating || !newAccessTypeName.trim()}
                                            className="flex-1 bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                                        >
                                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Edit className="w-5 h-5 mr-2" /> Atualizar Tipo</>}
                                        </Button>
                                        <Button
                                            onClick={handleCancelEdit}
                                            variant="outline"
                                            className="flex-1 bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer"
                                            disabled={isUpdating}
                                        >
                                            Cancelar
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={handleCreateAccessType}
                                        disabled={isCreating || !newAccessTypeName.trim()}
                                        className="w-full bg-yellow-500 text-black hover:bg-yellow-600 py-3 text-lg font-semibold transition-all duration-300 cursor-pointer disabled:opacity-50"
                                    >
                                        {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Adicionar Tipo</>}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {selectedEventId && (
                <Card className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-2xl shadow-2xl shadow-yellow-500/10 p-6">
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-white text-xl sm:text-2xl font-semibold">Tipos de Acesso Existentes</CardTitle>
                        <CardDescription className="text-gray-400 text-sm">
                            Lista de tipos de acesso para o evento selecionado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingAccessTypes ? (
                            <div className="text-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-yellow-500 mx-auto mb-4" />
                                <p className="text-gray-400">Carregando tipos de acesso...</p>
                            </div>
                        ) : accessTypes.length === 0 ? (
                            <div className="text-center py-10">
                                <Tag className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 text-lg">Nenhum tipo de acesso cadastrado para este evento.</p>
                                <p className="text-gray-500 text-sm mt-2">Use o formulário acima para adicionar um novo.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full min-w-[600px]">
                                    <TableHeader>
                                        <TableRow className="border-b border-yellow-500/20 text-sm hover:bg-black/40">
                                            <TableHead className="text-left text-gray-400 font-semibold py-3 w-[30%]">Nome</TableHead>
                                            <TableHead className="text-left text-gray-400 font-semibold py-3 w-[50%]">Descrição</TableHead>
                                            <TableHead className="text-right text-gray-400 font-semibold py-3 w-[20%]">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {accessTypes.map((type) => (
                                            <TableRow key={type.id} className="border-b border-yellow-500/10 hover:bg-black/40 transition-colors text-sm">
                                                <TableCell className="py-4">
                                                    <div className="text-white font-medium">{type.name}</div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="text-gray-300 truncate max-w-[300px]">{type.description || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 h-8 px-3 mr-2"
                                                        onClick={() => handleEditAccessType(type)}
                                                        disabled={isCreating || isUpdating || isDeleting}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button 
                                                                variant="destructive" 
                                                                size="sm"
                                                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 h-8 px-3"
                                                                disabled={isCreating || isUpdating || isDeleting}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-black/90 border border-red-500/30 text-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="text-red-400">Tem certeza absoluta?</AlertDialogTitle>
                                                                <AlertDialogDescription className="text-gray-400">
                                                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o tipo de acesso 
                                                                    <span className="font-semibold text-white"> "{type.name}" </span> 
                                                                    e pode afetar pulseiras que o utilizam.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-black/60 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                                                                    Cancelar
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={() => handleDeleteAccessType(type.id)} 
                                                                    className="bg-red-600 text-white hover:bg-red-700"
                                                                    disabled={isDeleting}
                                                                >
                                                                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ManagerAccessTypes;