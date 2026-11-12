# Renders the 1200x630 share cards (KakaoTalk and other link previews) from og-card.html with headless Chrome
# and saves them as JPEG into dist/assets/og/ (Korean: <type>.jpg, English: en-<type>.jpg).
# Usage:  powershell -ExecutionPolicy Bypass -File tools\render-og.ps1            (all cards)
#         powershell -ExecutionPolicy Bypass -File tools\render-og.ps1 -Only join,en-join
param([string[]]$Only = @())
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$outDir = [System.IO.Path]::GetFullPath((Join-Path $root '..\dist\assets\og'))
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) 'dmse-og-png'
$userData = Join-Path ([System.IO.Path]::GetTempPath()) 'dmse-og-chrome'
New-Item -ItemType Directory -Force $outDir | Out-Null
New-Item -ItemType Directory -Force $tmp | Out-Null
Add-Type -AssemblyName System.Drawing
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)
$page = ([System.Uri](Join-Path $root 'og-card.html')).AbsoluteUri
$types = @('home', 'join', 'fit', 'sim', 'fit-ai', 'fit-synthesis', 'fit-capture', 'fit-catalysis', 'fit-energy')
foreach ($lang in @('ko', 'en')) {
  foreach ($name in $types) {
    $file = if ($lang -eq 'ko') { $name } else { "en-$name" }
    if ($Only.Count -and ($Only -notcontains $file)) { continue }
    $type = $name -replace '^fit-', ''
    $png = Join-Path $tmp "$file.png"
    $started = (Get-Date).AddSeconds(-2)
    $url = $page + '?lang=' + $lang + '&type=' + $type
    $chromeArgs = @(
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--no-first-run',
      '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files',
      '--run-all-compositor-stages-before-draw', '--window-size=1200,630', '--force-device-scale-factor=1',
      '--virtual-time-budget=8000', "--user-data-dir=`"$userData`"", "--screenshot=`"$png`"", "`"$url`""
    )
    Start-Process -FilePath $chrome -ArgumentList $chromeArgs -WindowStyle Hidden -Wait | Out-Null
    if (-not (Test-Path -LiteralPath $png) -or (Get-Item -LiteralPath $png).LastWriteTime -lt $started) { throw "no fresh screenshot for $file" }
    $img = [System.Drawing.Image]::FromFile($png)
    try {
      if ($img.Width -ne 1200 -or $img.Height -ne 630) { throw "unexpected size $($img.Width)x$($img.Height) for $file" }
      $jpg = Join-Path $outDir "$file.jpg"
      $img.Save($jpg, $codec, $ep)
    } finally { $img.Dispose() }
    Write-Output ("{0}.jpg  {1:N0} bytes" -f $file, (Get-Item -LiteralPath $jpg).Length)
  }
}
