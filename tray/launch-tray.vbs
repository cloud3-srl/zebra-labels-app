' Zebra Labels Tray Monitor - Launcher silenzioso (nessuna finestra cmd)
Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
strRoot = CreateObject("Scripting.FileSystemObject").GetParentFolderName(strPath)
WshShell.CurrentDirectory = strRoot
WshShell.Run """node"" """ & strPath & "\tray-app.js""", 0, False
