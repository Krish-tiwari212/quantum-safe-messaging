-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.find_user_by_email(TEXT);

-- Create an updated function to find a user by email with case-insensitive matching
-- This is especially important for OAuth providers like Google that may store emails differently
CREATE OR REPLACE FUNCTION public.find_user_by_email(email_to_find TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This ensures the function runs with the privileges of the creator
AS $$
DECLARE
  user_data json;
BEGIN
  -- Find the user by email using case-insensitive comparison (LOWER)
  SELECT 
    json_build_object(
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

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.find_user_by_email TO authenticated;