import { useEffect, useMemo, useState } from "react";
import { questions as questionEntries } from "virtual:zhumoben/questions";
import { config } from "virtual:zhumoben/config";
import type { RecordSummary } from "../../shared/types";
import { TopBar } from "./components/TopBar";
import { ScoreDock } from "./components/ScoreDock";
import { api } from "./lib/api";
import { navigate, useRoute } from "./lib/router";
import { HomePage } from "./pages/HomePage";
import { BankPage } from "./pages/BankPage";
import { RecordsPage } from "./pages/RecordsPage";
import { QuestionPage } from "./pages/QuestionPage";

export function App() {
  const route = useRoute();
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [dockClosed, setDockClosed] = useState(false);

  const metas = useMemo(() => questionEntries.map((entry) => entry.meta), []);
  const entry =
    route.name === "question"
      ? questionEntries.find((item) => item.meta.id === route.id)
      : undefined;
  const showDock = route.name === "question" && Boolean(entry) && !dockClosed;

  useEffect(() => {
    document.title = config.title ?? "zhumoben";
  }, []);

  useEffect(() => {
    api
      .records()
      .then(setRecords)
      .catch(() => setRecords([]));
  }, [route.name]);

  useEffect(() => {
    document.body.classList.toggle("dock-closed", dockClosed);
  }, [dockClosed]);

  useEffect(() => {
    document.body.classList.remove("dock-open");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route.name, route.name === "question" ? route.id : ""]);

  const closeDock = () => {
    if (window.innerWidth >= 1180) setDockClosed(true);
    else document.body.classList.remove("dock-open");
  };

  return (
    <>
      <TopBar route={route} onNavigate={navigate} title={config.title ?? "朱墨本"} />

      <div className={`app${showDock ? " has-dock" : ""}`}>
        {route.name === "home" && <HomePage questions={metas} onNavigate={navigate} />}

        {route.name === "bank" && (
          <BankPage questions={metas} records={records} onNavigate={navigate} />
        )}

        {route.name === "records" && (
          <RecordsPage
            questions={metas}
            initialQuestion={route.question}
            onNavigate={navigate}
          />
        )}

        {route.name === "question" &&
          (entry ? (
            <QuestionPage entry={entry} onNavigate={navigate} />
          ) : (
            <div className="page">
              <h1 className="page__title">题目不存在</h1>
              <p className="page__desc">没有找到 id 为 “{route.id}” 的题目。</p>
            </div>
          ))}
      </div>

      {route.name === "question" && entry && (
        <ScoreDock question={entry.meta} recordId={route.record} onClose={closeDock} />
      )}

      {route.name === "question" && entry && (
        <button
          type="button"
          className="dock-fab"
          onClick={() => {
            if (window.innerWidth >= 1180) setDockClosed(false);
            else document.body.classList.add("dock-open");
          }}
        >
          ✎ 评分表
        </button>
      )}

      <div className="scrim" onClick={closeDock} />
    </>
  );
}
