import {
  formatDate,
  formatDuration,
  toISODate,
} from "@/lib/time";

import {
  normalizeMobile,
} from "@/lib/validation";

import { api, getAttachmentUrl } from "./api";

const imageAttachments = (items: any[] = [], context: AttachmentFile["context"] = "record"): AttachmentFile[] => items.flatMap((item, itemIndex) =>
  (item?.images ?? []).map((dataUrl: string, imageIndex: number) => {
    const mime = dataUrl.match(/^data:([^;,]+)/)?.[1] ?? "image/png";
    return { id: `paste-${item?.id ?? itemIndex}-${imageIndex}`, name: `pasted-screenshot-${itemIndex + 1}-${imageIndex + 1}.${mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1]}`, type: mime, size: 0, dataUrl, context };
  })
);

const uploadRecordAttachments = async (recordId: string | number, files: AttachmentFile[]) => {
  const errors: string[] = [];
  const uploaded: AttachmentFile[] = [];
  for (const file of files) {
    if (!file.dataUrl?.startsWith("data:")) continue;
    try {
      const blob = await (await fetch(file.dataUrl)).blob();
      const form = new FormData();
      form.append("file", blob, file.name);
      form.append("context", file.context ?? "record");
      const response = await api.postFormData<any>(`/records/${recordId}/attachments`, form);
      const item = response?.data?.data ?? response?.data ?? {};
      const id = String(item.id ?? item.attachment_id ?? "");
      if (id) uploaded.push({ id, name: String(item.file_name ?? file.name), type: String(item.file_type ?? file.type), size: Number(item.file_size ?? file.size), dataUrl: getAttachmentUrl(String(recordId), id), context: file.context ?? "record" });
    } catch (error) {
      errors.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
    }
  }
  return { errors, uploaded };
};

import type {
  AttachmentFile,
  CallerRecord,
  ContentItem,
  RecordOwner,
  RecordStatus,
  StatusChange,
  SupportRecord,
} from "@/types";

/* -------------------------------------------------------------------------- */
/* BASIC HELPERS                                                              */
/* -------------------------------------------------------------------------- */

const normalizeStatus = (
  status: unknown
): string => {
  if (!status) return "Open";

  const value = String(status)
    .trim()
    .toLowerCase();

  if (value === "open") {
    return "Open";
  }

  if (
    value === "in progress" ||
    value === "in_progress"
  ) {
    return "In Progress";
  }

  if (value === "resolved") {
    return "Resolved";
  }

  const labels: Record<string, string> = {
    self_resolved: "Self Resolved", not_resolved: "Not Resolved", positive: "Positive",
    negative: "Negative", win: "Win", lost: "Lost", not_interested: "Not Interested",
    transferred: "Transferred",
  };
  return labels[value.replace(/\s+/g, "_")] ?? "Open";
};

const mapStatus = (
  value: unknown
): RecordStatus => {
  const normalized = String(
    value ?? "Open"
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (normalized === "in_progress") {
    return "in_progress";
  }

  if (normalized === "resolved") {
    return "resolved";
  }

  if (normalized === "self_resolved") {
    return "self_resolved";
  }
  if (["not_resolved", "positive", "negative", "win", "lost", "not_interested", "transferred"].includes(normalized)) {
    return normalized as RecordStatus;
  }
  return "open";
};

/* -------------------------------------------------------------------------- */
/* TIME                                                                       */
/* -------------------------------------------------------------------------- */

const toSqlTime = (
  value?: string | null
): string | null => {
  if (
    !value ||
    value === "-" ||
    value === "—"
  ) {
    return null;
  }

  const raw = String(value).trim();

  const match =
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(
      raw
    );

  if (!match) {
    return raw || null;
  }

  let hours = Number(match[1]);

  const minutes = match[2];

  const seconds =
    match[3] ?? "00";

  const period = (
    match[4] ?? ""
  ).toUpperCase();

  if (
    period === "PM" &&
    hours < 12
  ) {
    hours += 12;
  }

  if (
    period === "AM" &&
    hours === 12
  ) {
    hours = 0;
  }

  if (
    hours < 0 ||
    hours > 23
  ) {
    return null;
  }

  return `${String(hours).padStart(
    2,
    "0"
  )}:${minutes}:${seconds}`;
};

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

const parseContent = (
  value: unknown
): ContentItem[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item: any, index) => {
        if (
          typeof item === "string"
        ) {
          const text = item.trim();
          if (!text) return null;

          return {
            id: `content-${index}`,
            text,
            images: [],
          };
        }

        if (
          item &&
          typeof item === "object"
        ) {
          const text = String(
            item.text ??
              item.content ??
              item.value ??
              ""
          ).trim();
          const images = Array.isArray(item.images) ? item.images : [];
          if (!text && images.length === 0) return null;

          return {
            id: String(
              item.id ??
                `content-${index}`
            ),
            text,
            images,
          };
        }

        return null;
      })
      .filter(
        Boolean
      ) as ContentItem[];
  }

  if (
    typeof value === "string"
  ) {
    const text = value.trim();

    if (!text) return [];

    // New records persist each item with an ordinal prefix. Keep multiline
    // text inside its item while restoring distinct entries on every reload.
    const numbered: ContentItem[] = [];
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(\d+)\.\s?(.*)$/);
      if (match) {
        numbered.push({ id: `content-${numbered.length + 1}`, text: match[2], images: [] });
      } else if (numbered.length) {
        const continuation = line.trim();
        if (!continuation) continue;
        // Older rows stored each entry as a plain line after the first
        // numbered item. Restore those as separate ordered entries too.
        numbered.push({ id: `content-${numbered.length + 1}`, text: continuation, images: [] });
      }
    }
    if (numbered.length) return numbered;

    return [
      {
        id: "content-1",
        text,
        images: [],
      },
    ];
  }

  return [];
};

const itemsToText = (
  items: any
): string | null => {
  if (!items) return null;

  if (
    typeof items === "string"
  ) {
    const value = items.trim();

    return value || null;
  }

  if (!Array.isArray(items)) {
    return null;
  }

  const lines = items
    .map((item, index) => {
      if (
        typeof item === "string"
      ) {
        const text = item.trim();
        return text ? `${index + 1}. ${text}` : "";
      }

      if (
        item &&
        typeof item === "object"
      ) {
        const text = String(
          item.text ??
            item.content ??
            item.value ??
            ""
        ).trim();
        return text || item.images?.length ? `${index + 1}. ${text || "(image only)"}` : "";
      }

      return "";
    })
    .filter(Boolean);

  return lines.length
    ? lines.join("\n")
    : null;
};

/* -------------------------------------------------------------------------- */
/* ATTACHMENTS                                                                */
/* -------------------------------------------------------------------------- */

const mapAttachments = (
  value: unknown,
  recordId?: string
): AttachmentFile[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    (item: any, index) => ({
      id: String(
        item?.id ??
          item?.attachment_id ??
          `attachment-${index}`
      ),

      name: String(
        item?.name ??
          item?.file_name ??
          "Attachment"
      ),

      type: String(
        item?.type ??
          item?.mime_type ??
          item?.file_type ??
          ""
      ),

      size: Number(
        item?.size ??
          item?.file_size ??
          0
      ),

      dataUrl: String(item?.dataUrl ?? item?.data_url ?? item?.file_url ?? item?.url ??
        (recordId && (item?.id ?? item?.attachment_id) ? getAttachmentUrl(recordId, String(item.id ?? item.attachment_id)) : "")),
      context: ["problem", "solution"].includes(String(item?.context ?? item?.attachment_context ?? "record"))
        ? String(item?.context ?? item?.attachment_context) as AttachmentFile["context"]
        : "record",
    })
  );
};

/* -------------------------------------------------------------------------- */
/* STATUS HISTORY                                                             */
/* -------------------------------------------------------------------------- */

const mapStatusHistory = (
  value: unknown
): StatusChange[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(
    (history: any) => ({
      status: mapStatus(
        history?.new_status ??
          history?.status
      ),

      at: String(
        history?.created_at ??
          history?.at ??
          ""
      ),

      by: {
        id: String(
          history?.changed_by ??
            history?.by?.id ??
            ""
        ),

        name: String(
          history?.changed_by_name ??
            history?.by?.name ??
            ""
        ),
      },

      reason:
        history?.change_reason ??
        history?.reason ??
        undefined,
    })
  );
};

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
/* -------------------------------------------------------------------------- */

const getDateParts = (
  value: unknown
): {
  date: string;
  dateISO: string;
} => {
  const raw = String(
    value ?? ""
  ).trim();

  if (!raw) {
    return {
      date: "-",
      dateISO: "",
    };
  }

  const date = new Date(raw);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      date: "-",
      dateISO: "",
    };
  }

  return {
    date: formatDate(date),
    dateISO: toISODate(date),
  };
};

/* -------------------------------------------------------------------------- */
/* DURATION                                                                   */
/* -------------------------------------------------------------------------- */

const getDurationSeconds = (
  value: unknown
): number => {
  const seconds = Number(
    value ?? 0
  );

  if (
    !Number.isFinite(seconds)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(seconds)
  );
};

/* -------------------------------------------------------------------------- */
/* RECORD OWNER                                                               */
/* -------------------------------------------------------------------------- */

const mapOwner = (
  row: any,
  idField:
    | string
    | string[],
  nameField:
    | string
    | string[]
): RecordOwner => {
  const ids = Array.isArray(
    idField
  )
    ? idField
    : [idField];

  const names = Array.isArray(
    nameField
  )
    ? nameField
    : [nameField];

  let id = "";

  for (const key of ids) {
    const value =
      key.includes(".")
        ? key
            .split(".")
            .reduce(
              (
                current,
                part
              ) =>
                current?.[
                  part
                ],
              row
            )
        : row?.[key];

    if (
      value !==
        undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      id = String(value);
      break;
    }
  }

  let name = "";

  for (const key of names) {
    const value =
      key.includes(".")
        ? key
            .split(".")
            .reduce(
              (
                current,
                part
              ) =>
                current?.[
                  part
                ],
              row
            )
        : row?.[key];

    if (
      value !==
        undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      name = String(value);
      break;
    }
  }

  return {
    id,
    name,
  };
};

/* -------------------------------------------------------------------------- */
/* API LIST RESPONSE                                                          */
/* -------------------------------------------------------------------------- */

const extractList = (
  response: any
): any[] => {
  const body =
    response?.data;

  if (
    Array.isArray(body)
  ) {
    return body;
  }

  if (
    Array.isArray(
      body?.data
    )
  ) {
    return body.data;
  }

  if (
    Array.isArray(
      body?.records
    )
  ) {
    return body.records;
  }

  if (
    Array.isArray(
      body?.data?.records
    )
  ) {
    return body.data.records;
  }

  return [];
};

/* -------------------------------------------------------------------------- */
/* SUPPORT MAPPER                                                             */
/* -------------------------------------------------------------------------- */

const mapSupportRecord = (
  row: any
): SupportRecord => {
  const durationSeconds =
    getDurationSeconds(
      row?.duration_seconds
    );

  const dateParts =
    getDateParts(
      row?.date ??
        row?.created_at
    );

  const attachments = mapAttachments(row?.attachments, String(row?.id ?? ""));
  const problems = parseContent(row?.issue_description);
  const solutions = parseContent(row?.resolution);
  const addImages = (items: ContentItem[], context: "problem" | "solution") => {
    const images = attachments.filter((attachment) => attachment.context === context && attachment.type.startsWith("image/")).map((attachment) => attachment.dataUrl);
    if (!images.length) return items;
    if (items.length) items[0] = { ...items[0], images: [...items[0].images, ...images] };
    else items.push({ id: `${context}-attachments`, text: "", images });
    return items;
  };
  addImages(problems, "problem");
  addImages(solutions, "solution");

  return {
    id: String(
      row?.id ?? ""
    ),

    date: dateParts.date,
    dateISO: dateParts.dateISO,

    recordType: "support",

    feedbackCompleted: Boolean(row?.feedback_completed ?? false),
    assistedById: row?.assisted_by ? String(row.assisted_by) : null,
    assistedByName: String(row?.assisted_by_name ?? row?.assisted_by_name_snapshot ?? ""),

    customerName: String(
      row?.customer_name ?? ""
    ),

    organizationName: String(row?.organization_name ?? ""),

    mobileNo: String(
      row?.mobile_number ?? ""
    ),

    serialNo: String(
      row?.serial_number ?? ""
    ),

    address: String(
      row?.address ?? ""
    ),

    product: String(
      row?.product ?? ""
    ),

    license:
      row?.license_type ===
        "Valid" ||
      row?.license_type ===
        "Invalid"
        ? row.license_type
        : "",

    companySupport: Boolean(
      row?.company_support ??
        false
    ),

    customerType: String(
      row?.customer_type ?? ""
    ),

    offer: String(
      row?.offer ?? ""
    ),

    status: mapStatus(
      row?.status
    ),

    issueSubject: String(
      row?.issue_subject ?? ""
    ),

    issueDescription: String(
      row?.issue_description ??
        ""
    ),

    resolution: String(
      row?.resolution ?? ""
    ),

    remarks: String(
      row?.remarks ?? ""
    ),

    startTime:
      row?.start_time ??
      null,

    endTime:
      row?.end_time ??
      null,

    duration:
      formatDuration(
        durationSeconds
      ),

    durationSeconds,

    problems,

    solutions,

    attachments,

    createdBy:
      mapOwner(
        row,
        [
          "created_by",
          "createdBy.id",
        ],
        [
          "created_by_name",
          "createdBy.name",
        ]
      ),

    createdAt: String(
      row?.created_at ?? ""
    ),

    updatedAt: String(
      row?.updated_at ?? ""
    ),

    updatedBy:
      row?.last_updated_by
        ? mapOwner(
            row,
            [
              "last_updated_by",
              "updatedBy.id",
            ],
            [
              "updated_by_name",
              "updatedBy.name",
            ]
          )
        : null,

    statusHistory:
      mapStatusHistory(
        row?.status_history
      ),
  };
};

/* -------------------------------------------------------------------------- */
/* CALLER MAPPER                                                              */
/* -------------------------------------------------------------------------- */

const mapCallerRecord = (
  row: any
): CallerRecord => {
  const durationSeconds =
    getDurationSeconds(
      row?.duration_seconds
    );

  const dateParts =
    getDateParts(
      row?.date ??
        row?.created_at
    );

  const customerName =
    String(
      row?.customer_name ??
        ""
    ).trim();

  const serialNo =
    String(
      row?.serial_number ??
        ""
    ).trim();

  const callerReferenceType =
    String(
      row?.caller_reference_type ??
        ""
    ).trim() ===
    "customer_org"
      ? "customer_org"
      : "serial";

  const callerReferenceValue =
    String(
      row?.caller_reference_value ??
        ""
    ).trim();

  /*
   * IMPORTANT:
   *
   * For customer_org, customer_name
   * must be the actual reference value.
   *
   * This also protects the UI if an older
   * API response happens to omit customer_name.
   */
  const finalCustomerName =
    customerName ||
    (
      callerReferenceType ===
        "customer_org" &&
      callerReferenceValue
        ? callerReferenceValue
        : ""
    );

  return {
    /*
     * KEEP UUID AS STRING.
     *
     * Do NOT use Number(row.id).
     */
    id: String(
      row?.id ?? ""
    ),

    date: dateParts.date,
    dateISO: dateParts.dateISO,

    recordType: "caller",

    customerName:
      finalCustomerName,

    organizationName: String(row?.organization_name ?? ""),

    serialNo,

    mobileNo: String(
      row?.mobile_number ?? ""
    ),
    alternativeMobileNo: String(row?.alternative_mobile_number ?? ""),

    product: String(
      row?.product ?? ""
    ),

    productOffer: String(
      row?.offer ?? ""
    ),

    customerType: String(row?.customer_type ?? "") === "Existing"
      ? "Follow up"
      : String(row?.customer_type ?? ""),

    callerReferenceType,

    callerReferenceValue,

    source: String(
      row?.source ?? ""
    ),

    callType: String(
      row?.call_type ?? ""
    ),
    sourceSupportId: row?.source_support_id ? String(row.source_support_id) : null,
    callerMode: String(row?.call_type ?? "").toLowerCase() === "new_lead" ? "new_lead" : "feedback",
    address: String(row?.address ?? ""),
    contactPersonName: String(row?.contact_person_name ?? ""),
    gstNumber: String(row?.gst_number ?? ""),
    lostReason: String(row?.lost_reason ?? ""),

    remarks: String(
      row?.remarks ??
        row?.caller_remarks ??
        ""
    ),

    rating:
      row?.rating ===
        null ||
      row?.rating ===
        undefined
        ? null
        : Number(
            row.rating
          ),

    startTime:
      row?.start_time ??
      null,

    endTime:
      row?.end_time ??
      null,

    durationSeconds,

    duration:
      formatDuration(
        durationSeconds
      ),

    problems:
      parseContent(
        row?.issue_description
      ),

    solutions:
      parseContent(
        row?.resolution
      ),

    attachments:
      mapAttachments(
        row?.attachments,
        String(row?.id ?? "")
      ),

    createdBy:
      mapOwner(
        row,
        [
          "created_by",
          "createdBy.id",
        ],
        [
          "created_by_name",
          "createdBy.name",
        ]
      ),

    createdAt: String(
      row?.created_at ?? ""
    ),

    updatedAt: String(
      row?.updated_at ?? ""
    ),

    updatedBy:
      row?.last_updated_by ||
      row?.updated_by
        ? mapOwner(
            row,
            [
              "last_updated_by",
              "updated_by",
              "updatedBy.id",
            ],
            [
              "updated_by_name",
              "updatedBy.name",
            ]
          )
        : null,

    status: mapStatus(
      row?.status
    ),

    statusHistory:
      mapStatusHistory(
        row?.status_history
      ),
  };
};

/* -------------------------------------------------------------------------- */
/* SUPPORT RECORDS                                                            */
/* -------------------------------------------------------------------------- */

export const listSupportRecords =
  async (): Promise<
    SupportRecord[]
  > => {
    const response =
      await api.get(
        "/records",
        {
          recordType:
            "support",
          pageSize: 1000,
        }
      );

    return extractList(
      response
    ).map(
      mapSupportRecord
    );
  };

export const createSupportRecord =
  async (
    data: any,
    _owner?: any
  ): Promise<SupportRecord> => {
    const serial =
      String(
        data?.serialNo ??
          data?.serial_number ??
          ""
      ).trim();

    const mobile =
      normalizeMobile(
        String(
          data?.mobileNo ??
            data?.mobile_number ??
            ""
        )
      );

    const customerName =
      String(
        data?.customerName ??
          data?.customer_name ??
          ""
      ).trim() ||
      (
        serial
          ? `Customer (${serial})`
          : ""
      ) ||
      (
        mobile
          ? `Customer (${mobile})`
          : ""
      ) ||
      "Customer";

    const problemText =
      data?.issueDescription ||
      itemsToText(
        data?.problems
      ) ||
      null;

    const solutionText =
      data?.resolution ||
      itemsToText(
        data?.solutions
      ) ||
      null;

    const payload = {
      record_type:
        "support",

      customer_name:
        customerName,

      organization_name: String(data?.organizationName ?? data?.organization_name ?? "").trim() || null,

      mobile_number:
        String(data?.mobileNo ?? data?.mobile_number ?? "").trim(),

      serial_number:
        serial || null,

      address:
        data?.address ||
        null,

      product:
        data?.product &&
        data.product !== "-"
          ? data.product
          : null,

      license_type:
        data?.license ??
        data?.license_type ??
        null,

      customer_type:
        data?.customerType ??
        data?.customer_type ??
        null,

      offer:
        data?.offer ??
        null,

      status:
        normalizeStatus(
          data?.status
        ),

      company_support: Boolean(data?.companySupport),

      assisted_by: data?.assistedById || null,

      issue_subject:
        data?.issueSubject ||
        (
          problemText
            ? problemText
                .split("\n")[0]
                .slice(0, 200)
            : null
        ),

      issue_description:
        problemText,

      resolution:
        solutionText,

      remarks:
        data?.remarks ??
        null,

      start_time:
        toSqlTime(
          data?.startTime
        ),

      end_time:
        toSqlTime(
          data?.endTime
        ),

      duration_seconds:
        data?.durationSeconds !=
        null
          ? getDurationSeconds(
              data.durationSeconds
            )
          : null,
    };

    const response =
      await api.post(
        "/records",
        payload
      );

    const saved = mapSupportRecord(response?.data);
    const files = [...(data?.attachments ?? []), ...imageAttachments(data?.problems ?? [], "problem"), ...imageAttachments(data?.solutions ?? [], "solution")];
    const { errors: attachmentUploadErrors, uploaded } = await uploadRecordAttachments(saved.id, files);
    saved.attachments = [...saved.attachments, ...uploaded];
    return Object.assign(saved, { attachmentUploadErrors });
  };

/* -------------------------------------------------------------------------- */
/* CALLER RECORDS                                                             */
/* -------------------------------------------------------------------------- */

export const listCallerRecords =
  async (): Promise<
    CallerRecord[]
  > => {
    const response =
      await api.get(
        "/records",
        {
          recordType:
            "caller",
          pageSize: 1000,
        }
      );

    return extractList(
      response
    ).map(
      mapCallerRecord
    );
  };

export const createCallerRecord =
  async (
    data: any,
    _owner?: any
  ): Promise<CallerRecord> => {
    const referenceType =
      data?.callerReferenceType ===
      "customer_org"
        ? "customer_org"
        : "serial";

    const referenceValue =
      String(
        data?.callerReferenceValue ??
          ""
      ).trim();

    const serial =
      referenceType ===
      "serial"
        ? String(
            data?.serialNo ??
              referenceValue ??
              ""
          ).trim()
        : "";

    const mobile =
      normalizeMobile(
        String(
          data?.mobileNo ??
            data?.mobile_number ??
            ""
        )
      );

    /*
     * customer_org:
     *
     * callerReferenceValue = customer name.
     */
    const customerName =
      String(data?.customerName ?? data?.customer_name ?? "").trim() ||
      (referenceType === "customer_org" ? referenceValue : String(
            data?.customerName ??
              data?.customer_name ??
              ""
          ).trim() ||
          (
            serial
              ? `Customer (${serial})`
              : ""
          ) ||
          (
            mobile
              ? `Customer (${mobile})`
              : ""
          ) ||
          "Customer");

    const organizationName = String(
      data?.organizationName ?? data?.organization_name ??
        (referenceType === "customer_org" ? referenceValue : "")
    ).trim();

    const problemText =
      data?.issueDescription ||
      itemsToText(
        data?.problems
      ) ||
      null;

    const solutionText =
      data?.resolution ||
      itemsToText(
        data?.solutions
      ) ||
      null;

    const durationSeconds =
      data?.durationSeconds !=
      null
        ? getDurationSeconds(
            data.durationSeconds
          )
        : null;

    const payload = {
      record_type:
        "caller",

      customer_name:
        customerName,

      organization_name:
        organizationName || null,

      mobile_number:
        String(data?.mobileNo ?? data?.mobile_number ?? "").trim(),
      alternative_mobile_number:
        String(data?.alternativeMobileNo ?? data?.alternative_mobile_number ?? "").trim() || null,

      /*
       * IMPORTANT:
       * customer_org records have
       * no serial number.
       */
      serial_number:
        serial || null,

      caller_reference_type:
        referenceType,

      caller_reference_value:
        referenceValue,

      source:
        data?.source ??
        null,

      product:
        data?.product ??
        null,

      customer_type:
        data?.customerType ??
        data?.customer_type ??
        null,

      offer:
        data?.productOffer ??
        data?.offer ??
        null,

      issue_subject:
        data?.issueSubject ??
        (
          problemText
            ? problemText
                .split("\n")[0]
                .slice(0, 200)
            : null
        ),

      issue_description:
        problemText,

      resolution:
        solutionText,

      remarks:
        data?.remarks ??
        data?.caller_remarks ??
        null,

      start_time:
        toSqlTime(
          data?.startTime
        ),

      end_time:
        toSqlTime(
          data?.endTime
        ),

      duration_seconds:
        durationSeconds,

      call_type:
        data?.callerMode ?? data?.callType ??
        data?.call_type ??
        null,
      source_support_id: data?.sourceSupportId ?? null,
      contact_person_name: data?.contactPersonName ?? null,
      gst_number: data?.gstNumber ?? null,
      lost_reason: data?.lostReason ?? null,
      address: data?.address ?? null,

      caller_remarks:
        data?.remarks ??
        data?.caller_remarks ??
        null,

      status:
        normalizeStatus(
          data?.status
        ),

      rating:
        data?.rating ??
        null,
    };

    const response =
      await api.post(
        "/records",
        payload
      );

    const saved = mapCallerRecord(response?.data);
    const files = data?.callerMode === "new_lead" ? (data?.attachments ?? []) : [];
    const { errors: attachmentUploadErrors, uploaded } = await uploadRecordAttachments(saved.id, files);
    saved.attachments = [...saved.attachments, ...uploaded];
    return Object.assign(saved, { attachmentUploadErrors });
  };

export const updateCallerRecord =
  async (
    id: string | number,
    patch: any,
    _by?: any
  ): Promise<CallerRecord> => {
    const payload: any = {};

    if (
      patch?.customerName !==
      undefined
    ) {
      payload.customer_name =
        String(
          patch.customerName
        ).trim();
    }

    if (
      patch?.mobileNo !==
      undefined
    ) {
      payload.mobile_number =
        normalizeMobile(
          patch.mobileNo
        );
    }

    if (patch?.alternativeMobileNo !== undefined) {
        payload.alternative_mobile_number =
          normalizeMobile(patch.alternativeMobileNo) || null;
    }

    if (patch?.organizationName !== undefined) {
      payload.organization_name = String(patch.organizationName ?? "").trim() || null;
    }

    if (
      patch?.serialNo !==
      undefined
    ) {
      payload.serial_number =
        String(
          patch.serialNo
        ).trim() || null;
    }

    if (
      patch?.callerReferenceType !==
      undefined
    ) {
      payload.caller_reference_type =
        patch.callerReferenceType;
    }

    if (
      patch?.callerReferenceValue !==
      undefined
    ) {
      payload.caller_reference_value =
        String(
          patch.callerReferenceValue
        ).trim();
    }

    if (
      patch?.callerReferenceType ===
        "customer_org" &&
      patch?.callerReferenceValue !== undefined
    ) {
      if (patch?.organizationName === undefined) {
        payload.organization_name = String(patch.callerReferenceValue).trim() || null;
      }

      /*
       * customer_org does not use serial.
       */
      payload.serial_number =
        null;
    }

    if (
      patch?.source !==
      undefined
    ) {
      payload.source =
        patch.source;
    }

    if (
      patch?.product !==
      undefined
    ) {
      payload.product =
        patch.product;
    }

    if (
      patch?.productOffer !==
      undefined
    ) {
      payload.offer =
        patch.productOffer;
    }

    if (
      patch?.customerType !==
      undefined
    ) {
      payload.customer_type =
        patch.customerType;
    }

    if (
      patch?.callType !==
      undefined
    ) {
      payload.call_type =
        patch.callType;
    }

    if (
      patch?.remarks !==
      undefined
    ) {
      payload.remarks =
        patch.remarks;

      payload.caller_remarks =
        patch.remarks;
    }

    if (
      patch?.rating !==
      undefined
    ) {
      payload.rating =
        patch.rating == null
          ? null
          : Number(
              patch.rating
            );
    }

    if (
      patch?.issueSubject !==
      undefined
    ) {
      payload.issue_subject =
        patch.issueSubject;
    }

    if (
      patch?.issueDescription !==
      undefined
    ) {
      payload.issue_description =
        patch.issueDescription;
    }

    if (
      patch?.problems !==
      undefined
    ) {
      payload.issue_description =
        itemsToText(
          patch.problems
        );
    }

    if (
      patch?.resolution !==
      undefined
    ) {
      payload.resolution =
        patch.resolution;
    }

    if (
      patch?.solutions !==
      undefined
    ) {
      payload.resolution =
        itemsToText(
          patch.solutions
        );
    }

    if (patch?.callerMode !== undefined) payload.call_type = patch.callerMode;
    if (patch?.address !== undefined) payload.address = patch.address || null;
    if (patch?.contactPersonName !== undefined) payload.contact_person_name = patch.contactPersonName || null;
    if (patch?.gstNumber !== undefined) payload.gst_number = patch.gstNumber || null;
    if (patch?.lostReason !== undefined) payload.lost_reason = patch.lostReason || null;

    if (
      patch?.startTime !==
      undefined
    ) {
      payload.start_time =
        toSqlTime(
          patch.startTime
        );
    }

    if (
      patch?.endTime !==
      undefined
    ) {
      payload.end_time =
        toSqlTime(
          patch.endTime
        );
    }

    if (
      patch?.durationSeconds !==
      undefined
    ) {
      payload.duration_seconds =
        getDurationSeconds(
          patch.durationSeconds
        );
    }

    const response =
      await api.post(
        `/records/${id}/update`,
        payload
      );

    const saved = mapCallerRecord(response?.data);
    const { errors: attachmentUploadErrors, uploaded } = await uploadRecordAttachments(id, patch?.attachments ?? []);
    saved.attachments = [...saved.attachments, ...uploaded];
    return Object.assign(saved, { attachmentUploadErrors });
  };

/* -------------------------------------------------------------------------- */
/* SUPPORT UPDATE                                                             */
/* -------------------------------------------------------------------------- */

export const updateSupportRecord =
  async (
    id: string | number,
    patch: any,
    _by?: any
  ): Promise<SupportRecord> => {
    const payload: any = {};

    if (patch?.companySupport !== undefined) {
      payload.company_support = Boolean(patch.companySupport);
    }

    if (patch?.organizationName !== undefined) {
      payload.organization_name = String(patch.organizationName ?? "").trim() || null;
    }

    if (patch?.assistedById !== undefined) {
      payload.assisted_by = patch.assistedById || null;
    }

    if (patch?.status !== undefined) {
      payload.status = normalizeStatus(patch.status);
    }

    if (
      patch?.customerName !==
      undefined
    ) {
      payload.customer_name =
        patch.customerName;
    }

    if (
      patch?.mobileNo !==
      undefined
    ) {
      payload.mobile_number =
        normalizeMobile(
          patch.mobileNo
        );
    }

    if (
      patch?.serialNo !==
      undefined
    ) {
      payload.serial_number =
        String(
          patch.serialNo
        ).trim() || null;
    }

    if (
      patch?.address !==
      undefined
    ) {
      payload.address =
        patch.address;
    }

    if (
      patch?.product !==
      undefined
    ) {
      payload.product =
        patch.product;
    }

    if (
      patch?.license !==
      undefined
    ) {
      payload.license_type =
        patch.license;
    }

    if (
      patch?.customerType !==
      undefined
    ) {
      payload.customer_type =
        patch.customerType;
    }

    if (
      patch?.offer !==
      undefined
    ) {
      payload.offer =
        patch.offer;
    }

    if (
      patch?.issueSubject !==
      undefined
    ) {
      payload.issue_subject =
        patch.issueSubject;
    }

    if (
      patch?.issueDescription !==
      undefined
    ) {
      payload.issue_description =
        patch.issueDescription;
    }

    if (
      patch?.problems !==
      undefined
    ) {
      payload.issue_description =
        itemsToText(
          patch.problems
        );
    }

    if (
      patch?.resolution !==
      undefined
    ) {
      payload.resolution =
        patch.resolution;
    }

    if (
      patch?.solutions !==
      undefined
    ) {
      payload.resolution =
        itemsToText(
          patch.solutions
        );
    }

    if (
      patch?.remarks !==
      undefined
    ) {
      payload.remarks =
        patch.remarks;
    }

    if (
      patch?.startTime !==
      undefined
    ) {
      payload.start_time =
        toSqlTime(
          patch.startTime
        );
    }

    if (
      patch?.endTime !==
      undefined
    ) {
      payload.end_time =
        toSqlTime(
          patch.endTime
        );
    }

    if (
      patch?.durationSeconds !==
      undefined
    ) {
      payload.duration_seconds =
        getDurationSeconds(
          patch.durationSeconds
        );
    }

    const response =
      await api.post(
        `/records/${id}/update`,
        payload
      );

    const saved = mapSupportRecord(response?.data);
    const files = [...(patch?.attachments ?? []), ...imageAttachments(patch?.problems ?? [], "problem"), ...imageAttachments(patch?.solutions ?? [], "solution")];
    const { errors: attachmentUploadErrors, uploaded } = await uploadRecordAttachments(id, files);
    saved.attachments = [...saved.attachments, ...uploaded];
    return Object.assign(saved, { attachmentUploadErrors });
  };

export const updateRecordStatus = async (
  kind: "support" | "caller",
  id: string,
  status: RecordStatus,
): Promise<SupportRecord | CallerRecord> => {
  const response = await api.post(`/records/${id}/status`, { status });
  return kind === "support"
    ? mapSupportRecord(response?.data)
    : mapCallerRecord(response?.data);
};

/* -------------------------------------------------------------------------- */
/* DELETE                                                                      */
/* -------------------------------------------------------------------------- */

export const deleteCallerRecord =
  async (
    id: string | number
  ): Promise<void> => {
    await api.post(
      `/records/${id}/delete`
    );
  };

export const deleteSupportRecord =
  async (
    id: string | number
  ): Promise<void> => {
    await api.post(
      `/records/${id}/delete`
    );
  };
