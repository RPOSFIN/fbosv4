import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
try {
const supabase = await createSupabaseServerClient();

```
const { data, error } = await supabase
  .from('observations')
  .select('*')
  .order('created_at', { ascending: false });

if (error) throw error;

return NextResponse.json({
  observations: data || [],
});
```

} catch (error) {
return NextResponse.json(
{ error: String(error) },
{ status: 500 }
);
}
}

export async function POST(request: NextRequest) {
try {
const body = await request.json();

```
const supabase = await createSupabaseServerClient();

const { data, error } = await supabase
  .from('observations')
  .insert(body)
  .select()
  .single();

if (error) throw error;

return NextResponse.json(
  { observation: data },
  { status: 201 }
);
```

} catch (error) {
return NextResponse.json(
{ error: String(error) },
{ status: 500 }
);
}
}

export async function DELETE(request: NextRequest) {
try {
const { searchParams } = new URL(request.url);

```
const id = searchParams.get('id');

if (!id) {
  return NextResponse.json(
    { error: 'ID required' },
    { status: 400 }
  );
}

const supabase = await createSupabaseServerClient();

const { error } = await supabase
  .from('observations')
  .delete()
  .eq('id', id);

if (error) throw error;

return NextResponse.json({
  success: true,
});
```

} catch (error) {
return NextResponse.json(
{ error: String(error) },
{ status: 500 }
);
}
}
