import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname);
const outputDirectory = resolve(projectRoot, "dist", "server");

const [html, css, logo] = await Promise.all([
  readFile(resolve(projectRoot, "obrigado.html"), "utf8"),
  readFile(resolve(projectRoot, "styles.css"), "utf8"),
  readFile(resolve(projectRoot, "assets", "logo-nextplay.png")),
]);

const worker = `
const pageHtml = ${JSON.stringify(html)};
const pageCss = ${JSON.stringify(css)};
const logoBase64 = ${JSON.stringify(logo.toString("base64"))};

function decodeBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function createResponse(request, body, contentType, status = 200) {
  const headers = new Headers({
    "content-type": contentType,
    "cache-control": contentType.startsWith("image/")
      ? "public, max-age=604800, immutable"
      : "public, max-age=300",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  });

  return new Response(request.method === "HEAD" ? null : body, { status, headers });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Método não permitido", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    if (url.pathname === "/" || url.pathname === "/obrigado.html") {
      return createResponse(request, pageHtml, "text/html; charset=utf-8");
    }

    if (url.pathname === "/styles.css") {
      return createResponse(request, pageCss, "text/css; charset=utf-8");
    }

    if (url.pathname === "/assets/logo-nextplay.png") {
      return createResponse(request, decodeBase64(logoBase64), "image/png");
    }

    return createResponse(request, "Página não encontrada", "text/plain; charset=utf-8", 404);
  },
};
`.trimStart();

await rm(resolve(projectRoot, "dist"), { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "index.js"), worker, "utf8");

console.log("Publicação preparada com sucesso.");
