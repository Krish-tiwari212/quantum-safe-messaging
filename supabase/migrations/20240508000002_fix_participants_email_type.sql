-- Drop and recreate the function with explicit CAST to ensure type compatibility
DROP FUNCTION IF EXISTS get_conversation_participants_with_emails(UUID);

CREATE OR REPLACE FUNCTION get_conversation_participants_with_emails(conv_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  public_key TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Function runs with privileges of creator
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.user_id,
    u.full_name,
    u.avatar_url,
    cp.public_key,
    au.email::TEXT  -- Explicitly cast to TEXT to avoid type conflicts
  FROM
    conversation_participants cp
  JOIN
    users u ON cp.user_id = u.id
  JOIN
    auth.users au ON cp.user_id = au.id
  WHERE
    cp.conversation_id = conv_id;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_participants_with_emails TO authenticated;