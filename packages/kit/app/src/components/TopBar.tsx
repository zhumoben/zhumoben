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
        <svg
          className="brand__mark"
          viewBox="5 4.6 22 22"
          width={26}
          height={26}
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M10.9 6.4H13.6v6.9L16 15.8l2.4-2.5V6.4h2.7A1.5 1.5 0 0 1 22.6 7.9v16a1.5 1.5 0 0 1-1.5 1.5H10.9a1.5 1.5 0 0 1-1.5-1.5v-16a1.5 1.5 0 0 1 1.5-1.5Z"
            fill="currentColor"
          />
        </svg>
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
