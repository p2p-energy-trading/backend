import { Project } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "tsconfig.json"),
});

const result: Record<string, any> = {};

function addToResult(moduleName: string, type: string, className: string, methods: string[]) {
  if (!result[moduleName]) result[moduleName] = {};
  if (!result[moduleName][type]) result[moduleName][type] = {};
  result[moduleName][type][className] = methods;
}

project.getSourceFiles("src/**/*.ts").forEach(file => {
  file.getClasses().forEach(cls => {
    const className = cls.getName();
    if (!className) return;

    const filePath = file.getFilePath();

    // Deteksi tipe class berdasarkan nama file
    const lowerPath = filePath.toLowerCase();
    let type = "other";
    if (lowerPath.includes("controller")) type = "controller";
    else if (lowerPath.includes("service")) type = "service";
    else if (lowerPath.includes("module")) type = "module";

    // Ambil nama module berdasarkan folder induk
    const parts = filePath.split(path.sep);
    const moduleName = parts.includes("src")
      ? parts[parts.indexOf("src") + 1]
      : "unknown";

    // Ambil nama methods
    const methods = cls.getMethods().map(m => m.getName());

    // Masukkan ke struktur hasil
    addToResult(moduleName, type, className, methods);
  });
});

// Simpan hasil ke JSON file
const outputPath = path.join(__dirname, "nest-structure.json");
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log(`✅ Struktur NestJS disimpan ke ${outputPath}`);
