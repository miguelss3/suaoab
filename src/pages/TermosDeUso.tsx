// src/pages/TermosDeUso.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermosDeUso = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar para a página inicial
        </Link>

        <h1 className="text-3xl font-display font-bold text-primary mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 23 de julho de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">1. Aceitação dos termos</h2>
            <p>
              Ao criar uma matrícula ou utilizar a plataforma SuaOAB ("Plataforma"), você declara que leu,
              compreendeu e concorda integralmente com estes Termos de Uso e com a nossa{" "}
              <Link to="/politica-de-privacidade" className="text-accent underline">Política de Privacidade</Link>.
              Caso não concorde com algum ponto, não utilize a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">2. Descrição do serviço</h2>
            <p>
              A SuaOAB oferece conteúdo educacional voltado à preparação para o Exame de Ordem (1ª e 2ª fase) e
              apoio a estudantes de graduação em Direito, incluindo aulas, cronogramas de estudo, correção de
              peças e simulados. O acesso a determinados conteúdos pode depender da confirmação de pagamento
              processado por plataformas parceiras (ex.: Hotmart).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">3. Cadastro e responsabilidade do usuário</h2>
            <p>
              Você é responsável por fornecer informações verdadeiras, completas e atualizadas no momento da
              matrícula (nome, e-mail, WhatsApp) e por manter a confidencialidade da sua senha de acesso. Todo
              acesso realizado com suas credenciais é de sua responsabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">4. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo disponibilizado na Plataforma (aulas, materiais, correções, cronogramas, marca e
              layout) é protegido por direitos autorais e não pode ser reproduzido, distribuído, compartilhado ou
              revendido sem autorização prévia e por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">5. Pagamentos, acesso e cancelamento</h2>
            <p>
              Condições de pagamento, prazos de acesso e eventuais descontos (ex.: repescagem) são informados na
              página de vendas correspondente. Reembolsos seguem a política da plataforma de pagamento utilizada
              e a legislação aplicável (Código de Defesa do Consumidor).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">6. Comunicações</h2>
            <p>
              Ao aceitar estes termos, você concorda em receber comunicações relacionadas à sua matrícula e aos
              seus estudos por e-mail e/ou WhatsApp, podendo solicitar o descadastramento a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">7. Limitação de responsabilidade</h2>
            <p>
              O conteúdo tem caráter educacional e não garante aprovação em exames. A SuaOAB envida seus melhores
              esforços para manter a Plataforma disponível, mas não se responsabiliza por indisponibilidades
              temporárias decorrentes de terceiros (provedores de hospedagem, internet, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">8. Alterações destes termos</h2>
            <p>
              Estes Termos podem ser atualizados periodicamente. A versão vigente estará sempre disponível
              nesta página, com a data da última atualização indicada acima.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">9. Contato</h2>
            <p>
              Dúvidas sobre estes Termos podem ser enviadas pelo WhatsApp disponível no site ou pelo e-mail de
              suporte informado na Plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermosDeUso;
