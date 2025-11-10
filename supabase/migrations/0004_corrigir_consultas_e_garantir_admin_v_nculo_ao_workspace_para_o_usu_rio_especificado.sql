-- 1) Localizar o usuário pelo email
SELECT id, email 
FROM auth.users 
WHERE email = 'bortolidiego@gmail.com';

-- 2) Verificar papéis atuais do usuário (pode retornar múltiplas linhas)
SELECT role 
FROM public.user_roles 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'bortolidiego@gmail.com'
);

-- 3) Verificar workspaces vinculados ao usuário
SELECT w.id, w.name
FROM public.workspaces w
JOIN public.workspace_members wm ON wm.workspace_id = w.id
WHERE wm.user_id = (
  SELECT id FROM auth.users WHERE email = 'bortolidiego@gmail.com'
);

-- 4) Ajustar para admin e assegurar vínculo ao workspace "KB Tech"
DO $$
DECLARE v_uid UUID;
DECLARE v_wid UUID;
BEGIN
  -- Obter o user_id
  SELECT id INTO v_uid FROM auth.users WHERE email = 'bortolidiego@gmail.com';
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário com este email não encontrado';
  END IF;

  -- Normalizar papéis: remover duplicados e definir admin
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin');

  -- Garantir workspace "KB Tech"
  SELECT id INTO v_wid FROM public.workspaces WHERE name = 'KB Tech';
  IF v_wid IS NULL THEN
    INSERT INTO public.workspaces (name) VALUES ('KB Tech') RETURNING id INTO v_wid;
  END IF;

  -- Garantir vínculo ao workspace
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = v_wid AND user_id = v_uid
  ) THEN
    INSERT INTO public.workspace_members (workspace_id, user_id) VALUES (v_wid, v_uid);
  END IF;
END;
$$;

-- 5) Reconfirmar papel e algum workspace após ajustes
SELECT role 
FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'bortolidiego@gmail.com')
LIMIT 1;

SELECT w.name 
FROM public.workspaces w 
JOIN public.workspace_members wm ON wm.workspace_id = w.id 
WHERE wm.user_id = (SELECT id FROM auth.users WHERE email = 'bortolidiego@gmail.com')
ORDER BY w.created_at ASC 
LIMIT 1;