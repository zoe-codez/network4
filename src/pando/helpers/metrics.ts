import { Counter, Gauge, Summary } from "prom-client";

export const BORG_ARCHIVE_SIZE = new Gauge({
  help: "Borg archive size in bytes",
  labelNames: ["device", "type"],
  name: "borg_archive_size_bytes",
});


export const BORG_DEVICE_LAST_BACKUP = new Gauge({
  help: "Timestamp of device last backup",
  labelNames: ["device", "archive_name"],
  name: "borg_device_last_backup",
});

export const BORG_DEVICE_LAST_OFFSITE = new Gauge({
  help: "Timestamp of device last offsite backup",
  labelNames: ["device"],
  name: "borg_device_last_offsite",
});

export const CAMBIUM_DEVICE_LAST_DEPLOY = new Gauge({
  help: "Timestamp of the last cambium deploy to a device",
  labelNames: ["device"],
  name: "cambium_device_last_deploy",
});

export const BORG_DEVICE_BACKUP_FAILED = new Gauge({
  help: "Backup failure occurred for some reason",
  labelNames: ["device", "archive_name"],
  name: "borg_device_backup_failed",
});

export const PANDO_REFRESH_PROXYMANAGER_TOKEN = new Gauge({
  help: "Refresh timestamp for nginx proxy manager auth tokens",
  name: "pando_refresh_proxymanager_token",
});

export const PANDO_UPDATE_PROXYMANAGER_HOSTS = new Gauge({
  help: "A modification to the internal proxy was performed",
  labelNames: ["operation", "host"],
  name: "pando_update_proxymanager_hosts",
});

export const PANDO_GENERATE_OPENAI_MESSAGE = new Gauge({
  help: "Event markers for when messages are generated via openai",
  labelNames: ["message_type"],
  name: "pando_generate_openai_message",
});

export const PANDO_MATRIX_RENDER_OUTCOME = new Counter({
  help: "Outcomes of the various render calls",
  labelNames: ["outcome"],
  name: "pando_matrix_render_outcome",
});

export const DASHBOARD_FRAME_BUILD_TIME = new Summary({
  help: "Measures the duration of each cron job or interval execution",
  name: "pando_dashboard_frame_build_time",
  percentiles: [0.5, 0.9, 0.99],
});
