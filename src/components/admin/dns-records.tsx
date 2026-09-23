import type { DnsRecordInstruction } from "@/domain/types";
import { CopyButton } from "@/components/ui/copy-button";

function Pending({ children = "A definir" }: { children?: string }) {
  return <span className="inline-flex rounded-md border border-dashed border-line-strong px-2 py-0.5 text-xs text-ink-muted">{children}</span>;
}

/** Instruções de DNS. Valores `null` aparecem como pendentes até a hospedagem informá-los. */
export function DnsRecordsTable({ records }: { records: DnsRecordInstruction[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-control)] border border-line">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">Registros DNS necessários</caption>
        <thead className="bg-muted/60 text-xs font-medium tracking-wide text-ink-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Tipo</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Nome</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {records.map((record, index) => (
            <tr key={`${record.name}-${index}`} className="align-top">
              <td className="px-4 py-3">{record.type ? <span className="font-mono text-[13px]">{record.type}</span> : <Pending />}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <span className="font-mono text-[13px] text-ink">{record.name}</span>
                  <CopyButton value={record.name} label="nome do registro" className="size-7" />
                </span>
              </td>
              <td className="px-4 py-3">
                {record.value ? (
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-[13px] break-all text-ink">{record.value}</span>
                    <CopyButton value={record.value} label="valor do registro" className="size-7" />
                  </span>
                ) : (
                  <Pending>Aguardando hospedagem</Pending>
                )}
                <p className="mt-1.5 text-xs text-ink-muted">{record.purpose}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
