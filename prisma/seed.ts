import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Distância aproximada em km (Haversine) */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SP = { lat: -23.5505, lng: -46.6333 };

type ProviderSeed = {
  name: string;
  type: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  phone: string;
  whatsapp: string;
  specialties: string[];
  plans: {
    operator: string;
    name: string;
    status: string;
    source: string;
    daysAgo?: number;
    sourceUrl?: string;
  }[];
  openToday?: boolean;
  description?: string;
  documentCnpj?: string;
};

/** Mapeia status/fonte legados → modelo de proveniência */
function mapStatus(status: string): string {
  if (status === "unconfirmed") return "listed";
  if (status === "not_accepted") return "reported_not_accepting";
  return status;
}

function mapSource(source: string): string {
  if (source === "user") return "community";
  return source;
}

async function main() {
  console.log("Limpando banco...");
  await prisma.whatsAppClick.deleteMany();
  await prisma.searchEvent.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.commentReport.deleteMany();
  await prisma.profileClaim.deleteMany();
  await prisma.providerExperience.deleteMany();
  await prisma.providerPlanHistory.deleteMany();
  await prisma.crawlerRawResult.deleteMany();
  await prisma.crawlerRun.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.confirmation.deleteMany();
  await prisma.providerPlan.deleteMany();
  await prisma.providerSpecialty.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.userPlan.deleteMany();
  await prisma.healthPlan.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@meuplano.app",
      name: "Ana Silva",
      passwordHash,
      role: "user",
      city: "São Paulo",
      latitude: SP.lat,
      longitude: SP.lng,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@meuplano.app",
      name: "Admin Meu Plano",
      passwordHash: adminHash,
      role: "admin",
      city: "São Paulo",
      latitude: SP.lat,
      longitude: SP.lng,
    },
  });

  const planDefs = [
    { operator: "SulAmérica", name: "Especial 100", category: "Individual" },
    { operator: "SulAmérica", name: "Exato", category: "Empresarial" },
    { operator: "Unimed", name: "Unimed Nacional", category: "Individual" },
    { operator: "Unimed", name: "Unimed Pleno", category: "Familiar" },
    { operator: "Bradesco Saúde", name: "Saúde Top Nacional", category: "Individual" },
    { operator: "Bradesco Saúde", name: "Efetivo", category: "Empresarial" },
    { operator: "Amil", name: "Amil 400", category: "Individual" },
    { operator: "Amil", name: "Amil One", category: "Premium" },
    { operator: "NotreDame Intermédica", name: "Smart 200", category: "Individual" },
    { operator: "Porto Saúde", name: "Porto Bronze", category: "Individual" },
    { operator: "Hapvida", name: "Hapvida Pleno", category: "Familiar" },
  ];

  const plans = [];
  for (const p of planDefs) {
    plans.push(
      await prisma.healthPlan.create({
        data: p,
      })
    );
  }

  const sulamericaEspecial = plans.find(
    (p) => p.operator === "SulAmérica" && p.name === "Especial 100"
  )!;

  await prisma.userPlan.create({
    data: {
      userId: demoUser.id,
      healthPlanId: sulamericaEspecial.id,
      planNumber: "SA-100-88421",
      isActive: true,
    },
  });

  const specialtyDefs = [
    { name: "Dermatologia", slug: "dermatologia", category: "medico", keywords: "dermatologista,pele,acne,manchas" },
    { name: "Cardiologia", slug: "cardiologia", category: "medico", keywords: "cardiologista,coração,pressão" },
    { name: "Pediatria", slug: "pediatria", category: "medico", keywords: "pediatra,criança,infantil" },
    { name: "Ortopedia", slug: "ortopedia", category: "medico", keywords: "ortopedista,osso,joelho,coluna" },
    { name: "Ginecologia", slug: "ginecologia", category: "medico", keywords: "ginecologista,obstetra" },
    { name: "Oftalmologia", slug: "oftalmologia", category: "medico", keywords: "oftalmologista,olho,visão" },
    { name: "Psiquiatria", slug: "psiquiatria", category: "medico", keywords: "psiquiatra,saúde mental" },
    { name: "Fonoaudiologia", slug: "fonoaudiologia", category: "terapia", keywords: "fonoaudiólogo,fono,infantil,fala" },
    { name: "Fisioterapia", slug: "fisioterapia", category: "terapia", keywords: "fisioterapeuta,reabilitação" },
    { name: "Psicologia", slug: "psicologia", category: "terapia", keywords: "psicólogo,terapia" },
    { name: "Ressonância Magnética", slug: "ressonancia", category: "exame", keywords: "ressonância,rm,exame de imagem" },
    { name: "Tomografia", slug: "tomografia", category: "exame", keywords: "tomografia,tc" },
    { name: "Exames Laboratoriais", slug: "exames-lab", category: "laboratorio", keywords: "sangue,hemograma,laboratório,lab" },
    { name: "Pronto Atendimento", slug: "pronto-atendimento", category: "pronto_atendimento", keywords: "urgência,emergência,pa,pronto socorro" },
    { name: "Clínica Geral", slug: "clinica-geral", category: "medico", keywords: "clínico geral,clínico,consulta" },
  ];

  const specialtyMap = new Map<string, string>();
  for (const s of specialtyDefs) {
    const created = await prisma.specialty.create({ data: s });
    specialtyMap.set(s.name, created.id);
  }

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  const providers: ProviderSeed[] = [
    // Demo highlight for SulAmérica + Dermatologista
    {
      name: "Clínica Saúde Mais",
      type: "clinica",
      neighborhood: "Pinheiros",
      address: "Rua dos Pinheiros, 1200 — Pinheiros",
      lat: -23.5672,
      lng: -46.6918,
      rating: 4.8,
      reviewCount: 214,
      phone: "11987651001",
      whatsapp: "5511987651001",
      specialties: ["Dermatologia", "Clínica Geral"],
      documentCnpj: "12.345.678/0001-90",
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 3 },
        { operator: "Unimed", name: "Unimed Nacional", status: "confirmed", source: "operator", daysAgo: 12 },
        { operator: "Amil", name: "Amil 400", status: "listed", source: "operator" },
        { operator: "SulAmérica", name: "Exato", status: "listed", source: "operator", daysAgo: 20 },
      ],
      description: "Clínica multiprofissional com foco em dermatologia e clínica geral. [MOCK]",
    },
    {
      name: "Centro Médico Paulista",
      type: "clinica",
      neighborhood: "Bela Vista",
      address: "Av. Paulista, 1500 — Bela Vista",
      lat: -23.5614,
      lng: -46.6558,
      rating: 4.6,
      reviewCount: 389,
      phone: "11987651002",
      whatsapp: "5511987651002",
      specialties: ["Dermatologia", "Oftalmologia", "Cardiologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "user", daysAgo: 7 },
        { operator: "Bradesco Saúde", name: "Saúde Top Nacional", status: "confirmed", source: "clinic", daysAgo: 5 },
      ],
      description: "Centro médico no coração da Paulista.",
    },
    {
      name: "Clínica Nova Vida",
      type: "clinica",
      neighborhood: "Moema",
      address: "Alameda dos Anapurus, 800 — Moema",
      lat: -23.6015,
      lng: -46.6632,
      rating: 4.3,
      reviewCount: 97,
      phone: "11987651003",
      whatsapp: "5511987651003",
      specialties: ["Dermatologia", "Ginecologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "listed", source: "operator", daysAgo: 60 },
        { operator: "Hapvida", name: "Hapvida Pleno", status: "confirmed", source: "clinic", daysAgo: 20 },
      ],
      description: "Atendimento acolhedor; informação antiga na rede (stale). [MOCK]",
    },
    // Conflito: operadora lista, comunidade nega
    {
      name: "Clínica Conflito Demo",
      type: "clinica",
      neighborhood: "Itaim Bibi",
      address: "Rua João Cachoeira, 500 — Itaim Bibi",
      lat: -23.5842,
      lng: -46.6778,
      rating: 4.1,
      reviewCount: 44,
      phone: "11987651999",
      whatsapp: "5511987651999",
      specialties: ["Dermatologia", "Clínica Geral"],
      plans: [
        {
          operator: "SulAmérica",
          name: "Especial 100",
          status: "conflicting",
          source: "operator",
          daysAgo: 2,
          sourceUrl: "https://mock.meuplano.local/conflito",
        },
      ],
      description: "[MOCK] Oficial na rede + relatos de que não aceita — conflito explícito.",
    },
    // Sem info recente
    {
      name: "Consultório Sem Atualização",
      type: "medico",
      neighborhood: "Paraíso",
      address: "Rua Vergueiro, 1000 — Paraíso",
      lat: -23.5745,
      lng: -46.6412,
      rating: 4.0,
      reviewCount: 12,
      phone: "11987651998",
      whatsapp: "5511987651998",
      specialties: ["Dermatologia"],
      plans: [],
      description: "[MOCK] Sem informação recente de plano.",
    },
    {
      name: "DermaCare Jardins",
      type: "medico",
      neighborhood: "Jardins",
      address: "Rua Augusta, 2100 — Jardins",
      lat: -23.5589,
      lng: -46.6621,
      rating: 4.9,
      reviewCount: 156,
      phone: "11987651004",
      whatsapp: "5511987651004",
      specialties: ["Dermatologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "not_accepted", source: "user", daysAgo: 15 },
        { operator: "Amil", name: "Amil One", status: "confirmed", source: "clinic", daysAgo: 2 },
      ],
    },
    {
      name: "Instituto Pele & Saúde",
      type: "clinica",
      neighborhood: "Vila Madalena",
      address: "Rua Harmonia, 450 — Vila Madalena",
      lat: -23.5531,
      lng: -46.6902,
      rating: 4.5,
      reviewCount: 88,
      phone: "11987651005",
      whatsapp: "5511987651005",
      specialties: ["Dermatologia", "Clínica Geral"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 1 },
        { operator: "Porto Saúde", name: "Porto Bronze", status: "unconfirmed", source: "operator" },
      ],
    },
    // Labs
    {
      name: "Lab Vida Diagnósticos",
      type: "laboratorio",
      neighborhood: "Consolação",
      address: "Rua da Consolação, 1900 — Consolação",
      lat: -23.5512,
      lng: -46.6589,
      rating: 4.4,
      reviewCount: 502,
      phone: "11987652001",
      whatsapp: "5511987652001",
      specialties: ["Exames Laboratoriais", "Ressonância Magnética"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "operator", daysAgo: 4 },
        { operator: "Unimed", name: "Unimed Nacional", status: "confirmed", source: "operator", daysAgo: 8 },
      ],
    },
    {
      name: "Diagnóstico Rápido SP",
      type: "laboratorio",
      neighborhood: "Tatuapé",
      address: "Rua Serra de Bragança, 300 — Tatuapé",
      lat: -23.5401,
      lng: -46.5752,
      rating: 4.2,
      reviewCount: 210,
      phone: "11987652002",
      whatsapp: "5511987652002",
      specialties: ["Exames Laboratoriais", "Tomografia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "unconfirmed", source: "operator" },
        { operator: "Bradesco Saúde", name: "Efetivo", status: "confirmed", source: "clinic", daysAgo: 10 },
      ],
    },
    {
      name: "Centro de Imagem Aurora",
      type: "laboratorio",
      neighborhood: "Brooklin",
      address: "Av. Eng. Luís Carlos Berrini, 800 — Brooklin",
      lat: -23.6102,
      lng: -46.6945,
      rating: 4.7,
      reviewCount: 178,
      phone: "11987652003",
      whatsapp: "5511987652003",
      specialties: ["Ressonância Magnética", "Tomografia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 6 },
        { operator: "Amil", name: "Amil 400", status: "confirmed", source: "operator", daysAgo: 14 },
      ],
    },
    {
      name: "Lab Exame Certo",
      type: "laboratorio",
      neighborhood: "Santana",
      address: "Av. Braz Leme, 1200 — Santana",
      lat: -23.5089,
      lng: -46.6291,
      rating: 4.1,
      reviewCount: 95,
      phone: "11987652004",
      whatsapp: "5511987652004",
      specialties: ["Exames Laboratoriais"],
      plans: [
        { operator: "Hapvida", name: "Hapvida Pleno", status: "confirmed", source: "clinic", daysAgo: 9 },
        { operator: "SulAmérica", name: "Especial 100", status: "not_accepted", source: "user", daysAgo: 30 },
      ],
    },
    {
      name: "BioLab Perdizes",
      type: "laboratorio",
      neighborhood: "Perdizes",
      address: "Rua Cardoso de Almeida, 700 — Perdizes",
      lat: -23.5368,
      lng: -46.6734,
      rating: 4.6,
      reviewCount: 143,
      phone: "11987652005",
      whatsapp: "5511987652005",
      specialties: ["Exames Laboratoriais", "Ressonância Magnética"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "user", daysAgo: 2 },
        { operator: "NotreDame Intermédica", name: "Smart 200", status: "unconfirmed", source: "operator" },
      ],
    },
    // Hospitals / ER
    {
      name: "Hospital Horizonte Verde",
      type: "hospital",
      neighborhood: "Ipiranga",
      address: "Rua Silva Bueno, 1500 — Ipiranga",
      lat: -23.5881,
      lng: -46.6098,
      rating: 4.5,
      reviewCount: 890,
      phone: "11987653001",
      whatsapp: "5511987653001",
      specialties: ["Pronto Atendimento", "Cardiologia", "Ortopedia", "Clínica Geral"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "operator", daysAgo: 5 },
        { operator: "Unimed", name: "Unimed Pleno", status: "confirmed", source: "operator", daysAgo: 11 },
      ],
      openToday: true,
    },
    {
      name: "Hospital Santa Clara Demo",
      type: "hospital",
      neighborhood: "Liberdade",
      address: "Rua Galvão Bueno, 400 — Liberdade",
      lat: -23.5598,
      lng: -46.6345,
      rating: 4.3,
      reviewCount: 620,
      phone: "11987653002",
      whatsapp: "5511987653002",
      specialties: ["Pronto Atendimento", "Pediatria", "Ginecologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "unconfirmed", source: "operator" },
        { operator: "Bradesco Saúde", name: "Saúde Top Nacional", status: "confirmed", source: "clinic", daysAgo: 3 },
      ],
    },
    {
      name: "Pronto Atendimento Norte Vida",
      type: "pronto_atendimento",
      neighborhood: "Tucuruvi",
      address: "Av. Tucuruvi, 500 — Tucuruvi",
      lat: -23.4802,
      lng: -46.6031,
      rating: 4.0,
      reviewCount: 301,
      phone: "11987653003",
      whatsapp: "5511987653003",
      specialties: ["Pronto Atendimento", "Clínica Geral"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 8 },
        { operator: "Hapvida", name: "Hapvida Pleno", status: "confirmed", source: "operator", daysAgo: 16 },
      ],
      openToday: true,
    },
    {
      name: "Hospital Metro Saúde",
      type: "hospital",
      neighborhood: "Barra Funda",
      address: "Av. Marquês de São Vicente, 200 — Barra Funda",
      lat: -23.5256,
      lng: -46.6678,
      rating: 4.4,
      reviewCount: 455,
      phone: "11987653004",
      whatsapp: "5511987653004",
      specialties: ["Pronto Atendimento", "Ortopedia", "Cardiologia"],
      plans: [
        { operator: "Amil", name: "Amil 400", status: "confirmed", source: "operator", daysAgo: 7 },
        { operator: "SulAmérica", name: "Especial 100", status: "not_accepted", source: "user", daysAgo: 22 },
      ],
    },
    {
      name: "UPA Demo Leste",
      type: "pronto_atendimento",
      neighborhood: "Penha",
      address: "Rua Dr. João Ribeiro, 100 — Penha",
      lat: -23.5221,
      lng: -46.5428,
      rating: 3.9,
      reviewCount: 188,
      phone: "11987653005",
      whatsapp: "5511987653005",
      specialties: ["Pronto Atendimento"],
      plans: [
        { operator: "NotreDame Intermédica", name: "Smart 200", status: "confirmed", source: "operator", daysAgo: 4 },
        { operator: "SulAmérica", name: "Especial 100", status: "unconfirmed", source: "operator" },
      ],
      openToday: true,
    },
    // More doctors / clinics / therapies
    {
      name: "CardioCentro Vila Mariana",
      type: "clinica",
      neighborhood: "Vila Mariana",
      address: "Rua Domingos de Morais, 1500 — Vila Mariana",
      lat: -23.5891,
      lng: -46.6342,
      rating: 4.7,
      reviewCount: 267,
      phone: "11987654001",
      whatsapp: "5511987654001",
      specialties: ["Cardiologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 0 },
        { operator: "Unimed", name: "Unimed Nacional", status: "confirmed", source: "user", daysAgo: 9 },
      ],
    },
    {
      name: "Dr. Pedro Orto Clinic",
      type: "medico",
      neighborhood: "Mooca",
      address: "Rua da Mooca, 2200 — Mooca",
      lat: -23.5582,
      lng: -46.5981,
      rating: 4.4,
      reviewCount: 112,
      phone: "11987654002",
      whatsapp: "5511987654002",
      specialties: ["Ortopedia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "user", daysAgo: 11 },
        { operator: "Porto Saúde", name: "Porto Bronze", status: "unconfirmed", source: "operator" },
      ],
    },
    {
      name: "PediaKids Saúde",
      type: "clinica",
      neighborhood: "Campo Belo",
      address: "Av. Santo Amaro, 4500 — Campo Belo",
      lat: -23.6189,
      lng: -46.6721,
      rating: 4.8,
      reviewCount: 340,
      phone: "11987654003",
      whatsapp: "5511987654003",
      specialties: ["Pediatria", "Fonoaudiologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 4 },
        { operator: "Bradesco Saúde", name: "Saúde Top Nacional", status: "confirmed", source: "clinic", daysAgo: 6 },
      ],
    },
    {
      name: "Fono Infantil Estrela",
      type: "terapia",
      neighborhood: "Alto de Pinheiros",
      address: "Rua Pedroso Alvarenga, 600 — Alto de Pinheiros",
      lat: -23.5618,
      lng: -46.7102,
      rating: 4.9,
      reviewCount: 76,
      phone: "11987654004",
      whatsapp: "5511987654004",
      specialties: ["Fonoaudiologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "unconfirmed", source: "operator" },
        { operator: "Amil", name: "Amil 400", status: "confirmed", source: "clinic", daysAgo: 13 },
      ],
    },
    {
      name: "FisioMovimento Centro",
      type: "terapia",
      neighborhood: "República",
      address: "Av. São João, 300 — República",
      lat: -23.5432,
      lng: -46.6401,
      rating: 4.3,
      reviewCount: 134,
      phone: "11987654005",
      whatsapp: "5511987654005",
      specialties: ["Fisioterapia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "user", daysAgo: 18 },
        { operator: "Unimed", name: "Unimed Pleno", status: "confirmed", source: "operator", daysAgo: 20 },
      ],
    },
    {
      name: "Olhar Claro Oftalmologia",
      type: "clinica",
      neighborhood: "Higienópolis",
      address: "Rua Piauí, 400 — Higienópolis",
      lat: -23.5445,
      lng: -46.6578,
      rating: 4.6,
      reviewCount: 201,
      phone: "11987654006",
      whatsapp: "5511987654006",
      specialties: ["Oftalmologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 2 },
        { operator: "NotreDame Intermédica", name: "Smart 200", status: "not_accepted", source: "user", daysAgo: 40 },
      ],
    },
    {
      name: "Mente Serene Psicologia",
      type: "terapia",
      neighborhood: "Vila Olímpia",
      address: "Rua Funchal, 500 — Vila Olímpia",
      lat: -23.5956,
      lng: -46.6867,
      rating: 4.8,
      reviewCount: 92,
      phone: "11987654007",
      whatsapp: "5511987654007",
      specialties: ["Psicologia", "Psiquiatria"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 9 },
        { operator: "Amil", name: "Amil One", status: "unconfirmed", source: "operator" },
      ],
    },
    {
      name: "GinecoVida Mulher",
      type: "clinica",
      neighborhood: "Jardim Paulista",
      address: "Alameda Santos, 1800 — Jardim Paulista",
      lat: -23.5689,
      lng: -46.6543,
      rating: 4.7,
      reviewCount: 255,
      phone: "11987654008",
      whatsapp: "5511987654008",
      specialties: ["Ginecologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "unconfirmed", source: "operator" },
        { operator: "Bradesco Saúde", name: "Saúde Top Nacional", status: "confirmed", source: "clinic", daysAgo: 1 },
      ],
    },
    {
      name: "Clínica Bem-Estar Lapa",
      type: "clinica",
      neighborhood: "Lapa",
      address: "Rua Clélia, 900 — Lapa",
      lat: -23.5228,
      lng: -46.7021,
      rating: 4.2,
      reviewCount: 67,
      phone: "11987654009",
      whatsapp: "5511987654009",
      specialties: ["Clínica Geral", "Dermatologia", "Cardiologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "operator", daysAgo: 14 },
        { operator: "Hapvida", name: "Hapvida Pleno", status: "confirmed", source: "clinic", daysAgo: 7 },
      ],
    },
    {
      name: "OrthoSpine Especialidades",
      type: "clinica",
      neighborhood: "Morumbi",
      address: "Av. Giovanni Gronchi, 5000 — Morumbi",
      lat: -23.6123,
      lng: -46.7256,
      rating: 4.5,
      reviewCount: 189,
      phone: "11987654010",
      whatsapp: "5511987654010",
      specialties: ["Ortopedia", "Fisioterapia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 5 },
        { operator: "Porto Saúde", name: "Porto Bronze", status: "confirmed", source: "user", daysAgo: 12 },
      ],
    },
    {
      name: "Hospital Cidade Clara",
      type: "hospital",
      neighborhood: "Santo Amaro",
      address: "Av. Santo Amaro, 6000 — Santo Amaro",
      lat: -23.6489,
      lng: -46.7102,
      rating: 4.4,
      reviewCount: 710,
      phone: "11987653006",
      whatsapp: "5511987653006",
      specialties: ["Pronto Atendimento", "Cardiologia", "Pediatria", "Clínica Geral"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "operator", daysAgo: 3 },
        { operator: "Unimed", name: "Unimed Nacional", status: "confirmed", source: "operator", daysAgo: 6 },
      ],
      openToday: true,
    },
    {
      name: "Lab Precisão Butantã",
      type: "laboratorio",
      neighborhood: "Butantã",
      address: "Av. Prof. Luciano Gualberto, 300 — Butantã",
      lat: -23.5612,
      lng: -46.7218,
      rating: 4.3,
      reviewCount: 120,
      phone: "11987652006",
      whatsapp: "5511987652006",
      specialties: ["Exames Laboratoriais", "Tomografia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "clinic", daysAgo: 10 },
        { operator: "Amil", name: "Amil 400", status: "unconfirmed", source: "operator" },
      ],
    },
    {
      name: "Terapia Fala & Voz",
      type: "terapia",
      neighborhood: "Água Branca",
      address: "Av. Pacaembu, 1400 — Água Branca",
      lat: -23.5312,
      lng: -46.6689,
      rating: 4.6,
      reviewCount: 54,
      phone: "11987654011",
      whatsapp: "5511987654011",
      specialties: ["Fonoaudiologia"],
      plans: [
        { operator: "SulAmérica", name: "Especial 100", status: "confirmed", source: "user", daysAgo: 0 },
        { operator: "Bradesco Saúde", name: "Efetivo", status: "confirmed", source: "clinic", daysAgo: 15 },
      ],
    },
  ];

  console.log(`Criando ${providers.length} provedores...`);

  for (const p of providers) {
    const hours = {
      seg: "08:00–18:00",
      ter: "08:00–18:00",
      qua: "08:00–18:00",
      qui: "08:00–18:00",
      sex: "08:00–17:00",
      sab: p.type === "laboratorio" || p.type === "pronto_atendimento" ? "08:00–12:00" : "Fechado",
      dom: p.type === "pronto_atendimento" || p.type === "hospital" ? "24h" : "Fechado",
    };

    const provider = await prisma.provider.create({
      data: {
        name: p.name,
        type: p.type,
        description: p.description ?? `${p.name} — atendimento fictício para demonstração do Meu Plano.`,
        photoUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(p.name)}`,
        phone: p.phone,
        whatsapp: p.whatsapp,
        documentCnpj: p.documentCnpj ?? null,
        address: p.address,
        neighborhood: p.neighborhood,
        city: "São Paulo",
        state: "SP",
        cep: "01000-000",
        latitude: p.lat,
        longitude: p.lng,
        rating: p.rating,
        reviewCount: p.reviewCount,
        hoursJson: JSON.stringify(hours),
        openToday: p.openToday ?? true,
      },
    });

    for (const sn of p.specialties) {
      const sid = specialtyMap.get(sn);
      if (!sid) continue;
      await prisma.providerSpecialty.create({
        data: { providerId: provider.id, specialtyId: sid },
      });
    }

    for (const pl of p.plans) {
      const plan = plans.find((x) => x.operator === pl.operator && x.name === pl.name);
      if (!plan) continue;
      const status = mapStatus(pl.status);
      const sourceType = mapSource(pl.source);
      const checked =
        pl.daysAgo !== undefined
          ? daysAgo(pl.daysAgo)
          : status === "confirmed"
            ? daysAgo(7)
            : null;
      await prisma.providerPlan.create({
        data: {
          providerId: provider.id,
          healthPlanId: plan.id,
          status,
          source: pl.source,
          sourceType,
          sourceUrl: pl.sourceUrl ?? null,
          sourceName:
            sourceType === "operator"
              ? "Rede mock da operadora"
              : sourceType === "clinic"
                ? "Confirmação da clínica"
                : sourceType === "community"
                  ? "Relato da comunidade"
                  : "Admin",
          confidence:
            status === "confirmed" ? 0.85 : status === "listed" ? 0.65 : 0.45,
          lastCheckedAt: checked,
          lastVerifiedAt: status === "confirmed" ? checked : null,
        },
      });
      await prisma.providerPlanHistory.create({
        data: {
          providerId: provider.id,
          healthPlanId: plan.id,
          previousStatus: null,
          newStatus: status,
          sourceType,
          sourceUrl: pl.sourceUrl ?? null,
          observedAt: checked ?? new Date(),
          note: "Seed inicial [MOCK]",
        },
      });
    }
  }

  // Sample confirmation + experiência from demo user
  const saudeMais = await prisma.provider.findFirst({ where: { name: "Clínica Saúde Mais" } });
  const derm = specialtyMap.get("Dermatologia");
  if (saudeMais) {
    await prisma.confirmation.create({
      data: {
        userId: demoUser.id,
        providerId: saudeMais.id,
        healthPlanId: sulamericaEspecial.id,
        answer: "yes",
        createdAt: daysAgo(3),
      },
    });
    await prisma.providerExperience.create({
      data: {
        userId: demoUser.id,
        providerId: saudeMais.id,
        healthPlanId: sulamericaEspecial.id,
        specialtyId: derm,
        accepted: true,
        experienceDate: daysAgo(3),
        comment: "Atendimento ok com Especial 100 na dermatologia. [MOCK]",
        createdAt: daysAgo(3),
      },
    });
    await prisma.favorite.create({
      data: { userId: demoUser.id, providerId: saudeMais.id },
    });
  }

  // Comunidade negando no conflito demo (oficial vs comunidade)
  const conflito = await prisma.provider.findFirst({ where: { name: "Clínica Conflito Demo" } });
  if (conflito) {
    await prisma.providerExperience.create({
      data: {
        userId: demoUser.id,
        providerId: conflito.id,
        healthPlanId: sulamericaEspecial.id,
        specialtyId: derm,
        accepted: false,
        experienceDate: daysAgo(1),
        comment: "Fui e disseram que não aceitam mais Especial 100. [MOCK]",
        createdAt: daysAgo(1),
      },
    });
    await prisma.providerPlanHistory.create({
      data: {
        providerId: conflito.id,
        healthPlanId: sulamericaEspecial.id,
        previousStatus: "listed",
        newStatus: "conflicting",
        sourceType: "community",
        observedAt: daysAgo(1),
        note: "Conflito: operadora lista vs comunidade nega [MOCK]",
      },
    });
  }

  // Oficial + negando (DermaCare)
  const dermaCare = await prisma.provider.findFirst({ where: { name: "DermaCare Jardins" } });
  if (dermaCare) {
    await prisma.providerExperience.create({
      data: {
        userId: demoUser.id,
        providerId: dermaCare.id,
        healthPlanId: sulamericaEspecial.id,
        accepted: false,
        experienceDate: daysAgo(15),
        comment: "Não aceitaram o plano. [MOCK]",
        createdAt: daysAgo(15),
      },
    });
  }

  console.log("Seed concluído!");
  console.log("Usuário demo: demo@meuplano.app / demo123");
  console.log("Admin: admin@meuplano.app / admin123");
  console.log(`Provedores: ${providers.length}`);
  console.log(`Especialidades: ${specialtyDefs.length}`);
  void haversineKm;
  void adminUser;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
