import { NextResponse } from 'next/server';
import { uploadObject, imageUrlFor } from '@/lib/object-storage';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    console.log('Received file:', file);
    console.log('File type:', file?.type);
    console.log('File size (bytes):', file?.size);

    if (!file) {
      return NextResponse.json({ success: false, message: 'No se ha subido ningún archivo.' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ success: false, message: 'Tipo de archivo no válido. Solo se admiten imágenes.' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ success: false, message: `El archivo es demasiado grande. El tamaño máximo es de ${MAX_FILE_SIZE_MB}MB.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename to prevent overwrites
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const key = `uploads/${filename}`;

    await uploadObject(key, buffer, file.type);

    return NextResponse.json({ success: true, url: imageUrlFor(key) });

  } catch (error) {
    console.error('Error al subir el archivo:', error);
    return NextResponse.json({ success: false, message: 'Ocurrió un error en el servidor al subir el archivo.' }, { status: 500 });
  }
}
