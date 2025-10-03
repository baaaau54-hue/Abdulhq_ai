import React from 'react';
import type { Avatar } from '../types';
import { PlusIcon, TrashIcon, ChevronDoubleLeftIcon, KeyIcon } from './icons';

interface AvatarSidebarProps {
  avatars: Avatar[];
  selectedAvatarId: string | null;
  onSelectAvatar: (id: string) => void;
  onNewAvatar: () => void;
  onDeleteAvatar: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onResetKey: () => void;
}

export const AvatarSidebar: React.FC<AvatarSidebarProps> = ({
  avatars,
  selectedAvatarId,
  onSelectAvatar,
  onNewAvatar,
  onDeleteAvatar,
  isCollapsed,
  onToggle,
  onResetKey
}) => {
  const handleDelete = (e: React.MouseEvent, avatarId: string) => {
    e.stopPropagation();
    onDeleteAvatar(avatarId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 border-r border-slate-700/50 p-3 space-y-4">
      <button
        onClick={onNewAvatar}
        className={`flex items-center justify-center w-full py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all duration-200 ${isCollapsed ? 'px-3' : 'px-4'}`}
        aria-label={isCollapsed ? "إنشاء شخصية جديدة" : "إنشاء شخصية جديدة"}
      >
        {!isCollapsed && <span className="font-cairo text-sm">إنشاء شخصية جديدة</span>}
        <PlusIcon className={`w-5 h-5 flex-shrink-0 ${!isCollapsed ? 'ms-2' : ''}`} />
      </button>

      <div className="flex-grow overflow-y-auto space-y-2 -ms-1 -me-2 pe-1">
        {avatars.map((avatar) => (
          <div
            key={avatar.id}
            title={isCollapsed ? avatar.name : ''}
            onClick={() => onSelectAvatar(avatar.id)}
            className={`group flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 relative ${isCollapsed ? 'justify-center' : ''} ${selectedAvatarId === avatar.id ? 'bg-indigo-500/30 ring-1 ring-indigo-500' : 'hover:bg-slate-700/50'}`}
          >
            <img
              src={avatar.imageDataUri}
              alt={avatar.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 flex-shrink-0"
            />
            {!isCollapsed && (
              <>
                <span className="ms-3 font-semibold text-slate-100 truncate text-sm">{avatar.name}</span>
                <button
                  onClick={(e) => handleDelete(e, avatar.id)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-700/50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/50 hover:text-white transition-all duration-200"
                  aria-label={`Delete ${avatar.name}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700/50 -mx-3 mt-auto pt-2 space-y-1">
        <button
          onClick={onResetKey}
          className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors duration-200"
          title="إعادة تعيين مفتاح API"
        >
          <KeyIcon className="w-5 h-5" />
          {!isCollapsed && <span className="text-xs">إعادة تعيين المفتاح</span>}
        </button>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors duration-200"
          aria-label={isCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
        >
          <ChevronDoubleLeftIcon className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};