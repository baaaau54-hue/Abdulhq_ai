import React, { useState } from 'react';

interface ApiKeyEntryScreenProps {
  onKeySubmit: (key: string) => void;
}

export const ApiKeyEntryScreen: React.FC<ApiKeyEntryScreenProps> = ({ onKeySubmit }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onKeySubmit(key.trim());
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white p-8">
      <div className="text-center bg-slate-800 p-8 rounded-lg shadow-2xl max-w-lg w-full">
        <h1 className="text-3xl font-bold text-slate-100 mb-2 font-cairo">مرحبًا في CogniLink V1.2 PRO</h1>
        <p className="text-slate-400 mb-8 font-cairo">
          لاستخدام التطبيق، يرجى إدخال مفتاح واجهة برمجة تطبيقات Google Gemini الخاص بك.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="أدخل مفتاح API هنا..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-center text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            aria-label="Gemini API Key"
          />
          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full px-6 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
          >
            <span className="font-cairo">حفظ وبدء الاستخدام</span>
          </button>
        </form>
        <p className="mt-6 text-xs text-slate-500">
          لن يتم تخزين مفتاحك إلا في متصفحك.
        </p>
      </div>
    </div>
  );
};