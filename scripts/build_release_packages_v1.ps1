param(
  [string]$RepoRoot = "C:\dev\shadowprofile",
  [string]$DistRoot = "C:\dev\shadowprofile_dist",
  [string]$ReleaseRoot = "C:\dev\shadowprofile_release"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Utf8NoBomLf([string]$Path,[string]$Text){
  $Dir = Split-Path -Parent $Path

  if($Dir){
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
  }

  $Text = $Text.Replace("`r`n","`n").Replace("`r","`n")

  if(-not $Text.EndsWith("`n")){
    $Text += "`n"
  }

  [System.IO.File]::WriteAllText(
    $Path,
    $Text,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Sha256File([string]$Path){
  $sha = [System.Security.Cryptography.SHA256]::Create()

  try {
    $fs = [System.IO.File]::OpenRead($Path)

    try {
      return ([BitConverter]::ToString(
        $sha.ComputeHash($fs)
      ).Replace("-","").ToLowerInvariant())
    }
    finally {
      $fs.Dispose()
    }
  }
  finally {
    $sha.Dispose()
  }
}

function Apply-ManifestPatch(
  [string]$ManifestPath,
  [string]$PatchPath
){
  $m = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  $p = Get-Content -LiteralPath $PatchPath -Raw | ConvertFrom-Json

  if($p.background){
    $m.background = $p.background
  }

  if($p.browser_specific_settings){
    if(-not $m.browser_specific_settings){
      $m | Add-Member `
        -NotePropertyName browser_specific_settings `
        -NotePropertyValue $p.browser_specific_settings
    }
    else {
      $m.browser_specific_settings = $p.browser_specific_settings
    }
  }
  else {
    if($m.PSObject.Properties.Name -contains "browser_specific_settings"){
      $m.PSObject.Properties.Remove("browser_specific_settings")
    }
  }

  $json = $m | ConvertTo-Json -Depth 30
  Write-Utf8NoBomLf $ManifestPath $json
}

function Build-Target(
  [string]$Name,
  [string]$Patch
){
  $ExtRoot = Join-Path $RepoRoot "extension"
  $Target = Join-Path $DistRoot $Name

  Remove-Item -Recurse -Force $Target -ErrorAction SilentlyContinue

  New-Item -ItemType Directory -Force -Path $Target | Out-Null

  robocopy $ExtRoot $Target /E | Out-Null

  Apply-ManifestPatch `
    -ManifestPath (Join-Path $Target "manifest.json") `
    -PatchPath $Patch

  node --check (Join-Path $Target "src\background\service_worker.js")
  node --check (Join-Path $Target "src\ui\popup\popup.js")
  node --check (Join-Path $Target "src\evidence\portable_session_artifact.js")

  $Zip = Join-Path $ReleaseRoot ($Name + ".zip")

  Compress-Archive `
    -Path (Join-Path $Target "*") `
    -DestinationPath $Zip `
    -Force

  return $Zip
}

Remove-Item -Recurse -Force $DistRoot -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $ReleaseRoot -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Force -Path `
  $DistRoot,
  $ReleaseRoot | Out-Null

$ChromiumPatch = Join-Path `
  $RepoRoot `
  "build\browser-adapters\chromium.manifest.patch.json"

$FirefoxPatch = Join-Path `
  $RepoRoot `
  "build\browser-adapters\firefox.manifest.patch.json"

$zips = @()

foreach($name in @(
  "shadowprofile_chrome",
  "shadowprofile_edge",
  "shadowprofile_brave",
  "shadowprofile_opera"
)){
  $zips += Build-Target `
    -Name $name `
    -Patch $ChromiumPatch
}

$zips += Build-Target `
  -Name "shadowprofile_firefox" `
  -Patch $FirefoxPatch

$sumLines = @()

foreach($zip in $zips){
  $sumLines += (
    (Sha256File $zip) +
    "  " +
    (Split-Path -Leaf $zip)
  )
}

Write-Utf8NoBomLf `
  (Join-Path $ReleaseRoot "sha256sums.txt") `
  ($sumLines -join "`n")

$receipt = [ordered]@{
  event_type = "shadowprofile.release.packages.built.v1"
  created_at_utc = (
    Get-Date
  ).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

  dist_root = $DistRoot
  release_root = $ReleaseRoot

  packages = @(
    $zips | ForEach-Object {
      Split-Path -Leaf $_
    }
  )
}

Write-Utf8NoBomLf `
  (Join-Path $ReleaseRoot "release_receipt.json") `
  ($receipt | ConvertTo-Json -Depth 20)

Write-Host "SHADOWPROFILE_RELEASE_PACKAGES_BUILT_OK" -ForegroundColor Green
Write-Host $ReleaseRoot -ForegroundColor Cyan
