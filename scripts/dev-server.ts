/**
 * Browser dev server — serves ui/ as static files with hot-reload support.
 * Usage: deno task browser
 * Then open: http://localhost:8080
 */

const PORT = 8080;
const UI_DIR = new URL("../ui/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

function ext(path: string) {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i).toLowerCase() : "";
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = decodeURIComponent(url.pathname);

  // Root → index.html
  if (pathname === "/") pathname = "/index.html";

  const filePath = UI_DIR + pathname.replace(/^\//, "");

  try {
    let content = await Deno.readFile(filePath);

    // Inject dev-mocks.js into index.html before </head>
    if (pathname === "/index.html") {
      let html = new TextDecoder().decode(content);
      html = html.replace(
        "</head>",
        `  <script src="/dev-mocks.js"></script>\n</head>`,
      );
      content = new TextEncoder().encode(html);
    }

    return new Response(content, {
      headers: { "Content-Type": MIME[ext(filePath)] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("404 Not Found", { status: 404 });
  }
}

console.log(`\n🕹️  HOTAS Tool dev server → http://localhost:${PORT}\n`);
Deno.serve({ port: PORT }, handler);
