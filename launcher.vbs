Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run chr(34) & strPath & "\start_app.bat" & Chr(34), 0
Set WshShell = Nothing
