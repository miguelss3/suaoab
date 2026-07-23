import { describe, it, expect } from "vitest";
import {
  calcularTetoComDecaimento,
  calcularVagasVisiveis,
  classificarAluno,
  countAlunosPremium,
} from "@/lib/ciclo";

describe("classificarAluno", () => {
  it("classifica aluno premium comum", () => {
    expect(classificarAluno({ status: "premium" })).toBe("premium");
  });

  it("classifica aluno inativo", () => {
    expect(classificarAluno({ status: "inativo" })).toBe("inativo");
  });

  it("classifica lead sem status definido como em_teste", () => {
    expect(classificarAluno({ status: "Lead" })).toBe("em_teste");
    expect(classificarAluno({})).toBe("em_teste");
  });

  it("classifica aluno de graduação mesmo com status premium/inativo", () => {
    expect(classificarAluno({ status: "premium", faseEstudo: "Estudante de Graduação" })).toBe("graduacao");
    expect(classificarAluno({ status: "inativo", acessoVitalicio: true })).toBe("graduacao");
  });

  it("classifica conta de simulação do professor (sandbox) antes de qualquer outra regra", () => {
    // Regressão: essa conta chegou a ficar marcada como status "premium" no banco
    // e era contada como aluno real no CRM por faltar essa exclusão.
    expect(classificarAluno({ id: "admin_sandbox_uid", status: "premium" })).toBe("sandbox");
    expect(classificarAluno({ email: "sandbox@suaoab.com.br", status: "premium" })).toBe("sandbox");
    expect(classificarAluno({ email: "MIGUELSS3@YAHOO.COM.BR", status: "inativo" })).toBe("sandbox");
  });
});

describe("countAlunosPremium", () => {
  it("não conta graduação nem sandbox como premium", () => {
    const alunos = [
      { status: "premium" },
      { status: "premium", faseEstudo: "graduacao", acessoVitalicio: true },
      { id: "admin_sandbox_uid", status: "premium" },
      { status: "inativo" },
    ];
    expect(countAlunosPremium(alunos)).toBe(1);
  });
});

describe("calcularVagasVisiveis", () => {
  it("calcula vagas reais sem teto configurado", () => {
    expect(calcularVagasVisiveis(30, 1)).toBe(29);
  });

  it("nunca retorna número negativo", () => {
    expect(calcularVagasVisiveis(5, 10)).toBe(0);
  });

  it("aplica o teto quando ele é menor que as vagas reais", () => {
    expect(calcularVagasVisiveis(30, 1, 5)).toBe(5);
  });

  it("ignora o teto quando ele é maior que as vagas reais", () => {
    expect(calcularVagasVisiveis(30, 28, 5)).toBe(2);
  });

  it("ignora teto inválido/ausente", () => {
    expect(calcularVagasVisiveis(30, 1, "")).toBe(29);
    expect(calcularVagasVisiveis(30, 1, undefined)).toBe(29);
  });
});

describe("calcularTetoComDecaimento", () => {
  it("mantém o teto base fora da janela de decaimento", () => {
    const dataProva = new Date();
    dataProva.setDate(dataProva.getDate() + 60);
    expect(calcularTetoComDecaimento(10, 1, dataProva)).toBe(10);
  });

  it("chega ao mínimo no dia da prova", () => {
    const hoje = new Date();
    expect(calcularTetoComDecaimento(10, 1, hoje, hoje)).toBe(1);
  });

  it("interpola linearmente dentro da janela", () => {
    const hoje = new Date("2026-01-01T12:00:00");
    const dataProva = new Date("2026-01-16T12:00:00"); // 15 dias à frente = metade da janela de 30
    expect(calcularTetoComDecaimento(10, 0, dataProva, hoje)).toBe(5);
  });

  it("sem data da prova, mantém o teto base", () => {
    expect(calcularTetoComDecaimento(10, 1, null)).toBe(10);
  });
});
