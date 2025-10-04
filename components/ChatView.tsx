import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Chat } from '@google/genai';
import type { Avatar, ChatMessage, Attachment } from '../types';
import { isRateLimitError, dataUriToGeminiPart } from '../utils/helpers';
import { PencilIcon, BackspaceIcon, LoadingSpinner, PaperClipIcon, XMarkIcon, SendIcon, ClipboardIcon, CheckIcon, ArrowDownTrayIcon, GlobeIcon, DocumentTextIcon, MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from './icons';

interface ChatViewProps {
  avatar: Avatar;
  chatSession: Chat;
  chatHistory: ChatMessage[];
  onHistoryUpdate: (newMessages: ChatMessage[]) => void;
  onStreamingUpdate: (contentChunk: string) => void;
  onStreamEnd: (finalMessage: ChatMessage) => void;
  onEditAvatar: () => void;
  onClearHistory: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ avatar, chatSession, chatHistory, onHistoryUpdate, onStreamingUpdate, onStreamEnd, onEditAvatar, onClearHistory }) => {
  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const userInputBeforeListening = useRef<string>('');

  const displayedMessages = chatHistory;

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [displayedMessages, isStreaming]);
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setUserInput(userInputBeforeListening.current + finalTranscript + interimTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if(event.error === 'not-allowed') {
            alert('تم رفض إذن الميكروفون. يرجى السماح بالوصول في إعدادات متصفحك.');
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleExportChat = () => {
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${avatar.name}-Chat-${today}.md`;

    let markdownContent = `# Chat with ${avatar.name} on ${today}\n\n`;

    chatHistory.forEach(msg => {
      const prefix = msg.role === 'user' ? '**User:**' : `**${avatar.name}:**`;
      markdownContent += `${prefix}\n`;
      if (msg.attachment && msg.attachment.mimeType.startsWith('image/')) {
        markdownContent += `![User Image](${msg.attachment.dataUri})\n`;
      }
      if (msg.content) {
        markdownContent += `${msg.content}\n\n`;
      }
    });

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = useCallback(async () => {
    const currentInput = userInput.trim();
    if ((!currentInput && !attachment) || isStreaming) return;

    setUserInput('');
    setIsStreaming(true);
    const attachedFile = attachment;
    setAttachment(null);

    const userMessage: ChatMessage = { role: 'user', content: currentInput, attachment: attachedFile };
    const modelPlaceholderMessage: ChatMessage = { role: 'model', content: '' };
    onHistoryUpdate([userMessage, modelPlaceholderMessage]);
    
    let fullResponseText = '';
    const collectedSources = new Map<string, { title: string; uri: string; }>();

    try {
        const parts: ({ text: string } | { inlineData: { mimeType: string, data: string } })[] = [];
        if (currentInput) parts.push({ text: currentInput });
        if (attachedFile) {
          const geminiPart = dataUriToGeminiPart(attachedFile.dataUri);
          if (geminiPart) {
            // Add specific context for different file types
            if (attachedFile.mimeType.startsWith('text/')) {
              parts.unshift({text: `The user has attached a text file named "${attachedFile.name}". Please analyze its content.`});
            } else if (attachedFile.mimeType === 'application/pdf') {
              parts.unshift({text: `The user has attached a PDF file named "${attachedFile.name}". Please analyze its content and answer any questions about it.`});
            }
            parts.push(geminiPart);
          }
        }

        const streamBuffer = { current: '' };
        const saveInterval = 1000;
        let lastSaveTime = Date.now();

        const flushBuffer = () => {
            if (streamBuffer.current.length > 0) {
                onStreamingUpdate(streamBuffer.current);
                streamBuffer.current = '';
                lastSaveTime = Date.now();
            }
        };

        const result = await chatSession.sendMessageStream({ message: parts });
        for await (const chunk of result) {
          const chunkText = chunk.text;
          fullResponseText += chunkText;
          streamBuffer.current += chunkText;

          if (Date.now() - lastSaveTime > saveInterval) {
            flushBuffer();
          }
          
          chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach(item => {
              if (item.web) {
                // FIX: `item.web.title` is optional. Provide a fallback to satisfy the type.
                collectedSources.set(item.web.uri, { uri: item.web.uri, title: item.web.title || item.web.uri });
              }
          });
        }
        flushBuffer();

    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessageContent = 'عفوًا، حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.';
      if (isRateLimitError(error)) {
        errorMessageContent = 'لقد تجاوزت الحصة المخصصة لك. يرجى الانتظار لحظة ثم المحاولة مرة أخرى.';
      }
      fullResponseText = errorMessageContent;
      onStreamingUpdate(errorMessageContent);
    } finally {
      const finalModelMessage: ChatMessage = {
        role: 'model',
        content: fullResponseText,
        sources: Array.from(collectedSources.values()),
      };
      onStreamEnd(finalModelMessage);
      setIsStreaming(false);
    }
  }, [userInput, attachment, chatSession, isStreaming, onHistoryUpdate, onStreamingUpdate, onStreamEnd]);
  
  const handleToggleSpeech = useCallback((text: string, index: number) => {
      if (speakingIndex === index) {
          window.speechSynthesis.cancel();
          setSpeakingIndex(null);
          return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const setVoice = () => {
          const voices = window.speechSynthesis.getVoices();
          const arabicVoice = voices.find(voice => voice.lang.startsWith('ar'));
          if (arabicVoice) {
              utterance.voice = arabicVoice;
          }
      };
      if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = setVoice;
      } else {
          setVoice();
      }
      utterance.onend = () => setSpeakingIndex(null);
      utterance.onerror = (e) => {
          console.error('Speech synthesis error:', e);
          setSpeakingIndex(null);
      };
      setSpeakingIndex(index);
      window.speechSynthesis.speak(utterance);
  }, [speakingIndex]);

  const handleToggleListening = () => {
      if (!recognitionRef.current) {
          alert('ميزة التعرف على الكلام غير مدعومة في هذا المتصفح.');
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
          setIsListening(false);
      } else {
          userInputBeforeListening.current = userInput ? userInput.trim() + ' ' : '';
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setAttachment({
          name: file.name,
          dataUri: dataUri,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistoryClick = () => {
    if (window.confirm('هل أنت متأكد من أنك تريد مسح سجل المحادثة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      onClearHistory();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <header className="flex items-center p-4 border-b border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <img src={avatar.imageDataUri} alt={avatar.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="ms-4 flex-grow min-w-0">
            <div className="flex items-center gap-2">
                 <h2 className="text-xl font-bold text-slate-100 truncate">{avatar.name}</h2>
                 {avatar.webAccess && <span className="flex-shrink-0" title="Web Access Enabled"><GlobeIcon className="w-5 h-5 text-indigo-400" /></span>}
            </div>
          <p className="text-sm text-slate-400 truncate">{avatar.description}</p>
        </div>
        <div className="flex items-center gap-1 me-2 flex-shrink-0">
          <button onClick={handleExportChat} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="تصدير المحادثة" title="تصدير المحادثة">
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
          <button onClick={onEditAvatar} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="تعديل الشخصية" title="تعديل الشخصية">
            <PencilIcon className="w-5 h-5" />
          </button>
          <button onClick={handleClearHistoryClick} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors" aria-label="مسح المحادثة" title="مسح المحادثة">
            <BackspaceIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6 space-y-6" ref={chatContainerRef}>
        {displayedMessages.map((msg, index) => (
          <div key={index} className={`group relative flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div dir="auto" className={`max-w-xl px-5 py-3 rounded-2xl text-white ${msg.role === 'user' ? 'bg-indigo-600 rounded-bl-lg' : 'bg-slate-700 rounded-br-lg'}`}>
              {msg.attachment && (
                msg.attachment.mimeType.startsWith('image/') ? (
                  <img src={msg.attachment.dataUri} alt="Chat content" className="rounded-lg mb-2 max-w-sm w-full" />
                ) : (
                  <div className="flex items-center gap-3 bg-slate-600/50 rounded-lg p-3 mb-2 border border-slate-600">
                    <DocumentTextIcon className="w-6 h-6 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300 truncate font-mono">{msg.attachment.name}</span>
                  </div>
                )
              )}
              {msg.content ? (
                <div className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.role === 'model' && isStreaming && index === displayedMessages.length - 1 ? (
                  <LoadingSpinner className="w-5 h-5 text-slate-400" />
                ) : null
              )}
               {msg.sources && msg.sources.length > 0 && (
                 <div className="mt-4 pt-3 border-t border-slate-600">
                    <h4 className="text-xs font-bold text-slate-300 mb-2">المصادر</h4>
                    <ul className="space-y-1.5">
                        {msg.sources.map((source, i) => (
                            <li key={i} className="text-xs">
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline truncate block">
                                    {source.title || source.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                 </div>
               )}
            </div>
            {msg.content && (
              <div 
                className="absolute top-1 flex flex-col gap-2 opacity-0 group-hover:opacity-100"
                style={msg.role === 'user' ? { left: '-2.5rem' } : { right: '-2.5rem' }}
              >
                  <button 
                      onClick={() => handleCopy(msg.content, index)}
                      className="p-1.5 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-opacity"
                      aria-label="Copy message"
                  >
                      {copiedIndex === index ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
                  </button>
                  {msg.role === 'model' && (
                      <button 
                          onClick={() => handleToggleSpeech(msg.content, index)}
                          className="p-1.5 rounded-full bg-slate-800/50 text-slate-400 hover:text-white transition-opacity"
                          aria-label={speakingIndex === index ? "Stop speaking" : "Read aloud"}
                      >
                          {speakingIndex === index ? <SpeakerXMarkIcon className="w-4 h-4 text-amber-400" /> : <SpeakerWaveIcon className="w-4 h-4" />}
                      </button>
                  )}
              </div>
            )}
          </div>
        ))}
      </main>
      <footer className="p-4 border-t border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        {attachment && (
            <div className="relative p-2 w-fit mb-2">
                {attachment.mimeType.startsWith('image/') ? (
                    <img src={attachment.dataUri} alt="Preview" className="max-h-32 rounded-lg" />
                ) : (
                    <div className="flex items-center gap-3 bg-slate-700 rounded-lg p-3">
                        <DocumentTextIcon className="w-6 h-6 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{attachment.name}</span>
                    </div>
                )}
                <button onClick={() => setAttachment(null)} className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-slate-600 rounded-full p-1 text-white hover:bg-slate-500" aria-label="Remove attachment">
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        )}
        <div className="relative">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,text/plain,text/csv,text/markdown,application/pdf" className="hidden" />
          <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="اكتب رسالتك..." dir="auto" rows={1} className="w-full bg-slate-700 text-slate-200 placeholder-slate-400 rounded-lg p-3 ps-36 pe-4 resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-200" disabled={isStreaming} />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={isStreaming} className="p-2 rounded-full text-slate-300 hover:bg-slate-600 disabled:text-slate-500 transition-colors duration-200" aria-label="Attach file">
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <button
                onClick={handleToggleListening}
                disabled={!recognitionRef.current}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  isListening 
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'text-slate-300 hover:bg-slate-600 disabled:text-slate-500'
                }`}
                aria-label={isListening ? "Stop listening" : "Start listening"}
              >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            <button onClick={handleSendMessage} disabled={(!userInput.trim() && !attachment) || isStreaming} className="p-2 rounded-full text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:text-slate-400 transition-colors duration-200" aria-label="Send message">
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
