param(
  [string]$RepoRoot = "C:\dev\shadowprofile",
  [string]$ReleaseRoot = "C:\dev\shadowprofile_release",
  [string]$GitHubRepoUrl = "",
  [string]$Branch = "master",
  [string]$Tag = "SHADOWPROFILE_PUBLIC_RELEASE_FULL_v1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($m){ throw $m }

Set-Location $RepoRoot

if(-not (Test-Path ".git")){ Fail "NOT_A_GIT_REPO:$RepoRoot" }
if(-not (Test-Path $ReleaseRoot)){ Fail "RELEASE_ROOT_NOT_FOUND:$ReleaseRoot" }

$required = @(
  "shadowprofile_chrome.zip",
  "shadowprofile_edge.zip",
  "shadowprofile_brave.zip",
  "shadowprofile_opera.zip",
  "shadowprofile_firefox.zip",
  "sha256sums.txt"
)

foreach($file in $required){
  $p = Join-Path $ReleaseRoot $file
  if(-not (Test-Path $p)){ Fail "MISSING_RELEASE_FILE:$p" }
}

# Verify SHA256
$sumPath = Join-Path $ReleaseRoot "sha256sums.txt"
$lines = @(Get-Content $sumPath | Where-Object { $_.Trim().Length -gt 0 })

foreach($line in $lines){
  if($line -notmatch '^([A-Fa-f0-9]{64})\s+(.+)$'){
    Fail "BAD_SHA256SUM_LINE:$line"
  }

  $want = $Matches[1].ToUpperInvariant()
  $name = $Matches[2].Trim()
  $filePath = Join-Path $ReleaseRoot $name

  if(-not (Test-Path $filePath)){ Fail "SHA_FILE_MISSING:$name" }

  $got = (Get-FileHash $filePath -Algorithm SHA256).Hash.ToUpperInvariant()
  if($got -ne $want){ Fail "SHA_MISMATCH:$name" }
}

# Ensure release receipt exists
$receiptPath = Join-Path $ReleaseRoot "release_receipt.json"
if(-not (Test-Path $receiptPath)){
  $receipt = [ordered]@{
    event_type = "shadowprofile.public_release_candidate.v1"
    tag = $Tag
    created_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    release_root = $ReleaseRoot
    files = @(Get-ChildItem $ReleaseRoot -File | Sort-Object Name | ForEach-Object { $_.Name })
    sha256sums = @(Get-Content $sumPath)
  }

  $receipt | ConvertTo-Json -Depth 20 |
    Set-Content $receiptPath -Encoding utf8
}

# Backup upload-ready release
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = "C:\dev\shadowprofile_backup\github_upload_ready_$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
robocopy $ReleaseRoot $backup /E | Out-Null

# Configure origin if missing
$origin = ""
try { $origin = git remote get-url origin 2>$null } catch { $origin = "" }

if([string]::IsNullOrWhiteSpace($origin)){
  if([string]::IsNullOrWhiteSpace($GitHubRepoUrl)){
    Write-Host "NO_ORIGIN_CONFIGURED" -ForegroundColor Yellow
    Write-Host "Run again with -GitHubRepoUrl https://github.com/YOUR_USER/shadowprofile.git" -ForegroundColor Yellow
  } else {
    git remote add origin $GitHubRepoUrl
    Write-Host "ORIGIN_ADDED:$GitHubRepoUrl" -ForegroundColor Green
  }
}

# Commit release receipt if changed, but do not force commit if clean
git add docs README.md website scripts build extension .gitignore 2>$null

# release artifacts live outside repo root
# do NOT git add external release files
Write-Host "SKIP_GIT_ADD_EXTERNAL_RELEASE_ARTIFACTS" -ForegroundColor Yellow

$dirty = git status --short
if($dirty){
  git commit -m "Finalize ShadowProfile public release candidate assets"
} else {
  Write-Host "GIT_CLEAN_NO_COMMIT_NEEDED" -ForegroundColor Green
}

# Tag safely
$existingTag = git tag --list $Tag
if($existingTag){
  Write-Host "TAG_ALREADY_EXISTS:$Tag" -ForegroundColor Yellow
} else {
  git tag $Tag
  Write-Host "TAG_CREATED:$Tag" -ForegroundColor Green
}

# Push if origin exists
$origin = ""
try { $origin = git remote get-url origin 2>$null } catch { $origin = "" }

if(-not [string]::IsNullOrWhiteSpace($origin)){
  git push origin $Branch
  git push origin $Tag
  Write-Host "GIT_PUSH_OK" -ForegroundColor Green
} else {
  Write-Host "SKIPPED_PUSH_NO_ORIGIN" -ForegroundColor Yellow
}

# GitHub release if gh exists and authenticated
$gh = Get-Command gh -ErrorAction SilentlyContinue
if($gh){
  $authOk = $false
  try {
    gh auth status | Out-Null
    if($LASTEXITCODE -eq 0){ $authOk = $true }
  } catch {
    $authOk = $false
  }

  if($authOk){
    $existingRelease = ""
    try { $existingRelease = gh release view $Tag --json tagName 2>$null } catch { $existingRelease = "" }

    $assets = @(
      (Join-Path $ReleaseRoot "shadowprofile_chrome.zip"),
      (Join-Path $ReleaseRoot "shadowprofile_edge.zip"),
      (Join-Path $ReleaseRoot "shadowprofile_brave.zip"),
      (Join-Path $ReleaseRoot "shadowprofile_opera.zip"),
      (Join-Path $ReleaseRoot "shadowprofile_firefox.zip"),
      (Join-Path $ReleaseRoot "sha256sums.txt"),
      (Join-Path $ReleaseRoot "release_receipt.json")
    )

    if($existingRelease){
      gh release upload $Tag @assets --clobber
      Write-Host "GITHUB_RELEASE_ASSETS_UPLOADED_OK" -ForegroundColor Green
    } else {
      gh release create $Tag @assets `
        --title "ShadowProfile Public Release Candidate v1" `
        --notes "Local-first browser transparency tool. No remote servers. Cross-browser release packages with SHA-256 sums and release receipt."
      Write-Host "GITHUB_RELEASE_CREATED_OK" -ForegroundColor Green
    }
  } else {
    Write-Host "GH_NOT_AUTHENTICATED_SKIP_RELEASE" -ForegroundColor Yellow
    Write-Host "Run: gh auth login" -ForegroundColor Yellow
  }
} else {
  Write-Host "GH_NOT_INSTALLED_SKIP_RELEASE" -ForegroundColor Yellow
}

Write-Host "SHADOWPROFILE_PUBLISH_PIPELINE_OK" -ForegroundColor Green
Write-Host "UPLOAD_READY_BACKUP:$backup" -ForegroundColor Cyan
Write-Host "RELEASE_ROOT:$ReleaseRoot" -ForegroundColor Cyan
