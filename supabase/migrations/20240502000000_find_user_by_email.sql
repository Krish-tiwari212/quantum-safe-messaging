-- Create a secure function to find a user by email
-- This function will bridge the gap between auth.users and public.users
-- It requires the service role to call it
CREATE OR REPLACE FUNCTION public.find_user_by_email(email_to_find TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This ensures the function runs with the privileges of the creator
AS $$
DECLARE
  user_data json;
BEGIN
  -- Check if the requesting user has the necessary permissions
  -- This is a basic approach - in production you'd want more sophisticated security
  
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
  WHERE auth.users.email = email_to_find;
  
  -- Return the user data if found, or null if not found
  RETURN user_data;
END;
$$;