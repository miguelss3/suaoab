// src/components/admin/DatePicker.tsx
// Seletor de data com minicalendário de verdade (Popover + Calendar), no lugar
// do <input type="date"> nativo do navegador — mais confiável entre navegadores
// e visualmente consistente com o resto do painel.
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

// Evita o problema clássico de fuso horário: interpretar "yyyy-mm-dd" direto
// com `new Date(...)` lê como UTC meia-noite, que pode exibir o dia anterior
// no horário local. Meio-dia local evita a virada de dia.
const paraDate = (valor: string): Date | undefined => {
  if (!valor) return undefined;
  const d = new Date(`${valor}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const paraString = (data: Date): string => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export const DatePicker = ({ value, onChange, placeholder, className }: Props) => {
  const dataSelecionada = paraDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full h-10 justify-start text-left font-normal", !dataSelecionada && "text-muted-foreground", className)}
        >
          <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
          {dataSelecionada ? format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR }) : placeholder || "Selecionar data"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dataSelecionada}
          onSelect={(data) => data && onChange(paraString(data))}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
