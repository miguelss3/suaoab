import { useState, useEffect } from "react";
import { getAuth, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Phone, Lock, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PerfilAluno = () => {
  const auth = getAuth();
  const user = auth.currentUser;

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const carregarPerfil = async () => {
      if (user) {
        const docRef = doc(db, "alunos", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNome(docSnap.data().nome || "");
          setWhatsapp(docSnap.data().whatsapp || "");
        }
      }
    };
    carregarPerfil();
  }, [user]);

  const handleSalvar = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Atualiza Nome e WhatsApp no Firestore
      const docRef = doc(db, "alunos", user.uid);
      await updateDoc(docRef, {
        nome: nome,
        whatsapp: whatsapp
      });

      // 2. Atualiza a Password se o aluno tiver preenchido o campo
      if (novaSenha.trim().length > 0) {
        if (novaSenha.length < 6) {
          toast.error("A nova senha deve ter pelo menos 6 caracteres.");
          setIsLoading(false);
          return;
        }
        await updatePassword(user, novaSenha);
        setNovaSenha(""); // Limpa o campo após o sucesso
      }

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Por motivos de segurança, precisa de fazer login novamente para mudar a senha.");
      } else {
        toast.error("Erro ao atualizar o perfil. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        
        <div className="flex items-center gap-3 border-b border-border pb-6 mb-6">
          <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary">Meu Perfil</h2>
            <p className="text-sm text-muted-foreground">Mantenha os seus dados de contacto atualizados.</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Email Fixo (Apenas leitura por segurança) */}
          <div className="space-y-2">
            <Label className="text-xs uppercase font-black text-muted-foreground flex items-center gap-1">
              Email de Acesso <ShieldCheck className="h-3 w-3 text-success"/>
            </Label>
            <Input value={user?.email || ""} disabled className="bg-muted/30 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">O email não pode ser alterado. É a sua chave de acesso vitalícia.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-black text-primary flex items-center gap-1">
                <User className="h-3 w-3"/> Nome Completo
              </Label>
              <Input 
                placeholder="Como quer ser chamado?" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-black text-primary flex items-center gap-1">
                <Phone className="h-3 w-3"/> WhatsApp
              </Label>
              <Input 
                placeholder="Ex: 92994742322" 
                value={whatsapp} 
                onChange={(e) => setWhatsapp(e.target.value)} 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-6 space-y-2">
            <Label className="text-xs uppercase font-black text-primary flex items-center gap-1">
              <Lock className="h-3 w-3"/> Alterar Senha (Opcional)
            </Label>
            <Input 
              type="password"
              placeholder="Digite uma nova senha para alterar" 
              value={novaSenha} 
              onChange={(e) => setNovaSenha(e.target.value)} 
            />
            <p className="text-[10px] text-muted-foreground">Deixe em branco se não quiser alterar a sua senha atual.</p>
          </div>

          <Button 
            variant="hero" 
            className="w-full h-12 mt-6" 
            onClick={handleSalvar}
            disabled={isLoading}
          >
            {isLoading ? "A Guardar..." : <><Save className="mr-2 h-5 w-5" /> Guardar Alterações</>}
          </Button>

        </div>
      </div>
    </div>
  );
};

export default PerfilAluno;