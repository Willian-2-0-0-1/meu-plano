import { UNIMED_CAMPINAS } from "./types";

type CookieJar = Map<string, string>;

function parseSetCookie(header: string | null, jar: CookieJar) {
  if (!header) return;
  // undici/fetch may join multiple Set-Cookie; handle common single cases
  for (const part of header.split(/,(?=\s*[^;=]+=[^;]+)/)) {
    const pair = part.split(";")[0]?.trim();
    if (!pair || !pair.includes("=")) continue;
    const eq = pair.indexOf("=");
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export class UnimedCampinasClient {
  private jar: CookieJar = new Map();
  private token: string | null = null;

  constructor(private readonly baseUrl = UNIMED_CAMPINAS.baseUrl) {}

  private headers(extra: Record<string, string> = {}): HeadersInit {
    return {
      "User-Agent": UNIMED_CAMPINAS.userAgent,
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      Referer: `${this.baseUrl}${UNIMED_CAMPINAS.guiaPath}`,
      ...(this.jar.size ? { Cookie: cookieHeader(this.jar) } : {}),
      ...extra,
    };
  }

  private absorbCookies(res: Response) {
    const getSetCookie = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getSetCookie === "function") {
      for (const c of getSetCookie.call(res.headers)) {
        parseSetCookie(c, this.jar);
      }
    } else {
      parseSetCookie(res.headers.get("set-cookie"), this.jar);
    }
  }

  async warmSession(): Promise<void> {
    const res = await fetch(`${this.baseUrl}${UNIMED_CAMPINAS.guiaPath}`, {
      headers: this.headers(),
      redirect: "follow",
    });
    this.absorbCookies(res);
    const html = await res.text();
    const m = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
    this.token = m?.[1] ?? null;
    if (!this.token) {
      throw new Error("Unimed Campinas: token antiforgery não encontrado (página pública mudou?)");
    }
  }

  async listSpecialties(tipoServico = UNIMED_CAMPINAS.defaults.serviceType): Promise<
    Array<{ IdEspecialidade: number; NomeEspecialidade: string }>
  > {
    if (!this.token) await this.warmSession();
    const url = `${this.baseUrl}${UNIMED_CAMPINAS.guiaPath}?handler=Especialidades`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers({
        "Content-Type": "application/json; charset=utf-8",
        RequestVerificationToken: this.token!,
      }),
      body: JSON.stringify({ TipoServico: tipoServico }),
    });
    this.absorbCookies(res);
    if (!res.ok) {
      throw new Error(`Unimed Campinas especialidades HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      Error?: { Message?: string } | null;
      Attachment?: Array<{ IdEspecialidade: number; NomeEspecialidade: string }>;
    };
    if (json.Error?.Message) throw new Error(json.Error.Message);
    return json.Attachment ?? [];
  }

  /**
   * Busca resultado HTML do guia médico público.
   * Não exige login/carteirinha — usa filtros de plano/cidade/especialidade.
   */
  async searchResultsHtml(params: {
    tipoServico?: string;
    especialidadeId: string;
    cidadeId: string;
    planoId?: string;
    tipo?: string;
  }): Promise<{ html: string; finalUrl: string; httpStatus: number; request: Record<string, unknown> }> {
    if (!this.token) await this.warmSession();

    const request = {
      tiposervico: params.tipoServico ?? UNIMED_CAMPINAS.defaults.serviceType,
      especialidade: params.especialidadeId,
      cidade: params.cidadeId,
      plano: params.planoId ?? "0",
      tipo: params.tipo ?? "unimed",
    };

    const qs = new URLSearchParams(request as Record<string, string>);
    const url = `${this.baseUrl}${UNIMED_CAMPINAS.guiaPath}/resultado?${qs.toString()}`;

    // Delay educado
    await new Promise((r) => setTimeout(r, 400));

    const res = await fetch(url, {
      headers: this.headers({ Accept: "text/html" }),
      redirect: "follow",
    });
    this.absorbCookies(res);
    const html = await res.text();
    return {
      html,
      finalUrl: res.url || url,
      httpStatus: res.status,
      request,
    };
  }
}
