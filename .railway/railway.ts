import { defineRailway, github, project, service, volume } from "railway/iac";

const repository = process.env.TEMPLATE_REPOSITORY ?? "tech-progress/readeck-reading-desk";
const branch = process.env.TEMPLATE_BRANCH ?? "release-v1";
const rootDirectory = process.env.TEMPLATE_ROOT_DIR ?? "/";
if (branch.includes("/")) throw new Error("Railway release branches must not contain slashes");
if (!rootDirectory.startsWith("/")) throw new Error("TEMPLATE_ROOT_DIR must start with /");

export default defineRailway(() => {
  const appData = volume("Readeck Data", { sizeMB: 5000 });
  const app = service("Readeck", {
    source: github(repository, { branch, rootDirectory }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/healthz",
    healthcheckTimeout: 480,
    volumeMounts: { "/readeck": appData },
    env: {
      "PORT": "8000",
      "READECK_SECRET_KEY": { generator: 'secret(64, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")', preserveExisting: true },
      "READECK_OWNER_USERNAME": "owner",
      "READECK_OWNER_PASSWORD": { generator: 'secret(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")', preserveExisting: true },
      "READECK_OWNER_EMAIL": "",
      "READECK_SERVER_BASE_URL": "https://${{Readeck.RAILWAY_PUBLIC_DOMAIN}}",
      "READECK_ALLOWED_HOSTS": "${{Readeck.RAILWAY_PUBLIC_DOMAIN}},${{Readeck.RAILWAY_PRIVATE_DOMAIN}},healthcheck.railway.app",
      "READECK_WORKER_NUMBER": "2",
      "READECK_PUBLIC_SHARE_TTL": "1",
    },
  });
  return project("readeck-reading-desk", { resources: [app, appData] });
});
