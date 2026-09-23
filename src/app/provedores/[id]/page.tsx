"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  Clock,
} from "lucide-react";
import {
  cn,
  formatRelativeDays,
  providerTypeLabel,
  sourceLabel,
  statusBadge,
} from "@/lib/utils";

const ProvidersMap = dynamic(
  () => import("@/components/map/providers-map").then((m) => m.ProvidersMap),
  { ssr: false }
);

type ProviderDetail = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  photoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string;
  neighborhood: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  hours: Record<string, string>;
  specialties: { id: string; name: string }[];
  plans: {
    status: string;
    source: string;
    lastVerifiedAt: string | null;
    healthPlan: { operator: string; name: string };
  }[];
  userPlanStatus: string | null;
  userPlanSource: string | null;
  userPlanVerifiedAt: string | null;
  favorited: boolean;
  confirmations: {
    answer: string;
    createdAt: string;
    healthPlan: { operator: string; name: string };
    user: { name: string };
  }[];
};

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showPostVisit, setShowPostVisit] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/providers/${id}`);
    if (!res.ok) {
      setProvider(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProvider(data.provider);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleFavorite() {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id }),
    });
    if (res.status === 401) {
      router.push("/entrar");
      return;
    }
    const data = await res.json();
    setProvider((p) => (p ? { ...p, favorited: data.favorited } : p));
    setToast(data.favorited ? "Adicionado aos favoritos." : "Removido dos favoritos.");
  }

  async function requestConfirm() {
    const res = await fetch("/api/verification-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id }),
    });
    const data = await res.json();
    setToast(data.message || data.error);
  }

  async function confirm(answer: "yes" | "no" | "unknown") {
    const res = await fetch("/api/confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id, answer }),
    });
    const data = await res.json();
    setToast(data.message || data.error);
    setShowPostVisit(false);
    if (res.ok) void load();
  }

  async function openWhatsApp() {
    if (!provider?.whatsapp) return;
    await fetch("/api/whatsapp-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: id }),
    });
    const text = encodeURIComponent(
      `Olá! Encontrei ${provider.name} no Meu Plano e gostaria de agendar um atendimento.`
    );
    window.open(`https://wa.me/${provider.whatsapp}?text=${text}`, "_blank");
    setTimeout(() => setShowPostVisit(true), 1200);
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Carregando detalhes…</div>;
  }

  if (!provider) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-700">Provedor não encontrado.</p>
        <Link href="/buscar" className="mt-2 inline-block text-sm text-brand-700 underline">
          Voltar à busca
        </Link>
      </div>
    );
  }

  const badge = statusBadge(provider.userPlanStatus ?? "unconfirmed");
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`;

  return (
    <main className="pb-10">
      <div className="relative h-44 bg-gradient-to-br from-brand-600 to-emerald-500 md:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={provider.photoUrl || ""}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full bg-white/90 p-2 shadow"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            className="rounded-full bg-white/90 p-2 shadow"
            aria-label="Favoritar"
          >
            <Heart
              className={cn(
                "h-5 w-5",
                provider.favorited ? "fill-rose-500 text-rose-500" : "text-slate-700"
              )}
            />
          </button>
        </div>
      </div>

      <div className="-mt-8 space-y-4 px-4 md:px-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {providerTypeLabel(provider.type)}
              </p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900">{provider.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {provider.specialties.map((s) => s.name).join(" · ")}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                badge.className
              )}
            >
              {badge.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {provider.rating.toFixed(1)} ({provider.reviewCount})
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-brand-500" />
              {provider.neighborhood}, {provider.city}
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {provider.userPlanStatus === "confirmed"
              ? `${formatRelativeDays(provider.userPlanVerifiedAt)} · ${sourceLabel(provider.userPlanSource ?? "operator")}`
              : provider.userPlanStatus === "not_accepted"
                ? "Usuários reportaram que este local não aceita seu plano."
                : "Ainda sem confirmação recente para o seu plano."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void openWhatsApp()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Agendar pelo WhatsApp
            </button>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-3 text-sm font-semibold text-brand-800"
            >
              <Navigation className="h-4 w-4" />
              Traçar rota
            </a>
          </div>

          {provider.userPlanStatus === "unconfirmed" && (
            <button
              type="button"
              onClick={() => void requestConfirm()}
              className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-sm font-medium text-amber-900"
            >
              Pedir confirmação
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Endereço e contato</h2>
          <p className="mt-2 text-sm text-slate-700">{provider.address}</p>
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"
            >
              <Phone className="h-4 w-4" />
              {provider.phone}
            </a>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4" /> Horários
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(provider.hours).map(([day, hours]) => (
              <div key={day} className="flex justify-between gap-2 border-b border-slate-50 py-1">
                <dt className="capitalize text-slate-500">{day}</dt>
                <dd className="font-medium text-slate-800">{hours}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Planos neste local</h2>
          <ul className="mt-2 space-y-2">
            {provider.plans.map((p, i) => {
              const b = statusBadge(p.status);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    {p.healthPlan.operator} {p.healthPlan.name}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", b.className)}>
                    {b.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Mapa</h2>
          <ProvidersMap
            providers={[
              {
                id: provider.id,
                name: provider.name,
                rating: provider.rating,
                planStatus: provider.userPlanStatus,
                latitude: provider.latitude,
                longitude: provider.longitude,
                specialties: provider.specialties.map((s) => s.name),
              },
            ]}
          />
        </section>

        {provider.description && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
            {provider.description}
          </section>
        )}

        <button
          type="button"
          onClick={() => setShowPostVisit(true)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700"
        >
          Já fui? Contar se ainda aceita meu plano
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto max-w-lg px-4">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            {toast}
            <button className="ml-2 underline" onClick={() => setToast(null)}>
              Ok
            </button>
          </div>
        </div>
      )}

      {showPostVisit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Essa clínica ainda aceita seu plano?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Sua resposta ajuda outras pessoas com o mesmo plano.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => void confirm("yes")}
                className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => void confirm("no")}
                className="rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => void confirm("unknown")}
                className="rounded-xl border border-slate-200 py-3 text-sm font-medium"
              >
                Não sei
              </button>
              <button
                type="button"
                onClick={() => setShowPostVisit(false)}
                className="py-2 text-sm text-slate-500"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
