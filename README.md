# E-Learning Mock API

Static JSON Mock API untuk take-home test **Simple E-Learning Platform** (aplikasi Flutter untuk Student menggunakan Dio), siap di-host di GitHub Pages tanpa backend atau database.

## Daftar Endpoint

- `GET /courses.json` — Daftar ringkas seluruh course (5 course)
- `GET /courses/{id}.json` — Detail course beserta daftar lesson (`1.json` s.d. `5.json`)

## Kontrak Data

Seluruh key menggunakan `camelCase` dan semua `id` bertipe `string`.

### `GET /courses.json` (Array of Object)

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `string` | ID unik course (`"1"`–`"5"`) |
| `title` | `string` | Judul course |
| `description` | `string` | Ringkasan course (1–2 kalimat) |
| `thumbnailUrl` | `string` | URL gambar thumbnail HTTPS |
| `instructor` | `string` | Nama instruktur |
| `lessonCount` | `number` | Jumlah lesson pada course detail |
| `totalDurationMinutes` | `number` | Total durasi seluruh lesson dalam menit (dibulatkan) |

### `GET /courses/{id}.json` (Object)

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `string` | ID unik course (sinkron dengan list) |
| `title` | `string` | Judul course (sinkron dengan list) |
| `description` | `string` | Deskripsi lengkap course (2–4 kalimat) |
| `thumbnailUrl` | `string` | URL gambar thumbnail HTTPS (sinkron dengan list) |
| `instructor` | `string` | Nama instruktur (sinkron dengan list) |
| `lessons` | `array` | Daftar object lesson |

**Item `lessons`:**

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | `string` | Format `"{courseId}-{order}"`, contoh `"1-1"` |
| `order` | `number` | Nomor urut lesson mulai dari `1` |
| `title` | `string` | Judul materi lesson |
| `durationSeconds` | `number` | Durasi video dalam detik |
| `videoUrl` | `string` | URL video streaming HTTPS (`.mp4`) |

## Deploy ke GitHub Pages

1. Push repository ini ke GitHub pada branch `main`.
2. Buka repository di GitHub lalu masuk ke **Settings > Pages**.
3. Pada bagian **Build and deployment**, pilih **Source: Deploy from a branch**.
4. Pilih branch **`main`** dan folder **`/ (root)`**, lalu klik **Save**.
5. Setelah aktif, endpoint dapat diakses melalui `https://<username>.github.io/<repo>/courses.json`.

## Validasi Data

Jalankan script validasi menggunakan Node.js (tanpa perlu `npm install`):

```bash
node scripts/validate.js
```

Script memeriksa validitas JSON, kelengkapan dan tipe field, format `id` dan `order`, tidak adanya field di luar kontrak, serta sinkronisasi data antara `courses.json` dan `courses/{id}.json`.

## Catatan Media Placeholder

- **Thumbnail** menggunakan gambar placeholder deterministik dari `picsum.photos/seed/{slug-course}/640/360`.
- **Video** menggunakan file `.mp4` sampel publik HTTPS (Google ExoPlayer / Gvabox / Flutter / MDN sample videos) dengan `durationSeconds` sesuai durasi asli masing-masing video.

## Cara Mengganti dengan API Sebenarnya

API produksi diasumsikan memiliki endpoint `/courses` dan `/courses/{id}` dengan struktur respons JSON yang identik. Pada layer data / Dio client di Flutter, cukup lakukan dua penyesuaian:

1. Ubah `baseUrl` pada instance `Dio` dari URL GitHub Pages ke URL backend sebenarnya.
2. Hapus suffix `.json` pada pemanggilan path endpoint (dari `/courses.json` menjadi `/courses`, dan dari `/courses/$id.json` menjadi `/courses/$id`).
