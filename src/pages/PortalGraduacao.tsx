// src/pages/PortalGraduacao.tsx
import { useState } from "react";
import { PortalAcademico } from "@/components/admin/PortalAcademico";
import { AuthModal } from "@/components/index/AuthModal";
import { useAntiPiracy } from "@/hooks/useAntiPiracy";
import { AntiPiracyNotification } from "@/components/AntiPiracyNotification";

/**
 * Página dedicada ao Portal da Graduação
 * Integra o componente PortalAcademico com o modal de autenticação
 */
export default function PortalGraduacao() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // Proteção anti-piracy (bloqueia atalhos, blur ao perder foco, etc.)
  const { isBlurred } = useAntiPiracy();

  const meuWhatsApp = "5592994742322";
  const mensagemMentor = encodeURIComponent(
    "Olá Prof.! Sou aluno da Graduação e gostaria de tirar uma dúvida."
  );

  return (
    <div className={`pb-28 sm:pb-0 transition-all duration-300 ${isBlurred ? "anti-piracy-blur" : ""}`}>
      {/* COMPONENTE PRINCIPAL */}
      <PortalAcademico setShowAuthModal={setShowAuthModal} />

      {/* MODAL DE AUTENTICAÇÃO */}
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
      />

      {/* BOTÃO FLUTUANTE DE WHATSAPP - FALAR COM O MENTOR */}
      <a
        href={`https://wa.me/${meuWhatsApp}?text=${mensagemMentor}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 transition-transform duration-200 hover:scale-110 active:scale-95 drop-shadow-xl"
        title="Falar com o Mentor"
        aria-label="Falar com o Mentor pelo WhatsApp"
      >
        <img
          src="https://raw.githubusercontent.com/miguelss3/suaoab/cd456d1c497b3e4d63bf2827cfddb56c02555c87/whatsapp-removebg.png"
          alt="WhatsApp"
          className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
        />
      </a>

      {/* Notificação visual da proteção anti-piracy */}
      <AntiPiracyNotification />
    </div>
  );
}
