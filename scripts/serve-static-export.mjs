import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import vm from "node:vm";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "out");
const routerPath = path.join(projectRoot, "infra", "cloudfront", "static-router.js");
const port = Number.parseInt(process.env.STATIC_EXPORT_PORT ?? "4173", 10);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("STATIC_EXPORT_PORT must be an integer between 1 and 65535.");
}

if (!fs.existsSync(path.join(outputRoot, "index.html"))) {
  throw new Error("Static output is missing. Run npm run build:static first.");
}

const routerSource = fs.readFileSync(routerPath, "utf8");
const context = vm.createContext({});
vm.runInContext(`${routerSource}\nthis.routeRequest = handler;`, context, { filename: routerPath });
const routeRequest = context.routeRequest;

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function sendFile(request, response, filePath, statusCode = 200) {
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      const fallback = path.join(outputRoot, "404.html");
      if (filePath !== fallback && fs.existsSync(fallback)) {
        sendFile(request, response, fallback, 404);
        return;
      }
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(statusCode, {
      "cache-control": "no-store",
      "content-length": stats.size,
      "content-type": contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const routed = routeRequest({
    request: {
      headers: {},
      method: request.method ?? "GET",
      querystring: {},
      uri: requestUrl.pathname,
    },
  });

  if ("statusCode" in routed) {
    const headers = Object.fromEntries(
      Object.entries(routed.headers ?? {}).map(([name, header]) => [name, header.value]),
    );
    response.writeHead(routed.statusCode, headers);
    response.end();
    return;
  }

  const relativePath = decodeURIComponent(routed.uri).replace(/^\/+/, "");
  const filePath = path.resolve(outputRoot, relativePath);
  if (filePath !== outputRoot && !filePath.startsWith(`${outputRoot}${path.sep}`)) {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Invalid path");
    return;
  }

  sendFile(request, response, filePath);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Static export preview: http://127.0.0.1:${port}\n`);
});
