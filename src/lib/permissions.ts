import type {
  RecordOwner,
  User,
} from "@/types";

export type PermissionUser =
  Pick<User, "id" | "role">;

export const getOwnerId = (
  owner:
    | RecordOwner
    | string
    | number
    | null
    | undefined
): string => {
  if (
    owner == null ||
    owner === ""
  ) {
    return "";
  }

  if (
    typeof owner === "object"
  ) {
    return String(
      (owner as any).id ?? ""
    );
  }

  return String(owner);
};

export const isAdmin = (
  user:
    | PermissionUser
    | null
    | undefined
): boolean =>
  user?.role === "admin";


/**
 * Token access:
 *
 * Admin   -> yes
 * Support -> yes
 * Caller  -> own lead tokens
 */
export const canUseTokens = (
  user:
    | PermissionUser
    | null
    | undefined
): boolean =>
  user?.role === "admin" ||
  user?.role === "support" || user?.role === "caller";


/**
 * Token list:
 *
 * Admin   -> all
 * Support -> all
 * Caller  -> their own tokens (API scoped)
 */
export const visibleTokensTo = <
  T extends Record<string, any>
>(
  user:
    | PermissionUser
    | null
    | undefined,
  items:
    | T[]
    | null
    | undefined
): T[] => {
  if (
    !user ||
    !Array.isArray(items)
  ) {
    return [];
  }

  if (!canUseTokens(user)) {
    return [];
  }

  return items;
};


/**
 * Record mutation access.
 *
 * Admin   -> any record
 * Support -> own record
 * Caller  -> own caller record
 *
 * Caller cannot modify support records.
 */
export const canManageRecord = (
  user:
    | PermissionUser
    | null
    | undefined,
  record:
    | {
        createdBy?:
          | RecordOwner
          | string;

        created_by?: string;

        recordType?: string;

        record_type?: string;

        license?: string;

        companySupport?: boolean;

        assistedById?: string | null;

        assisted_by?: string | null;
      }
    | null
    | undefined
): boolean => {
  if (!user || !record) return false;
  if (user.role === "admin") return true;
  const userId = String(user.id);
  const userName = String((user as any)?.name ?? "").trim().toLowerCase();
  const ownerId = getOwnerId((record as any).createdBy ?? (record as any).created_by);
  const assistedId = String((record as any).assistedById ?? (record as any).assisted_by ?? "");
  const assistedName = String((record as any).assistedByName ?? (record as any).assisted_by_name ?? "").trim().toLowerCase();
  const isAssigned = (Boolean(assistedId) && assistedId === userId) || (Boolean(assistedName) && Boolean(userName) && assistedName === userName);
  const recType = (record as any).recordType ?? (record as any).record_type;
  if (recType === "support") {
    return ownerId === userId || isAssigned;
  }
  return ownerId === userId;
};


/**
 * Normal day-book visibility.
 *
 * Admin -> all
 * Support -> own
 * Caller -> own
 */
export const visibleTo = <
  T extends Record<string, any>
>(
  arg1:
    | PermissionUser
    | T[]
    | null
    | undefined,
  arg2:
    | PermissionUser
    | T[]
    | null
    | undefined
): T[] => {
  const items = (
    Array.isArray(arg1)
      ? arg1
      : Array.isArray(arg2)
        ? arg2
        : []
  ) as T[];

  const user = (
    Array.isArray(arg1)
      ? arg2
      : arg1
  ) as
    | PermissionUser
    | null
    | undefined;

  if (
    !items.length ||
    !user
  ) {
    return [];
  }

  if (
    user.role === "admin"
  ) {
    return items;
  }

  const userId =
    String(user.id);

  return items.filter(
    (item) => {
      if (!item) {
        return false;
      }

      const ownerId =
        getOwnerId(
          item.createdBy ??
            item.created_by ??
            item.createdById
        );

      return (
        ownerId === userId
      );
    }
  );
};


/**
 * Support day book.
 *
 * Admin   -> all support
 * Caller  -> all support, READ ONLY
 * Support -> own support
 */
export const visibleSupportTo = <
  T extends Record<string, any>
>(
  user:
    | PermissionUser
    | null
    | undefined,
  items:
    | T[]
    | null
    | undefined
): T[] => {
  if (
    !user ||
    !Array.isArray(items)
  ) {
    return [];
  }

  if (
    user.role === "admin" ||
    user.role === "caller"
  ) {
    return items;
  }

  const userId =
    String(user.id);

  return items.filter(
    (item) => {
      if (!item) {
        return false;
      }

      const ownerId =
        getOwnerId(
          item.createdBy ??
            item.created_by
        );
      const assistedId = String(item.assistedById ?? item.assisted_by ?? "");
      const assistedName = String(item.assistedByName ?? item.assisted_by_name ?? "").trim().toLowerCase();
      const userName = String((user as any)?.name ?? "").trim().toLowerCase();
      const isAssigned = (Boolean(assistedId) && assistedId === userId) || (Boolean(assistedName) && Boolean(userName) && assistedName === userName);

      return (
        ownerId === userId || isAssigned
      );
    }
  );
};
