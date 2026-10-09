import { ArrowDown, ArrowUp } from "lucide-react";
import { useCall } from "@data";
import { COVERS, ROOMS } from "@config";
import { Shutter } from "../ui/Shutter";

export default function Shutters() {
  const call = useCall();
  const ids = COVERS.map((c) => c.id);
  return (
    <>
      <header className="head-page">
        <div><div className="eyebrow">Glissez sur la fenêtre pour régler</div><h1 className="h1">Volets</h1></div>
        <div className="row" style={{ gap: 8 }}>
          <button className="chip" onClick={() => call("cover", "open_cover", {}, ids)}><ArrowUp /> Tout ouvrir</button>
          <button className="chip" onClick={() => call("cover", "close_cover", {}, ids)}><ArrowDown /> Tout fermer</button>
        </div>
      </header>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {COVERS.map((c) => (
          <div key={c.id} className="card" style={{ ["--c" as string]: ROOMS.find((r) => r.id === c.room)?.color }}>
            <Shutter id={c.id} name={c.name} />
          </div>
        ))}
      </div>
    </>
  );
}
