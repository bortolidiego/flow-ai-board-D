INSERT INTO public.user_roles (user_id, role)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'diego.bortoli@kbtech.com.br'),
    'admin'
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin';