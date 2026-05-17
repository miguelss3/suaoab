// src/pages/PortalGraduacao.tsx
import { useState } from "react";
import { PortalAcademico } from "@/components/admin/PortalAcademico";
import { AuthModal } from "@/components/index/AuthModal";

/**
 * Página dedicada ao Portal da Graduação
 * Integra o componente PortalAcademico com o modal de autenticação
 */
export default function PortalGraduacao() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      {/* COMPONENTE PRINCIPAL */}
      <PortalAcademico setShowAuthModal={setShowAuthModal} />

      {/* MODAL DE AUTENTICAÇÃO */}
      <AuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
      />
    </div>
  );
}
