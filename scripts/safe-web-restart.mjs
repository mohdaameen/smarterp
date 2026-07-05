import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const isCheck = args.has("--check");
const cleanOnly = args.has("--clean-only");

const rootDir = process.cwd();
const nextDir = resolve(rootDir, "apps", "web", ".next");

function runPowerShell(command) {
    return new Promise((resolvePromise, rejectPromise) => {
        const ps = spawn(
            "powershell",
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
            { stdio: ["ignore", "pipe", "pipe"] },
        );

        let stdout = "";
        let stderr = "";

        ps.stdout.on("data", (chunk) => {
            stdout += String(chunk);
        });

        ps.stderr.on("data", (chunk) => {
            stderr += String(chunk);
        });

        ps.on("error", rejectPromise);
        ps.on("close", (code) => {
            if (code === 0) {
                resolvePromise({ stdout, stderr });
                return;
            }
            rejectPromise(new Error(stderr || stdout || `PowerShell exited with code ${code}`));
        });
    });
}

async function stopPort3000Processes() {
    const command = "$port = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($port) { $pids = $port | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($id in $pids) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue; Write-Output \"Stopped process $id on port 3000\" } } else { Write-Output \"No listener on port 3000\" }";
    const output = await runPowerShell(command);
    const text = `${output.stdout}${output.stderr}`.trim();
    if (text) console.log(text);
}

async function clearNextCache() {
    await rm(nextDir, { recursive: true, force: true });
    console.log(`Cleared ${nextDir}`);
}

function startWebDevServer() {
    const child = spawn("npm", ["run", "dev", "-w", "@smarterp/web"], {
        stdio: "inherit",
        shell: true,
    });

    child.on("close", (code) => {
        process.exit(code ?? 0);
    });
}

async function main() {
    if (isCheck) {
        console.log("safe-web-restart check passed");
        console.log(`Workspace: ${rootDir}`);
        console.log("Steps: stop port 3000 listeners -> clear apps/web/.next -> start web dev");
        return;
    }

    await stopPort3000Processes();
    await clearNextCache();

    if (cleanOnly) {
        console.log("Clean-only mode complete. Web dev server not started.");
        return;
    }

    console.log("Starting @smarterp/web dev server...");
    startWebDevServer();
}

try {
    await main();
} catch (error) {
    console.error("safe-web-restart failed:", error instanceof Error ? error.message : error);
    process.exit(1);
}
