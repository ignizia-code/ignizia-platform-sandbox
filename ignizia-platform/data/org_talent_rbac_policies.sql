-- ============================================================================
-- Org/Talent RBAC Policies
-- ----------------------------------------------------------------------------
-- Applies role-aware policies for org_* and talent_* tables.
-- Read: all authenticated users.
-- Write: HR Manager claim OR service_role.
--
-- Requires JWT claim shape: app_metadata.app_role = 'HR Manager'
-- ============================================================================

DO $$
BEGIN
  -- Drop permissive demo policies if present
  EXECUTE 'DROP POLICY IF EXISTS org_nodes_allow_all ON public.org_nodes';
  EXECUTE 'DROP POLICY IF EXISTS org_edges_allow_all ON public.org_edges';
  EXECUTE 'DROP POLICY IF EXISTS org_activity_log_allow_all ON public.org_activity_log';
  EXECUTE 'DROP POLICY IF EXISTS org_chat_history_allow_all ON public.org_chat_history';

  EXECUTE 'DROP POLICY IF EXISTS talent_departments_allow_all ON public.talent_departments';
  EXECUTE 'DROP POLICY IF EXISTS talent_roles_allow_all ON public.talent_roles';
  EXECUTE 'DROP POLICY IF EXISTS talent_role_requirements_allow_all ON public.talent_role_requirements';
  EXECUTE 'DROP POLICY IF EXISTS talent_employees_allow_all ON public.talent_employees';
  EXECUTE 'DROP POLICY IF EXISTS talent_employee_assertions_allow_all ON public.talent_employee_assertions';
  EXECUTE 'DROP POLICY IF EXISTS talent_studio_collections_allow_all ON public.talent_studio_collections';
  EXECUTE 'DROP POLICY IF EXISTS talent_role_department_links_allow_all ON public.talent_role_department_links';
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

CREATE OR REPLACE FUNCTION public.is_hr_manager()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    auth.role() = 'service_role'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'app_role', '') = 'HR Manager';
$$;

CREATE OR REPLACE FUNCTION public.is_org_reader()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role() IN ('authenticated', 'service_role');
$$;

-- Org projection tables
CREATE POLICY org_nodes_read_policy ON public.org_nodes
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY org_nodes_write_policy ON public.org_nodes
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY org_edges_read_policy ON public.org_edges
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY org_edges_write_policy ON public.org_edges
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY org_activity_log_read_policy ON public.org_activity_log
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY org_activity_log_write_policy ON public.org_activity_log
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY org_chat_history_read_policy ON public.org_chat_history
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY org_chat_history_write_policy ON public.org_chat_history
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

-- Canonical talent tables
CREATE POLICY talent_departments_read_policy ON public.talent_departments
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_departments_write_policy ON public.talent_departments
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY talent_roles_read_policy ON public.talent_roles
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_roles_write_policy ON public.talent_roles
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY talent_role_requirements_read_policy ON public.talent_role_requirements
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_role_requirements_write_policy ON public.talent_role_requirements
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY talent_employees_read_policy ON public.talent_employees
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_employees_write_policy ON public.talent_employees
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY talent_employee_assertions_read_policy ON public.talent_employee_assertions
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_employee_assertions_write_policy ON public.talent_employee_assertions
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY talent_studio_collections_read_policy ON public.talent_studio_collections
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_studio_collections_write_policy ON public.talent_studio_collections
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());

CREATE POLICY talent_role_department_links_read_policy ON public.talent_role_department_links
  FOR SELECT USING (public.is_org_reader());
CREATE POLICY talent_role_department_links_write_policy ON public.talent_role_department_links
  FOR ALL USING (public.is_hr_manager()) WITH CHECK (public.is_hr_manager());
