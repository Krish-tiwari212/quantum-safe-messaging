-- Create a direct function to get a user's email
CREATE OR REPLACE FUNCTION get_user_email_by_id(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_id;
    
    RETURN user_email;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_by_id TO authenticated;