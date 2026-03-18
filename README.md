# OpenClaw Render Public Host

Minimal deploy repo for running OpenClaw on Render with a public bind that
works behind Render's proxy.

It generates `openclaw.json` from environment variables at container startup
and can optionally copy an `AUTH_PROFILES_JSON` secret file into the agent
state so a remote host can reuse existing OpenClaw auth profiles.
