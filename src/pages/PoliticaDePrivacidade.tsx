// src/pages/PoliticaDePrivacidade.tsx
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PoliticaDePrivacidade = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar para a página inicial
        </Link>

        <h1 className="text-3xl font-display font-bold text-primary mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 23 de julho de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <p>
              Esta Política de Privacidade descreve como a SuaOAB ("nós") coleta, usa, armazena e protege os
              dados pessoais dos usuários da Plataforma, em conformidade com a Lei Geral de Proteção de Dados
              (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">1. Dados coletados</h2>
            <p>Coletamos os seguintes dados fornecidos diretamente por você no momento da matrícula ou uso da Plataforma:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Nome completo;</li>
              <li>E-mail;</li>
              <li>Número de WhatsApp (com DDD);</li>
              <li>Informações acadêmicas (fase de estudo, disciplina, matrícula, progresso, peças e correções enviadas);</li>
              <li>Dados técnicos de acesso e uso da Plataforma (ex.: registros de autenticação).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">2. Finalidade do tratamento</h2>
            <p>Os dados são utilizados para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Criar e gerenciar sua matrícula e acesso ao painel do aluno;</li>
              <li>Personalizar cronogramas, metas e correções;</li>
              <li>Confirmar pagamentos e liberar acesso a conteúdos adquiridos;</li>
              <li>Enviar comunicações sobre seus estudos, avisos e ofertas relacionadas ao curso, via e-mail ou WhatsApp;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">3. Compartilhamento de dados</h2>
            <p>
              Seus dados podem ser compartilhados com prestadores de serviço estritamente necessários à operação
              da Plataforma, como provedores de infraestrutura e autenticação (Google Firebase) e plataformas de
              pagamento (ex.: Hotmart), sempre limitado ao necessário para a prestação do serviço. Não vendemos
              seus dados pessoais a terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">4. Armazenamento e segurança</h2>
            <p>
              Os dados são armazenados em infraestrutura do Google Firebase (Firestore/Authentication), com
              controle de acesso definido por regras de segurança (Security Rules) que restringem a leitura e
              escrita apenas a usuários autenticados e autorizados. Adotamos medidas técnicas razoáveis para
              proteger seus dados contra acesso não autorizado, perda ou alteração indevida.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">5. Seus direitos</h2>
            <p>Nos termos da LGPD, você pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Confirmação da existência de tratamento de dados;</li>
              <li>Acesso, correção ou atualização dos seus dados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
              <li>Portabilidade dos dados;</li>
              <li>Revogação do consentimento e exclusão da conta.</li>
            </ul>
            <p className="mt-2">
              Para exercer esses direitos, entre em contato pelo WhatsApp ou e-mail de suporte informados na
              Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">6. Retenção de dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta Política ou
              conforme exigido por obrigações legais, fiscais ou regulatórias. Após esse período, os dados são
              eliminados ou anonimizados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">7. Alterações desta política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente para refletir melhorias na Plataforma ou mudanças
              legais. A versão vigente estará sempre disponível nesta página.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-2">8. Contato</h2>
            <p>
              Dúvidas sobre esta Política ou sobre o tratamento dos seus dados pessoais podem ser enviadas pelo
              WhatsApp disponível no site ou pelo e-mail de suporte informado na Plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PoliticaDePrivacidade;
