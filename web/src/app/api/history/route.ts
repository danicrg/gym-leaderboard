import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const dataPath = path.join(process.cwd(), '..', 'data', 'history.json');
  try {
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
