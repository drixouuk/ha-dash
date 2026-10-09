import { Droplets, Flame } from "lucide-react";
import { useCall, useEnt, useHist } from "@data";
import type { Room } from "@config";
import { Dial } from "./Dial";
import { Shutter } from "./Shutter";
import { Sheet } from "./Sheet";
import { Spark } from "./Spark";
import { n1 } from "../util";
import { COVERS } from "@config";

const HVAC_LABEL: Record<string, string> = { off: "Arrêt", heat: "Chauffe", auto: "Auto", heat_cool: "Auto", cool: "Froid" };

export function HvacModes({ climate }: { climate: string }) {
  const c = useEnt(climate);
  const call = useCall();
  const modes = (c?.attrs.hvac_modes as string[] | undefined)?.filter((m) => HVAC_LABEL[m]) ?? [];
  if (!c || !modes.length) return null;
  return (
    <div className="seg" role="group" aria-label="Mode de chauffage">
      {modes.map((m) => (
        <button key={m} className={c.state === m ? "on" : ""} onClick={() => call("climate", "set_hvac_mode", { hvac_mode: m }, climate)}>{HVAC_LABEL[m]}</button>
      ))}
    </div>
  );
}

export function RoomDial({ room, climate, color }: { room?: string; climate: string; color: string }) {
  const c = useEnt(climate);
  const call = useCall();
  if (!c) return <div className="sub">Entité introuvable : {climate}</div>;
  const a = c.attrs;
  return (
    <Dial
      label={`Consigne ${room ?? ""}`}
      value={Number(a.temperature ?? 19)} current={a.current_temperature != null ? Number(a.current_temperature) : null}
      min={Number(a.min_temp ?? 5)} max={Number(a.max_temp ?? 28)} step={Number(a.target_temp_step ?? 0.5)}
      heating={a.hvac_action === "heating"} disabled={!c.ok || c.state === "off"} color={color}
      onCommit={(v) => call("climate", "set_temperature", { temperature: v }, climate)}
    />
  );
}

export function RoomSheet({ room, onClose }: { room: Room | null; onClose: () => void }) {
  return room ? <RoomSheetInner room={room} onClose={onClose} /> : null;
}

function RoomSheetInner({ room, onClose }: { room: Room; onClose: () => void }) {
  const hist = useHist([room.temp, room.hum], 24);
  const temp = useEnt(room.temp);
  const hum = useEnt(room.hum);
  const clim = useEnt(room.climate);
  const heating = clim?.attrs.hvac_action === "heating";
  return (
    <Sheet open onClose={onClose} title={room.name}>
      <div className="stack" style={{ gap: 20 }}>
        <div className="row between wrap">
          <HvacModes climate={room.climate} />
          {heating ? <span className="badge heat"><Flame /> En chauffe</span> : <span className="badge">Au repos</span>}
        </div>
        <RoomDial room={room.name} climate={room.climate} color={room.color} />
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow">Température 24 h</div>
            <div className="num" style={{ fontSize: 28, margin: "2px 0 8px" }}>{n1(temp?.num)}°</div>
            <Spark points={hist[room.temp]} color={room.color} unit="°C" />
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow row" style={{ gap: 5 }}><Droplets style={{ width: 12, height: 12 }} /> Humidité 24 h</div>
            <div className="num" style={{ fontSize: 28, margin: "2px 0 8px" }}>{n1(hum?.num, 0)} %</div>
            <Spark points={hist[room.hum]} color={room.color} unit="%" decimals={0} />
          </div>
        </div>
        {room.covers.map((id) => (
          <div key={id} className="card" style={{ padding: 14 }}>
            <Shutter id={id} name={COVERS.find((c) => c.id === id)?.name ?? id} compact />
          </div>
        ))}
      </div>
    </Sheet>
  );
}
