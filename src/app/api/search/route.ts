import { NextRequest, NextResponse } from "next/server";
import { runProviderSearch } from "@/lib/search";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const data = await runProviderSearch({
    q: sp.get("q") ?? "",
    type: sp.get("type") ?? "",
    specialty: sp.get("specialty") ?? "",
    distance: sp.get("distance") || "25",
    acceptsPlan: sp.get("acceptsPlan") ?? undefined,
    recentConfirm: sp.get("recentConfirm") ?? undefined,
    openToday: sp.get("openToday") ?? undefined,
    minRating: sp.get("minRating") || "0",
    includeUnconfirmed: sp.get("includeUnconfirmed") ?? undefined,
    includeNotAccepted: sp.get("includeNotAccepted") ?? undefined,
    locationMode: sp.get("locationMode") ?? "default",
    lat: sp.get("lat") ?? undefined,
    lng: sp.get("lng") ?? undefined,
    place: sp.get("place") ?? "",
  });
  return NextResponse.json(data);
}
