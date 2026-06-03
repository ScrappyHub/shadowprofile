Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "C:\dev\shadowprofile"
$Html = "$Root\extension\src\ui\popup_v2\popup_v2.html"
$JsPath = "$Root\extension\src\ui\popup_v2\popup_v2.js"

function Write-Utf8NoBomLf {
  param([string]$Path,[string]$Text)
  $Text = $Text.Replace("`r`n","`n").Replace("`r","`n")
  if(-not $Text.EndsWith("`n")){ $Text += "`n" }
  [System.IO.File]::WriteAllText($Path,$Text,[System.Text.UTF8Encoding]::new($false))
}

$H = Get-Content $Html -Raw
$H = $H.Replace("Ã¢â€”Å½","SP")
$H = $H.Replace("ÃƒÂ¢Ã¢â€šÂ¬Ã…Â½","SP")
$H = $H.Replace("â—Ž","SP")
$H = $H.Replace("◎","SP")
$H = [regex]::Replace($H,'<div class="site-icon">.*?</div>','<div class="site-icon">SP</div>')
Write-Utf8NoBomLf $Html $H

$Js = Get-Content $JsPath -Raw

$Js = $Js.Replace(
  'domain.includes("amazon") || domain.includes("ebay") || signals.cart || signals.checkout',
  'domain.includes("amazon") || domain.includes("ebay") || domain.includes("walgreens") || domain.includes("cvs") || domain.includes("riteaid") || domain.includes("walmart") || domain.includes("target") || signals.cart || signals.checkout'
)

$Js = $Js.Replace(
  'title = "Shopping Interest Profile";',
  'title = domain.includes("walgreens") || domain.includes("cvs") || domain.includes("riteaid") ? "Pharmacy / Personal Care Profile" : "Shopping Interest Profile";'
)

$Js = $Js.Replace(
  'summary = "Platforms may see you as someone exploring products, comparing options, or likely to respond to shopping prompts.";',
  'summary = domain.includes("walgreens") || domain.includes("cvs") || domain.includes("riteaid") ? "This site may see you as someone browsing pharmacy, health, wellness, or personal care products." : "Platforms may see you as someone exploring products, comparing options, or likely to respond to shopping prompts.";'
)

$Js = $Js.Replace(
  'interests.push("shopping", "product research", "comparison browsing");',
  'if(domain.includes("walgreens") || domain.includes("cvs") || domain.includes("riteaid")){ interests.push("pharmacy", "personal care", "wellness browsing"); } else { interests.push("shopping", "product research", "comparison browsing"); }'
)

$Js = $Js.Replace(
  'doing.push("exploring products", "comparing options", "showing purchase intent");',
  'if(domain.includes("walgreens") || domain.includes("cvs") || domain.includes("riteaid")){ doing.push("browsing health products", "checking personal care items", "exploring pharmacy services"); } else { doing.push("exploring products", "comparing options", "showing purchase intent"); }'
)

Write-Utf8NoBomLf $JsPath $Js

node --check $JsPath
node --check "$Root\extension\src\ui\workbench\workbench.js"

git add extension/src/ui/popup_v2/popup_v2.html extension/src/ui/popup_v2/popup_v2.js
git commit -m "Fix popup icon mojibake and add pharmacy profile cue"

powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File "$Root\scripts\build_release_packages_v1.ps1" `
  -RepoRoot "$Root"

Write-Host "POPUP_ICON_AND_PHARMACY_PROFILE_FIX_OK" -ForegroundColor Green