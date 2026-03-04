"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = {
  id: string;
  name: string;
  panel_token: string;
};

type TableRow = {
  id: string;
  restaurant_id: string;
  table_number: number;
  table_token: string;
  is_active: boolean;
  created_at: string;
};

export default function TablesPage({ params }: { params: { token: string } }) {
  const token = params.token;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const appUrl = useMemo(() => process.env.NEXT_PUBLIC_APP_URL || "https://qr-call.vercel.app", []);

  async function loadAll() {
    setLoading(true);
    setErrorMsg("");

    // 1) Restaurant'ı panel_token ile bul
    const r = await supabase
      .from("restaurants")
      .select("id,name,panel_token")
      .eq("panel_token", token)
      .maybeSingle();

    if (r.error) {
      setRestaurant(null);
      setRows([]);
      setErrorMsg(r.error.message);
      setLoading(false);
      return;
    }

    if (!r.data) {
      setRestaurant(null);
      setRows([]);
      setErrorMsg("Panel bulunamadı (restaurant yok).");
      setLoading(false);
      return;
    }

    setRestaurant(r.data as Restaurant);

    // 2) Bu restaurant'ın masaları
    const t = await supabase
      .from("restaurant_tables")
      .select("id,restaurant_id,table_number,table_token,is_active,created_at")
      .eq("restaurant_id", r.data.id)
      .order("table_number", { ascending: true });

    if (t.error) {
      setRows([]);
      setErrorMsg(t.error.message);
      setLoading(false);
      return;
    }

    setRows((t.data || []) as TableRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function addNextTable() {
    if (!restaurant) return;

    setAdding(true);
    setErrorMsg("");

    // sıradaki masa numarası = max + 1
    const maxNum = rows.reduce((m, x) => Math.max(m, Number(x.table_number)), 0);
    const next = maxNum + 1;

    const ins = await supabase.from("restaurant_tables").insert({
      restaurant_id: restaurant.id,
      table_number: next,
      is_active: true,
      // table_token DB tarafında default üretmiyorsa hata alırsın.
      // Biz DB'nizde var diye varsayıyorum. Yoksa söyle, ona göre SQL veririm.
    });

    if (ins.error) {
      setErrorMsg(ins.error.message);
      setAdding(false);
      return;
    }

    await loadAll();
    setAdding(false);
  }

  function qrLinkFor(row: TableRow) {
    return `${appUrl}/t/${row.table_token}`;
  }

  return (
    <div>
      <h2 style={{ margin: 0 }}>Masalar</h2>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : errorMsg ? (
        <div style={{ padding: 12, border: "1px solid #f3b4b4", background: "#ffecec", color: "#7a1d1d", borderRadius: 10 }}>
          {errorMsg}
        </div>
      ) : null}

      {restaurant ? (
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          Restoran: <b>{restaurant.name}</b>
        </p>
      ) : null}

      <button
        onClick={addNextTable}
        disabled={!restaurant || adding}
        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer", margin: "10px 0" }}
      >
        {adding ? "Ekleniyor..." : "Sıradaki Masayı Ekle"}
      </button>

      {rows.length === 0 ? (
        <p>Henüz masa yok.</p>
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
              <div style={{ fontSize: 18, fontWeight: 700 }}>Masa {r.table_number}</div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* QR sayfası (panel içinde) */}
                <Link
                  href={`/panel/${token}/tables/${r.id}`}
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  QR Gör
                </Link>

                {/* Direkt müşteri linki */}
                <a
                  href={qrLinkFor(r)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  QR Link
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}