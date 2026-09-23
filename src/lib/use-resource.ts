"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toGatewayError, type GatewayError } from "@/data";

export type Resource<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "error"; data: undefined; error: GatewayError }
  | { status: "ready"; data: T; error: undefined };

const LOADING = { status: "loading", data: undefined, error: undefined } as const;

/**
 * Carrega um recurso assíncrono da camada de dados com estados explícitos de
 * carregamento e erro. `key` identifica o recurso: quando muda, recarrega.
 * `setData` permite refletir o resultado de uma mutação sem nova consulta.
 */
export function useResource<T>(key: string, loader: () => Promise<T>) {
  const [state, setState] = useState<Resource<T>>(LOADING);
  const [round, setRound] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    loaderRef.current().then(
      (data) => {
        if (active) setState({ status: "ready", data, error: undefined });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", data: undefined, error: toGatewayError(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [key, round]);

  const reload = useCallback(() => {
    setState(LOADING);
    setRound((r) => r + 1);
  }, []);

  const setData = useCallback((data: T) => setState({ status: "ready", data, error: undefined }), []);

  return { ...state, reload, setData } as Resource<T> & { reload: () => void; setData: (data: T) => void };
}
