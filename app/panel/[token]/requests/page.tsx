"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = { id: string; name: string; panel_token: string };

type ReqRow = {
  id: string;
  restaurant_id: string;
  table_number: number;
  request_type: string;
  status: string;
  created_at: string;
};

function trTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestTypeLabel(x: string) {
  if (x === "waiter") return "Garson";
  if (x === "bill") return "Hesap";
  if (x === "menu") return "Menü";
  return x;
}

export default function RequestsPage({ params }: { params: { token: string } }) {
  const token = params.token;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const dingUrl = useMemo(() => "/ding.wav", []);

  async function loadRestaurant() {
    const r = await supabase
      .from("restaurants")
      .select("id,name,panel_token")
      .eq("panel_token", token)
      .maybeSingle();

    if (r.error) {
      setRestaurant(null);
      setErrorMsg(r.error.message);
      return null;
    }
    if (!r.data) {
      setRestaurant(null);
      setErrorMsg("Panel bulunamadı (restaurant yok).");
      return null;
    }
    setRestaurant(r.data as Restaurant);
    return r.data as Restaurant;
  }

  async function loadRequests(restId: string) {
    const q = await supabase
      .from("requests")
      .select("id,restaurant_id,table_number,request_type,status,created_at")
      .eq("restaurant_id", restId)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (q.error) {
      setRows([]);
      setErrorMsg(q.error.message);
      return;
    }
    setRows((q.data || []) as ReqRow[]);
  }

  async function init() {
    setLoading(true);
    setErrorMsg("");
    const r = await loadRestaurant();
    if (r) await loadRequests(r.id);
    setLoading(false);
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // realtime + ses
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel("requests-realtime-" + restaurant.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "requests", filter: `restaurant_id=eq.${restaurant.id}` },
        async () => {
          // yeni istek geldi
          await loadRequests(restaurant.id);

          // ses
          try {
            const audio = new Audio(dingUrl);
            audio.volume = 1;
            await audio.play();
          } catch {
            // iOS/autoplay bloklayabilir; panelde "Sesi Aç" butonu eklemek istersen sonra ekleriz.
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, dingUrl]);

  async function complete(id: string) {
    await supabase.from("requests").update({ status: "completed" }).eq("id", id);
    if (restaurant?.id) await loadRequests(restaurant.id);
  }

  return (
    <div>
      <h2 style={{ margin: 0 }}>İstekler</h2>

      {loading ? <p>Yükleniyor...</p> : null}

      {errorMsg ? (
        <div style={{ padding: 12, border: "1px solid #f3b4b4", background: "#ffecec", color: "#7a1d1d", borderRadius: 10 }}>
          {errorMsg}
        </div>
      ) : null}

      {restaurant ? (
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          Restoran: <b>{restaurant.name}</b>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p>Aktif istek yok.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>Masa {r.table_number}</div>
                <div style={{ opacity: 0.75 }}>
                  Tip: {requestTypeLabel(r.request_type)} • {trTime(r.created_at)}
                </div>
              </div>

              <button
                onClick={() => complete(r.id)}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
              >
                Tamamlandı
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}