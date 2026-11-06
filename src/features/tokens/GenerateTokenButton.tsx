// File: sms-frontend/src/features/tokens/GenerateTokenButton.tsx
import { useState, useEffect, type FormEvent } from "react";

import { useTokens } from "@/hooks/useTokens";
import { useAuth } from "@/hooks/useAuth";

import { canUseTokens } from "@/lib/permissions";
import { formatTokenNo } from "@/lib/tokens";
import {
  normalizeMobile,
  sanitizeMobileInput,
  validateMobileInput,
} from "@/lib/validation";
import { getSettings } from "@/services/settingService";

import Button from "@/components/ui/Button";
import {
  Field,
  SelectInput,
  TextInput,
} from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import { toast } from "@/components/ui/ToastProvider";

import type { Token } from "@/types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Errors = Partial<
  Record<"mobileNo", string>
>;

/* -------------------------------------------------------------------------- */
/* Token Form                                                                 */
/* -------------------------------------------------------------------------- */

const TokenFormModal = ({
  onClose,
  kind,
}: {
  onClose: () => void;
  kind: "support" | "lead";
}) => {
  const { user } = useAuth();
  const { addToken } = useTokens();

  const canUse = canUseTokens(user);

  const [dynProducts, setDynProducts] = useState<string[]>([]);

  useEffect(() => {
    getSettings()
      .then((s) => {
        const data = (s as any)?.data ?? s;
        if (Array.isArray(data?.products)) {
          setDynProducts(data.products);
        }
      })
      .catch(console.error);
  }, []);

  const [customerName, setCustomerName] =
    useState("");

  const [mobileNo, setMobileNo] =
    useState("");

  const [software, setSoftware] =
    useState("");
  const [address, setAddress] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [errors, setErrors] =
    useState<Errors>({});

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [created, setCreated] =
    useState<Token | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Caller protection                                                        */
  /* ------------------------------------------------------------------------ */

  if (!canUse) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Submit                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    if (!canUseTokens(user)) {
      setSaveError(
        "You do not have permission to generate tokens.",
      );
      return;
    }

    const found: Errors = {};

    if (!mobileNo.trim()) {
      found.mobileNo = "Phone number is required.";
    }

    if (mobileNo.trim()) {
      const mobileError = validateMobileInput(mobileNo);
      if (mobileError) {
        found.mobileNo = mobileError;
      }
    }

    setErrors(found);

    if (Object.keys(found).length > 0) {
      toast.warning(
        `Please check the entered phone number: ${Object.values(found).filter(Boolean).join(" ")}`,
        { title: "Invalid Phone Number" },
      );
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const token = await addToken({
        kind,
        customerName:
          customerName.trim(),

        mobileNo:
          normalizeMobile(mobileNo),

        software,

        progress: "pending",
        address,
        contactPersonName,
        gstNumber,
      });

      setCreated(token);
      toast.success(
        `Token #${formatTokenNo(token.id)} generated${token.customerName ? ` for ${token.customerName}` : ""}.`,
        { title: "Token Generated" },
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Could not generate the token.";
      setSaveError(msg);
      toast.error(msg, { title: "Generation Failed" });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Success                                                                  */
  /* ------------------------------------------------------------------------ */

  if (created) {
    return (
      <Modal
        title="Token generated"
        onClose={onClose}
        maxWidth="max-w-md"
        closeOnOverlay
      >
        <div className="text-center">
          <p className="text-sm text-fg-subtle">
            Token number
          </p>

          <p className="mt-1 text-4xl font-bold tracking-wide text-brand">
            {formatTokenNo(created.id)}
          </p>

          <p className="mt-3 text-sm text-fg-muted">
            {[created.customerName, created.mobileNo, created.software].filter(Boolean).join(" · ") || "No customer details provided"}
          </p>

          <p className="mt-1 text-xs text-fg-subtle">
            This {kind} token is available in the matching form and token queue.
          </p>

          <Button
            className="mt-6 w-full"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Form                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <Modal
      title={`Generate ${kind === "lead" ? "Lead" : "Support"} Token`}
      subtitle={kind === "lead" ? "Capture a prospective customer" : "Customer is waiting for help"}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={(e) =>
          void handleSubmit(e)
        }
        noValidate
      >
        {saveError && (
          <Notice
            type="error"
            message={saveError}
          />
        )}

        <div className="space-y-4">
          {kind === "lead" && <>
            <Field label="Contact Person Name">{(c)=><TextInput {...c} value={contactPersonName} onChange={e=>setContactPersonName(e.target.value)} placeholder="Contact person (optional)"/>}</Field>
            <Field label="Address">{(c)=><TextInput {...c} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Business address (optional)"/>}</Field>
            <Field label="GST Number" hint="Optional">{(c)=><TextInput {...c} value={gstNumber} onChange={e=>setGstNumber(e.target.value.toUpperCase())} placeholder="GSTIN (optional)"/>}</Field>
          </>}
          {/* Customer Name */}

          <Field
            label="Customer Name"
          >
            {(c) => (
              <TextInput
                {...c}
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value,
                  )
                }
                placeholder="Customer name"
                autoComplete="off"
              />
            )}
          </Field>

          {/* Phone */}

          <Field
            label="Phone No."
            required
            error={errors.mobileNo}
          >
            {(c) => (
              <TextInput
                {...c}
                type="tel"
                inputMode="tel"
                value={mobileNo}
                onChange={(e) =>
                  setMobileNo(
                    sanitizeMobileInput(e.target.value),
                  )
                }
                placeholder="+91 9876543210"
              />
            )}
          </Field>

          {/* Software (Dynamic) */}

          <Field
            label="Software"
          >
            {(c) => (
              <SelectInput
                {...c}
                value={software}
                onChange={(e) =>
                  setSoftware(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Select Software
                </option>

                {dynProducts.map((p) => (
                  <option
                    key={p}
                    value={p}
                  >
                    {p}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

        </div>

        {/* Actions */}

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-5">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={saving}
            loadingText="Generating..."
          >
            Generate
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Generate Token Button                                                      */
/* -------------------------------------------------------------------------- */

const GenerateTokenButton = ({ kind }: { kind?: "support" | "lead" } = {}) => {
  const { user } = useAuth();
  const [open, setOpen] =
    useState(false);
  const [selectedKind, setSelectedKind] = useState<"support" | "lead">(kind ?? (user?.role === "caller" ? "lead" : "support"));

  useEffect(() => {
    if (kind) setSelectedKind(kind);
    else if (user?.role === "caller") setSelectedKind("lead");
  }, [kind, user?.role]);

  if (!canUseTokens(user)) {
    return null;
  }

  return (
    <>
      {user?.role === "admin" && !kind && <select aria-label="Token type" value={selectedKind} onChange={(e) => setSelectedKind(e.target.value as "support" | "lead")} className="mr-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm"><option value="support">Support token</option><option value="lead">Lead token</option></select>}
      <Button
        icon="plus"
        onClick={() =>
          setOpen(true)
        }
      >
          Generate {kind === "lead" || user?.role === "caller" ? "Lead" : selectedKind === "lead" ? "Lead" : "Support"} Token
      </Button>

      {open && (
        <TokenFormModal
          kind={kind ?? selectedKind}
          onClose={() =>
            setOpen(false)
          }
        />
      )}
    </>
  );
};

export default GenerateTokenButton;
