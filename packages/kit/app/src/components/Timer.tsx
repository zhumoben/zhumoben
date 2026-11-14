import { useEffect, useState } from "react";

function format(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function Timer() {
  const [minutes, setMinutes] = useState(30);
  const [total, setTotal] = useState(30 * 60);
  const [remain, setRemain] = useState(30 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemain((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const reset = () => {
    setRunning(false);
    setTotal(minutes * 60);
    setRemain(minutes * 60);
  };

  const done = remain === 0;
  const state = running ? "计时中" : done ? "已结束" : remain === total ? "就绪" : "已暂停";

  return (
    <div className="timer">
      <div className="timer__main">
        <div className={`timer__clock${done ? " is-over" : ""}`}>{format(remain)}</div>
        <div className="timer__btns">
          <button
            type="button"
            className={`icobtn${running ? " is-on" : ""}`}
            aria-label={running ? "暂停" : "开始"}
            onClick={() => {
              if (done) {
                setRemain(total);
                setRunning(true);
                return;
              }
              setRunning((value) => !value);
            }}
          >
            {running ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="7,4 20,12 7,20" />
              </svg>
            )}
          </button>
          <button type="button" className="icobtn" aria-label="复位" onClick={reset}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" />
            </svg>
          </button>
        </div>
      </div>

      <div className="timer__bar">
        <i
          data-state={remain <= 10 ? "danger" : "normal"}
          style={{ width: `${total ? (remain / total) * 100 : 0}%` }}
        />
      </div>

      <div className="timer__set">
        <span>设定</span>
        <input
          type="number"
          min={1}
          max={180}
          value={minutes}
          disabled={running}
          onChange={(event) => {
            const next = Math.max(1, Math.min(180, Number(event.target.value) || 30));
            setMinutes(next);
            setTotal(next * 60);
            setRemain(next * 60);
          }}
        />
        <span>分钟</span>
        <span className="timer__state">{state}</span>
      </div>
    </div>
  );
}
