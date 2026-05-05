# create_launcher.ps1
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop")
$ShortcutPath = Join-Path $DesktopPath "Sachand Stock Manager.lnk"
$AppPath = Get-Location
$IconPath = Join-Path $AppPath "icon.png"

# Create a hidden launcher batch
$LauncherBat = @"
@echo off
cd /d "$AppPath"
start /min cmd /c "npm run dev"
timeout /t 5 /nobreak > nul
start http://localhost:3000
exit
"@
$LauncherBat | Out-File -FilePath (Join-Path $AppPath "start_app.bat") -Encoding ASCII

# Create the shortcut
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$(Join-Path $AppPath 'launcher.vbs')`""
$Shortcut.WorkingDirectory = $AppPath.ToString()
$Shortcut.Description = "Lancer Sachand Stock Manager"
$Shortcut.IconLocation = $IconPath # Windows supports PNG icons in some contexts, but let's try
$Shortcut.Save()

# Create VBS to hide terminal
$VBS = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "$AppPath\start_app.bat" & Chr(34), 0
Set WshShell = Nothing
"@
$VBS | Out-File -FilePath (Join-Path $AppPath "launcher.vbs") -Encoding ASCII

Write-Host "✅ Raccourci créé sur votre Bureau !" -ForegroundColor Green
Write-Host "Vous pouvez maintenant lancer l'application en double-cliquant sur 'Sachand Stock Manager' sur votre Bureau."
