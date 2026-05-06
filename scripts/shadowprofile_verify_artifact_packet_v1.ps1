param(
  [Parameter(Mandatory=$true)][string]$PacketDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

if(-not (Test-Path -LiteralPath $PacketDir)){ throw "PACKET_DIR_NOT_FOUND:$PacketDir" }

$manifest = Join-Path $PacketDir "manifest.json"
$packetIdTxt = Join-Path $PacketDir "packet_id.txt"
$sums = Join-Path $PacketDir "sha256sums.txt"

foreach($p in @($manifest,$packetIdTxt,$sums)){
  if(-not (Test-Path -LiteralPath $p)){ throw "PACKET_REQUIRED_FILE_MISSING:$p" }
}

$expectedId = Split-Path -Leaf $PacketDir
$actualId = (Get-Content -LiteralPath $packetIdTxt -Raw).Trim()
if($expectedId -ne $actualId){ throw "PACKET_ID_TXT_MISMATCH" }

$manifestText = Get-Content -LiteralPath $manifest -Raw
$manifestText = $manifestText.Replace("`r`n","`n").Replace("`r","`n").TrimEnd("`n")
$derived = Sha256Text $manifestText
if($derived -ne $expectedId){ throw "MANIFEST_HASH_MISMATCH" }

$lines = @(Get-Content -LiteralPath $sums | Where-Object { $_.Trim().Length -gt 0 })
foreach($line in $lines){
  if($line -notmatch '^([a-f0-9]{64})  (.+)$'){ throw "SHA256SUMS_BAD_LINE:$line" }
  $want = $Matches[1]
  $rel = $Matches[2].Replace("/","\")
  $full = Join-Path $PacketDir $rel
  if(-not (Test-Path -LiteralPath $full)){ throw "SHA256SUMS_FILE_MISSING:$rel" }
  $got = Sha256File $full
  if($got -ne $want){ throw "SHA256SUMS_HASH_MISMATCH:$rel" }
}

Write-Host "SHADOWPROFILE_PACKET_VERIFY_OK" -ForegroundColor Green
Write-Host $expectedId -ForegroundColor Cyan
