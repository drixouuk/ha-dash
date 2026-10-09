import { Bell } from "lucide-react";
import { useEnt } from "@data";
import { CITY, E } from "@config";
import { clock, fmtDuration, useNow } from "../util";
import { usePrayers } from "../ui/prayer";
import { SunArc } from "../ui/SunArc";

export default function Prayers() {
  const now = useNow(15_000);
  const { rows, next, nextAt } = usePrayers(now);
  const month = useEnt(E.islamicMonth);
  return (
    <>
      <header className="head-page">
        <div><div className="eyebrow">{CITY}{month?.ok ? ` · ${month.state}` : ""}</div><h1 className="h1">Heures de prière</h1></div>
        {nextAt && <span className="badge warn" style={{ fontSize: 14, padding: "8px 14px" }}><Bell /> {next?.label} dans {fmtDuration(nextAt.getTime() - now.getTime())}</span>}
      </header>
      <section className="card hero"><div style={{ maxWidth: 760, margin: "0 auto" }}><SunArc rows={rows} now={now} nextKey={next?.key} /></div></section>
      <section className="card section" style={{ padding: "8px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 28px", alignItems: "center" }}>
          <span className="eyebrow" style={{ padding: "10px 0" }}>Prière</span><span className="eyebrow" style={{ textAlign: "right" }}>Adhan</span><span className="eyebrow" style={{ textAlign: "right" }}>Iqama</span>
          {rows.map((r) => {
            const isNext = r.key === next?.key;
            const past = r.time && r.time.getTime() <= now.getTime() && !isNext;
            const st = { padding: "15px 0", borderTop: "1px solid var(--line)", opacity: past ? 0.8 : 1 };
            return (
              <div key={r.key} style={{ display: "contents" }}>
                <span style={{ ...st, fontWeight: 700, color: isNext ? "var(--brass)" : undefined }}>{r.label}{isNext && <span className="badge warn" style={{ marginLeft: 10 }}>Prochaine</span>}</span>
                <span className="num" style={{ ...st, fontSize: 24, textAlign: "right" }}>{clock(r.time)}</span>
                <span className="num sub" style={{ ...st, fontSize: 20, textAlign: "right" }}>{r.iqamah ? clock(r.iqamah) : "—"}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
