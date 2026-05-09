Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "C:\dev\shadowprofile"
$ReleaseRoot = "C:\dev\shadowprofile_release"
$StoreOutRoot = Join-Path $Root "shadowprofile_store_upload"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Out = Join-Path $StoreOutRoot ("store_upload_" + $Stamp)

function Write-Utf8NoBomLf {
  param([string]$Path,[string]$Text)
  $dir = Split-Path -Parent $Path
  if($dir){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $Text = $Text.Replace("`r`n","`n").Replace("`r","`n")
  if(-not $Text.EndsWith("`n")){ $Text += "`n" }
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

# 1. Clean ASCII / mojibake safely
$PatchFiles = @(
  (Join-Path $Root "extension\src\ui\popup\popup.js"),
  (Join-Path $Root "extension\src\ui\dashboard\dashboard.js"),
  (Join-Path $Root "extension\src\ui\newtab\newtab.js"),
  (Join-Path $Root "extension\src\ui\newtab_dashboard.js"),
  (Join-Path $Root "extension\src\ui\newtab_browser_baseline.js")
)

foreach($File in $PatchFiles){
  if(Test-Path -LiteralPath $File){
    $Text = Get-Content -LiteralPath $File -Raw
    $Text = $Text.Replace(([char]0x2014), "-")
    $Text = $Text.Replace(([char]0x2013), "-")
    $Text = $Text.Replace(([char]0x00B7), "|")
    $Text = $Text.Replace(([string]([char]0x00E2) + [char]0x20AC + [char]0x201D), "-")
    $Text = $Text.Replace(([string]([char]0x00C2) + [char]0x00B7), "|")
    Write-Utf8NoBomLf $File $Text
  }
}

# 2. Verify JS files that exist
$JsFiles = @(
  (Join-Path $Root "extension\src\background\service_worker.js"),
  (Join-Path $Root "extension\src\ui\popup\popup.js"),
  (Join-Path $Root "extension\src\content\content_entry.js"),
  (Join-Path $Root "extension\src\ui\dashboard\dashboard.js"),
  (Join-Path $Root "extension\src\ui\newtab\newtab.js"),
  (Join-Path $Root "extension\src\ui\newtab_dashboard.js"),
  (Join-Path $Root "extension\src\ui\newtab_browser_baseline.js")
)

foreach($Js in $JsFiles){
  if(Test-Path -LiteralPath $Js){
    node --check $Js
  }
}

# 3. Commit real changes only
git add extension/src/ui extension/src/background extension/src/content extension/manifest.json 2>$null
$status = git status --short
if($status){
  git commit -m "Fix ShadowProfile browser baseline release bugs"
} else {
  Write-Host "GIT_CLEAN_NO_COMMIT_NEEDED" -ForegroundColor Yellow
}

# 4. Rebuild packages
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File (Join-Path $Root "scripts\build_release_packages_v1.ps1") `
  -RepoRoot $Root

# 5. Verify release files
$shaPath = Join-Path $ReleaseRoot "sha256sums.txt"
if(-not (Test-Path -LiteralPath $shaPath)){ throw "MISSING_SHA256SUMS:$shaPath" }

foreach($line in @(Get-Content -LiteralPath $shaPath)){
  if([string]::IsNullOrWhiteSpace($line)){ continue }
  if($line -notmatch '^([A-Fa-f0-9]{64})\s+(.+)$'){ throw "BAD_SHA_LINE:$line" }

  $want = $Matches[1].ToUpperInvariant()
  $name = $Matches[2].Trim()
  $file = Join-Path $ReleaseRoot $name

  if(-not (Test-Path -LiteralPath $file)){ throw "MISSING_RELEASE_FILE:$file" }

  $got = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToUpperInvariant()
  if($got -ne $want){ throw "SHA_MISMATCH:$name" }
}

# 6. Prepare store upload folders
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$Browsers = @(
  @{ name = "chrome"; zip = "shadowprofile_chrome.zip"; note = "Chrome Web Store; Brave users can also install from Chrome Web Store." },
  @{ name = "firefox"; zip = "shadowprofile_firefox.zip"; note = "Firefox Add-ons." },
  @{ name = "edge"; zip = "shadowprofile_edge.zip"; note = "Microsoft Edge Add-ons." },
  @{ name = "opera"; zip = "shadowprofile_opera.zip"; note = "Opera Add-ons." },
  @{ name = "brave"; zip = "shadowprofile_brave.zip"; note = "Brave package / manual install." }
)

foreach($b in $Browsers){
  $Dir = Join-Path $Out $b.name
  New-Item -ItemType Directory -Force -Path $Dir | Out-Null

  $ZipPath = Join-Path $ReleaseRoot $b.zip
  if(Test-Path -LiteralPath $ZipPath){
    Copy-Item -LiteralPath $ZipPath -Destination $Dir -Force
  }

  Copy-Item -LiteralPath $shaPath -Destination $Dir -Force

  $Receipt = Join-Path $ReleaseRoot "release_receipt.json"
  if(Test-Path -LiteralPath $Receipt){
    Copy-Item -LiteralPath $Receipt -Destination $Dir -Force
  }

  $Docs = Join-Path $Root "docs"
  if(Test-Path -LiteralPath $Docs){
    Copy-Item -LiteralPath $Docs -Destination $Dir -Recurse -Force
  }

  $StoreAssets = Join-Path $Root "store_assets"
  if(Test-Path -LiteralPath $StoreAssets){
    Copy-Item -LiteralPath $StoreAssets -Destination $Dir -Recurse -Force
  }

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
- No cloud processing
- User-initiated export artifacts only

Use the zip in this folder for store upload.
"@

  Write-Utf8NoBomLf (Join-Path $Dir "UPLOAD_NOTES.txt") $note
}

$summary = @"
ShadowProfile store upload folders prepared.

Chrome:
$Out\chrome

Firefox:
$Out\firefox

Edge:
$Out\edge

Opera:
$Out\opera

Brave:
$Out\brave

Release root:
$ReleaseRoot
"@

Write-Utf8NoBomLf (Join-Path $Out "STORE_UPLOAD_SUMMARY.txt") $summary

# 7. Publish final bugfix tag
$Tag = "SHADOWPROFILE_FINAL_BUGFIX_STORE_READY_v1"

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File (Join-Path $Root "scripts\publish_release_candidate_v1.ps1") `
  -GitHubRepoUrl "https://github.com/ScrappyHub/shadowprofile.git" `
  -Tag $Tag

Write-Host "SHADOWPROFILE_FINAL_BUGFIX_STORE_READY_OK" -ForegroundColor Green
Write-Host $Out -ForegroundColor Cyan