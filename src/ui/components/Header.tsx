import { RotateCcw, Tag } from "lucide-react";

interface HeaderProps {
  busy: boolean;
  onRefresh?: () => void;
}

export function Header({ busy, onRefresh }: HeaderProps) {
  return (
    <header className="panelHead">
      <div className="brand">
        <div className="logo">
          <Tag aria-hidden="true" />
        </div>
        <div>
          <h1>AltPadi</h1>
          <small>Price check for Jumia</small>
        </div>
      </div>
      {onRefresh && (
        <button className="iconButton" type="button" onClick={onRefresh} aria-label="Check again" title="Check again">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      )}
      <div className={`progressLine ${busy ? "on" : ""}`} aria-hidden="true" />
    </header>
  );
}
