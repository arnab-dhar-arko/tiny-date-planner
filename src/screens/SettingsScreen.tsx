import { Download, Moon, Pencil, Plus, RefreshCw, ShieldCheck, Sun, Trash2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import type { ExchangeRate, Trip } from "../types";
import { money, shortDate } from "../utils/format";

export function SettingsScreen({ trips, currentTrip, rates, theme, onTheme, onAddTrip, onEditTrip, onDeleteTrip, onRate, onDeleteRate, onExport, onImport, onClear }: {
  trips: Trip[];
  currentTrip: Trip;
  rates: ExchangeRate[];
  theme: "light" | "dark";
  onTheme: () => void;
  onAddTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
  onRate: (rate?: ExchangeRate) => void;
  onDeleteRate: (rate: ExchangeRate) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-heading"><p className="eyebrow">Your app</p><h1>Settings</h1><p>Manage trips, rates, backups, and appearance.</p></div>
      <section className="settings-section">
        <div className="section-heading"><div><p className="eyebrow">Trip library</p><h2>Your trips</h2></div><button className="button secondary small" onClick={onAddTrip}><Plus size={15} /> New trip</button></div>
        <div className="settings-trip-list">
          {trips.map((trip) => <article key={trip.id} className={trip.id === currentTrip.id ? "selected" : ""}><div><span>{trip.name.slice(0, 2).toUpperCase()}</span><p><strong>{trip.name}</strong><small>{shortDate(trip.start_date)} to {shortDate(trip.end_date)} · {money(trip.total_budget, trip.home_currency, true)}</small></p></div><aside><button onClick={() => onEditTrip(trip)} aria-label={`Edit ${trip.name}`}><Pencil size={15} /></button><button onClick={() => onDeleteTrip(trip)} aria-label={`Delete ${trip.name}`}><Trash2 size={15} /></button></aside></article>)}
        </div>
      </section>
      <section className="settings-section">
        <div className="section-heading"><div><p className="eyebrow">Local conversion</p><h2>Exchange rates</h2></div><button className="button secondary small" onClick={() => onRate()}><RefreshCw size={15} /> Add rate</button></div>
        <div className="rate-list">
          {rates.slice(0, 5).map((rate) => <div key={rate.id}><span>{rate.base_currency} to {rate.target_currency}</span><strong>{rate.rate}</strong><small>{rate.source} · {rate.date}</small><aside><button onClick={() => onRate(rate)} aria-label={`Edit ${rate.base_currency} to ${rate.target_currency} rate`}><Pencil size={13} /></button><button onClick={() => onDeleteRate(rate)} aria-label={`Delete ${rate.base_currency} to ${rate.target_currency} rate`}><Trash2 size={13} /></button></aside></div>)}
          {!rates.length && <p className="muted">Rates you fetch or add will appear here.</p>}
        </div>
      </section>
      <section className="settings-section">
        <div className="section-heading"><div><p className="eyebrow">Preferences</p><h2>Device settings</h2></div></div>
        <button className="setting-row" onClick={onTheme}><span>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</span><p><strong>{theme === "light" ? "Dark mode" : "Light mode"}</strong><small>Stored on this device</small></p><b>{theme === "light" ? "Off" : "On"}</b></button>
      </section>
      <section className="settings-section">
        <div className="section-heading"><div><p className="eyebrow">Local backup</p><h2>Your data</h2></div></div>
        <div className="settings-actions">
          <button onClick={onExport}><Download size={19} /><span><strong>Export backup</strong><small>Download trips, entries, and rates</small></span></button>
          <button onClick={onImport}><Upload size={19} /><span><strong>Import backup</strong><small>Merge a valid Roam Budget file</small></span></button>
          <button className="danger-action" onClick={onClear}><Trash2 size={19} /><span><strong>Clear local data</strong><small>Delete all data from this device</small></span></button>
        </div>
      </section>
      <div className="local-first-card"><ShieldCheck size={22} /><div><strong>Everything stays with you.</strong><p>Roam Budget has no account, backend, tracking, or cloud sync. IndexedDB stores your data locally in this browser.</p></div></div>
    </motion.div>
  );
}
