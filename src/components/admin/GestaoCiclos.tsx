// src/components/admin/GestaoCiclos.tsx
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, addDoc, onSnapshot } from "firebase/firestore";
import { CalendarDays, Save, AlertTriangle, CheckCircle2, Clock, Mail, Target, Users, Tag, Link as LinkIcon, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { calcularTetoComDecaimento, calcularVagasVisiveis, countAlunosPremium, JANELA_DECAIMENTO_VAGAS_DIAS } from "@/lib/ciclo";
import { DEFAULT_HOTMART_CHECKOUT_URL } from "@/lib/hotmart";
import { ADMIN_EMAIL } from "@/lib/constants";

const GestaoCiclos = () => {
  const cicloRef = doc(db, "configuracoes", "ciclo_atual");
  const ofertaRef = doc(db, "configuracoes", "oferta_atual");

  const [exame, setExame] = useState("");
  const [dataProva, setDataProva] = useState("");
  const [vagasTotais, setVagasTotais] = useState<number | string>(50);
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  
  const [precoOriginal, setPrecoOriginal] = useState("899");
  const [precoAtual, setPrecoAtual] = useState("599");
  const [linkCheckout, setLinkCheckout] = useState(DEFAULT_HOTMART_CHECKOUT_URL);
  const [linkRepescagem, setLinkRepescagem] = useState("");

  const [tetoVagasExibidas, setTetoVagasExibidas] = useState<string>("");
  const [decaimentoAtivo, setDecaimentoAtivo] = useState(false);
  const [vagasMinimasDecaimento, setVagasMinimasDecaimento] = useState<string>("1");

  const [extensaoEmailAtiva, setExtensaoEmailAtiva] = useState(false);
  const [testeEmailStatus, setTesteEmailStatus] = useState<"idle" | "aguardando" | "sucesso" | "erro" | "timeout">("idle");
  const [testeEmailErro, setTesteEmailErro] = useState("");

  const [loading, setLoading] = useState(false);

  // Teto de vagas exibidas "hoje", já considerando o decaimento gradual (se ativo).
  // É este valor — não o total real de vagas — que deve chegar na landing page.
  // Recebe os valores explicitamente (em vez de ler o state direto) para poder ser
  // usado tanto a partir do state atual (preview, salvar) quanto de dados recém
  // carregados do Firestore (sincronização inicial), sem depender do timing do React.
  const calcularTetoEfetivo = (
    teto: string | number | undefined,
    ativo: boolean | undefined,
    minimas: string | number | undefined,
    dataProvaStr: string | undefined
  ): number | undefined => {
    if (teto === undefined || teto === "" || teto === null) return undefined;

    const tetoBase = Number(teto);
    if (!Number.isFinite(tetoBase)) return undefined;
    if (!ativo) return tetoBase;

    const dataProvaObj = dataProvaStr ? new Date(dataProvaStr + "T12:00:00") : null;
    return calcularTetoComDecaimento(tetoBase, Number(minimas) || 0, dataProvaObj);
  };

  const tetoEfetivoAtual = calcularTetoEfetivo(tetoVagasExibidas, decaimentoAtivo, vagasMinimasDecaimento, dataProva);

  const sincronizarMatriculados = async () => {
    const qAlunos = query(collection(db, "alunos"), where("status", "!=", "inativo"));
    const snapAlunos = await getDocs(qAlunos);

    const matriculadosAtuais = countAlunosPremium(
      snapAlunos.docs.map((alunoDoc) => ({
        id: alunoDoc.id,
        ...(alunoDoc.data() as { email?: string; status?: string }),
      }))
    );

    setAlunosAtivos(matriculadosAtuais);

    return matriculadosAtuais;
  };

  useEffect(() => {
    const fetchCiclo = async () => {
      try {
        const docSnap = await getDoc(cicloRef);
        const ofertaSnap = await getDoc(ofertaRef);

        if (!docSnap.exists()) return;

        const data = docSnap.data();

        setExame(data.exame || "");
        setDataProva(data.data_prova || "");
        if (data.vagas_totais) setVagasTotais(data.vagas_totais);
        if (data.teto_vagas_exibidas !== undefined && data.teto_vagas_exibidas !== null) {
          setTetoVagasExibidas(String(data.teto_vagas_exibidas));
        }
        if (data.decaimento_vagas_ativo === true) setDecaimentoAtivo(true);
        if (data.vagas_minimas_decaimento !== undefined && data.vagas_minimas_decaimento !== null) {
          setVagasMinimasDecaimento(String(data.vagas_minimas_decaimento));
        }

        if (ofertaSnap.exists()) {
          const oferta = ofertaSnap.data();
          if (oferta.preco_original) setPrecoOriginal(oferta.preco_original);
          if (oferta.preco_atual) setPrecoAtual(oferta.preco_atual);
          if (oferta.link_checkout) setLinkCheckout(oferta.link_checkout);
          if (oferta.link_repescagem) setLinkRepescagem(oferta.link_repescagem);
          setExtensaoEmailAtiva(oferta.extensao_email_ativa === true);
        } else {
          if (data.preco_original) setPrecoOriginal(data.preco_original);
          if (data.preco_atual) setPrecoAtual(data.preco_atual);
          if (data.link_checkout) setLinkCheckout(data.link_checkout);
          if (data.link_repescagem) setLinkRepescagem(data.link_repescagem);
        }

        const matriculadosAtuais = await sincronizarMatriculados();
        const tetoEfetivo = calcularTetoEfetivo(
          data.teto_vagas_exibidas,
          data.decaimento_vagas_ativo,
          data.vagas_minimas_decaimento,
          data.data_prova
        );
        const vagasRestantesCalculadas = calcularVagasVisiveis(data.vagas_totais, matriculadosAtuais, tetoEfetivo);

        if (
          Number(data.matriculados) !== matriculadosAtuais ||
          Number(data.vagas_restantes) !== vagasRestantesCalculadas
        ) {
          await updateDoc(cicloRef, {
            matriculados: matriculadosAtuais,
            vagas_restantes: vagasRestantesCalculadas,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados do ciclo", error);
      }
    };

    fetchCiclo();
  }, []);

  const handleSalvar = async () => {
    if (!exame || !dataProva) {
      toast.error("Preencha o número do exame e a data da prova.");
      return;
    }

    setLoading(true);
    try {
      const matriculadosAtuais = await sincronizarMatriculados();

      if (Number(vagasTotais) < matriculadosAtuais) {
        toast.error(`Você não pode ter menos vagas do que os ${matriculadosAtuais} alunos Premium atuais.`);
        return;
      }

      const dataExp = new Date(dataProva + "T12:00:00");
      dataExp.setDate(dataExp.getDate() + 5);

      const tetoEfetivo = calcularTetoEfetivo(tetoVagasExibidas, decaimentoAtivo, vagasMinimasDecaimento, dataProva);
      const vagasRestantesCalculadas = calcularVagasVisiveis(vagasTotais, matriculadosAtuais, tetoEfetivo);

      await setDoc(cicloRef, {
        exame,
        data_prova: dataProva,
        data_expiracao: dataExp.toISOString().split('T')[0],
        vagas_totais: Number(vagasTotais),
        // Guardamos o teto "cru" (não o valor já com decaimento aplicado) para a
        // Cloud Function agendada poder recalcular o decaimento dia após dia.
        teto_vagas_exibidas: tetoVagasExibidas === "" ? null : Number(tetoVagasExibidas),
        decaimento_vagas_ativo: decaimentoAtivo,
        vagas_minimas_decaimento: Number(vagasMinimasDecaimento) || 0,
        matriculados: matriculadosAtuais,
        vagas_restantes: vagasRestantesCalculadas,
        atualizado_em: new Date()
      }, { merge: true });

      await setDoc(ofertaRef, {
        preco_original: precoOriginal,
        preco_atual: precoAtual,
        link_checkout: linkCheckout,
        link_repescagem: linkRepescagem,
        extensao_email_ativa: extensaoEmailAtiva,
        atualizado_em: new Date()
      }, { merge: true });

      toast.success("Configurações atualizadas! A Landing Page já reflete as vagas reais.");
    } catch (error) {
      toast.error("Erro ao guardar as configurações no banco de dados.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calcularExpiracaoVisual = () => {
    if (!dataProva) return "Aguardando data da prova...";
    const d = new Date(dataProva + "T12:00:00");
    d.setDate(d.getDate() + 5);
    return d.toLocaleDateString('pt-BR');
  };

  // Verificação em app do Prompt 0: grava um documento de teste na coleção `mail`
  // e observa o campo `delivery` que a extensão "Trigger Email from Firestore"
  // escreve de volta no próprio documento após tentar o envio.
  const handleEnviarEmailTeste = async () => {
    setTesteEmailStatus("aguardando");
    setTesteEmailErro("");

    let unsub = () => {};

    try {
      const mailRef = await addDoc(collection(db, "mail"), {
        to: [ADMIN_EMAIL],
        message: {
          subject: "SuaOAB - Teste de configuração de e-mail",
          html: "<p>Se você recebeu este e-mail, a extensão \"Trigger Email from Firestore\" está configurada corretamente. Pode habilitar o envio de repescagem com confiança.</p>",
          text: "Se você recebeu este e-mail, a extensão de disparo está configurada corretamente.",
        },
      });

      const timeoutId = window.setTimeout(() => {
        unsub();
        setTesteEmailStatus((atual) => (atual === "aguardando" ? "timeout" : atual));
      }, 30000);

      unsub = onSnapshot(mailRef, (snap) => {
        const delivery = snap.data()?.delivery as { state?: string; error?: string } | undefined;
        if (!delivery?.state || delivery.state === "PENDING" || delivery.state === "PROCESSING") return;

        window.clearTimeout(timeoutId);
        unsub();

        if (delivery.state === "SUCCESS") {
          setTesteEmailStatus("sucesso");
        } else {
          setTesteEmailStatus("erro");
          setTesteEmailErro(delivery.error || "Erro desconhecido ao enviar.");
        }
      });
    } catch (error) {
      console.error("Erro ao criar documento de teste em 'mail':", error);
      setTesteEmailStatus("erro");
      setTesteEmailErro("Não foi possível gravar o documento de teste no Firestore.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card p-8 rounded-xl border border-border shadow-sm max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-primary italic">Ciclos e Prazos</h2>
            <p className="text-sm text-muted-foreground">Controle vagas, datas de expiração e os preços exibidos na página de vendas.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground"/> Edição do Exame
              </Label>
              {/* CORREÇÃO 2: Alterado de setExame(setExame) para e.target.value para destravar o banco */}
              <Input placeholder="Ex: Exame 47" value={exame} onChange={(e) => setExame(e.target.value)} className="h-12 text-lg" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground"/> Data da 2ª Fase
              </Label>
              <Input type="date" value={dataProva} onChange={(e) => setDataProva(e.target.value)} className="h-12 text-lg" />
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-accent"/> Estratégia de Precificação & Repescagem
            </h3>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">Preço Original (R$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-muted-foreground font-bold">R$</span>
                  <Input type="number" value={precoOriginal} onChange={(e) => setPrecoOriginal(e.target.value)} className="h-12 text-lg font-bold pl-12 line-through text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-success">Preço Atual / Oferta (R$)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-success font-bold">R$</span>
                  <Input type="number" value={precoAtual} onChange={(e) => setPrecoAtual(e.target.value)} className="h-12 text-lg font-black pl-12 border-success text-success focus-visible:ring-success" />
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border mb-4">
              <Label className="text-sm font-bold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" /> Link Principal do Checkout Hotmart
              </Label>
              <Input
                placeholder="https://pay.hotmart.com/..."
                value={linkCheckout}
                onChange={(e) => setLinkCheckout(e.target.value)}
                className="font-mono text-sm h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">Este link e usado pelos alunos Lead para concluir a compra premium na plataforma.</p>
            </div>

            <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border">
              <Label className="text-sm font-bold flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" /> Link Oculto (Hotmart) - Repescagem 50% OFF
              </Label>
              <Input 
                placeholder="https://pay.hotmart.com/..." 
                value={linkRepescagem} 
                onChange={(e) => setLinkRepescagem(e.target.value)} 
                className="font-mono text-sm h-10" 
              />
              <p className="text-xs text-muted-foreground mt-1">Este link aparece apenas para alunos bloqueados pelo encerramento do ciclo ou em repescagem.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-accent"/> Envio de E-mail (Repescagem e Ofertas)
            </h3>
            <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">
                O envio de e-mail (repescagem de inativos, ofertas) depende da extensão do Firebase{" "}
                <strong>"Trigger Email from Firestore"</strong>, instalada e configurada separadamente no{" "}
                <a
                  href="https://console.firebase.google.com/project/_/extensions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-accent"
                >
                  Console do Firebase
                </a>{" "}
                (não neste painel — as credenciais de SMTP nunca passam pelo app). Grave um e-mail de teste abaixo para
                confirmar que a extensão está funcionando antes de habilitar o envio para alunos de verdade.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button type="button" variant="outline" onClick={handleEnviarEmailTeste} disabled={testeEmailStatus === "aguardando"} className="gap-2">
                  <Mail className="h-4 w-4" />
                  {testeEmailStatus === "aguardando" ? "Aguardando confirmação..." : `Enviar e-mail de teste para ${ADMIN_EMAIL}`}
                </Button>

                {testeEmailStatus === "sucesso" && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-success">
                    <CheckCircle2 className="h-4 w-4" /> Entregue! Verifique sua caixa de entrada.
                  </span>
                )}
                {testeEmailStatus === "erro" && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-destructive">
                    <XCircle className="h-4 w-4" /> Falhou: {testeEmailErro}
                  </span>
                )}
                {testeEmailStatus === "timeout" && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" /> Sem resposta em 30s — a extensão provavelmente ainda não está instalada.
                  </span>
                )}
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-border/60">
                <input
                  type="checkbox"
                  id="extensaoEmailAtiva"
                  className="mt-1 h-4 w-4 accent-accent cursor-pointer"
                  checked={extensaoEmailAtiva}
                  onChange={(e) => setExtensaoEmailAtiva(e.target.checked)}
                />
                <Label htmlFor="extensaoEmailAtiva" className="text-sm font-bold cursor-pointer">
                  Já testei e confirmo que a extensão de e-mail está funcionando
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Enquanto isso não for marcado, o Alunos CRM avisa o professor de que o pedido de repescagem será
                registrado mas o e-mail não sairá de fato.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-accent"/> Gatilho de Escassez (Vagas no Site)
            </h3>
            <div className="grid md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Total de Vagas da Turma</Label>
                <Input type="number" min={alunosAtivos} value={vagasTotais} onChange={(e) => setVagasTotais(e.target.value)} className="h-12 text-lg font-bold" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 bg-background border border-border p-3 rounded-lg text-center shadow-inner">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Matriculados</p>
                  <p className="text-2xl font-display font-black text-primary">{alunosAtivos}</p>
                </div>
                <div className="flex-1 bg-accent/10 border border-accent/20 p-3 rounded-lg text-center">
                  <p className="text-[10px] text-accent uppercase font-black tracking-widest mb-1">Visível no Site</p>
                  <p className="text-2xl font-display font-black text-accent">{calcularVagasVisiveis(vagasTotais, alunosAtivos, tetoEfetivoAtual)}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Matriculados são sincronizados automaticamente com a quantidade de alunos Premium no CRM. Esse valor não depende de preenchimento manual.
            </p>

            <div className="mt-6 space-y-4 bg-muted/20 p-4 rounded-xl border border-border">
              <div>
                <Label className="text-sm font-bold">Teto de Vagas Exibidas (opcional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Mostra no máximo este número na Landing Page, mesmo que o real seja maior — útil para gerar mais urgência.
                  Deixe em branco para exibir o número real de vagas.
                </p>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 5"
                  value={tetoVagasExibidas}
                  onChange={(e) => setTetoVagasExibidas(e.target.value)}
                  className="h-12 text-lg font-bold max-w-[200px]"
                />
              </div>

              {tetoVagasExibidas !== "" && (
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="decaimentoAtivo"
                    className="mt-1 h-4 w-4 accent-accent cursor-pointer"
                    checked={decaimentoAtivo}
                    onChange={(e) => setDecaimentoAtivo(e.target.checked)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="decaimentoAtivo" className="text-sm font-bold cursor-pointer">
                      Reduzir gradualmente conforme a prova se aproxima
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Nos {JANELA_DECAIMENTO_VAGAS_DIAS} dias antes da Data da 2ª Fase, o número exibido cai
                      linearmente do teto acima até o mínimo definido abaixo.
                    </p>
                    {decaimentoAtivo && (
                      <div className="mt-3 max-w-[200px]">
                        <Label className="text-xs font-bold text-muted-foreground">Vagas mínimas ao final</Label>
                        <Input
                          type="number"
                          min={0}
                          value={vagasMinimasDecaimento}
                          onChange={(e) => setVagasMinimasDecaimento(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-accent/40 bg-primary p-4">
                <p className="text-[10px] text-primary-foreground/60 uppercase font-black tracking-widest mb-2">Prévia na Landing Page</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm lg:text-base font-bold text-primary-foreground/70">⚠️ Restam apenas</span>
                  <span className="text-2xl font-display font-black text-accent">
                    {calcularVagasVisiveis(vagasTotais, alunosAtivos, tetoEfetivoAtual)}
                  </span>
                  <span className="text-sm lg:text-base font-bold text-primary-foreground/70">vagas!</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-5 rounded-lg border border-border flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-primary mb-1">Como a Expiração Automática funciona?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                O sistema libertará o acesso dos alunos Premium até 5 dias após a data da prova que você configurar acima. 
                Após essa data, o aluno verá a tela de bloqueio e o botão de solicitação de repescagem.
              </p>
              <div className="inline-flex items-center gap-2 bg-background px-4 py-2 border border-border rounded-md">
                <Clock className="h-4 w-4 text-muted-foreground"/>
                <span className="text-sm font-bold text-primary">Corte agendado para:</span>
                <span className="text-sm font-black text-destructive tracking-wide uppercase">{calcularExpiracaoVisual()}</span>
              </div>
            </div>
          </div>

          <Button variant="hero" size="lg" className="w-full h-14 text-lg" onClick={handleSalvar} disabled={loading}>
            <Save className="h-5 w-5 mr-2" />
            {loading ? "A Guardar Configurações..." : "Salvar Configurações Gerais"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GestaoCiclos;