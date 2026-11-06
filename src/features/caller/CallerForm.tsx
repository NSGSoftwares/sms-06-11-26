import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  CUSTOMER_TYPES,
} from "@/config";

import { useRecords } from "@/hooks/useRecords";
import { useSessionTimer, useEntryDeadline } from "@/hooks/useSessionTimer";

import AttachmentPicker from "@/components/records/AttachmentPicker";
import SerialCustomerSuggestion, { type SerialCustomerDetails } from "@/components/records/SerialCustomerSuggestion";
import {
  Detail,
  DetailGrid,
} from "@/components/records/DetailParts";
import ImageLightbox from "@/components/records/ImageLightbox";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MultiSelect from "@/components/ui/MultiSelect";
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";

import {
  RestartDialog,
  TimerBanner,
  TimerFields,
} from "@/components/timer/TimerParts";


import {
  formatDate,
  formatDuration,
  toISODate,
} from "@/lib/time";

import {
  sanitizeMobileInput,
  validateMobileInput,
} from "@/lib/validation";
import { joinProducts, splitProducts } from "@/lib/products";

import { getSettings } from "@/services/settingService";
import { useTokens } from "@/hooks/useTokens";
import TokenSelect from "@/features/tokens/TokenSelect";
import type { Token } from "@/types";

import type {
  AttachmentFile,
  CallerRecord,
  CallerReferenceType,
  RecordStatus,
  SupportRecord,
} from "@/types";

interface CallerFormProps {
  initial?: CallerRecord;
  prefillFromSupport?: SupportRecord;
  prefillFromCaller?: CallerRecord;
  onSaved?: (record: CallerRecord) => void;
  onCancel?: () => void;
}

type FieldErrors = Partial<
  Record<
    | "callerReference"
    | "serialNo"
    | "customerName"
    | "mobileNo"
    | "alternativeMobileNo"
    | "product"
    | "customerType"
    | "source"
    | "otherSource"
    | "time"
    | "lostReason",
    string
  >
>;

export const CALLER_TIMER_KEY = "caller";

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
  self_resolved: {
    active:
      "bg-slate-700 text-white border-slate-700 shadow-sm ring-2 ring-slate-500/20",
    inactive:
      "bg-surface border-line text-fg-muted hover:border-slate-300 hover:text-slate-700",
  },
  positive: {
    active: "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20",
    inactive: "bg-surface border-line text-fg-muted hover:border-emerald-300 hover:text-emerald-600",
  },
  negative: {
    active: "bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-500/20",
    inactive: "bg-surface border-line text-fg-muted hover:border-red-300 hover:text-red-600",
  },
  win: {
    active: "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20",
    inactive: "bg-surface border-line text-fg-muted hover:border-emerald-300 hover:text-emerald-600",
  },
  lost: {
    active: "bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-500/20",
    inactive: "bg-surface border-line text-fg-muted hover:border-red-300 hover:text-red-600",
  },
  not_interested: {
    active: "bg-slate-700 text-white border-slate-700 shadow-sm ring-2 ring-slate-500/20",
    inactive: "bg-surface border-line text-fg-muted hover:border-slate-300 hover:text-slate-700",
  },
};

const CallerForm = ({
  initial,
  prefillFromSupport,
  prefillFromCaller,
  onSaved,
  onCancel,
}: CallerFormProps) => {
  const isEdit = initial !== undefined;
  const { addCallerRecord, editCallerRecord, supportRecords, callerRecords } = useRecords();
  const { completeToken, claimToken } = useTokens();
  const toast = useToast();

  const timer = useSessionTimer(
    isEdit ? undefined : CALLER_TIMER_KEY,
  );

  const [dynProducts, setDynProducts] = useState<string[]>([]);
  const [dynOffers, setDynOffers] = useState<string[]>([]);
  const [entryDeadlineSeconds, setEntryDeadlineSeconds] = useState(15);

  useEffect(() => {
    let mounted = true;

    getSettings()
      .then((response) => {
        if (!mounted) return;

        const data = (response as any)?.data ?? response;

        if (Array.isArray(data?.products)) {
          setDynProducts(data.products);
        }

        if (Array.isArray(data?.offers)) {
          setDynOffers(data.offers);
        }

        const rawDeadline = Number(data?.serial_entry_deadline_seconds);
        if (Number.isFinite(rawDeadline)) {
          setEntryDeadlineSeconds(Math.max(5, Math.min(300, rawDeadline)));
        }
      })
      .catch((error) => {
        console.error("Unable to load caller form settings:", error);
        toast.warning("Unable to load caller form settings. Default settings will be used.", {
          title: "Settings Notice",
        });
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  const supportData = prefillFromSupport
    ? {
      customerName: String(prefillFromSupport.customerName ?? ""),
      organizationName: String(prefillFromSupport.organizationName ?? ""),
      offer: String(prefillFromSupport.offer ?? ""),
      customerType: String(prefillFromSupport.customerType ?? ""),
      mobileNo: String(prefillFromSupport.mobileNo ?? ""),
      serialNo: String(prefillFromSupport.serialNo ?? ""),
      product: String(prefillFromSupport.product ?? ""),
    }
    : undefined;
  const callerData = prefillFromCaller;

  const [mobileNo, setMobileNo] = useState(
    initial?.mobileNo ?? callerData?.mobileNo ?? supportData?.mobileNo ?? "",
  );
  const [alternativeMobileNo, setAlternativeMobileNo] = useState(
    initial?.alternativeMobileNo ?? callerData?.alternativeMobileNo ?? "",
  );

  const [product, setProduct] = useState(
    initial?.product ?? callerData?.product ?? supportData?.product ?? "",
  );

  const [productOffer, setProductOffer] = useState(
    initial?.productOffer ?? callerData?.productOffer ?? supportData?.offer ?? "",
  );

  const [customerType, setCustomerType] = useState(
    initial?.customerType ?? ((callerData || prefillFromSupport?.status === "in_progress")
      ? "Follow up"
      : supportData?.customerType ?? ""),
  );

  const [status, setStatus] = useState<RecordStatus>(
    initial?.status ?? callerData?.status ?? (prefillFromSupport?.status === "in_progress" ? "win" : "positive"),
  );
  const [callerMode, setCallerMode] = useState<"feedback" | "new_lead">(
    initial?.callerMode ?? (callerData || prefillFromSupport?.status === "in_progress" ? "new_lead" : "feedback"),
  );
  const [leadAddress, setLeadAddress] = useState(initial?.address ?? callerData?.address ?? "");
  const [contactPersonName, setContactPersonName] = useState(initial?.contactPersonName ?? callerData?.contactPersonName ?? "");
  const [gstNumber, setGstNumber] = useState(initial?.gstNumber ?? callerData?.gstNumber ?? "");
  const [lostReason, setLostReason] = useState(initial?.lostReason ?? "");
  const [note, setNote] = useState(initial?.remarks ?? callerData?.remarks ?? "");
  const [tokenId, setTokenId] = useState<string | number | null>(null);

  const [serialNo, setSerialNo] = useState(initial?.serialNo ?? supportData?.serialNo ?? "");
  const [customerName, setCustomerName] = useState(initial?.customerName ?? callerData?.customerName ?? supportData?.customerName ?? "");
  const [organizationName, setOrganizationName] = useState(initial?.organizationName ?? callerData?.organizationName ?? supportData?.organizationName ?? "");

  const applySerialSuggestion = (details: SerialCustomerDetails) => {
    setSerialNo(details.serialNo);
    setCustomerName(details.customerName);
    setOrganizationName(details.organizationName);
    setMobileNo(sanitizeMobileInput(details.mobileNo));
    setProduct(details.product);
  };

  const [source, setSource] = useState(
    initial?.source ?? callerData?.source ?? (prefillFromSupport ? "Support" : ""),
  );

  const [otherSource, setOtherSource] = useState("");

  const [rating, setRating] = useState<string>(
    initial?.rating != null ? String(initial.rating) : "",
  );
  const [ratingHover, setRatingHover] = useState(0);

  const [attachments, setAttachments] = useState<AttachmentFile[]>(
    initial?.attachments ?? [],
  );

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Caller call identification is satisfied by a valid mobile number.
  const entrySatisfied = !validateMobileInput(mobileNo);

  // Restarts the timer if neither field is filled in time.
  useEntryDeadline({
    timer,
    enabled: !isEdit,
    deadlineSeconds: entryDeadlineSeconds,
    satisfied: entrySatisfied,
    onExpire: () =>
      toast.warning(
        `Timer restarted: enter a valid mobile number within ${entryDeadlineSeconds} seconds of starting.`,
        { title: "Time Limit Reached" },
      ),
  });

  const resetForm = () => {
    setSerialNo("");
    setCustomerName("");
    setOrganizationName("");
    setMobileNo("");
    setAlternativeMobileNo("");
    setProduct("");
    setProductOffer("");
    setCustomerType("");
    setSource("");
    setOtherSource("");
    setStatus("positive");
    setCallerMode("feedback");
    setLeadAddress(""); setContactPersonName(""); setGstNumber(""); setLostReason(""); setTokenId(null);
    setNote("");
    setRating("");
    setAttachments([]);
    setPreviewImage(null);
    setErrors({});
    timer.reset();
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (!customerName.trim()) found.customerName = "Customer name is required.";
    if (serialNo.trim() && !/^\d+$/.test(serialNo.trim())) found.serialNo = "Serial number must contain only numeric digits.";

    const mobileError = validateMobileInput(mobileNo);
    if (mobileError) found.mobileNo = mobileError;
    if (alternativeMobileNo.trim()) {
      const alternativeMobileError = validateMobileInput(alternativeMobileNo);
      if (alternativeMobileError) found.alternativeMobileNo = alternativeMobileError;
    }

    if (splitProducts(product).length === 0) found.product = "Select a product.";
    if (!customerType) found.customerType = "Select a customer type.";
    if (!source) found.source = "Select the source.";
    if (callerMode === "new_lead" && status === "lost" && !lostReason.trim()) found.lostReason = "Describe why the lead was lost.";

    if (source === "Others" && !otherSource.trim()) {
      found.otherSource = "Specify the platform name.";
    }

    if (!isEdit) {
      if (!timer.started) {
        found.time = "Click Start to record the start time.";
      } else if (!timer.ended) {
        found.time = "Click End to record the end time before saving.";
      }
    }

    return found;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      toast.warning(
        `Please check the form. ${Object.values(found).filter(Boolean).join(" ")}`,
        { title: "Validation Required" },
      );
      return;
    }

    setSaving(true);

    try {
      const normalizedSource =
        source === "Others" ? `Others - ${otherSource.trim()}` : source;

      const cleanCustomerName = customerName.trim();
      const cleanOrganizationName = organizationName.trim();
      const referenceValue = callerMode === "new_lead" || !serialNo.trim()
        ? cleanOrganizationName || cleanCustomerName
        : serialNo.trim();
      const referenceType: CallerReferenceType = callerMode === "new_lead" || !serialNo.trim() ? "customer_org" : "serial";

      const details = {
        customerName: cleanCustomerName,
        organizationName: cleanOrganizationName,
        serialNo: callerMode === "feedback" ? serialNo.trim() : "",
        callerReferenceType: referenceType,
        callerReferenceValue: referenceValue,
        mobileNo: mobileNo.trim(),
        alternativeMobileNo: alternativeMobileNo.trim(),
        source: normalizedSource,
        product: joinProducts(splitProducts(product)),
        productOffer: productOffer.trim(),
        offer: productOffer.trim(),
        customerType: customerType.trim(),
        status,
        callerMode,
        address: callerMode === "new_lead" ? leadAddress.trim() : "",
        contactPersonName: callerMode === "new_lead" ? contactPersonName.trim() : "",
        gstNumber: callerMode === "new_lead" ? gstNumber.trim() : "",
        lostReason: callerMode === "new_lead" && status === "lost" ? lostReason.trim() : "",
        callType: callerMode,
        rating: callerMode === "feedback" && rating ? Number(rating) : null,
        problems: [],
        solutions: [],
        remarks: note.trim(),
        attachments: callerMode === "new_lead" ? attachments : [],
        sourceSupportId: callerMode === "feedback" ? prefillFromSupport?.id ?? null : null,
      };

      if (initial) {
        const saved = await editCallerRecord(initial.id, details);
        const uploadErrors = (saved as CallerRecord & { attachmentUploadErrors?: string[] }).attachmentUploadErrors ?? [];
        if (uploadErrors.length) {
          toast.warning(
            `Caller record updated, but ${uploadErrors.length} attachment(s) could not be saved: ${uploadErrors.join("; ")}`,
            { title: "Saved with Warnings" },
          );
        } else {
          toast.success(
            `Caller ${callerMode === "new_lead" ? "lead" : "feedback"} record #${saved.id} updated for ${saved.customerName}.`,
            { title: "Record Updated" },
          );
        }
        onSaved?.(saved);
        return;
      }

      const now = new Date();
      const durationSeconds = timer.getFinalDurationSeconds();

      const saved = await addCallerRecord({
        ...details,
        date: formatDate(now),
        dateISO: toISODate(now),
        startTime: timer.startTime,
        endTime: timer.endTime,
        duration: formatDuration(durationSeconds),
        durationSeconds,
      });

      const uploadErrors = (saved as CallerRecord & { attachmentUploadErrors?: string[] }).attachmentUploadErrors ?? [];
      if (uploadErrors.length) {
        toast.warning(
          `${callerMode === "new_lead" ? "Lead" : "Feedback"} saved, but ${uploadErrors.length} attachment(s) could not be saved: ${uploadErrors.join("; ")}`,
          { title: "Saved with Warnings" },
        );
      } else {
        toast.success(
          `${callerMode === "new_lead" ? "Lead" : "Feedback"} record saved for ${cleanCustomerName}.`,
          { title: "Record Saved" },
        );
      }
      if (tokenId !== null) {
        try {
          await completeToken(tokenId, { kind: "caller", id: saved.id });
        } catch (tokenError) {
          toast.warning(
            tokenError instanceof Error
              ? `Record saved, but token completion failed: ${tokenError.message}`
              : "Record saved, but token completion failed.",
            { title: "Token Notice" },
          );
        }
      }
      resetForm();
      onSaved?.(saved);
    } catch (error) {
      toast.error(
        `${callerMode === "new_lead" ? "Lead" : "Feedback"} was not saved. ${error instanceof Error ? error.message : "Unexpected error. Check the backend logs and try again."}`,
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
      serialNo.trim() || customerName.trim() || organizationName.trim() || note.trim() ||
      mobileNo.trim() || alternativeMobileNo.trim() ||
      product ||
      productOffer ||
      customerType ||
      source ||
      otherSource ||
      timer.started ||
      attachments.length > 0;

    if (hasData) {
      setShowClearConfirm(true);
      return;
    }

    resetForm();

    if (prefillFromSupport || prefillFromCaller) {
      onCancel?.();
    }
  };

  const confirmClear = () => {
    setShowClearConfirm(false);
    resetForm();
    if (prefillFromSupport || prefillFromCaller) {
      onCancel?.();
    }
  };

  return (
    <div className="w-full">
      {!isEdit && <TimerBanner timer={timer} noun="Call" />}

      {isEdit && initial && (
        <div className="mb-5">
          <DetailGrid>
            <Detail label="Start Time" value={initial.startTime || "-"} />
            <Detail label="End Time" value={initial.endTime || "-"} />
            <Detail label="Total Duration" value={initial.duration} />
          </DetailGrid>

          <p className="mt-2 text-xs text-fg-subtle">
            Times are recorded when the call happens and cannot be edited.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-soft/60 to-surface p-3 shadow-sm">
          <div className="flex gap-2" role="group" aria-label="Caller form type">
            {([{ value: "feedback", label: "Feedback" }, { value: "new_lead", label: "Lead" }] as const).map((mode) => <button key={mode.value} type="button" disabled={isEdit} aria-pressed={callerMode === mode.value} onClick={() => { setCallerMode(mode.value); setStatus(mode.value === "feedback" ? "positive" : "win"); setLostReason(""); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${callerMode === mode.value ? "bg-brand-gradient text-brand-fg shadow-glow" : "bg-surface text-fg-muted hover:bg-brand/10 hover:text-brand"}`}>{mode.label}</button>)}
          </div>
        </div>
        <section className="relative overflow-visible rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/45 via-surface to-surface p-4 shadow-card sm:p-6">
          <div className="mb-5 border-b border-brand/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-brand-fg shadow-glow">01</span>
              <div>
                <h3 className="font-semibold text-fg">Customer and lead details</h3>
                <p className="mt-1 text-sm text-fg-subtle">Capture the contact, product interest, source, and call result.</p>
              </div>
            </div>
          </div>
          {!isEdit && (
            <div className="mb-5 rounded-xl border border-brand/15 bg-brand-soft/25 px-4 py-3 text-xs leading-5 text-fg-subtle">
              <p>
                Start the timer when the call begins. Enter a valid mobile number within {entryDeadlineSeconds} seconds; otherwise, the timer restarts.
                {timer.started && !timer.ended && !entrySatisfied
                  ? ` · ${Math.max(0, entryDeadlineSeconds - timer.elapsedSeconds)} seconds remaining`
                  : ""}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 lg:grid-cols-2">
            <div>
              <Field
                label="Customer Name"
                required
                error={errors.customerName}
              >
                {(control) => (
                  <TextInput {...control} type="text" name="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Enter customer name" maxLength={255} />
                )}
              </Field>
            </div>
            <Field label="Organization Name" hint="Optional. Enter the company or organization associated with this customer.">
              {(control) => <TextInput {...control} type="text" name="organizationName" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Enter organization name (optional)" maxLength={255} />}
            </Field>
            {callerMode === "new_lead" && !isEdit && <TokenSelect kind="lead" value={tokenId} onChange={(token: Token | null) => { setTokenId(token?.id ?? null); if (token) { setOrganizationName(token.customerName); setCustomerName(token.contactPersonName ?? token.customerName); setMobileNo(token.mobileNo); setProduct(token.software === "-" ? "" : token.software); setContactPersonName(token.contactPersonName ?? ""); setLeadAddress(token.address ?? ""); setGstNumber(token.gstNumber ?? ""); if (token.progress !== "completed") void claimToken(token.id).catch((error) => toast.error(error instanceof Error ? error.message : "Could not claim lead token.")); } }} />}

            {callerMode === "feedback" && (
              <div className="relative">
                <Field label="Serial No." required error={errors.serialNo} hint="Optional; shown separately from customer / organization name.">
                  {(control) => <TextInput {...control} type="text" name="serialNo" value={serialNo} autoComplete="off" inputMode="numeric" pattern="[0-9]*" onChange={(event) => setSerialNo(event.target.value.replace(/\D/g, ""))} placeholder="Enter serial number" />}
                </Field>
                {!isEdit && (
                  <SerialCustomerSuggestion
                    serialNo={serialNo}
                    supportRecords={supportRecords}
                    callerRecords={callerRecords}
                    onApply={applySerialSuggestion}
                  />
                )}
              </div>
            )}

            <Field
              label="Mobile No."
              required
              error={errors.mobileNo}
              hint="10-digit local numbers default to India (+91). Add +country code for other countries."
            >
              {(control) => (
                <TextInput
                  {...control}
                  type="tel"
                  name="mobileNo"
                  value={mobileNo}
                  inputMode="tel"
                  onChange={(event) =>
                    setMobileNo(sanitizeMobileInput(event.target.value))
                  }
                  placeholder="+91 9876543210"
                />
              )}
            </Field>

            <Field
              label="Alternative Mobile No."
              error={errors.alternativeMobileNo}
              hint="Optional. 10-digit local numbers default to India (+91). Add +country code for other countries."
            >
              {(control) => (
                <TextInput
                  {...control}
                  type="tel"
                  name="alternativeMobileNo"
                  value={alternativeMobileNo}
                  inputMode="tel"
                  onChange={(event) =>
                    setAlternativeMobileNo(sanitizeMobileInput(event.target.value))
                  }
                  placeholder="+91 9876543210"
                />
              )}
            </Field>

            {!isEdit && <TimerFields timer={timer} />}

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
              hint="Select one or more products."
            >
              {(control) => (
                <MultiSelect
                  {...control}
                  options={[...new Set([...dynProducts, ...splitProducts(product)])]}
                  value={splitProducts(product)}
                  onChange={(selected) => setProduct(joinProducts(selected))}
                  placeholder="Select Product"
                />
              )}
            </Field>

            <Field
              label="Product Offer"
            >
              {(control) => (
                <SelectInput
                  {...control}
                  value={productOffer}
                  onChange={(event) => setProductOffer(event.target.value)}
                >
                  <option value="">Select Product Offer</option>
                  {dynOffers.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>

            <Field
              label="Customer Type"
              required
              error={errors.customerType}
            >
              {(control) => (
                <SelectInput
                  {...control}
                  value={customerType}
                  onChange={(event) => setCustomerType(event.target.value)}
                >
                  <option value="">Select Customer Type</option>
                  {CUSTOMER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>

            <Field
              label="Source"
              required
              error={errors.source}
              className={callerMode === "feedback" ? "lg:col-span-2" : undefined}
            >
              {(control) => (
                <SelectInput
                  {...control}
                  value={source}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSource(value);

                    if (value !== "Others") {
                      setOtherSource("");
                    }
                  }}
                >
                  <option value="">Select Source</option>
                  <option value="Support">Support</option>
                  <option value="Google">Google</option>
                  <option value="Others">Others</option>
                </SelectInput>
              )}
            </Field>

            {source === "Others" && (
              <Field
                label="Platform Name"
                required
                error={errors.otherSource}
                className={callerMode === "feedback" ? "lg:col-span-2" : undefined}
              >
                {(control) => (
                  <TextInput
                    {...control}
                    type="text"
                    value={otherSource}
                    onChange={(event) => setOtherSource(event.target.value)}
                    placeholder="Enter platform name"
                  />
                )}
              </Field>
            )}

            {callerMode === "new_lead" && <>
              <Field label="Contact Person Name">{(c) => <TextInput {...c} value={contactPersonName} onChange={e => setContactPersonName(e.target.value)} placeholder="Contact person (optional)" />}</Field>
              <Field label="Address">{(c) => <TextInput {...c} value={leadAddress} onChange={e => setLeadAddress(e.target.value)} placeholder="Business address (optional)" />}</Field>
              <Field label="GST Number" hint="Optional">{(c) => <TextInput {...c} value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} placeholder="GSTIN (optional)" />}</Field>
            </>}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/30 via-surface to-surface p-4 shadow-card sm:p-6">
          <div className="mb-5 border-b border-brand/15 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-sm font-bold text-brand ring-1 ring-inset ring-brand/20">02</span>
              <div>
                <h3 className="font-semibold text-fg">Call outcome and notes</h3>
                <p className="mt-1 text-sm text-fg-subtle">Choose the result, add a rating or notes, and attach relevant files.</p>
              </div>
            </div>
          </div>
          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="flex flex-col lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-fg-muted">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(callerMode === "feedback" ? [{ value: "positive", label: "Positive", help: "Customer feedback is positive." }, { value: "negative", label: "Negative", help: "Customer feedback is negative." }] : [{ value: "win", label: "Win", help: "Lead converted successfully." }, { value: "lost", label: "Lost", help: "Lead did not convert; a reason is required." }, { value: "not_interested", label: "Not Interested", help: "The prospect is not interested." }, { value: "in_progress", label: "In Progress", help: "Follow-up is still in progress." }]).map((item) => {
                  const normalized = String(item.value).toLowerCase().replace(/\s+/g, "_");
                  const currentStatus = String(status).toLowerCase().replace(/\s+/g, "_");
                  const selected = currentStatus === normalized;
                  const style = STATUS_BUTTON_STYLES[normalized] ?? STATUS_BUTTON_STYLES.open;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isEdit}
                      title={item.help}
                      aria-label={`${item.label}. ${item.help}`}
                      onClick={() => setStatus(item.value as RecordStatus)}
                      className={`flex h-10 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? style.active : style.inactive}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {callerMode === "new_lead" && status === "lost" && (
                <div className="mt-3">
                  <Field label="Reason for Lost" required error={errors.lostReason}>
                    {(control) => <TextInput {...control} value={lostReason} onChange={(event) => setLostReason(event.target.value)} placeholder="Describe why the lead was lost" />}
                  </Field>
                </div>
              )}
            </div>
            {callerMode === "feedback" && (
              <Field label="Customer Rating">
                {() => (
                  <div role="radiogroup" aria-label="Customer rating" className="flex min-h-11 items-center gap-1 rounded-xl border border-line bg-surface px-3" onMouseLeave={() => setRatingHover(0)}>
                    {[1, 2, 3, 4, 5].map((value) => {
                      const selected = Number(rating) === value;
                      const active = (ratingHover || Number(rating)) >= value;
                      return <span key={value} role="radio" aria-checked={selected} aria-label={`${value} out of 5`} tabIndex={selected || (!rating && value === 1) ? 0 : -1} onMouseEnter={() => setRatingHover(value)} onClick={() => setRating(String(value))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setRating(String(value)); } }} className={`cursor-pointer select-none text-3xl leading-none transition-colors ${active ? "text-amber-400" : "text-fg-subtle/40"}`} title={`${value} out of 5`}>★</span>;
                    })}
                    <span className="ml-2 text-sm text-fg-subtle">{rating ? `${rating} / 5` : "Select a rating"}</span>
                  </div>
                )}
              </Field>
            )}
          </div>
          <Field label="Note" hint={callerMode === "feedback" ? "Optional feedback details." : "Optional details about the client’s requirements."}>
            {(control) => <TextArea {...control} value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={callerMode === "feedback" ? "Describe the feedback" : "Describe the client’s requirements"} />}
          </Field>
          {callerMode === "new_lead" && <div className="mt-4">
            <AttachmentPicker
              attachments={attachments}
              setAttachments={setAttachments}
              onPreviewImage={setPreviewImage}
            />
          </div>}
        </section>

        <div className="mt-5 flex justify-end gap-3 rounded-2xl border border-brand/20 bg-brand-soft/25 p-4">
          <Button
            variant="secondary"
            type="button"
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
            {isEdit ? "Save Changes" : "Save Caller"}
          </Button>
        </div>
      </form>

      <RestartDialog timer={timer} />

      <ImageLightbox
        src={previewImage}
        onClose={() => setPreviewImage(null)}
      />
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear entered information?"
          message="Everything you entered in this Caller form will be cleared. This cannot be undone."
          confirmLabel="Clear"
          cancelLabel="Keep Editing"
          danger
          onConfirm={confirmClear}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
};

export default CallerForm;
