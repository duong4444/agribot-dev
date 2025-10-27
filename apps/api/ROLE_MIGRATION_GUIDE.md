# Role Migration Guide: SUPER_ADMIN → ADMIN

## 📋 Overview
Hệ thống đã được refactor từ 3 roles (FARMER, ADMIN, SUPER_ADMIN) xuống còn 2 roles (FARMER, ADMIN) để đơn giản hóa phân quyền.

## ✅ Changes Made

### 1. **Code Changes**
- ✅ Removed `SUPER_ADMIN` from `UserRole` enum in `user.entity.ts`
- ✅ Updated all `@Roles()` decorators in `users.controller.ts`:
  - `@Roles(UserRole.SUPER_ADMIN)` → `@Roles(UserRole.ADMIN)`
  - `@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)` → `@Roles(UserRole.ADMIN)`

### 2. **Permissions Consolidated**
All permissions previously restricted to `SUPER_ADMIN` are now available to `ADMIN`:
- ✅ View all users
- ✅ View user by ID
- ✅ Activate/Deactivate users
- ✅ Change user roles
- ✅ Delete users

## 🔄 Database Migration

### Required Action
If your database has existing users with `SUPER_ADMIN` role, run the migration script:

```bash
# Option 1: Using psql
psql -U your_username -d your_database -f src/database/scripts/migrate-roles.sql

# Option 2: Using database GUI
# Copy and paste the SQL from migrate-roles.sql into your SQL editor
```

### Migration SQL
```sql
UPDATE users 
SET role = 'ADMIN' 
WHERE role = 'SUPER_ADMIN';
```

### Verification
After running the migration, verify:
```sql
-- Should return 0
SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN';

-- Check updated roles
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;
```

Expected result:
| role   | count |
|--------|-------|
| FARMER | X     |
| ADMIN  | Y     |

## 🚀 Deployment Steps

1. **Backup database** (important!)
   ```bash
   pg_dump -U your_username your_database > backup_before_role_migration.sql
   ```

2. **Pull latest code**
   ```bash
   git pull origin main
   ```

3. **Install dependencies** (if needed)
   ```bash
   npm install
   ```

4. **Run database migration**
   ```bash
   psql -U your_username -d your_database -f src/database/scripts/migrate-roles.sql
   ```

5. **Restart application**
   ```bash
   npm run start:prod
   ```

6. **Test admin functions**
   - Login as an ADMIN user
   - Verify all admin endpoints work:
     - `GET /users` - List all users
     - `PUT /users/:id/role` - Change user role
     - `DELETE /users/:id` - Delete user

## 📝 Notes

- **FARMER role**: Unchanged, still default role for new users
- **ADMIN role**: Now has all administrative permissions
- **No breaking changes** for existing FARMER users
- **Existing ADMIN users** automatically gain SUPER_ADMIN permissions

## ⚠️ Important

- The migration is **irreversible** without database backup
- All `SUPER_ADMIN` users will become `ADMIN` users
- Make sure to backup your database before migration
- Test in staging environment first

## 🐛 Troubleshooting

### Issue: TypeScript errors about SUPER_ADMIN
**Solution**: Clear build cache and rebuild
```bash
rm -rf dist
npm run build
```

### Issue: Migration fails
**Check**: 
1. Database connection
2. User permissions
3. Existing constraints

**Fix**: Review error message and adjust SQL if needed

## 📊 Impact Summary

| Category | Before | After |
|----------|--------|-------|
| Total Roles | 3 | 2 |
| Admin Permissions | Split (ADMIN + SUPER_ADMIN) | Unified (ADMIN only) |
| Code Complexity | Higher | Lower |
| Maintenance | Harder | Easier |

---

**Last Updated**: 2025-10-27
**Status**: ✅ Ready for Production
