param(
  [Parameter(Mandatory=$true)][string]$ArtifactJson,
  [string]$RepoRoot = "C:\dev\shadowprofile",
  [string]$OutRoot = "C:\dev\shadowprofile\packets\shadowprofile_artifacts"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Utf8NoBomLf([string]$Path,[string]$Text){
  $dir = Split-Path -Parent $Path
  if($dir){ New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  if(-not $Text.EndsWith("`n")){ $Text += "`n" }
  $Text = $Text.Replace("`r`n","`n").Replace("`r","`n")
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

function Sha256File([string]$Path){
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $fs = [System.IO.File]::OpenRead($Path)
    try { return ([BitConverter]::ToString($sha.ComputeHash($fs)).Replace("-","").ToLowerInvariant()) }
    finally { $fs.Dispose() }
  } finally { $sha.Dispose() }
}

function Sha256Text([string]$Text){
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes)).Replace("-","").ToLowerInvariant()) }
  finally { $sha.Dispose() }
}

function CanonJson($Value){
  if($null -eq $Value){ return "null" }
  if($Value -is [string]){ return ConvertTo-Json $Value -Compress }
  if($Value -is [bool]){ if($Value){ return "true" } return "false" }
  if($Value -is [int] -or $Value -is [long] -or $Value -is [double] -or $Value -is [decimal]){
    return ([System.Convert]::ToString($Value,[System.Globalization.CultureInfo]::InvariantCulture))
  }
  if($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string]) -and -not ($Value -is [System.Collections.IDictionary]) -and -not ($Value -is [pscustomobject])){
    $parts = @()
    foreach($x in $Value){ $parts += (CanonJson $x) }
    return "[" + ($parts -join ",") + "]"
  }

  $props = @{}
  if($Value -is [System.Collections.IDictionary]){
    foreach($k in $Value.Keys){ $props[[string]$k] = $Value[$k] }
  } else {
    foreach($p in $Value.PSObject.Properties){ $props[$p.Name] = $p.Value }
  }

  $items = @()
  foreach($k in @($props.Keys | Sort-Object)){
    $items += ((ConvertTo-Json ([string]$k) -Compress) + ":" + (CanonJson $props[$k]))
  }
  return "{" + ($items -join ",") + "}"
}

if(-not (Test-Path -LiteralPath $ArtifactJson)){ throw "ARTIFACT_JSON_NOT_FOUND:$ArtifactJson" }

$artifactRaw = Get-Content -LiteralPath $ArtifactJson -Raw
$artifact = $artifactRaw | ConvertFrom-Json

$artifactHash = Sha256File $ArtifactJson
$declaredHash = ""
if($artifact.integrity -and $artifact.integrity.artifact_sha256){
  $declaredHash = [string]$artifact.integrity.artifact_sha256
}

$manifestObj = [ordered]@{
  packet_schema = "shadowprofile.artifact_packet.v1"
  packet_constitution = "pcv1_option_a_manifest_hash"
  created_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  producer = "ShadowProfile"
  artifact_type = [string]$artifact.artifact_type
  artifact_domain = [string]$artifact.domain
  artifact_declared_sha256 = $declaredHash
  artifact_file_sha256 = $artifactHash
  payload = [ordered]@{
    artifact_json = "payload/artifact.json"
  }
}

$manifestCanon = CanonJson $manifestObj
$packetId = Sha256Text $manifestCanon
$packetDir = Join-Path $OutRoot $packetId
New-Item -ItemType Directory -Force -Path (Join-Path $packetDir "payload") | Out-Null

Write-Utf8NoBomLf (Join-Path $packetDir "manifest.json") $manifestCanon
Write-Utf8NoBomLf (Join-Path $packetDir "packet_id.txt") $packetId

Copy-Item -LiteralPath $ArtifactJson -Destination (Join-Path $packetDir "payload\artifact.json") -Force

$sumLines = @()
foreach($rel in @("manifest.json","packet_id.txt","payload/artifact.json")){
  $full = Join-Path $packetDir $rel
  $sumLines += ((Sha256File $full) + "  " + ($rel.Replace("\","/")))
}
Write-Utf8NoBomLf (Join-Path $packetDir "sha256sums.txt") (($sumLines -join "`n") + "`n")

Write-Host "SHADOWPROFILE_PACKET_BUILD_OK" -ForegroundColor Green
Write-Host $packetDir -ForegroundColor Cyan
