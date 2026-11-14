import { BookOpen, FileText, Home } from "react-feather";
import type { Route } from "../lib/router";

const ITEMS: Array<{
  key: Route["name"];
  label: string;
  hash: string;
  Icon: typeof Home;
}> = [
  { key: "home", label: "首页", hash: "#/", Icon: Home },
  { key: "bank", label: "题库", hash: "#/bank", Icon: BookOpen },
  { key: "records", label: "评分记录", hash: "#/records", Icon: FileText },
];

export function TopBar({
  route,
  onNavigate,
  title,
  saved,
}: {
  route: Route;
  onNavigate: (hash: string) => void;
  title: string;
  saved?: string;
}) {
  const active = route.name === "question" ? "bank" : route.name;

  return (
    <header className="topbar">
      <a
        className="brand"
        href="#/"
        onClick={(event) => {
          event.preventDefault();
          onNavigate("#/");
        }}
        style={{ color: "inherit" }}
      >
        <span className="brand__mark">验</span>
        <span className="brand__name">{title}</span>
        <span className="brand__tag">v0.1</span>
      </a>

      <nav className="nav">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav__item${active === item.key ? " is-on" : ""}`}
            onClick={() => onNavigate(item.hash)}
          >
            <item.Icon size={14} strokeWidth={1.8} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="topbar__right">
        <span className="status">
          <i />
          本地 · {saved ?? "自动保存"}
        </span>
      </div>
    </header>
  );
}
