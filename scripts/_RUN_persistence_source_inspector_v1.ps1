Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "C:\dev\shadowprofile"
$ReasoningJs = "$Root\extension\src\ui\popup_v2\mirror_reasoning.js"
$PopupJs = "$Root\extension\src\ui\popup_v2\popup_v2.js"
$WorkbenchJs = "$Root\extension\src\ui\workbench\workbench.js"

function WriteUtf8NoBomLf([string]$Path,[string]$Text){
  $Text = $Text.Replace("`r`n","`n").Replace("`r","`n")
  if(-not $Text.EndsWith("`n")){ $Text += "`n" }
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

$R = Get-Content $ReasoningJs -Raw

if($R -notmatch "inspectPersistenceSources"){
  $AddLines = @(
    '',
    'export function inspectPersistenceSources(domain, state = {}) {',
    '  const counts = state.counts || {};',
    '  const signals = state.signal_breakdown || {};',
    '',
    '  const cookieEvents = Number(counts.cookie_events || 0);',
    '  const storageEvents = Number(counts.storage_events || 0);',
    '  const totalEvents = Number(counts.total_events || 0);',
    '  const userActions = Number(counts.user_action_events || 0);',
    '',
    '  const sources = [];',
    '',
    '  if (cookieEvents > 0) sources.push("cookies");',
    '  if (storageEvents > 0) sources.push("site storage");',
    '  if (totalEvents > 0) sources.push("observed activity");',
    '  if (userActions > 0) sources.push("user actions");',
    '',
    '  for (const [name, count] of Object.entries(signals)) {',
    '    if (Number(count || 0) > 0) {',
    '      sources.push(name.replaceAll("_", " "));',
    '    }',
    '  }',
    '',
    '  const profileState =',
    '    cookieEvents > 0 || storageEvents > 0',
    '      ? "existing"',
    '      : totalEvents > 0',
    '        ? "building"',
    '        : "new";',
    '',
    '  const headline =',
    '    profileState === "existing"',
    '      ? "This site already left browser-visible memory."',
    '      : profileState === "building"',
    '        ? "ShadowProfile is building this mirror from live activity."',
    '        : "No strong browser-visible memory found yet."; ',
    '',
    '  return {',
    '    profile_state: profileState,',
    '    headline,',
    '    sources: [...new Set(sources.length ? sources : ["no strong sources yet"])],',
    '    wipe_effects: [',
    '      "clears ShadowProfile local mirror for this site",',
    '      "resets inferred profile confidence",',
    '      "can remove browser-visible cookies or storage only when browser permission allows"',
    '    ],',
    '    wipe_limits: [',
    '      "does not delete data stored on the website servers",',
    '      "does not delete account history held by the website",',
    '      "does not erase third-party records outside browser-visible storage"',
    '    ]',
    '  };',
    '}',
    ''
  )
  $R = $R + ($AddLines -join "`n")
}

WriteUtf8NoBomLf $ReasoningJs $R

$P = Get-Content $PopupJs -Raw
$P = $P.Replace('import { inferMirrorProfile } from "./mirror_reasoning.js";','import { inferMirrorProfile, inspectPersistenceSources } from "./mirror_reasoning.js";')

if($P -notmatch "inspectPersistenceSources"){ throw "POPUP_IMPORT_PATCH_FAILED" }

if($P -notmatch "persistenceInfo"){
  $P = $P.Replace('const mirror = buildMirror(domain,state);','const mirror = buildMirror(domain,state); const persistenceInfo = inspectPersistenceSources(domain,state);')
  $P = $P.Replace('setTextSafe("whyText", "Sites use patterns like these to personalize, rank, recommend, and predict what you may do next. ShadowProfile keeps this mirror local on your device.");','setTextSafe("whyText", persistenceInfo.headline + " Wiping resets ShadowProfile local mirror and browser-visible memory when permitted. It cannot erase data already stored on the website servers.");')
}

WriteUtf8NoBomLf $PopupJs $P

$W = Get-Content $WorkbenchJs -Raw
if($W -notmatch "wipe_limits"){
  $W = $W.Replace('"totals": {','"persistence_explanation": "ShadowProfile shows browser-visible memory and live activity. Wiping clears the local mirror and permitted browser storage. It does not erase server-side account data.",' + "`n" + '    "wipe_effects": ["clears local mirror", "resets confidence", "removes visible cookies/storage when permitted"],' + "`n" + '    "wipe_limits": ["does not erase website server records", "does not erase account history held by the website", "does not erase third-party records outside browser storage"],' + "`n" + '    "totals": {')
}

WriteUtf8NoBomLf $WorkbenchJs $W

node --check $ReasoningJs
node --check $PopupJs
node --check $WorkbenchJs

git add extension/src/ui/popup_v2/mirror_reasoning.js extension/src/ui/popup_v2/popup_v2.js extension/src/ui/workbench/workbench.js
git commit -m "Add persistence source inspector and wipe explanation"

Write-Host "SHADOWPROFILE_PERSISTENCE_SOURCE_INSPECTOR_V1_OK" -ForegroundColor Green
