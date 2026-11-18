# Rebuilds the icons derived from the header mark (dist/assets/logo-mark.png):
#   favicon-64.png (64 px), apple-touch-icon.png (180 px), icon-512.png (512 px), all on a transparent background.
#
# The mark needs a truly transparent background. Cutting it out of the white logo leaves near-white pixels with
# alpha 1..20 all around it. They cannot be seen on white, but on the black header, on dark browser tab bars and
# on a phone home screen they show as a faint lighter box around the mark. The script stops when it finds such
# pixels; run it with -Clean to make them fully transparent first (no other pixel is changed).
#
# Usage:  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1 [-Clean]
# Afterwards raise the ?v= on the logo and icon links of the pages so browsers fetch the new files (see README).
param([switch]$Clean, [int]$Threshold = 20)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assets = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist\assets'))
$markPath = Join-Path $assets 'logo-mark.png'
$argb = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$png = [System.Drawing.Imaging.ImageFormat]::Png

# Load through a memory stream so the file is not locked while it is rewritten.
$stream = New-Object System.IO.MemoryStream(, [System.IO.File]::ReadAllBytes($markPath))
$mark = New-Object System.Drawing.Bitmap($stream)
if ($mark.PixelFormat -ne $argb) { throw "logo-mark.png must be a 32-bit RGBA PNG (found $($mark.PixelFormat))" }
$rect = New-Object System.Drawing.Rectangle(0, 0, $mark.Width, $mark.Height)
$data = $mark.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $argb)
$buf = New-Object byte[] ($data.Stride * $mark.Height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)
$faint = 0
for ($i = 3; $i -lt $buf.Length; $i += 4) {
  if ($buf[$i] -gt 0 -and $buf[$i] -le $Threshold) { $faint++; if ($Clean) { $buf[$i] = 0 } }
}
if ($faint -and $Clean) { [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $buf.Length) }
$mark.UnlockBits($data)
if ($faint -and -not $Clean) {
  $mark.Dispose(); $stream.Dispose()
  throw "logo-mark.png has $faint pixels with alpha 1..$Threshold (a faint box on dark backgrounds). Run again with -Clean."
}
if ($faint) {
  $mark.Save($markPath, $png)
  Write-Output "logo-mark.png  $faint faint pixels made transparent"
} else {
  Write-Output 'logo-mark.png  background is clean'
}

foreach ($icon in @(@('favicon-64.png', 64), @('apple-touch-icon.png', 180), @('icon-512.png', 512))) {
  $name = $icon[0]; $size = $icon[1]
  $bmp = New-Object System.Drawing.Bitmap($size, $size, $argb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $pad = [int]($size * 0.04); $box = $size - 2 * $pad
  $r = [Math]::Min($box / $mark.Width, $box / $mark.Height)
  $dw = [int]($mark.Width * $r); $dh = [int]($mark.Height * $r)
  $g.DrawImage($mark, [int](($size - $dw) / 2), [int](($size - $dh) / 2), $dw, $dh)
  $g.Dispose()
  $bmp.Save((Join-Path $assets $name), $png)
  $bmp.Dispose()
  Write-Output ("{0}  {1}x{1}" -f $name, $size)
}
$mark.Dispose(); $stream.Dispose()
