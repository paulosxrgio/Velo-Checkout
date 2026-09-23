"use client";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { getPriceChange } from "@/domain/cart";
import { formatMoney } from "@/domain/money";
import type { CartLine } from "@/domain/types";

/** Avisos que impedem o pagamento até o comprador agir. */
export function CartNotices({
  unavailable,
  priceChanged,
  acknowledging,
  removing,
  onRemoveUnavailable,
  onAcknowledgePrices,
}: {
  unavailable: CartLine[];
  priceChanged: CartLine[];
  acknowledging: boolean;
  removing: boolean;
  onRemoveUnavailable: () => void;
  onAcknowledgePrices: () => void;
}) {
  if (!unavailable.length && !priceChanged.length) return null;

  return (
    <div className="space-y-3">
      {unavailable.length ? (
        <Callout
          tone="danger"
          role="alert"
          title={unavailable.length === 1 ? "Um item ficou indisponível" : `${unavailable.length} itens ficaram indisponíveis`}
          action={
            <Button variant="danger" size="sm" onClick={onRemoveUnavailable} loading={removing} loadingLabel="Removendo…">
              {unavailable.length === 1 ? "Remover item indisponível" : "Remover itens indisponíveis"}
            </Button>
          }
        >
          {unavailable.map((line) => `${line.product.title} (${line.variant.title})`).join(", ")}{" "}
          {unavailable.length === 1 ? "esgotou" : "esgotaram"} depois de entrar no carrinho. Remova para continuar com os demais itens.
        </Callout>
      ) : null}

      {priceChanged.length ? (
        <Callout
          tone="warning"
          role="status"
          title={priceChanged.length === 1 ? "O preço de um item mudou" : "O preço de alguns itens mudou"}
          action={
            <Button variant="secondary" size="sm" onClick={onAcknowledgePrices} loading={acknowledging} loadingLabel="Confirmando…">
              Entendi, continuar com os novos preços
            </Button>
          }
        >
          <p>Os valores foram atualizados pela loja desde que você montou o carrinho:</p>
          <ul className="mt-1.5 space-y-0.5">
            {priceChanged.map((line) => {
              const change = getPriceChange(line);
              if (!change) return null;
              return (
                <li key={line.id}>
                  <span className="font-medium text-ink">{line.product.title}</span>: de{" "}
                  <span className="line-through">{formatMoney(change.previousUnitPrice)}</span> por{" "}
                  <span className="font-medium text-ink">{formatMoney(line.unitPrice)}</span>
                </li>
              );
            })}
          </ul>
        </Callout>
      ) : null}
    </div>
  );
}
