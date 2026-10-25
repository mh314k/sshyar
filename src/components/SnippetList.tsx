import { useState } from "react";
import type { Snippet } from "../types";
import { api } from "../lib/api";

interface Props {
  snippets: Snippet[];
  onChange: () => void;
  onRun: (command: string) => void;
}

export function SnippetList({ snippets, onChange, onRun }: Props) {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.upsertSnippet(null, name, command);
      setName("");
      setCommand("");
      onChange();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="snippets">
      <h4>Snippets</h4>
      <ul>
        {snippets.map((s) => (
          <li key={s.id}>
            <button className="snippet-run" title={s.command} onClick={() => onRun(s.command)}>
              {s.name}
            </button>
            <button
              className="icon-btn"
              title="Delete"
              onClick={async () => {
                await api.deleteSnippet(s.id);
                onChange();
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="snippet-form" onSubmit={add}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          required
        />
        <button type="submit">Add</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
