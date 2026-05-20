param([string]$ExtensionPath)

# If no path supplied, ask the user interactively
if (-not $ExtensionPath -or $ExtensionPath -eq '') {
    $ExtensionPath = Read-Host "Enter full path to the unpacked extension folder (contains manifest.json)"
}

# Build full path to options.html
$optPath = Join-Path $ExtensionPath "options.html"

if (-not (Test-Path $optPath)) {
    Write-Error "options.html not found at $optPath"
    exit 1
}

Write-Host "Opening $optPath for editing..."
# Open with default associated editor (or Notepad if none)
try {
    Start-Process -FilePath $optPath -Wait
} catch {
    Write-Warning "Failed to launch default editor; falling back to Notepad."
    Start-Process -FilePath notepad.exe -ArgumentList $optPath -Wait
}

Write-Host "\n--- EDITING DONE ---\n"
Write-Host "To apply changes, reload the extension in Chrome:" -ForegroundColor Yellow
Write-Host "1. Open chrome://extensions" -ForegroundColor Yellow
Write-Host "2. Enable \"Developer mode\" (toggle in top‑right)." -ForegroundColor Yellow
Write-Host "3. Locate the extension with ID 'lcmhijbkigalmkeommnijlpobloojgfn' and click the ↻ Reload button." -ForegroundColor Yellow

Read-Host "Press Enter to close this helper script" | Out-Null
