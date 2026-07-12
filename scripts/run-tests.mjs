import { readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { createServer } from "vite";

async function encontrarTestes(diretorio) {
  const entradas = await readdir(diretorio, { withFileTypes: true });
  const testes = await Promise.all(
    entradas.map(async (entrada) => {
      const caminho = resolve(diretorio, entrada.name);
      if (entrada.isDirectory()) return encontrarTestes(caminho);
      return entrada.isFile() && entrada.name.endsWith(".test.ts") ? [caminho] : [];
    }),
  );
  return testes.flat();
}

const raiz = process.cwd();
const testes = (await encontrarTestes(resolve(raiz, "src"))).sort();
const server = await createServer({ server: { middlewareMode: true, hmr: false } });

try {
  for (const teste of testes) {
    const modulo = `/${relative(raiz, teste).split(sep).join("/")}`;
    await server.ssrLoadModule(modulo);
  }
} finally {
  await server.close();
}
