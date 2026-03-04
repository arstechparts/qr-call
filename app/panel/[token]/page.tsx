import Link from "next/link";

export default function PanelHome({ params }: { params: { token: string } }) {
  const token = params.token;

  return (
    <div>
      <h2 style={{ margin: 0 }}>Panel</h2>
      <p style={{ opacity: 0.7 }}>Token: {token}</p>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Link href={`/panel/${token}/tables`} style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 10, textDecoration: "none" }}>
          Masalar
        </Link>
        <Link href={`/panel/${token}/requests`} style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 10, textDecoration: "none" }}>
          İstekler
        </Link>
      </div>
    </div>
  );
}