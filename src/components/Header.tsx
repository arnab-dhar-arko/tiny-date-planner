import { ChevronDown, Menu, Plus, UserRound } from "lucide-react";
import type { Trip } from "../types";

interface HeaderProps {
  trip?: Trip;
  onMenu: () => void;
  onAddTrip: () => void;
  onSwitchTrip: () => void;
}

export function Header({ trip, onMenu, onAddTrip, onSwitchTrip }: HeaderProps) {
  return (
    <header className="app-header">
      <button className="header-icon" onClick={onMenu} aria-label="Open settings">
        <Menu size={21} />
      </button>
      <button className="trip-title-button" onClick={onSwitchTrip} aria-label="Switch trip">
        <span>{trip?.name ?? "My trip"}</span>
        <ChevronDown size={14} />
      </button>
      <button className="profile-add" onClick={onAddTrip} aria-label="Add a trip">
        <UserRound size={19} />
        <span><Plus size={10} /></span>
      </button>
    </header>
  );
}
