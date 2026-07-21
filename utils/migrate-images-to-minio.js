// Script puntual de migración: copia las imágenes de producto que hoy están
// en Supabase Storage (URLs públicas) y en public/uploads/ (disco local)
// hacia MinIO, y reescribe Producto_Imagen.url para que apunte a /api/images/...
//
// Uso:
//   node utils/migrate-images-to-minio.js --dry-run
//   node utils/migrate-images-to-minio.js
//   node utils/migrate-images-to-minio.js --restore utils/migration-backup-<timestamp>.csv
//
// Requiere las mismas env vars que usa la app en producción:
//   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DATABASE, POSTGRES_USER, POSTGRES_PASSWORD
//   MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
//
// El script NUNCA borra ni modifica objetos en Supabase: solo lee (fetch) y copia.
// Mientras Supabase siga activo, revertir es tan simple como correr --restore
// con el CSV de respaldo que este mismo script genera antes de tocar cada fila.

const { Pool } = require('pg');
const {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const restoreIdx = process.argv.indexOf('--restore');
const RESTORE_FILE = restoreIdx !== -1 ? process.argv[restoreIdx + 1] : null;

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

function makePool() {
  return new Pool({
    host: requireEnv('POSTGRES_HOST'),
    port: Number(requireEnv('POSTGRES_PORT')),
    database: requireEnv('POSTGRES_DATABASE'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });
}

function makeS3() {
  return new S3Client({
    endpoint: `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${requireEnv('MINIO_ENDPOINT')}:${process.env.MINIO_PORT || '9000'}`,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv('MINIO_ACCESS_KEY'),
      secretAccessKey: requireEnv('MINIO_SECRET_KEY'),
    },
  });
}

async function ensureBucket(s3, bucket) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

function classifyUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return { type: 'unknown', url };

  const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (supabaseMatch) {
    return { type: 'supabase', bucket: supabaseMatch[1], key: supabaseMatch[2] };
  }
  if (url.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length);
    return { type: 'local', filename, key: `uploads/${filename}` };
  }
  if (url.startsWith('/api/images/')) {
    return { type: 'already-migrated' };
  }
  return { type: 'unknown', url };
}

async function fetchSupabaseObject(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} devolvió ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

async function readLocalObject(filename) {
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  const buffer = await fsp.readFile(filePath);
  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';
  return { buffer, contentType };
}

async function runRestore(pool) {
  const csv = await fsp.readFile(RESTORE_FILE, 'utf8');
  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const [header, ...rows] = lines;
  if (header !== 'id,old_url') {
    throw new Error(`Formato de CSV inesperado, header: "${header}"`);
  }

  let restored = 0;
  for (const line of rows) {
    const commaIdx = line.indexOf(',');
    const id = line.slice(0, commaIdx);
    const oldUrl = line.slice(commaIdx + 1);
    await pool.query('UPDATE Producto_Imagen SET url = $1 WHERE id = $2', [oldUrl, Number(id)]);
    restored++;
  }
  console.log(`Restauradas ${restored} filas desde ${RESTORE_FILE}`);
}

async function runMigration(pool) {
  const bucket = process.env.MINIO_BUCKET || 'images';
  const s3 = makeS3();
  if (!DRY_RUN) await ensureBucket(s3, bucket);

  const { rows } = await pool.query('SELECT id, url FROM Producto_Imagen ORDER BY id');

  const counts = { supabase: 0, local: 0, 'already-migrated': 0, unknown: 0 };
  const failures = [];

  let backupPath = null;
  let backupStream = null;
  if (!DRY_RUN) {
    backupPath = path.join(__dirname, `migration-backup-${Date.now()}.csv`);
    backupStream = fs.createWriteStream(backupPath, { flags: 'a' });
    backupStream.write('id,old_url\n');
  }

  for (const row of rows) {
    const classification = classifyUrl(row.url);
    counts[classification.type] = (counts[classification.type] || 0) + 1;

    if (classification.type === 'already-migrated') continue;
    if (classification.type === 'unknown') {
      console.warn(`[unknown] id=${row.id} url=${row.url}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] id=${row.id} type=${classification.type} key=${classification.key}`);
      continue;
    }

    try {
      const { buffer, contentType } =
        classification.type === 'supabase'
          ? await fetchSupabaseObject(row.url)
          : await readLocalObject(classification.filename);

      // Backup ANTES de tocar la fila.
      backupStream.write(`${row.id},${row.url}\n`);

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: classification.key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const newUrl = `/api/images/${classification.key}`;
      await pool.query('UPDATE Producto_Imagen SET url = $1 WHERE id = $2', [newUrl, row.id]);
      console.log(`[ok] id=${row.id} -> ${newUrl}`);
    } catch (e) {
      console.error(`[error] id=${row.id} url=${row.url}:`, e.message);
      failures.push({ id: row.id, url: row.url, error: e.message });
    }
  }

  if (backupStream) await new Promise((resolve) => backupStream.end(resolve));

  console.log('\n--- Resumen ---');
  console.log(counts);
  if (backupPath) console.log(`Backup de URLs viejas: ${backupPath}`);
  if (failures.length > 0) {
    console.log(`Fallaron ${failures.length} filas (quedaron con su URL original, revisar y reintentar):`);
    for (const f of failures) console.log(`  id=${f.id} url=${f.url} error=${f.error}`);
  }
}

async function main() {
  const pool = makePool();
  try {
    if (RESTORE_FILE) {
      await runRestore(pool);
    } else {
      await runMigration(pool);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
