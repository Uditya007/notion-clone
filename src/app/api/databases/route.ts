import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import * as dbLib from "@/lib/db/databases";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId");
    if (!pageId) {
      return NextResponse.json({ error: "pageId query parameter is required" }, { status: 400 });
    }

    const database = await dbLib.getDatabase(supabase, pageId);
    return NextResponse.json(database);
  } catch (err: any) {
    console.error("GET /api/databases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { pageId } = body;
      const database = await dbLib.createDatabase(supabase, pageId, session.user.id);
      return NextResponse.json(database);
    }

    if (action === "addColumn") {
      const { dbId, column } = body;
      const col = await dbLib.addColumn(supabase, dbId, column);
      return NextResponse.json(col);
    }

    if (action === "addRow") {
      const { dbId, cells } = body;
      const row = await dbLib.addRow(supabase, dbId, { cells });
      return NextResponse.json(row);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/databases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "updateCell") {
      const { dbId, rowId, columnId, value } = body;
      const updated = await dbLib.updateCell(supabase, dbId, rowId, columnId, value);
      return NextResponse.json(updated);
    }

    if (action === "updateColumn") {
      const { dbId, columnId, name, type, options } = body;
      const updated = await dbLib.updateColumn(supabase, dbId, columnId, { name, type, options });
      return NextResponse.json(updated);
    }

    if (action === "setView") {
      const { dbId, viewType } = body;
      const updated = await dbLib.setView(supabase, dbId, viewType);
      return NextResponse.json(updated);
    }

    if (action === "updateRow") {
      const { dbId, rowId, updates } = body;
      const updated = await dbLib.updateRow(supabase, dbId, rowId, updates);
      return NextResponse.json(updated);
    }


    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/databases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const dbId = searchParams.get("dbId");

    if (!dbId) {
      return NextResponse.json({ error: "dbId is required" }, { status: 400 });
    }

    if (action === "deleteColumn") {
      const columnId = searchParams.get("columnId");
      if (!columnId) return NextResponse.json({ error: "columnId is required" }, { status: 400 });
      await dbLib.deleteColumn(supabase, dbId, columnId);
      return NextResponse.json({ success: true });
    }

    if (action === "deleteRow") {
      const rowId = searchParams.get("rowId");
      if (!rowId) return NextResponse.json({ error: "rowId is required" }, { status: 400 });
      await dbLib.deleteRow(supabase, dbId, rowId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("DELETE /api/databases error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
