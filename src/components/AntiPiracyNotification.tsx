import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export const AntiPiracyNotification = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleSecurityEvent = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        const key = (event as KeyboardEvent).key;
        
        if (key === 'PrintScreen') {
          setMessage('⚠️ Captura de tela bloqueada por proteção de conteúdo');
          showFeedback();
        } else if ((event as KeyboardEvent).ctrlKey && key === 'p') {
          setMessage('⚠️ Impressão bloqueada por proteção de conteúdo');
          showFeedback();
        } else if ((event as KeyboardEvent).ctrlKey && key === 'c') {
          setMessage('⚠️ Cópia bloqueada. Respeite os direitos autorais do professor');
          showFeedback();
        }
      }
    };

    const showFeedback = () => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    };

    window.addEventListener('keydown', handleSecurityEvent);
    return () => window.removeEventListener('keydown', handleSecurityEvent);
  }, []);

  if (!showNotification) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-destructive text-destructive-foreground rounded-lg px-6 py-4 shadow-lg flex items-center gap-3 border border-destructive/50">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium text-sm">{message}</span>
      </div>
    </div>
  );
};
