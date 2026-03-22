// src/pages/Index.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Target, Scale, BarChart3, CheckCircle2, ArrowRight, Shield, Clock, Star, LifeBuoy } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, collection, query, where, getDocs, getDoc } from "firebase/firestore";
import heroBg from "@/assets/hero-bg.jpg";

import { AuthModal } from "@/components/index/AuthModal";

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

// IMAGENS DO TOPO (INCENTIVO E EMOÇÃO)
const heroCarouselImages = [
  "https://raw.githubusercontent.com/miguelss3/suaoab/1e51d36ef11cad6211acac11ae3a56022757ccdd/CARTEIRA-DAORDEM-696x464.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/8a53302fe24efc4cc5b67e65927b2c7028614709/oab%20carteira.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/2554b51a49f66817c4b13774198a0124db93f1bb/imagemcorrecao.png"
];

// NOVAS IMAGENS DASHBOARD PARA O CELULAR
const imagesMobileDash = [
  "https://raw.githubusercontent.com/miguelss3/suaoab/7a5e6fbeeabb5148c758c02857892e0450e0907d/src/pages/imagemcelular/metascelular.jpeg",
  "https://raw.githubusercontent.com/miguelss3/suaoab/7a5e6fbeeabb5148c758c02857892e0450e0907d/src/pages/imagemcelular/simuladocelular.jpeg",
  "https://raw.githubusercontent.com/miguelss3/suaoab/7a5e6fbeeabb5148c758c02857892e0450e0907d/src/pages/imagemcelular/labcelular.jpeg",
  "https://raw.githubusercontent.com/miguelss3/suaoab/7a5e6fbeeabb5148c758c02857892e0450e0907d/src/pages/imagemcelular/pe%C3%A7ascelular.jpeg"
];

// IMAGENS DE BAIXO (O SISTEMA / DASHBOARDS PC)
const bottomCarouselImagesPC = [
  "https://raw.githubusercontent.com/miguelss3/suaoab/e1377d9894658e06323e9cc7183f4f2863856975/dash1.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/e1377d9894658e06323e9cc7183f4f2863856975/dash3.png",
  "https://raw.githubusercontent.com/miguelss3/suaoab/2554b51a49f66817c4b13774198a0124db93f1bb/dash12.png"
];

const Index = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [vagasRestantes, setVagasRestantes] = useState<number>(12);
  
  const [precoOriginal, setPrecoOriginal] = useState("899");
  const [precoAtual, setPrecoAtual] = useState("599");

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);
  const [currentMobileDashIndex, setCurrentMobileDashIndex] = useState(0);

  const meuWhatsApp = "5592994742322";

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "ciclo_atual"));
        let limiteVagas = 50; 
        
        if (configSnap.exists()) {
          const data = configSnap.data();
          if (data.vagas_totais) limiteVagas = Number(data.vagas_totais);
          if (data.preco_original) setPrecoOriginal(data.preco_original);
          if (data.preco_atual) setPrecoAtual(data.preco_atual);
        }

        const qPremium = query(collection(db, "alunos"), where("status", "in", ["premium", "Premium"]));
        const snapPremium = await getDocs(qPremium);
        
        const totalPremium = snapPremium.docs.filter(doc => 
          doc.id !== "admin_sandbox_uid" && 
          doc.data().email !== "miguelss3@yahoo.com.br" &&
          doc.data().email !== "sandbox@suaoab.com.br"
        ).length;

        const restantes = limiteVagas - totalPremium;
        setVagasRestantes(restantes > 0 ? restantes : 0);
      } catch (error) {
        console.error("Erro ao carregar configurações da Index:", error);
      }
    };
    carregarConfiguracoes();
  }, []);

  // Intervalos automáticos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroCarouselImages.length);
    }, 10000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBottomIndex((prev) => (prev + 1) % bottomCarouselImagesPC.length);
      setCurrentMobileDashIndex((prev) => (prev + 1) % imagesMobileDash.length);
    }, 12000); 
    return () => clearInterval(interval);
  }, []);

  // Lógica de Swipe para Celular
  const handleSwipe = (offset: number, type: 'hero' | 'dash') => {
    const threshold = 50; // Sensibilidade do deslize
    if (offset < -threshold) {
      // Swipe para esquerda -> Próximo
      if (type === 'hero') setCurrentHeroIndex((prev) => (prev + 1) % heroCarouselImages.length);
      else setCurrentMobileDashIndex((prev) => (prev + 1) % imagesMobileDash.length);
    } else if (offset > threshold) {
      // Swipe para direita -> Anterior
      if (type === 'hero') setCurrentHeroIndex((prev) => (prev - 1 + heroCarouselImages.length) % heroCarouselImages.length);
      else setCurrentMobileDashIndex((prev) => (prev - 1 + imagesMobileDash.length) % imagesMobileDash.length);
    }
  };

  const openAuth = (login: boolean) => {
    setIsLogin(login);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-background relative pb-10">
      
      <header className="sticky top-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary/80">
        <div className="container px-4 sm:px-6 flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight transition-transform hover:scale-105">
            SUA<span className="text-accent">OAB</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="accent" onClick={() => openAuth(true)} className="h-9 px-4 text-xs sm:text-sm sm:h-11 sm:px-8">
              Área do Aluno
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-hero min-h-[85vh] flex flex-col items-center">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/60" />
        </div>
        
        <div className="container px-4 relative z-10 pt-12 pb-6 sm:py-24 flex flex-col items-center w-full">
          
          <motion.div initial="hidden" animate="visible" className="w-full max-w-5xl flex flex-col items-center text-center space-y-6 sm:space-y-8">
            
            <motion.div variants={fadeUp} custom={0} className="w-full max-w-4xl mx-auto mb-2 px-2 sm:px-0">
              <p className="text-primary-foreground/90 text-sm sm:text-lg leading-relaxed text-justify border-l-2 border-accent pl-4 italic">
                Olá, futuro colega de profissão! Respira fundo. Eu sei que a pressão da prova parece gigantesca agora, mas você não está sozinho nessa. Desenhei esta mentoria para ser o seu porto seguro: um acompanhamento artesanal, lado a lado, onde pego literalmente na sua mão. O nosso foco é total na <strong className="text-accent font-black">2ª Fase em Direito Tributário, Administrativo e Penal</strong>. Chega de ansiedade e de se sentir perdido com cursos de massa. Vamos blindar a sua peça, corrigir os mínimos detalhes e comemorar juntos quando o seu nome sair na lista de aprovados. Vai dar certo!
              </p>
            </motion.div>

            {vagasRestantes > 0 ? (
              <motion.div variants={fadeUp} custom={1} className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 rounded-2xl sm:rounded-full bg-destructive/5 border-2 border-destructive/20 p-4 sm:px-8 sm:py-3 text-accent font-medium shadow-2xl sm:shadow-lg w-full sm:w-auto mx-auto">
                <span className="text-sm lg:text-lg font-bold text-primary-foreground/70">⚠️ Restam apenas</span>
                <span className="text-4xl sm:text-xl lg:text-3xl text-destructive font-black bg-destructive/10 sm:bg-transparent px-6 py-2 sm:px-0 rounded-xl uppercase tracking-wider my-1 sm:my-0">{vagasRestantes} {vagasRestantes === 1 ? 'vaga' : 'vagas'}</span>
                <span className="text-sm lg:text-lg font-bold text-primary-foreground/70">para correção artesanal</span>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} custom={1} className="inline-flex items-center justify-center gap-2 rounded-full bg-destructive/10 border border-destructive/30 px-6 py-3 sm:px-6 sm:py-3 text-sm lg:text-lg text-destructive font-bold mx-auto shadow-lg">
                ⚠️ Vagas esgotadas. Entre na lista de espera.
              </motion.div>
            )}

            <motion.h1 variants={fadeUp} custom={2} className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-primary-foreground leading-[1.1] tracking-tight w-full px-2">
              A única preparação para a 2ª Fase <span className="text-gradient-accent italic block sm:inline mt-2 sm:mt-0">desenhada para você.</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} custom={3} className="text-base sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto font-body leading-relaxed text-justify sm:text-center px-4 sm:px-0">
              Esqueça os cursos de massa. Tenha um cronograma inteligente, um Dossiê de evolução e a correção cirúrgica das suas peças.
            </motion.p>
            
            <motion.div variants={fadeUp} custom={4} className="flex justify-center w-full px-4 sm:px-0 mt-4 sm:mt-8">
              <Button variant="hero" size="lg" className="h-14 sm:h-16 w-full sm:w-auto px-12 text-base sm:text-lg shadow-2xl shadow-accent/20" onClick={() => openAuth(false)}>
                Garantir Minha Vaga <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </motion.div>
          </motion.div>

          {/* CARROSSEL TOPO: Interativo com Drag no Mobile */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="flex relative z-10 w-full max-w-4xl h-[350px] sm:h-[450px] xl:h-[550px] items-center justify-center mx-auto mt-6 px-4 touch-pan-y">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={heroCarouselImages[currentHeroIndex]} 
                  src={heroCarouselImages[currentHeroIndex]} 
                  alt="Incentivo SUA OAB" 
                  className="max-w-full max-h-full object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.4)] rounded-2xl cursor-grab active:cursor-grabbing" 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.5 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => handleSwipe(info.offset.x, 'hero')}
                />
              </AnimatePresence>
          </motion.div>

        </div>
      </section>

      <section className="py-12 sm:py-24 bg-card">
        <div className="container px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* CARROSSEL BAIXO: Interativo com Drag no Mobile */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="flex relative z-10 w-full h-[480px] sm:h-[550px] xl:h-[650px] items-center justify-center order-2 lg:order-1 mt-4 touch-pan-y">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={imagesMobileDash[currentMobileDashIndex]} 
                    src={imagesMobileDash[currentMobileDashIndex]} 
                    alt="Sua OAB Dashboards" 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-2xl cursor-grab active:cursor-grabbing" 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => handleSwipe(info.offset.x, 'dash')}
                  />
                </AnimatePresence>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6 order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight text-center lg:text-left">
                A sua "vermelhinha" está mais perto do que você imagina.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed text-justify sm:text-center lg:text-left">
                O maior erro na 2ª fase é estudar de forma genérica. A banca não perdoa erros de estrutura de peça e falta de direcionamento.
              </p>
              <ul className="space-y-4 max-w-md mx-auto lg:mx-0">
                {checkItems.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-foreground font-medium">
                    <CheckCircle2 className="h-5 v-5 text-success flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background border-t border-border">
        <div className="container px-6">
          <div className="text-center mb-12 sm:mb-16">
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
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary italic mb-4">Aprovados que seguiram o método</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Histórias reais de quem já esteve exatamente onde você está hoje.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-2xl border border-border shadow-sm text-center sm:text-left">
              <div className="flex justify-center sm:justify-start text-accent mb-4">
                <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-foreground/80 italic mb-6">"Eu trabalhava o dia todo e não sabia como organizar o tempo. O cronograma adaptativo foi a minha salvação. As correções pareciam que o professor estava do meu lado ensinando."</p>
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">M</div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">Mariana Costa</h4>
                  <span className="text-[10px] uppercase font-black text-accent tracking-widest">D. Administrativo</span>
                </div>
              </div>
            </div>
            {/* Outros depoimentos... */}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto items-stretch">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="relative bg-card rounded-3xl p-8 sm:p-12 shadow-elevated border-2 border-accent/30 text-center flex flex-col h-full">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-sm font-bold px-6 py-2 rounded-full shadow-lg whitespace-nowrap">🔥 OFERTA PRINCIPAL</div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mt-4 mb-2">Turma Regular 2ª Fase</h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 flex-1">Plataforma Completa + Correção de Peças + Cronograma Inteligente.</p>
              <div className="mb-8">
                <p className="text-muted-foreground line-through text-xl">De R$ {precoOriginal},00</p>
                <p className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-foreground mt-2">R$ {precoAtual}<span className="text-lg font-normal text-muted-foreground">,00 à vista ou 12x</span></p>
              </div>
              <Button variant="hero" size="lg" className="w-full h-16 text-lg mt-auto" onClick={() => openAuth(false)}>Garantir Minha Vaga</Button>
              <p className="text-xs text-muted-foreground mt-6"><Shield className="h-4 w-4 inline mr-1" /> Compra 100% Segura | 7 Dias de Garantia</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="relative bg-muted/30 rounded-3xl p-8 sm:p-12 border-2 border-border text-center flex flex-col h-full mt-10 md:mt-0">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-bold px-6 py-2 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap"><LifeBuoy className="h-4 w-4" /> VAI FAZER REPESCAGEM?</div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-primary mt-4 mb-2">Desconto de 50%</h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-6 flex-1 text-justify sm:text-center">Você não precisa pagar o valor integral. Alunos de repescagem têm direito a uma condição especial mediante comprovação no nosso atendimento.</p>
              
              <div className="mb-8 bg-background p-5 rounded-xl border border-border text-left">
                <p className="text-sm text-foreground font-bold mb-3 border-b border-border pb-2">Passo a passo:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside font-medium">
                  <li>Clique no botão abaixo</li>
                  <li>Envie seu comprovante no WhatsApp</li>
                  <li>Receba o link de pagamento com desconto</li>
                </ol>
              </div>

              <Button variant="outline" className="w-full h-16 text-lg border-accent text-accent hover:bg-accent/10 mt-auto" asChild>
                <a href={`https://wa.me/${meuWhatsApp}?text=${encodeURIComponent("Olá Professor! Fiquei de repescagem no último exame e gostaria de enviar meu comprovante para receber o link com 50% de desconto na SuaOAB.")}`} target="_blank" rel="noreferrer">Validar no WhatsApp</a>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-hero py-20">
        <div className="container px-6 text-center space-y-8">
          <h2 className="text-3xl font-display font-bold text-primary-foreground">Acesse agora e veja na prática.</h2>
          <Button variant="accent" size="lg" className="h-14 w-full sm:w-auto px-10" onClick={() => openAuth(false)}><Clock className="mr-2 h-5 w-5" /> Iniciar Matrícula</Button>
        </div>
      </section>

      <footer className="bg-primary py-12 border-t border-primary/80">
        <div className="container text-center">
          <p className="text-primary-foreground/50 text-sm">© 2026 SuaOAB. Todos os direitos reservados.</p>
        </div>
      </footer>

      <a href={`https://wa.me/${meuWhatsApp}?text=${encodeURIComponent("Olá! Gostaria de tirar uma dúvida sobre a matrícula na SuaOAB.")}`} target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-50 flex items-center justify-center hover:scale-110 transition-transform duration-300 drop-shadow-2xl">
        <img src="https://raw.githubusercontent.com/miguelss3/suaoab/0ce289c50dd729e287ddf50ca8c319257aa2970e/whatsapp-removebg.png" alt="WhatsApp" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
      </a>

      <AuthModal showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} isLogin={isLogin} setIsLogin={setIsLogin} />
    </div>
  );
};

export default Index;