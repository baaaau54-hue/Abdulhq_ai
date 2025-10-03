import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { useLocalStorage } from './hooks/useLocalStorage';
import { createAiClient, generateAvatarProfile, generateAvatarImage } from './services/geminiService';
import { permissiveSafetySettings } from './constants';
import { generatePlaceholderAvatar, dataUriToGeminiPart } from './utils/helpers';
import type { Avatar, ChatMessage, ChatHistories } from './types';
import { ApiKeyEntryScreen } from './components/ApiKeyEntryScreen';
import { AvatarSidebar } from './components/AvatarSidebar';
import { ChatView } from './components/ChatView';
import { AvatarCreation } from './components/AvatarCreation';
import { EditAvatarModal } from './components/EditAvatarModal';
import { FullScreenToggle } from './components/FullScreenToggle';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useLocalStorage<string | null>('cognilink-api-key', null);

    const aiInstance = useMemo(() => {
        if (!apiKey) return null;
        try {
            return createAiClient(apiKey);
        } catch (e) {
            console.error("Failed to initialize GoogleGenAI, likely an invalid API key format.", e);
            setApiKey(null);
            return null;
        }
    }, [apiKey, setApiKey]);

    const handleKeySubmit = (key: string) => {
        setApiKey(key);
    };

    const handleResetKey = () => {
        if (window.confirm('هل أنت متأكد من أنك تريد إعادة تعيين مفتاح API الخاص بك؟')) {
            setApiKey(null);
        }
    };

    if (!aiInstance) {
        return <ApiKeyEntryScreen onKeySubmit={handleKeySubmit} />;
    }

    return <MainApp ai={aiInstance} onResetKey={handleResetKey} />;
};

interface MainAppProps {
    ai: GoogleGenAI;
    onResetKey: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ ai, onResetKey }) => {
    const [avatars, setAvatars] = useLocalStorage<Avatar[]>('cognilink-avatars', []);
    const [chatHistories, setChatHistories] = useLocalStorage<ChatHistories>('cognilink-chat-histories', {});
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(() => {
        const savedAvatars = localStorage.getItem('cognilink-avatars');
        if (savedAvatars) {
            try {
                const parsedAvatars = JSON.parse(savedAvatars);
                if (Array.isArray(parsedAvatars) && parsedAvatars.length > 0) {
                    return parsedAvatars[0].id;
                }
            } catch (e) {
                console.error("Failed to parse avatars from localStorage on init.", e);
            }
        }
        return null;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const chatSessionsRef = useRef<Record<string, Chat>>({});

    // Data migration effect for old chat history format
    useEffect(() => {
        const histories = localStorage.getItem('cognilink-chat-histories');
        if (histories?.includes('"imageUri"')) {
            const parsedHistories: ChatHistories = JSON.parse(histories);
            let needsUpdate = false;
            Object.values(parsedHistories).forEach(history => {
                history.forEach(message => {
                    if ((message as any).imageUri) {
                        needsUpdate = true;
                        const imageUri = (message as any).imageUri;
                        message.attachment = {
                            name: 'image.png',
                            dataUri: imageUri,
                            mimeType: imageUri.split(';')[0].split(':')[1] || 'image/png',
                        };
                        delete (message as any).imageUri;
                    }
                });
            });
            if (needsUpdate) {
                setChatHistories(parsedHistories);
            }
        }
    }, [setChatHistories]);

    const selectedAvatar = useMemo(() => avatars.find(a => a.id === selectedAvatarId) || null, [avatars, selectedAvatarId]);
    const selectedChatHistory = useMemo(() => selectedAvatarId ? chatHistories[selectedAvatarId] || [] : [], [chatHistories, selectedAvatarId]);

    const chatSession = useMemo(() => {
        if (!selectedAvatar) return null;
        const { id: avatarId, primeDirective, temperature, webAccess } = selectedAvatar;
        
        // Invalidate session if config changes
        delete chatSessionsRef.current[avatarId];

        const history = (chatHistories[avatarId] || []).map(msg => {
            const parts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [];
            if (msg.content) parts.push({ text: msg.content });
            if (msg.attachment) {
                const geminiPart = dataUriToGeminiPart(msg.attachment.dataUri);
                if (geminiPart) parts.push(geminiPart);
            }
            return { role: msg.role, parts };
        }).filter(item => item.parts.length > 0);
        
        const config: any = { 
            systemInstruction: primeDirective,
            safetySettings: permissiveSafetySettings,
            temperature: temperature ?? 0.8,
        };
        
        if (webAccess) {
            config.tools = [{googleSearch: {}}];
        }

        chatSessionsRef.current[avatarId] = ai.chats.create({
            model: 'gemini-2.5-flash',
            config,
            history,
        });
        
        return chatSessionsRef.current[avatarId];
    }, [selectedAvatar, chatHistories, ai]);

    const handleCreateAvatar = useCallback(async (description: string) => {
        const profile = await generateAvatarProfile(ai, description);
        const newAvatarId = crypto.randomUUID();
        
        let imageDataUri: string;
        try {
            imageDataUri = await generateAvatarImage(ai, description);
        } catch (err) {
            console.error("Image generation failed, falling back to placeholder.", err);
            imageDataUri = generatePlaceholderAvatar(newAvatarId, profile.name);
        }

        const newAvatar: Avatar = {
            id: newAvatarId,
            name: profile.name,
            primeDirective: profile.primeDirective,
            imageDataUri: imageDataUri,
            description: description,
            temperature: 0.8,
            webAccess: false,
        };
        setAvatars(prev => [...prev, newAvatar]);
        setChatHistories(prev => ({ ...prev, [newAvatar.id]: [] }));
        setSelectedAvatarId(newAvatar.id);
        setIsSidebarCollapsed(false);
    }, [ai, setAvatars, setChatHistories]);

    const handleDeleteAvatar = useCallback((avatarIdToDelete: string) => {
        if (!window.confirm('هل أنت متأكد من أنك تريد حذف هذه الشخصية وجميع محادثاتها؟')) return;
        setAvatars(prevAvatars => {
            const updatedAvatars = prevAvatars.filter(a => a.id !== avatarIdToDelete);
            if (selectedAvatarId === avatarIdToDelete) {
                setSelectedAvatarId(updatedAvatars.length > 0 ? updatedAvatars[0].id : null);
            }
            return updatedAvatars;
        });
        setChatHistories(prev => {
            const newHistories = { ...prev };
            delete newHistories[avatarIdToDelete];
            return newHistories;
        });
        delete chatSessionsRef.current[avatarIdToDelete];
    }, [selectedAvatarId, setAvatars, setChatHistories]);

    const handleHistoryUpdate = useCallback((avatarId: string, newMessages: ChatMessage[]) => {
        setChatHistories(prev => ({
            ...prev,
            [avatarId]: [...(prev[avatarId] || []), ...newMessages]
        }));
    }, [setChatHistories]);

    const handleStreamingHistoryUpdate = useCallback((avatarId: string, contentChunk: string) => {
        setChatHistories(prev => {
            const currentHistory = prev[avatarId] || [];
            if (currentHistory.length === 0) return prev;

            const lastMessage = currentHistory[currentHistory.length - 1];
            if (lastMessage.role !== 'model') return prev;

            const updatedLastMessage: ChatMessage = { 
                ...lastMessage, 
                content: lastMessage.content + contentChunk 
            };
            
            const newHistory = [...currentHistory.slice(0, -1), updatedLastMessage];

            return {
                ...prev,
                [avatarId]: newHistory,
            };
        });
    }, [setChatHistories]);

    const handleStreamEnd = useCallback((avatarId: string, finalMessage: ChatMessage) => {
        setChatHistories(prev => {
            const currentHistory = prev[avatarId] || [];
            if (currentHistory.length === 0) return prev;
            
            const newHistory = [...currentHistory.slice(0, -1), finalMessage];

            return { ...prev, [avatarId]: newHistory };
        });
    }, [setChatHistories]);

    const handleUpdateAvatar = useCallback((updatedAvatar: Avatar) => {
        setAvatars(prevAvatars => prevAvatars.map(a => (a.id === updatedAvatar.id ? updatedAvatar : a)));
        delete chatSessionsRef.current[updatedAvatar.id];
        setIsEditModalOpen(false);
    }, [setAvatars]);

    const handleClearHistory = useCallback((avatarId: string) => {
        setChatHistories(prev => ({ ...prev, [avatarId]: [] }));
        delete chatSessionsRef.current[avatarId];
    }, [setChatHistories]);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
            <FullScreenToggle />
            <header className="px-6 py-3 border-b border-slate-700/50 text-center flex-shrink-0">
                <h1 className="text-2xl font-bold text-slate-100">CogniLink V1.2 PRO</h1>
            </header>
            <div className="flex-grow flex overflow-hidden">
                <aside className={`flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-24' : 'w-1/4 max-w-xs min-w-[280px]'}`}>
                    <AvatarSidebar
                        avatars={avatars}
                        selectedAvatarId={selectedAvatarId}
                        onSelectAvatar={setSelectedAvatarId}
                        onNewAvatar={() => {
                            setSelectedAvatarId(null);
                            setIsSidebarCollapsed(false);
                        }}
                        onDeleteAvatar={handleDeleteAvatar}
                        isCollapsed={isSidebarCollapsed}
                        onToggle={() => setIsSidebarCollapsed(p => !p)}
                        onResetKey={onResetKey}
                    />
                </aside>
                <main className="flex-1 h-full overflow-hidden">
                    {selectedAvatar && chatSession ? (
                        <ChatView
                            key={selectedAvatar.id}
                            avatar={selectedAvatar}
                            chatSession={chatSession}
                            chatHistory={selectedChatHistory}
                            onHistoryUpdate={(newMessages) => handleHistoryUpdate(selectedAvatar.id, newMessages)}
                            onStreamingUpdate={(chunk) => handleStreamingHistoryUpdate(selectedAvatar.id, chunk)}
                            onStreamEnd={(finalMessage) => handleStreamEnd(selectedAvatar.id, finalMessage)}
                            onEditAvatar={() => setIsEditModalOpen(true)}
                            onClearHistory={() => handleClearHistory(selectedAvatar.id)}
                        />
                    ) : (
                        <AvatarCreation onCreateAvatar={handleCreateAvatar} />
                    )}
                </main>
            </div>
            {selectedAvatar && (
                <EditAvatarModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    avatar={selectedAvatar}
                    onSave={handleUpdateAvatar}
                />
            )}
        </div>
    );
};

export default App;