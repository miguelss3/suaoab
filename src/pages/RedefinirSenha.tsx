// src/pages/RedefinirSenha.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg"; // Reaproveitando o fundo do site

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [emailDoAluno, setEmailDoAluno] = useState("");
  const [codigoInvalido, setCodigoInvalido] = useState(false);

  // O Firebase envia um código secreto na URL chamado 'oobCode'
  const oobCode = searchParams.get("oobCode");

  useEffect(() => {
    // Assim que a página abre, verificamos se o link é válido e pegamos o email
    if (oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setEmailDoAluno(email);
        })
        .catch(() => {
          setCodigoInvalido(true);
        });
    } else {
      setCodigoInvalido(true);
    }
  }, [oobCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return toast.error("As senhas não coincidem. Digite novamente.");
    }
    
    if (password.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres.");
    }

    if (!oobCode) return;

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      toast.success("Senha alterada com sucesso! Você já pode fazer o login.");
      // Manda de volta para a tela inicial após 2 segundos
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      toast.error("Ocorreu um erro ao redefinir a senha. O link pode ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  if (codigoInvalido) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-elevated border border-border text-center space-y-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Link Inválido ou Expirado</h2>
          <p className="text-muted-foreground">
            Este link de recuperação já foi utilizado ou expirou. Por favor, volte à página inicial e solicite um novo link de recuperação de senha.
          </p>
          <Button onClick={() => navigate("/")} className="w-full mt-4" variant="hero">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-4">
      {/* Imagem de Fundo Desfocada */}
      <div className="absolute inset-0 z-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-10 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background/95" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative z-10 max-w-md w-full bg-card rounded-3xl p-10 shadow-2xl border border-accent/20"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-primary tracking-tight mb-2">
            SUA<span className="text-accent">OAB</span>
          </h1>
          <h2 className="text-xl font-bold text-foreground">Criar nova senha</h2>
          {emailDoAluno && (
            <p className="text-sm text-muted-foreground mt-2">
              Redefinindo senha para o cadastro:<br/>
              <strong className="text-primary">{emailDoAluno}</strong>
            </p>
          )}
        </div>

        <form onSubmit={handleResetPassword} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  minLength={6} 
                  placeholder="Mínimo 6 caracteres" 
                  className="pl-10 pr-10" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirme a Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  minLength={6} 
                  placeholder="Repita a senha" 
                  className="pl-10" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-14 text-lg" variant="hero" disabled={loading}>
            {loading ? "Salvando..." : "Salvar Nova Senha"} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2 mt-4">
            <ShieldCheck className="h-4 w-4 text-success" /> Ambiente Seguro
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default RedefinirSenha;