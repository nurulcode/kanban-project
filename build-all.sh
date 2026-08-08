#!/bin/bash
# Script tunggal untuk membuat paket .deb (Linux) dan paket Windows (.exe)

echo "========================================================"
echo "🚀 MULAIBUILD ALL (LINUX .DEB & WINDOWS EXECUTABLE)"
echo "========================================================"
echo ""

# 1. Jalankan Build Paket .deb (Linux)
if [ -f "./build-deb.sh" ]; then
    echo "📦 [1/2] Membuat paket installer Linux (.deb)..."
    chmod +x ./build-deb.sh
    ./build-deb.sh
else
    echo "❌ Error: File build-deb.sh tidak ditemukan."
fi

echo ""
echo "--------------------------------------------------------"

# 2. Persiapan Build Windows (.exe)
echo "🪟 [2/2] Menyiapkan paket Windows (.exe)..."

if command -v pyinstaller &> /dev/null; then
    echo "🛠️ Menjalankan PyInstaller..."
    pyinstaller --noconfirm --onedir --windowed \
      --add-data "gui:gui" \
      --name "KanbanNotes" \
      main.py
    echo "✅ Executable biner berhasil dihasilkan di: dist/KanbanNotes/"
else
    echo "💡 Catatan Windows (.exe):"
    echo "   Untuk menghasilkan .exe langsung dari sistem Windows, jalankan file:"
    echo "   👉 build-win.bat"
fi

echo ""
echo "========================================================"
echo "🎉 PROSES BUILD SELESAI!"
echo "   - Linux .deb: kanban-notes-desktop_1.0.0_amd64.deb"
echo "   - Windows Script: build-win.bat (atau dist/KanbanNotes/)"
echo "========================================================"
