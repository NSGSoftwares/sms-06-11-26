// File: src/features/admin/SettingsPage.tsx
import { useEffect, useState, type FormEvent } from "react";
import { downloadSample, parseCustomerFile, type CustomerImportRow, type RowError } from "@/lib/customerImport";
import Button from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import {
    getSettings,
    updateSettings,
    testWhatsApp,
    type AppSettings,
    importCustomers,
} from "@/services/settingService";

const DEFAULT_SETTINGS: AppSettings = {
    products: [],
    offers: [],
    serial_entry_deadline_seconds: 15,
    auto_signout_days: 0,
    signout_on_browser_close: false,
    wa_url: "https://wabstack.in/api",
    wa_vendor_uid: "",
    wa_token: "",
    wa_template_name: "",
    wa_template_lang: "en",
    wa_template_variables: ["serial_number"],
};

const TEMPLATE_PARAMETERS = [
    ["customer_name", "Customer name"],
    ["mobile_number", "Mobile number"],
    ["serial_number", "Serial number"],
    ["product", "Product"],
    ["offer", "Offer"],
    ["customer_type", "Customer type"],
    ["status", "Status"],
    ["source", "Caller source"],
    ["issue_subject", "Issue subject"],
    ["issue_description", "Issue description"],
    ["resolution", "Resolution"],
    ["remarks", "Remarks"],
    ["record_type", "Record type"],
    ["date", "Record date"],
] as const;

const SettingsPage = () => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const toast = useToast();

    const [newProduct, setNewProduct] = useState("");
    const [newOffer, setNewOffer] = useState("");
    const [serialDeadlineDraft, setSerialDeadlineDraft] = useState("15");
    const [autoSignoutDraft, setAutoSignoutDraft] = useState("0");
    const [customerRows, setCustomerRows] = useState<CustomerImportRow[]>([]);
    const [customerErrors, setCustomerErrors] = useState<RowError[]>([]);
    const [customerFileError, setCustomerFileError] = useState("");
    const [importingCustomers, setImportingCustomers] = useState(false);

    const [testMobile, setTestMobile] = useState("");
    const [testingWa, setTestingWa] = useState(false);

    const [tplParams, setTplParams] = useState<Record<string, string>>({});

    useEffect(() => {
        getSettings()
            .then((data) => {
                const payload = (data as any)?.data ?? data;
                setSettings({ ...DEFAULT_SETTINGS, ...payload });
                setSerialDeadlineDraft(String(payload.serial_entry_deadline_seconds ?? 15));
                setAutoSignoutDraft(String(payload.auto_signout_days ?? 0));
            })
            .catch(() => {
                toast.error("Failed to load settings.", { title: "Settings Error" });
                setSettings(DEFAULT_SETTINGS);
            })
            .finally(() => setLoading(false));
    }, [toast]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!settings || saving) return;

        const serialDeadline = Number(serialDeadlineDraft);
        if (!Number.isInteger(serialDeadline) || serialDeadline < 5 || serialDeadline > 300) {
            toast.warning("Serial number deadline must be a whole number from 5 to 300 seconds.", { title: "Invalid Setting" });
            return;
        }
        const autoSignout = Number(autoSignoutDraft);
        if (!Number.isInteger(autoSignout) || autoSignout < 0 || autoSignout > 7) {
            toast.warning("Auto sign-out must be 0 (disabled) or a whole number up to 7 days.", { title: "Invalid Setting" });
            return;
        }

        setSaving(true);

        try {
            const updated = await updateSettings({ ...settings, serial_entry_deadline_seconds: serialDeadline, auto_signout_days: autoSignout });
            const payload = (updated as any)?.data ?? updated;
            setSettings({ ...DEFAULT_SETTINGS, ...payload });
            setSerialDeadlineDraft(String(payload.serial_entry_deadline_seconds ?? serialDeadline));
            setAutoSignoutDraft(String(payload.auto_signout_days ?? autoSignout));
            toast.success("Settings updated successfully.", { title: "Settings Saved" });
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to save settings.",
                { title: "Save Failed" },
            );
        } finally {
            setSaving(false);
        }
    };

    const readCustomerFile = async (file?: File) => {
        setCustomerRows([]); setCustomerErrors([]); setCustomerFileError("");
        if (!file) return;
        const parsed = await parseCustomerFile(file);
        setCustomerRows(parsed.rows);
        setCustomerErrors(parsed.errors);
        setCustomerFileError(parsed.headerError ?? "");
        if (parsed.errors.length) {
            toast.warning(`Prepared ${parsed.rows.length} valid customer rows (${parsed.errors.length} need correction).`, { title: "Import Notice" });
        } else if (parsed.rows.length) {
            toast.info(`Prepared ${parsed.rows.length} valid customer rows ready for import.`, { title: "Import Ready" });
        }
    };

    const saveCustomerImport = async () => {
        if (!customerRows.length || customerErrors.length || customerFileError || importingCustomers) return;
        setImportingCustomers(true);
        try {
            const result = await importCustomers(customerRows);
            toast.success(`${result.imported} customer records imported or updated successfully.`, { title: "Import Successful" });
            setCustomerRows([]); setCustomerErrors([]); setCustomerFileError("");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Customer import failed.", { title: "Import Failed" });
        } finally { setImportingCustomers(false); }
    };

    const handleTestWhatsApp = async () => {
        if (!settings) return;

        const phone = testMobile.trim();

        if (!phone) {
            toast.warning("Please enter a test mobile number.", { title: "Missing Mobile Number" });
            return;
        }

        if (!settings.wa_url.trim()) {
            toast.warning("Please enter the Wabstack API URL.", { title: "Missing API URL" });
            return;
        }

        if (!settings.wa_vendor_uid.trim()) {
            toast.warning("Please enter the Vendor UID.", { title: "Missing Vendor UID" });
            return;
        }

        if (!settings.wa_token.trim()) {
            toast.warning("Please enter the API Token.", { title: "Missing Token" });
            return;
        }

        const variableNames = settings.wa_template_variables;
        const params = variableNames.map((name) => (tplParams[name] ?? "").trim());

        if (settings.wa_template_name.trim() && params.some((value) => value === "")) {
            toast.warning("Enter a test value for every template parameter.", { title: "Missing Parameters" });
            return;
        }

        setTestingWa(true);

        try {
            const result: any = await testWhatsApp({
                phone,
                wa_url: settings.wa_url,
                wa_vendor_uid: settings.wa_vendor_uid,
                wa_token: settings.wa_token,
                wa_template_name: settings.wa_template_name,
                wa_template_lang: settings.wa_template_lang,
                wa_template_variables: variableNames,
                wa_template_params: params,
            });

            if (result?.success !== true) {
                throw new Error(result?.message || "WhatsApp request failed.");
            }

            const preview = result?.data?.preview ?? "";

            toast.success(
                "Request sent to Wabstack. Check the Wabstack message log to confirm delivery." +
                (preview ? ` (${preview})` : ""),
                { title: "WhatsApp Test Sent" },
            );
        } catch (error: any) {
            console.error("WHATSAPP TEST ERROR:", error);

            const apiResponse = error?.response?.data;
            toast.error(
                apiResponse?.message ||
                apiResponse?.data?.message ||
                error?.message ||
                "Failed to send WhatsApp message.",
                { title: "WhatsApp Test Failed" },
            );
        } finally {
            setTestingWa(false);
        }
    };

    const addItem = (key: "products" | "offers", value: string) => {
        if (!settings) return;

        const trimmed = value.trim();

        if (!trimmed) {
            toast.warning(
                key === "products"
                    ? "Enter a product name first."
                    : "Enter an offer name first.",
            );
            return;
        }

        if (settings[key].includes(trimmed)) {
            toast.warning(`"${trimmed}" is already in the list.`, { title: "Duplicate Entry" });
            return;
        }

        setSettings({
            ...settings,
            [key]: [...settings[key], trimmed],
        });

        if (key === "products") {
            setNewProduct("");
        } else {
            setNewOffer("");
        }

        toast.success(`Added "${trimmed}". Save settings to apply the change.`, { title: "Item Added" });
    };

    const removeItem = (key: "products" | "offers", index: number) => {
        if (!settings) return;

        const removedItem = settings[key][index];

        setSettings({
            ...settings,
            [key]: settings[key].filter((_, itemIndex) => itemIndex !== index),
        });

        toast.info(
            `Removed "${removedItem}" from this list. Save settings to apply the change.`,
            { title: "Item Removed" },
        );
    };

    if (loading || !settings) {
        return <div className="p-4 text-fg-subtle">Loading settings...</div>;
    }

    const templateVariables = settings.wa_template_variables;

    return (
        <div className="w-full max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-fg">Application Settings</h2>
                <p className="mt-1 text-sm text-fg-subtle">
                    Configure call controls, customer data, dynamic dropdowns and WhatsApp integration.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                    <h3 className="mb-4 font-semibold text-brand">Products</h3>

                    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                        <TextInput
                            value={newProduct}
                            onChange={(e) => setNewProduct(e.target.value)}
                            placeholder="Add new product (e.g. Tally)"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addItem("products", newProduct);
                                }
                            }}
                        />
                        <Button
                            type="button"
                            onClick={() => addItem("products", newProduct)}
                        >
                            Add
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {settings.products.length === 0 && (
                            <p className="text-sm text-fg-subtle">No products added yet.</p>
                        )}

                        {settings.products.map((item, index) => (
                            <div
                                key={item}
                                className="flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-sm text-brand"
                            >
                                <span>{item}</span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${item}`}
                                    onClick={() => removeItem("products", index)}
                                    className="text-brand/70 transition-colors hover:text-danger"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                    <h3 className="mb-2 font-semibold text-brand">Call identification deadline</h3>
                    <p className="mb-4 text-sm text-fg-subtle">Support must enter a serial number and valid mobile number. Caller must enter a serial number or valid mobile number. Either may be entered before Start or within this limit after Start; otherwise the timer restarts.</p>
                    <Field label="Time limit (seconds)" hint="Choose between 5 and 300 seconds. Default is 15 seconds.">
                        {(control) => <TextInput {...control} type="number" min={5} max={300} step={1} value={serialDeadlineDraft} onChange={(event) => setSerialDeadlineDraft(event.target.value)} />}
                    </Field>
                </section>

                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                    <h3 className="mb-2 font-semibold text-brand">Automatic sign-out</h3>
                    <p className="mb-4 text-sm text-fg-subtle">Set an absolute session duration for every signed-in user. Enter 0 to keep users signed in until they log out manually.</p>
                    <Field label="Sign-out after (days)" hint="0 disables automatic sign-out. Maximum 7 days.">
                        {(control) => <TextInput {...control} type="number" min={0} max={7} step={1} value={autoSignoutDraft} onChange={(event) => setAutoSignoutDraft(event.target.value)} />}
                    </Field>
                    <label className="mt-4 flex items-start gap-3 text-sm text-fg">
                        <input
                            type="checkbox"
                            checked={settings.signout_on_browser_close}
                            onChange={(event) => setSettings({ ...settings, signout_on_browser_close: event.target.checked })}
                            className="mt-0.5"
                        />
                        <span><strong>Sign out when the browser closes</strong><span className="mt-1 block text-fg-subtle">Each user will be signed out when their browser session ends. Turn this off to keep them signed in until the day limit above or manual sign-out.</span></span>
                    </label>
                </section>

                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                    <h3 className="mb-2 font-semibold text-brand">Customer serial directory</h3>
                    <p className="mb-4 text-sm text-fg-subtle">Import customer serial numbers so Support can match the correct name, mobile number and product when a serial is entered. Existing serials are updated.</p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => downloadSample("xlsx")}>Download Excel sample</Button>
                        <Button type="button" variant="secondary" onClick={() => downloadSample("csv")}>Download CSV sample</Button>
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface-muted">
                            Choose customer file
                            <input className="sr-only" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void readCustomerFile(event.target.files?.[0])} />
                        </label>
                    </div>
                    {customerFileError && <p className="mt-3 text-sm text-danger">{customerFileError}</p>}
                    {customerRows.length > 0 && <div className="mt-4 rounded-lg border border-line bg-surface-muted p-4">
                        <p className="text-sm font-medium text-fg">{customerRows.length} valid rows ready{customerErrors.length ? ` · ${customerErrors.length} rows need correction` : ""}</p>
                        {customerErrors.slice(0, 5).map((error) => <p key={error.row} className="mt-1 text-xs text-danger">Row {error.row}: {error.message}</p>)}
                        {customerErrors.length > 5 && <p className="mt-1 text-xs text-fg-subtle">and {customerErrors.length - 5} more errors</p>}
                        <div className="mt-3"><Button type="button" onClick={() => void saveCustomerImport()} disabled={!!customerErrors.length || importingCustomers} loading={importingCustomers} loadingText="Importing...">Import customers</Button></div>
                    </div>}
                    <p className="mt-3 text-xs text-fg-subtle">Use the exact sample headers: serial_no, customer_name, mobile_no, product. Serial numbers and mobile numbers are kept as text.</p>
                </section>

                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                    <h3 className="mb-4 font-semibold text-brand">
                        Product Offers / Value Added Services
                    </h3>

                    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                        <TextInput
                            value={newOffer}
                            onChange={(e) => setNewOffer(e.target.value)}
                            placeholder="Add new offer (e.g. Antivirus)"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addItem("offers", newOffer);
                                }
                            }}
                        />
                        <Button
                            type="button"
                            onClick={() => addItem("offers", newOffer)}
                        >
                            Add
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {settings.offers.length === 0 && (
                            <p className="text-sm text-fg-subtle">
                                No product offers added yet.
                            </p>
                        )}

                        {settings.offers.map((item, index) => (
                            <div
                                key={item}
                                className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700"
                            >
                                <span>{item}</span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${item}`}
                                    onClick={() => removeItem("offers", index)}
                                    className="text-emerald-700/70 transition-colors hover:text-danger"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                    <h3 className="mb-1 font-semibold text-emerald-600">
                        WhatsApp API Integration
                    </h3>

                    <p className="mb-5 text-xs text-fg-subtle">
                        Configure Wabstack WhatsApp integration. Manage and approve templates in
                        Wabstack, then enter the exact approved template name here. Template discovery
                        is not available through the configured API; the parameter names below map
                        saved record details into the template in order.
                    </p>

                    <div className="grid grid-cols-1 gap-5">
                        <Field label="Wabstack API Base URL">
                            {(c) => (
                                <TextInput
                                    {...c}
                                    value={settings.wa_url}
                                    onChange={(e) =>
                                        setSettings({ ...settings, wa_url: e.target.value })
                                    }
                                    placeholder="https://wabstack.in/api"
                                />
                            )}
                        </Field>

                        <Field label="Vendor UID" hint="Your Wabstack vendor UID.">
                            {(c) => (
                                <TextInput
                                    {...c}
                                    value={settings.wa_vendor_uid}
                                    onChange={(e) =>
                                        setSettings({ ...settings, wa_vendor_uid: e.target.value })
                                    }
                                    placeholder="Enter Vendor UID"
                                />
                            )}
                        </Field>

                        <Field
                            label="API Token"
                            hint="Wabstack API token used with ?token=..."
                        >
                            {(c) => (
                                <TextInput
                                    {...c}
                                    type="password"
                                    value={settings.wa_token}
                                    onChange={(e) =>
                                        setSettings({ ...settings, wa_token: e.target.value })
                                    }
                                    placeholder="Enter API Token"
                                />
                            )}
                        </Field>

                        <Field
                            label="Approved Template"
                            hint="Copy the exact approved template name from Wabstack. Leave blank to use plain text."
                        >
                            {(c) => (
                                <TextInput
                                    {...c}
                                    value={settings.wa_template_name}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            wa_template_name: e.target.value,
                                        })
                                    }
                                    placeholder="e.g. supportfeedback"
                                />
                            )}
                        </Field>

                        <div className="rounded-lg border border-line bg-surface p-4">
                            <p className="text-sm font-medium text-fg">Template parameters</p>
                            <p className="mt-1 text-xs text-fg-subtle">
                                Choose the values your Wabstack template uses. Add the shown placeholders to the template there in this order.
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {TEMPLATE_PARAMETERS.map(([name, label]) => {
                                    const checked = templateVariables.includes(name);
                                    return (
                                        <div key={name} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg hover:bg-brand/5">
                                            <label className="flex min-w-0 flex-1 items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        const next = checked
                                                            ? templateVariables.filter((item) => item !== name)
                                                            : [...templateVariables, name];
                                                        setSettings({ ...settings, wa_template_variables: next });
                                                    }}
                                                />
                                                <span>{label}</span>
                                            </label>
                                            <button
                                                type="button"
                                                className="ml-auto rounded bg-brand/10 px-1.5 py-0.5 font-mono text-xs text-brand hover:bg-brand/20"
                                                title={`Copy {{${name}}}`}
                                                onClick={() => {
                                                    if (!navigator.clipboard) {
                                                        toast.warning("Clipboard access is not available in this browser.", { title: "Clipboard Warning" });
                                                        return;
                                                    }
                                                    void navigator.clipboard.writeText(`{{${name}}}`).then(
                                                        () => toast.success(`Copied {{${name}}}.`, { title: "Copied" }),
                                                        () => toast.error("Could not access the clipboard.", { title: "Copy Failed" }),
                                                    );
                                                }}
                                            >
                                                {`{{${name}}}`}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {templateVariables.length > 0 && (
                                <div className="mt-4 border-t border-line pt-3">
                                    <p className="text-xs font-medium text-fg-subtle">Selected placeholder order</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {templateVariables.map((name, index) => (
                                            <code key={name} className="rounded bg-brand/10 px-2 py-1 text-xs text-brand">
                                                {index + 1}. {`{{${name}}}`}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {settings.wa_template_name && templateVariables.map((name, index) => (
                            <Field key={name} label={`Test value for {{${name}}}`} hint={`Sent as field_${index + 1} to Wabstack.`}>
                                {(c) => (
                                    <TextInput
                                        {...c}
                                        value={tplParams[name] ?? ""}
                                        onChange={(e) => setTplParams((previous) => ({ ...previous, [name]: e.target.value }))}
                                        placeholder={`Value for ${name}`}
                                    />
                                )}
                            </Field>
                        ))}

                        <Field
                            label="Template Language"
                            hint="Language code of the template, e.g. en."
                        >
                            {(c) => (
                                <TextInput
                                    {...c}
                                    value={settings.wa_template_lang}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            wa_template_lang: e.target.value,
                                        })
                                    }
                                    placeholder="en"
                                />
                            )}
                        </Field>

                        <div className="mt-4 border-t border-line pt-4">
                            <h4 className="mb-2 text-sm font-medium text-fg">
                                Test WhatsApp Configuration
                            </h4>

                            <p className="mb-3 text-xs text-fg-subtle">
                                Use a 10-digit Indian number or include + and the country code, for example +1 202 555 0123.
                            </p>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <TextInput
                                    value={testMobile}
                                    onChange={(e) => setTestMobile(e.target.value)}
                                    placeholder="Enter mobile number for test"
                                />

                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => void handleTestWhatsApp()}
                                    loading={testingWa}
                                    loadingText="Sending..."
                                    disabled={testingWa || saving}
                                >
                                    Send Test Message
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end border-t border-line pt-5">
                    <Button type="submit" loading={saving} loadingText="Saving...">
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
