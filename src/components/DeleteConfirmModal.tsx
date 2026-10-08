import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: InventoryItem | null;
  itemsCount?: number;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  itemsCount = 1
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-red-100">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-center text-slate-900 mb-2">
            Confirmar Exclusão de Registro
          </h3>

          <p className="text-sm text-slate-600 text-center mb-4">
            {item ? (
              <>
                Tem certeza de que deseja excluir o equipamento{' '}
                <strong className="text-slate-900 font-mono">{item.nome || item.serial}</strong> ({item.marca} {item.modelo}) alocado para{' '}
                <strong className="text-slate-900">{item.responsavel || 'Sem responsável'}</strong> no setor{' '}
                <strong className="text-slate-900">{item.setor}</strong>?
              </>
            ) : (
              <>Tem certeza de que deseja remover {itemsCount} equipamento(s) selecionado(s)?</>
            )}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-6 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Esta ação removerá o registro do sistema local e das sincronizações futuras com a planilha de controle central.
            </span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
