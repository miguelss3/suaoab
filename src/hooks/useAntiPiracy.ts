import { useEffect, useState } from 'react';

export const useAntiPiracy = () => {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    // ========================================
    // 1. BLOQUEIO DE ATALHOS DE TECLADO
    // ========================================
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloqueio de PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Captura de tela desabilitada por motivos de segurança');
        return;
      }

      // Bloqueio de Ctrl + P / Cmd + P (Impressão)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Impressão desabilitada por motivos de segurança');
        return;
      }

      // Bloqueio de Ctrl + Shift + I / Cmd + Option + I (Inspetor)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Ferramentas de desenvolvedor desabilitadas por motivos de segurança');
        return;
      }

      // Bloqueio de Ctrl + Shift + C / Cmd + Shift + C (Inspetor por elemento)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Seletor de elemento desabilitado por motivos de segurança');
        return;
      }

      // Bloqueio de F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Ferramentas de desenvolvedor desabilitadas por motivos de segurança');
        return;
      }

      // Bloqueio de Ctrl + C / Cmd + C (Cópia)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Cópia de conteúdo desabilitada. Respeite os direitos autorais do professor.');
        return;
      }

      // Bloqueio de Ctrl + X / Cmd + X (Corte)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Corte de conteúdo desabilitado');
        return;
      }

      // Bloqueio de Ctrl + A (Selecionar Tudo) - opcional, pode interferir com UX
      // if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      //   e.preventDefault();
      //   e.stopPropagation();
      //   return;
      // }

      // Bloqueio de Cmd + Option + U (View Page Source no Safari)
      if (e.metaKey && e.altKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Visualização do código-fonte desabilitada');
        return;
      }

      // Bloqueio de Ctrl + U (View Page Source no Chrome/Firefox)
      if ((e.ctrlKey && !e.metaKey) && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        console.warn('⚠️ Visualização do código-fonte desabilitada');
        return;
      }
    };

    // ========================================
    // 2. BLUR NO LOSS OF FOCUS (Truque do Desfoque)
    // ========================================
    const handleWindowBlur = () => {
      setIsBlurred(true);
      console.warn('⚠️ Janela perdeu foco. Protegendo conteúdo com blur.');
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
      console.log('✓ Janela recuperou foco. Removendo blur.');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        console.warn('⚠️ Página ficou oculta. Protegendo conteúdo com blur.');
      } else {
        setIsBlurred(false);
        console.log('✓ Página voltou ao foco. Removendo blur.');
      }
    };

    // ========================================
    // 3. PREVENÇÃO DE SELEÇÃO E ARRASTE
    // ========================================
    const handleSelectStart = (e: Event) => {
      // Permitir seleção normal, mas depois copiar será bloqueado
      // Você pode descomentar para bloquear seleção completamente
      // e.preventDefault();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.warn('⚠️ Menu de contexto desabilitado por motivos de segurança');
    };

    // ========================================
    // ADICIONAR LISTENERS
    // ========================================
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('contextmenu', handleContextMenu);

    // ========================================
    // CLEANUP
    // ========================================
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return { isBlurred };
};
