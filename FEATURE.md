# 📋 Desktop Kanban Notes - Dokumentasi Fitur & Manual (FEATURE.md)

**Kanban Notes Desktop** adalah aplikasi manajemen catatan dan tugas harian yang **ringan, cepat, fleksibel, dan berjalan secara native di desktop Linux & Windows** berbasis Python GTK3 / WebKit2.

> **👨‍💻 Author & License Note:**  
> Developed with ❤️ by **Nurul Hidayat**.  
> *"This application is completely free to use, modify, and extend for any purpose. If you would like to get the full source code or project files, feel free to contact me!"*

---

## 🛠️ Arsitektur & Spesifikasi Teknis

* **Frontend Desktop Window**: Native GTK3 + WebKit2 WebView (`gi.repository.WebKit2`)
* **Backend Database**: **SQLite** (`kanban_notes.db`) dengan transaksi otomatis
* **Komunikasi Internal**: Embedded REST API Server (`http.server` & `json`)
* **Tema Visual Dual-Mode**: **Atom One Dark Pro** (Gelap Nyaman & Nyaman di Mata) & **Soft Light Theme** (Terang Kontras Tinggi)
* **Arsitektur Modular JavaScript**: Kode dikelompokkan ke modul independen (`js/state.js`, `js/board.js`, `js/modal.js`, `js/pomodoro.js`, `js/theme.js`, `app.js`)
* **Unit Testing Suite**: Unit test suite otomatis (`test_app.py`)

---

## ✨ Daftar Fitur Lengkap

### 1. 📋 Papan Kanban Dinamis (Dynamic Columns & Drag-Scroll)
- **4 Kolom Standar (Terkunci)**: Kolom utama *To Do*, *In Progress*, *Review*, dan *Done* bersifat permanen dan tidak dapat dihapus secara tidak sengaja.
- **Tambah Kolom Kustom Bebas (`+Kolom`)**: Pengguna dapat menambahkan kolom baru sesuka hati (*Backlog*, *Testing*, *On Hold*, *Ideas*, dll.).
- **Hapus Kolom Kustom (`✕`)**: Kolom kustom tambahan memiliki tombol hapus. Jika dihapus, catatan di dalamnya otomatis dipindahkan aman ke kolom *To Do*.
- **Horizontal Pan Scroll (Klik & Tahan Geser Mouse)**:
  - Scroll papan menggunakan roda mouse atau dengan **menekan & menahan klik kiri mouse (`cursor: grab / grabbing`)** lalu memindahkan mouse ke kiri/kanan.
- **Drag & Drop Cards**: Pindahkan kartu catatan antar kolom dengan mudah via drag & drop.
- **Tombol Navigasi Cepat**: Pindahkan status kolom catatan dengan satu klik tombol panah.

### 2. 🗄️ Database SQLite Mandiri (`kanban_notes.db`) & Portabilitas Tinggi
- **100% Gratis & Standalone**: Menggunakan file database SQLite lokal (`kanban_notes.db`) tanpa ketergantungan pada cloud pihak ketiga.
- **Ramah Orang Awam**: Tanpa konfigurasi server SQL. Database otomatis dibuat saat pertama kali dijalankan.
- **Kemudahan Integrasi / Sinkronisasi**: File `kanban_notes.db` sangat mudah di-backup, dipindahkan, atau disimpan di folder Cloud Sync (Google Drive, Dropbox, Nextcloud).

### 3. 🍅 Widget Pomodoro Timer (Fokus & Durasi Dinamis)
- **Pilihan Durasi Fokus**: Pilihan waktu fokus dinamis via dropdown (**5 menit, 10 menit, 20 menit, atau 25 menit**).
- **Alarm Suara (Web Audio API)**: Membunyikan nada panggil alarm otomatis saat sesi berakhir.
- **Modal Konfirmasi Sesi**: Pop-up modal interaktif setelah sesi selesai untuk memilih apakah ingin *Direct Lanjut Fokus* atau *Istirahat 5 Menit*.

### 4. 📌 Floating Desktop Sticky Note (Catatan Melayang)
- Tombol **Pin / Tempel ke Desktop** (`📌`) pada setiap kartu catatan.
- Membuka jendela GTK terpisah yang melayang (**Always-on-Top**) di atas aplikasi lain di layar Linux.
- **Real-Time Auto Sync**: Pengeditan isi catatan pada sticky note langsung tersimpan ke SQLite.

### 5. 🎯 ProtoFocus / Focus Mode (Bebas Gangguan)
- Tombol toggle **Fokus** pada header.
- Meredupkan kolom lain dan memberikan **sorotan glowing pada kolom *In Progress***.

### 6. 🔍 Detail Modal View & Format Multiline (Enter / Special Characters)
- **Modal Detail Catatan**: Mengklik kartu catatan akan membuka dialog **Modal Detail** khusus yang menampilkan judul lengkap, prioritas, tag, tanggal pembuatan, serta seluruh isi deskripsi catatan secara lapang dan nyaman dibaca.
- **Dukungan Enter (`\n`) & Karakter Bebas**: Input deskripsi catatan mendukung baris baru (`Enter`), poin-poin (*bullet points*), simbol spesial, petik, dan karakter bebas tanpa terpotong atau merusak format.
- **Tombol Aksi Cepat**: Di dalam modal detail terdapat tombol **Edit Catatan** untuk langsung menyunting data dan tombol **Tutup**.

### 7. 📥 Export Catatan ke File Markdown (`.md`)
- Tombol **`Export`** pada header untuk mengunduh seluruh catatan dan struktur papan ke file dokumen `.md` lokal.

### 8. 🧪 Testing & Reliability
- File `test_app.py` memvalidasi backend, skema SQLite `notes` & `columns`, serta REST API endpoints (`/api/notes`, `/api/columns`, `/api/popout`).

---

## 🚀 Cara Menjalankan Aplikasi & Test

### Menjalankan Aplikasi Desktop:
```bash
./run-kanban.sh
```
atau:
```bash
python3 main.py
```

### Menjalankan Unit Test Backend & DB:
```bash
python3 test_app.py
```
