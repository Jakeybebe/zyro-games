# Rebuilds manifest.json from launcher.bat and the game folder, then pushes if this is a git repo.
param([string]$Version = '')
$root = $PSScriptRoot
if (-not $Version) { $Version = (Get-Date).ToString('yyyy.MM.dd-HHmm') }
$files = [ordered]@{}
Get-ChildItem -LiteralPath (Join-Path $root 'game') -File | Sort-Object Name | ForEach-Object {
    $files['game/' + $_.Name] = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
}
$m = [ordered]@{ version = $Version; launcher = (Get-FileHash -LiteralPath (Join-Path $root 'launcher.bat') -Algorithm SHA256).Hash; files = $files }
[System.IO.File]::WriteAllText((Join-Path $root 'manifest.json'), ($m | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ('manifest.json written: version ' + $Version + ', ' + $files.Count + ' game files')
if ((Test-Path -LiteralPath (Join-Path $root '.git')) -and (Get-Command git -ErrorAction SilentlyContinue)) {
    Push-Location $root; git add -A; git commit -m ('Update ' + $Version); git push; Pop-Location
    Write-Host 'Pushed to GitHub.'
} else { Write-Host 'Upload everything in this folder to your GitHub repo (replace the old files).' }
