import { createServer } from "node:http";
import { mkdir, appendFile } from "node:fs/promises";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import net from "node:net";
import tls from "node:tls";

const root = resolve(".");
const publicDir = join(root, "public");
const dataDir = join(root, "data");
const port = Number(process.env.PORT || 3000);

loadDotEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/notify") {
      await handleNotify(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { ok: false, message: "Method not allowed" });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, message: "Something went wrong." });
  }
});

server.listen(port, () => {
  console.log(`Reel lead site running at http://localhost:${port}`);
});

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = resolve(publicDir, cleanPath || "index.html");

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { ok: false, message: "Forbidden" });
    return;
  }

  const target = existsSync(filePath) ? filePath : join(publicDir, "index.html");
  const type = mimeTypes[extname(target)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(target).pipe(res);
}

async function handleNotify(req, res) {
  const body = await readJson(req);
  const lead = sanitizeLead(body);

  if (!lead.name || !lead.email || !lead.comment || !lead.date || !lead.time) {
    sendJson(res, 400, {
      ok: false,
      message: "Please complete the plan and add one comment."
    });
    return;
  }

  await mkdir(dataDir, { recursive: true });
  await appendFile(
    join(dataDir, "submissions.jsonl"),
    `${JSON.stringify({ ...lead, createdAt: new Date().toISOString() })}\n`
  );

  const emailResult = await sendNotificationEmail(lead);

  sendJson(res, 200, {
    ok: true,
    emailed: emailResult.sent,
    message: emailResult.sent
      ? "Sent. I will reply soon."
      : "Saved. Email is not configured yet, but the request is stored."
  });
}

function sanitizeLead(input) {
  return {
    name: String(input.name || "").trim().slice(0, 120),
    email: String(input.email || "").trim().slice(0, 180),
    date: String(input.date || "").trim().slice(0, 40),
    time: String(input.time || "").trim().slice(0, 120),
    food: Array.isArray(input.food)
      ? input.food.map((item) => String(item).trim().slice(0, 80)).filter(Boolean).slice(0, 12)
      : [],
    comment: String(input.comment || "").trim().slice(0, 1200),
    page: String(input.page || "").trim().slice(0, 300)
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

async function sendNotificationEmail(lead) {
  const required = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "OWNER_EMAIL",
    "FROM_EMAIL"
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.warn(`Email skipped. Missing: ${missing.join(", ")}`);
    return { sent: false };
  }

  const subject = `New date-plan reply from ${lead.name}`;
  const text = [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Date: ${lead.date}`,
    `Time: ${lead.time}`,
    lead.food.length ? `Food: ${lead.food.join(", ")}` : "",
    lead.page ? `Page: ${lead.page}` : "",
    "",
    lead.comment
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <h2>New date-plan reply</h2>
    <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
    <p><strong>Date:</strong> ${escapeHtml(lead.date)}</p>
    <p><strong>Time:</strong> ${escapeHtml(lead.time)}</p>
    ${lead.food.length ? `<p><strong>Food:</strong> ${escapeHtml(lead.food.join(", "))}</p>` : ""}
    ${lead.page ? `<p><strong>Page:</strong> ${escapeHtml(lead.page)}</p>` : ""}
    <p>${escapeHtml(lead.comment).replace(/\n/g, "<br>")}</p>
  `;

  try {
    await sendSmtpMail({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.FROM_EMAIL,
      to: process.env.OWNER_EMAIL,
      replyTo: lead.email,
      subject,
      text,
      html
    });
    return { sent: true };
  } catch (error) {
    console.error("Email failed:", error.message);
    return { sent: false };
  }
}

async function sendSmtpMail(options) {
  const secure = options.port === 465;
  let socket = secure
    ? tls.connect(options.port, options.host, { servername: options.host })
    : net.connect(options.port, options.host);

  const reader = createSmtpReader(socket);
  await reader.expect([220]);
  await smtpCommand(socket, reader, `EHLO localhost`, [250]);

  if (!secure) {
    await smtpCommand(socket, reader, "STARTTLS", [220]);
    socket = tls.connect({ socket, servername: options.host });
    const tlsReader = createSmtpReader(socket);
    await smtpCommand(socket, tlsReader, `EHLO localhost`, [250]);
    await authenticate(socket, tlsReader, options);
    await sendMailData(socket, tlsReader, options);
    socket.end();
    return;
  }

  await authenticate(socket, reader, options);
  await sendMailData(socket, reader, options);
  socket.end();
}

async function authenticate(socket, reader, options) {
  const token = Buffer.from(`\u0000${options.user}\u0000${options.pass}`).toString("base64");
  await smtpCommand(socket, reader, `AUTH PLAIN ${token}`, [235]);
}

async function sendMailData(socket, reader, options) {
  await smtpCommand(socket, reader, `MAIL FROM:<${options.from}>`, [250]);
  await smtpCommand(socket, reader, `RCPT TO:<${options.to}>`, [250, 251]);
  await smtpCommand(socket, reader, "DATA", [354]);

  const boundary = `lead-${Date.now()}`;
  const message = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Reply-To: ${options.replyTo}`,
    `Subject: ${encodeHeader(options.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    options.text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    options.html,
    "",
    `--${boundary}--`,
    "."
  ].join("\r\n");

  await smtpCommand(socket, reader, message, [250]);
  await smtpCommand(socket, reader, "QUIT", [221]);
}

function createSmtpReader(socket) {
  let buffer = "";
  const waiters = [];

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    flush();
  });

  socket.on("error", (error) => {
    while (waiters.length) waiters.shift().reject(error);
  });

  function flush() {
    const lines = buffer.split(/\r?\n/);
    const complete = lines.find((line) => /^\d{3} /.test(line));
    if (!complete || !waiters.length) return;

    const response = buffer.slice(0, buffer.indexOf(complete) + complete.length);
    buffer = buffer.slice(response.length).replace(/^\r?\n/, "");
    waiters.shift().resolve(response);
  }

  return {
    expect(codes) {
      return new Promise((resolve, reject) => {
        waiters.push({
          resolve(response) {
            const code = Number(response.slice(0, 3));
            if (!codes.includes(code)) {
              reject(new Error(`SMTP expected ${codes.join("/")} but got ${response}`));
              return;
            }
            resolve(response);
          },
          reject
        });
        flush();
      });
    }
  };
}

async function smtpCommand(socket, reader, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  return reader.expect(expectedCodes);
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadDotEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
