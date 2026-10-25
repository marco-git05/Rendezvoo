import { NextResponse } from 'next/server';
import { PLAN_UNAVAILABLE, PlanError, planHangout } from '@/lib/planner';

export const maxDuration = 60; // seconds — SerpAPI + Gemini can take a little while

// POST /api/plan  { inviteId, rethink?, feedback? }  →  { eventId }
// rethink: replace the current plan with a different one; everyone's RSVP resets so the group re-approves.
export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  try {
    const eventId = await planHangout(body.inviteId, token, {
      rethink: body.rethink === true,
      feedback: typeof body.feedback === 'string' ? body.feedback : undefined,
    });
    return NextResponse.json({ eventId });
  } catch (e) {
    console.error('[api/plan]', e);
    // Only PlanError messages are written for users; anything unexpected gets a generic message.
    if (e instanceof PlanError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: PLAN_UNAVAILABLE }, { status: 500 });
  }
}
