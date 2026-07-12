import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const root = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relative = specifier.slice(2);
    const target = pathToFileURL(resolvePath(root, "src", relative));

    try {
      return nextResolve(`${target.href}.ts`, context);
    } catch {
      return nextResolve(target.href, context);
    }
  }

  return nextResolve(specifier, context);
}
