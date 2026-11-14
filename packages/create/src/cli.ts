#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const templateDir = fileURLToPath(new URL("../template", import.meta.url));
const target = path.resolve(process.cwd(), process.argv[2] ?? ".");
const pkgFile = path.join(target, "package.json");

const GITIGNORE = `node_modules/
dist/
*.log
`;

function write(file: string, content: string, overwrite = false): void {
  if (!overwrite && fs.existsSync(file)) return;
  fs.writeFileSync(file, content, "utf8");
}

function main(): void {
  if (!fs.existsSync(templateDir)) {
    throw new Error(`template is missing at ${templateDir}; the package is broken`);
  }

  fs.mkdirSync(target, { recursive: true });

  // Copy the static template (kit.config.ts, README, questions/README).
  for (const entry of fs.readdirSync(templateDir)) {
    fs.cpSync(path.join(templateDir, entry), path.join(target, entry), {
      recursive: true,
      force: false,
    });
  }

  fs.mkdirSync(path.join(target, "records"), { recursive: true });
  write(path.join(target, "records", ".gitkeep"), "");
  write(path.join(target, ".gitignore"), GITIGNORE);

  const name =
    path.basename(target).replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() ||
    "interview-data";

  let pkg: Record<string, any> = {
    name,
    private: true,
    type: "module",
    scripts: {},
  };

  if (fs.existsSync(pkgFile)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")) as Record<string, any>;
    } catch {
      throw new Error(`${pkgFile} exists but is not valid JSON`);
    }
  }

  pkg.scripts = {
    ...(pkg.scripts ?? {}),
    dev: "zhumoben dev",
    build: "zhumoben build",
    serve: "zhumoben serve",
  };
  pkg.devDependencies = { ...(pkg.devDependencies ?? {}), zhumoben: "^0.1.0" };

  fs.writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  console.log(
    `\n  zhumoben data project created in ${target}\n\n` +
      `  next:\n` +
      `    cd ${path.relative(process.cwd(), target) || "."}\n` +
      `    pnpm install\n` +
      `    pnpm dev        # http://localhost:5901\n\n` +
      `  then add questions with:\n` +
      `    npx zhumoben new-question my-question\n`,
  );
}

try {
  main();
} catch (error) {
  console.error(`\n[create-zhumoben] ${(error as Error).message}\n`);
  process.exit(1);
}
