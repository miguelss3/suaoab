// src/components/admin/PainelVendas.tsx
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, TrendingUp, Users, UserCheck, UserX, Wallet, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { classificarAluno, paraData } from "@/lib/ciclo";

interface AlunoVendas {
  id: string;
  status?: string;
  email?: string;
  faseEstudo?: string;
  acessoVitalicio?: boolean;
  data_cadastro?: unknown;
  data_conversao_premium?: unknown;
}

interface OfertaAtual {
  preco_original?: string | number;
  preco_atual?: string | number;
}

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const chartConfig: ChartConfig = {
  matriculas: { label: "Matrículas Premium", color: "hsl(var(--accent))" },
};

const CardMetrica = ({
  icone: Icone,
  label,
  valor,
  destaque,
}: {
  icone: typeof Users;
  label: string;
  valor: string;
  destaque?: boolean;
}) => (
  <div className={`rounded-xl border p-4 sm:p-5 ${destaque ? "border-accent/40 bg-accent/5" : "border-border bg-card"}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icone className={`h-4 w-4 ${destaque ? "text-accent" : "text-muted-foreground"}`} />
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
    <p className={`text-2xl sm:text-3xl font-display font-black ${destaque ? "text-accent" : "text-primary"}`}>{valor}</p>
  </div>
);

const PainelVendas = () => {
  const [alunos, setAlunos] = useState<AlunoVendas[] | null>(null);
  const [oferta, setOferta] = useState<OfertaAtual | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "alunos"), (snap) => {
      setAlunos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AlunoVendas, "id">) })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "configuracoes", "oferta_atual"), (snap) => {
      setOferta(snap.exists() ? (snap.data() as OfertaAtual) : {});
    });
    return () => unsub();
  }, []);

  const metricas = useMemo(() => {
    if (!alunos) return null;

    // Mesma fonte de classificação usada no Alunos CRM, para os números nunca divergirem entre telas.
    const classificados = alunos.map((a) => ({ aluno: a, categoria: classificarAluno(a) }));
    const premium = classificados.filter((c) => c.categoria === "premium").map((c) => c.aluno);
    const inativos = classificados.filter((c) => c.categoria === "inativo").map((c) => c.aluno);
    const emTeste = classificados.filter((c) => c.categoria === "em_teste").map((c) => c.aluno);
    const elegiveis = [...premium, ...inativos, ...emTeste];

    const precoAtual = Number(oferta?.preco_atual);
    const precoOriginal = Number(oferta?.preco_original);
    const precoAtualValido = Number.isFinite(precoAtual) && precoAtual > 0;

    const receitaEstimada = precoAtualValido ? premium.length * precoAtual : null;

    // Evolução mensal: usa a data de conversão em Premium; para matrículas antigas sem esse
    // campo (anteriores a esta funcionalidade), usa a data de cadastro como aproximação.
    const hoje = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      return { ano: referencia.getFullYear(), mes: referencia.getMonth(), label: NOMES_MES[referencia.getMonth()] };
    });

    const evolucao = meses.map(({ ano, mes, label }) => {
      const total = premium.filter((a) => {
        const data = paraData(a.data_conversao_premium) ?? paraData(a.data_cadastro);
        return data && data.getFullYear() === ano && data.getMonth() === mes;
      }).length;
      return { mes: label, matriculas: total };
    });

    const temHistoricoEvolucao = evolucao.some((m) => m.matriculas > 0);

    return {
      leadsTotais: elegiveis.length,
      emTeste: emTeste.length,
      premium: premium.length,
      inativos: inativos.length,
      receitaEstimada,
      precoAtualValido,
      precoAtual,
      precoOriginal,
      evolucao,
      temHistoricoEvolucao,
    };
  }, [alunos, oferta]);

  if (!alunos || !metricas) {
    return <div className="p-10 text-center text-sm text-muted-foreground font-bold">Carregando métricas...</div>;
  }

  if (metricas.leadsTotais === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center max-w-xl mx-auto">
        <Sparkles className="h-8 w-8 text-accent mx-auto mb-4" />
        <h3 className="font-display font-bold text-primary text-lg mb-2">Ainda não há alunos cadastrados</h3>
        <p className="text-sm text-muted-foreground">
          Assim que os primeiros cadastros (Leads) chegarem pela landing page, este painel mostrará o funil de
          conversão, a receita estimada e a evolução de matrículas Premium em tempo real.
        </p>
      </div>
    );
  }

  const taxaEmTeste = (metricas.emTeste / metricas.leadsTotais) * 100;
  const taxaPremium = (metricas.premium / metricas.leadsTotais) * 100;
  const descontoPercentual =
    metricas.precoOriginal > 0 && metricas.precoAtualValido
      ? Math.round((1 - metricas.precoAtual / metricas.precoOriginal) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <CardMetrica icone={Users} label="Em Teste" valor={String(metricas.emTeste)} />
        <CardMetrica icone={UserCheck} label="Premium" valor={String(metricas.premium)} destaque />
        <CardMetrica icone={UserX} label="Inativos" valor={String(metricas.inativos)} />
        <CardMetrica icone={TrendingUp} label="Cadastros Totais" valor={String(metricas.leadsTotais)} />
        <CardMetrica
          icone={Wallet}
          label="Receita Estimada / Mês"
          valor={metricas.receitaEstimada !== null ? formatarMoeda(metricas.receitaEstimada) : "—"}
          destaque
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-bold text-primary italic mb-1 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" /> Funil de Conversão
          </h3>
          <p className="text-xs text-muted-foreground mb-6">
            Todo cadastro inicia automaticamente em teste; a métrica que importa é quanto disso converte em Premium.
          </p>

          <div className="space-y-3">
            {[
              { label: "Cadastros (Leads)", valor: metricas.leadsTotais, largura: 100, taxa: null as number | null },
              { label: "Em Teste", valor: metricas.emTeste, largura: Math.max(4, taxaEmTeste), taxa: taxaEmTeste },
              { label: "Premium (Convertidos)", valor: metricas.premium, largura: Math.max(4, taxaPremium), taxa: taxaPremium },
            ].map((etapa) => (
              <div key={etapa.label}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-primary">{etapa.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {etapa.valor} {etapa.taxa !== null && <span className="font-bold text-accent">({etapa.taxa.toFixed(1)}%)</span>}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${etapa.largura}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-bold text-primary italic mb-1 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-accent" /> Ticket Médio & Oferta
          </h3>
          <p className="text-xs text-muted-foreground mb-6">Preço vigente configurado em Ciclos e Prazos.</p>

          {metricas.precoAtualValido ? (
            <div className="flex items-end gap-4 mb-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ticket Médio Atual</p>
                <p className="text-3xl font-display font-black text-accent">{formatarMoeda(metricas.precoAtual)}</p>
              </div>
              {metricas.precoOriginal > 0 && (
                <div className="pb-1">
                  <p className="text-sm line-through text-muted-foreground">{formatarMoeda(metricas.precoOriginal)}</p>
                  {descontoPercentual !== null && descontoPercentual > 0 && (
                    <p className="text-xs font-bold text-success">{descontoPercentual}% OFF</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Configure o preço atual em "Ciclos e Prazos" para calcular ticket médio e receita.</p>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-display font-bold text-primary italic mb-1 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" /> Evolução de Matrículas Premium (últimos 6 meses)
        </h3>

        {metricas.temHistoricoEvolucao ? (
          <ChartContainer config={chartConfig} className="h-64 w-full mt-4">
            <BarChart data={metricas.evolucao}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="matriculas" fill="var(--color-matriculas)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground mt-4 py-8 text-center">
            Ainda não há histórico de conversões Premium nos últimos 6 meses.
          </p>
        )}
      </div>
    </div>
  );
};

export default PainelVendas;
