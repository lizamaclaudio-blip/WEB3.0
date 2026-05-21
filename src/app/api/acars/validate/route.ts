import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Endpoint de validación de updates ACARS.
 * Permite al cliente ACARS verificar la integridad de un update ANTES de instalarlo.
 * 
 * GET /api/acars/validate?version=7.1.3&hash=ABC123...
 * 
 * Response:
 * {
 *   "ok": true,
 *   "version": "7.1.3",
 *   "revision": "2026.5.21.5",
 *   "expectedHash": "SHA256...",
 *   "hashMatch": true|false,
 *   "safeToInstall": true|false,
 *   "warnings": []
 * }
 */

function getExpectedHash(version: string): string | null {
  try {
    // Buscar archivo .sha256 del instalador
    const hashFile = join(process.cwd(), "public", "downloads", "acars", `PatagoniaWingsACARSSetup-${version}.sha256`);
    const content = readFileSync(hashFile, "utf-8").trim();
    // Formato: "HASH  filename"
    const hash = content.split(/\s+/)[0];
    return hash?.toUpperCase() || null;
  } catch {
    // Fallback: calcular hash en runtime
    try {
      const installerPath = join(process.cwd(), "public", "downloads", "acars", `PatagoniaWingsACARSSetup-${version}.exe`);
      const file = readFileSync(installerPath);
      return createHash("sha256").update(file).digest("hex").toUpperCase();
    } catch {
      return null;
    }
  }
}

function getManifestInfo(): { version: string; revision: string; forceUpdate: boolean } | null {
  try {
    const manifestPath = join(process.cwd(), "public", "downloads", "acars", "acars-update.json");
    const content = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    return {
      version: manifest.version,
      revision: manifest.revision,
      forceUpdate: manifest.forceUpdate || false,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedVersion = url.searchParams.get("version");
    const providedHash = url.searchParams.get("hash")?.toUpperCase();

    const manifest = getManifestInfo();
    if (!manifest) {
      return NextResponse.json(
        { ok: false, error: "MANIFEST_NOT_FOUND", message: "No se pudo leer manifest de versiones" },
        { status: 500 }
      );
    }

    // Si no pidieron versión específica, devolver info de la última
    const targetVersion = requestedVersion || manifest.version;
    
    // Obtener hash esperado
    const expectedHash = getExpectedHash(targetVersion);
    
    // Validar hash si se proporcionó
    let hashMatch: boolean | null = null;
    if (providedHash && expectedHash) {
      hashMatch = providedHash === expectedHash;
    }

    // Determinar si es seguro instalar
    const warnings: string[] = [];
    let safeToInstall = true;

    if (!expectedHash) {
      warnings.push("No se pudo verificar hash del instalador");
      safeToInstall = false;
    }

    if (hashMatch === false) {
      warnings.push("HASH MISMATCH: El instalador descargado no coincide con el oficial");
      safeToInstall = false;
    }

    if (targetVersion !== manifest.version) {
      warnings.push(`Versión ${targetVersion} no es la última disponible (${manifest.version})`);
    }

    return NextResponse.json({
      ok: true,
      version: targetVersion,
      latestVersion: manifest.version,
      revision: manifest.revision,
      expectedHash: expectedHash,
      providedHash: providedHash || null,
      hashMatch: hashMatch,
      safeToInstall: safeToInstall,
      forceUpdate: manifest.forceUpdate,
      warnings: warnings,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[acars/validate] error", error);
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "Error interno de validación" },
      { status: 500 }
    );
  }
}

/**
 * POST para validar un archivo subido (para validación server-side)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const version = formData.get("version") as string;

    if (!file || !version) {
      return NextResponse.json(
        { ok: false, error: "MISSING_PARAMS", message: "Se requiere file y version" },
        { status: 400 }
      );
    }

    // Calcular hash del archivo subido
    const bytes = await file.arrayBuffer();
    const providedHash = createHash("sha256").update(Buffer.from(bytes)).digest("hex").toUpperCase();
    
    // Comparar con hash esperado
    const expectedHash = getExpectedHash(version);
    const hashMatch = expectedHash ? providedHash === expectedHash : null;

    return NextResponse.json({
      ok: true,
      version: version,
      providedHash: providedHash,
      expectedHash: expectedHash,
      hashMatch: hashMatch,
      safeToInstall: hashMatch === true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[acars/validate] POST error", error);
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "Error validando archivo" },
      { status: 500 }
    );
  }
}
