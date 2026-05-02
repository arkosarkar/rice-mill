import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ isOpen, onClose, title, children, formId, submitText = 'Save', isSaving = false, hideFooter = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-slate-50/90 border border-slate-200 rounded-[2.5rem] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col m-4 relative" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-10 py-8 border-b border-slate-200 bg-white/80 backdrop-blur-md flex justify-between items-center shrink-0 z-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{title}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-rose-600 p-3 hover:bg-rose-50 rounded-full transition-all active:scale-95"
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
        </div>
        
        <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
        
        {!hideFooter && (
          <div className="px-10 py-6 border-t border-slate-200 bg-white/80 backdrop-blur-md flex justify-end gap-4 shrink-0 z-10">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-8 py-3.5 rounded-2xl font-black text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 uppercase text-xs tracking-widest transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form={formId} 
              disabled={isSaving}
              className="bg-slate-900 text-white px-12 py-3.5 rounded-2xl font-black hover:bg-indigo-600 shadow-xl transition-all transform active:scale-95 uppercase text-xs tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Processing...' : submitText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
