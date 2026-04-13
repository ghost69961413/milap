const DATA_URI_PREFIX = "data:";

function isDataUri(value) {
  return typeof value === "string" && value.trim().toLowerCase().startsWith(DATA_URI_PREFIX);
}

async function openDataUriInNewTab(dataUri) {
  const previewWindow = window.open("", "_blank");

  if (!previewWindow) {
    throw new Error("Unable to open document. Please allow pop-ups for this site.");
  }

  previewWindow.opener = null;

  const response = await fetch(dataUri);

  if (!response.ok) {
    previewWindow.close();
    throw new Error("Unable to load this document preview right now.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  previewWindow.location.replace(objectUrl);

  // Keep the object URL alive for a while so the new tab can finish loading.
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

export async function openDocumentInNewTab(documentUrl) {
  const normalizedUrl = typeof documentUrl === "string" ? documentUrl.trim() : "";

  if (!normalizedUrl) {
    throw new Error("Document URL is missing.");
  }

  if (isDataUri(normalizedUrl)) {
    await openDataUriInNewTab(normalizedUrl);
    return;
  }

  const openedWindow = window.open(normalizedUrl, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    throw new Error("Unable to open document. Please allow pop-ups for this site.");
  }
}

