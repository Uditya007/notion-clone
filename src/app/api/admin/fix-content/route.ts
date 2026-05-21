import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fixPageContent } from '@/lib/fixExistingPages';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active/undeleted pages for this user
    const { data: pages, error: fetchError } = await supabase
      .from('pages')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('is_deleted', false);

    if (fetchError) {
      throw fetchError;
    }

    let fixedCount = 0;
    let skippedCount = 0;

    if (pages && pages.length > 0) {
      for (const page of pages) {
        const originalContent = page.content || '';
        const fixedContent = fixPageContent(originalContent);

        if (fixedContent !== originalContent) {
          const { error: updateError } = await supabase
            .from('pages')
            .update({ content: fixedContent })
            .eq('id', page.id);

          if (updateError) {
            console.error(`[Fix Content API] Error updating page ${page.id}:`, updateError);
            skippedCount++;
          } else {
            fixedCount++;
          }
        } else {
          skippedCount++;
        }
      }
    }

    return NextResponse.json({
      fixed: fixedCount,
      skipped: skippedCount
    });

  } catch (error: any) {
    console.error("[Fix Content API ERROR]:", error);
    return NextResponse.json({ error: error.message || 'Failed to migrate pages' }, { status: 500 });
  }
}
