@echo off
cd /d "C:\Users\fomoc\Downloads\stockapigestion_1\stockapigestion"
start /min cmd /c "npm run dev"
timeout /t 5 /nobreak > nul
start http://localhost:3000
exit
