import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "react-feather";

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
              <Pause size={13} strokeWidth={1.8} />
            ) : (
              <Play size={13} strokeWidth={1.8} />
            )}
          </button>
          <button type="button" className="icobtn" aria-label="复位" onClick={reset}>
            <RotateCcw size={13} strokeWidth={1.8} />
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
