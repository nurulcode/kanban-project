@echo off
echo 🚀 Memulai pembuatan file executable Windows (.exe) untuk Desktop Kanban Notes...

REM 1. Install PyInstaller dan pywebview jika belum terpasang
pip install pyinstaller pywebview

REM 2. Build aplikasi menjadi file biner .exe
pyinstaller --noconfirm --onedir --windowed --add-data "gui;gui" --name "KanbanNotes" main.py

echo.
echo ✅ Build selesai! File executable berada di folder: dist\KanbanNotes\KanbanNotes.exe
echo.
echo 📌 Petunjuk Pembuatan File Installer Setup (.exe):
echo    Buka aplikasi gratis "Inno Setup" lalu pilih folder dist\KanbanNotes\ untuk membuat file KanbanNotes_Setup.exe tunggal.
pause
