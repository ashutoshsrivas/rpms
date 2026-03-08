import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ExportRequest = {
  id: number;
  user_email: string;
  request_type?: string;
  status: string;
  upload_url?: string | null;
  data?: any;
  created_at?: string;
  updated_at?: string;
};

export type ExportFile = {
  id: number;
  file_key: string;
  file_url: string;
  sender_email: string;
  created_at?: string;
};

export type ExportChatMessage = {
  id: number;
  sender_email: string;
  content: string;
  created_at?: string;
  attachments?: ExportFile[];
};

export type ExportContext = {
  request: ExportRequest;
  privateFiles: ExportFile[];
  adminFiles: ExportFile[];
  chatMessages: ExportChatMessage[];
  chatOrphans: ExportFile[];
  requestTitle: string;
  formatDate: (v?: string) => string;
};

export async function exportRequestPdfDocument(ctx: ExportContext) {
  const { request, privateFiles, adminFiles, chatMessages, chatOrphans, requestTitle, formatDate } = ctx;
  const parsedData = (() => {
    try {
      if (typeof request.data === "string") return JSON.parse(request.data);
      return request.data ?? {};
    } catch (_err) {
      return request.data ?? {};
    }
  })();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const maxWidth = 515;
  const lineHeight = 15;
  let currentPage = page;
  let y = currentPage.getSize().height - margin;

  function addPageIfNeeded(lines = 1) {
    const needed = lines * lineHeight + 10;
    if (y - needed < margin) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      currentPage = newPage;
      y = currentPage.getSize().height - margin;
      return currentPage;
    }
    return currentPage;
  }

  function wrapLines(text: string, useBold = false) {
    const targetFont = useBold ? bold : font;
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (targetFont.widthOfTextAtSize(candidate, 11) > maxWidth) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function drawLines(text: string, useBold = false, color = rgb(0.12, 0.12, 0.12)) {
    const lines = wrapLines(text, useBold);
    lines.forEach((line) => {
      addPageIfNeeded(1).drawText(line, {
        x: margin,
        y,
        size: 11,
        font: useBold ? bold : font,
        color,
      });
      y -= lineHeight;
    });
  }

  function addHeading(text: string) {
    y -= lineHeight;
    addPageIfNeeded(1).drawText(text, {
      x: margin,
      y,
      size: 14,
      font: bold,
      color: rgb(0.08, 0.08, 0.1),
    });
    y -= lineHeight / 2;
  }

  function addSpacer(lines = 1) {
    y -= lineHeight * lines;
  }

  function drawKeyValue(label: string, value: string) {
    const text = `${label}: ${value}`;
    drawLines(text, false, rgb(0.15, 0.15, 0.2));
  }

  function renderData(obj: any, indent = 0) {
    if (obj === null || obj === undefined) {
      drawLines(`${"  ".repeat(indent)}—`);
      return;
    }
    if (typeof obj !== "object") {
      drawLines(`${"  ".repeat(indent)}${String(obj)}`);
      return;
    }
    if (Array.isArray(obj)) {
      if (!obj.length) {
        drawLines(`${"  ".repeat(indent)}(empty)`);
        return;
      }
      obj.forEach((item, idx) => {
        drawLines(`${"  ".repeat(indent)}- [${idx + 1}]`, true);
        renderData(item, indent + 1);
      });
      return;
    }
    const entries = Object.entries(obj as Record<string, any>);
    if (!entries.length) {
      drawLines(`${"  ".repeat(indent)}(empty)`);
      return;
    }
    entries.forEach(([key, val]) => {
      if (val && typeof val === "object") {
        drawLines(`${"  ".repeat(indent)}${key}:`, true);
        renderData(val, indent + 1);
      } else {
        drawLines(`${"  ".repeat(indent)}${key}: ${String(val)}`);
      }
    });
  }

  function drawDivider() {
    addPageIfNeeded(1).drawLine({
      start: { x: margin, y },
      end: { x: margin + maxWidth, y },
      thickness: 1,
      color: rgb(0.82, 0.84, 0.88),
    });
    addSpacer(0.4);
  }

  function drawMetaBlock(rows: Array<{ label: string; value: string }>) {
    rows.forEach(({ label, value }) => drawKeyValue(label, value));
    addSpacer(0.5);
  }

  // Title & metadata
  addHeading(requestTitle);
  drawLines(`Request ID: ${request.id}`, true, rgb(0.12, 0.12, 0.16));
  drawMetaBlock([
    { label: "Owner", value: request.user_email },
    { label: "Status", value: request.status },
    { label: "Updated", value: formatDate(request.updated_at || request.created_at) },
    { label: "Type", value: request.request_type || "seed-research" },
  ]);
  drawDivider();

  // Files
  addHeading("Uploaded files");
  if (request.upload_url) drawLines(`Primary upload: ${request.upload_url}`);
  if (privateFiles.length) {
    drawLines("HOD/Admin private files:", true);
    privateFiles.forEach((f) => drawLines(`- ${f.file_key} (${f.file_url}) by ${f.sender_email}`));
  }
  if (adminFiles.length) {
    drawLines("Admin-only files:", true);
    adminFiles.forEach((f) => drawLines(`- ${f.file_key} (${f.file_url}) by ${f.sender_email}`));
  }
  const chatFiles: ExportFile[] = [];
  chatMessages.forEach((m) => (m.attachments || []).forEach((a) => chatFiles.push(a)));
  chatOrphans.forEach((a) => chatFiles.push(a));
  if (chatFiles.length) {
    drawLines("Chat attachments:", true);
    chatFiles.forEach((f) => drawLines(`- ${f.file_key} (${f.file_url}) by ${f.sender_email}`));
  }
  if (!request.upload_url && !privateFiles.length && !adminFiles.length && !chatFiles.length) {
    drawLines("(none)");
  }
  addSpacer(1);

  // Form data (structured)
  addHeading("Form details");
  renderData(parsedData);
  addSpacer(1);

  // Chat
  addHeading("Chat");
  if (!chatMessages.length && !chatOrphans.length) {
    drawLines("(no chat messages)");
  } else {
    chatMessages.forEach((msg, idx) => {
      drawLines(`${idx + 1}. [${formatDate(msg.created_at)}] ${msg.sender_email}: ${msg.content || "(no text)"}`);
      (msg.attachments || []).forEach((att) => drawLines(`  attachment: ${att.file_key} (${att.file_url}) by ${att.sender_email}`));
    });
    chatOrphans.forEach((att) => drawLines(`[${formatDate(att.created_at)}] ${att.sender_email}: attachment ${att.file_key} (${att.file_url})`));
  }

  const pdfBytes = await pdfDoc.save();
  const bytes = new Uint8Array(pdfBytes.length);
  bytes.set(pdfBytes);
  const blob = new Blob([bytes.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `request-${request.id}-export.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
