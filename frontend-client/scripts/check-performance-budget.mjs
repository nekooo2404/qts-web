import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cssDirectory = path.join(process.cwd(), "src", "app");
const files = fs.readdirSync(cssDirectory).filter((file) => file.endsWith(".css"));
const bytes = files.reduce(
  (sum, file) => sum + fs.statSync(path.join(cssDirectory, file)).size,
  0,
);
const limits = {
  cssSourceBytes: 220_000,
  cssFiles: 4,
};

const failures = [];
if (bytes > limits.cssSourceBytes) failures.push(`CSS source ${bytes} B exceeds ${limits.cssSourceBytes} B`);
if (files.length > limits.cssFiles) failures.push(`CSS files ${files.length} exceeds ${limits.cssFiles}`);

console.log(JSON.stringify({ files: files.length, bytes, limits }, null, 2));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
