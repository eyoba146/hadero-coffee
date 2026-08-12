import fs from "node:fs/promises";
import "dotenv/config";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const state = JSON.parse(await fs.readFile("data/db.json", "utf8"));
const response = await fetch(`${url}/rest/v1/app_state`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({ id: 1, state }),
});
if (!response.ok) throw new Error(`Migration failed (${response.status}): ${await response.text()}`);
console.log("Migrated data/db.json to Supabase app_state.");
