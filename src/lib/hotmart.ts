export const DEFAULT_HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/Q104967483T";

export interface HotmartCheckoutPerfil {
  nome?: string;
  email?: string;
  whatsapp?: string;
}

export const normalizarEmail = (email?: string | null) => {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

export const gerarLinkHotmartComPrefill = (
  baseUrl: string | undefined,
  aluno?: HotmartCheckoutPerfil | null
) => {
  const urlBase = (baseUrl || DEFAULT_HOTMART_CHECKOUT_URL).trim() || DEFAULT_HOTMART_CHECKOUT_URL;

  try {
    const url = new URL(urlBase);

    if (aluno?.nome) url.searchParams.set("name", aluno.nome.trim());

    const emailNormalizado = normalizarEmail(aluno?.email);
    if (emailNormalizado) url.searchParams.set("email", emailNormalizado);

    if (aluno?.whatsapp) {
      const foneLimpo = aluno.whatsapp.replace(/\D/g, "");
      if (foneLimpo.length >= 10) {
        const temCodigoPais = foneLimpo.startsWith("55") && foneLimpo.length >= 12;
        const ddd = temCodigoPais ? foneLimpo.substring(2, 4) : foneLimpo.substring(0, 2);
        const numero = temCodigoPais ? foneLimpo.substring(4) : foneLimpo.substring(2);
        url.searchParams.set("phoneac", ddd);
        url.searchParams.set("phonenumber", numero);
      }
    }

    return url.toString();
  } catch {
    return DEFAULT_HOTMART_CHECKOUT_URL;
  }
};