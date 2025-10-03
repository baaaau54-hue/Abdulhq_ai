
import React, { useState } from 'react';
import { LoadingSpinner } from './icons';
import { isRateLimitError } from '../utils/helpers';

interface AvatarCreationProps {
    onCreateAvatar: (description: string) => Promise<void>;
}

export const AvatarCreation: React.FC<AvatarCreationProps> = ({ onCreateAvatar }) => {
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            setError('يرجى تقديم وصف.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            await onCreateAvatar(description);
        } catch (err) {
            console.error(err);
            if (isRateLimitError(err)) {
                setError('لقد تجاوزت الحصة المخصصة لك. يرجى الانتظار لحظة ثم المحاولة مرة أخرى.');
            } else {
                setError('لا يمكن إنشاء الشخصية. ' + (err instanceof Error ? err.message : 'حدث خطأ غير متوقع.'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-900 text-center">
            <div className="w-full max-w-2xl">
                <h2 className="text-4xl font-bold text-slate-100 mb-2 font-cairo">
                    أنشئ شخصيتك الرمزية
                </h2>
                <p className="text-slate-400 mb-8 font-cairo">
                    ابدأ بوصف الشخصية التي تريد إنشاءها. كن مبدعًا ومفصلاً قدر الإمكان.
                </p>
                <form onSubmit={handleSubmit} className="w-full">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="على سبيل المثال: فيلسوف رواقي يساعد في اتخاذ القرارات، أو ملهمة إبداعية لإشعال الأفكار الجديدة..."
                        className="w-full h-40 p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-200 resize-none text-right"
                        dir="rtl"
                        disabled={isLoading}
                    />
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading || !description.trim()}
                        className="mt-6 w-full flex items-center justify-center px-6 py-4 text-lg font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {isLoading ? (
                            <>
                                <span className="font-cairo">جاري الإنشاء...</span>
                                <LoadingSpinner className="w-6 h-6 ms-3" />
                            </>
                        ) : (
                            <span className="font-cairo">إنشاء الرابط المعرفي</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
