import { Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import type { Trip } from "../types";
import { money, shortDate } from "../utils/format";

export function TripSwitcher({ trips, currentId, onChoose, onAdd, onEdit, onDelete }: {
  trips: Trip[];
  currentId?: string;
  onChoose: (id: string) => void;
  onAdd: () => void;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
}) {
  return (
    <div className="trip-list">
      {trips.map((trip) => (
        <div className={`trip-option ${trip.id === currentId ? "current" : ""}`} key={trip.id}>
          <button className="trip-option-main" onClick={() => onChoose(trip.id)}>
            <span className="trip-pin"><MapPin size={17} /></span>
            <span><strong>{trip.name}</strong><small>{shortDate(trip.start_date)} – {shortDate(trip.end_date)} · {money(trip.total_budget, trip.home_currency, true)}</small></span>
            {trip.id === currentId && <Check size={18} />}
          </button>
          <button onClick={() => onEdit(trip)} aria-label={`Edit ${trip.name}`}><Pencil size={15} /></button>
          <button className="danger-text" onClick={() => onDelete(trip)} aria-label={`Delete ${trip.name}`}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="add-trip-row" onClick={onAdd}><Plus size={17} /> Plan another trip</button>
    </div>
  );
}
