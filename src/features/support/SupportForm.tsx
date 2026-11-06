// File: sms-frontend/src/features/support/SupportForm.tsx
import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { resolveAttachmentUrl } from "@/services/api";
import {
  LICENSES,
  STATUSES,
} from "@/config";
import { useRecords } from "@/hooks/useRecords";
import { useAuth } from "@/hooks/useAuth";
import { useSessionTimer, useEntryDeadline } from "@/hooks/useSessionTimer";
import { useTokens } from "@/hooks/useTokens";
import TokenSelect from "@/features/tokens/TokenSelect";
import ContentListEditor from "@/components/records/ContentListEditor";
import AttachmentPicker from "@/components/records/AttachmentPicker";
import SerialCustomerSuggestion, { type SerialCustomerDetails } from "@/components/records/SerialCustomerSuggestion";
import { Detail, DetailGrid } from "@/components/records/DetailParts";
import ImageLightbox from "@/components/records/ImageLightbox";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import {
  RestartDialog,
  TimerBanner,
  TimerFields,
} from "@/components/timer/TimerParts";
import {
  cleanItems,
  createEmptyItem,
  hasContent,
  itemsForEditing,
} from "@/lib/files";
import { formatDate, formatDuration, toISODate } from "@/lib/time";
import { splitProducts } from "@/lib/products";
import {
  sanitizeMobileInput,
  validateMobileInput,
} from "@/lib/validation";
import { getSettings, lookupCustomerBySerial } from "@/services/settingService";
import { listStaff } from "@/services/userService";
import type {
  AttachmentFile,
  ContentItem,
  RecordStatus,
  SupportRecord,
} from "@/types";

interface SupportFormProps {
  initial?: SupportRecord;
  onSaved?: (record: SupportRecord) => void;
  onCancel?: () => void;
}

type FieldErrors = Partial<
  Record<"serialNo" | "mobileNo" | "product" | "license" | "time", string>
>;

export const SUPPORT_TIMER_KEY = "support";

const STATUS_BUTTON_STYLES: Record<
  string,
  { active: string; inactive: string }
> = {
  open: {
    active:
      "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20",
    inactive:
      "bg-surface border-line text-fg-muted hover:border-blue-300 hover:text-blue-600",
  },
  in_progress: {
    active:
      "bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20",
    inactive:
      "bg-surface border-line text-fg-muted hover:border-amber-300 hover:text-amber-600",
  },
  resolved: {
    active:
      "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20",
    inactive:
      "bg-surface border-line text-fg-muted hover:border-emerald-300 hover:text-emerald-600",
  },
  not_resolved: {
    active: "bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-500/20",
    inactive: "bg-surface border-line text-fg-muted hover:border-red-300 hover:text-red-600",
  },
  transferred: {
    active:
      "bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-500/20",
    inactive:
      "bg-surface border-line text-fg-muted hover:border-purple-300 hover:text-purple-600",
  },
  self_resolved: {
    active:
      "bg-slate-700 text-white border-slate-700 shadow-sm ring-2 ring-slate-500/20",
    inactive:
      "bg-surface border-line text-fg-muted hover:border-slate-300 hover:text-slate-700",
  },
};

const SupportForm = ({ initial, onSaved, onCancel }: SupportFormProps) => {
  const isEdit = initial !== undefined;
  const { user } = useAuth();
  const { addSupportRecord, editSupportRecord, supportRecords, callerRecords } = useRecords();
  const { completeToken, claimToken } = useTokens();
  const toast = useToast();

  const [dynProducts, setDynProducts] = useState<string[]>([]);
  const [serialDeadlineSeconds, setSerialDeadlineSeconds] = useState(15);
  const [supportStaff, setSupportStaff] = useState<Array<{ id: string; name: string }>>([]);
  const [supportStaffLoading, setSupportStaffLoading] = useState(false);
  const [assistedById, setAssistedById] = useState(initial?.assistedById ?? "");
  const [loadedTransferredId, setLoadedTransferredId] = useState<string | null>(null);
  const lastLoadedTransferredSerialRef = useRef<string | null>(null);

  // Ongoing transferred supports visible only to the assigned support user and Admin
  const transferredSupportList: SupportRecord[] = useMemo(() => {
    if (!user || (user.role !== "admin" && user.role !== "support")) return [];
    const currentUserId = String(user.id);
    const isAdmin = user.role === "admin";
    const currentUserName = String(user?.name || "").trim().toLowerCase();
    const currentUserUsername = String(user?.username || "").trim().toLowerCase();

    return (supportRecords as SupportRecord[]).filter((rec: SupportRecord) => {
      // Must have a transfer recipient and ongoing/transferred status
      const isTransferredStatus =
        rec.status === "transferred" ||
        rec.status === "not_resolved" ||
        String(rec.status).toLowerCase().includes("transfer");
      const hasTransferTarget = Boolean(rec.assistedById) || Boolean(rec.assistedByName);
      if (!isTransferredStatus || !hasTransferTarget) return false;

      // Admin can see all transferred supports
      if (isAdmin) return true;

      // Normal support user ONLY sees records transferred to THEM (match by ID, Name, or Username)
      const matchesId = Boolean(rec.assistedById) && String(rec.assistedById).trim().toLowerCase() === currentUserId.trim().toLowerCase();
      const recAssistedName = String(rec.assistedByName || "").trim().toLowerCase();
      const matchesName = Boolean(recAssistedName) && (
        (currentUserName !== "" && recAssistedName === currentUserName) ||
        (currentUserUsername !== "" && recAssistedName === currentUserUsername)
      );
      return matchesId || matchesName;
    });
  }, [user, supportRecords]);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        const data = (settings as any)?.data ?? settings;
        if (Array.isArray(data?.products)) {
          setDynProducts(data.products);
        }
        const rawDeadline = Number(data?.serial_entry_deadline_seconds);
        if (Number.isFinite(rawDeadline)) {
          setSerialDeadlineSeconds(Math.max(5, Math.min(300, rawDeadline)));
        }
      })
      .catch((error) => {
        console.error("Could not load support form settings", error);
        toast.warning("Could not load the product list. Default products will be used.", {
          title: "Settings Notice",
        });
      });
  }, [toast]);

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "support") return;
    let active = true;
    setSupportStaffLoading(true);
    void listStaff("support")
      .then((staff) => {
        if (active) setSupportStaff(staff.map(({ id, name }) => ({ id, name })));
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Could not load support staff.");
      })
      .finally(() => {
        if (active) setSupportStaffLoading(false);
      });
    return () => { active = false; };
  }, [user?.role, toast]);

  const [tokenId, setTokenId] = useState<string | number | null>(null);
  const timer = useSessionTimer(isEdit ? undefined : SUPPORT_TIMER_KEY);

  const [serialNo, setSerialNo] = useState(initial?.serialNo ?? "");
  const changeSerialNo = (value: string) => setSerialNo(value.replace(/\D/g, ""));
  const [customerMatch, setCustomerMatch] = useState("");
  // const [customerRecordMatched, setCustomerRecordMatched] = useState(false);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const customerSuggestionApplied = useRef(false);
  const selectedSuggestionSerial = useRef<string | null>(null);

  const [customerName, setCustomerName] = useState(
    initial?.customerName ?? "",
  );
  const [organizationName, setOrganizationName] = useState(initial?.organizationName ?? "");

  const [mobileNo, setMobileNo] = useState(initial?.mobileNo ?? "");
  const changeMobileNo = (value: string) =>
    setMobileNo(sanitizeMobileInput(value));

  const [product, setProduct] = useState(
    initial && initial.product !== "-" ? splitProducts(initial.product)[0] ?? "" : "",
  );

  useEffect(() => {
    if (serialNo.trim() && selectedSuggestionSerial.current === serialNo.trim()) {
      setCustomerLookupLoading(false);
      setCustomerMatch("Existing customer details applied. Please verify before saving.");
      return;
    }
    selectedSuggestionSerial.current = null;
    customerSuggestionApplied.current = false;
    if (isEdit || !serialNo.trim()) {
      setCustomerMatch("");
      // setCustomerRecordMatched(false);
      setCustomerLookupLoading(false);
      return;
    }

    // When a transferred support ticket is loaded, preserve its customer details without wiping
    if (loadedTransferredId && lastLoadedTransferredSerialRef.current !== null && serialNo.trim() === lastLoadedTransferredSerialRef.current) {
      setCustomerMatch(customerName ? `Loaded transferred support customer: ${customerName}` : "");
      setCustomerLookupLoading(false);
      return;
    }

    let current = true;
    setCustomerLookupLoading(true);
    // setCustomerRecordMatched(false);
    setCustomerMatch("Checking customer directory…");
    setCustomerName("");
    setOrganizationName("");
    setMobileNo("");
    setProduct("");
    const request = window.setTimeout(() => {
      void lookupCustomerBySerial(serialNo.trim()).then((customer) => {
        if (!current) return;
        setCustomerLookupLoading(false);
        if (customer && !customerSuggestionApplied.current) {
          setCustomerName(customer.customer_name);
          setMobileNo(sanitizeMobileInput(customer.mobile_no));
          if (customer.product) {
            const customerProducts = splitProducts(customer.product);
            setDynProducts((previous) => [...new Set([...previous, ...customerProducts])]);
            setProduct(customerProducts[0] ?? "");
          }
          setCustomerMatch(`Matched imported customer: ${customer.customer_name}`);
          // setCustomerRecordMatched(true);
        } else if (!customer) {
          setCustomerMatch("No imported customer matches this serial number. Please verify the details.");
        }
      }).catch(() => {
        if (current) {
          setCustomerLookupLoading(false);
          setCustomerMatch("Customer directory is unavailable. Verify the serial number manually.");
        }
      });
    }, 300);
    return () => { current = false; window.clearTimeout(request); };
  }, [serialNo, isEdit, loadedTransferredId]);

  const applySerialSuggestion = (details: SerialCustomerDetails) => {
    customerSuggestionApplied.current = true;
    selectedSuggestionSerial.current = details.serialNo;
    changeSerialNo(details.serialNo);
    setCustomerName(details.customerName);
    setOrganizationName(details.organizationName);
    setMobileNo(sanitizeMobileInput(details.mobileNo));
    setProduct(splitProducts(details.product)[0] ?? "");
    if (details.license) setLicense(details.license);
    setDynProducts((previous) => [...new Set([...previous, ...splitProducts(details.product)])]);
    setCustomerMatch("Existing customer details applied. Please verify before saving.");
  };
  const [license, setLicense] = useState<string>(initial?.license ?? "");

  const [status, setStatus] = useState<RecordStatus>(
    initial?.status ?? (initial?.assistedById ? "transferred" : "resolved"),
  );

  const handleTransferToChange = (targetUserId: string) => {
    setAssistedById(targetUserId);
    if (targetUserId) {
      // When transferring to another user, status MUST be locked to Transferred
      setStatus("transferred");
    } else {
      if (status === "transferred") {
        setStatus("resolved");
      }
    }
  };

  const handleSelectTransferredSupport = (recordId: string) => {
    if (!recordId) {
      setLoadedTransferredId(null);
      lastLoadedTransferredSerialRef.current = null;
      resetForm();
      return;
    }

    const selected = transferredSupportList.find((r: SupportRecord) => String(r.id) === String(recordId));
    if (!selected) return;

    setLoadedTransferredId(String(selected.id));
    lastLoadedTransferredSerialRef.current = selected.serialNo ? selected.serialNo.trim() : null;

    setSerialNo(selected.serialNo || "");
    setMobileNo(selected.mobileNo || "");
    setCustomerName(selected.customerName || "");
    setOrganizationName(selected.organizationName || "");
    if (selected.product && selected.product !== "-") {
      setDynProducts((previous) => [...new Set([...previous, ...splitProducts(selected.product)])]);
      setProduct(splitProducts(selected.product)[0] ?? "");
    } else {
      setProduct("");
    }
    setCustomerMatch(selected.customerName ? `Loaded transferred support for: ${selected.customerName}` : "");
    setLicense(selected.license || "Valid");
    setProblems(selected.problems && selected.problems.length ? itemsForEditing(selected.problems) : [createEmptyItem()]);
    setSolutions(selected.solutions && selected.solutions.length ? itemsForEditing(selected.solutions) : [createEmptyItem()]);
    setCompanySupport(Boolean(selected.companySupport));
    setCompanySupportRemark(selected.remarks || "");
    setAttachments(selected.attachments || []);

    // When picking up transferred support to resolve it:
    // clear transfer to so it can be resolved by current user, or transferred again
    setAssistedById("");
    setStatus("resolved");

    toast.info(`Transferred support #${selected.id} loaded for ${selected.customerName || selected.mobileNo}.`, {
      title: "Transferred Support Loaded",
      duration: 3000,
    });
    window.dispatchEvent(new CustomEvent("sms-transfer-picked-up", {
      detail: { recordId: String(selected.id) },
    }));
  };

  const [problems, setProblems] = useState<ContentItem[]>(() =>
    initial ? itemsForEditing(initial.problems) : [createEmptyItem()],
  );
  const [solutions, setSolutions] = useState<ContentItem[]>(() =>
    initial ? itemsForEditing(initial.solutions) : [createEmptyItem()],
  );
  const [companySupport, setCompanySupport] = useState(
    initial?.companySupport ?? false,
  );
  const [companySupportRemark, setCompanySupportRemark] = useState(initial?.remarks ?? "");
  const [attachments, setAttachments] = useState<AttachmentFile[]>(initial?.attachments ?? []);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isInvalid = license === "Invalid";

  // Support call identification is satisfied by a serial found in the customer directory.
  const entrySatisfied = serialNo.trim() !== "";

  // Restarts the timer if the required fields are not filled in time.
  useEntryDeadline({
    timer,
    enabled: !isEdit && !loadedTransferredId,
    deadlineSeconds: serialDeadlineSeconds,
    satisfied: entrySatisfied,
    onExpire: () =>
      toast.warning(
        `Timer restarted: enter the serial number within ${serialDeadlineSeconds} seconds of starting.`,
        { title: "Time Limit Reached" },
      ),
  });

  const handleLicenseChange = (value: string) => {
    setLicense(value);

    if (!isEdit) {
      if (value === "Invalid") {
        setStatus("self_resolved" as RecordStatus);
      } else if (status === ("self_resolved" as RecordStatus)) {
        setStatus(assistedById ? ("transferred" as RecordStatus) : ("resolved" as RecordStatus));
      }
    }
  };

  const resetForm = () => {
    setSerialNo("");
    setCustomerName("");
    setOrganizationName("");
    setMobileNo("");
    setProduct("");
    setLicense("");
    setStatus("resolved");
    setAssistedById("");
    setLoadedTransferredId(null);
    lastLoadedTransferredSerialRef.current = null;
    setProblems([createEmptyItem()]);
    setSolutions([createEmptyItem()]);
    setCompanySupport(false);
    setCompanySupportRemark("");
    setAttachments([]);
    setErrors({});
    setTokenId(null);
    timer.reset();
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};

    if (!serialNo.trim()) {
      found.serialNo = "Serial number is required.";
    }

    if (!mobileNo.trim()) {
      found.mobileNo = "Mobile number is required.";
    }

    const mobileError = validateMobileInput(mobileNo);
    if (mobileError) {
      found.mobileNo = mobileError;
    }

    if (!license) {
      found.license = "Select a license status.";
    }

    if (license === "Valid") {
      if (splitProducts(product).length === 0) {
        found.product = "Select a product.";
      }

      if (!isEdit) {
        if (!timer.started) {
          found.time = "Click Start to record the start time.";
        } else if (!timer.ended) {
          found.time = "Click End to record the end time before saving.";
        }
      }
    }

    return found;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;

    const found = validate();
    setErrors(found);

    if (customerLookupLoading) {
      toast.warning("Please wait for serial number verification to complete before saving.", {
        title: "Verification in Progress",
      });
      return;
    }

    if (Object.keys(found).length > 0) {
      toast.warning(
        `Please check the form. ${Object.values(found).filter(Boolean).join(" ")}`,
        { title: "Validation Required" },
      );
      return;
    }

    setSaving(true);

    try {
      const details = {
        record_type: "support",
        serialNo: serialNo.trim(),
        customerName: customerName.trim(),
        organizationName: organizationName.trim(),
        mobileNo: mobileNo.trim(),
        product: product.trim() || "-",
        license: (isInvalid ? "Invalid" : "Valid") as SupportRecord["license"],
        status,
        problems: isInvalid ? [] : cleanItems(problems),
        solutions: isInvalid ? [] : cleanItems(solutions),
        companySupport: isInvalid ? false : companySupport,
        assistedById: assistedById || null,
        remarks: companySupport && !isInvalid ? companySupportRemark.trim() : "",
        attachments,
      };

      const targetEditId = initial?.id ?? loadedTransferredId;
      if (targetEditId) {
        const saved = await editSupportRecord(targetEditId, details);
        const uploadErrors = (saved as SupportRecord & { attachmentUploadErrors?: string[] }).attachmentUploadErrors ?? [];
        if (uploadErrors.length) {
          toast.warning(
            `Support record updated, but ${uploadErrors.length} screenshot(s) could not be saved: ${uploadErrors.join("; ")}`,
            { title: "Saved with Warnings" },
          );
        } else {
          toast.success(
            `Support record #${saved.id} ${saved.status === "transferred" ? "transferred to " + (saved.assistedByName || "user") : "updated successfully"} (${String(saved.status).replace(/_/g, " ")}).`,
            { title: "Record Updated" },
          );
        }
        if (loadedTransferredId) {
          setLoadedTransferredId(null);
          resetForm();
        }
        onSaved?.(saved);
        return;
      }

      const now = new Date();
      const hasSession = !isInvalid && timer.ended;
      const durationSeconds = hasSession
        ? timer.getFinalDurationSeconds()
        : 0;

      const saved = await addSupportRecord({
        ...details,
        date: formatDate(now),
        dateISO: toISODate(now),
        startTime: hasSession ? timer.startTime : "-",
        endTime: hasSession ? timer.endTime : "-",
        duration: hasSession ? formatDuration(durationSeconds) : "-",
        durationSeconds,
      });

      let tokenCompletionFailed = false;

      if (tokenId !== null && tokenId !== "") {
        try {
          await completeToken(tokenId as string, {
            kind: "support",
            id: saved.id,
          });
        } catch (tokenError) {
          console.error("Could not complete the token", tokenError);
          tokenCompletionFailed = true;
        }
      }

      resetForm();

      const uploadErrors = (saved as SupportRecord & { attachmentUploadErrors?: string[] }).attachmentUploadErrors ?? [];
      if (uploadErrors.length) {
        toast.warning(
          `Support record saved, but ${uploadErrors.length} screenshot(s) could not be saved: ${uploadErrors.join("; ")}`,
          { title: "Saved with Warnings" },
        );
      } else if (tokenCompletionFailed) {
        toast.warning(
          "Support record saved, but the selected token could not be completed.",
          { title: "Token Notice" },
        );
      } else if (assistedById) {
        toast.success(
          `Support record saved and transferred to ${supportStaff.find((s) => s.id === assistedById)?.name || "support user"} (Transferred).`,
          { title: "Support Transferred" },
        );
      } else {
        toast.success(
          `Support record saved for ${saved.customerName || saved.serialNo} (${String(saved.status).replace(/_/g, " ")}).`,
          { title: "Record Saved" },
        );
      }

      onSaved?.(saved);
    } catch (error) {
      toast.error(
        `Support record was not saved. ${error instanceof Error ? error.message : "Unexpected error. Check the backend logs and try again."}`,
        { title: "Save Failed" },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEdit) {
      onCancel?.();
      return;
    }

    const hasData =
      serialNo ||
      customerName ||
      organizationName ||
      mobileNo ||
      product ||
      license ||
      timer.started ||
      hasContent(problems) ||
      hasContent(solutions);

    if (hasData) {
      setShowClearConfirm(true);
      return;
    }

    resetForm();
  };

  return (
    <div className="w-full">
      {!isEdit && (
        <TimerBanner
          timer={timer}
          noun="Support"
        />
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        {isEdit && initial && (
          <div className="mb-5">
            <DetailGrid>
              <Detail label="Start Time" value={initial.startTime} />
              <Detail label="End Time" value={initial.endTime} />
              <Detail label="Total Duration" value={initial.duration} />
            </DetailGrid>

            <p className="mt-2 text-xs text-fg-subtle">
              Times are recorded when the call happens and cannot be edited.
            </p>
          </div>
        )}

        {loadedTransferredId && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/90 p-3.5 text-xs text-purple-900 shadow-sm dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-200">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 font-bold text-white">
                #
              </span>
              <span>
                Working on Transferred Support <strong>#{loadedTransferredId}</strong>. You can update notes, resolve it, or re-transfer.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectTransferredSupport("")}
              className="font-bold text-purple-700 underline hover:text-purple-900 dark:text-purple-300 dark:hover:text-white"
            >
              Cancel & Start New
            </button>
          </div>
        )}

        <section className="relative overflow-visible rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/45 via-surface to-surface p-4 shadow-card sm:p-6">
          <div className="mb-5 border-b border-brand/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-brand-fg shadow-glow">01</span>
              <div>
                <h3 className="font-semibold text-fg">Call and customer details</h3>
                <p className="mt-1 text-sm text-fg-subtle">Identify the customer, select the product, and record the call outcome.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 lg:grid-cols-2">
            <div className="relative">
              <Field label="Serial No." required error={errors.serialNo}>
                {(control) => (
                  <TextInput
                    {...control}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="serialNo"
                    value={serialNo}
                    autoComplete="off"
                    onChange={(e) => { changeSerialNo(e.target.value); }}
                    placeholder="Enter serial number"
                  />
                )}
              </Field>
              {!isEdit && !loadedTransferredId && (
                <SerialCustomerSuggestion
                  serialNo={serialNo}
                  supportRecords={supportRecords}
                  callerRecords={callerRecords}
                  onApply={applySerialSuggestion}
                />
              )}
            </div>

            <Field label="Mobile No." required error={errors.mobileNo} hint="10-digit local numbers default to India (+91). Add +country code for other countries.">
              {(control) => (
                <TextInput
                  {...control}
                  type="tel"
                  name="mobileNo"
                  value={mobileNo}
                  inputMode="tel"
                  onChange={(e) =>
                    changeMobileNo(e.target.value)
                  }
                  placeholder="Enter mobile number"
                />
              )}
            </Field>

            {(customerMatch || !isEdit) && (
              <div className="min-w-0 space-y-1 text-xs leading-5 text-fg-subtle lg:col-span-2">
                {customerMatch && <p role="status">{customerMatch}</p>}
                {!isEdit && (
                  <p>
                    Start the timer when the call begins. Enter the serial number within {serialDeadlineSeconds} seconds; otherwise, the timer restarts.
                    {timer.started && !timer.ended && !entrySatisfied
                      ? ` ${Math.max(0, serialDeadlineSeconds - timer.elapsedSeconds)} seconds remaining.`
                      : ""}
                  </p>
                )}
              </div>
            )}

            <Field label="Customer Name">
              {(control) => (
                <TextInput
                  {...control}
                  type="text"
                  name="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name (optional)"
                />
              )}
            </Field>

            <Field label="Organization Name" hint="Optional. Enter the company or organization associated with this customer.">
              {(control) => (
                <TextInput
                  {...control}
                  type="text"
                  name="organizationName"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter organization name (optional)"
                  maxLength={255}
                />
              )}
            </Field>

            {(user?.role === "admin" || user?.role === "support") && !isEdit && (
              <Field
                label="Transfered support"
                hint={
                  transferredSupportList.length > 0
                    ? `${transferredSupportList.length} transferred support request(s) awaiting your action.`
                    : "No transferred support requests currently assigned to you."
                }
              >
                {(control) => (
                  <SelectInput
                    {...control}
                    name="transferredSupportId"
                    value={loadedTransferredId ?? ""}
                    onChange={(event) => handleSelectTransferredSupport(event.target.value)}
                  >
                    <option value="">
                      {transferredSupportList.length > 0
                        ? "Select transferred support to continue..."
                        : "No transferred support available"}
                    </option>
                    {transferredSupportList.map((rec: SupportRecord) => (
                      <option key={rec.id} value={rec.id}>
                        #{rec.id.length > 8 ? rec.id.slice(0, 8) + '...' : rec.id} - {rec.customerName || rec.organizationName || rec.serialNo || "Customer"} ({rec.mobileNo}) - {rec.product}
                        {user?.role === "admin" && rec.assistedByName ? ` [To: ${rec.assistedByName}]` : ""}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>
            )}

            {(user?.role === "admin" || user?.role === "support") && (
              <Field label="Transfer to" hint="Transfer this support request to another support user. Status will be locked in Transferred.">
                {(control) => (
                  <SelectInput
                    {...control}
                    name="assistedById"
                    value={assistedById}
                    onChange={(event) => handleTransferToChange(event.target.value)}
                    disabled={supportStaffLoading}
                  >
                    <option value="">No transfer (Keep with current user)</option>
                    {initial?.assistedById && initial.assistedByName && !supportStaff.some((staff) => staff.id === initial.assistedById) && (
                      <option value={initial.assistedById}>{initial.assistedByName} (previously selected)</option>
                    )}
                    {supportStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}{staff.id === user?.id ? " (you)" : ""}</option>
                    ))}
                  </SelectInput>
                )}
              </Field>
            )}

            {!isEdit && (
              <div className="min-w-0">
                <TokenSelect
                  kind="support"
                  mobileNo={mobileNo}
                  value={tokenId}
                  onChange={async (token) => {
                    if (!token) {
                      setTokenId(null);
                      return;
                    }

                    setTokenId(token.id);
                    setCustomerName(token.customerName ?? "");
                    changeMobileNo(token.mobileNo ?? "");
                    setProduct(
                      token.software && token.software !== "-"
                        ? token.software
                        : "",
                    );

                    if (token.progress !== "completed") {
                      try {
                        await claimToken(token.id);
                      } catch (error) {
                        console.error("Failed to mark token ongoing", error);
                        toast.error(error instanceof Error ? error.message : "Could not claim this token. Refresh the token list and try again.");
                      }
                    }
                  }}
                />
              </div>
            )}

            {!isEdit && (
              <TimerFields timer={timer} disabled={isInvalid} />
            )}

            {errors.time && (
              <p
                role="alert"
                className="text-xs text-danger lg:col-span-2"
              >
                {errors.time}
              </p>
            )}

            <Field
              label="Product"
              required
              error={errors.product}
              hint="Select one product."
            >
              {(control) => (
                <SelectInput
                  {...control}
                  name="product"
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  disabled={isInvalid}
                >
                  <option value="">Select Product</option>
                  {[...new Set([...dynProducts, ...splitProducts(product)])].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </SelectInput>
              )}
            </Field>

            <Field label="License" required error={errors.license}>
              {(control) => (
                <SelectInput
                  {...control}
                  name="license"
                  value={license}
                  onChange={(e) => handleLicenseChange(e.target.value)}
                >
                  <option value="">Select License</option>
                  {LICENSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>

            <div className="flex flex-col lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-fg-muted">
                Status
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STATUSES.filter((item) => ["resolved", "not_resolved", "self_resolved", "transferred"].includes(item.value)).map((item) => {
                  const normalized = String(item.value)
                    .toLowerCase()
                    .replace(/\s+/g, "_");
                  const currentStatus = String(status)
                    .toLowerCase()
                    .replace(/\s+/g, "_");
                  const selected = currentStatus === normalized;
                  const style =
                    STATUS_BUTTON_STYLES[normalized] ??
                    STATUS_BUTTON_STYLES.open;

                  // If user selected a recipient in "Transfer to", status is locked in Transferred.
                  // If not transferring, Transferred cannot be picked without choosing a transfer user.
                  const isDisabled = isEdit || (Boolean(assistedById) ? item.value !== "transferred" : item.value === "transferred");

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isDisabled}
                      title={
                        item.value === "resolved"
                          ? "The reported issue has been fixed."
                          : item.value === "not_resolved"
                            ? "The issue remains unresolved and needs follow-up."
                            : item.value === "self_resolved"
                              ? "The support case is self resolved by client's own."
                              : "This support case is transferred to another support user."
                      }
                      onClick={() =>
                        setStatus(item.value as RecordStatus)
                      }
                      className={`flex h-10 items-center justify-center rounded-lg border text-xs font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? style.active : style.inactive
                        }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {Boolean(assistedById) && (
                <p className="mt-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  * Status is automatically locked to <strong>Transferred</strong> because a user is selected in &quot;Transfer to&quot;.
                </p>
              )}
            </div>
          </div>
        </section>

        {isInvalid && (
          <div className="mt-5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
            License is invalid. Additional support details are not required.
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/30 via-surface to-surface p-4 shadow-card sm:p-6">
          <div className="mb-5 border-b border-brand/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-sm font-bold text-brand ring-1 ring-inset ring-brand/20">02</span>
              <div>
                <h3 className="font-semibold text-fg">Issue notes and resolution</h3>
                <p className="mt-1 text-sm text-fg-subtle">Add each problem and its solution in order. Attach screenshots to the relevant item.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ContentListEditor
              label="Problem Description"
              itemLabel="Problem"
              addLabel="+ Add Problem"
              items={problems}
              setItems={setProblems}
              disabled={isInvalid}
              onPreview={setPreviewImage}
            />

            <ContentListEditor
              label="Solution"
              itemLabel="Solution"
              addLabel="+ Add Solution"
              items={solutions}
              setItems={setSolutions}
              disabled={isInvalid}
              onPreview={setPreviewImage}
            />
          </div>
        </section>

        <div
          className={`mt-5 rounded-2xl border border-warning/25 bg-gradient-to-r from-warning-soft/50 to-surface p-4 shadow-sm sm:p-5 ${isInvalid ? "opacity-50" : ""
            }`}
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={companySupport}
              onChange={(e) => setCompanySupport(e.target.checked)}
              disabled={isInvalid}
              className="h-4 w-4 accent-[rgb(var(--brand))]"
            />
            <span className="text-sm font-medium text-fg">
              Company Support Required
            </span>
          </label>
          {companySupport && !isInvalid && (
            <div className="mt-4 border-t border-line pt-4">
              <Field label="Company support remark" hint="Optional details for the company support team.">
                {(control) => (
                  <TextArea
                    {...control}
                    value={companySupportRemark}
                    onChange={(event) => setCompanySupportRemark(event.target.value)}
                    rows={3}
                    placeholder="Add a remark for company support"
                  />
                )}
              </Field>
            </div>
          )}
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/25 via-surface to-surface p-4 shadow-card sm:p-6">
          <AttachmentPicker
            attachments={attachments}
            setAttachments={setAttachments}
            onPreviewImage={setPreviewImage}
          />
        </section>

        <div className="mt-6 flex flex-col-reverse gap-3 rounded-2xl border border-brand/20 bg-brand-soft/25 p-4 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={saving}
            loadingText="Saving..."
          >
            {isEdit ? "Save Changes" : "Save Support"}
          </Button>
        </div>
      </form>

      <RestartDialog timer={timer} />
      <ImageLightbox
        src={previewImage ? resolveAttachmentUrl(previewImage) : null}
        onClose={() => setPreviewImage(null)}
      />
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear entered information?"
          message="Everything you entered in this Support form will be cleared. This cannot be undone."
          confirmLabel="Clear"
          cancelLabel="Keep Editing"
          danger
          onConfirm={() => {
            setShowClearConfirm(false);
            resetForm();
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
};

export default SupportForm;
