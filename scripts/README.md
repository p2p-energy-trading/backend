# Database Reset Scripts

Script untuk menghapus database secara total dan mengimport SQL dump yang bersih.

## Cara Penggunaan

### 1. Reset Database + Import SQL + Run Seeder (RECOMMENDED)

```bash
npm run db:reset enerlink_db_2025-10-26_012049.sql
```

Script ini akan:
1. Drop database existing
2. Create database baru
3. Import SQL file
4. Run seeder untuk data dummy (5 prosumers + wallets + meters)

### 2. Reset Database + Import SQL Saja (Tanpa Seeder)

```bash
npm run db:reset-clean enerlink_db_2025-10-26_012049.sql
```

### 3. Run Seeder Saja (Jika Database Sudah Ada)

```bash
npm run seed
```

## Yang Dilakukan Script

Script akan melakukan langkah-langkah berikut:

1. ✅ **Validasi**: Mengecek file SQL ada atau tidak
2. 🗑️ **Drop Database**: Menghapus database yang ada (jika ada)
3. 🆕 **Create Database**: Membuat database baru dengan encoding UTF8
4. 📥 **Import SQL**: Mengimport struktur dan data dari file SQL
5. ✨ **Selesai**: Database siap digunakan

## Persyaratan

- PostgreSQL client (`psql`) harus terinstall
- File `.env` harus ada dengan konfigurasi:
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=postgres
  DB_PASS=your_password
  DB_NAME=enerlink_db
  ```

## Contoh Output

```
🗑️  Database Reset Script
================================

📋 Configuration:
  Database: enerlink_db
  Host: localhost
  Port: 5432
  User: postgres
  SQL File: database/enerlink_db_2025-10-26_012049.sql

⚠️  This will DROP the entire database and recreate it. Continue? (yes/no): yes

Step 1: Dropping existing database...
✅ Database dropped successfully

Step 2: Creating new database...
✅ Database created successfully

Step 3: Importing SQL file...
✅ SQL file imported successfully

✨ Database reset completed successfully!
```

## Setelah Reset Database

### 1. Verifikasi Schema (Opsional)

```bash
npm run typeorm schema:log
```

### 2. Jalankan Seeder (Jika Perlu Data Dummy)

```bash
npm run seed
```

### 3. Start Aplikasi

```bash
npm run start:dev
```

## Troubleshooting

### Error: Permission Denied

```bash
chmod +x scripts/reset-database.sh
```

### Error: psql command not found

Install PostgreSQL client:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# Mac
brew install postgresql
```

### Error: Connection refused

Pastikan PostgreSQL service running:

```bash
sudo systemctl status postgresql
# atau
sudo service postgresql status
```

### Error: Password authentication failed

Cek file `.env` apakah DB_USER dan DB_PASS sudah benar.

## Notes

⚠️ **PERHATIAN**: Script ini akan **MENGHAPUS SEMUA DATA** di database. Pastikan Anda sudah backup jika diperlukan!

- Script meminta konfirmasi sebelum menjalankan
- Gunakan file SQL yang fresh/clean untuk hasil terbaik
- Setelah import, tidak perlu run migration lagi
