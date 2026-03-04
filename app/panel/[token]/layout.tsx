import Link from "next/link";

export default function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { token: string };
}) {
  const token = params.token;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Link href={`/panel/${token}`} style={{ textDecoration: "none" }}>
          Panel
        </Link>
        <Link href={`/panel/${token}/tables`} style={{ textDecoration: "none" }}>
          Masalar
        </Link>
        <Link href={`/panel/${token}/requests`} style={{ textDecoration: "none" }}>
          İstekler
        </Link>
      </div>
      {children}
    </div>
  );
}