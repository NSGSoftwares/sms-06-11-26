import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ROLE_LABEL } from "@/config";
import {
  sanitizeMobileInput,
  normalizeMobile,
  validateUserFields,
} from "@/lib/validation";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@/services/userService";
import DataTable, { type Column } from "@/components/data-table/DataTable";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import type { Role, UserInput, UserPublic } from "@/types";
import { useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Create / edit form
// ---------------------------------------------------------------------------

interface UserFormModalProps {
  /** null = create a new user, otherwise edit this user */
  user: UserPublic | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const UserFormModal = ({ user, onClose, onSaved }: UserFormModalProps) => {
  const isEdit = user !== null;
  const { user: signedInUser, refreshUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [mobileNo, setMobileNo] = useState(user?.mobileNo ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">(user?.role ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    const input: UserInput = {
      name: name.trim(),
      mobileNo: normalizeMobile(mobileNo),
      username: username.trim(),
      password,
      role,
    };

    const problem = validateUserFields(input, {
      requirePassword: !isEdit,
      allowAdminRole: isEdit && user?.role === "admin",
    });

    if (problem) {
      toast.warning(problem, { title: "Invalid Details" });
      return;
    }

    setSaving(true);

    try {
      if (user) {
        await updateUser(user.id, input);
        if (String(user.id) === String(signedInUser?.id)) await refreshUser();
        onSaved(`User "${username.trim()}" updated successfully.`);
      } else {
        await createUser(input);
        onSaved(`User "${username.trim()}" created successfully.`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the user.",
        { title: "Save Failed" },
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit User" : "New User"}
      subtitle={isEdit ? "Update the account details" : "Create a staff account"}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="space-y-4">
          <Field label="Name" required>
            {(control) => (
              <TextInput
                {...control}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            )}
          </Field>

          <Field label="Mobile No." required>
            {(control) => (
              <TextInput
                {...control}
                type="tel"
                inputMode="tel"
                value={mobileNo}
                onChange={(e) =>
                  setMobileNo(sanitizeMobileInput(e.target.value))
                }
                placeholder="+91 9876543210"
              />
            )}
          </Field>

          <Field label="Username" required>
            {(control) => (
              <TextInput
                {...control}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Login username"
                autoComplete="off"
              />
            )}
          </Field>

          <Field label={isEdit ? "New Password" : "Password"} required={!isEdit}>
            {(control) => (
              <TextInput
                {...control}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isEdit
                    ? "Leave blank to keep the current password"
                    : "At least 6 characters"
                }
                autoComplete="new-password"
              />
            )}
          </Field>

          {user?.role === "admin" ? (
            <Field label="Role">
              {() => <p className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-fg">Administrator</p>}
            </Field>
          ) : <Field label="Role" required>
            {(control) => (
              <SelectInput
                {...control}
                value={role}
                onChange={(e) => setRole(e.target.value as Role | "")}
              >
                <option value="">Select Role</option>
                <option value="support">{ROLE_LABEL.support}</option>
                <option value="caller">{ROLE_LABEL.caller}</option>
              </SelectInput>
            )}
          </Field>}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} loadingText="Saving...">
            Save User
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// User list page
// ---------------------------------------------------------------------------

type ModalState =
  | { mode: "self_resolved" }
  | { mode: "create" }
  | { mode: "edit"; user: UserPublic };

const ROLE_TONE: Record<Role, BadgeTone> = {
  admin: "brand",
  support: "info",
  caller: "warning",
};

const UserManagement = () => {
  const toast = useToast();

  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ mode: "self_resolved" });
  const [deleteTarget, setDeleteTarget] = useState<UserPublic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setUsers((await listUsers()).filter((user) => user.isActive));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not load users from browser storage.",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSaved = async (message: string) => {
    setModal({ mode: "self_resolved" });
    toast.success(message, { title: "User Saved" });
    await refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);

    try {
      await deleteUser(deleteTarget.id);
      toast.success(`User "${deleteTarget.username}" deleted successfully.`, {
        title: "User Deleted",
      });
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the user.",
        { title: "Delete Failed" },
      );
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<UserPublic>[] = [
    {
      key: "no",
      header: "#",
      render: (_user, index) => (
        <span className="font-medium text-fg-muted">{index + 1}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortValue: (user) => user.name,
      render: (user) => <span className="font-medium">{user.name}</span>,
    },
    {
      key: "mobile",
      header: "Mobile No.",
      sortValue: (user) => user.mobileNo,
      render: (user) => user.mobileNo,
    },
    {
      key: "username",
      header: "Username",
      sortValue: (user) => user.username,
      render: (user) => user.username,
    },
    {
      key: "role",
      header: "Role",
      sortValue: (user) => user.role,
      render: (user) => (
        <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (user) =>
      (
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="edit"
            onClick={() => setModal({ mode: "edit", user })}
            aria-label={`Edit ${user.username}`}
          >
            Edit
          </Button>
          {!user.isProtected && <Button
            variant="dangerOutline"
            size="sm"
            icon="trash"
            onClick={() => setDeleteTarget(user)}
            aria-label={`Delete ${user.username}`}
          >
            Delete
          </Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">User Management</h2>
          <p className="mt-1 text-sm text-fg-subtle">
            Create, edit and remove Support Staff and Caller User accounts
          </p>
        </div>

        <Button
          icon="plus"
          onClick={() => setModal({ mode: "create" })}
        >
          New User
        </Button>
      </div>

      <DataTable
        caption="User accounts"
        columns={columns}
        rows={users}
        rowKey={(user) => user.id}
        loading={loading}
        minWidth="760px"
        emptyTitle="No users found."
      />

      {modal.mode !== "self_resolved" && (
        <UserFormModal
          key={modal.mode === "edit" ? modal.user.id : "new"}
          user={modal.mode === "edit" ? modal.user : null}
          onClose={() => setModal({ mode: "self_resolved" })}
          onSaved={(message) => void handleSaved(message)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete user?"
          message={
            <>
              Are you sure you want to delete{" "}
              <span className="font-medium text-fg-muted">
                {deleteTarget.name} ({deleteTarget.username})
              </span>
              ? Their saved records stay in the day books.
            </>
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
