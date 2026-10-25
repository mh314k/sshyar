import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import type { Snippet } from "../types";
import { api } from "../lib/api";
import { IconButton, iconSize, iconStroke } from "./IconButton";

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
      <h4>
        <Zap size={13} strokeWidth={iconStroke} /> Snippets
      </h4>
      <ul>
        {snippets.map((s) => (
          <li key={s.id}>
            <button className="snippet-run" title={s.command} onClick={() => onRun(s.command)}>
              {s.name}
            </button>
            <IconButton
              variant="icon"
              title="Delete"
              icon={<Trash2 size={13} strokeWidth={iconStroke} />}
              onClick={async () => {
                await api.deleteSnippet(s.id);
                onChange();
              }}
            />
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
        <IconButton
          type="submit"
          variant="soft"
          label="Add"
          icon={<Plus size={iconSize} strokeWidth={iconStroke} />}
        />
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
