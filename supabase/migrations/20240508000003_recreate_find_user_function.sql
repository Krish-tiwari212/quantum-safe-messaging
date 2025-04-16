-- Completely recreate the find_user_by_email function
-- First drop any existing version
DROP FUNCTION IF EXISTS public.find_user_by_email(text);

-- Create from scratch with proper accessibility
CREATE OR REPLACE FUNCTION public.find_user_by_email(email_to_find TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data jsonb;
BEGIN
  -- Find the user by email using case-insensitive comparison
  SELECT 
    jsonb_build_object(
      'id', auth.users.id,
      'email', auth.users.email,
      'full_name', public.users.full_name,
      'avatar_url', public.users.avatar_url
    ) INTO user_data
  FROM auth.users
  LEFT JOIN public.users ON auth.users.id = public.users.id
  WHERE LOWER(auth.users.email) = LOWER(email_to_find);
  
  -- Return the user data if found, or null if not found
  RETURN user_data;
END;
$$;

-- Ensure the function is available to authenticated users
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;