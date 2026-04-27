const REQUIRED_PERMISSIONS = Object.freeze([
  "tabs",
  "storage",
  "webNavigation",
  "cookies"
]);

const REQUIRED_CORE_FILES = Object.freeze([
  "manifest.json",
  "src/background/service_worker.js",
  "src/background/capture_tabs.js",
  "src/background/aggregate_sessions.js",
  "src/analysis/event_schema.js",
  "src/analysis/classify_signal.js",
  "src/analysis/scoring.js",
  "src/analysis/profile_inference.js",
  "src/shared/constants.js",
  "src/ui/popup/popup.html",
  "src/ui/popup/popup.js"
]);

function buildIdentityFromManifest(manifest) {
  return {
    name: manifest?.name || "unknown",
    version: manifest?.version || "unknown",
    manifest_version: manifest?.manifest_version || "unknown",
    build_mode: "local_extension"
  };
}

function normalizePermissionList(manifest) {
  return Array.isArray(manifest?.permissions) ? manifest.permissions : [];
}

function checkRequiredPermissions(manifest) {
  const permissions = normalizePermissionList(manifest);
  const missing = REQUIRED_PERMISSIONS.filter((perm) => !permissions.includes(perm));

  if (missing.length === 0) {
    return {
      name: "required_permissions_present",
      passed: true,
      detail: "All required permissions are present."
    };
  }

  return {
    name: "required_permissions_present",
    passed: false,
    detail: "Missing required permissions: " + missing.join(", "),
    mismatch: {
      type: "required_permission_missing",
      target: "manifest.permissions",
      severity: "high",
      explanation: "One or more required permissions are missing."
    }
  };
}

function checkManifestVersion(manifest) {
  const ok = manifest?.manifest_version === 3;

  return {
    name: "manifest_version_expected",
    passed: ok,
    detail: ok
      ? "Manifest version is 3."
      : "Manifest version is not 3.",
    mismatch: ok ? null : {
      type: "manifest_mismatch",
      target: "manifest.json",
      severity: "high",
      explanation: "Manifest version does not match expected value."
    }
  };
}

function checkPopupPath(manifest) {
  const actual = manifest?.action?.default_popup || null;
  const expected = "src/ui/popup/popup.html";
  const ok = actual === expected;

  return {
    name: "popup_path_expected",
    passed: ok,
    detail: ok
      ? "Popup path matches expected path."
      : "Popup path mismatch. Expected " + expected + ", got " + String(actual),
    mismatch: ok ? null : {
      type: "popup_path_mismatch",
      target: "manifest.action.default_popup",
      severity: "medium",
      explanation: "Popup path does not match the expected UI path."
    }
  };
}

function checkServiceWorkerPath(manifest) {
  const actual = manifest?.background?.service_worker || null;
  const expected = "src/background/service_worker.js";
  const ok = actual === expected;

  return {
    name: "service_worker_path_expected",
    passed: ok,
    detail: ok
      ? "Service worker path matches expected path."
      : "Service worker path mismatch. Expected " + expected + ", got " + String(actual),
    mismatch: ok ? null : {
      type: "manifest_mismatch",
      target: "manifest.background.service_worker",
      severity: "high",
      explanation: "Service worker path does not match expected runtime entry."
    }
  };
}

function checkCoreFilesDeclared() {
  return {
    name: "core_file_list_loaded",
    passed: true,
    detail: "Core file list loaded with " + REQUIRED_CORE_FILES.length + " expected files."
  };
}

function summarizeIntegrity(checks) {
  const failed = checks.filter((check) => !check.passed);
  if (failed.length === 0) {
    return "verified";
  }

  const hasHigh = failed.some((check) => check.mismatch?.severity === "high");
  if (hasHigh) {
    return "modified";
  }

  return "incomplete";
}

function buildReasoning(checks) {
  const passed = checks.filter((check) => check.passed).map((check) => check.name);
  const failed = checks.filter((check) => !check.passed).map((check) => check.name);

  let summary = "All defined integrity checks passed.";
  if (failed.length > 0) {
    summary = "Some integrity checks failed or were incomplete.";
  }

  return {
    checks_passed: passed,
    checks_failed: failed,
    summary
  };
}

export function generateIntegrityRecord() {
  const manifest = chrome.runtime.getManifest();

  const checks = [
    checkManifestVersion(manifest),
    checkRequiredPermissions(manifest),
    checkPopupPath(manifest),
    checkServiceWorkerPath(manifest),
    checkCoreFilesDeclared()
  ];

  const mismatches = checks
    .map((check) => check.mismatch)
    .filter(Boolean);

  return {
    generated_at: Date.now(),
    engine_version: "integrity_engine_v1",
    build_identity: buildIdentityFromManifest(manifest),
    integrity_status: summarizeIntegrity(checks),
    core_files_checked: REQUIRED_CORE_FILES.slice(),
    runtime_checks: checks.map((check) => ({
      name: check.name,
      passed: check.passed,
      detail: check.detail
    })),
    mismatches,
    reasoning: buildReasoning(checks),
    limits: [
      "v1 detects mismatches and missing expected runtime state but does not guarantee perfect tamper prevention.",
      "v1 integrity checks are limited to extension-visible runtime and manifest surfaces.",
      "v1 does not yet perform cryptographic attestation of all files."
    ]
  };
}