import * as path from "path";
import * as childProcess from "child_process";

// ffmpeg-static exports the path to the static ffmpeg binary
// eslint-disable-next-line @typescript-eslint/no-var-requires
export const ffmpegPath: string = require("ffmpeg-static");

/** Run a command, capture stdout+stderr, reject on non-zero exit. */
export function exec(bin: string, args: string[], opts: { cwd?: string } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(bin, args, {
      cwd: opts.cwd ?? "/tmp",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${path.basename(bin)} exited with code ${code}\n${stderr.slice(-2000)}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/** Parse RMS level dB from ffmpeg astats stderr output. Returns linear RMS. */
export function parseRMS(stderr: string): number {
  const match = stderr.match(/RMS level dB:\s*([-\d.]+)/);
  if (!match) return 0.001;
  const db = parseFloat(match[1]);
  if (!isFinite(db)) return 0.001;
  return Math.max(0.001, Math.pow(10, db / 20));
}

/** Get audio duration in seconds using ffmpeg. */
export function getDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    childProcess.execFile(
      ffmpegPath,
      ["-i", filePath, "-f", "null", "-"],
      (err, stdout, stderr) => {
        const combined = (stdout || "") + (stderr || "");
        const m = combined.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (!m) { resolve(0); return; }
        const secs = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        resolve(secs);
      }
    );
  });
}
