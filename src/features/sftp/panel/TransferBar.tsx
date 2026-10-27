import { formatSize, pct } from "./format";
import { transferKindLabel } from "./transferState";
import type { TransferState } from "./types";

export function TransferBar({ transfer }: { transfer: TransferState }) {
  const done = transfer.files.filter((f) => f.status === "done").length;
  return (
    <div className="sftp-transfer">
      <div className="sftp-transfer-head">
        <span>
          {transferKindLabel(transfer.kind)} {done}/{transfer.files.length || "…"}
        </span>
        <span className="sftp-transfer-pct">
          {pct(transfer.overallSent, transfer.overallTotal)}%
        </span>
      </div>
      <div className="sftp-transfer-bar">
        <div
          className="sftp-transfer-bar-fill"
          style={{ width: `${pct(transfer.overallSent, transfer.overallTotal)}%` }}
        />
      </div>
      <div className="sftp-transfer-overall muted">
        {formatSize(transfer.overallSent)} / {formatSize(transfer.overallTotal || 0)}
        {transfer.overallTotal > transfer.overallSent
          ? ` · ${formatSize(transfer.overallTotal - transfer.overallSent)} left`
          : ""}
      </div>
      <ul className="sftp-transfer-files">
        {transfer.files.map((f, i) => (
          <li key={`${f.name}-${i}`} className={`sftp-transfer-file status-${f.status}`}>
            <div className="sftp-transfer-file-row">
              <span className="sftp-transfer-name" title={f.name}>
                {f.name}
              </span>
              <span className="sftp-transfer-file-pct">
                {f.status === "pending"
                  ? "…"
                  : f.status === "error"
                    ? "err"
                    : `${pct(f.bytesSent, f.bytesTotal)}%`}
              </span>
            </div>
            <div className="sftp-transfer-bar thin">
              <div
                className="sftp-transfer-bar-fill"
                style={{ width: `${pct(f.bytesSent, f.bytesTotal)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
