import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import type { Snippet } from "../../types";
import { api } from "../../lib/api";
import { IconButton, iconProps, iconSize, iconSizeSm } from "../../components/IconButton";

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
      {snippets.length === 0 && (
        <p className="muted snippets-empty">No snippets yet. Add a named command below.</p>
      )}
      <ul>
        {snippets.map((s) => (
          <li key={s.id}>
            <button className="snippet-run" title={s.command} onClick={() => onRun(s.command)}>
              {s.name}
            </button>
            <IconButton
              variant="ghost"
              title="Delete"
              icon={<DeleteOutlinedIcon {...iconProps(iconSizeSm)} />}
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
          icon={<AddIcon {...iconProps(iconSize)} />}
        />
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
