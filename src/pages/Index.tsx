// src/pages/Index.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Target, Scale, BarChart3, CheckCircle2, ArrowRight, 
  Shield, Clock, X, Mail, Lock, User, Phone, Star, BookOpen 
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
};

const features = [
  { icon: Target, title: "Cronograma Adaptativo", desc: "Ciclos de metas com datas inteligentes. Saiba exatamente o que estudar hoje, amanhã e até a prova." },
  { icon: Scale, title: "Correção Artesanal", desc: "Envie suas peças e receba devolutiva completa. Mostramos exatamente onde perdeu pontos." },
  { icon: BarChart3, title: "Dossiê de Evolução", desc: "Progresso em tempo real. Metas concluídas, peças corrigidas — veja sua aprovação sendo construída." },
];

const checkItems = ["Aulas Direto ao Ponto", "Metas Diárias no seu Painel", "Comunicação Direta com o Mentor", "Simulados com Cronômetro"];

const Index = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materia, setMateria] = useState(""); 
  const [loading, setLoading] = useState(false);

  // NOVA FUNÇÃO: RECUPERAÇÃO DE SENHA
  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Por favor, digite seu e-mail no campo acima para recuperar a senha.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada (e o spam).");
    } catch (error: any) {
      toast.error("Erro ao enviar e-mail. Verifique se o endereço está correto e se você já possui cadastro.");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        toast.success("Acesso autorizado!");

        if (user.email === "miguelss3@yahoo.com.br") { 
          navigate("/painel");
        } else {
          navigate("/aluno");
        }
      } else {
        if (!materia) {
          toast.error("Por favor, selecione a disciplina da 2ª Fase.");
          setLoading(false);
          return;
        }

        let novaMatricula = "2026100"; 
        const qMatricula = query(collection(db, "alunos"), orderBy("matricula", "desc"), limit(1));
        const snapMatricula = await getDocs(qMatricula);
        
        if (!snapMatricula.empty) {
          const ultima = snapMatricula.docs[0].data().matricula;
          if (ultima && !isNaN(Number(ultima))) {
            novaMatricula = (Number(ultima) + 1).toString();
          }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "alunos", userCredential.user.uid), {
          nome: nome,
          whatsapp: whatsapp,
          email: email,
          materia: materia, 
          matricula: novaMatricula, 
          status: "Lead",
          progresso: 0,
          data_cadastro: new Date(),
          metas: [{ 
            atividade: "Meta 0: Boas-Vindas e Ambientação", 
            orientacoes: "Parabéns por chegar à 2ª Fase! Você está a um passo da sua aprovação e fez a escolha certa ao procurar uma mentoria direcionada. Hoje, o seu único objetivo é respirar fundo, preparar o seu ambiente de estudos e assistir à aula inaugural na Sala de Aula Virtual.", 
            link: "",
            status: "liberada", 
            concluida: false 
          }]
        });
        toast.success(`Matrícula nº ${novaMatricula} criada com sucesso!`);
        navigate("/aluno");
      }
      setShowAuthModal(false);
    } catch (error: any) {
      toast.error("Erro: Verifique os dados inseridos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary/80">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="font-display text-2xl font-bold text-primary-foreground tracking-tight">
            SUA<span className="text-accent">OAB</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="accent" onClick={() => { setIsLogin(true); setShowAuthModal(true); }}>
              Área do Aluno
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-hero min-h-[85vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
        </div>
        <div className="container relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/30 px-4 py-2 text-sm text-accent font-medium">
                ⚠️ Restam apenas <span className="text-destructive font-bold">12 vagas</span> para correção artesanal
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-[1.1] tracking-tight">
                A única preparação para a 2ª Fase <span className="text-gradient-accent italic">desenhada para você.</span>
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-lg text-primary-foreground/70 max-w-lg font-body leading-relaxed">
                Esqueça os cursos de massa. Tenha um cronograma inteligente, um Dossiê de evolução e a correção cirúrgica das suas peças.
              </motion.p>
              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
                <Button variant="hero" size="lg" className="h-14 px-10 text-base" onClick={() => { setIsLogin(false); setShowAuthModal(true); }}>
                  Teste Gratuito de 72h <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden border border-primary-foreground/10 shadow-elevated">
                <img src="https://raw.githubusercontent.com/miguelss3/suaoab/1d2ac19e92e4a3522b3b5c2768cae22584c91ef9/painel%20(1).png" alt="Painel" className="w-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <img src="https://raw.githubusercontent.com/miguelss3/suaoab/1e51d36ef11cad6211acac11ae3a56022757ccdd/CARTEIRA-DAORDEM-696x464.png" alt="Carteira da OAB" className="rounded-2xl shadow-elevated w-full max-w-md mx-auto" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
                A sua "vermelhinha" está mais perto do que você imagina.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                O maior erro na 2ª fase é estudar de forma genérica. A banca não perdoa erros de estrutura de peça e falta de direcionamento.
              </p>
              <ul className="space-y-4">
                {checkItems.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Por dentro da sua Área de Estudos</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Ferramentas pensadas para quem leva a aprovação a sério.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border shadow-card hover:border-accent transition-all group">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary italic mb-4">Aprovados que seguiram o método</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Histórias reais de quem já esteve exatamente onde você está hoje e conquistou a tão sonhada carteira vermelha.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex text-accent mb-4">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-foreground/80 italic mb-6">"Eu trabalhava o dia todo e não sabia como organizar o tempo. O cronograma adaptativo foi a minha salvação. As correções pareciam que o professor estava do meu lado ensinando."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">M</div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Mariana Costa</h4>
                  <span className="text-[10px] uppercase font-black text-accent tracking-widest">D. Administrativo</span>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex text-accent mb-4">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-foreground/80 italic mb-6">"Fazer os simulados com a mesma formatação gráfica da prova real tirou o meu nervosismo. Quando abri o caderno da FGV, senti que era apenas mais um PDF da plataforma."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">R</div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Rafael Oliveira</h4>
                  <span className="text-[10px] uppercase font-black text-accent tracking-widest">D. Penal</span>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
              <div className="flex text-accent mb-4">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-foreground/80 italic mb-6">"A objetividade é o ponto forte. Nada de doutrinas infinitas. Fui direto para a resolução de peças e no dia da prova sabia exatamente a estrutura que o examinador queria ver."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">L</div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Larissa Mendes</h4>
                  <span className="text-[10px] uppercase font-black text-accent tracking-widest">D. Tributário</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container flex justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} className="relative max-w-2xl w-full bg-card rounded-3xl p-12 shadow-elevated border-2 border-accent/30 text-center">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-sm font-bold px-6 py-2 rounded-full shadow-lg">
              🔥 OFERTA POR TEMPO LIMITADO
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mt-4 mb-2">Garanta a sua Aprovação na 2ª Fase</h2>
            <p className="text-muted-foreground text-lg mb-8">Plataforma Completa + Aulas + Correção de Peças + Cronograma Inteligente.</p>
            
            <div className="mb-8">
              <p className="text-muted-foreground line-through text-xl">De R$ 899,00</p>
              <p className="text-5xl md:text-6xl font-display font-black text-foreground mt-2">
                R$ 599<span className="text-xl font-normal text-muted-foreground">,00 à vista ou até 12x</span>
              </p>
            </div>

            <Button variant="hero" size="lg" className="w-full max-w-sm h-16 text-lg mx-auto" onClick={() => { setIsLogin(false); setShowAuthModal(true); }}>
              Efetuar Compra
            </Button>
            
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-6">
              <Shield className="h-4 w-4" /> Compra 100% Segura | 7 Dias de Garantia
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-hero py-24">
        <div className="container text-center space-y-8">
          <h2 className="text-3xl font-display font-bold text-primary-foreground">Acesse agora e veja na prática.</h2>
          <Button variant="accent" size="lg" className="h-14 px-10" onClick={() => { setIsLogin(false); setShowAuthModal(true); }}>
            <Clock className="mr-2 h-5 w-5" /> Criar conta de teste (72h grátis)
          </Button>
        </div>
      </section>

      <footer className="bg-primary py-12 border-t border-primary/80">
        <div className="container text-center">
          <p className="text-primary-foreground/50 text-sm">© 2026 SuaOAB. Todos os direitos reservados.</p>
        </div>
      </footer>

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border w-full max-w-md p-8 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X /></button>
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
                      <Label>WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="tel" className="pl-10" placeholder="(11) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-accent font-bold">Disciplina da 2ª Fase</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <select 
                          className="w-full h-10 border border-input rounded-md pl-10 pr-3 bg-background text-sm focus:ring-2 focus:ring-accent" 
                          value={materia} 
                          onChange={(e) => setMateria(e.target.value)} 
                          required
                        >
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
                
                {/* CAMPO DE SENHA ATUALIZADO COM BOTÃO DE RECUPERAÇÃO */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Senha</Label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={handleResetPassword} 
                        className="text-[10px] text-accent font-bold hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" minLength={6} placeholder="••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 mt-2" variant="hero" disabled={loading}>
                  {loading ? "Processando..." : (isLogin ? "Entrar na Plataforma" : "Criar Conta de Teste")}
                </Button>
              </form>
              <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-accent font-bold hover:underline">
                {isLogin ? "Não tem conta? Faça o teste grátis" : "Já é aluno? Faça login"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;