import type { Route } from "../lib/router";

const ITEMS: Array<{ key: Route["name"]; label: string; hash: string }> = [
  { key: "home", label: "首页", hash: "#/" },
  { key: "bank", label: "题库", hash: "#/bank" },
  { key: "records", label: "评分记录", hash: "#/records" },
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
