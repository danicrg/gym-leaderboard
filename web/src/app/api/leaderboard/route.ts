import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const windowStr = searchParams.get('window') || '30';
  
  let filename = 'leaderboard.json';
  if (windowStr === '7') filename = 'leaderboard-7d.json';
  if (windowStr === '14') filename = 'leaderboard-14d.json';

  const dataPath = path.join(process.cwd(), '..', 'data', filename);
  try {
    const fileContents = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load data', details: err }, { status: 500 });
  }
}
