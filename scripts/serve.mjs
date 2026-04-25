import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.argv[2] || ".";
const port = Number(process.argv[3] || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    const cleanPath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, cleanPath === "/" ? "index.html" : cleanPath);
    let fileStat = await stat(filePath).catch(() => null);

    if (!fileStat && root === "." && cleanPath !== "/") {
      filePath = join("public", cleanPath);
      fileStat = await stat(filePath).catch(() => null);
    }

    if (fileStat?.isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Dashboard available at http://127.0.0.1:${port}`);
});
