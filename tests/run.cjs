const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const {spawn} = require("node:child_process");

async function availablePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => {socket.once("error", reject); socket.listen(0, "127.0.0.1", resolve);});
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

async function run(file, env) {
  const child = spawn(process.execPath, [path.join(__dirname, file)], {env, stdio: "inherit"});
  const code = await new Promise((resolve, reject) => {child.once("error", reject); child.once("exit", resolve);});
  assert.equal(code, 0, file + " failed");
}

(async () => {
  const root = path.resolve(__dirname, "..");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "badge-proof-test-"));
  const artifacts = path.join(temporary, "artifacts");
  fs.mkdirSync(artifacts);
  const port = await availablePort();
  const base = "http://127.0.0.1:" + port;
  const python = process.env.BADGE_PROOF_PYTHON || (process.platform === "win32" ? "python" : "python3");
  const server = spawn(python, [path.join(root, "serve.py"), "--port", String(port), "--library", path.join(temporary, "library")], {stdio: ["ignore", "ignore", "pipe"]});
  let launchError;
  let serverOutput = "";
  server.once("error", error => {launchError = error;});
  server.stderr.on("data", chunk => {serverOutput += chunk;});
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError) throw launchError;
      if (server.exitCode !== null) throw new Error(serverOutput);
      try {if ((await fetch(base + "/api/library")).ok) {ready = true; break;}} catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, "Test server did not start. " + serverOutput);
    const env = {...process.env, BADGE_PROOF_TEST_URL: base, BADGE_PROOF_TEST_ARTIFACTS: artifacts};
    await run("saved-framing.cjs", env);
    await run("print-settings.cjs", env);
    await run("browser-app.cjs", env);
  } finally {
    if (server.exitCode === null && !launchError) {
      const stopped = new Promise(resolve => server.once("exit", resolve));
      server.kill();
      await stopped;
    }
    fs.rmSync(temporary, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
