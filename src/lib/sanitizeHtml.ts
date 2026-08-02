// src/lib/sanitizeHtml.ts
// Sanitiza HTML rico (produzido pelo RichTextEditor ou colado de fontes como o
// Word) antes de exibir com dangerouslySetInnerHTML — remove scripts, iframes,
// imagens e atributos perigosos, mantendo apenas formatação de texto.
import DOMPurify from "dompurify";

const TAGS_PERMITIDAS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "span",
];

const ATRIBUTOS_PERMITIDOS = ["href", "target", "rel"];

export const sanitizeRichText = (html: string): string => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAGS_PERMITIDAS,
    ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
  });
};
