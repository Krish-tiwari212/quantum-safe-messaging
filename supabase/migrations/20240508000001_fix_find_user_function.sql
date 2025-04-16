-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.find_user_by_email(TEXT);

-- Re-create the function with the correct parameter name
CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data json;
BEGIN
  -- Find the user by email and join with public.users to get profile data
  SELECT 
    json_build_object(
      'id', auth.users.id,
      'email', auth.users.email,
      'full_name', public.users.full_name,
      'avatar_url', public.users.avatar_url
    ) INTO user_data
  FROM auth.users
  LEFT JOIN public.users ON auth.users.id = public.users.id
  WHERE auth.users.email = search_email;
  
  -- Return the user data if found, or null if not found
  RETURN user_data;
END;
$$;