// src/components/index/AuthModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Mail, Lock, User, Phone, BookOpen, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";

// Máscara do Telefone
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "";
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export const AuthModal = ({ showAuthModal, setShowAuthModal, isLogin, setIsLogin }: any) => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materia, setMateria] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  
  // --- ESTADOS DA NOVA TELA DE RECUPERAÇÃO ---
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const closeModal = () => {
    setShowAuthModal(false);
    setTimeout(() => setShowResetModal(false), 300); // Reseta a tela ao fechar
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return toast.error("Por favor, digite seu e-mail.");
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(resetEmail.trim())) return toast.error("Digite um formato de e-mail válido.");
    
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      toast.success("E-mail de recuperação enviado! Verifique sua caixa (e spam).");
      setShowResetModal(false); // Volta para a tela de login
    } catch (error: any) {
      toast.error("Erro ao enviar e-mail. Verifique se o endereço está correto.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const emailLimpo = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailLimpo)) {
      toast.error("O E-mail inserido é inválido. Inclua o '@' e um domínio válido.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, emailLimpo, password);
        toast.success("Acesso autorizado!");
        if (userCredential.user.email === "miguelss3@yahoo.com.br") navigate("/painel");
        else navigate("/aluno");
      } else {
        if (!materia) { toast.error("Selecione a disciplina."); setLoading(false); return; }
        if (whatsapp.replace(/\D/g, '').length < 10) { toast.error("WhatsApp incompleto."); setLoading(false); return; }
        if (!aceitouTermos) { toast.error("Aceite os Termos de Uso."); setLoading(false); return; }

        let novaMatricula = "2026100"; 
        const qMatricula = query(collection(db, "alunos"), orderBy("matricula", "desc"), limit(1));
        const snapMatricula = await getDocs(qMatricula);
        
        if (!snapMatricula.empty) {
          const ultima = snapMatricula.docs[0].data().matricula;
          if (ultima && !isNaN(Number(ultima))) novaMatricula = (Number(ultima) + 1).toString();
        }

        const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, password);
        
        await setDoc(doc(db, "alunos", userCredential.user.uid), {
          nome: nome,
          whatsapp: whatsapp,
          email: emailLimpo,
          materia: materia, 
          matricula: novaMatricula, 
          status: "Lead",
          progresso: 0,
          data_cadastro: new Date(),
          termos_aceitos: true,             
          data_aceite_termos: new Date(),   
          metas: [{ 
            atividade: "Meta 0: Boas-Vindas e Ambientação", 
            orientacoes: "Parabéns por chegar à 2ª Fase! Hoje, o seu único objetivo é respirar fundo, preparar o seu ambiente de estudos e assistir à aula inaugural.", 
            link: "",
            status: "liberada", 
            concluida: false 
          }]
        });
        toast.success(`Matrícula nº ${novaMatricula} criada com sucesso!`);
        navigate("/aluno");
      }
      closeModal();
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') toast.error("E-mail já cadastrado. Faça login.");
      else toast.error("Erro na autenticação. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border w-full max-w-md p-8 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X /></button>
            
            {/* === TELA DE RECUPERAÇÃO DE SENHA === */}
            {showResetModal ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-accent" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-primary italic">Recuperar Senha</h2>
                  <p className="text-sm text-muted-foreground mt-2 px-4">
                    Digite o e-mail cadastrado para receber o link de redefinição de senha.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        className="pl-10" 
                        placeholder="exemplo@email.com" 
                        value={resetEmail} 
                        onChange={(e) => setResetEmail(e.target.value)} 
                        required 
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 mt-4" variant="hero" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Link de Recuperação"}
                  </Button>
                </form>

                <button 
                  onClick={() => setShowResetModal(false)} 
                  className="w-full mt-6 text-sm text-muted-foreground font-bold hover:text-foreground flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para o Login
                </button>
              </motion.div>

            ) : (

              // === TELA DE LOGIN E CADASTRO ===
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-display font-bold text-primary italic">{isLogin ? "Acessar o Painel" : "Iniciar Matrícula"}</h2>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                  
                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="text" className="pl-10 uppercase" placeholder="DIGITE SEU NOME" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>WhatsApp (com DDD)</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="tel" className="pl-10" placeholder="(11) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(formatPhoneNumber(e.target.value))} maxLength={15} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-accent font-bold">Disciplina da 2ª Fase</Label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <select className="w-full h-10 border border-input rounded-md pl-10 pr-3 bg-background text-sm focus:ring-2 focus:ring-accent" value={materia} onChange={(e) => setMateria(e.target.value)} required>
                            <option value="">Selecione sua matéria...</option>
                            <option value="DADM">Direito Administrativo</option>
                            <option value="DPEN">Direito Penal</option>
                            <option value="DTRI">Direito Tributário</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" className="pl-10" placeholder="exemplo@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Senha</Label>
                      {isLogin && (
                        // BOTÃO MÁGICO QUE ABRE A TELA DE RECUPERAÇÃO
                        <button 
                          type="button" 
                          onClick={() => {
                            setResetEmail(email); // Já puxa o e-mail que ele estava digitando
                            setShowResetModal(true);
                          }} 
                          className="text-[10px] text-accent font-bold hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type={showPassword ? "text" : "password"} minLength={6} placeholder="••••••" className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="flex items-start gap-2 mt-4 pt-2 border-t border-border/50">
                      <input type="checkbox" id="termos" className="mt-1 h-4 w-4 accent-accent cursor-pointer flex-shrink-0" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} />
                      <Label htmlFor="termos" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer font-normal">
                        Concordo com os Termos de Uso, Política de Privacidade e aceito receber comunicações.
                      </Label>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 mt-4" variant="hero" disabled={loading}>
                    {loading ? "Processando..." : (isLogin ? "Entrar na Plataforma" : "Avançar para o Painel")}
                  </Button>
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-accent font-bold hover:underline">
                  {isLogin ? "Não tem conta? Inicie sua matrícula" : "Já é aluno? Faça login"}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};