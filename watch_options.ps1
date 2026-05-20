# watch_options.ps1 - Watcher that creates a backup of options.html whenever it changes\r
\r
$extensionId = "lcmhijbkigalmkeommnijlpobloojgfn"\r
$profileDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions\$extensionId"\r
$optionsPath = Join-Path $profileDir "options.html"\r
$backupDir = Join-Path $profileDir "options_backups"\r
\r
if (-not (Test-Path $backupDir)) {\r
    New-Item -ItemType Directory -Path $backupDir | Out-Null\r
}\r
\r
$watcher = New-Object System.IO.FileSystemWatcher\r
$watcher.Path = $profileDir\r
$watcher.Filter = "options.html"\r
$watcher.IncludeSubdirectories = $false\r
$watcher.EnableRaisingEvents = $true\r
\r
$action = {\r
    $timeStamp = Get-Date -Format "yyyyMMdd_HHmmss"\r
    $backupFile = Join-Path $backupDir "options_$timeStamp.html"\r
    Copy-Item -Path $Event.SourceEventArgs.FullPath -Destination $backupFile -Force\r
    Write-Host "[Watcher] Backup created: $backupFile"\r
}\r
\r
Register-ObjectEvent $watcher "Changed" -Action $action | Out-Null\r
Write-Host "[Watcher] Monitoring $optionsPath – press Ctrl+C to stop."\r
while ($true) { Start-Sleep -Seconds 5 }\r
