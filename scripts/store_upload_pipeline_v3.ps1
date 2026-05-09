Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Paths
$RepoRoot = "C:\dev\shadowprofile"
$ReleaseRoot = Join-Path $RepoRoot "shadowprofile_release"
$OutRoot = Join-Path $RepoRoot "shadowprofile_store_upload"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Out = Join-Path $OutRoot ("store_upload_" + $Stamp)

# Create output folder
New-Item -ItemType Directory -Force -Path $Out | Out-Null

# Browsers mapping
$Browsers = @(
    @{ name = "chrome"; zip = "shadowprofile_chrome.zip"; note = "Chrome / Brave" },
    @{ name = "firefox"; zip = "shadowprofile_firefox.zip"; note = "Firefox" },
    @{ name = "edge"; zip = "shadowprofile_edge.zip"; note = "Edge" },
    @{ name = "opera"; zip = "shadowprofile_opera.zip"; note = "Opera" }
)

# Verify SHA256 sums
$shaPath = Join-Path $ReleaseRoot "sha256sums.txt"
if(-not (Test-Path $shaPath)) { throw "MISSING_SHA256SUMS:$shaPath" }

foreach($line in Get-Content $shaPath) {
    if([string]::IsNullOrWhiteSpace($line)) { continue }
    if($line -notmatch '^([A-Fa-f0-9]{64})\s+(.+)$') { throw "BAD_SHA_LINE:$line" }

    $hash = $Matches[1].ToUpperInvariant()
    $name = $Matches[2].Trim()
    $file = Join-Path $ReleaseRoot $name
    if(-not (Test-Path $file)) { throw "MISSING_RELEASE_FILE:$file" }

    $got = (Get-FileHash $file -Algorithm SHA256).Hash.ToUpperInvariant()
    if($got -ne $hash) { throw "SHA_MISMATCH:$name" }
}

# Copy release assets per browser and write notes
foreach($b in $Browsers) {
    $Dir = Join-Path $Out $b.name
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null

    Copy-Item (Join-Path $ReleaseRoot $b.zip) $Dir -Force
    Copy-Item $shaPath $Dir -Force
    Copy-Item (Join-Path $ReleaseRoot "release_receipt.json") $Dir -Force -ErrorAction SilentlyContinue

    if(Test-Path (Join-Path $RepoRoot "docs")) {
        Copy-Item (Join-Path $RepoRoot "docs") $Dir -Recurse -Force
    }

    # Write store notes
    $note = @"
ShadowProfile Store Upload Package

Browser target: $($b.name)
Upload file: $($b.zip)
Note: $($b.note)

Core claims:
- Browser Baseline + Deep Inspect
- Local-first transparency tool
- No remote servers
- No analytics SDK
- User-initiated export artifacts only

Use the zip in this folder for store upload.
"@

    [System.IO.File]::WriteAllText(
        (Join-Path $Dir "UPLOAD_NOTES.txt"),
        $note,
        [System.Text.UTF8Encoding]::new($false)
    )
}

# Summary
$summary = @"
ShadowProfile store upload folders prepared.

Chrome + Brave:
$Out\chrome

Firefox:
$Out\firefox

Edge:
$Out\edge

Opera:
$Out\opera

Release root:
$ReleaseRoot
"@

[System.IO.File]::WriteAllText(
    (Join-Path $Out "STORE_UPLOAD_SUMMARY.txt"),
    $summary,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "SHADOWPROFILE_STORE_UPLOAD_V3_READY" -ForegroundColor Green
Write-Host $Out -ForegroundColor Cyan
