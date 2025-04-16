import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  
  // First get the authenticated user's ID
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    console.error('No authenticated user found');
    return null;
  }
  
  // Then get the user profile data
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
  }
  
  return data;
}
