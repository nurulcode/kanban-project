#!/bin/bash
# Script pembuat paket installer .deb untuk Desktop Kanban Notes

APP_NAME="kanban-notes-desktop"
VERSION="1.0.0"
ARCH="amd64"
BUILD_DIR="${APP_NAME}_${VERSION}_${ARCH}"

echo "🚀 Memulai pembuatan paket installer .deb untuk ${APP_NAME}..."

# 1. Bersihkan direktori build lama jika ada
rm -rf "${BUILD_DIR}" "${APP_NAME}_${VERSION}_${ARCH}.deb"

# 2. Buat struktur folder standar Debian
mkdir -p "${BUILD_DIR}/DEBIAN"
mkdir -p "${BUILD_DIR}/usr/bin"
mkdir -p "${BUILD_DIR}/usr/share/applications"
mkdir -p "${BUILD_DIR}/usr/share/pixmaps"
mkdir -p "${BUILD_DIR}/usr/share/icons/hicolor/256x256/apps"
mkdir -p "${BUILD_DIR}/usr/share/${APP_NAME}"

# 3. Buat file DEBIAN/control
cat <<EOF > "${BUILD_DIR}/DEBIAN/control"
Package: ${APP_NAME}
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: ${ARCH}
Maintainer: Nurul Workspace <nurul@localhost>
Depends: python3, python3-gi, gir1.2-gtk-3.0, gir1.2-webkit2-4.1
Description: Aplikasi Desktop Kanban Notes Dinamis & Mandiri
 Desktop Kanban Notes adalah aplikasi manajemen tugas harian yang ringan,
 berjalan secara native di Linux dengan fitur Pomodoro, Floating Sticky Notes,
 export ke Markdown, dan SQLite database lokal.
EOF

# 4. Salin file aplikasi ke /usr/share/kanban-notes-desktop
cp main.py db.py autostart.py sticky.py server.py "${BUILD_DIR}/usr/share/${APP_NAME}/"
cp -r gui "${BUILD_DIR}/usr/share/${APP_NAME}/"
if [ -f "icon.png" ]; then
    cp icon.png "${BUILD_DIR}/usr/share/${APP_NAME}/"
    cp icon.png "${BUILD_DIR}/usr/share/pixmaps/${APP_NAME}.png"
    cp icon.png "${BUILD_DIR}/usr/share/pixmaps/kanban-notes.png"
    cp icon.png "${BUILD_DIR}/usr/share/icons/hicolor/256x256/apps/${APP_NAME}.png"
    cp icon.png "${BUILD_DIR}/usr/share/icons/hicolor/256x256/apps/kanban-notes.png"
fi

# 5. Buat executable launcher di /usr/bin/kanban-notes
cat <<'EOF' > "${BUILD_DIR}/usr/bin/kanban-notes"
#!/bin/bash
cd /usr/share/kanban-notes-desktop
python3 main.py "$@"
EOF

chmod +x "${BUILD_DIR}/usr/bin/kanban-notes"

# 6. Buat file peluncur aplikasi desktop /usr/share/applications/kanban-notes.desktop
cat <<EOF > "${BUILD_DIR}/usr/share/applications/${APP_NAME}.desktop"
[Desktop Entry]
Name=Kanban Notes
Comment=Aplikasi Desktop Kanban Notes Dinamis & Pomodoro Timer
Exec=/usr/bin/kanban-notes
Icon=${APP_NAME}
Terminal=false
Type=Application
Categories=Utility;Office;ProjectManagement;
StartupWMClass=kanban-notes-desktop
EOF

chmod +x "${BUILD_DIR}/usr/share/applications/${APP_NAME}.desktop"

# 7. Build paket .deb menggunakan dpkg-deb
dpkg-deb --build "${BUILD_DIR}"

echo "✅ Paket .deb berhasil dibuat: ${APP_NAME}_${VERSION}_${ARCH}.deb"
echo ""
echo "📌 Cara Menginstall Paket .deb di Linux (Ubuntu/Debian/Mint):"
echo "   sudo dpkg -i ${APP_NAME}_${VERSION}_${ARCH}.deb"
echo "   sudo apt-get install -f  # (jika ada dependensi terlewat)"
