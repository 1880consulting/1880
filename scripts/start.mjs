/**
 * Starts the production server (the standalone build). Listens on PORT
 * (default 3000) on every network interface, unless BIND_HOST says otherwise.
 * Next's server reads HOSTNAME, which many hosts set to the machine's name.
 */
process.env.HOSTNAME = process.env.BIND_HOST || "0.0.0.0";
await import("../.next/standalone/server.js");
