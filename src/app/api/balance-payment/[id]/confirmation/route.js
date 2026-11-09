import { paymentConfirmationHandlers } from '@/lib/paymentConfirmationRoute';
export const runtime = 'nodejs';
const handlers = paymentConfirmationHandlers('balance');
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const POST = handlers.POST;
