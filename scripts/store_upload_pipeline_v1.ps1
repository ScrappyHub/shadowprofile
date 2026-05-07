Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = "C:\dev\shadowprofile"
$ReleaseRoot = "C:\dev\shadowprofile_release"
$OutRoot = "C:\dev\shadowprofile_store_upload"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Out = Join-Path $OutRoot ("store_upload_" + $Stamp)

New-Item -ItemType Directory -Force -Path $Out | Out-Null

$Browsers = @(
  @{ name = "chrome"; zip = "shadowprofile_chrome.zip"; note = "Chrome Web Store. Also covers Brave users." },
  @{ name = "firefox"; zip = "shadowprofile_firefox.zip"; note = "Firefox Add-ons Developer Hub." },
  @{ name = "edge"; zip = "shadowprofile_edge.zip"; note = "Microsoft Partner Center / Edge Add-ons." },
  @{ name = "opera"; zip = "shadowprofile_opera.zip"; note = "Opera Add-ons Developer portal." }
)

$shaPath = Join-Path $ReleaseRoot "sha256sums.txt"
if(-not (Test-Path $shaPath)){ throw "MISSING_SHA256SUMS:$shaPath" }

foreach($line in @(Get-Content $shaPath)){
  if($line.Trim().Length -eq 0){ continue }

  if($line -notmatch '^([A-Fa-f0-9]{64})\s+(.+)$'){
    throw "BAD_SHA_LINE:$line"
  }

  $want = $Matches[1].ToUpperInvariant()
  $name = $Matches[2].Trim()
  $file = Join-Path $ReleaseRoot $name

  if(-not (Test-Path $file)){ throw "MISSING_RELEASE_FILE:$file" }

  $got = (Get-FileHash $file -Algorithm SHA256).Hash.ToUpperInvariant()
  if($got -ne $want){ throw "SHA_MISMATCH:$name" }
}

foreach($b in $Browsers){
  $Dir = Join-Path $Out $b.name
  New-Item -ItemType Directory -Force -Path $Dir | Out-Null

  Copy-Item (Join-Path $ReleaseRoot $b.zip) $Dir -Force
  Copy-Item (Join-Path $ReleaseRoot "sha256sums.txt") $Dir -Force
  Copy-Item (Join-Path $ReleaseRoot "release_receipt.json") $Dir -Force -ErrorAction SilentlyContinue

  if(Test-Path (Join-Path $RepoRoot "docs")){
    Copy-Item (Join-Path $RepoRoot "docs") $Dir -Recurse -Force
  }

  $note = @"
ShadowProfile Store Upload Package

Browser target: $($b.name)
Upload file: $($b.zip)
Note: $($b.note)

Core claims:
- Local-first browser transparency tool
- No remote servers
- No analytics SDK
- No cloud processing
- User-initiated export artifacts only

Use the zip in this folder for the store upload.
"@

  [System.IO.File]::WriteAllText(
    (Join-Path $Dir "UPLOAD_NOTES.txt"),
    $note,
    [System.Text.UTF8Encoding]::new($false)
  )
}

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

Write-Host "SHADOWPROFILE_STORE_UPLOAD_PACK_READY" -ForegroundColor Green
Write-Host $Out -ForegroundColor Cyan
