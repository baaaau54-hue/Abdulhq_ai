import React, { useState, useEffect } from 'react';
import type { Avatar } from '../types';
import { XMarkIcon } from './icons';

interface EditAvatarModalProps {
  avatar: Avatar;
  isOpen: boolean;
  onClose: () => void;
  onSave: (avatar: Avatar) => void;
}

export const EditAvatarModal: React.FC<EditAvatarModalProps> = ({ avatar, isOpen, onClose, onSave }) => {
  const [editedAvatar, setEditedAvatar] = useState<Avatar>(avatar);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Ensure settings are present for older avatars
      setEditedAvatar({ 
        ...avatar, 
        temperature: avatar.temperature ?? 0.8,
        webAccess: avatar.webAccess ?? false,
      });
      setError(null);
    }
  }, [avatar, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = e.target.type === 'checkbox';
    
    setEditedAvatar(prev => ({ 
      ...prev, 
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (type === 'range' ? parseFloat(value) : value)
    }));
  };

  const handleSave = () => {
    if (!editedAvatar.name.trim() || !editedAvatar.description.trim() || !editedAvatar.primeDirective.trim()) {
      setError("يرجى ملء جميع الحقول.");
      return;
    }
    onSave(editedAvatar);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100 font-cairo">تعديل الشخصية</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1 text-right">الاسم</label>
            <input type="text" id="name" name="name" value={editedAvatar.name} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-right" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1 text-right">الوصف</label>
            <textarea id="description" name="description" value={editedAvatar.description} onChange={handleChange} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y text-right" />
          </div>
          <div>
            <label htmlFor="primeDirective" className="block text-sm font-medium text-slate-300 mb-1 text-right">التوجيه الأساسي (System Prompt)</label>
            <textarea id="primeDirective" name="primeDirective" value={editedAvatar.primeDirective} onChange={handleChange} rows={6} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y text-left" dir="ltr" />
          </div>
          <div className="pt-2 space-y-6">
             <h3 className="text-lg font-semibold text-slate-200 mb-1 text-right border-b border-slate-700 pb-2">الإعدادات المتقدمة</h3>
             
             <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="webAccess" className="block text-sm font-medium text-slate-300 text-right">الوصول إلى الويب</label>
                  <p className="text-xs text-slate-400 text-right">السماح للنموذج بالوصول إلى بحث Google للحصول على معلومات حديثة.</p>
                </div>
                <label htmlFor="webAccess" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="webAccess" name="webAccess" checked={editedAvatar.webAccess} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
             </div>

             <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-slate-300 mb-2 text-right">
                  درجة الحرارة (Temperature): <span className="font-mono text-indigo-400">{editedAvatar.temperature?.toFixed(1)}</span>
                </label>
                <p className="text-xs text-slate-400 mb-3 text-right">
                  تحكم في إبداع النموذج. القيم المنخفضة (مثل 0.1) تجعل الردود أكثر تركيزًا، بينما القيم المرتفعة (مثل 1.0) تجعلها أكثر تنوعًا.
                </p>
                <input 
                  type="range" 
                  id="temperature" 
                  name="temperature"
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={editedAvatar.temperature} 
                  onChange={handleChange}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  dir="ltr"
                />
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 text-right">الصورة الرمزية</label>
            <div className="flex justify-end">
              <img src={editedAvatar.imageDataUri} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-slate-600" />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </main>
        <footer className="flex justify-end gap-4 p-4 border-t border-slate-700 flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 font-semibold text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors">إلغاء</button>
          <button onClick={handleSave} className="px-6 py-2 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">حفظ التغييرات</button>
        </footer>
      </div>
    </div>
  );
};