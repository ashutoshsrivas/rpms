import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

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
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const margin = 50;
  const maxWidth = 495;
  const lineHeight = 16;
  let currentPage = page;
  let y = currentPage.getSize().height - margin;
  let pageNumber = 1;

  // Color palette
  const colors = {
    primary: rgb(0.13, 0.27, 0.53),      // Deep blue
    secondary: rgb(0.45, 0.55, 0.70),     // Light blue-gray
    text: rgb(0.15, 0.15, 0.15),          // Dark gray
    textLight: rgb(0.40, 0.40, 0.40),     // Medium gray
    border: rgb(0.85, 0.85, 0.85),        // Light border
    background: rgb(0.97, 0.97, 0.98),    // Off-white
    accent: rgb(0.20, 0.45, 0.75),        // Bright blue
  };

  function addPageIfNeeded(lines = 1) {
    const needed = lines * lineHeight + 10;
    if (y - needed < margin + 30) { // Extra margin for page numbers
      // Add page number to current page
      currentPage.drawText(`Page ${pageNumber}`, {
        x: currentPage.getSize().width / 2 - 20,
        y: 20,
        size: 9,
        font: font,
        color: colors.textLight,
      });
      
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      currentPage = newPage;
      y = currentPage.getSize().height - margin;
      pageNumber++;
      return currentPage;
    }
    return currentPage;
  }

  function wrapLines(text: string, useBold = false, fontSize = 10, maxW = maxWidth) {
    const targetFont = useBold ? bold : font;
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (targetFont.widthOfTextAtSize(candidate, fontSize) > maxW) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function wrapUrl(url: string, fontSize: number, maxW: number): string[] {
    const lines: string[] = [];
    let remaining = url;
    
    while (remaining.length > 0) {
      let lineLength = remaining.length;
      
      // Find the maximum length that fits
      while (lineLength > 0 && font.widthOfTextAtSize(remaining.substring(0, lineLength), fontSize) > maxW) {
        lineLength--;
      }
      
      if (lineLength === 0) {
        // Even a single character doesn't fit, force it
        lineLength = 1;
      }
      
      // Try to break at a good position (/, ?, &, etc.)
      if (lineLength < remaining.length) {
        const substring = remaining.substring(0, lineLength);
        const lastSlash = substring.lastIndexOf('/');
        const lastQuestion = substring.lastIndexOf('?');
        const lastAmp = substring.lastIndexOf('&');
        const lastEqual = substring.lastIndexOf('=');
        
        const breakPoints = [lastSlash, lastQuestion, lastAmp, lastEqual].filter(pos => pos > lineLength * 0.5);
        
        if (breakPoints.length > 0) {
          lineLength = Math.max(...breakPoints) + 1;
        }
      }
      
      lines.push(remaining.substring(0, lineLength));
      remaining = remaining.substring(lineLength);
    }
    
    return lines;
  }

  function drawLines(text: string, useBold = false, color = colors.text) {
    const lines = wrapLines(text, useBold, 10);
    lines.forEach((line) => {
      addPageIfNeeded(1).drawText(line, {
        x: margin,
        y,
        size: 10,
        font: useBold ? bold : font,
        color,
      });
      y -= lineHeight;
    });
  }

  function addHeading(text: string) {
    y -= 12;
    addPageIfNeeded(2);
    
    // Background bar
    currentPage.drawRectangle({
      x: margin - 5,
      y: y - 6,
      width: maxWidth + 10,
      height: 24,
      color: colors.background,
    });
    
    currentPage.drawText(text, {
      x: margin,
      y,
      size: 15,
      font: bold,
      color: colors.primary,
    });
    y -= 20;
  }

  function addSpacer(lines = 1) {
    y -= lineHeight * lines;
  }

  function camelCaseToTitle(str: string): string {
    // Convert camelCase to Title Case with spaces
    const result = str.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  function formatFieldValue(value: any): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function drawFieldRow(label: string, value: any) {
    const formattedValue = formatFieldValue(value);
    const labelWidth = 180;
    
    addPageIfNeeded(3);
    
    // Two-column layout: label on left, value on right
    currentPage.drawText(label, {
      x: margin + 10,
      y,
      size: 9.5,
      font: bold,
      color: colors.secondary,
    });
    
    // Draw value with wrapping in right column
    const valueLines = wrapLines(formattedValue, false, 10, maxWidth - labelWidth - 20);
    const startY = y;
    
    valueLines.forEach((line, idx) => {
      addPageIfNeeded(1).drawText(line, {
        x: margin + labelWidth,
        y: startY - (idx * lineHeight),
        size: 10,
        font: font,
        color: colors.text,
      });
    });
    
    y -= Math.max(lineHeight, valueLines.length * lineHeight);
    y -= 6; // Spacing between fields
  }

  function drawSectionHeading(text: string) {
    y -= 18;
    addPageIfNeeded(3);
    
    // Draw subtle left border
    currentPage.drawRectangle({
      x: margin,
      y: y - 4,
      width: 3,
      height: 18,
      color: colors.accent,
    });
    
    currentPage.drawText(text, {
      x: margin + 12,
      y,
      size: 11.5,
      font: bold,
      color: colors.primary,
    });
    
    y -= 22;
  }

  async function drawFileTable(files: Array<{ file_url: string; file_key: string; sender_email: string }>, title: string) {
    if (files.length === 0) return;
    
    drawLines(title, true, colors.primary);
    y -= 8;
    
    const qrSize = 40;
    const colWidths = {
      serial: 35,
      link: maxWidth - 35 - qrSize - 20,
      qr: qrSize,
    };
    
    // Table header
    addPageIfNeeded(4);
    const headerY = y;
    
    // Header background
    currentPage.drawRectangle({
      x: margin,
      y: headerY - 18,
      width: maxWidth,
      height: 20,
      color: colors.background,
    });
    
    // Header text
    currentPage.drawText('#', {
      x: margin + 5,
      y: headerY - 13,
      size: 9,
      font: bold,
      color: colors.primary,
    });
    
    currentPage.drawText('File Link', {
      x: margin + colWidths.serial + 5,
      y: headerY - 13,
      size: 9,
      font: bold,
      color: colors.primary,
    });
    
    currentPage.drawText('QR Code', {
      x: margin + colWidths.serial + colWidths.link + 5,
      y: headerY - 13,
      size: 9,
      font: bold,
      color: colors.primary,
    });
    
    y -= 22;
    
    // Table rows
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Calculate URL lines and row height dynamically
      const linkLines = wrapUrl(file.file_url, 8, colWidths.link - 10);
      const uploaderLineHeight = 9;
      const contentHeight = (linkLines.length * 10) + uploaderLineHeight + 10;
      const rowHeight = Math.max(qrSize + 12, contentHeight);
      
      addPageIfNeeded(Math.ceil(rowHeight / lineHeight) + 2);
      
      const rowY = y;
      
      // Row border
      currentPage.drawRectangle({
        x: margin,
        y: rowY - rowHeight,
        width: maxWidth,
        height: rowHeight,
        borderColor: colors.border,
        borderWidth: 0.5,
      });
      
      // Serial number
      currentPage.drawText(`${i + 1}`, {
        x: margin + 12,
        y: rowY - 20,
        size: 9,
        font: font,
        color: colors.text,
      });
      
      // File link with wrapping
      linkLines.forEach((line, idx) => {
        currentPage.drawText(line, {
          x: margin + colWidths.serial + 5,
          y: rowY - 15 - (idx * 10),
          size: 8,
          font: font,
          color: colors.accent,
        });
      });
      
      // Uploader info
      currentPage.drawText(`By: ${file.sender_email}`, {
        x: margin + colWidths.serial + 5,
        y: rowY - 15 - (linkLines.length * 10) - 2,
        size: 7,
        font: italic,
        color: colors.textLight,
      });
      
      // Generate and embed QR code
      try {
        const qrDataUrl = await QRCode.toDataURL(file.file_url, {
          width: qrSize * 3,
          margin: 1,
          color: {
            dark: '#1E3A8A',
            light: '#FFFFFF'
          }
        });
        
        const qrImage = await pdfDoc.embedPng(qrDataUrl);
        const qrDims = qrImage.scale(1);
        
        currentPage.drawImage(qrImage, {
          x: margin + colWidths.serial + colWidths.link + 10,
          y: rowY - qrSize - 6,
          width: qrSize,
          height: qrSize,
        });
      } catch (err) {
        // If QR generation fails, show error placeholder
        currentPage.drawText('QR Error', {
          x: margin + colWidths.serial + colWidths.link + 10,
          y: rowY - 20,
          size: 7,
          font: font,
          color: colors.textLight,
        });
      }
      
      y -= rowHeight + 2;
    }
    
    y -= 10;
  }

  function renderStructuredFormData(data: any) {
    // Conference/Event Request Form Structure
    const sections = [
      {
        title: 'Receipt & Department Information',
        fields: [
          ['receiptDate', 'Receipt Date'],
          ['departmentName', 'Department Name'],
          ['convenerName', 'Convener Name'],
        ]
      },
      {
        title: 'Contact Information',
        fields: [
          ['phoneLandline', 'Phone (Landline)'],
          ['phoneMobile', 'Phone (Mobile)'],
          ['faxNumber', 'Fax Number'],
          ['emailAddress', 'Email Address'],
        ]
      },
      {
        title: 'Event Details',
        fields: [
          ['eventTitle', 'Event Title'],
          ['eventDates', 'Event Dates'],
          ['proposedDates', 'Proposed Dates'],
          ['durationDays', 'Duration (Days)'],
          ['statusLevel', 'Status Level'],
          ['venueAddress', 'Venue Address'],
          ['venueContact', 'Venue Contact'],
        ]
      },
      {
        title: 'Event Description',
        fields: [
          ['objectives', 'Objectives'],
          ['majorTopics', 'Major Topics'],
          ['relevanceProgramme', 'Relevance to Programme'],
          ['relevanceThemeContext', 'Relevance to Theme/Context'],
          ['relevanceArea', 'Relevance Area'],
        ]
      },
      {
        title: 'Collaboration & Participants',
        fields: [
          ['collaborationDetails', 'Collaboration Details'],
          ['participantsTotal', 'Total Participants'],
        ]
      },
      {
        title: 'Participants - Same State',
        fields: [
          ['sameStateFaculty', 'Faculty'],
          ['sameStateScholars', 'Scholars'],
          ['sameStatePg', 'Post-Graduate Students'],
        ]
      },
      {
        title: 'Participants - Other States',
        fields: [
          ['otherStateFaculty', 'Faculty'],
          ['otherStateScholars', 'Scholars'],
          ['otherStatePg', 'Post-Graduate Students'],
        ]
      },
      {
        title: 'Participants - Foreign',
        fields: [
          ['foreignFaculty', 'Faculty'],
          ['foreignScholars', 'Scholars'],
          ['foreignPg', 'Post-Graduate Students'],
        ]
      },
      {
        title: 'Resource Persons',
        fields: [
          ['resourceLeadPapers', 'Lead Papers'],
          ['resourceMemorialLectures', 'Memorial Lectures'],
          ['resourceInvitedTalks', 'Invited Talks'],
        ]
      },
      {
        title: 'Schedule & Financial Support',
        fields: [
          ['scheduleDetails', 'Schedule Details'],
          ['sponsors', 'Sponsors'],
        ]
      },
    ];

    sections.forEach(section => {
      drawSectionHeading(section.title);
      section.fields.forEach(([key, label]) => {
        const value = data[key];
        drawFieldRow(label, value);
      });
    });

    // Handle any additional fields not in the predefined structure
    const allDefinedKeys = new Set(sections.flatMap(s => s.fields.map(([key]) => key)));
    const additionalFields = Object.entries(data).filter(([key]) => !allDefinedKeys.has(key));
    
    if (additionalFields.length > 0) {
      drawSectionHeading('Additional Information');
      additionalFields.forEach(([key, value]) => {
        drawFieldRow(camelCaseToTitle(key), value);
      });
    }
  }

  function drawDivider() {
    y -= 8;
    addPageIfNeeded(1).drawLine({
      start: { x: margin, y },
      end: { x: margin + maxWidth, y },
      thickness: 0.5,
      color: colors.border,
    });
    y -= 12;
  }

  function drawMetaBlock(rows: Array<{ label: string; value: string }>) {
    addPageIfNeeded(rows.length + 2);
    
    const boxHeight = rows.length * 16 + 20;
    const boxY = y - boxHeight + 8;
    
    // Background box
    currentPage.drawRectangle({
      x: margin,
      y: boxY,
      width: maxWidth,
      height: boxHeight,
      color: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
    });
    
    y -= 12;
    
    rows.forEach(({ label, value }) => {
      currentPage.drawText(label + ':', {
        x: margin + 15,
        y,
        size: 9,
        font: bold,
        color: colors.secondary,
      });
      
      currentPage.drawText(value, {
        x: margin + 120,
        y,
        size: 9.5,
        font: font,
        color: colors.text,
      });
      
      y -= 16;
    });
    
    y -= 8;
  }

  // Header with title
  currentPage.drawRectangle({
    x: 0,
    y: currentPage.getSize().height - 80,
    width: currentPage.getSize().width,
    height: 80,
    color: colors.primary,
  });
  
  currentPage.drawText(requestTitle, {
    x: margin,
    y: currentPage.getSize().height - 45,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  
  currentPage.drawText(`Request #${request.id}`, {
    x: margin,
    y: currentPage.getSize().height - 65,
    size: 11,
    font: font,
    color: rgb(0.85, 0.85, 0.85),
  });
  
  // Export timestamp in header (top right)
  const exportTimestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  currentPage.drawText(`Exported: ${exportTimestamp}`, {
    x: currentPage.getSize().width - margin - font.widthOfTextAtSize(`Exported: ${exportTimestamp}`, 9),
    y: currentPage.getSize().height - 45,
    size: 9,
    font: font,
    color: rgb(0.85, 0.85, 0.85),
  });
  
  y = currentPage.getSize().height - 100;
  
  // Metadata block
  addSpacer(0.5);
  
  const exportTimestampFormatted = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  drawMetaBlock([
    { label: "Owner", value: request.user_email },
    { label: "Status", value: request.status.toUpperCase() },
    { label: "Last Updated", value: formatDate(request.updated_at || request.created_at) },
    { label: "Request Type", value: request.request_type || "seed-research" },
    { label: "Exported On", value: exportTimestampFormatted },
  ]);
  
  drawDivider();

  // Files
  addHeading("Uploaded Files");
  
  // Primary upload
  if (request.upload_url) {
    await drawFileTable([{
      file_url: request.upload_url,
      file_key: 'Primary Upload',
      sender_email: request.user_email
    }], "Primary Upload");
    addSpacer(0.5);
  }
  
  // HOD/Admin private files
  if (privateFiles.length) {
    await drawFileTable(privateFiles, "HOD/Admin Private Files");
    addSpacer(0.5);
  }
  
  // Admin-only files
  if (adminFiles.length) {
    await drawFileTable(adminFiles, "Admin-Only Files");
    addSpacer(0.5);
  }
  
  // Chat attachments
  const chatFiles: ExportFile[] = [];
  chatMessages.forEach((m) => (m.attachments || []).forEach((a) => chatFiles.push(a)));
  chatOrphans.forEach((a) => chatFiles.push(a));
  if (chatFiles.length) {
    await drawFileTable(chatFiles, "Chat Attachments");
    addSpacer(0.5);
  }
  
  if (!request.upload_url && !privateFiles.length && !adminFiles.length && !chatFiles.length) {
    drawLines("(no files uploaded)");
  }
  addSpacer(1);

  // Form data (structured)
  addHeading("Form Details");
  addSpacer(0.5);
  renderStructuredFormData(parsedData);
  addSpacer(1);

  // Chat
  addHeading("Chat Messages");
  if (!chatMessages.length && !chatOrphans.length) {
    drawLines("(no chat messages)");
  } else {
    chatMessages.forEach((msg, idx) => {
      drawLines(`${idx + 1}. [${formatDate(msg.created_at)}] ${msg.sender_email}`, true);
      if (msg.content) drawLines(`   ${msg.content}`);
      (msg.attachments || []).forEach((att) => drawLines(`   📎 ${att.file_key}`));
      addSpacer(0.3);
    });
    chatOrphans.forEach((att) => drawLines(`📎 [${formatDate(att.created_at)}] ${att.sender_email}: ${att.file_key}`));
  }

  // Add page number to last page
  currentPage.drawText(`Page ${pageNumber}`, {
    x: currentPage.getSize().width / 2 - 20,
    y: 20,
    size: 9,
    font: font,
    color: colors.textLight,
  });

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
