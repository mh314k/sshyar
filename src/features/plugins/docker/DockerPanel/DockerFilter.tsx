import type { ReactNode } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional trailing control (e.g. state select). */
  trailing?: ReactNode;
}

export function DockerFilter({
  value,
  onChange,
  placeholder = "Filter…",
  trailing,
}: Props) {
  return (
    <div className="docker-filter">
      <input
        type="search"
        className="docker-filter-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {value ? (
        <button
          type="button"
          className="docker-filter-clear"
          onClick={() => onChange("")}
          title="Clear filter"
        >
          Clear
        </button>
      ) : null}
      {trailing}
    </div>
  );
}
