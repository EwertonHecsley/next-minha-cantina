import { NextResponse } from 'next/server';
import { handleLogin } from '@/lib/auth';

export const POST = handleLogin;
