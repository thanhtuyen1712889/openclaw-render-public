#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const outputPath = process.argv[2];

if (!outputPath) {
  console.error("usage: render-config.mjs <output-path>");
  process.exit(2);
}

function env(name, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

const stateDir = env("OPENCLAW_STATE_DIR", "/tmp/.openclaw");
const workspaceDir = env("OPENCLAW_WORKSPACE_DIR", "/tmp/workspace");
const gatewayToken = env("OPENCLAW_GATEWAY_TOKEN");
const primaryModel = env("OPENCLAW_PRIMARY_MODEL", "openai-codex/gpt-5.4");
const port = Number.parseInt(env("PORT", env("OPENCLAW_GATEWAY_PORT", "8080")), 10);
const allowedOrigin = env("OPENCLAW_ALLOWED_ORIGIN");

const controlUi = {
  allowInsecureAuth: envBool("OPENCLAW_ALLOW_INSECURE_AUTH", true),
};

if (allowedOrigin) {
  controlUi.allowedOrigins = [allowedOrigin];
}

if (envBool("OPENCLAW_ALLOW_HOST_HEADER_ORIGIN_FALLBACK", !allowedOrigin)) {
  controlUi.dangerouslyAllowHostHeaderOriginFallback = true;
}

const config = {
  agents: {
    defaults: {
      workspace: workspaceDir,
      memorySearch: { enabled: envBool("OPENCLAW_MEMORY_SEARCH_ENABLED", false) },
      model: { primary: primaryModel },
    },
  },
  gateway: {
    mode: "local",
    bind: "lan",
    port,
    auth: {
      mode: "token",
      token: gatewayToken,
    },
    controlUi,
    tailscale: {
      mode: "off",
      resetOnExit: false,
    },
  },
  tools: {
    profile: "coding",
  },
  commands: {
    native: "auto",
    nativeSkills: "auto",
    restart: true,
    ownerDisplay: "raw",
  },
  session: {
    dmScope: "per-channel-peer",
  },
  plugins: {
    entries: {},
  },
  channels: {},
};

if (envBool("ENABLE_TELEGRAM", false)) {
  config.channels.telegram = {
    enabled: true,
    dmPolicy: "pairing",
    groups: {
      "*": {
        requireMention: envBool("TELEGRAM_GROUP_REQUIRE_MENTION", true),
      },
    },
  };
  if (env("TELEGRAM_BOT_TOKEN")) {
    config.channels.telegram.botToken = env("TELEGRAM_BOT_TOKEN");
  }
}

if (envBool("ENABLE_GOOGLECHAT", false)) {
  config.plugins.entries.googlechat = { enabled: true };
  config.channels.googlechat = {
    enabled: true,
    serviceAccountFile: env(
      "GOOGLE_CHAT_SERVICE_ACCOUNT_FILE",
      "/etc/secrets/GOOGLE_CHAT_SERVICE_ACCOUNT_JSON",
    ),
    audienceType: env("GOOGLE_CHAT_AUDIENCE_TYPE", "app-url"),
    audience: env("GOOGLE_CHAT_AUDIENCE"),
    webhookPath: env("GOOGLE_CHAT_WEBHOOK_PATH", "/googlechat"),
    dm: { policy: "pairing" },
    groupPolicy: "allowlist",
    actions: { reactions: true },
    typingIndicator: "message",
    mediaMaxMb: 20,
  };
  if (env("GOOGLE_CHAT_BOT_USER")) {
    config.channels.googlechat.botUser = env("GOOGLE_CHAT_BOT_USER");
  }
}

if (envBool("ENABLE_ZALO", false)) {
  config.plugins.entries.zalo = { enabled: true };
  config.channels.zalo = {
    enabled: true,
    dmPolicy: "pairing",
    groupPolicy: "allowlist",
    mediaMaxMb: 5,
  };
  if (env("ZALO_BOT_TOKEN")) {
    config.channels.zalo.botToken = env("ZALO_BOT_TOKEN");
  }
  if (env("ZALO_MODE", "polling").toLowerCase() === "webhook") {
    if (env("ZALO_WEBHOOK_URL")) {
      config.channels.zalo.webhookUrl = env("ZALO_WEBHOOK_URL");
    }
    if (env("ZALO_WEBHOOK_SECRET")) {
      config.channels.zalo.webhookSecret = env("ZALO_WEBHOOK_SECRET");
    }
    if (env("ZALO_WEBHOOK_PATH")) {
      config.channels.zalo.webhookPath = env("ZALO_WEBHOOK_PATH");
    }
  }
}

if (envBool("ENABLE_LINE", false)) {
  config.plugins.entries.line = { enabled: true };
  config.channels.line = {
    enabled: true,
    dmPolicy: "pairing",
    webhookPath: env("LINE_WEBHOOK_PATH", "/line/webhook"),
  };
  if (env("LINE_CHANNEL_ACCESS_TOKEN")) {
    config.channels.line.channelAccessToken = env("LINE_CHANNEL_ACCESS_TOKEN");
  }
  if (env("LINE_CHANNEL_SECRET")) {
    config.channels.line.channelSecret = env("LINE_CHANNEL_SECRET");
  }
}

if (envBool("ENABLE_GMAIL_PUBSUB", false)) {
  const hookModel = env("GMAIL_HOOK_MODEL", primaryModel);
  config.hooks = {
    enabled: true,
    token: env("OPENCLAW_HOOK_TOKEN"),
    path: "/hooks",
    presets: ["gmail"],
    gmail: {
      account: env("GMAIL_ACCOUNT"),
      model: hookModel,
      thinking: env("GMAIL_HOOK_THINKING", "off"),
    },
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate:
          "New email from {{messages[0].from}}\\nSubject: {{messages[0].subject}}\\n{{messages[0].snippet}}\\n{{messages[0].body}}",
        model: hookModel,
        deliver: true,
        channel: env("GMAIL_DELIVER_CHANNEL", "last"),
      },
    ],
  };
  if (env("GMAIL_DELIVER_TO")) {
    config.hooks.mappings[0].to = env("GMAIL_DELIVER_TO");
  }
}

const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`wrote ${outputPath}`);
